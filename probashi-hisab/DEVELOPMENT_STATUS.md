# Development Status

**Version:** 0.1.0 · **Updated:** 2026-11-11 · **Branch:** `claude/probashi-hisab-app-htzjf9`

## Verified in this milestone

| Check | Result |
|---|---|
| `npm run typecheck` (TypeScript strict) | pass |
| `npm run lint` (eslint-config-expo) | pass, 0 warnings |
| `npm test` – 46 tests in 4 suites | pass |
| `npm run build:web` + `node e2e/flow.js` (headless Chromium, 400×860) | pass |

The end-to-end run goes through onboarding, enters the spreadsheet's November rows through the real forms,
and checks: net savings 3,691.36 SAR / ৳1,19,600, sent 1,913.58 SAR, receivable 1,900 SAR, home balance ৳52,000,
persistence after reload, edit, delete, search, goal deposit, simulator (500 × 60 = 30,000), language and theme
switch, wipe, demo mode, and that the browser console has no errors.

## Not verified — be aware

- **The app has not been run on an Android phone or emulator.** This environment has no Android SDK and cannot
  reach Expo's servers. All UI verification was done on the web build of the same code. Things that only a device
  shows (keyboard behaviour, safe areas, back button, share sheet for CSV, performance) are untested.
- **Screen readers** were not tested; labels and roles are set but unconfirmed.
- CSV export on phones uses the system share sheet (`Share.share`); only the web download path was exercised.

## Known limitations

- Dates are typed as `YYYY-MM-DD` or set with the chips and ± buttons; there is no calendar picker yet.
- Debts are principal-only (no interest).
- Budgets apply to expenses abroad, in the earning currency.
- Savings-goal opening amounts in a third currency (neither BDT nor the earning currency) are not included in the
  dashboard total.
- A loan or goal accepts movements only in its own currency.
- No PIN/biometric lock, notifications, PDF/Excel export, backup/restore, recurring entries, or receipt photos yet.
- The Bengali date field shows ASCII digits while typing; hints and lists use Bengali digits.
- App icon and splash are still Expo's defaults.

## Blockers that need the owner

1. **Separate GitHub repository.** This session may only write to `ekemran9-pixel/PORTFOLIO-`, so the project is in
   the `probashi-hisab/` folder of that repository. To move it: create an empty `probashi-hisab` repository and
   grant access; the folder can then be pushed there with its history.
2. **Expo account** for EAS builds (the only way to get an installable APK/AAB without a local Android toolchain).
3. **Application ID** `com.emranmia.probashihisab` – confirm or change before the first Play upload.
4. **Decision on exchange-rate lookup** – today rates are typed by hand and the app is fully offline.
