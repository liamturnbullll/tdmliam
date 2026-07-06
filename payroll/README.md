# Wise payroll automation

Pays TDM's international contractors via the Wise Business API: reads hours
from a CSV, quotes and batches transfers, and requires a human "y" before any
money moves.

## Setup

```
cd payroll
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt   # or requirements.txt for runtime-only

python -m payroll.generate_keypair    # writes keys/private.pem + keys/public.pem
cp .env.example .env                  # then fill in WISE_API_TOKEN, WISE_PROFILE_ID
```

Upload `keys/public.pem` to Wise (Settings > Integrations and tools > API
tokens > add a public key for personal-token SCA) so the funding step's signed
challenge is trusted.

**Sandbox v1 is being retired.** `.env.example` defaults `WISE_API_BASE` to
`https://api.wise-sandbox.com` (Sandbox v2). Get sandbox v2 credentials before
testing — v1 tokens/profile IDs created after April 2025 won't carry over.

## Running

```
python -m payroll.main --dry-run                       # quotes + preview only, nothing created
python -m payroll.main --csv payroll.csv --run-id 2026-07-15
```

`payroll.csv` columns: `name, wise_recipient_id, hourly_rate, hours, currency`
(see `payroll.example.csv`). `wise_recipient_id` is the Wise recipient
account ID the contractor is already registered as; `currency` is the payout
currency and is cross-checked against what Wise has on file for that account
— a mismatch aborts the whole run before anything is created.

Flow: validate every recipient → quote every row → print a preview table →
**confirm** → create batch group → add transfers → complete (lock) the batch
group → **confirm again** → sign the SCA challenge → fund. Both confirmations
require typing `y`; there is no flag to skip either.

Every run writes `runs/<run-id>.json`, which is both the audit log and the
resume state — rerunning with the same `--run-id` after a crash skips
whatever already succeeded (quotes, batch group, individual transfers) rather
than re-creating it. A run that reached `FUNDED` refuses to run again under
that `--run-id`.

## Testing

```
pytest tests/
```

Covers CSV validation, the RSA signature round-trip, and the Wise client's
request/retry logic (including the 403 → sign OTT → retry SCA dance) against
mocked HTTP responses — no live or sandbox credentials required.

## Known limitations / open questions (carried over from planning)

- **Source of hours is not yet wired up.** This reads a CSV; if hours end up
  living in a Sheet/Airtable/HR tool, add a small export step ahead of this,
  don't rebuild the payment logic.
- **Quote expiry isn't handled.** If `add_transfer` fails because a quote
  went stale between the preview and the batch step, delete that recipient's
  `quote_id`/`quote` keys from the run's JSON and rerun with the same
  `--run-id` to force a re-quote.
- **Partial payout failure** (e.g. 2 of 75 bounce) isn't specifically
  handled beyond what's in the run log — decide the reconciliation process
  before running this live.
- **Second approver / maker-checker** isn't modeled; today it's a single
  human typing `y` twice.
- Accounting reconciliation and Serbia contractor-classification review are
  outside this script's scope.
