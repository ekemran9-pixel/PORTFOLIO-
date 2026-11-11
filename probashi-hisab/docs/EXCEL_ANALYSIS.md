# Excel Analysis Report

**File analysed:** the owner's Google Sheet *"আয়-ব্যয় হিসাব (Money Expense Tracker) — ইমরান"*
(found in Google Drive; read on 2026-11-11, every sheet and every formula).
No expatriate-finance spreadsheet exists in the repository itself. Two other sheets in Drive
(an Umrah trip cost split and a job tracker) were checked and are unrelated.

## 1. What the workbook contains

| Sheet | Purpose | Key formulas |
|---|---|---|
| **ড্যাশবোর্ড** | Month picker (`TEXT(TODAY(),"YYYY-MM")`), income / expense / savings / savings-rate, today's spend, all-time balance, top categories and payment methods | `SUMIFS(লেনদেন!H, month, type)`, `B4-B5`, `B6/B4`, two `QUERY … group by` tables |
| **লেনদেন** | The ledger: date, month, type (আয়/খরচ), category, description, amount, currency (SAR/BDT), SAR value, BDT value, payment method, note | `H = IF(currency="BDT", amount/rate, amount)`, `I = IF(currency="BDT", amount, amount*rate)` with **one** rate cell `সেটিংস!F3` |
| **দেশের হিসাব** | Bangladesh account: money sent (auto-pulled from ledger rows in category "দেশে টাকা পাঠানো"), other deposits, family spending by category and by who spent it, running balance per row | `B3 = SUMIF(লেনদেন!D,"দেশে টাকা পাঠানো",লেনদেন!I)`, `B7 = B5-B6`, running `SUMIFS(… "<="&date)` |
| **মাসিক সারাংশ** | 24 months of income / expense / savings in SAR and BDT, all-time total per category | `SUMIFS` per month, `× সেটিংস!F3` |
| **বাজেট** | Monthly limit per category, spent, remaining, % used | `SUMIFS` per category and month |
| **সেটিংস** | 24 expense categories, 9 income categories, payment methods, rate (1 SAR = 32.40 ৳), income and savings targets, 19 home-expense categories, home accounts | dropdown source lists |

Data in the sheet at the time of reading (November 2026): salary 4,200 SAR; ৳62,000 sent home;
1,800 + 100 SAR lent; 20 SAR mobile; 20 SAR loan repayment; 100 SAR donation; 80 SAR transport;
৳10,000 household spending at home. Dashboard result: expense 4,033.58 SAR, savings 166.42 SAR (4.0 %),
Bangladesh balance ৳52,000.

## 2. What is good and was preserved

| Spreadsheet idea | In the app |
|---|---|
| Five-field entry (date, type, category, amount, method) | The entry form: amount, category, date chips, method chips |
| Enter in SAR **or** BDT, see both | Every transaction stores the original amount, the rate, the BDT value and the earning-currency value |
| "দেশের হিসাব": remittances credit a home account, family spending debits it, running balance | *Home account* screen with the same ledger and running balance (`homeLedger`) |
| "কে খরচ করেছে" column | *Who spent it* field on family expenses, with name chips |
| Budget per category with % used and a red warning | *Monthly budget* screen and dashboard progress bars |
| Category and payment-method lists | Seeded as default categories (incl. ইকামা ও কাগজপত্র, কাজের সরঞ্জাম, দান ও যাকাত), plus custom categories |
| Month picker and 24-month summary | Period chips (this / last / 3 / 6 / 12 months / all / custom) and a 12-month chart |
| Savings rate = savings ÷ income | Same formula, in basis points, no floating point |

## 3. Problems found, and how the app fixes them

1. **One exchange rate for all time.** Every SAR↔BDT value multiplies by the single cell `সেটিংস!F3`.
   Changing the rate next month silently rewrites every past month.
   → Each transaction freezes its own rate and converted values. Test: *"changing today's rate does not change past values"*.
2. **Lending is counted as spending.** "ধার দেওয়া" (1,900 SAR) sits in the expense list, so the sheet reports
   4,033.58 SAR "spent" and only 4 % saved, although that money is owed back.
   → Loans are their own transaction kinds; they change cash and receivables, never income or spending.
3. **Loan repayments and borrowed money distort income/expense.** "ঋণ পরিশোধ" is an expense and "ধার ফেরত পাওয়া" is income.
   → Same fix; each loan has principal, repayments, outstanding balance and optional instalment.
4. **Remittance and family spending are both "expenses".** The ledger treats the ৳62,000 transfer as an expense, while the home
   sheet also lists the ৳10,000 the family spent out of it. Any consolidated total would count the same money twice.
   → A remittance is a transfer. In *home account* mode the family's spending is the expense; in *simple* mode the transfer
   is the expense. Never both.
5. **"Savings" is really "cash left".** `B4-B5` is what remains in hand after transfers and loans, not what was saved.
   → The app shows both, named separately: *প্রকৃত সঞ্চয়* (income − real spending) and *হাতে বাকি* (cash left abroad).
   For the sheet's month the app's "cash left" is exactly 166.42 SAR — asserted in `__tests__/summary.test.ts`.
6. **Savings and investment are expense categories** ("সেভিংস / জমা", "বিনিয়োগ", "জমি কেনা").
   → Savings goals and asset-type purposes are excluded from consumption.
7. **Floating-point money.** 62,000 ÷ 32.40 = 1913.5802469… is stored unrounded.
   → Integer minor units and BigInt conversion with half-up rounding.
8. **Missing data is accepted.** Rows without a payment method or amount exist; a category typo breaks `SUMIF`.
   → Validated forms; categories are chosen, not typed.
9. **Transfer fee has no place.** → Fee field on remittances; fees are reported and counted as spending.
10. **Only SAR and BDT.** → 12 currencies, including 3-decimal KWD / OMR / BHD.
11. **No debt ledger, no goals, no health score, no projection.** → Added (see README).

## 4. Not carried over

- Per-row "বাকি ছিল" for *other* accounts (bKash / bank / cash at home as separate balances): the app keeps one
  home balance and stores the account name as the payment method. Per-account balances are on the roadmap.
- "মাসিক আয়ের লক্ষ্য": replaced by the expected monthly salary setting.
- Import of the existing rows: not built yet (roadmap, Phase 4). The sheet currently has 9 rows, so re-entering them takes minutes.
