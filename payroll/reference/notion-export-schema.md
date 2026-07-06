# Notion payroll export — data model

Reference for the biweekly Notion export ("Cautious Payroll" database) that
will drive the payroll app and, eventually, the Wise batch run. Source PDF:
`notion-payroll-export-example.pdf` in this folder (example period: 15/06 -
28th, ~92 rows).

## What we've confirmed

The PDF export shows **10 of 17 columns** ("Showing 10 of 17 columns. For all
columns, refer to the CSV file included in the export zip." — we only have
the PDF so far, not that CSV/zip).

| Column | Type | Notes |
|---|---|---|
| Name | text | Sometimes `(Nickname) Real Name`, sometimes prefixed with an emoji (💎, 🚨 — status/flag markers, meaning unconfirmed). A few rows are Notion's default "Untitled". |
| Role | select | Observed values: `Chatter`, `Admin`, `Recruitment`, `Right hand man`, `Content`, `Affiliate`, `Marketing`. Blank on some rows. |
| AM | multi-select | Team-lead initials: `Vuk`, `SB`, `HT`, `CJ`, `CK`, `JT`, `BF`, `BC`, `AB`, `Turbo`. A handful of rows carry two tags (e.g. `CK` + `JT`). |
| # Earnings | currency | Gross revenue attributed to the person. Blank for Admin/Recruitment/Affiliate/Marketing rows (they don't generate direct earnings). |
| # Hours Worked | number | |
| Σ Earnings/Hr | currency | = Earnings ÷ Hours Worked |
| Σ Net Profit | currency | Can be negative — for non-earning roles it's simply `-(Hours Worked × Actual Rate)`, i.e. pure cost. |
| Σ Advised Rate | currency/hr | A recommended rate (presumably tier/performance-based). **Not what gets paid.** |
| # Actual Rate | currency/hr | The rate actually applied this cycle. |
| # Deductions | currency | Flat deduction against pay, mostly blank/0 in the example. |

## The pay formula (confirmed)

Cross-checked against a Notion screenshot of a different period (18/05-31/05)
that included a `Σ Net Pay` column:

```
Net Pay = (Hours Worked × Actual Rate) − Deductions
```

Verified exactly against every row visible in that screenshot (e.g. Emma:
112 × $4.15 = $464.80; Vuk Nedeljkovic: 156 × $9.00 = $1,404.00). **Actual
Rate, not Advised Rate, is the number that matters for payroll.** Earnings
and Net Profit are business metrics, not payroll inputs.

## Open questions — need the full CSV export to confirm

- What are the other 7 columns? Best guesses: `Σ Net Pay` (confirmed to
  exist, just not in this particular PDF view), currency, a Wise
  recipient/account identifier, start date, personal notes. Unconfirmed.
- Nothing in the export currently maps a row to a Wise recipient account —
  that linkage will need to live somewhere (a column in Notion, or a
  separate mapping table we maintain).
- Currency isn't in the visible columns — presumably USD throughout, but
  needs confirming for the Serbia/Philippines corridors.
- Meaning of the 💎 / 🚨 emoji prefixes on some names is unconfirmed.
- Several rows have blank Hours Worked/Actual Rate but a nonzero negative
  Net Profit (e.g. flat monthly admin cost) — need to confirm how those
  should be paid (are they salaried rather than hourly?).

## Illustrative sample (hand-transcribed, NOT authoritative)

A few rows for seeding/testing the app's UI — do not use for a real payroll
run. Always pull the live export when running payroll for real.

```csv
name,role,am,earnings,hours_worked,earnings_per_hr,net_profit,advised_rate,actual_rate,deductions
Emma (Emma Hermongenes) TSU,Chatter,Vuk,3357.68,72,46.63,299.14,3.50,3.00,
3 Leo (Eleanor Gagarin),Chatter,Vuk,15360.95,109,140.93,2589.99,5.50,4.50,
Bernard,Chatter,Vuk,8865.06,96,92.34,1314.21,4.50,4.50,
(Jess) Jelena Markovic,Chatter,Vuk,7364.81,48,153.43,1090.96,4.00,5.00,6.00
Vuk Nedeljkovic,Chatter,Vuk,,168,0.00,-890.80,3.00,9.00,
Babie Richelle,Admin,SB,,122,0.00,-481.20,3.00,4.00,
Marinelle Dekla Cruz (Nellie),Chatter,"CK,JT",41274.00,162,254.78,7515.20,7.00,7.00,
```
