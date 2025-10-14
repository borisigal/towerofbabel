# 4. Data Models

## Core Data Models Overview

TowerOfBabel requires 4 primary entities:
1. **User** - Account information, tier, usage tracking
2. **Interpretation** - Metadata for each interpretation (NO message content)
3. **Subscription** - Lemon Squeezy subscription details
4. **LemonSqueezyEvent** - Webhook idempotency tracking

**Critical Design Principle:** **ZERO message content storage** (privacy-first, GDPR-compliant)

---

## Model 1: User

**Purpose:** Stores user account information, authentication details (managed by Supabase Auth), subscription tier, and usage tracking for limit enforcement.

**Key Attributes:**

```typescript
interface User {
  id: string;                    // UUID - Supabase Auth user ID (primary key)
  email: string;                 // Email address (from Supabase Auth)
  name: string | null;           // Display name (optional, from OAuth)
  created_at: Date;              // Account creation timestamp

  // Subscription & Usage
  tier: 'trial' | 'payg' | 'pro'; // Pricing tier (default: 'trial')
  messages_used_count: number;   // Current usage count (resets for Pro users)
  messages_reset_date: Date | null; // Next reset date for Pro tier (monthly billing)
  trial_start_date: Date;        // Trial start (for 14-day expiration check)

  // Lemon Squeezy Integration
  lemonsqueezy_customer_id: string | null; // Lemon Squeezy customer ID (created on first payment)

  // Preferences (optional, future enhancement)
  default_sender_culture: string | null;   // Last used sender culture
  default_receiver_culture: string | null; // Last used receiver culture

  updated_at: Date;              // Last modification timestamp
}
```

**Relationships:**
- `User` → `Interpretation` (one-to-many): A user creates multiple interpretations
- `User` → `Subscription` (one-to-one): A user may have one active subscription
- Supabase Auth `auth.users` table linked via `id` (foreign key relationship)

---

## Model 2: Interpretation

**Purpose:** Stores metadata for each interpretation request. **CRITICAL:** NO message content stored (privacy-first architecture).

**Key Attributes:**

```typescript
interface Interpretation {
  id: string;                     // UUID primary key
  user_id: string;                // Foreign key to User (Supabase Auth user)
  timestamp: Date;                // When interpretation was created

  // Cultural Context (metadata only)
  culture_sender: CultureCode;    // Sender's culture
  culture_receiver: CultureCode;  // Receiver's culture

  // Message Metadata (NOT content)
  character_count: number;        // Length of analyzed message (for analytics)
  interpretation_type: 'inbound' | 'outbound'; // Workflow type

  // Quality & Cost Tracking
  feedback: 'up' | 'down' | null; // User feedback (thumbs up/down, optional)
  feedback_timestamp: Date | null; // When feedback was given
  cost_usd: number | null;        // LLM API cost for this interpretation (for margin tracking)

  // LLM Provider (for analytics/benchmarking)
  llm_provider: 'openai' | 'anthropic' | 'xai' | 'google' | null;
  llm_model: string | null;       // e.g., "gpt-4-turbo", "claude-3-5-sonnet"
  response_time_ms: number | null; // LLM response latency (for performance tracking)
}
```

---

## Model 3: Subscription

**Purpose:** Tracks Lemon Squeezy subscription details for Pro tier users. Enables subscription lifecycle management via webhooks.

**Key Attributes:**

```typescript
interface Subscription {
  id: string;                           // UUID primary key
  user_id: string;                      // Foreign key to User (one-to-one)
  lemonsqueezy_subscription_id: string; // Lemon Squeezy subscription ID
  lemonsqueezy_customer_id: string;     // Lemon Squeezy customer ID (denormalized for convenience)

  status: SubscriptionStatus;           // Current subscription state
  current_period_start: Date;           // Billing period start
  current_period_end: Date;             // Billing period end (triggers usage reset)

  cancel_at_period_end: boolean;        // User scheduled cancellation
  canceled_at: Date | null;             // When cancellation occurred

  created_at: Date;                     // Subscription creation
  updated_at: Date;                     // Last modification (webhook updates)
}
```

---

## Model 4: LemonSqueezyEvent (NEW - Idempotency)

**Purpose:** Track processed Lemon Squeezy webhook events to prevent duplicate processing (replay attack protection).

**Key Attributes:**

```typescript
interface LemonSqueezyEvent {
  id: string;                          // UUID primary key
  lemonsqueezy_event_id: string;       // Lemon Squeezy event ID - UNIQUE
  type: string;                        // Event type (e.g., "subscription_payment_success")
  data: Json;                          // Full event payload (for debugging)
  processed_at: Date;                  // When event was successfully processed
  error: string | null;                // Error message if processing failed
}
```

---

## Prisma Schema

```prisma
// /prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// User model (extends Supabase Auth)
model User {
  id                        String          @id @default(uuid())
  email                     String          @unique
  name                      String?
  created_at                DateTime        @default(now())

  // Subscription & Usage
  tier                      String          @default("trial") // 'trial' | 'payg' | 'pro'
  messages_used_count       Int             @default(0)
  messages_reset_date       DateTime?
  trial_start_date          DateTime        @default(now())

  // Lemon Squeezy Integration
  lemonsqueezy_customer_id  String?         @unique

  // Preferences
  default_sender_culture    String?
  default_receiver_culture  String?

  updated_at                DateTime        @updatedAt

  // Relations
  interpretations           Interpretation[]
  subscription              Subscription?

  @@map("users")
}

// Interpretation metadata (NO message content)
model Interpretation {
  id                   String    @id @default(uuid())
  user_id              String
  timestamp            DateTime  @default(now())

  // Cultural Context
  culture_sender       String    // CultureCode
  culture_receiver     String    // CultureCode

  // Message Metadata
  character_count      Int
  interpretation_type  String    // 'inbound' | 'outbound'

  // Quality & Cost
  feedback             String?   // 'up' | 'down' | null
  feedback_timestamp   DateTime?
  cost_usd             Decimal?  @db.Decimal(10, 4) // e.g., 0.0150 ($0.015)

  // LLM Provider Tracking
  llm_provider         String?   // 'openai' | 'anthropic' | 'xai' | 'google'
  llm_model            String?
  response_time_ms     Int?

  // Relations
  user                 User      @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([user_id])
  @@index([timestamp])
  @@index([culture_sender, culture_receiver]) // For analytics queries
  @@map("interpretations")
}

// Subscription (Lemon Squeezy)
model Subscription {
  id                           String    @id @default(uuid())
  user_id                      String    @unique
  lemonsqueezy_subscription_id String    @unique
  lemonsqueezy_customer_id     String

  status                  String    // SubscriptionStatus
  current_period_start    DateTime
  current_period_end      DateTime

  cancel_at_period_end    Boolean   @default(false)
  canceled_at             DateTime?

  created_at              DateTime  @default(now())
  updated_at              DateTime  @updatedAt

  // Relations
  user                    User      @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([lemonsqueezy_subscription_id])
  @@index([user_id])
  @@map("subscriptions")
}

// Lemon Squeezy webhook event tracking (idempotency)
model LemonSqueezyEvent {
  id                     String    @id @default(uuid())
  lemonsqueezy_event_id  String    @unique
  type                   String
  data                   Json
  processed_at           DateTime  @default(now())
  error                  String?

  @@index([lemonsqueezy_event_id])
  @@map("lemonsqueezy_events")
}
```

---

## Shared TypeScript Types for Frontend/Backend

```typescript
// /lib/types/models.ts (shared between frontend and API routes)

export type CultureCode =
  | 'american' | 'british' | 'german' | 'french' | 'japanese'
  | 'chinese' | 'indian' | 'spanish' | 'italian' | 'dutch'
  | 'korean' | 'brazilian' | 'mexican' | 'australian' | 'canadian';

export const CULTURE_NAMES: Record<CultureCode, string> = {
  american: 'American',
  british: 'British',
  german: 'German',
  french: 'French',
  japanese: 'Japanese',
  chinese: 'Chinese (Mandarin)',
  indian: 'Indian',
  spanish: 'Spanish',
  italian: 'Italian',
  dutch: 'Dutch',
  korean: 'Korean',
  brazilian: 'Brazilian Portuguese',
  mexican: 'Mexican',
  australian: 'Australian',
  canadian: 'Canadian',
};

export type UserTier = 'trial' | 'payg' | 'pro';
export type InterpretationType = 'inbound' | 'outbound';
export type FeedbackType = 'up' | 'down';
export type LLMProvider = 'openai' | 'anthropic' | 'xai' | 'google';
export type SubscriptionStatus =
  | 'active' | 'past_due' | 'canceled' | 'incomplete' | 'trialing' | 'unpaid';

// API Request/Response Types
export interface InterpretationRequest {
  message: string;
  sender_culture: CultureCode;
  receiver_culture: CultureCode;
  mode: InterpretationType;
}

export interface InterpretationResponse {
  success: boolean;
  interpretation?: {
    bottomLine: string;
    culturalContext: string;
    emotions: Emotion[];
    confidence: 'high' | 'medium' | 'low';
    optimizedMessage?: string; // Outbound only
  };
  error?: string;
  messages_remaining?: number; // For trial/Pro users
}

export interface Emotion {
  name: string;
  senderScore: number;    // 0-10
  receiverScore?: number; // 0-10 (undefined if same culture)
  explanation?: string;   // Explanatory subtext
}
```

---
