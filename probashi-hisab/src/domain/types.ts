import type { CurrencyCode } from './money';

/**
 * Every movement of money is one row. `kind` decides how it is counted, which is
 * what prevents double counting (see docs/ARCHITECTURE.md §Counting rules).
 */
export type TxKind =
  | 'income' // money earned (wallet: abroad) or other deposit at home (wallet: home)
  | 'expense' // money spent abroad (wallet: abroad) or by the family at home (wallet: home)
  | 'remittance' // transfer abroad → Bangladesh. A transfer, not an expense by itself
  | 'debt_given' // lent money to someone (not an expense: it is owed back)
  | 'debt_collected' // got lent money back (not income)
  | 'debt_taken' // borrowed money (not income)
  | 'debt_repaid' // repaid borrowed money / instalment (not an expense)
  | 'goal_deposit' // moved money into a savings goal
  | 'goal_withdraw'; // took money out of a savings goal

export type Wallet = 'abroad' | 'home';

export interface Tx {
  id: string;
  kind: TxKind;
  wallet: Wallet;
  /** Local calendar date, YYYY-MM-DD */
  date: string;
  /** Original amount in `currency` minor units. Always positive. */
  amountMinor: number;
  currency: CurrencyCode;
  /** BDT per 1 unit of `currency` at the time of the transaction, ×1e6. */
  rateMicro: number;
  /** Amount in BDT paisa, frozen at entry time. */
  bdtMinor: number;
  /** The earning currency at entry time and the amount expressed in it, frozen. */
  baseCurrency: CurrencyCode;
  baseMinor: number;
  /** Remittance transfer fee, in BDT paisa and base minor (0 otherwise). */
  feeBdtMinor: number;
  feeBaseMinor: number;
  categoryId: string | null;
  /** Recipient, payer, or the family member who spent the money. */
  person: string | null;
  /** Payment method / account (free text chosen from a list). */
  method: string | null;
  reference: string | null;
  note: string | null;
  debtId: string | null;
  goalId: string | null;
  createdAt: number;
}

export type CategoryScope = 'income' | 'expense_abroad' | 'expense_home' | 'remittance';

/**
 * `group` drives the dashboard split:
 *  personal – own living cost; family – household in Bangladesh; social – friends,
 *  relatives, gifts, donations; asset – builds wealth (land, house, deposits).
 */
export type CategoryGroup = 'personal' | 'family' | 'social' | 'asset' | 'income';

export interface Category {
  id: string;
  scope: CategoryScope;
  group: CategoryGroup;
  bn: string;
  en: string;
  icon: string;
  sort: number;
  custom: boolean;
}

export type DebtDirection = 'lent' | 'borrowed';

export interface Debt {
  id: string;
  direction: DebtDirection;
  person: string;
  wallet: Wallet;
  currency: CurrencyCode;
  /** YYYY-MM-DD or null */
  dueDate: string | null;
  /** Planned monthly instalment in `currency` minor units (0 = none). */
  monthlyMinor: number;
  note: string | null;
  createdAt: number;
}

export interface Goal {
  id: string;
  name: string;
  icon: string;
  currency: CurrencyCode;
  targetMinor: number;
  /** Savings the user already had when creating the goal. */
  openingMinor: number;
  targetDate: string | null;
  createdAt: number;
}

export interface Budget {
  categoryId: string;
  /** Monthly limit in the earning currency, minor units. */
  limitMinor: number;
  currency: CurrencyCode;
}

export interface Settings {
  onboarded: boolean;
  language: 'bn' | 'en';
  theme: 'system' | 'light' | 'dark';
  bnDigits: boolean;
  country: string;
  baseCurrency: CurrencyCode;
  /** Latest BDT-per-unit rate the user entered for the earning currency, ×1e6. */
  baseRateMicro: number;
  /** Date (YYYY-MM-DD) the rate above was entered. */
  baseRateDate: string;
  /** Expected monthly salary in earning currency minor units. */
  salaryMinor: number;
  /** Monthly savings target in earning currency minor units. */
  savingsTargetMinor: number;
  /**
   * true  → "দেশের হিসাব" mode: remitted money lands in a Bangladesh account and the
   *         family's spending is recorded from it (what the user's spreadsheet does).
   * false → simple mode: money sent for family use counts as spent when it is sent.
   */
  trackHome: boolean;
  /** Dashboard shows amounts in BDT (true) or in the earning currency (false). */
  showInBdt: boolean;
  demo: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  onboarded: false,
  language: 'bn',
  theme: 'system',
  bnDigits: true,
  country: 'SA',
  baseCurrency: 'SAR',
  baseRateMicro: 0,
  baseRateDate: '',
  salaryMinor: 0,
  savingsTargetMinor: 0,
  trackHome: false,
  showInBdt: false,
  demo: false,
};

export interface AppData {
  settings: Settings;
  categories: Category[];
  txs: Tx[];
  debts: Debt[];
  goals: Goal[];
  budgets: Budget[];
}
