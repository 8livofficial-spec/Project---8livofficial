# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Patients:** Adults seeking medically supervised weight loss, metabolic health optimization, and lifestyle coaching. They need accessible clinical care, transparent consultation booking, and clear medication/diet plans without clinical intimidation.
- **Healthcare Providers (Doctors, Dietitians, Trainers):** Licensed professionals conducting video consultations, issuing electronic prescriptions, reviewing food logs, and setting tailored fitness/nutrition regimens.
- **Pharmacy & Logistics Staff:** Fulfillment partners reviewing provider-issued prescriptions, managing inventory, preparing orders, and tracking patient deliveries.
- **Platform Administrators:** Internal operational staff managing provider onboarding and credential verification, transaction reconciliation, order disputes, and system configurations.

## Product Purpose

8Liv connects patients with an integrated clinical care team (physicians, clinical dietitians, and fitness coaches) for guided, medically sound weight management. The platform delivers continuous care—from metabolic health assessment to video consultations, electronic prescription fulfillment, and doorstep medicine delivery.

Success means sustained patient health outcomes, high consultation reliability, effortless provider scheduling, and airtight prescription fulfillment.

## Positioning

Unlike disconnected fitness tracking apps or impersonal pill-subscription services, 8Liv unites the full care continuum: an initial clinical assessment, 1-on-1 video consultations with licensed doctors, personalized nutrition/fitness regimens, and end-to-end pharmacy fulfillment under one clinical umbrella.

## Operating Context

- Patients interact across mobile and desktop browsers during high-intent, emotionally vulnerable moments (seeking help with weight, health anxieties, reviewing lab markers).
- Providers operate high-volume appointment queues, electronic charting, slot schedules, and e-prescriptions.
- Consultations occur via live, secure video (Stream Video SDK) alongside real-time messaging.
- Transactions encompass metabolic assessment fees, consultation payments, recurring subscription memberships, and pharmacy orders (Razorpay).

## Capabilities and Constraints

- **Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Framer Motion, Supabase (PostgreSQL with Row Level Security), FastAPI backend services, Stream Video SDK, Razorpay.
- **Compliance & Privacy:** Clinical data privacy, secure authentication, doctor verification, and clear prescription validity rules.
- **Portals:** Public conversion funnel (`/`, `/assessment`, `/plans`, `/checkout`), Patient Portal (`/(dashboard)/patient`), Provider Suites (`/doctor`, `/dietitian`, `/trainer`, `/provider`), Pharmacy Fulfillment (`/pharmacy`), and Operations (`/admin`).

## Brand Commitments

- **Brand Identity:** 8Liv (8Live) — A modern telemedicine and metabolic longevity brand.
- **Aesthetic Direction:** Modern Clinical Wellness — Calming, trustworthy medical authority with serene accents, crisp typography, and spacious clarity.
- **Voice & Tone:** Empathetic, scientifically grounded, encouraging, and clear. Zero shame or sensationalism; high clinical clarity.

## Evidence on Hand

- Complete Next.js application routes, schema migrations in `Database/`, API endpoints, and design tokens in `frontend/`.
- Existing route structure across Patient, Provider, Pharmacy, and Admin portals.
- Established video consultation infrastructure and payment integration.

## Product Principles

1. **Clinical Rigor & Absolute Safety:** Every touchpoint reinforces trust, professional medical authority, and clear disclosure of health eligibility.
2. **Empathy over Guilt:** Health journeys require supportive, dignity-first UI. Avoid punitive styling, aggressive alert banners, or clinical clutter.
3. **Clarity of Next Action:** In every state (empty states, pending lab results, scheduled consult, shipment in transit), the user must know immediately what happens next.
4. **Unified Ecosystem:** While patients, doctors, and pharmacy operators have dedicated interfaces tailored to their job-to-be-done, they share a consistent, high-craft 8Liv visual language.

## Accessibility & Inclusion

- WCAG 2.1 AA compliance across all public and authenticated surfaces.
- High color contrast for critical medical stats, dosages, and status badges.
- Keyboard accessible forms, screen-reader friendly modal dialogs, and clear touch targets for mobile accessibility.
