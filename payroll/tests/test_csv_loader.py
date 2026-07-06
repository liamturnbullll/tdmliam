from decimal import Decimal

import pytest

from payroll.csv_loader import load_payroll_csv


def _write(tmp_path, content):
    path = tmp_path / "payroll.csv"
    path.write_text(content)
    return path


def test_loads_valid_rows(tmp_path):
    path = _write(
        tmp_path,
        "name,wise_recipient_id,hourly_rate,hours,currency\n"
        "Ana Petrovic,123,12.50,80,rsd\n",
    )
    rows = load_payroll_csv(path)
    assert len(rows) == 1
    row = rows[0]
    assert row.name == "Ana Petrovic"
    assert row.currency == "RSD"
    assert row.amount == Decimal("1000.00")


def test_missing_column_raises(tmp_path):
    path = _write(tmp_path, "name,wise_recipient_id,hourly_rate,hours\nAna,123,12.5,80\n")
    with pytest.raises(ValueError, match="missing required columns"):
        load_payroll_csv(path)


def test_duplicate_recipient_raises(tmp_path):
    path = _write(
        tmp_path,
        "name,wise_recipient_id,hourly_rate,hours,currency\n"
        "Ana,123,12.5,80,RSD\n"
        "Bane,123,10,40,RSD\n",
    )
    with pytest.raises(ValueError, match="duplicate wise_recipient_id"):
        load_payroll_csv(path)


def test_non_numeric_rate_raises(tmp_path):
    path = _write(
        tmp_path, "name,wise_recipient_id,hourly_rate,hours,currency\nAna,123,abc,80,RSD\n"
    )
    with pytest.raises(ValueError, match="numeric"):
        load_payroll_csv(path)


def test_non_positive_hours_raises(tmp_path):
    path = _write(
        tmp_path, "name,wise_recipient_id,hourly_rate,hours,currency\nAna,123,12.5,0,RSD\n"
    )
    with pytest.raises(ValueError, match="positive"):
        load_payroll_csv(path)


def test_empty_csv_raises(tmp_path):
    path = _write(tmp_path, "name,wise_recipient_id,hourly_rate,hours,currency\n")
    with pytest.raises(ValueError, match="no payroll rows"):
        load_payroll_csv(path)
