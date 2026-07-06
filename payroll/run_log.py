"""Per-run audit log and resume state, persisted to payroll/runs/<run_id>.json.

The same file doubles as the audit trail (requirement: "audit log to file/DB per
run") and as idempotency state so a crashed or interrupted run can be re-invoked
with the same --run-id without re-quoting, re-adding transfers, or double-funding.
"""
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


class RunLog:
    def __init__(self, path: Path):
        self.path = path
        if path.exists():
            self.data: dict[str, Any] = json.loads(path.read_text())
        else:
            self.data = {
                "created_at": datetime.now(timezone.utc).isoformat(),
                "status": None,
                "rows": {},
            }
            self._save()

    def _save(self) -> None:
        self.data["updated_at"] = datetime.now(timezone.utc).isoformat()
        self.path.write_text(json.dumps(self.data, indent=2, default=str))

    def row_state(self, recipient_id: str) -> dict[str, Any]:
        return self.data["rows"].setdefault(recipient_id, {})

    def update_row(self, recipient_id: str, **kwargs: Any) -> None:
        self.row_state(recipient_id).update(kwargs)
        self._save()

    def set_batch_group(self, batch_group_id: str, version: int) -> None:
        self.data["batch_group_id"] = batch_group_id
        self.data["batch_group_version"] = version
        self._save()

    def set_status(self, status: str) -> None:
        self.data["status"] = status
        self._save()

    def record_fund_result(self, result: dict[str, Any]) -> None:
        self.data["fund_result"] = result
        self._save()
