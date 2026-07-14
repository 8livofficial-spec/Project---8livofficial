# 8liv SEO Phase 1 Audit

Date: 2026-07-14

Scope: public website SEO only. No production routing changes are included in this phase.

## SEO Audit Report

### Current SEO Issues

- Root metadata is minimal in `frontend/app/layout.tsx`: static title, static description, icons only.
- No `metadataBase`, title template, canonical URLs, Open Graph metadata, Twitter metadata, verification placeholders, robots defaults, or theme metadata.
- No `frontend/app/robots.ts`.
- No `frontend/app/sitemap.ts`.
- No public structured-data components or JSON-LD.
- Homepage is a client component and performs session lookup/redirect from the public page, which adds client-side JavaScript and can create crawl/render ambiguity.
- Most public homepage content is client-rendered through `framer-motion` components.
- Public route inventory is thin: only `/` and `/plans` are currently indexable candidates. Most requested SEO pages do not exist.
- Auth, payment, assessment, video, patient, provider, doctor, admin, pharmacy, and API routes lack explicit noindex metadata/cache headers.
- Multiple private pages are statically buildable App Router pages and need explicit robots metadata and private cache behavior.
- Deprecated pharmacy pages exist as static pages and need noindex/redirect/410 handling in the SEO phase.
- No custom `not-found.tsx` or safe global error boundary was found in `frontend/app`.
- Public footer/internal links are incomplete; older unused `LandingPage.tsx` contains placeholder `#` links and fabricated testimonial/doctor-like content and should not be used as indexable content.
- Some images are large: several public PNGs are 7-8 MB and should not be used for LCP or public SEO pages without compression.
- Some meaningful images have generic alt text, for example homepage hero alt is `Premium Wellness Care`.
- No analytics/Search Console integration was found.
- No CI SEO audit scripts or metadata tests were found.

### Critical Indexing Risks

- Private route families are not centrally marked `noindex, nofollow, noarchive, nosnippet`.
- `/api/*` endpoints exist under the same deployment and must be excluded from robots and sitemap.
- `/patient/*`, `/admin/*`, `/provider/*`, `/doctor/*`, `/pharmacy/*`, `/video/*`, payment, assessment, prescription, and medicine-order paths must never appear in sitemap.
- Public homepage redirects authenticated users client-side; crawler behavior should remain public and canonical, while authenticated redirects should not affect indexable HTML.
- No canonical production domain variable is currently enforced.
- Preview/staging noindex behavior is not implemented.

### Pages That Should Be Indexed

Current:

- `/`
- `/plans` after editorial review and unique metadata

Recommended future public indexable pages:

- `/about`
- `/how-it-works`
- `/medical-weight-management`
- `/online-doctor-consultation`
- `/nutrition-support`
- `/fitness-coaching`
- `/membership`
- `/doctors`
- `/doctors/[slug]` only for active verified doctors
- `/contact`
- `/faq`
- `/privacy`
- `/terms`
- `/refund-policy`
- `/telemedicine-policy`
- `/prescription-policy`
- `/editorial-policy`
- `/medical-review-policy`
- `/corrections-policy`
- `/blog`
- `/blog/[slug]` only for published medically reviewed posts
- `/conditions/[slug]` only for approved, useful condition pages

### Pages That Must Be Excluded

- `/login`
- `/forgot-password`
- `/reset-password`
- `/verify-email`
- `/verification-pending`
- `/assessment`
- `/appointments/select-slot`
- `/consultation-payment`
- `/membership-payment`
- `/not-eligible`
- `/video/room`
- `/patient/*`
- `/provider/*`
- `/doctor/*`
- `/dietitian/*`
- `/trainer/*`
- `/admin/*`
- `/pharmacy/*`
- `/api/*`

### Metadata Gaps

- Missing production `NEXT_PUBLIC_SITE_URL` canonical domain usage.
- Missing title template and page-level titles.
- Missing unique descriptions for public pages.
- Missing canonical alternates.
- Missing Open Graph and Twitter metadata.
- Missing robots metadata for private pages.
- Missing verification placeholders for Search Console/Bing.

### Structured Data Opportunities

- Homepage: `Organization` or `MedicalOrganization`, `WebSite`.
- Service pages: `WebPage`, `BreadcrumbList`.
- Doctor pages: `Physician` or `Person`, only from verified data.
- Blog pages: `Article` or `BlogPosting` with author, reviewer, sources, dates.
- FAQ page: `FAQPage` only for visible FAQs.
- Contact page: `ContactPage`.

### Performance Bottlenecks

- Homepage is `use client`; public content is not server-component first.
- Public landing uses `framer-motion`, adding client bundle to indexable content.
- Large images in `frontend/public/images` include multiple 7-8 MB files.
- Unused older landing component imports remote avatar images and placeholder content.
- No bundle analyzer or performance budgets.

### Content Gaps

- Missing service landing pages for core search intents.
- Missing public trust policy pages required for medical content.
- Missing doctor index/profile pages.
- Missing blog/condition architecture.
- Missing visible medical review framework for health articles.
- Missing FAQ/contact/about pages.

### Redirect Problems And Duplicate URL Risks

- No canonical redirect strategy for host, protocol, casing, trailing slash, or query tracking parameters.
- No redirect map for future public URL migrations.
- Deprecated `/pharmacy/*` pages exist and should be noindexed or redirected safely.

### Recommended Implementation Priority

1. Add canonical site URL utility, root metadata, robots, sitemap, and private noindex protections.
2. Add public SEO page metadata and safe public policy pages.
3. Convert homepage/public pages toward server-rendered content and structured data.
4. Add doctor/blog/condition publishing model only when verified content exists.
5. Add SEO audit scripts/tests and Search Console/analytics setup.

## Public/Private Route Classification

Classification values:

- `PUBLIC_INDEXABLE`: Can be included in sitemap after metadata/canonical work.
- `PUBLIC_NOINDEX`: Publicly reachable but should not be indexed.
- `AUTHENTICATED_PRIVATE`: Requires authentication and must be noindex/no-store.
- `ADMIN_PRIVATE`: Admin-only and must be noindex/no-store.
- `API_PRIVATE`: API endpoint, excluded from sitemap and robots-disallowed.
- `DEPRECATED_REDIRECT`: Retired route; redirect/410/noindex depending on route.

### PUBLIC_INDEXABLE

- `/`
- `/plans`

### PUBLIC_NOINDEX

- `/appointments/select-slot`
- `/assessment`
- `/consultation-payment`
- `/forgot-password`
- `/login`
- `/membership-payment`
- `/not-eligible`
- `/reset-password`
- `/verification-pending`
- `/verify-email`
- `/video/room`

### AUTHENTICATED_PRIVATE

- `/dietitian/dashboard`
- `/doctor/dashboard`
- `/doctor/login`
- `/doctor/prescriptions/new`
- `/patient`
- `/patient/appointments`
- `/patient/appointments/[bookingId]`
- `/patient/billing`
- `/patient/consultation`
- `/patient/consultation/room`
- `/patient/medicine-orders`
- `/patient/medicine-orders/[orderId]`
- `/patient/messages`
- `/patient/notifications`
- `/patient/onboarding/payment`
- `/patient/onboarding/plan`
- `/patient/prescriptions`
- `/patient/prescriptions/[prescriptionId]`
- `/patient/profile`
- `/patient/progress`
- `/patient/settings`
- `/provider`
- `/provider/account-review`
- `/provider/account-suspended`
- `/provider/activate`
- `/provider/agreements`
- `/provider/banking`
- `/provider/consultations`
- `/provider/dashboard`
- `/provider/documents`
- `/provider/earnings`
- `/provider/messages`
- `/provider/onboarding`
- `/provider/patients`
- `/provider/payouts`
- `/provider/plans`
- `/provider/profile`
- `/provider/schedule`
- `/provider/verification-status`
- `/provider/wallet`
- `/trainer/dashboard`

### ADMIN_PRIVATE

- `/admin`
- `/admin/membership-plans`
- `/admin/payments`
- `/admin/payouts`
- `/admin/payouts/batches`
- `/admin/payouts/batches/[batchId]`
- `/admin/payouts/exceptions`
- `/admin/payouts/reconciliation`
- `/admin/pharmacy`
- `/admin/pharmacy-orders`
- `/admin/pharmacy-orders/[orderId]`
- `/admin/prescriptions`
- `/admin/prescriptions/[prescriptionId]`
- `/admin/provider-wallets`
- `/admin/providers`
- `/admin/providers/new`
- `/admin/providers/[providerId]`
- `/admin/providers/[providerId]/audit`
- `/admin/providers/[providerId]/compensation`
- `/admin/providers/[providerId]/payouts`
- `/admin/providers/[providerId]/verification`

### DEPRECATED_REDIRECT

- `/pharmacy`
- `/pharmacy/dashboard`
- `/pharmacy/delivery`
- `/pharmacy/inventory`
- `/pharmacy/orders`
- `/pharmacy/prescriptions`
- `/pharmacy/profile`
- `/pharmacy/reports`

### API_PRIVATE

All `frontend/app/api/**/route.ts` endpoints are classified `API_PRIVATE`, including:

- `/api/admin/*`
- `/api/appointments/*`
- `/api/assessment/*`
- `/api/auth/*`
- `/api/doctor/*`
- `/api/messages`
- `/api/patient/*`
- `/api/payment/*`
- `/api/pharmacy/*`
- `/api/plan`
- `/api/provider/*`
- `/api/razorpayx/webhook`
- `/api/register`
- `/api/staff/*`
- `/api/video/token`

## Keyword And Page-Intent Map

- `/`: branded and category intent; online doctor-led weight management and wellness care.
- `/plans`: membership and pricing intent; compare 8liv membership options.
- `/medical-weight-management`: service intent; doctor-supervised medical weight management.
- `/online-doctor-consultation`: service intent; telemedicine consultation for weight management.
- `/nutrition-support`: service intent; nutrition guidance as part of supervised care.
- `/fitness-coaching`: service intent; fitness support and lifestyle coaching.
- `/membership`: commercial intent; what membership includes and how care works.
- `/doctors`: trust/discovery intent; meet verified 8liv doctors.
- `/faq`: support intent; answer safety, consultation, prescription, membership, and privacy questions.
- `/blog/[slug]`: educational intent; medically reviewed patient questions.
- `/conditions/[slug]`: educational intent; medically reviewed condition explainers.

## Metadata Architecture

- Use a central `siteConfig` with `NEXT_PUBLIC_SITE_URL`.
- Root metadata should define `metadataBase`, title template, default title, description, Open Graph, Twitter, icons, manifest, robots, verification placeholders, and theme color.
- Each public indexable page must export unique `metadata` or `generateMetadata`.
- Private pages must export `robots: { index: false, follow: false, noarchive: true, nosnippet: true }`.

## Canonical Strategy

- Canonical format: HTTPS production host from `NEXT_PUBLIC_SITE_URL`, lowercase paths, no trailing slash except `/`, no tracking query params.
- Do not canonicalize all pages to `/`.
- Sitemap should only include canonical clean URLs.
- Preview/staging/development must noindex all pages.

## robots.ts

Not implemented yet in Phase 1. Required in Phase 2.

## sitemap.ts

Not implemented yet in Phase 1. Required in Phase 2.

## Structured-Data Components

Not implemented yet in Phase 1. Required in Phase 2/3.

## Root-Layout Metadata

Current metadata is insufficient and should be replaced in Phase 2.

## Dynamic Page Metadata

No `generateMetadata()` was found for dynamic public SEO pages. Dynamic public pages do not currently exist.

## Public Page Improvements

- Convert homepage SEO-visible content away from client-only rendering where practical.
- Add unique metadata to `/` and `/plans`.
- Add policy/service pages before including them in sitemap.
- Replace generic hero alt text.
- Avoid unsupported or guaranteed medical claims.

## Doctor-Page SEO

Doctor public pages are not present. They should only be added when active, verified doctor data is available.

## Medical-Content Trust Framework

Public policy pages and medical review workflows are missing.

## Core Web Vitals Fixes

- Optimize LCP hero image.
- Avoid unnecessary landing-page client hydration.
- Compress oversized images.
- Add bundle analyzer and budgets.

## Image And Font Optimization

- Fonts already use `next/font`.
- Image audit found oversized PNG assets and some generic alt text.
- Public pages should use `next/image` for meaningful imagery.

## Accessibility Fixes

- Add skip link and focus-visible styling review.
- Ensure all public CTAs use descriptive labels.
- Ensure public pages have one H1 and logical H2/H3 hierarchy.

## Analytics And Search Console Setup

Not implemented. Needs privacy review before adding analytics.

## CI Audit Scripts

Not implemented. Recommended scripts should check metadata, sitemap, robots, private noindex, broken links, image alt text, and bundle size.

## Automated Tests

Not implemented. Recommended tests should cover robots, sitemap, private exclusion, metadata, canonical URLs, and no private data in public HTML.

## Deployment Checklist

- Set `NEXT_PUBLIC_SITE_URL` to the production domain.
- Configure canonical redirects at Vercel/Next layer.
- Add `robots.ts` and `sitemap.ts`.
- Add noindex/no-store protections for private route families.
- Add metadata for indexable pages.
- Validate structured data.
- Submit sitemap to Search Console after deployment.

## Post-Launch Monitoring Plan

- Monitor Search Console indexing, excluded URLs, canonical selection, Core Web Vitals, structured data, manual actions, and security issues.
- Confirm private routes remain excluded.
- Inspect core public URLs after deployment.
