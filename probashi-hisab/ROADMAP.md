# Roadmap

Legend: ✅ done and tested · 🟡 partly done · ⬜ not started

## Phase 1 – Research and planning ✅
- ✅ Spreadsheet located and analysed (docs/EXCEL_ANALYSIS.md)
- ✅ Architecture, counting rules, database design (docs/)

## Phase 2 – UI/UX 🟡
- ✅ Design system: light/dark, Bengali font, reusable components, charts
- ✅ Onboarding (language, country, currency, rate, salary, target, tracking mode, demo)
- ✅ Dashboard, tabs, quick-add sheet, entry form, reports
- ⬜ App icon, splash screen, store graphics (Expo defaults are still in place)
- ⬜ Native date picker (date is typed or stepped with chips today)
- ⬜ Screen-reader pass on a real Android device

## Phase 3 – Core modules ✅ (v0.1)
- ✅ Income · ✅ Expenses abroad · ✅ Remittance with fee and recipient
- ✅ Family spending / home account ledger · ✅ Loans and debts · ✅ Savings goals
- ✅ 12 currencies, per-transaction frozen rates
- ⬜ Per-account balances at home (bKash / bank / cash)
- ⬜ People list (recipients as records instead of free text)
- ⬜ Debt interest / profit

## Phase 4 – Advanced
- ✅ Health score, rule-based insights, budgets with warnings
- ✅ Savings simulator, currency, remittance and debt calculators
- ✅ CSV export
- ⬜ PDF and Excel export, printable monthly summary
- ⬜ Backup file export + restore (full database, not only CSV)
- ⬜ Import from the existing Google Sheet / CSV
- ⬜ Recurring transactions and reminders (expo-notifications)
- ⬜ Calendar view
- ⬜ PIN lock and biometrics (expo-secure-store, expo-local-authentication)
- ⬜ Receipt photo attachment
- ⬜ Optional exchange-rate lookup (needs approval: network use and choice of provider)

## Phase 5 – Quality
- ✅ 46 unit/integration tests (money, counting rules, SQLite repository)
- ✅ End-to-end test of the web build
- ⬜ Test on real budget Android phones (performance, keyboard, fonts, small screens)
- ⬜ Component tests for forms

## Phase 6 – Android release
- 🟡 Application ID set (`com.emranmia.probashihisab`) – confirm before first upload, it can never change
- ⬜ EAS project + development build (needs the owner's Expo account)
- ⬜ Signed release build (needs signing credentials)
- ⬜ Play Store listing, screenshots, privacy policy page, data-safety form

## Later (kept modular, not started)
Cloud sync and multi-device, shared family accounts, voice entry in Bengali, receipt scanning,
automatic categorisation, premium plans.
