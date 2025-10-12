# 6. Components

## Component Architecture Overview

TowerOfBabel follows a **layered component architecture** with clear separation of concerns:

**Frontend Layers:**
1. **Presentation Components** - UI components (React)
2. **Feature Components** - Business logic containers
3. **Services Layer** - API client, state management
4. **UI Primitives** - shadcn/ui base components

**Backend Layers:**
1. **API Routes** - Request handlers (Next.js API routes)
2. **Service Layer** - Business logic (LLM, usage, pricing)
3. **Repository Layer** - Database access (Prisma)
4. **External Integration Layer** - LLM, Stripe, Supabase Auth

---

## Component 1: Authentication Service

**Responsibility:** Handle user authentication, session management, and authorization via Supabase Auth.

**Key Interfaces:**
- `signInWithMagicLink(email: string)` - Send magic link email
- `signInWithGoogle()` - Initiate Google OAuth flow
- `signOut()` - Terminate session
- `getUser()` - Get current authenticated user
- `requireAuth(request)` - Middleware to protect routes

**Implementation Location:**
```
/lib/auth/
  ├── supabaseClient.ts       # Supabase client initialization
  ├── authService.ts           # Auth operations
  ├── middleware.ts            # requireAuth middleware
  └── README.md                # CRITICAL: Auth pattern documentation

/app/(auth)/
  ├── signin/page.tsx          # Sign-in page
  └── callback/route.ts        # OAuth callback handler
```

**Critical Pattern (JWT Session Delay Mitigation):**
```typescript
// ALWAYS use database as source of truth for tier/usage
const { data: { user } } = await supabase.auth.getUser(); // Authentication only
const userRecord = await prisma.user.findUnique({ where: { id: user.id } }); // Authorization
```

---

## Component 2: LLM Provider Service

**Responsibility:** Abstract LLM provider APIs (OpenAI, Anthropic, xAI, Google) with unified interface, retry logic, cost tracking.

**Key Interfaces:**
- `interpretMessage(message, cultures, mode): Promise<InterpretationResult>`
- `estimateCost(message): number`
- `getProviderInfo(): { name, model, dataRetention }`

**Implementation Location:**
```
/lib/llm/
  ├── types.ts                 # LLMProvider interface
  ├── providers/
  │   ├── openai.ts
  │   ├── anthropic.ts
  │   ├── xai.ts               # NEW: Grok provider
  │   └── google.ts
  ├── factory.ts               # Provider selection
  ├── prompts.ts               # Prompt templates
  ├── retryLogic.ts            # Exponential backoff
  └── costCircuitBreaker.ts    # CRITICAL: Cost protection
```

**Adapter Pattern:**
```typescript
export interface LLMProvider {
  name: string;
  model: string;
  interpret(...): Promise<InterpretationResult>;
  estimateCost(characterCount: number): number;
}

export function createLLMProvider(): LLMProvider {
  const provider = process.env.LLM_PROVIDER || 'openai';
  switch (provider) {
    case 'openai': return new OpenAIProvider();
    case 'anthropic': return new AnthropicProvider();
    case 'xai': return new XAIProvider(); // Grok
    case 'google': return new GoogleProvider();
  }
}
```

---

## Component 3: Cost Circuit Breaker (CRITICAL)

**Responsibility:** Prevent runaway LLM costs via 3-layer protection (daily/hourly/per-user limits).

**Implementation Location:**
```
/lib/llm/costCircuitBreaker.ts
```

**Key Functions:**
```typescript
export async function checkCostBudget(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  layer?: 'daily' | 'hourly' | 'user';
}>;

export async function trackCost(userId: string, costUsd: number): Promise<void>;
```

**Integration:**
```typescript
// /app/api/interpret/route.ts
const costCheck = await checkCostBudget(user.id);
if (!costCheck.allowed) {
  return NextResponse.json({ error: 'SERVICE_OVERLOADED' }, { status: 503 });
}

const result = await llmProvider.interpret(...);
await trackCost(user.id, result.metadata.costUsd);
```

---

## Component 4: Usage Tracking Service

**Responsibility:** Enforce tier limits, track usage, reset counters.

**Key Interfaces:**
- `checkUsageLimit(userId): Promise<{ allowed, messagesRemaining }>`
- `incrementUsage(userId): Promise<void>`
- `resetUsage(userId): Promise<void>`

**Implementation Location:**
```
/lib/services/
  ├── usageService.ts
  └── pricingService.ts

/lib/db/repositories/
  └── userRepository.ts
```

**Critical Pattern:**
```typescript
// ALWAYS query database for tier/usage
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: { tier: true, messages_used_count: true, trial_start_date: true }
});
// Check limits based on database, NOT JWT
```

---

## Component 5: Stripe Integration Service

**Responsibility:** Payment processing, webhook handling with idempotency.

**Implementation Location:**
```
/lib/stripe/
  ├── stripeClient.ts
  ├── checkoutService.ts
  ├── portalService.ts
  ├── webhookHandlers/
  │   ├── checkoutCompleted.ts
  │   ├── paymentSucceeded.ts
  │   └── subscriptionDeleted.ts
  └── webhookService.ts

/app/api/webhooks/stripe/route.ts
```

**Idempotency Pattern:**
```typescript
// Check StripeEvent table before processing
const existing = await prisma.stripeEvent.findUnique({
  where: { stripe_event_id: event.id }
});
if (existing) return { received: true }; // Already processed

// Process + mark as processed in transaction
await prisma.$transaction(async (tx) => {
  await handleWebhookEvent(event, tx);
  await tx.stripeEvent.create({
    data: { stripe_event_id: event.id, type: event.type, data: event.data }
  });
});
```

---

## Component 6: Interpretation Form (Frontend)

**Implementation Location:**
```
/components/features/interpretation/
  ├── InterpretationForm.tsx
  ├── ModeToggle.tsx
  ├── CultureSelector.tsx
  ├── CharacterCounter.tsx
  ├── ResultsDisplay.tsx
  └── EmotionGauge.tsx

/lib/stores/
  └── usageStore.ts          # Zustand for usage counter
```

**State Management:**
```typescript
// Local state (React Hook Form)
const { register, handleSubmit, watch } = useForm<FormData>();

// Global state (Zustand) - usage counter
const { messagesUsed, decrementUsage } = useUsageStore();

// Optimistic UI update
const handleInterpret = async (data: FormData) => {
  decrementUsage(); // Optimistic
  try {
    const result = await apiClient.interpret(data);
    setResults(result);
  } catch (error) {
    incrementUsage(); // Rollback
  }
};
```

---

## Component Diagram

```mermaid
graph TB
    subgraph "Frontend Components"
        A[Dashboard Page - Server Component]
        B[InterpretationForm - Client Component]
        C[ResultsDisplay - Client Component]
        D[UsageIndicator - Client Component]
    end

    subgraph "API Layer"
        E[/api/interpret]
        F[/api/user]
        G[/api/webhooks/stripe]
    end

    subgraph "Service Layer"
        H[LLM Provider Service]
        I[Cost Circuit Breaker - CRITICAL]
        J[Usage Tracking Service]
        K[Stripe Integration Service]
    end

    subgraph "Data Layer"
        L[Prisma Repositories]
        M[Supabase PostgreSQL]
    end

    subgraph "External Services"
        N[LLM API]
        O[Stripe API]
        P[Supabase Auth]
        Q[Vercel KV - Redis]
    end

    A --> B
    B --> E
    E --> I
    I --> Q
    I --> H
    H --> N
    E --> J
    J --> L
    L --> M
    G --> K
    K --> O
    K --> L

    style I fill:#EF4444
    style J fill:#10B981
    style K fill:#8B5CF6
```

---
