# LifeHub: আপনার ব্যক্তিগত AI অটোমেশন হাব

শুধু আপনার জন্য একটা private website। এখানে কাস্টমার, হিসাব, কাজ, ছবি/ভিডিও/নোট সব এক জায়গায় থাকে। AI-কে বাংলায় বা ভয়েসে কমান্ড দেওয়া যায়, Notion ও Excel/Google Sheets-এর সাথে যুক্ত থাকে, Telegram বট দিয়ে ফোন থেকে চালানো যায়, আর রেসিপি দিয়ে নিজে থেকে কাজ হয়। সাইটটি বাংলা ও English দুই ভাষায় চলে, আর cPanel hosting-এ PHP + MySQL দিয়েই চলে (Composer বা Node লাগে না)।

---

## কী কী আছে

### Phase 1: ড্যাশবোর্ড ও ডেটা
| পেজ | কাজ |
|---|---|
| ড্যাশবোর্ড | এ মাসের আয়/ব্যয়/ব্যালান্স, ৬ মাসের চার্ট, বাকি কাজ, নতুন কাস্টমার, সাম্প্রতিক ছবি, কার্যক্রম |
| কাস্টমার | যোগ/এডিট/মুছুন, সার্চ, ট্যাগ, প্রোফাইল (কল, WhatsApp, এন্ট্রি, ফাইল) |
| ডেটা এন্ট্রি | আয়, ব্যয়, কাজ, নোট; ফিল্টার; এক ক্লিকে কাজ সম্পন্ন |
| মিডিয়া ভল্ট | ছবি, ভিডিও, অডিও, PDF/Word/Excel আপলোড, টেক্সট নোট |
| Excel ইমপোর্ট/এক্সপোর্ট | .xlsx/.xls/.csv; বাংলা কলামের নামও চেনে; CSV ও Excel ডাউনলোড |

### Phase 2: AI কমান্ড সেন্টার
- **AI চ্যাট** আপনার ডেটা দেখে উত্তর দেয়। Gemini, Groq, OpenAI বা Claude যেকোনোটা দিয়ে চলে, সেটিংস থেকে বেছে নেবেন।
- **AI দিয়ে ডেটা যোগ:** “আজ ৫০০ টাকা যাতায়াত খরচ লিখে রাখো” বললে AI এন্ট্রির প্রস্তাব দেয়, আপনি “যোগ করুন” চাপলে সেভ হয়।
- **আমার কমান্ড:** বারবার ব্যবহার করা নির্দেশ সেভ করে রাখুন, এক ক্লিকে চালান।
- **🎤 ভয়েস → টেক্সট:** বাংলাতেও কাজ করে (Groq/OpenAI Whisper বা Gemini; key না থাকলে Chrome-এর নিজস্ব ভয়েস ব্যবহার হয়)।
- **🔊 পড়ে শোনানো:** AI-এর উত্তর জোরে পড়ে শোনায়।
- **📷 ছবি দিয়ে প্রশ্ন:** ছবি থেকে লেখা বের করা (OCR) বা ছবির বর্ণনা।
- **অডিও/ভিডিও → লেখা:** মিডিয়া ভল্টে “লেখায় রূপান্তর” বাটন।

### Phase 3: Notion, রিপোর্ট, লাইভ লিংক
- **Notion দুই দিকে সিঙ্ক:** কাস্টমার ও এন্ট্রি Notion ডেটাবেসে যায়। Notion-এ নতুন সারি লিখলে সেটাও LifeHub-এ চলে আসে। মুছলে Notion-এও archive হয়।
- **Notion ওভারভিউ পেজ:** মাস/সপ্তাহ/বছরের হিসাব, সেরা কাস্টমার, বড় খরচ, বাকি কাজ, আর AI বিশ্লেষণ।
- **ওভারভিউ রিপোর্ট:** বছরের চার্ট, মাসভিত্তিক টেবিল, সেরা কাস্টমার, বড় খরচ, AI বিশ্লেষণ, প্রিন্ট।
- **Excel / Google Sheets লাইভ লিংক:** Sheets-এ `=IMPORTDATA(...)` দিলে ডেটা নিজে থেকে আপডেট হয়; Excel-এ Data → From Web।

### Phase 4: অটোমেশন ও ফোন
- **রেসিপি (“যখন → তখন”):** সময়সূচি (প্রতিদিন/সপ্তাহ/মাস), কোনো ঘটনা (নতুন এন্ট্রি, কাস্টমার, কাজ সম্পন্ন, আপলোড) বা webhook দিয়ে চালু হয়।
  - কাজের ধরন: Telegram মেসেজ, AI দিয়ে কাজ (Telegram-এ পাঠানো বা নোট হিসেবে সেভ), রিপোর্ট, Notion পেজ/সিঙ্ক, n8n/Zapier/IFTTT webhook, নিয়মিত এন্ট্রি (যেমন ভাড়া)।
  - ৭টি তৈরি রেসিপি আছে: সকালের পরিকল্পনা, রাতের হিসাব, সাপ্তাহিক AI রিভিউ, মাসিক Notion রিপোর্ট, বড় আয়ের নোটিফিকেশন, নতুন কাস্টমার → n8n, মাসিক ভাড়া।
- **Telegram বট:** শুধু আপনার জন্য (৬ সংখ্যার কোড দিয়ে জোড়া লাগাতে হয়)। লেখা, ভয়েস বা ছবি পাঠালে AI কাজ করে। কমান্ড: `/today`, `/income 5000 বিক্রি`, `/expense 300 নাস্তা`, `/task`, `/done`, `/note`, `/customer`, `/find`, `/run`।
- **ফোন অ্যাপ ও Webhook API (`hook.php`):** iPhone Shortcuts, Android MacroDroid/Tasker, n8n, Zapier, Make থেকে হিসাব যোগ, AI-কে প্রশ্ন, রিপোর্ট নেওয়া বা রেসিপি চালানো যায়।

**নিরাপত্তা:**
- লগইন ছাড়া কিছুই দেখা যায় না, ফাইলগুলোও না।
- ৫ বার ভুল পাসওয়ার্ড দিলে লগইন ১৫ মিনিট বন্ধ থাকে।
- সব ফর্মে CSRF সুরক্ষা আছে।
- API key শুধু সার্ভারে থাকে।
- Telegram, cron, লাইভ লিংক আর API সবই আলাদা গোপন key দিয়ে সুরক্ষিত।

---

## cPanel-এ চালু করার নিয়ম

### ১. ডেটাবেস
cPanel → **MySQL® Databases**:
1. ডেটাবেস বানান, যেমন `cpuser_lifehub`।
2. একটা ইউজার বানান।
3. ইউজারটিকে ডেটাবেসে যোগ করে **ALL PRIVILEGES** দিন।

### ২. ফাইল আপলোড
1. **File Manager** → `public_html` (বা সাব-ডোমেইনের ফোল্ডার) খুলুন।
2. `lifehub.zip` আপলোড করে **Extract** দিন।
3. `lifehub` ফোল্ডারের ভেতরের সব ফাইল যেখানে সাইট চালাতে চান সেখানে রাখুন। **Show Hidden Files** চালু রাখবেন, যাতে `.htaccess` আর `.user.ini`-ও সাথে যায়।

### ৩. PHP
**Select PHP Version** থেকে PHP **8.1 বা নতুন** বাছাই করুন। extension: `pdo_mysql`, `curl`, `mbstring`, `fileinfo`।

### ৪. ইনস্টল
1. ব্রাউজারে `https://আপনার-ডোমেইন/install.php` খুলুন।
2. ডেটাবেসের তথ্য আর নিজের অ্যাডমিন ইউজারনেম/পাসওয়ার্ড দিন।
3. ✅ ইনস্টল শেষে **`install.php` ফাইলটি ডিলিট করুন**।

### ৫. HTTPS (Telegram-এর জন্য জরুরি)
1. **SSL/TLS Status → Run AutoSSL** চালান (ফ্রি)।
2. `.htaccess`-এ “Force HTTPS” অংশের তিনটি লাইনের সামনের `#` মুছে দিন।

### ৬. Cron (সময়সূচির রেসিপির জন্য)
cPanel → **Cron Jobs** → “Once Per Five Minutes” বেছে নিন। কমান্ডের জায়গায় দিন:
```
php /home/আপনার-cpanel-ইউজার/public_html/cron.php
```
সঠিক path আর বিকল্প URL অটোমেশন পেজে দেখানো থাকে। cron না দিলেও আপনি সাইট খুললে রেসিপিগুলো চেক হয়, তবে নির্দিষ্ট সময়ে চলার জন্য cron দেওয়াই ভালো।

### ৭. ফোনে অ্যাপের মতো
Chrome → মেনু (⋮) → **Add to Home screen**।

---

## প্রথমবার সেটআপ (১০ মিনিট)

1. **AI key (ফ্রি):** [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) থেকে Gemini key, অথবা [console.groq.com/keys](https://console.groq.com/keys) থেকে Groq key নিন। তারপর **সেটিংস → API কানেকশন**-এ দিন। Groq key ভয়েস → টেক্সটও চালায়। সেটিংসে “পরীক্ষা” চেপে দেখে নিন key কাজ করছে কিনা।
2. **Telegram:** [@BotFather](https://t.me/BotFather)-এ `/newbot` লিখে token নিন। token সেটিংসে দিন। তারপর **অটোমেশন → বট কানেক্ট করুন** চাপুন, বটটি খুলে Start চাপুন।
3. **Notion:** [notion.so/my-integrations](https://www.notion.so/my-integrations)-এ integration বানিয়ে token সেটিংসে দিন। Notion-এ একটা পেজ বানিয়ে **Connections**-এ integration যোগ করুন। তারপর **Notion পেজ → লিংক দিন → ডেটাবেস তৈরি করুন → এখনই সিঙ্ক করুন**।
4. **Google Sheets:** সেটিংস → “Excel / Google Sheets লাইভ লিংক” থেকে সূত্রটি কপি করে Sheets-এর কোনো ঘরে পেস্ট করুন।
5. **রেসিপি:** অটোমেশন → তৈরি রেসিপি → “+ যোগ”।

---

## ফোন থেকে API ব্যবহার (উদাহরণ)
```
POST https://আপনার-ডোমেইন/hook.php
Authorization: Bearer <অটোমেশন পেজের token>
Content-Type: application/json

{"action":"say","text":"আজ ৫০০ টাকা যাতায়াত খরচ"}        → AI বুঝে এন্ট্রি যোগ করে, উত্তর দেয়
{"action":"add_entry","type":"income","title":"বিক্রি","amount":2500}
{"action":"add_customer","name":"করিম","phone":"017…"}
{"action":"report","period":"today"}                          → আজকের সারাংশ
{"action":"run_recipe","id":1,"data":{…}}
```
**iPhone Shortcuts:**
1. Dictate Text
2. Get Contents of URL (POST, উপরের header ও JSON, `text` = Dictated Text)
3. Get Dictionary Value `reply`
4. Speak Text

---

## ব্যাকআপ
- **ডেটা:** সেটিংস → ব্যাকআপ ডাউনলোড (JSON), অথবা cPanel → phpMyAdmin → Export।
- **ফাইল:** `uploads/` ফোল্ডার zip করে রাখুন।

## ফোল্ডার গঠন
```
index.php      ড্যাশবোর্ড              ai.php        AI কমান্ড সেন্টার
customers.php  কাস্টমার লিস্ট           customer.php  কাস্টমার প্রোফাইল
entries.php    ডেটা এন্ট্রি              media.php     মিডিয়া ভল্ট
reports.php    ওভারভিউ রিপোর্ট           notion.php    Notion সংযোগ
recipes.php    অটোমেশন / রেসিপি          settings.php  API key, AI, লাইভ লিংক, ব্যাকআপ
import.php / export.php  Excel           file.php      সুরক্ষিত ফাইল দেখানো
telegram.php   Telegram বট (webhook)     hook.php      ফোন/n8n API
cron.php       সময়সূচি চালানো           feed.php      Sheets/Excel লাইভ ডেটা
inc/           মূল কোড (ব্রাউজার থেকে বন্ধ)
lang/          বাংলা (bn.php) ও English (en.php) লেখা — শব্দ বদলাতে এখানে
assets/        ডিজাইন, জাভাস্ক্রিপ্ট, Chart.js, SheetJS
uploads/       আপলোড করা ফাইল (সরাসরি বন্ধ)
```

## আপডেট করার নিয়ম
নতুন সংস্করণের ফাইলগুলো পুরনোগুলোর উপর আপলোড করুন। `config.php`, `uploads/` আর `data/` রেখে দিন। ডেটাবেস নিজে থেকেই আপডেট হয়ে যাবে।
