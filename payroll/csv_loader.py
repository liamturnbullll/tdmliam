import csv
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from pathlib import Path

REQUIRED_COLUMNS = {"name", "wise_recipient_id", "hours_worked", "actual_rate"}
OPTIONAL_COLUMNS = {"deductions"}


@dataclass(frozen=True)
class PayrollRow:
    name: str
    wise_recipient_id: str
    hours_worked: Decimal
    actual_rate: Decimal
    deductions: Decimal

    @property
    def amount(self) -> Decimal:
        """Net pay, per the confirmed Notion payroll formula:
        hours worked x actual rate - deductions."""
        return (self.hours_worked * self.actual_rate - self.deductions).quantize(Decimal("0.01"))


def load_payroll_csv(path: Path) -> list[PayrollRow]:
    if not path.is_file():
        raise ValueError(f"payroll CSV not found: {path}")

    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        missing_columns = REQUIRED_COLUMNS - set(reader.fieldnames or [])
        if missing_columns:
            raise ValueError(f"{path} is missing required columns: {sorted(missing_columns)}")

        rows: list[PayrollRow] = []
        seen_recipients: set[str] = set()
        for line_no, raw in enumerate(reader, start=2):
            name = (raw["name"] or "").strip()
            recipient_id = (raw["wise_recipient_id"] or "").strip()

            if not name or not recipient_id:
                raise ValueError(f"{path}:{line_no}: name and wise_recipient_id are both required")
            if recipient_id in seen_recipients:
                raise ValueError(f"{path}:{line_no}: duplicate wise_recipient_id {recipient_id!r}")
            seen_recipients.add(recipient_id)

            try:
                hours_worked = Decimal((raw["hours_worked"] or "").strip())
                actual_rate = Decimal((raw["actual_rate"] or "").strip())
                deductions_raw = (raw.get("deductions") or "").strip()
                deductions = Decimal(deductions_raw) if deductions_raw else Decimal("0")
            except InvalidOperation as exc:
                raise ValueError(
                    f"{path}:{line_no}: hours_worked, actual_rate, and deductions must be numeric"
                ) from exc

            if hours_worked <= 0 or actual_rate <= 0:
                raise ValueError(f"{path}:{line_no}: hours_worked and actual_rate must be positive")
            if deductions < 0:
                raise ValueError(f"{path}:{line_no}: deductions cannot be negative")

            rows.append(PayrollRow(name, recipient_id, hours_worked, actual_rate, deductions))

        if not rows:
            raise ValueError(f"{path} contains no payroll rows")

        return rows
