# MASSUP — full store (website + backend)

Two folders, exactly these names:

- `website-01-cinematic`  → the website (React). Deploy on Vercel.
- `backend`               → the server + admin panel (Django). Deploy on Render.

## What is new in this version
- Sign up / log in with an **email OTP** (6 digits, 10 minutes). The whole site is locked until you log in. One account per email. You stay logged in on that device (a year).
- Add to bag, wishlist, stock counts ("Only 3 left"), order history, Rewards button in the navbar.
- Every order gets its **own new UPI QR code**. The customer pays, types the UPI reference (UTR) and presses "I have paid". You check your UPI app and press **Confirm** in the admin → order becomes Paid, a scratch card + receipt are unlocked.
- Scratch cards (₹ off, % off, free shipping), festival offers (Diwali, Holi, Eid… switch ON in admin), loyalty: after 10 paid orders the 11th is free up to ₹5,000.
- Admin (`/manage`): Orders with payment status, Customers, Analytics (visitors, signed-up emails, logins), Festivals, Scratch-card prizes, Coupons, Products with stock, Settings (UPI ID, terms & conditions, loyalty), detailed printable invoice.
- Font is Inter everywhere. Any change in admin shows on the website within seconds.

## Run on your Windows PC
Backend (PowerShell, inside `backend`):
```
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py ensure_admin
python manage.py seed_products --if-empty
python manage.py seed_offers
python manage.py runserver
```
(Set `ADMIN_USERNAME` and `ADMIN_PASSWORD` first: `$env:ADMIN_USERNAME="owner"; $env:ADMIN_PASSWORD="your-strong-password"`.)
While testing, the login OTP is **printed in this PowerShell window**.

Website (second PowerShell, inside `website-01-cinematic`):
```
npm install
npm run dev
```
Open http://localhost:5173 — admin is http://localhost:5173/manage

## Go live (after pushing to GitHub)
1. Render (backend): Build command `bash build.sh`, Start `gunicorn config.wsgi`. Environment: the values in `backend/.env.example`.
   **To send real OTP emails** add `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD` (Gmail: create an "App password"), `DEFAULT_FROM_EMAIL`. Without them, nobody receives OTP emails.
2. Vercel (website): redeploy; nothing else needed.
3. Open `/manage` → **Settings** → type your real **UPI ID**. Until then checkout says payment isn't set up.
4. Open `/manage` → **Festivals** → switch ON the offers you want (Diwali etc.) and set the % .

## Honest limits
- Without a payment gateway (Razorpay etc.) the app cannot see your bank. So payment is confirmed by **you** pressing Confirm after checking the UPI reference. Settings has a "testing only" auto-confirm switch; keep it OFF in real life.
- Render's free plan sleeps and its SQLite file resets; use a free Postgres (`DATABASE_URL`) so customers/orders are kept.
