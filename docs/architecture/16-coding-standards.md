# 16. Coding Standards

This section defines mandatory coding standards for TowerOfBabel to ensure consistency, maintainability, and alignment with architectural patterns. All code **MUST** adhere to these standards before merging to main branch.

---

## 16.1 TypeScript Standards

### **Strict Mode Enforcement**

**Rule:** TypeScript strict mode MUST be enabled (`tsconfig.json: "strict": true`)

**Mandatory Compiler Options:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

**Rationale:** Catches bugs at compile-time, prevents runtime errors, essential for 2-3 week timeline where production bugs are costly.

---

### **Type Annotations**

**Rule:** Explicitly type all function parameters and return types (except React components where inference is clear)

```typescript
// ❌ BAD - Missing return type
async function getUserTier(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user?.tier || 'trial';
}

// ✅ GOOD - Explicit return type
async function getUserTier(userId: string): Promise<UserTier> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tier: true }
  });
  return user?.tier || 'trial';
}
```

**Rationale:** Self-documenting code, prevents accidental type changes, enables better IDE autocomplete.

---

### **No `any` Type**

**Rule:** The `any` type is **FORBIDDEN** except for:
1. Third-party library types where `unknown` doesn't work
2. Temporary scaffolding (MUST add `// TODO: Type this properly` comment)

```typescript
// ❌ BAD - Using any
function processWebhook(event: any) {
  console.log(event.type);
}

// ✅ GOOD - Using proper Stripe types
import Stripe from 'stripe';

function processWebhook(event: Stripe.Event) {
  console.log(event.type);
}

// ✅ ACCEPTABLE - Temporary with TODO
function parseComplexLLMResponse(response: any) { // TODO: Type this properly after LLM schema finalized
  return response.data;
}
```

**Enforcement:** ESLint rule `@typescript-eslint/no-explicit-any: error`

---

### **Interface vs Type**

**Rule:** Use `interface` for object shapes, `type` for unions/intersections/aliases

```typescript
// ✅ GOOD - Interface for object shapes
interface User {
  id: string;
  email: string;
  tier: UserTier;
}

// ✅ GOOD - Type for unions
type UserTier = 'trial' | 'payg' | 'pro';

// ✅ GOOD - Type for complex combinations
type AuthenticatedUser = User & { sessionToken: string };
```

**Rationale:** Interfaces are extendable and show better error messages, types are more flexible for unions.

---

## 16.2 File & Folder Naming Conventions

### **File Naming**

| File Type | Convention | Example |
|-----------|------------|---------|
| React Components | PascalCase.tsx | `InterpretationForm.tsx`, `EmotionGauge.tsx` |
| Hooks | camelCase.ts | `useUserTier.ts`, `useInterpretation.ts` |
| Utilities | camelCase.ts | `formatCulture.ts`, `calculateCost.ts` |
| Services | camelCase.ts | `llmService.ts`, `usageService.ts` |
| Types | camelCase.ts | `models.ts`, `api.ts` |
| API Routes | route.ts (Next.js convention) | `app/api/interpret/route.ts` |
| Tests | *.test.ts or *.spec.ts | `usageService.test.ts` |

**Rationale:** Consistent naming enables quick file identification, aligns with Next.js conventions.

---

### **Folder Naming**

**Rule:** Use kebab-case for all folders

```
✅ GOOD
/components/features/interpretation-form/
/lib/llm/cost-circuit-breaker/

❌ BAD
/components/features/InterpretationForm/
/lib/llm/CostCircuitBreaker/
```

**Exception:** Next.js route groups use parentheses: `app/(dashboard)/`, `app/(auth)/`

---

## 16.3 Component Patterns

### **Server Components by Default**

**Rule:** ALL components are Server Components unless they need interactivity

```typescript
// ✅ GOOD - Server Component (default)
// app/dashboard/page.tsx
export default async function DashboardPage() {
  const user = await getUserFromSession();
  return <DashboardLayout user={user} />;
}

// ✅ GOOD - Client Component (when needed)
// components/features/InterpretationForm.tsx
'use client';

import { useState } from 'react';

export function InterpretationForm() {
  const [message, setMessage] = useState('');
  // ... interactive logic
}
```

**When to Use Client Components (`'use client'`):**
- Event handlers (onClick, onChange, onSubmit)
- State management (useState, useReducer, Zustand)
- Browser APIs (localStorage, window, navigator)
- Animations, tooltips, modals

**Rationale:** Server Components reduce bundle size (< 300KB goal), faster FCP (< 2s goal), better SEO.

---

### **Component File Structure**

**Rule:** One component per file, export at bottom

```typescript
// ✅ GOOD - Single component, clear structure
// components/features/interpretation/EmotionGauge.tsx
'use client';

import { Emotion } from '@/lib/types/models';

/**
 * Displays emotion intensity with contextual labels and visual progress bar.
 * Adapts to single-culture (one score) or cross-culture (dual scores) display.
 *
 * @param emotion - Emotion data with sender/receiver scores
 * @param sameCulture - Whether sender and receiver are same culture
 */
interface EmotionGaugeProps {
  emotion: Emotion;
  sameCulture: boolean;
}

export function EmotionGauge({ emotion, sameCulture }: EmotionGaugeProps) {
  const intensityLabel = getIntensityLabel(emotion.senderScore);

  return (
    <div className="space-y-2">
      {/* Component JSX */}
    </div>
  );
}

function getIntensityLabel(score: number): string {
  if (score <= 2) return 'LOW';
  if (score <= 4) return 'MODERATE';
  if (score <= 6) return 'MODERATE-HIGH';
  if (score <= 8) return 'VERY HIGH';
  return 'EXTREMELY HIGH';
}
```

**Structure Order:**
1. Imports (external → internal → types)
2. JSDoc comment for exported component
3. TypeScript interface/type definitions
4. Main component export
5. Helper functions (private to file)

---

### **Props Interface Naming**

**Rule:** Component props interface named `{ComponentName}Props`

```typescript
// ✅ GOOD
interface EmotionGaugeProps { ... }
export function EmotionGauge(props: EmotionGaugeProps) { ... }

// ❌ BAD
interface Props { ... } // Too generic
interface IEmotionGaugeProps { ... } // Hungarian notation (outdated)
```

---

## 16.4 API Route Patterns

### **API Route Structure (Mandatory Order)**

**Rule:** ALL API routes MUST follow this middleware chain order:

```typescript
// app/api/interpret/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/supabaseServer';
import { checkRateLimit } from '@/lib/middleware/rateLimit';
import { checkUsageLimit } from '@/lib/services/usageService';
import { checkCostBudget, trackCost } from '@/lib/llm/costCircuitBreaker';
import { createLLMProvider } from '@/lib/llm/factory';
import { logger } from '@/lib/observability/logger';

export async function POST(req: NextRequest) {
  // 1. AUTHENTICATION (Supabase Auth)
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }},
      { status: 401 }
    );
  }

  // 2. RATE LIMITING (IP-based)
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  if (!checkRateLimit(ip, 50)) {
    return NextResponse.json(
      { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' }},
      { status: 429 }
    );
  }

  // 3. REQUEST VALIDATION
  const body = await req.json();
  const validation = validateInterpretationRequest(body);
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_INPUT', message: validation.error }},
      { status: 400 }
    );
  }

  // 4. AUTHORIZATION - CRITICAL: Query DATABASE for tier/usage (NOT JWT)
  const userRecord = await prisma.user.findUnique({
    where: { id: user.id },
    select: { tier: true, messages_used_count: true }
  });

  // 5. USAGE LIMIT CHECK (tier-specific)
  const usageCheck = await checkUsageLimit(user.id);
  if (!usageCheck.allowed) {
    return NextResponse.json(
      { success: false, error: { code: 'LIMIT_EXCEEDED', ...usageCheck }},
      { status: 403 }
    );
  }

  // 6. COST CIRCUIT BREAKER - CRITICAL
  const costCheck = await checkCostBudget(user.id);
  if (!costCheck.allowed) {
    logger.warn('Cost circuit breaker triggered', { userId: user.id, layer: costCheck.layer });
    return NextResponse.json(
      { success: false, error: { code: 'SERVICE_OVERLOADED', message: 'Please try again later' }},
      { status: 503 }
    );
  }

  // 7. BUSINESS LOGIC
  const llmProvider = createLLMProvider();
  const startTime = Date.now();

  try {
    const result = await llmProvider.interpret(
      body.message,
      body.sender_culture,
      body.receiver_culture,
      body.mode
    );

    // 8. COST TRACKING - CRITICAL
    await trackCost(user.id, result.metadata.costUsd);

    // 9. PERSISTENCE
    await incrementUsage(user.id);

    // 10. LOGGING (structured)
    logger.info('Interpretation successful', {
      user_id: user.id,
      culture_pair: `${body.sender_culture}-${body.receiver_culture}`,
      cost_usd: result.metadata.costUsd,
      response_time_ms: Date.now() - startTime,
    });

    // 11. RESPONSE
    return NextResponse.json({
      success: true,
      interpretation: result,
      messages_remaining: usageCheck.messagesRemaining! - 1,
    });

  } catch (error) {
    // 12. ERROR HANDLING
    logger.error('Interpretation failed', { user_id: user.id, error });
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Processing failed' }},
      { status: 500 }
    );
  }
}
```

**Rationale:** Consistent order prevents security bugs (auth/rate limiting must come first), ensures all routes have cost protection, enables code reviews to spot missing steps.

---

### **API Response Format (Standardized)**

**Rule:** ALL API responses MUST use this format:

```typescript
// Success response
interface SuccessResponse<T> {
  success: true;
  data: T;
  metadata?: {
    messages_remaining?: number;
    cost_usd?: number;
    timestamp?: string;
  };
}

// Error response
interface ErrorResponse {
  success: false;
  error: {
    code: string;           // Machine-readable error code (UPPERCASE_SNAKE_CASE)
    message: string;        // User-friendly message
    details?: unknown;      // Additional context (debug info, validation errors)
  };
}
```

**Example:**
```typescript
// ✅ GOOD - Consistent format
return NextResponse.json({
  success: true,
  data: { interpretation: result },
  metadata: { messages_remaining: 9 }
});

// ❌ BAD - Inconsistent format
return NextResponse.json({ result, remaining: 9 }); // No success flag
```

---

## 16.5 Database Query Patterns

### **CRITICAL: Database as Source of Truth**

**Rule:** ALWAYS query database for tier/usage authorization (NEVER use JWT `user.app_metadata`)

```typescript
// ❌ FORBIDDEN - Using JWT for authorization
const { data: { user } } = await supabase.auth.getUser();
if (user.app_metadata.tier === 'trial') { /* WRONG */ }

// ✅ REQUIRED - Database query for authorization
const { data: { user } } = await supabase.auth.getUser(); // Authentication only
const userRecord = await prisma.user.findUnique({
  where: { id: user.id },
  select: { tier: true, messages_used_count: true }
}); // Authorization
```

**Enforcement:** ESLint rule (see Tech Stack section) flags `user.app_metadata` usage.

---

### **Repository Pattern (Mandatory)**

**Rule:** ALL database access MUST go through repository functions (no direct Prisma calls in API routes)

```typescript
// ❌ BAD - Direct Prisma in API route
// app/api/user/route.ts
export async function GET(req: NextRequest) {
  const user = await prisma.user.findUnique({ where: { id } }); // Tight coupling
}

// ✅ GOOD - Repository abstraction
// lib/db/repositories/userRepository.ts
export async function findUserById(id: string): Promise<User | null> {
  return executeWithCircuitBreaker(() =>
    prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, tier: true, messages_used_count: true }
    })
  );
}

// app/api/user/route.ts
import { findUserById } from '@/lib/db/repositories/userRepository';

export async function GET(req: NextRequest) {
  const user = await findUserById(userId); // Loose coupling, testable
}
```

**Rationale:** Enables testing (mock repositories), future database migration, connection circuit breaker wrapping.

---

### **Query Optimization (Mandatory)**

**Rule:** ALWAYS use explicit `select` clauses (fetch only needed columns)

```typescript
// ❌ BAD - Fetches all columns (slow, holds connection longer)
const user = await prisma.user.findUnique({ where: { id } });

// ✅ GOOD - Fetches only needed columns (fast, releases connection faster)
const user = await prisma.user.findUnique({
  where: { id },
  select: { tier: true, messages_used_count: true, messages_reset_date: true }
});
```

**Enforcement:** Code review checklist item, prevents connection pool exhaustion.

---

## 16.6 Testing Standards

### **Test File Organization**

**Rule:** Mirror source file structure in `/tests` directory

```
/lib/services/usageService.ts
/tests/unit/lib/services/usageService.test.ts

/app/api/interpret/route.ts
/tests/integration/api/interpret.test.ts
```

---

### **Test Naming Convention**

**Rule:** Use `describe` + `it` with clear behavior descriptions

```typescript
// ✅ GOOD - Clear, behavior-focused
describe('usageService.checkUsageLimit', () => {
  it('should allow interpretation when trial user has messages remaining', async () => {
    const result = await checkUsageLimit(trialUserWith5MessagesUsed);
    expect(result.allowed).toBe(true);
    expect(result.messagesRemaining).toBe(5);
  });

  it('should block interpretation when trial user exhausted 10 messages', async () => {
    const result = await checkUsageLimit(trialUserWith10MessagesUsed);
    expect(result.allowed).toBe(false);
    expect(result.error).toBe('TRIAL_LIMIT_EXCEEDED');
  });

  it('should allow unlimited interpretations for PAYG users', async () => {
    const result = await checkUsageLimit(paygUser);
    expect(result.allowed).toBe(true);
    expect(result.messagesRemaining).toBeUndefined();
  });
});

// ❌ BAD - Unclear test names
describe('usage tests', () => {
  it('works', async () => { /* What does "works" mean? */ });
  it('test1', async () => { /* Meaningless name */ });
});
```

---

### **Test Coverage Requirements**

**Minimum Coverage (Epic 5 - Before Launch):**
- **Services Layer:** 80% coverage (business logic must be tested)
- **API Routes:** 60% coverage (integration tests for happy path + error cases)
- **Components:** 50% coverage (critical user interactions only)
- **Utilities:** 90% coverage (pure functions, easy to test)

**NOT Required for MVP:**
- E2E tests (deferred to Phase 2 per PRD)
- Visual regression tests
- Performance benchmarks

**Enforcement:** CI fails if services layer < 80% (Epic 5)

---

### **Critical Test Cases (MUST Exist)**

**Epic 1 Story 1.5 - Payment Flow Integration Test:**
```typescript
// tests/integration/payment-flow.test.ts
describe('Payment Flow - Immediate Tier Update', () => {
  it('should allow interpretation immediately after Pro upgrade', async () => {
    // 1. Create trial user with 10/10 messages exhausted
    const user = await createTestUser({ tier: 'trial', messages_used_count: 10 });

    // 2. Simulate Stripe checkout.session.completed webhook
    await simulateStripeWebhook('checkout.session.completed', {
      customer_id: user.stripe_customer_id,
      subscription_id: 'sub_test123'
    });

    // 3. Attempt interpretation IMMEDIATELY (JWT still stale, database updated)
    const response = await fetch('/api/interpret', {
      method: 'POST',
      headers: { Cookie: user.sessionCookie }, // Stale JWT with tier=trial
      body: JSON.stringify({ message: 'test', sender_culture: 'american', receiver_culture: 'japanese', mode: 'inbound' })
    });

    // 4. MUST succeed (database check, not JWT check)
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.messages_remaining).toBe(99); // Pro tier, 1 used
  });
});
```

**Rationale:** This test validates CRITICAL Risk #1 mitigation (JWT session delay).

---

## 16.7 Documentation Standards

### **JSDoc for Public APIs**

**Rule:** ALL exported functions, interfaces, and components MUST have JSDoc comments

```typescript
/**
 * Checks if user has available message quota based on tier and usage.
 *
 * CRITICAL: Always queries database for tier/usage (never uses JWT app_metadata).
 *
 * @param userId - Supabase Auth user UUID
 * @returns Promise resolving to usage check result with allowed flag and remaining messages
 *
 * @example
 * ```typescript
 * const check = await checkUsageLimit('user-123');
 * if (!check.allowed) {
 *   return error('LIMIT_EXCEEDED');
 * }
 * ```
 *
 * @throws {Error} If user not found in database
 */
export async function checkUsageLimit(userId: string): Promise<UsageCheckResult> {
  // Implementation
}
```

**JSDoc Tags to Use:**
- `@param` - Parameter description
- `@returns` - Return value description
- `@throws` - Exceptions thrown
- `@example` - Usage example (especially for complex functions)
- `@deprecated` - Mark deprecated code (with migration path)

**Enforcement:** ESLint rule `require-jsdoc` for exported functions.

---

### **Inline Comments**

**Rule:** Comment **WHY**, not **WHAT**

```typescript
// ❌ BAD - Commenting the obvious
// Set tier to trial
user.tier = 'trial';

// ✅ GOOD - Explaining business logic
// Default to trial tier for new users (14-day trial, 10 messages)
user.tier = 'trial';

// ✅ GOOD - Explaining non-obvious code
// JWT caches tier for 1 hour, so we MUST query database for real-time tier updates
// This prevents blocking paid users due to stale JWT (Critical Risk #1)
const userRecord = await prisma.user.findUnique({ where: { id: user.id } });
```

---

### **README Files**

**Required README Locations:**
1. `/README.md` - Project overview, setup instructions
2. `/lib/auth/README.md` - Authentication pattern documentation (CRITICAL)
3. `/lib/llm/README.md` - LLM provider adapter usage
4. `/tests/README.md` - Testing strategy and how to run tests

**README Template:**
```markdown
# [Module Name]

# Purpose
Brief description of what this module does.

# Key Patterns
Critical patterns developers must follow (e.g., database-as-source-of-truth).

# Usage Examples
```typescript
// Code example
```

# Common Pitfalls
What NOT to do and why.

# Testing
How to test this module.
```

---

## 16.8 Git Commit Standards

### **Conventional Commits (Mandatory)**

**Rule:** ALL commits MUST follow Conventional Commits format

**Format:** `<type>(<scope>): <description>`

**Types:**
- `feat:` - New feature (Epic story implementation)
- `fix:` - Bug fix
- `docs:` - Documentation only
- `style:` - Code style (formatting, missing semicolons, etc.)
- `refactor:` - Code refactoring (no behavior change)
- `perf:` - Performance improvement
- `test:` - Adding or updating tests
- `chore:` - Build, dependencies, tooling

**Examples:**
```bash
# ✅ GOOD
feat(auth): implement Supabase Auth with magic link
fix(api): add cost circuit breaker to prevent runaway expenses
docs(architecture): add coding standards section
test(usage): add integration test for payment flow tier update

# ❌ BAD
updated stuff
fix bug
wip
asdfasdf
```

**Enforcement:** Git hook (Husky) validates commit messages, CI fails on non-conventional commits.

---

### **Commit Size**

**Rule:** Commits should be small and focused (1 story acceptance criterion per commit ideal)

**Good Commit Strategy:**
1. One acceptance criterion = one commit
2. Refactoring separate from feature work
3. Tests committed WITH the code they test (not separately)

**Example (Story 1.5 - Cost Circuit Breaker):**
```bash
git commit -m "feat(llm): add Vercel KV connection for cost tracking"
git commit -m "feat(llm): implement 3-layer cost circuit breaker"
git commit -m "feat(api): integrate cost check in /api/interpret route"
git commit -m "test(llm): add cost circuit breaker unit tests"
git commit -m "feat(admin): add cost metrics monitoring endpoint"
```

---

## 16.9 Code Review Checklist

### **Pre-Merge Checklist (Reviewer MUST Verify)**

**Security:**
- [ ] Authentication check present in API routes
- [ ] Rate limiting implemented where required
- [ ] Database queries use explicit `select` (no full table fetches)
- [ ] No sensitive data logged (API keys, passwords, message content)
- [ ] Stripe webhook signature verified before processing
- [ ] No `user.app_metadata` usage for tier/usage checks (ESLint should catch)

**Architecture Compliance:**
- [ ] Database queries go through repository functions (not direct Prisma in routes)
- [ ] Cost circuit breaker called before LLM requests
- [ ] Tier/usage queried from database (NOT JWT)
- [ ] Server Components used by default, `'use client'` only when necessary
- [ ] API responses use standardized format (success/error structure)

**Code Quality:**
- [ ] No `any` types (except documented exceptions)
- [ ] JSDoc comments on all exported functions
- [ ] Function names are descriptive and verb-based
- [ ] No magic numbers (use named constants)
- [ ] Error handling present (try/catch with logging)

**Testing:**
- [ ] Unit tests added for new services/utilities
- [ ] Integration tests added for new API routes
- [ ] Critical paths tested (payment flow, auth, cost limits)
- [ ] Test coverage meets minimum requirements

**Performance:**
- [ ] Database queries optimized (explicit `select`, indexes used)
- [ ] No N+1 query patterns
- [ ] Large lists paginated (if applicable)
- [ ] Images optimized (WebP, lazy loading)

**Documentation:**
- [ ] README updated if public API changed
- [ ] JSDoc comments accurate and complete
- [ ] Inline comments explain complex logic
- [ ] Changelog/PRD updated if behavior changed

---

## 16.10 Linting & Formatting Configuration

### **ESLint Configuration**

**File:** `.eslintrc.json`

```json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "project": "./tsconfig.json"
  },
  "plugins": ["@typescript-eslint"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/explicit-function-return-type": ["warn", {
      "allowExpressions": true,
      "allowTypedFunctionExpressions": true
    }],
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "require-jsdoc": ["warn", {
      "require": {
        "FunctionDeclaration": true,
        "MethodDefinition": true,
        "ClassDeclaration": true,
        "ArrowFunctionExpression": false,
        "FunctionExpression": false
      }
    }],
    "no-restricted-properties": ["error", {
      "object": "user",
      "property": "app_metadata",
      "message": "CRITICAL: NEVER use user.app_metadata for tier/usage checks. Query database instead (see /lib/auth/README.md)."
    }]
  }
}
```

**Rationale:**
- `no-explicit-any: error` - Prevents dangerous `any` usage
- `no-console: warn` - Use structured logging (Pino), not console.log
- `require-jsdoc: warn` - Enforce documentation (warning allows gradual adoption)
- `no-restricted-properties` - **CRITICAL:** Prevents JWT session delay bug

---

### **Prettier Configuration**

**File:** `.prettierrc`

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

**Enforcement:**
- VSCode: "Format on Save" enabled
- Pre-commit hook: Husky runs `prettier --check`
- CI: Fails if code not formatted

---

## 16.11 Enforcement Strategy

### **Automated Enforcement (CI Pipeline)**

**Pre-Commit Hooks (Husky):**
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

**CI Pipeline (GitHub Actions / Vercel):**
1. ESLint check (fails on errors)
2. TypeScript compilation (fails on errors)
3. Prettier check (fails if not formatted)
4. Unit tests (fails if < 80% coverage for services)
5. Integration tests (fails if critical tests missing)

**Branch Protection Rules:**
- Require PR approval (1 reviewer minimum)
- Require CI checks to pass
- Require up-to-date branch before merge
- No direct commits to `main`

---

### **Manual Code Review (Human Verification)**

**Reviewer Responsibilities:**
1. Run checklist (Section 16.9) for every PR
2. Verify CRITICAL patterns followed (database-as-source-of-truth, cost circuit breaker)
3. Check for security vulnerabilities (auth bypass, SQL injection via raw queries)
4. Ensure tests actually test the behavior (not just pass)

**Author Responsibilities:**
1. Self-review before requesting review (run full checklist)
2. Add PR description with:
   - Story/epic reference
   - What changed and why
   - Testing performed
   - Screenshots (if UI change)
3. Respond to review comments within 24 hours

---

## 16.12 Exceptions & Waivers

**When Standards Can Be Waived:**
1. Rapid prototyping (POC code, explicitly marked `// PROTOTYPE - NOT PRODUCTION`)
2. Third-party library integration (when library doesn't support TypeScript properly)
3. Performance-critical code (with justification in PR description)

**Waiver Process:**
1. Add comment in code: `// STANDARDS_WAIVER: <reason>`
2. Document in PR description why waiver needed
3. Require 2 approvals (instead of 1) for waiver PRs
4. Add TODO to remove waiver after MVP (if temporary)

**Example:**
```typescript
// STANDARDS_WAIVER: Using 'any' for LLM response until schema stabilizes
// TODO: Replace with proper types after Week 1 benchmarking (Story 2.4)
function parseLLMResponse(response: any) {
  return response.choices[0].message.content;
}
```

---

## 16.13 Onboarding New Developers

**First Week Checklist:**
1. [ ] Read this architecture document (all 16 sections)
2. [ ] Read `/lib/auth/README.md` (CRITICAL patterns)
3. [ ] Run `npm install` and `npm run dev` successfully
4. [ ] Make first commit following Conventional Commits format
5. [ ] Submit first PR (even if trivial) to learn review process
6. [ ] Pair program with existing developer on one story
7. [ ] Review 3 PRs to learn what good code looks like in this project

**Training Materials:**
- This architecture document
- PRD (docs/prd.md)
- Front-End Spec (docs/front-end-spec.md)
- `/lib/auth/README.md` (authentication patterns)
- Example PR: [Link to first well-documented PR]

---
