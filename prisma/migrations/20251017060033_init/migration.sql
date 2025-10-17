warn The configuration property `package.json#prisma` is deprecated and will be removed in Prisma 7. Please migrate to a Prisma config file (e.g., `prisma.config.ts`).
For more information, see: https://pris.ly/prisma-config

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tier" TEXT NOT NULL DEFAULT 'trial',
    "messages_used_count" INTEGER NOT NULL DEFAULT 0,
    "messages_reset_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lemonsqueezy_customer_id" TEXT,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interpretations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "culture_sender" TEXT NOT NULL,
    "culture_receiver" TEXT NOT NULL,
    "character_count" INTEGER NOT NULL,
    "interpretation_type" TEXT NOT NULL,
    "feedback" TEXT,
    "cost_usd" DECIMAL(10,4) NOT NULL,
    "llm_provider" TEXT NOT NULL,
    "response_time_ms" INTEGER NOT NULL,

    CONSTRAINT "interpretations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "lemonsqueezy_subscription_id" TEXT NOT NULL,
    "lemonsqueezy_customer_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "current_period_end" TIMESTAMP(3),

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lemonsqueezy_events" (
    "id" TEXT NOT NULL,
    "lemonsqueezy_event_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lemonsqueezy_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_lemonsqueezy_customer_id_key" ON "users"("lemonsqueezy_customer_id");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_lemonsqueezy_customer_id_idx" ON "users"("lemonsqueezy_customer_id");

-- CreateIndex
CREATE INDEX "interpretations_user_id_timestamp_idx" ON "interpretations"("user_id", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_user_id_key" ON "subscriptions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_lemonsqueezy_subscription_id_key" ON "subscriptions"("lemonsqueezy_subscription_id");

-- CreateIndex
CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "subscriptions_lemonsqueezy_subscription_id_idx" ON "subscriptions"("lemonsqueezy_subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "lemonsqueezy_events_lemonsqueezy_event_id_key" ON "lemonsqueezy_events"("lemonsqueezy_event_id");

-- CreateIndex
CREATE INDEX "lemonsqueezy_events_lemonsqueezy_event_id_idx" ON "lemonsqueezy_events"("lemonsqueezy_event_id");

-- AddForeignKey
ALTER TABLE "interpretations" ADD CONSTRAINT "interpretations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

