# Astrologer Booking System

A production-grade booking system for an independent Vedic astrologer with WhatsApp integration, concurrency control, role-based access control (RBAC), client portal, and mobile app.

---

## Directory Structure

```
Booking/
├── monorepo/             # Turborepo Monorepo (Backend & Web Frontend)
│   ├── apps/
│   │   ├── server/       # NestJS API (Users, RBAC, Bookings, WhatsApp Cloud API)
│   │   └── ui/           # Next.js 15 Web Application (Admin & Client Portal)
│   ├── package.json      # Monorepo scripts & dependencies
│   ├── pnpm-workspace.yaml
│   ├── turbo.json
│   ├── .env
│   └── ARCHITECTURE.md, SCHEMA.md, DESIGN.md
│
└── mobile/               # Independent Flutter Mobile Application
    ├── lib/              # Clean Architecture / Daily-Dazzle Structure
    ├── pubspec.yaml
    └── analysis_options.yaml
```

---

## Getting Started

### 1. Monorepo (`monorepo/`)

```bash
cd monorepo

# Install dependencies
pnpm install

# Run database migrations
pnpm db:migrate

# Start development servers (Server on :3000, UI on :3001)
pnpm dev

# Build packages
pnpm build
```

### 2. Mobile App (`mobile/`)

```bash
cd mobile

# Get Flutter dependencies
flutter pub get

# Check static analysis
flutter analyze

# Run Flutter app
flutter run
```
