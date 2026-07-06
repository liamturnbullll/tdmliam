import csv
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from pathlib import Path

REQUIRED_COLUMNS = {"name", "wise_recipient_id", "hourly_rate", "hours", "currency"}


@dataclass(frozen=True)
class PayrollRow:
    name: str
    wise_recipient_id: str
    hourly_rate: Decimal
    hours: Decimal
    currency: str

    @property
    def amount(self) -> Decimal:
        return (self.hourly_rate * self.hours).quantize(Decimal("0.01"))


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
            currency = (raw["currency"] or "").strip().upper()

            if not name or not recipient_id or not currency:
                raise ValueError(
                    f"{path}:{line_no}: name, wise_recipient_id, and currency are all required"
                )
            if recipient_id in seen_recipients:
                raise ValueError(f"{path}:{line_no}: duplicate wise_recipient_id {recipient_id!r}")
            seen_recipients.add(recipient_id)

            try:
                hourly_rate = Decimal((raw["hourly_rate"] or "").strip())
                hours = Decimal((raw["hours"] or "").strip())
            except InvalidOperation as exc:
                raise ValueError(f"{path}:{line_no}: hourly_rate and hours must be numeric") from exc

            if hourly_rate <= 0 or hours <= 0:
                raise ValueError(f"{path}:{line_no}: hourly_rate and hours must be positive")

            rows.append(PayrollRow(name, recipient_id, hourly_rate, hours, currency))

        if not rows:
            raise ValueError(f"{path} contains no payroll rows")

        return rows
