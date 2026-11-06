<p align="center">
  <img src="assets/banner.svg" alt="MASSUP · Pistachio Protein Powder" width="100%" />
</p>

<p align="center">
  <a href="#-website-01--massup-cinematic"><img src="https://img.shields.io/badge/%E2%96%B6%20VIEW%20THE%20STOREFRONT-2C3A22?style=for-the-badge&labelColor=2C3A22&color=A9C18F" alt="View the storefront" /></a>
  <a href="#-getting-started"><img src="https://img.shields.io/badge/%F0%9F%9A%80%20RUN%20IT%20LOCALLY-A9C18F?style=for-the-badge&labelColor=A9C18F&color=2C3A22" alt="Run it locally" /></a>
  <a href="#-backend-api"><img src="https://img.shields.io/badge/%F0%9F%93%A1%20API%20REFERENCE-687B4E?style=for-the-badge&labelColor=687B4E&color=FBF6E6" alt="API reference" /></a>
  <a href="#-deployment"><img src="https://img.shields.io/badge/%E2%98%81%EF%B8%8F%20DEPLOY-FBF6E6?style=for-the-badge&labelColor=FBF6E6&color=2C3A22" alt="Deploy" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite 8" />
  <img src="https://img.shields.io/badge/Framer%20Motion-14-0055FF?style=flat-square&logo=framer&logoColor=white" alt="Framer Motion" />
  <img src="https://img.shields.io/badge/GSAP-3-88CE02?style=flat-square&logo=greensock&logoColor=white" alt="GSAP" />
  <img src="https://img.shields.io/badge/Django-5.2-092E20?style=flat-square&logo=django&logoColor=white" alt="Django 5.2" />
  <img src="https://img.shields.io/badge/DRF-3.15-A30000?style=flat-square" alt="DRF 3.15" />
  <img src="https://img.shields.io/badge/PostgreSQL-ready-336791?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Vercel%20%2B%20Render-deployed-000000?style=flat-square&logo=vercel&logoColor=white" alt="Vercel and Render" />
</p>

<h3 align="center">🌿 Good fuel. Great feeling. 🌿</h3>

<p align="center">
  Five cinematic storefront concepts for one pistachio protein brand,<br/>
  sharing a production-grade Django REST backend.
</p>

---

## 🧭 Navigate

<table align="center">
<tr>
  <td align="center" width="25%"><a href="#-overview"><b>🌱 Overview</b></a></td>
  <td align="center" width="25%"><a href="#-website-01--massup-cinematic"><b>🎬 Storefront</b></a></td>
  <td align="center" width="25%"><a href="#-architecture"><b>🏗️ Architecture</b></a></td>
  <td align="center" width="25%"><a href="#-backend-api"><b>📡 API</b></a></td>
</tr>
<tr>
  <td align="center"><a href="#-data-model"><b>🗂️ Data model</b></a></td>
  <td align="center"><a href="#-getting-started"><b>🚀 Run locally</b></a></td>
  <td align="center"><a href="#-testing"><b>🧪 Testing</b></a></td>
  <td align="center"><a href="#-deployment"><b>☁️ Deploy</b></a></td>
</tr>
<tr>
  <td align="center"><a href="#-scaling-path"><b>📈 Scaling</b></a></td>
  <td align="center"><a href="#-design-system"><b>🎨 Design system</b></a></td>
  <td align="center"><a href="#-project-structure"><b>📁 Structure</b></a></td>
  <td align="center"><a href="#-troubleshooting"><b>🛠️ Troubleshooting</b></a></td>
</tr>
</table>

---

## 🌱 Overview

This repository holds **five independent front-end experiments**, each a different take on how a single product page can feel. The flagship is **Website 01 · Cinematic**, a full storefront for **MASSUP Pistachio Protein Powder**, backed by a **Django REST API** that handles the catalogue, coupons, GST-aware billing, invoices, site media, and a staff console.

<p align="center">
  <img src="website-01-cinematic/public/images/massup-01-jar-hero.jpg" alt="MASSUP Pistachio Protein Powder jar" width="300" />
</p>

<table align="center">
<tr>
  <td align="center"><h2>5</h2>concepts</td>
  <td align="center"><h2>1</h2>shared API</td>
  <td align="center"><h2>28</h2>backend tests</td>
  <td align="center"><h2>7</h2>brand colours</td>
</tr>
</table>

### The five concepts

| # | Concept | Folder | Stack | Status |
|:-:|---------|--------|-------|:------:|
| 01 | 🎬 **Cinematic storefront** — video hero, admin, backend | [`website-01-cinematic`](website-01-cinematic) | React 19 · Framer Motion · GSAP · Lenis | ⭐ **Flagship** |
| 02 | 🏛️ Luxury editorial | [`website-02-luxury`](website-02-luxury) | React 19 · Vite | 🧪 Concept |
| 03 | 🌌 3D universe | [`website-03-3d-universe`](website-03-3d-universe) | React 19 · Vite | 🧪 Concept |
| 04 | 🎨 Creative playground | [`website-04-creative-playground`](website-04-creative-playground) | React 19 · Vite | 🧪 Concept |
| 05 | 📜 Scroll experience | [`website-05-scroll-experience`](website-05-scroll-experience) | React 19 · Vite | 🧪 Concept |
| — | ⚙️ Shared API | [`backend`](backend) | Django 5.2 · DRF · Whitenoise · Gunicorn | ✅ Production |

---

## 🎬 Website 01 · MASSUP Cinematic

<p align="center">
  <a href="website-01-cinematic"><img src="https://img.shields.io/badge/%F0%9F%8E%AC%20OPEN%20SOURCE%20FOLDER-A9C18F?style=for-the-badge&labelColor=2C3A22&color=C9DDAE" alt="Open the source folder" /></a>
</p>

### ✨ Highlights

| | Feature | What it does |
|:-:|---------|--------------|
| 🎥 | **Cinematic hero** | Looping product video with floating pistachio macro shots |
| 🌀 | **Scroll-velocity marquees** | Text bands that speed up with scroll direction and speed |
| ✂️ | **Split-text reveals** | Headlines animate word by word as they enter view |
| 🧲 | **Magnetic buttons** | Buttons drift toward the cursor |
| 🖱️ | **Custom cursor** | A brand-coloured cursor that reacts to links and buttons |
| 🌊 | **Smooth scrolling** | Lenis, synced to GSAP ScrollTrigger |
| 🃏 | **3D product cards** | Tilt on hover with a shared-element transition into quick view |
| 🫙 | **Jar preloader** | Loading screen that fills with the product |
| 🛡️ | **Offline fallback** | Shows bundled demo products if the API is unreachable |
| 🔐 | **Admin console** | Products, coupons, invoices, billing, settings, media, audit |

### 🗺️ Pages

```mermaid
flowchart LR
    H["🏠 /<br/>Home"]:::pista --> P["🛍️ /products<br/>Catalogue"]:::pista
    P --> Q["🔍 Quick view<br/>modal"]:::cream
    H --> M["🔐 /manage<br/>Admin console"]:::forest
    M --> A1["🧴 Products"]:::cream
    M --> A2["🏷️ Coupons"]:::cream
    M --> A3["🧾 Invoices"]:::cream
    M --> A4["🖼️ Site media"]:::cream
    M --> A5["📊 Dashboard"]:::cream
    M --> A6["🛡️ Audit log"]:::cream

    classDef pista fill:#A9C18F,stroke:#2C3A22,color:#1D2716
    classDef cream fill:#FBF6E6,stroke:#2C3A22,color:#1D2716
    classDef forest fill:#2C3A22,stroke:#A9C18F,color:#FBF6E6
```

### 🎨 Brand palette

<table align="center">
<tr>
  <td align="center" bgcolor="#A9C18F" width="110"><br/><br/><b>Pista</b><br/><code>#A9C18F</code><br/><br/></td>
  <td align="center" bgcolor="#C9DDAE" width="110"><br/><br/><b>Pista 2</b><br/><code>#C9DDAE</code><br/><br/></td>
  <td align="center" bgcolor="#DFE9CD" width="110"><br/><br/><b>Soft</b><br/><code>#DFE9CD</code><br/><br/></td>
  <td align="center" bgcolor="#EEF4E2" width="110"><br/><br/><b>Light</b><br/><code>#EEF4E2</code><br/><br/></td>
  <td align="center" bgcolor="#FBF6E6" width="110"><br/><br/><b>Cream</b><br/><code>#FBF6E6</code><br/><br/></td>
  <td align="center" bgcolor="#687B4E" width="110"><font color="#FBF6E6"><br/><br/><b>Olive</b><br/><code>#687B4E</code><br/><br/></font></td>
  <td align="center" bgcolor="#2C3A22" width="110"><font color="#C9DDAE"><br/><br/><b>Forest</b><br/><code>#2C3A22</code><br/><br/></font></td>
</tr>
</table>

Typography pairs **Fraunces** (display serif) with **Manrope** (UI sans), both loaded through Fontsource.

---

## 🏗️ Architecture

<p align="center">
  <img src="assets/flow.svg" alt="Animated request flow: Browser to Vercel to Django to PostgreSQL" width="100%" />
</p>

```mermaid
flowchart TB
    subgraph CLIENT["🖥️ Browser"]
        direction LR
        UI["React 19 SPA"]:::pista
        UI --> FM["Framer Motion<br/>UI motion"]:::cream
        UI --> GS["GSAP + Lenis<br/>scroll motion"]:::cream
    end

    subgraph EDGE["▲ Vercel · Edge"]
        RW["vercel.json<br/>rewrites + headers"]:::forest
    end

    subgraph ORIGIN["🟢 Render · Origin"]
        DJ["Django 5.2 + DRF"]:::pista
        WN["Whitenoise<br/>static files"]:::cream
        MD["/media<br/>uploads"]:::cream
        DB[("PostgreSQL<br/>or SQLite")]:::forest
        DJ --- WN
        DJ --- MD
        DJ --> DB
    end

    UI -->|"/"| RW
    RW -->|"/api · /media · /admin · /static"| DJ
    RW -->|"every other path → index.html"| UI

    classDef pista fill:#A9C18F,stroke:#2C3A22,color:#1D2716
    classDef cream fill:#FBF6E6,stroke:#2C3A22,color:#1D2716
    classDef forest fill:#2C3A22,stroke:#A9C18F,color:#FBF6E6
```

> **Why it works:** the browser only ever talks to one origin, so there are **no CORS round-trips** for normal page loads, and client-side routes survive a refresh.

---

## 📡 Backend API

<p align="center">
  <img src="https://img.shields.io/badge/BASE%20PATH-%2Fapi%2F-2C3A22?style=for-the-badge&labelColor=2C3A22&color=A9C18F" alt="Base path /api/" />
  <img src="https://img.shields.io/badge/FORMAT-JSON-687B4E?style=for-the-badge&labelColor=687B4E&color=C9DDAE" alt="JSON" />
  <img src="https://img.shields.io/badge/AUTH-Token%20%28staff%29-FBF6E6?style=for-the-badge&labelColor=FBF6E6&color=2C3A22" alt="Token auth for staff" />
</p>

### 🟢 Public endpoints

| Method | Endpoint | Purpose |
|:-:|----------|---------|
| ![GET](https://img.shields.io/badge/GET-2ea44f?style=flat-square) | `/api/health/` | Liveness check |
| ![GET](https://img.shields.io/badge/GET-2ea44f?style=flat-square) | `/api/products/` | Catalogue |
| ![GET](https://img.shields.io/badge/GET-2ea44f?style=flat-square) | `/api/products/{id}/` | One product |
| ![POST](https://img.shields.io/badge/POST-A9C18F?style=flat-square&labelColor=2C3A22) | `/api/coupons/validate/` | Check a coupon against a subtotal |
| ![GET](https://img.shields.io/badge/GET-2ea44f?style=flat-square) | `/api/site-media/` | Images and videos for every site slot |

### 🔐 Staff endpoints · token required

| Method | Endpoint | Purpose |
|:-:|----------|---------|
| ![POST](https://img.shields.io/badge/POST-A9C18F?style=flat-square&labelColor=2C3A22) | `/api/auth/login/` | Exchange credentials for a token · **10/min** |
| ![POST](https://img.shields.io/badge/POST-A9C18F?style=flat-square&labelColor=2C3A22) | `/api/auth/logout/` | Revoke the current token |
| ![GET](https://img.shields.io/badge/GET-2ea44f?style=flat-square) | `/api/auth/me/` | Current user |
| ![POST](https://img.shields.io/badge/POST-A9C18F?style=flat-square&labelColor=2C3A22) | `/api/auth/change-password/` | Change password |
| ![CRUD](https://img.shields.io/badge/CRUD-687B4E?style=flat-square) | `/api/products/…` | Manage products |
| ![CRUD](https://img.shields.io/badge/CRUD-687B4E?style=flat-square) | `/api/coupons/…` | Manage coupons |
| ![CRUD](https://img.shields.io/badge/CRUD-687B4E?style=flat-square) | `/api/orders/…` | Invoices · `?status=` `?q=` filters |
| ![GET](https://img.shields.io/badge/GET-2ea44f?style=flat-square) ![PUT](https://img.shields.io/badge/PUT-d29922?style=flat-square) | `/api/settings/` | Read or update store settings & GST |
| ![PUT](https://img.shields.io/badge/PUT-d29922?style=flat-square) ![DEL](https://img.shields.io/badge/DEL-cf222e?style=flat-square) | `/api/site-media/{slot}/` | Replace or reset a media slot |
| ![GET](https://img.shields.io/badge/GET-2ea44f?style=flat-square) | `/api/dashboard/` | Dashboard summary |
| ![GET](https://img.shields.io/badge/GET-2ea44f?style=flat-square) | `/api/logs/` | Login attempts & audit trail |

### 🧮 Billing pipeline

Billing is **server-side only**. The browser never decides a total.

```mermaid
flowchart LR
    S["🧺 Subtotal<br/>Σ unit × qty"]:::cream --> C{"🎟️ Coupon<br/>valid?"}:::pista
    C -- "yes" --> D["➖ Discount<br/>percent or fixed"]:::pista
    C -- "no / none" --> T["Taxable amount"]:::cream
    D --> T
    T --> SH{"🚚 Above free-<br/>shipping threshold?"}:::pista
    SH -- "yes" --> F["Shipping = 0"]:::cream
    SH -- "no" --> FEE["Shipping = flat fee"]:::cream
    F --> G{"🧾 GST mode"}:::forest
    FEE --> G
    G -- "inclusive" --> TOT["✅ Total"]:::pista
    G -- "added on top" --> TOT

    classDef pista fill:#A9C18F,stroke:#2C3A22,color:#1D2716
    classDef cream fill:#FBF6E6,stroke:#2C3A22,color:#1D2716
    classDef forest fill:#2C3A22,stroke:#A9C18F,color:#FBF6E6
```

All money is `Decimal`, rounded to two places.

### 🛡️ Security & throttles

| Control | Value |
|---------|-------|
| 🔑 Staff token lifetime | `TOKEN_TTL_HOURS` · default **12 h**, deleted on expiry |
| 🚫 Non-staff accounts | Refused even with a valid token |
| 🐢 Throttle `anon` | **300 / min** |
| ⚡ Throttle `user` | **900 / min** |
| 🔒 Throttle `login` | **10 / min** |
| 🎟️ Throttle `coupon` | **30 / min** |
| 📝 Login attempts | Every attempt logged with IP and user agent |
| 🧾 Audit trail | Staff actions such as invoice creation are recorded |

---

## 🗂️ Data model

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
    }
    ORDER {
        string invoice_no
        string customer_name
        string status
        string payment_method
        decimal total
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

**Order lifecycle**

```mermaid
stateDiagram-v2
    direction LR
    [*] --> pending
    pending --> paid
    paid --> shipped
    shipped --> delivered
    pending --> cancelled
    paid --> cancelled
    delivered --> [*]
    cancelled --> [*]
```

---

## 🚀 Getting started

<p align="center">
  <img src="https://img.shields.io/badge/NODE-20%2B-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node 20+" />
  <img src="https://img.shields.io/badge/PYTHON-3.13-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python 3.13" />
  <img src="https://img.shields.io/badge/GIT-required-F05032?style=flat-square&logo=git&logoColor=white" alt="Git" />
</p>

```mermaid
flowchart LR
    A["📥 Clone"]:::cream --> B["🐍 Backend<br/>venv · migrate · seed"]:::pista --> C["▶️ runserver<br/>:8000"]:::forest
    A --> D["📦 Frontend<br/>npm install"]:::pista --> E["⚡ npm run dev<br/>:5173"]:::forest
    C -. "proxy /api" .-> E

    classDef pista fill:#A9C18F,stroke:#2C3A22,color:#1D2716
    classDef cream fill:#FBF6E6,stroke:#2C3A22,color:#1D2716
    classDef forest fill:#2C3A22,stroke:#A9C18F,color:#FBF6E6
```

### 1 · Clone

```bash
git clone https://github.com/Ruchitra-Jasmatiya/animation-clash.git
cd animation-clash
```

### 2 · Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env               # set SECRET_KEY and ADMIN_* values

python manage.py migrate
python manage.py ensure_admin      # staff user from ADMIN_USERNAME / ADMIN_PASSWORD
python manage.py seed_products --if-empty
python manage.py runserver         # http://127.0.0.1:8000
```

<p>
  <a href="http://127.0.0.1:8000/api/health/"><img src="https://img.shields.io/badge/%E2%9C%85%20CHECK%20HEALTH-2ea44f?style=for-the-badge&labelColor=2ea44f" alt="Check health" /></a>
</p>

### 3 · Storefront

```bash
cd website-01-cinematic
npm install
cp .env.example .env.local         # leave VITE_API_URL empty to use the dev proxy
npm run dev                        # http://localhost:5173
```

Add `VITE_DEV_API=http://127.0.0.1:8000` to `.env.local` so `/api` and `/media` reach Django.

<p>
  <a href="http://localhost:5173"><img src="https://img.shields.io/badge/%F0%9F%8E%AC%20OPEN%20STOREFRONT-A9C18F?style=for-the-badge&labelColor=2C3A22&color=C9DDAE" alt="Open storefront" /></a>
  <a href="http://localhost:5173/manage"><img src="https://img.shields.io/badge/%F0%9F%94%90%20OPEN%20ADMIN-2C3A22?style=for-the-badge&labelColor=2C3A22&color=A9C18F" alt="Open admin" /></a>
</p>

---

## 🔧 Environment variables

<details open>
<summary><b>🐍 Backend · <code>backend/.env</code></b></summary>

| Variable | Required | Example | Notes |
|----------|:--------:|---------|-------|
| `SECRET_KEY` | 🔴 prod | long random string | Never commit a real key |
| `DEBUG` | ⚪ | `False` | Keep `False` in production |
| `DATABASE_URL` | 🟡 | `postgres://…` | Falls back to SQLite if empty |
| `ADMIN_USERNAME` | 🟡 | `owner` | Used by `ensure_admin` |
| `ADMIN_PASSWORD` | 🟡 | strong password | Used by `ensure_admin` |
| `CORS_ALLOWED_ORIGINS` | 🔴 prod | `https://your-site.vercel.app` | Comma-separated |
| `CSRF_TRUSTED_ORIGINS` | 🔴 prod | `https://your-site.vercel.app` | Comma-separated |
| `TOKEN_TTL_HOURS` | ⚪ | `12` | Staff session lifetime |

</details>

<details>
<summary><b>⚡ Storefront · <code>website-01-cinematic/.env</code></b></summary>

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_API_URL` | empty | Set only if the browser should call the API directly |
| `VITE_DEV_API` | `http://127.0.0.1:8000` | Local dev proxy target |

</details>

> 🔴 required in production · 🟡 required for some features · ⚪ optional

---

## 🧪 Testing

```mermaid
flowchart LR
    T1["🐍 python manage.py test<br/>28 tests"]:::pista --> OK1["✅ store · products"]:::cream
    T2["⚡ npm run build"]:::pista --> OK2["✅ production bundle"]:::cream
    T3["🔍 npm run lint"]:::pista --> OK3["✅ code quality"]:::cream

    classDef pista fill:#A9C18F,stroke:#2C3A22,color:#1D2716
    classDef cream fill:#FBF6E6,stroke:#2C3A22,color:#1D2716
```

```bash
cd backend && python manage.py test                 # 28 backend tests
cd website-01-cinematic && npm run build && npm run lint
```

---

## ☁️ Deployment

```mermaid
flowchart LR
    GH["🐙 GitHub<br/>main branch"]:::cream --> V["▲ Vercel<br/>website-01-cinematic"]:::forest
    GH --> R["🟢 Render<br/>backend · build.sh"]:::pista
    R --> PG[("🐘 PostgreSQL")]:::forest
    V -. "rewrites /api /media /admin" .-> R

    classDef pista fill:#A9C18F,stroke:#2C3A22,color:#1D2716
    classDef cream fill:#FBF6E6,stroke:#2C3A22,color:#1D2716
    classDef forest fill:#2C3A22,stroke:#A9C18F,color:#FBF6E6
```

### 🟢 Backend on Render

1. New **Web Service** → root directory `backend`
2. **Build command:** `./build.sh`
3. **Start command:** `gunicorn config.wsgi`
4. Add the variables above and point `DATABASE_URL` at PostgreSQL

`build.sh` installs requirements, collects static files, migrates, creates the admin, and seeds products on first run.

> ⚠️ **Media note:** uploads live in `backend/media/`. Render's disk is ephemeral. Use a persistent disk or object storage (S3, Cloudinary) before going live.

### ▲ Storefront on Vercel

1. Import the repo, set root directory to `website-01-cinematic`
2. Preset **Vite** · build `npm run build` · output `dist`
3. `vercel.json` proxies `/api`, `/media`, `/admin`, `/static` to Render. Update the four `destination` entries if your Render URL differs.

<p align="center">
  <a href="https://vercel.com/new"><img src="https://img.shields.io/badge/%E2%96%B2%20DEPLOY%20TO%20VERCEL-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Deploy to Vercel" /></a>
  <a href="https://render.com"><img src="https://img.shields.io/badge/%F0%9F%9F%A2%20DEPLOY%20TO%20RENDER-46E3B7?style=for-the-badge&labelColor=46E3B7&color=2C3A22" alt="Deploy to Render" /></a>
</p>

---

## 📈 Scaling path

From a single jar to a global brand. Each step adds one piece, and the code already has the hooks for it.

```mermaid
flowchart LR
    S1["🌱 <b>Stage 1 · Launch</b><br/>SQLite · one Render instance<br/>media on disk"]:::cream
    S2["🌿 <b>Stage 2 · Growth</b><br/>PostgreSQL · persistent media<br/>Vercel edge cache"]:::pista
    S3["🌳 <b>Stage 3 · Scale</b><br/>object storage + CDN<br/>gunicorn workers ×N"]:::forest
    S4["🌍 <b>Stage 4 · Global</b><br/>read replicas · regional edge<br/>queue for invoices"]:::forest

    S1 -->|"set DATABASE_URL"| S2
    S2 -->|"move /media to S3 + CDN"| S3
    S3 -->|"replicas + async jobs"| S4

    classDef pista fill:#A9C18F,stroke:#2C3A22,color:#1D2716
    classDef cream fill:#FBF6E6,stroke:#2C3A22,color:#1D2716
    classDef forest fill:#2C3A22,stroke:#A9C18F,color:#FBF6E6
```

| Pressure point | Today | Next step |
|----------------|-------|-----------|
| 🗄️ Database | SQLite fallback | Set `DATABASE_URL` to PostgreSQL |
| 🖼️ Media & video | Served by Django from disk | Object storage + CDN, keep URLs in `SiteMedia` |
| 🎞️ Hero video | Large MP4 | Serve a short poster first, lazy-load the video |
| 🔁 Throughput | One gunicorn process | `gunicorn --workers` scaled to CPU cores |
| 🛡️ Abuse | Throttled per IP and per user | Add a WAF in front of Render |

---

## 🎨 Design system

<table>
<tr>
  <td width="50%">

**🌀 Motion**
Everything eases with `cubic-bezier(0.16, 1, 0.3, 1)`: a fast start that settles slowly, which gives the site its premium feel.

  </td>
  <td width="50%">

**🃏 Cards**
28 px radius, paper-grain texture across the page, and a 3D tilt that follows the pointer.

  </td>
</tr>
<tr>
  <td>

**🔤 Type**
Fluid `clamp()` headings scale from phone to desktop with no breakpoints.

  </td>
  <td>

**♿ Accessibility**
Olive focus rings, alt text on every image, and `prefers-reduced-motion` respected in the banners.

  </td>
</tr>
</table>

---

## 📁 Project structure

```text
animation-clash/
├── 🎞️ assets/                       animated banner + request-flow SVG
├── ⚙️ backend/                       Django REST API
│   ├── config/                      settings · urls · wsgi · asgi
│   ├── products/                    catalogue · auth endpoints
│   ├── store/                       orders · coupons · settings · media · audit
│   ├── build.sh                     Render build script
│   └── requirements.txt
├── 🎬 website-01-cinematic/          MASSUP storefront (flagship)
│   ├── public/images/               product photography
│   ├── public/videos/               hero + showcase loops
│   ├── src/components/              Navbar · ProductCard · Cursor · Preloader …
│   ├── src/lib/                     API client · live data · smooth scroll
│   ├── src/pages/                   Home · Products · admin console
│   └── vercel.json
├── 🏛️ website-02-luxury/             concept 02
├── 🌌 website-03-3d-universe/        concept 03
├── 🎨 website-04-creative-playground/ concept 04
└── 📜 website-05-scroll-experience/  concept 05
```

---

## 🛠️ Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| 🔴 Only demo products appear | Backend unreachable | Check `/api/health/` and the Vercel rewrites |
| 🟠 `403` / CSRF on admin | Origin not in `CSRF_TRUSTED_ORIGINS` | Add the full `https://` origin |
| 🟡 Login blocked | Login throttle (10/min) | Wait one minute |
| 🟡 Uploads vanish after deploy | Ephemeral disk on Render | Use persistent or object storage |
| 🔵 Video won't autoplay | Browser autoplay policy | Use a muted, inline-playable H.264 MP4 |

---

<p align="center">
  <img src="website-01-cinematic/public/images/massup-08-pistachio-macro.jpg" alt="Pistachio macro" width="100%" />
</p>

<h3 align="center">🌿 MASSUP · Pistachio Protein Powder · Good fuel, great feeling. 🌿</h3>

<p align="center">
  <a href="#-navigate"><img src="https://img.shields.io/badge/%E2%AC%86%EF%B8%8F%20BACK%20TO%20TOP-2C3A22?style=for-the-badge&labelColor=2C3A22&color=A9C18F" alt="Back to top" /></a>
</p>
