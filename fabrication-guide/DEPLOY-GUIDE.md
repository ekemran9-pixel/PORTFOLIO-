# ফ্যাব্রিকেশন ফোরম্যান গাইড — অনলাইনে চালু করার নিয়ম

`site/` ফোল্ডারটাই পুরো ওয়েবসাইট। কোনো সার্ভার বা ডেটাবেস লাগে না।

## GitHub থেকে Netlify-তে অটো-ডিপ্লয় (প্রস্তাবিত)

এই গাইডটি Netlify-র `emranfabrication` সাইটে (https://emranfabrication.netlify.app) GitHub থেকে চলে। এখন সেটি `fabrication-foreman-guide` ব্রাঞ্চ থেকে deploy হয়; ওই ব্রাঞ্চের রুটে থাকা `netlify.toml` বলে দেয় `fabrication-guide/site` ফোল্ডারটাই সাইট। তাই ওই ব্রাঞ্চে push করলেই সাইট আপডেট হয়।

**`main` থেকে সরাসরি deploy করতে চাইলে:** Netlify → `emranfabrication` → **Project configuration → Build & deploy**:
   - **Branch to deploy:** `main`
   - **Base directory:** `fabrication-guide/site`
   - **Build command:** খালি রাখুন

**নতুন সাইট বানাতে চাইলে:** **Add new project → Import an existing project → GitHub** → একই রিপো, Base directory `fabrication-guide/site`, Build command খালি।

> এই রিপোতে দুটি সাইট আছে (`fabrication-guide` আর `phosphate-equipment-guide`)। Base directory আলাদা করে দিলে একটার পরিবর্তনে অন্যটা রি-ডিপ্লয় হবে না।

## হাতে আপলোড করে চালু করুন (Deploy manually)

1. [netlify.com](https://netlify.com) → লগইন (আগের সাইটের অ্যাকাউন্টই চলবে)
2. **Add new site → Deploy manually**
3. `site` ফোল্ডারটি (অথবা `fabrication-foreman-guide.zip` আনজিপ করে) টেনে ছেড়ে দিন
4. লিংক পেয়ে যাবেন, যেমন `xyz.netlify.app`। **Site settings → Change site name** দিয়ে নাম দিন, যেমন `fab-foreman-bd`

নিজের ডোমেইনের সাব-ডোমেইনে রাখতে চাইলে (যেমন `guide.emranmia.com`): Netlify-তে **Domain settings → Add custom domain**, তারপর ডোমেইনের DNS-এ একটি `CNAME` রেকর্ড: `guide` → `xyz.netlify.app`।

## অফলাইন ব্যবহার

HTTPS-এ একবার সাইট খুললে মোবাইল ব্রাউজার সেটি সংরক্ষণ করে রাখে, সাইটে নেটওয়ার্ক না থাকলেও খুলবে। ব্রাউজারের মেনু থেকে **Add to Home screen** দিলে অ্যাপের মতো আইকন হবে।

## লেখা বা তথ্য বদলাতে

- লেখাগুলো `src/` ফোল্ডারে, প্রতিটি মডিউল আলাদা ফাইলে (`m01-pipe.html`, `m05-fittings.html` …)
- টেবিলের ডেটা, কুইজ, শব্দকোষ: `src/data.js`
- ক্যালকুলেটর ও অন্যান্য কাজ: `src/app.js`
- ক্যালকুলেটরের ছবি/অ্যানিমেশন: `src/viz.js` (স্টাইল `src/head.html`-এ)
- বদলানোর পর `python3 build.py` চালালে `site/index.html` নতুন করে তৈরি হবে। `site/index.html` সহ কমিট করে GitHub-এ push করলেই Netlify আপডেট হবে
- বড় পরিবর্তনের পর `site/sw.js` এ `fabguide-v3` কে `fabguide-v4` করে দিন, যাতে পুরনো অফলাইন কপি আপডেট হয়
