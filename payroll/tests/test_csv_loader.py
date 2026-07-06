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
        "name,wise_recipient_id,hours_worked,actual_rate,deductions\n"
        "Ana Petrovic,123,80,12.50,\n",
    )
    rows = load_payroll_csv(path)
    assert len(rows) == 1
    row = rows[0]
    assert row.name == "Ana Petrovic"
    assert row.deductions == Decimal("0")
    assert row.amount == Decimal("1000.00")


def test_net_pay_subtracts_deductions(tmp_path):
    path = _write(
        tmp_path,
        "name,wise_recipient_id,hours_worked,actual_rate,deductions\n"
        "Jelena Markovic,123,48,5.00,6.00\n",
    )
    row = load_payroll_csv(path)[0]
    assert row.amount == Decimal("234.00")  # 48 * 5.00 - 6.00


def test_missing_column_raises(tmp_path):
    path = _write(tmp_path, "name,wise_recipient_id,hours_worked\nAna,123,80\n")
    with pytest.raises(ValueError, match="missing required columns"):
        load_payroll_csv(path)


def test_duplicate_recipient_raises(tmp_path):
    path = _write(
        tmp_path,
        "name,wise_recipient_id,hours_worked,actual_rate,deductions\n"
        "Ana,123,80,12.5,\n"
        "Bane,123,40,10,\n",
    )
    with pytest.raises(ValueError, match="duplicate wise_recipient_id"):
        load_payroll_csv(path)


def test_non_numeric_rate_raises(tmp_path):
    path = _write(
        tmp_path, "name,wise_recipient_id,hours_worked,actual_rate,deductions\nAna,123,80,abc,\n"
    )
    with pytest.raises(ValueError, match="numeric"):
        load_payroll_csv(path)


def test_non_positive_hours_raises(tmp_path):
    path = _write(
        tmp_path, "name,wise_recipient_id,hours_worked,actual_rate,deductions\nAna,123,0,12.5,\n"
    )
    with pytest.raises(ValueError, match="positive"):
        load_payroll_csv(path)


def test_negative_deductions_raises(tmp_path):
    path = _write(
        tmp_path, "name,wise_recipient_id,hours_worked,actual_rate,deductions\nAna,123,80,12.5,-1\n"
    )
    with pytest.raises(ValueError, match="cannot be negative"):
        load_payroll_csv(path)


def test_empty_csv_raises(tmp_path):
    path = _write(tmp_path, "name,wise_recipient_id,hours_worked,actual_rate,deductions\n")
    with pytest.raises(ValueError, match="no payroll rows"):
        load_payroll_csv(path)
