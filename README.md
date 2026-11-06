<p align="center">
  <img src="assets/banner.svg" alt="MASSUP — Pistachio Protein Powder" width="100%" />
</p>

<h1 align="center">MASSUP · Animation Clash</h1>

<p align="center">
  <b>Five cinematic storefront concepts for one pistachio protein brand, sharing a Django REST backend.</b><br/>
  <i>Good fuel. Great feeling.</i>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white" alt="Vite 8" />
  <img src="https://img.shields.io/badge/Framer%20Motion-14-0055FF?logo=framer&logoColor=white" alt="Framer Motion" />
  <img src="https://img.shields.io/badge/GSAP-3-88CE02?logo=greensock&logoColor=white" alt="GSAP" />
  <img src="https://img.shields.io/badge/Django-5.2-092E20?logo=django&logoColor=white" alt="Django 5.2" />
  <img src="https://img.shields.io/badge/DRF-3.15-A30000" alt="Django REST Framework" />
  <img src="https://img.shields.io/badge/PostgreSQL-ready-336791?logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Deploy-Vercel%20%2B%20Render-000000?logo=vercel&logoColor=white" alt="Vercel and Render" />
</p>

---

## Contents

- [Overview](#overview)
- [The five concepts](#the-five-concepts)
- [Website 01 · Cinematic (MASSUP)](#website-01--cinematic-massup)
- [Architecture](#architecture)
- [Backend API](#backend-api)
- [Data model](#data-model)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Testing](#testing)
- [Deployment](#deployment)
- [Project structure](#project-structure)
- [Design system](#design-system)
- [Troubleshooting](#troubleshooting)

---

## Overview

This repository holds five independent front-end experiments, each a different take on how a single product page can feel. The flagship is **Website 01 · Cinematic**, a full storefront for **MASSUP Pistachio Protein Powder**. It talks to a **Django REST backend** that handles the catalogue, coupons, GST-aware billing, invoices, site media, and a staff dashboard.

<p align="center">
  <img src="website-01-cinematic/public/images/massup-01-jar-hero.jpg" alt="MASSUP Pistachio Protein Powder jar" width="320" />
</p>

## The five concepts

| # | Folder | Concept | Stack highlights |
|---|--------|---------|------------------|
| 01 | [`website-01-cinematic`](website-01-cinematic) | **Cinematic MASSUP storefront** with a backend, admin, and video hero | React 19, Framer Motion, GSAP, Lenis, React Router |
| 02 | [`website-02-luxury`](website-02-luxury) | Luxury editorial layout | React 19, Vite |
| 03 | [`website-03-3d-universe`](website-03-3d-universe) | 3D-leaning scene concept | React 19, Vite |
| 04 | [`website-04-creative-playground`](website-04-creative-playground) | Experimental interactions | React 19, Vite |
| 05 | [`website-05-scroll-experience`](website-05-scroll-experience) | Scroll-driven storytelling | React 19, Vite |
| — | [`backend`](backend) | Shared Django REST API for the MASSUP store | Django 5.2, DRF, Whitenoise, Gunicorn |

Websites 02 to 05 are Vite starter projects with their own READMEs. Website 01 and the backend are the production-grade pieces.

---

## Website 01 · Cinematic (MASSUP)

### Highlights

- **Cinematic hero** with a looping product video and floating pistachio macro shots.
- **Scroll-velocity marquees** that accelerate with scroll speed.
- **Split-text reveals**, magnetic buttons, and a custom cursor.
- **Smooth scrolling** through Lenis, synced with GSAP and ScrollTrigger.
- **Product grid** with 3D tilt on hover and a shared-element transition into the quick view.
- **Preloader** that fills with the product jar.
- **Admin console** at `/manage` for products, coupons, invoices, billing, settings, site media, security, and audit logs.
- **Graceful fallback:** if the backend is unreachable, the site shows bundled demo products, so it never looks empty.

### Pages

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Home | Hero, statement, story, video showcase, gallery, featured products, CTA |
| `/products` | Products | Full catalogue with quick view for each product |
| `/manage/*` | Admin | Staff-only management console (token login, 12-hour sessions by default) |
| `*` | Fallback | Any unknown route shows the catalogue |

### Brand system

The site is built around the pistachio palette:

| Token | Hex | Use |
|-------|-----|-----|
| `--pista` | `#A9C18F` | Accents, hover fills, selection |
| `--pista-2` | `#C9DDAE` | Hero glow |
| `--pista-soft` | `#DFE9CD` | Chips, nav hover |
| `--pista-light` | `#EEF4E2` | Hero background |
| `--cream` | `#FBF6E6` | Base background |
| `--forest` | `#2C3A22` | Primary text, dark sections |
| `--olive` | `#687B4E` | Eyebrows, italic emphasis |

Typography pairs **Fraunces Variable** (display serif) with **Manrope Variable** (UI sans), both loaded through Fontsource.

---

## Architecture

```mermaid
flowchart LR
    subgraph Browser
        UI[React 19 SPA<br/>Vite build]
        UI --> FM[Framer Motion]
        UI --> GS[GSAP + Lenis]
    end

    subgraph Vercel
        RW[vercel.json rewrites]
    end

    subgraph Render
        DJ[Django 5.2 + DRF]
        WN[Whitenoise<br/>static files]
        DB[(PostgreSQL<br/>or SQLite)]
        MD[/media uploads/]
        DJ --- WN
        DJ --> DB
        DJ --- MD
    end

    UI -- "/" --> RW
    RW -- "/api/*, /media/*, /admin/*" --> DJ
    RW -- "all other routes" --> UI
```

- The React app is a static bundle served from Vercel.
- `vercel.json` proxies `/api`, `/media`, `/admin`, and `/static` to the Render-hosted Django app, so the browser sees a single origin and no CORS issues.
- Every other path rewrites to `index.html`, so client-side routes survive a refresh.

---

## Backend API

Base path: `/api/`. JSON only. Staff endpoints need `Authorization: Token <key>`.

### Public

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health/` | Liveness check |
| `GET` | `/api/products/` | Catalogue |
| `GET` | `/api/products/{id}/` | Single product |
| `POST` | `/api/coupons/validate/` | Check a coupon against a subtotal |
| `GET` | `/api/site-media/` | Images and videos for each site slot |

### Staff (token required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login/` | Exchange username and password for a token (rate-limited to 10/min) |
| `POST` | `/api/auth/logout/` | Revoke the current token |
| `GET` | `/api/auth/me/` | Current user |
| `POST` | `/api/auth/change-password/` | Change password |
| `GET`, `POST`, `PATCH`, `DELETE` | `/api/products/…` | Manage products |
| `GET`, `POST`, `PATCH`, `DELETE` | `/api/coupons/…` | Manage coupons |
| `GET`, `POST`, `PATCH`, `DELETE` | `/api/orders/…` | Invoices. Filter with `?status=` and `?q=` |
| `GET` | `/api/settings/` | Store settings (name, tagline, shipping, GST) |
| `PUT`/`PATCH` | `/api/settings/` | Update store settings and GST |
| `GET`, `PUT`, `DELETE` | `/api/site-media/{slot}/` | Read, replace, or reset a media slot |
| `GET` | `/api/dashboard/` | Dashboard summary |
| `GET` | `/api/logs/` | Login attempts and audit trail |

### Billing rules

The server is the source of truth for every money field. The browser never decides a total.

1. **Subtotal** is the sum of `unit_price × quantity`.
2. **Coupon** is validated by code (case-insensitive). It can be percent or fixed, with a minimum order, a cap, a usage limit, and a start and end date.
3. **Shipping** is the flat fee unless the taxable amount crosses `free_shipping_above`.
4. **GST** is either inclusive of the price or added on top, controlled by `prices_include_gst`.

All values are `Decimal` and rounded to two places.

### Security and limits

- Staff-only tokens expire after `TOKEN_TTL_HOURS` (default 12) and are deleted on expiry.
- Non-staff accounts are refused even with a valid token.
- Throttles: `anon` 300/min, `user` 900/min, `login` 10/min, `coupon` 30/min.
- Every login attempt (success, failure, or blocked) is recorded with IP and user agent.
- Staff actions, such as creating an invoice, are written to the audit log.

---

## Data model

```mermaid
erDiagram
    PRODUCT ||--o{ ORDER_ITEM : "sold as"
    ORDER ||--|{ ORDER_ITEM : contains
    COUPON ||--o{ ORDER : applied_to
    STORE_SETTINGS ||--|| ORDER : "prices and GST from"
    SITE_MEDIA }o--|| STORE_SETTINGS : "powers the site"

    PRODUCT {
        string name
        decimal price
        decimal mrp
        string flavour
        string size
        bool in_stock
        image image
        string image_url
    }
    ORDER {
        string invoice_no
        string customer_name
        string status
        string payment_method
        decimal total
        decimal tax
    }
    COUPON {
        string code
        string discount_type
        decimal value
        int usage_limit
        bool active
    }
    SITE_MEDIA {
        string slot
        file file
        string url
    }
```

Order statuses: `pending`, `paid`, `shipped`, `delivered`, `cancelled`.
Payment methods: `cash`, `upi`, `card`, `bank`, `cod`.

---

## Getting started

### Prerequisites

- Node.js 20 or newer
- Python 3.13 (the bundled `__pycache__` files are for 3.13)
- Git

### 1. Clone

```bash
git clone https://github.com/Ruchitra-Jasmatiya/animation-clash.git
cd animation-clash
```

### 2. Run the backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env               # fill in SECRET_KEY and admin credentials

python manage.py migrate
python manage.py ensure_admin      # creates the staff user from ADMIN_* env vars
python manage.py seed_products --if-empty
python manage.py runserver         # http://127.0.0.1:8000
```

Check it's alive at <http://127.0.0.1:8000/api/health/>.

### 3. Run the storefront

```bash
cd website-01-cinematic
npm install
cp .env.example .env.local         # leave VITE_API_URL empty to use the Vite proxy
npm run dev                       # http://localhost:5173
```

Set `VITE_DEV_API=http://127.0.0.1:8000` in `.env.local` so `/api` and `/media` reach the local Django server.

Open the admin console at <http://localhost:5173/manage>.

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `SECRET_KEY` | Yes in production | long random string | Never commit a real key |
| `DEBUG` | No | `False` | Keep `False` in production |
| `DATABASE_URL` | Recommended | `postgres://user:pass@host/db` | Falls back to SQLite if empty |
| `ADMIN_USERNAME` | For `ensure_admin` | `owner` | Creates or updates the staff account |
| `ADMIN_PASSWORD` | For `ensure_admin` | strong password | Choose a strong one |
| `CORS_ALLOWED_ORIGINS` | Yes in production | `https://your-site.vercel.app` | Comma-separated |
| `CSRF_TRUSTED_ORIGINS` | Yes in production | `https://your-site.vercel.app` | Comma-separated |
| `TOKEN_TTL_HOURS` | No | `12` | Staff session lifetime |

### Storefront (`website-01-cinematic/.env`)

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_API_URL` | empty | Set only if the browser should call the backend directly |
| `VITE_DEV_API` | `http://127.0.0.1:8000` | Local dev proxy target |

---

## Testing

```bash
# Backend: 28 tests across the store and products apps
cd backend
python manage.py test

# Storefront: production build and lint
cd website-01-cinematic
npm run build
npm run lint
```

---

## Deployment

### Backend on Render

1. Create a **Web Service** from this repository, with the root directory set to `backend`.
2. **Build command:** `./build.sh`
3. **Start command:** `gunicorn config.wsgi`
4. Add the environment variables from the table above. Use PostgreSQL for `DATABASE_URL`.

`build.sh` installs requirements, collects static files, migrates, creates the admin user, and seeds products on first run.

> **Media note:** uploaded images and videos are written to `backend/media/`. Render's disk is ephemeral, so attach a persistent disk or move uploads to object storage (S3, Cloudinary, or similar) before going live.

### Storefront on Vercel

1. Import the repository and set the root directory to `website-01-cinematic`.
2. Framework preset: **Vite**. Build command: `npm run build`. Output directory: `dist`.
3. `vercel.json` already proxies `/api`, `/media`, `/admin`, and `/static` to the Render backend. If your Render URL is different, update the four `destination` entries.

---

## Project structure

```text
animation-clash/
├── assets/
│   └── banner.svg                 # animated README banner
├── backend/                       # Django REST API
│   ├── config/                    # settings, urls, wsgi, asgi
│   ├── products/                  # Product model, catalogue API, auth endpoints
│   ├── store/                     # orders, coupons, settings, site media, dashboard, audit
│   ├── build.sh                   # Render build script
│   └── requirements.txt
├── website-01-cinematic/          # MASSUP storefront (flagship)
│   ├── public/
│   │   ├── images/                # product photography
│   │   └── videos/                # hero and showcase loops
│   ├── src/
│   │   ├── components/            # Navbar, ProductCard, ProductModal, Cursor, Preloader…
│   │   ├── lib/                   # api client, live data hooks, smooth scroll, fallbacks
│   │   ├── pages/                 # Home, Products, admin console
│   │   ├── App.jsx
│   │   └── styles.css
│   └── vercel.json
├── website-02-luxury/             # concept 02
├── website-03-3d-universe/        # concept 03
├── website-04-creative-playground/# concept 04
└── website-05-scroll-experience/  # concept 05
```

---

## Design system

- **Motion:** everything eases with `cubic-bezier(0.16, 1, 0.3, 1)`, a fast-out, slow-settle curve that gives the site its premium feel.
- **Cards:** 28px radius, subtle paper grain across the whole page, and a 3D tilt on pointer hover.
- **Type scale:** display headings use fluid `clamp()` sizes, so they scale from phone to desktop without breakpoints.
- **Accessibility:** focus rings use the olive accent, all images have alt text, and the site respects `prefers-reduced-motion` in the banner. Keep that behaviour when you add new animation.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Site shows demo products only | Backend unreachable | Check `/api/health/` and the Vercel rewrites |
| `CSRF` or `403` on the admin | Origin missing from `CSRF_TRUSTED_ORIGINS` | Add the full `https://` origin |
| Login blocked after several tries | Login throttle (10/min) | Wait a minute |
| Uploaded images disappear after a deploy | Ephemeral disk on Render | Use persistent storage or object storage |
| Video does not autoplay | Browser autoplay policy | Use a muted, inline-playable MP4 (H.264) |

---

<p align="center">
  <img src="website-01-cinematic/public/images/massup-08-pistachio-macro.jpg" alt="Pistachio macro" width="100%" />
</p>

<p align="center"><sub>MASSUP Pistachio Protein Powder · Good fuel, great feeling.</sub></p>
