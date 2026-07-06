#!/usr/bin/env python3
"""Wise payroll batch runner.

Usage (from repo root):
    python -m payroll.main --dry-run
    python -m payroll.main --csv payroll.csv --run-id 2026-07-15

See payroll/README.md for setup (sandbox credentials, RSA keypair, .env).
"""
import argparse
import sys
import uuid
from datetime import date
from decimal import Decimal
from pathlib import Path

from .config import load_config
from .csv_loader import PayrollRow, load_payroll_csv
from .run_log import RunLog
from .wise_client import WiseAPIError, WiseClient

RUNS_DIR = Path(__file__).parent / "runs"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run a Wise payroll batch payment.")
    parser.add_argument("--csv", type=Path, default=Path("payroll.csv"), help="Path to the payroll CSV.")
    parser.add_argument(
        "--run-id",
        default=date.today().isoformat(),
        help="Identifier for this run's audit log / resume state (default: today's date).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate recipients and fetch quotes, print the preview, then stop. Creates nothing in Wise.",
    )
    return parser.parse_args()


def render_preview(rows: list[PayrollRow], run_log: RunLog, source_currency: str) -> str:
    header = f"{'Name':<24}{'Recipient':<22}{'Hours':>8}{'Rate':>9}{'Ded':>8}{'Net pay':>13} {'Ccy':<4}{'Source amt':>13}"
    lines = [header, "-" * len(header)]
    total_source = Decimal("0")
    for row in rows:
        state = run_log.row_state(row.wise_recipient_id)
        quote = state.get("quote", {})
        currency = state.get("currency", "")
        source_amount = Decimal(str(quote.get("sourceAmount", "0")))
        total_source += source_amount
        lines.append(
            f"{row.name:<24}{row.wise_recipient_id:<22}{row.hours_worked!s:>8}{row.actual_rate!s:>9}"
            f"{row.deductions!s:>8}{row.amount!s:>13} {currency:<4}{source_amount!s:>13}"
        )
    lines.append("-" * len(header))
    lines.append(f"{'TOTAL':<71}{total_source!s:>13} {source_currency}")
    return "\n".join(lines)


def confirm(prompt: str) -> bool:
    return input(prompt).strip().lower() == "y"


def main() -> None:
    args = parse_args()
    config = load_config()
    rows = load_payroll_csv(args.csv)

    RUNS_DIR.mkdir(exist_ok=True)
    run_log = RunLog(RUNS_DIR / f"{args.run_id}.json")

    if run_log.data.get("status") == "FUNDED":
        print(f"FATAL: run '{args.run_id}' is already FUNDED ({run_log.path}). "
              "Refusing to touch a funded run — use a new --run-id for a new payroll cycle.")
        sys.exit(1)

    client = WiseClient(config)

    # 1. Validate every recipient and fetch/reuse a quote before creating anything.
    for row in rows:
        try:
            account = client.get_recipient_account(row.wise_recipient_id)
        except WiseAPIError as exc:
            print(f"FATAL: could not look up recipient {row.wise_recipient_id} ({row.name}): {exc}")
            sys.exit(1)

        target_currency = account.get("currency")
        if not target_currency:
            print(f"FATAL: recipient {row.name} ({row.wise_recipient_id}) has no currency on file with Wise")
            sys.exit(1)

        state = run_log.row_state(row.wise_recipient_id)
        if not state.get("quote_id"):
            try:
                quote = client.create_quote(
                    source_currency=config.source_currency,
                    target_currency=target_currency,
                    target_amount=float(row.amount),
                    target_account_id=row.wise_recipient_id,
                )
            except WiseAPIError as exc:
                print(f"FATAL: could not quote {row.name} ({row.wise_recipient_id}): {exc}")
                sys.exit(1)
            run_log.update_row(
                row.wise_recipient_id,
                name=row.name,
                amount=str(row.amount),
                currency=target_currency,
                quote_id=quote["id"],
                quote=quote,
            )

    print(render_preview(rows, run_log, config.source_currency))

    if args.dry_run:
        print("\nDry run complete — no batch group was created.")
        return

    if run_log.data.get("status") is None:
        if not confirm(f"\nCreate a batch group for {len(rows)} transfers above? [y/N] "):
            print("Aborted.")
            sys.exit(1)
        run_log.set_status("CONFIRMED")

    # 2. Batch group (create once, then reuse on resume).
    batch_group_id = run_log.data.get("batch_group_id")
    if not batch_group_id:
        batch_group = client.create_batch_group(
            name=f"Payroll {args.run_id}"[:100], source_currency=config.source_currency
        )
        batch_group_id = batch_group["id"]
        run_log.set_batch_group(batch_group_id, batch_group["version"])

    # 3. Add each transfer to the batch group (skip ones already added on resume).
    for row in rows:
        state = run_log.row_state(row.wise_recipient_id)
        if state.get("transfer_id"):
            continue
        txn_id = state.get("customer_transaction_id") or str(uuid.uuid4())
        run_log.update_row(row.wise_recipient_id, customer_transaction_id=txn_id)
        try:
            transfer = client.add_transfer(
                batch_group_id=batch_group_id,
                target_account_id=row.wise_recipient_id,
                quote_id=state["quote_id"],
                customer_transaction_id=txn_id,
                reference=f"Payroll {args.run_id} {row.name}",
            )
        except WiseAPIError as exc:
            print(f"FATAL: failed to add transfer for {row.name}: {exc}")
            print(f"Batch group {batch_group_id} is left open — fix the issue and rerun with "
                  f"--run-id {args.run_id} to resume.")
            sys.exit(1)
        run_log.update_row(row.wise_recipient_id, transfer_id=transfer.get("id"))

    # 4. Lock the batch group so no further transfers can be added.
    if run_log.data.get("status") != "COMPLETED_PENDING_FUND":
        batch_group = client.get_batch_group(batch_group_id)
        client.complete_batch_group(batch_group_id=batch_group_id, version=batch_group["version"])
        run_log.set_status("COMPLETED_PENDING_FUND")

    # 5. Human-in-the-loop gate, right before the funding call. Non-negotiable.
    print(f"\nBatch group {batch_group_id} is COMPLETED with {len(rows)} transfers and ready to fund.")
    if not confirm("Type 'y' to FUND this batch group now — this moves real money: "):
        print(f"Not funded. Batch group {batch_group_id} remains COMPLETED; "
              f"rerun with --run-id {args.run_id} when ready.")
        sys.exit(1)

    try:
        result = client.fund_batch_group(batch_group_id=batch_group_id)
    except WiseAPIError as exc:
        print(f"FATAL: funding call failed: {exc}")
        run_log.set_status("FUND_FAILED")
        sys.exit(1)

    run_log.set_status("FUNDED")
    run_log.record_fund_result(result)
    print(f"Funded. Full result logged to {run_log.path}")


if __name__ == "__main__":
    main()
