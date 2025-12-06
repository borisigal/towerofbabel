# Epic 7: User Feedback Text Collection

**Type:** Brownfield Enhancement
**Parent:** [Epic 4: Outbound Optimization & Quality Feedback](./epic-4-outbound-optimization-quality-feedback.md)
**Trade-offs:** None (additive feature with zero impact on existing functionality)

---

## Epic Goal

Enable users to provide written feedback alongside thumbs up/down ratings to help improve the cultural interpretation tool through qualitative user insights, without disrupting the existing feedback flow.

---

## Background & Problem Statement

After implementing the thumbs up/down feedback mechanism (Epic 4, Story 4.4), we have quantitative feedback data but lack qualitative insights into *why* users found interpretations helpful or unhelpful. The current implementation:

- Only captures binary feedback (up/down) without context
- Provides limited insight into specific pain points or improvement areas
- Makes it difficult to understand which aspects of interpretations need refinement

---

## Existing System Context

| Aspect | Current State |
|--------|---------------|
| **Technology Stack** | Next.js 14.1, TypeScript, Prisma ORM, PostgreSQL, Supabase Auth, Radix UI, Tailwind CSS |
| **Feedback Component** | `FeedbackButtons.tsx` (client component with state management) |
| **Feedback API** | `/api/feedback` (POST endpoint with auth → validation → authorization → idempotency) |
| **Database Model** | `Interpretation.feedback` (nullable 'up' or 'down'), `Interpretation.feedback_timestamp` |
| **Key Files** | `components/features/interpretation/FeedbackButtons.tsx`, `app/api/feedback/route.ts`, `prisma/schema.prisma`, `lib/db/repositories/interpretationRepository.ts` |

### Current Request Flow

```
Request → Auth → Validation → Authorization → Idempotency Check →
DB Update (feedback + timestamp) → Response
```

**Pain Point:** No way to capture user explanations, suggestions, or specific feedback details.

---

## Enhancement Details

| Aspect | Details |
|--------|---------|
| **What's Being Changed** | Add optional textarea for text feedback after thumbs up/down selection |
| **How It Integrates** | Extends `FeedbackButtons.tsx` component, adds `feedback_text` field to database, enhances API validation |
| **Trade-offs** | None - purely additive with zero impact on existing flows |

---

## Success Criteria

| Metric | Current | Target |
|--------|---------|--------|
| Feedback submission flow | Binary only | Binary + optional text |
| Database schema | 2 feedback fields | 3 feedback fields (adds `feedback_text`) |
| API backward compatibility | N/A | 100% (text optional) |
| Existing functionality | 100% working | 100% working (unchanged) |
| Character limit | N/A | 500 characters max |
| User experience | Single click | Single click + optional textarea |

---

## Stories

### Story 7.1: Database Schema & Migration for Feedback Text

**As a** developer,
**I want** to add a nullable text feedback field to the database,
**So that** user-provided feedback text can be stored alongside binary ratings.

#### Description

Add a new `feedback_text` field to the `Interpretation` model to store optional user feedback comments. This field must be nullable to maintain backward compatibility and support cases where users only provide thumbs up/down without text.

#### Scope

- Add `feedback_text` nullable string field to `Interpretation` model
- Create and test Prisma migration
- Update repository layer to accept optional text feedback parameter
- Update TypeScript types for feedback requests/responses

#### Technical Changes

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `feedback_text String?` to `Interpretation` model |
| `lib/db/repositories/interpretationRepository.ts` | Update feedback update methods to accept optional text |
| `lib/types/models.ts` | Add `feedback_text` to type definitions |

#### Acceptance Criteria

1. `feedback_text` field added to `Interpretation` model as nullable string
2. Prisma migration created and tested in development environment
3. Migration runs successfully without errors or data loss
4. Repository layer methods updated to accept `feedback_text` parameter (optional)
5. TypeScript types updated to include `feedback_text?: string`
6. Database backup created before running migration in production
7. Migration rollback tested and documented
8. All existing database queries continue to work
9. `npm run lint` passes
10. `npm run build` succeeds

#### Technical Notes

- Field is nullable (`String?`) to maintain backward compatibility
- No default value needed (NULL represents no text feedback)
- Character limit enforced at application layer (API validation), not database constraint
- Migration uses Prisma's safe migration tools

---

### Story 7.2: Feedback Component, API Enhancement, Testing & Documentation

**As a** user,
**I want** to provide written feedback after selecting thumbs up/down,
**So that** I can explain why I found the interpretation helpful or unhelpful.

#### Description

Extend the `FeedbackButtons` component to show an optional textarea input after users select thumbs up or down. Update the API endpoint to validate and store text feedback while maintaining backward compatibility with requests that don't include text.

#### Scope

- Extend `FeedbackButtons.tsx` to show textarea after thumbs selection
- Add character count validation (max 500 characters)
- Update `/api/feedback` route to validate and store text feedback
- Add comprehensive error handling for text input
- Maintain existing accessibility standards (ARIA labels, keyboard navigation)
- Comprehensive testing (unit tests, integration tests, build verification)
- Update relevant documentation

#### Technical Changes

| File | Change |
|------|--------|
| `components/features/interpretation/FeedbackButtons.tsx` | Add conditional textarea with character counter |
| `app/api/feedback/route.ts` | Extend Zod schema to accept optional `feedback_text`, update DB calls |
| `lib/llm/types.ts` or equivalent | Add feedback text to request/response type definitions |

#### Acceptance Criteria

**UI Component:**
1. Textarea appears below thumbs up/down buttons after user selects one
2. Textarea placeholder: "Tell us more (optional)" or similar user-friendly text
3. Character counter displays below textarea (e.g., "0/500 characters")
4. Character counter turns red when approaching limit (e.g., >450 characters)
5. Submit button remains enabled even if textarea is empty (text is optional)
6. Textarea auto-focuses after thumbs selection for smooth UX
7. Textarea has accessible label (aria-label or visible label)
8. Keyboard navigation works (tab to textarea, enter to submit)
9. Mobile-friendly: textarea is appropriately sized for touch input
10. Text input is trimmed before submission (no leading/trailing whitespace)

**API Validation:**
11. `/api/feedback` route accepts optional `feedback_text` parameter
12. Zod schema validates `feedback_text` as optional string
13. Text feedback limited to 500 characters (validation error if exceeded)
14. Empty string or null treated identically (no text feedback)
15. Text feedback sanitized to prevent XSS attacks
16. Existing requests without `feedback_text` continue to work (backward compatibility)
17. Idempotency rules maintained (can't change feedback after submission)
18. Appropriate error messages for validation failures

**Database Persistence:**
19. Text feedback stored in `Interpretation.feedback_text` field
20. Repository layer correctly handles NULL vs. empty string
21. Text feedback saved atomically with binary feedback and timestamp

**Testing:**
22. Unit tests for textarea character counting logic
23. Unit tests for API validation (with/without text, character limit, sanitization)
24. Integration test: submit feedback with text and verify DB storage
25. Integration test: submit feedback without text and verify NULL in DB
26. Regression test: existing thumbs up/down flow works without text
27. `npm run lint` passes with zero errors
28. `npm run build` succeeds with zero errors
29. `npm test` passes all tests

**Documentation:**
30. Update relevant documentation (if any README or API docs exist)
31. Add code comments explaining text feedback flow in `FeedbackButtons.tsx`
32. Document character limit reasoning (500 chars chosen for brevity)

#### Technical Notes

- Use `Textarea` component from existing UI library (Radix UI or similar)
- Use existing form patterns (react-hook-form if applicable, or controlled state)
- Follow existing error handling patterns (toast notifications or inline errors)
- Text sanitization: strip HTML tags, encode special characters
- State management: extend existing `useState` pattern in `FeedbackButtons.tsx`
- Visual design: follow existing Tailwind CSS patterns for consistency

---

## Compatibility Requirements

- [x] Existing API request format remains valid (text field is optional)
- [x] Existing API response format unchanged
- [x] Database schema changes are backward compatible (nullable field)
- [x] UI changes follow existing patterns (Radix UI, Tailwind CSS, lucide-react icons)
- [x] All existing error codes and handling preserved
- [x] Idempotency rules remain unchanged (feedback immutable after submission)
- [x] Performance impact is minimal (optional field, no additional indexes needed)

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Database migration failure | Low | High | Test migration in dev environment first; backup production DB; use Prisma's safe migration tools; nullable field prevents data loss |
| API validation breaking existing flows | Low | Medium | Make text field optional in Zod schema; comprehensive backward compatibility testing; monitor error logs post-deployment |
| XSS attack via malicious text input | Low | High | Sanitize input (strip HTML, encode special characters); validate on server side; never render as raw HTML |
| Character limit abuse | Low | Low | Hard limit at 500 characters enforced in API; database can handle longer strings if needed (VARCHAR with no limit or TEXT type) |
| Textarea UX issues on mobile | Medium | Low | Test on multiple mobile devices; ensure textarea is appropriately sized; test keyboard behavior |

---

## Rollback Plan

Both stories can be independently rolled back with minimal risk:

| Story | Rollback Method | Time to Rollback |
|-------|-----------------|------------------|
| Story 7.1 (Database Schema) | Revert Prisma migration using `prisma migrate resolve --rolled-back`; redeploy previous schema | < 10 minutes |
| Story 7.2 (Component & API) | Revert code changes; redeploy previous version; nullable field ensures no DB issues | < 5 minutes |

**Post-Rollback Validation:**
- Verify existing thumbs up/down functionality works
- Check database for any orphaned `feedback_text` entries (safe to ignore, field is nullable)
- Monitor error logs for 24 hours

---

## Definition of Done

- [ ] All acceptance criteria met for both stories
- [ ] Database migration successful with zero data loss
- [ ] Existing thumbs up/down functionality verified (regression testing)
- [ ] API handles both legacy (no text) and new (with text) requests
- [ ] Character limit enforced and tested
- [ ] Accessibility standards maintained (WCAG 2.1 AA)
- [ ] All tests passing (`npm run lint`, `npm run build`, `npm test`)
- [ ] No regression in existing feedback features
- [ ] Text feedback stored correctly in database
- [ ] Documentation updated

---

## Story Manager Handoff

Please develop detailed user stories for this brownfield epic. Key considerations:

- This is an enhancement to an existing system running **Next.js 14 + Prisma ORM + Supabase Auth + PostgreSQL**
- **Integration points:**
  - `FeedbackButtons.tsx` component (`/components/features/interpretation/FeedbackButtons.tsx`)
  - `/api/feedback` route with existing middleware chain (auth → validation → authorization → idempotency)
  - `Interpretation` Prisma model with repository pattern
  - `interpretationRepository.ts` for database access
- **Existing patterns to follow:**
  - Repository pattern for all database access (NO direct Prisma calls)
  - Zod validation for API request/response schemas
  - Client components with `'use client'` directive for interactivity
  - Radix UI components with Tailwind CSS styling
  - Privacy-first design (no sensitive data storage)
  - Structured error responses with specific error codes
- **Critical compatibility requirements:**
  - `feedback_text` field MUST be nullable (optional)
  - API validation MUST accept requests with or without text feedback
  - Existing thumbs up/down flow MUST remain unchanged
  - Maintain idempotency rules (feedback submitted once, immutable)
- Each story must include:
  - Verification that existing thumbs up/down functionality works
  - Database migration testing steps
  - Linting and build verification (`npm run lint`, `npm run build`, `npm test`)
  - Accessibility testing (keyboard navigation, ARIA labels, screen reader compatibility)

The epic should maintain system integrity while delivering **qualitative user feedback collection capability for product improvement insights**.

---

## References

- [Epic 4: Outbound Optimization & Quality Feedback](./epic-4-outbound-optimization-quality-feedback.md) (Story 4.4: Thumbs Up/Down Feedback)
- [Prisma Schema Documentation](https://www.prisma.io/docs/orm/prisma-schema)
- [Zod Validation Documentation](https://zod.dev/)
- [Radix UI Textarea Component](https://www.radix-ui.com/)
- [WCAG 2.1 AA Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---
