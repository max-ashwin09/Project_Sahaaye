<p align="center">
  <h1 align="center">SAHAAYE (सहाय)</h1>
  <p align="center">
    <strong>A Privacy-Preserving, AI-Powered Humanitarian & Community Aid Platform</strong>
  </p>
  <p align="center">
    Connecting real-world emergency and social welfare needs with verified volunteers, NGOs, and community helpers — securely and responsibly.
  </p>
  <p align="center">
    <img src="https://img.shields.io/badge/Security-OWASP_Top_10_Hardened-24292e?style=flat" alt="OWASP Hardened" />
    <img src="https://img.shields.io/badge/Privacy-DPDP_Act_2023_Compliant-24292e?style=flat" alt="DPDP Act 2023" />
    <img src="https://img.shields.io/badge/Backend-Node.js_20_%7C_Express_%7C_TypeScript-24292e?style=flat" alt="Node.js" />
    <img src="https://img.shields.io/badge/Frontend-React_18_%7C_Vite_%7C_TS-24292e?style=flat" alt="React" />
    <img src="https://img.shields.io/badge/Mobile-Android_Native_%7C_Kotlin-24292e?style=flat" alt="Android" />
    <img src="https://img.shields.io/badge/Container-Docker_Compose-24292e?style=flat" alt="Docker" />
  </p>
</p>

---

## 📌 Table of Contents
1. [About SAHAAYE](#-about-sahaaye)
2. [Key Highlights & Innovation](#-key-highlights--innovation)
3. [System Architecture](#-system-architecture)
4. [Tech Stack](#-tech-stack)
5. [Directory Layout](#-directory-layout)
6. [Prerequisites](#-prerequisites)
7. [How to Run (Quickstart)](#-how-to-run-quickstart)
   - [Method 1: Run with Docker Compose (Recommended)](#method-1-run-with-docker-compose-recommended)
   - [Method 2: Run Locally for Development](#method-2-run-locally-for-development)
   - [Method 3: Build & Run Android Mobile App](#method-3-build--run-android-mobile-app)
8. [Android Mobile Application](#-android-mobile-application)
9. [Environment Configuration (.env)](#-environment-configuration-env)
10. [Automated Security Audits & Testing](#-automated-security-audits--testing)
11. [API Overview](#-api-overview)
12. [Legal & DPDP Compliance](#-legal--dpdp-compliance)
13. [Contributing & Responsible Disclosure](#-contributing--responsible-disclosure)

---

## 📖 About SAHAAYE

When community members encounter people in distress (abandoned seniors, underprivileged children in need of medical attention, disaster victims, or hunger relief emergencies), reporting this information online often poses serious hazards:
- **Location Doxing**: Exact GPS coordinates can expose vulnerable individuals to predators or harassment.
- **Privacy Infringement**: Photos of distressed beneficiaries or minors are frequently shared publicly without consent.
- **Scams & Exploitation**: Bad actors can create fake donation appeals or misuse beneficiary information.

**SAHAAYE** solves this through a **privacy-first, AI-assisted architecture**:
- Need reports are anonymized and location-fuzzed (approximate radius) for the general public.
- Uploaded media automatically has its EXIF GPS data stripped and faces blurred via internal AI models before public viewing.
- Exact locations and beneficiary contact are only unlocked for **verified volunteers and registered NGOs** after accepting a relief task.
- Communication is routed through private in-app channels, preventing phone number leakage.

---

## ✨ Key Highlights & Innovation

### 🛡️ Privacy & Legal Protection (DPDP Act 2023)
- **Purpose-Wise Consent Tracking**: Consent is recorded on an itemized basis (`consent_records` table) with cryptographic hashes of client metadata.
- **Right to Erasure (Account Deletion)**: Self-service deletion workflow with a mandatory cooling-off period and automated database purging.
- **Data Portability**: Users can download all personal records, reports, and activities in standardized JSON format.
- **Child Protection (DPDP Sec 9)**: Dedicated `minor-detection` AI pipeline prevents tracking, profiling, or unauthorized exposure of children.
- **Statutory Grievance Redressal**: Built-in grievance reporting portal directly connected to the Grievance Redressal Officer.

### 📍 Location Safety & Anti-Doxing
- Public discovery APIs (`/nearby`, `/search`) return **fuzzed geographic centroids** (randomized 300m–500m radius).
- Precise PostGIS coordinates are stored in encrypted columns and revealed only to authenticated and verified helpers who accept the assistance pledge.

### 🖼️ Automated Media Anonymization
- File upload middleware enforces **magic-byte inspection** (validating raw binary hex headers, not just file extensions).
- Camera metadata (EXIF GPS coordinates, camera serials, timestamps) is stripped in memory.
- Faces are automatically detected and blurred via internal computer-vision models.

### 👮 Anti-Abuse, Trust & Moderation
- **Insecure Direct Object Reference (IDOR) Mitigation**: `checkOwnership.ts` verifies resource rights at the middleware layer.
- **Moderation Engine**: Formal review queue, warnings, suspensions, emergency content takedowns, and user appeals workflow.
- **In-App Private Messaging**: Secure donor-to-reporter messaging eliminates off-platform phone number exchanges.

---

## 🏗️ System Architecture

```text
+-----------------------+           +-----------------------+
|  Web Client (React)   |           |  Android App (Kotlin) |
|  - Strict CSP / Nginx |           |  - Encrypted Keystore |
+-----------+-----------+           +-----------+-----------+
            |                                   |
            +-----------------+-----------------+
                              | HTTPS / TLS
                              v
                  +-----------+-----------+
                  |  Edge Reverse Proxy   |
                  |  (Nginx / SSL / HSTS) |
                  +-----------+-----------+
                              |
                              v
       +---------------------------------------------+
       |             Backend API (Node.js)           |
       |  - Helmet & Security Headers                |
       |  - Strict Rate Limiters & Auth Middleware   |
       |  - IDOR Prevention & Consent Verification   |
       +-------+-----------------------------+-------+
               |                             |
      Internal | Network            Internal | BullMQ / Redis
               v                             v
+--------------+-------------+  +------------+--------------+
|  PostgreSQL + PostGIS       |  |  Internal AI Microservice |
|  - Spatial Geography Index |  |  - Face Blurring (OpenCV) |
|  - DPDP Consent Records    |  |  - Minor / Abuse Detection|
|  - Immutable Audit Logs    |  |  - Duplicate Need Filter  |
+----------------------------+  +---------------------------+
```

---

## 💻 Tech Stack

| Domain | Technology | Purpose |
| :--- | :--- | :--- |
| **Backend** | Node.js 20, Express, TypeScript | Modular RESTful API server |
| **Frontend** | React 18, Vite, TypeScript | Fast, responsive modern web client |
| **Mobile** | Kotlin, Jetpack Compose, Material 3, Android SDK 35 | Native Android app with matching web branding, Indore live location map & radius filtering |
| **Database** | PostgreSQL 15, PostGIS 3.3 | Geospatial spatial queries & relational storage |
| **Cache & Queue**| Redis 7, BullMQ | Asynchronous media processing & rate-limiting |
| **AI / Privacy** | Python 3.11, FastAPI, OpenCV, MediaPipe | Face-blurring, child detection, content moderation |
| **Security** | Helmet, bcrypt, Zod, file-type | Defense-in-depth API & data sanitization |
| **DevOps** | Docker, Docker Compose, Nginx | Multi-stage isolated container deployment |

---

## 📂 Directory Layout

```text
Project_Sahaaye/
├── .github/workflows/          # CI/CD pipelines (ci.yml, security-scan.yml, docker-scan.yml)
├── docker-compose.yml          # Container configuration with private internal networking
├── package.json                # Monorepo workspaces definition
├── .env.example                # Canonical template for all environment configurations
├── README.md                   # Complete architectural guide and runbook
├── SECURITY.md                 # Vulnerability disclosure & contact policy
│
├── frontend/                   # Modern React + Vite application
│   ├── Dockerfile              # Multi-stage production Nginx container
│   ├── nginx.conf              # CSP, HSTS, X-Frame-Options headers
│   └── src/
│       ├── components/         # ConsentBanner, ReportAbuseButton, BlockUserButton, SafetyTips
│       ├── pages/              # 18 pages (Home, NearbyNeeds, ReportNeed, PrivacySettings, etc.)
│       ├── context/            # ConsentContext (DPDP Act state manager)
│       └── services/api.ts     # Cookie-based secure API wrapper
│
├── android/                    # Native Android mobile client (Jetpack Compose)
│   ├── build.gradle.kts        # Root Gradle build script
│   ├── gradle.properties       # AndroidX & build configuration
│   ├── gradlew                 # Gradle wrapper executable
│   └── app/
│       ├── build.gradle.kts    # App module dependencies (Compose, Material 3, Coroutines)
│       └── src/main/
│           ├── AndroidManifest.xml # Permissions (Location, Internet) & Launcher activity
│           ├── res/
│           │   ├── drawable/sahaaye_logo.png # Official SAHAAYE branding
│           │   └── values/ (colors.xml, strings.xml, themes.xml)
│           └── java/com/sahaaye/
│               ├── MainActivity.kt           # Navigation Host (Dashboard <-> Nearby)
│               ├── data/
│               │   ├── model/NeedItem.kt     # NeedItem, StatCardModel, QuickActionModel
│               │   └── repository/NeedsRepository.kt # Indore reference coordinates & Haversine distance calculator
│               └── ui/
│                   ├── theme/                # Color, Theme, Type (Web-matched palette)
│                   ├── components/           # TopHeaderBar, WelcomeHeroCard, StatsRow, LiveMapCard, QuickActions
│                   ├── dashboard/DashboardScreen.kt # Home Dashboard matching Web app
│                   └── nearby/NearbyMapScreen.kt    # Interactive Canvas Map Explorer with radius & category filtering
│
├── backend/                    # Core TypeScript API server
│   ├── Dockerfile              # Non-root secure Node container
│   └── src/
│       ├── config/             # env.ts (Zod validation), database.ts, retention.ts
│       ├── middleware/         # authenticate, authorize, checkOwnership, requireConsent, upload
│       ├── jobs/               # Background cleanup, media processing, deletion jobs
│       ├── modules/            # Domain modules (auth, needs, location, privacy, moderation, etc.)
│       ├── app.ts              # Express configuration & security middleware pipeline
│       └── server.ts           # HTTP server bootstrapping & graceful shutdown
│
├── database/                   # Database definitions
│   ├── schema/                 # Declarative SQL schemas (consent, abuse, audit, appeals)
│   ├── migrations/             # Versioned schema migrations
│   └── seeds/                  # Development-only test seeds
│
├── ai-services/                # Internal computer vision microservice
│   ├── Dockerfile              # Python 3.11 container
│   ├── requirements.txt        # OpenCV, MediaPipe, FastAPI dependencies
│   └── sub-services/           # face-blurring, minor-detection, content-moderation
│
├── shared/                     # Shared monorepo library
│   ├── constants/              # Consent purposes, abuse categories
│   ├── types/                  # Domain TypeScript interfaces
│   └── validation/             # Zod input schemas shared across apps
│
├── docs/                       # Technical and compliance documentation
│   ├── legal/                  # DPDP Act compliance, data retention, grievance redressal
│   └── safety/                 # Community guidelines, helper verification SOP
│
└── tests/                      # Automated test suite
    └── security/               # IDOR tests, rate-limit tests, privacy compliance tests
```

---

## 📋 Prerequisites

Make sure you have the following installed on your machine:
- **Git**: `>= 2.30`
- **Docker & Docker Compose**: `>= 24.0` (Recommended)
- **Node.js**: `>= 20.x` (If running locally without Docker)
- **npm**: `>= 10.x`

---

## 🚀 How to Run (Quickstart)

### Method 1: Run with Docker Compose (Recommended)

Docker Compose sets up all services (PostgreSQL with PostGIS, Redis, internal AI container, backend API, and frontend Nginx) with network isolation in a single command.

#### Step 1: Clone the repository
```bash
git clone https://github.com/max-ashwin09/Project_Sahaaye.git
cd Project_Sahaaye
```

#### Step 2: Configure environment variables
```bash
cp .env.example .env
```
*(Optionally review `.env` and configure your JWT secrets, database credentials, and port bindings).*

#### Step 3: Build and launch all services
```bash
docker compose up --build -d
```

#### Step 4: Verify running containers
```bash
docker compose ps
```

You should see the following services running:
- `sahaaye_frontend` (Port 80/443)
- `sahaaye_backend` (Port 5000)
- `sahaaye_db` (PostGIS on internal network)
- `sahaaye_redis` (Redis on internal network)
- `sahaaye_ai` (AI microservice on internal network)

#### Step 5: Access the application
- **Web App**: [http://localhost](http://localhost)
- **Backend API Health**: [http://localhost:5000/health](http://localhost:5000/health)

To view real-time logs:
```bash
docker compose logs -f backend
```

To stop all services:
```bash
docker compose down
```

---

### Method 2: Run Locally for Development

If you are actively developing and wish to run services locally:

#### Step 1: Install dependencies
From the root directory:
```bash
npm install
```

#### Step 2: Start PostgreSQL & Redis
You can run just the backing databases via Docker:
```bash
docker compose up -d db redis
```

#### Step 3: Build the shared module
```bash
npm --prefix shared run build
```

#### Step 4: Start the Backend server
```bash
npm --prefix backend run dev
```
The backend API will start on `http://localhost:5000`.

#### Step 5: Start the Frontend dev server
In a separate terminal:
```bash
npm --prefix frontend run dev
```
The Vite development server will open at `http://localhost:5173`.

---

### Method 3: Build & Run Android Mobile App

The SAHAAYE mobile client is a native Android application built with **Kotlin** and **Jetpack Compose**.

#### Prerequisites:
- **JDK 17** (Temurin 17 or OpenJDK 17)
- **Android SDK**: `platforms;android-35` and `build-tools;35.0.0`
- An Android device (connected via USB or Wireless ADB) or Android Emulator

#### Step 1: Build the Debug APK
```bash
cd android
./gradlew assembleDebug
```
*The compiled APK will be generated at `android/app/build/outputs/apk/debug/app-debug.apk`.*

#### Step 2: Install onto Device via ADB
```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

#### Step 3: Launch the Native App
```bash
adb shell am start -n com.sahaaye/.MainActivity
```

---

## 📱 Android Mobile Application

The SAHAAYE Android application brings real-time community assistance directly to volunteers and citizens on the ground, maintaining strict parity with the web dashboard's visual theme, branding, and privacy standards.

### ✨ Core Features Implemented:
- **Theme & Branding Parity with Web App:**
  - Pixel-matched color scheme (`BrandPrimary #2563EB`, `StatNearby #0D9488`, `CardSurface #FFFFFF`, `AppBackground #F8FAFC`).
  - Official SAHAAYE logo in top header and launcher icon.
  - Top Header Bar with location selector (`📍 Indore, MP`), notification badge (`12`), and profile avatar.
  - Welcome Hero Card with motivational community quote.
  - 4 Real-time Stat Cards (`28 Nearby Needs (+12%)`, `9 In Progress (+5%)`, `16 Completed (+26%)`, `64 Hours Contributed`).
  - Quick Action Cards (Report a Need, Find Nearby Needs, My Reports, My Helping Activities).
  - Bottom Navigation Bar (Dashboard, Nearby, Report, Activities, Profile).

- **Interactive Nearby Needs Map Explorer:**
  - **Location Centered:** Default reference coordinates centered in **Indore, MP** (`22.7196° N, 75.8577° E`) with a pulsing real-time location indicator (*"You are in Indore Center"*).
  - **Distance Radius Filter Chips:** Quick toggles for `1km`, `3km`, `5km`, and `10km` with automatic Haversine distance calculations and instant dynamic result counts.
  - **Category Filtering:** Filter needs across `All`, `Food` 🍚, `Medical` 💊, `Education` 📚, and `Shelter` 🏠.
  - **Interactive Map Pins:** Tap any colored category pin to display an animated bottom slide-up preview card with distance, location name, description, **"Offer Help Now"** action, and directions.
  - **Map & List View Toggles:** Seamless switching between visual map canvas and a detailed scrollable list of needs.

---

## ⚙️ Environment Configuration (.env)

The root `.env.example` file provides ready-to-use defaults:

| Variable | Default (Dev) | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `development` | Environment mode (`development`, `production`, `test`) |
| `PORT` | `5000` | Port for the backend Express server |
| `DATABASE_URL` | `postgresql://sahaaye_user:sahaaye_password@localhost:5432/sahaaye_db` | PostgreSQL connection string |
| `JWT_SECRET` | *(64-char string)* | Key used to sign authorization JWTs |
| `COOKIE_SECRET` | *(string)* | Secret for signing secure HTTP cookies |
| `REDIS_HOST` | `localhost` | Redis server hostname for queues and rate-limiting |
| `AI_SERVICE_URL` | `http://localhost:8000` | URL of the internal AI microservice |
| `GRIEVANCE_OFFICER_EMAIL`| `grievance@sahaaye.org` | Designated DPDP Act grievance contact email |

---

## 🧪 Automated Security Audits & Testing

SAHAAYE includes dedicated test suites for application security, privacy compliance, and anti-abuse verification.

### Run All Unit and Security Tests:
```bash
npm test
```

### Run Dedicated Security Test Suite:
```bash
npm run test:security
```
Tests verify:
- **IDOR Protection (`idor.test.ts`)**: Ensures unauthorized users cannot modify another user's reports.
- **Media Upload Filtering (`media-upload.test.ts`)**: Confirms binary magic-byte validation and EXIF metadata stripping.
- **Rate Limiting (`rate-limit.test.ts`)**: Asserts brute-force blocking on authentication routes.
- **Privacy Tests (`tests/security/privacy/`)**: Validates DPDP consent checks, data exports, and right-to-erasure workflows.
- **Abuse & Moderation (`tests/security/abuse/`)**: Verifies report escalation, user blocking, and appeals adjudications.

### Run Dependency Vulnerability Audit:
```bash
npm run audit:security
```

---

## 🔌 API Overview

All API endpoints are structured under `/api/v1/`:

| Route | Method | Description | Access |
| :--- | :---: | :--- | :--- |
| `/health` | `GET` | Health check endpoint | Public |
| `/api/v1/auth/signup` | `POST` | User registration | Public (Rate-limited) |
| `/api/v1/auth/login` | `POST` | User login (issues HttpOnly cookie) | Public (Rate-limited) |
| `/api/v1/needs/nearby` | `GET` | Get location-fuzzed nearby needs | Public / Authenticated |
| `/api/v1/needs` | `POST` | Submit an emergency or community need | Authenticated + Consent |
| `/api/v1/privacy/consent` | `POST` | Update itemized DPDP consent | Authenticated |
| `/api/v1/privacy/export` | `GET` | Download personal data export (JSON) | Authenticated |
| `/api/v1/privacy/delete-account` | `POST` | Initiate account deletion request | Authenticated |
| `/api/v1/privacy/grievance` | `POST` | Submit formal grievance to Officer | Authenticated |
| `/api/v1/moderation/queue` | `GET` | View pending flagged content | Moderator / Admin |
| `/api/v1/moderation/actions` | `POST` | Apply warning, suspension, or takedown | Moderator / Admin |
| `/api/v1/moderation/appeals` | `POST` | Submit appeal against moderation action | Suspended User |

---

## ⚖️ Legal & DPDP Compliance

SAHAAYE has been architected from day one in compliance with India's **Digital Personal Data Protection (DPDP) Act, 2023**:
- Detailed compliance roadmap: [`docs/legal/dpdp-compliance.md`](docs/legal/dpdp-compliance.md)
- Consent management specification: [`docs/legal/consent-management.md`](docs/legal/consent-management.md)
- Mandatory data retention schedule: [`docs/legal/data-retention-policy.md`](docs/legal/data-retention-policy.md)
- Protection of children's data: [`docs/legal/children-data-policy.md`](docs/legal/children-data-policy.md)
- Grievance redressal process: [`docs/legal/grievance-redressal.md`](docs/legal/grievance-redressal.md)

---

## 🤝 Contributing & Responsible Disclosure

We welcome contributions to help improve community humanitarian assistance.
- **Reporting Vulnerabilities**: If you discover any security or privacy defect, please review our [`SECURITY.md`](SECURITY.md) and report it to `security@sahaaye.org`. Do not open public issues for security vulnerabilities.
- **Community Standards**: All contributors and users are expected to adhere to our [`docs/safety/community-guidelines.md`](docs/safety/community-guidelines.md).

---

<p align="center">
  <sub>Built with ❤️ for community welfare, digital safety, and humanitarian support.</sub>
</p>
