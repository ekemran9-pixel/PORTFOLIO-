import type { Category, CategoryGroup, CategoryScope } from './types';

type Row = [id: string, group: CategoryGroup, bn: string, en: string, icon: string];

/**
 * Default categories. The lists merge the user's own spreadsheet ("সেটিংস" sheet)
 * with the product brief. Icons are Ionicons names.
 */
const INCOME: Row[] = [
  ['inc_salary', 'income', 'বেতন', 'Salary', 'cash-outline'],
  ['inc_overtime', 'income', 'ওভারটাইম', 'Overtime', 'time-outline'],
  ['inc_food_allow', 'income', 'খাবার ভাতা', 'Food allowance', 'restaurant-outline'],
  ['inc_transport_allow', 'income', 'যাতায়াত ভাতা', 'Transport allowance', 'bus-outline'],
  ['inc_housing_allow', 'income', 'বাসা ভাতা', 'Accommodation allowance', 'home-outline'],
  ['inc_bonus', 'income', 'বোনাস', 'Bonus', 'gift-outline'],
  ['inc_parttime', 'income', 'পার্ট-টাইম কাজ', 'Part-time income', 'briefcase-outline'],
  ['inc_freelance', 'income', 'ফ্রিল্যান্স / অতিরিক্ত কাজ', 'Freelance / extra work', 'laptop-outline'],
  ['inc_business', 'income', 'ব্যবসা / বিক্রয়', 'Business / sales', 'storefront-outline'],
  ['inc_other', 'income', 'অন্যান্য আয়', 'Other income', 'add-circle-outline'],
];

const EXPENSE_ABROAD: Row[] = [
  ['exp_food', 'personal', 'খাবার ও বাজার', 'Food & groceries', 'basket-outline'],
  ['exp_rent', 'personal', 'বাসা ভাড়া', 'Room rent', 'bed-outline'],
  ['exp_utility', 'personal', 'বিদ্যুৎ ও পানি', 'Electricity & water', 'flash-outline'],
  ['exp_mobile', 'personal', 'মোবাইল ও ইন্টারনেট', 'Mobile & internet', 'phone-portrait-outline'],
  ['exp_transport', 'personal', 'যাতায়াত', 'Transport', 'bus-outline'],
  ['exp_fuel', 'personal', 'গাড়ি / জ্বালানি', 'Vehicle / fuel', 'car-outline'],
  ['exp_medical', 'personal', 'চিকিৎসা ও ওষুধ', 'Medical & medicine', 'medkit-outline'],
  ['exp_clothing', 'personal', 'পোশাক', 'Clothing', 'shirt-outline'],
  ['exp_shopping', 'personal', 'কেনাকাটা', 'Personal shopping', 'bag-handle-outline'],
  ['exp_restaurant', 'personal', 'রেস্টুরেন্ট', 'Restaurant', 'fast-food-outline'],
  ['exp_iqama', 'personal', 'ইকামা ও কাগজপত্র', 'Iqama / visa & papers', 'document-text-outline'],
  ['exp_tools', 'personal', 'কাজের সরঞ্জাম / টুলস', 'Work tools', 'construct-outline'],
  ['exp_education', 'personal', 'শিক্ষা', 'Education', 'school-outline'],
  ['exp_entertainment', 'personal', 'বিনোদন', 'Entertainment', 'game-controller-outline'],
  ['exp_travel', 'personal', 'ভ্রমণ / ছুটি', 'Travel / vacation', 'airplane-outline'],
  ['exp_repair', 'personal', 'মেরামত ও রক্ষণাবেক্ষণ', 'Repairs & maintenance', 'hammer-outline'],
  ['exp_subscription', 'personal', 'সাবস্ক্রিপশন', 'Subscriptions', 'repeat-outline'],
  ['exp_charity', 'social', 'দান ও যাকাত', 'Donation & zakat', 'heart-outline'],
  ['exp_gift', 'social', 'উপহার', 'Gifts', 'gift-outline'],
  ['exp_friends', 'social', 'বন্ধু ও আত্মীয়', 'Friends & relatives', 'people-outline'],
  ['exp_social_event', 'social', 'সামাজিক অনুষ্ঠান', 'Social events', 'sparkles-outline'],
  ['exp_other', 'personal', 'অন্যান্য খরচ', 'Other expenses', 'ellipsis-horizontal-circle-outline'],
];

const EXPENSE_HOME: Row[] = [
  ['home_household', 'family', 'সংসার খরচ (বাবা-মা)', 'Household (parents)', 'home-outline'],
  ['home_spouse', 'family', 'স্ত্রী / স্বামী', 'Wife / husband', 'person-outline'],
  ['home_children', 'family', 'সন্তান', 'Children', 'happy-outline'],
  ['home_groceries', 'family', 'বাজার ও খাবার', 'Groceries & food', 'basket-outline'],
  ['home_rent', 'family', 'বাড়ি ভাড়া', 'House rent', 'business-outline'],
  ['home_education', 'family', 'পড়াশোনা / শিক্ষা', 'Education fees', 'school-outline'],
  ['home_medical', 'family', 'চিকিৎসা', 'Medical', 'medkit-outline'],
  ['home_bills', 'family', 'বিদ্যুৎ ও গ্যাস বিল', 'Electricity & gas bills', 'flash-outline'],
  ['home_water_net', 'family', 'পানি ও ইন্টারনেট', 'Water & internet', 'wifi-outline'],
  ['home_mobile', 'family', 'মোবাইল রিচার্জ', 'Mobile recharge', 'phone-portrait-outline'],
  ['home_clothing', 'family', 'পোশাক', 'Clothing', 'shirt-outline'],
  ['home_transport', 'family', 'যাতায়াত', 'Transport', 'bus-outline'],
  ['home_purchase', 'family', 'ঘরের জিনিসপত্র', 'Household purchases', 'cart-outline'],
  ['home_event', 'social', 'বিয়ে / অনুষ্ঠান', 'Wedding / events', 'sparkles-outline'],
  ['home_charity', 'social', 'দান ও যাকাত', 'Donation & zakat', 'heart-outline'],
  ['home_gift', 'social', 'উপহার', 'Gifts', 'gift-outline'],
  ['home_relatives', 'social', 'আত্মীয় ও প্রতিবেশী', 'Relatives & neighbours', 'people-outline'],
  ['home_house_build', 'asset', 'বাড়ি তৈরি / মেরামত', 'House construction / repair', 'construct-outline'],
  ['home_land', 'asset', 'জমি কেনা', 'Land purchase', 'map-outline'],
  ['home_dps', 'asset', 'সঞ্চয় / ডিপিএস', 'Savings / DPS', 'wallet-outline'],
  ['home_invest', 'asset', 'বিনিয়োগ / ব্যবসা', 'Investment / business', 'trending-up-outline'],
  ['home_other', 'family', 'অন্যান্য খরচ', 'Other expenses', 'ellipsis-horizontal-circle-outline'],
];

/** Why the money was sent. `asset` purposes build wealth and are not consumption. */
const REMITTANCE: Row[] = [
  ['rem_family', 'family', 'সংসার খরচ', 'Family support', 'home-outline'],
  ['rem_parents', 'family', 'বাবা-মা', 'Parents', 'people-outline'],
  ['rem_spouse', 'family', 'স্ত্রী / স্বামী', 'Wife / husband', 'person-outline'],
  ['rem_children', 'family', 'সন্তান', 'Children', 'happy-outline'],
  ['rem_education', 'family', 'শিক্ষা', 'Education', 'school-outline'],
  ['rem_medical', 'family', 'চিকিৎসা', 'Medical', 'medkit-outline'],
  ['rem_house', 'asset', 'বাড়ি তৈরি', 'House construction', 'construct-outline'],
  ['rem_land', 'asset', 'জমি কেনা', 'Land purchase', 'map-outline'],
  ['rem_savings', 'asset', 'দেশে সঞ্চয়', 'Savings in Bangladesh', 'wallet-outline'],
  ['rem_invest', 'asset', 'বিনিয়োগ', 'Personal investment', 'trending-up-outline'],
  ['rem_other', 'family', 'অন্যান্য', 'Other', 'ellipsis-horizontal-circle-outline'],
];

function build(scope: CategoryScope, rows: Row[]): Category[] {
  return rows.map(([id, group, bn, en, icon], i) => ({
    id,
    scope,
    group,
    bn,
    en,
    icon,
    sort: i,
    custom: false,
  }));
}

export const DEFAULT_CATEGORIES: Category[] = [
  ...build('income', INCOME),
  ...build('expense_abroad', EXPENSE_ABROAD),
  ...build('expense_home', EXPENSE_HOME),
  ...build('remittance', REMITTANCE),
];

export const PAYMENT_METHODS_ABROAD = [
  { bn: 'নগদ', en: 'Cash' },
  { bn: 'ব্যাংক', en: 'Bank' },
  { bn: 'কার্ড', en: 'Card' },
  { bn: 'মোবাইল ওয়ালেট (STC Pay ইত্যাদি)', en: 'Mobile wallet (STC Pay etc.)' },
  { bn: 'অন্যান্য', en: 'Other' },
];

export const PAYMENT_METHODS_HOME = [
  { bn: 'বিকাশ', en: 'bKash' },
  { bn: 'নগদ (অ্যাপ)', en: 'Nagad' },
  { bn: 'রকেট', en: 'Rocket' },
  { bn: 'ব্যাংক একাউন্ট', en: 'Bank account' },
  { bn: 'হাতে নগদ', en: 'Cash in hand' },
  { bn: 'অন্যান্য', en: 'Other' },
];

export const TRANSFER_METHODS = [
  { bn: 'ব্যাংক ট্রান্সফার', en: 'Bank transfer' },
  { bn: 'এক্সচেঞ্জ হাউস', en: 'Exchange house' },
  { bn: 'বিকাশ', en: 'bKash' },
  { bn: 'নগদ (অ্যাপ)', en: 'Nagad' },
  { bn: 'মোবাইল অ্যাপ (STC Pay ইত্যাদি)', en: 'Mobile app (STC Pay etc.)' },
  { bn: 'অন্যান্য', en: 'Other' },
];
