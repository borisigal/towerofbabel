# Epic 5: Privacy, Polish & Launch Readiness

**Expanded Goal:** Implement privacy badge with LLM provider disclosure, GDPR compliance features (data deletion request, privacy policy, cookie consent), accessibility improvements to meet WCAG 2.1 AA standards, cross-browser testing, PWA capabilities (installable web app), and final UI polish to ensure production readiness, build user trust, and enable confident public launch.

---

## Story 5.1: Implement Privacy Badge and Provider Disclosure

**As a** user,
**I want** to know which AI provider processes my messages and their data policy,
**so that** I can make informed decisions about using the service for sensitive communications.

### Acceptance Criteria

1. Privacy badge displayed prominently on landing page (hero section or above fold)
2. Privacy badge displayed in-app (footer on desktop, settings link on mobile)
3. Badge text: "Processed by [Provider Name] • No message storage by TowerOfBabel"
4. Badge links to dedicated privacy page (/privacy)
5. Privacy page content includes:
   - "We don't store your messages" (clear statement)
   - Current AI provider name and link to their privacy policy
   - Provider's data retention policy explained in plain language (e.g., "OpenAI retains data for 30 days for abuse monitoring")
   - User control statement: "You choose whether to use the service knowing the provider's privacy terms"
6. Privacy page includes "How We Protect Your Privacy" section explaining metadata-only storage
7. Privacy page lists what metadata IS stored (user_id, timestamp, culture_pair, character_count, feedback)
8. Privacy badge icon uses lock or shield symbol (visual trust indicator)
9. Privacy page accessible from footer link on all pages
10. Privacy page content reviewed and approved before launch (legal review optional but recommended)

---

## Story 5.2: Implement GDPR Compliance Features

**As a** user,
**I want** to request deletion of my data and manage cookie consent,
**so that** I have control over my personal information per GDPR requirements.

### Acceptance Criteria

1. Data deletion request button added to account settings page: "Delete My Account & Data"
2. Deletion confirmation modal warns: "This will permanently delete your account, interpretation history (metadata only), and subscription information. This action cannot be undone."
3. Deletion API endpoint (/api/user/delete) deletes:
   - User record
   - All interpretation metadata records for user
   - Subscription records
   - Does NOT delete Stripe customer records (handled separately via Stripe dashboard if needed)
4. Successful deletion signs user out and redirects to goodbye page
5. Cookie consent banner displayed on first visit to landing page
6. Banner allows "Accept All" or "Reject Non-Essential" options
7. Essential cookies (authentication session) explained and always enabled
8. Analytics cookies (Vercel Analytics, optional) can be rejected
9. Cookie preferences saved in localStorage (or cookie itself)
10. Privacy policy page includes GDPR-compliant language (data processing, user rights, contact info)
11. Terms of service page created with basic legal language (use standard SaaS template)
12. Footer links to Privacy Policy and Terms of Service on all pages

---

## Story 5.3: Accessibility Improvements (WCAG 2.1 AA Compliance)

**As a** user with disabilities,
**I want** the application to be fully accessible via keyboard and screen reader,
**so that** I can use TowerOfBabel regardless of my abilities.

### Acceptance Criteria

1. All interactive elements (buttons, links, form inputs) keyboard accessible (tab navigation works)
2. Focus indicators clearly visible on all focusable elements (custom focus ring or browser default enhanced)
3. Skip-to-content link added for screen reader users (skip nav, jump to main content)
4. Semantic HTML used throughout (proper heading hierarchy, landmark regions, form labels)
5. ARIA labels added where necessary (icon buttons, dynamic content updates)
6. Color contrast ratios meet WCAG 2.1 AA standards:
   - Text: 4.5:1 minimum
   - UI components (buttons, form borders): 3:1 minimum
7. Emotion gauges use multiple modalities (text labels, numerical scores, visual patterns—not color alone)
8. Form validation errors announced to screen readers (aria-live regions)
9. Loading states announced to screen readers ("Loading interpretation...")
10. Automated accessibility testing using axe DevTools or similar (0 critical violations)
11. Manual screen reader testing (NVDA or VoiceOver) for core workflows
12. Text resizable up to 200% zoom without breaking layout

---

## Story 5.4: Cross-Browser Testing and PWA Setup

**As a** user,
**I want** the application to work reliably on my preferred browser and device,
**so that** I have a consistent experience regardless of how I access it.

### Acceptance Criteria

1. Application tested on modern browsers (last 2 versions):
   - Chrome (desktop & mobile)
   - Firefox (desktop)
   - Safari (desktop & iOS)
   - Edge (desktop)
2. Core workflows verified on each browser:
   - Sign-in (magic link & Google OAuth)
   - Inbound interpretation
   - Outbound optimization
   - Payment flow (Stripe Checkout)
3. Visual regressions checked (layout, spacing, colors consistent)
4. PWA manifest file created (/public/manifest.json) with:
   - App name, description, icons
   - Display mode: standalone
   - Theme color, background color
5. Service worker registered for offline manifest (NOT offline functionality—requires internet for LLM)
6. "Add to Home Screen" prompt tested on iOS Safari and Android Chrome
7. PWA installed on mobile device and verified app-like experience (no browser chrome)
8. Favicon and touch icons configured (multiple sizes: 192x192, 512x512)
9. Meta tags for social sharing (Open Graph, Twitter Card) added to landing page
10. Browserstack or manual device testing completed (iPhone, Android, iPad, desktop)

---

## Story 5.5: Final UI Polish and Launch Checklist

**As a** user,
**I want** a polished, professional interface that builds trust,
**so that** I feel confident using TowerOfBabel for important communications.

### Acceptance Criteria

1. Landing page hero section with clear value proposition: "Understand What People Really Mean Across Cultures"
2. Landing page includes 3-5 bullet benefits, emotion gauge preview image, sign-up CTA
3. Loading states polished (spinners, skeleton screens, smooth transitions)
4. Error messages user-friendly (no technical jargon, actionable guidance)
5. Empty states added where needed (e.g., "No interpretations yet. Paste a message to get started.")
6. Success messages for key actions (sign-in, subscription, feedback submitted)
7. Responsive design reviewed on all breakpoints (mobile, tablet, desktop)
8. Typography hierarchy consistent (headings, body text, UI labels)
9. Spacing and alignment polished (consistent padding, margins, grid alignment)
10. Launch checklist completed:
    - Environment variables configured in production
    - Database migrations applied to production database
    - Stripe webhooks configured with production endpoints
    - Error monitoring active (Sentry or Vercel)
    - Analytics configured (Vercel Analytics or Plausible)
    - Domain DNS configured (if custom domain used)
    - SSL certificate active (Vercel automatic)
    - Rate limiting tested and configured
    - LLM API keys validated in production
    - Test interpretations run in production environment
    - Backup strategy confirmed (database backups enabled)

---
