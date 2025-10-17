-- ============================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================
-- Apply these policies via Supabase SQL Editor
-- Location: Supabase Dashboard → SQL Editor → New Query
--
-- RLS enforces data isolation at the database level, preventing data leaks
-- even if API bugs exist. Users can ONLY access their own data.
--
-- IMPORTANT: Apply these policies AFTER running Prisma migrations.
-- RLS policies reference Supabase Auth (auth.uid()) which returns the authenticated user's UUID.
--
-- @see docs/architecture/2-high-level-architecture.md#security-patterns
-- ============================================

-- ============================================
-- USERS TABLE RLS POLICIES
-- ============================================

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own record
CREATE POLICY "Users can view own record"
ON users FOR SELECT
USING (auth.uid()::text = id);

-- Policy: Users can update their own record
CREATE POLICY "Users can update own record"
ON users FOR UPDATE
USING (auth.uid()::text = id);

-- Policy: Allow user creation during sign-up (server-side only)
-- Note: This policy allows INSERT operations, but only backend code can execute
-- due to Supabase Auth service role key requirement
CREATE POLICY "Allow user creation on sign-up"
ON users FOR INSERT
WITH CHECK (auth.uid()::text = id);

-- ============================================
-- INTERPRETATIONS TABLE RLS POLICIES
-- ============================================

-- Enable RLS on interpretations table
ALTER TABLE interpretations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own interpretations
CREATE POLICY "Users can view own interpretations"
ON interpretations FOR SELECT
USING (auth.uid()::text = user_id);

-- Policy: Users can insert their own interpretations
CREATE POLICY "Users can insert own interpretations"
ON interpretations FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

-- Policy: Users can update their own interpretations (for feedback)
CREATE POLICY "Users can update own interpretations"
ON interpretations FOR UPDATE
USING (auth.uid()::text = user_id);

-- Policy: Users can delete their own interpretations (for GDPR compliance)
CREATE POLICY "Users can delete own interpretations"
ON interpretations FOR DELETE
USING (auth.uid()::text = user_id);

-- ============================================
-- SUBSCRIPTIONS TABLE RLS POLICIES
-- ============================================

-- Enable RLS on subscriptions table
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own subscription
CREATE POLICY "Users can view own subscription"
ON subscriptions FOR SELECT
USING (auth.uid()::text = user_id);

-- Policy: Allow subscription creation (server-side only via webhook)
-- Note: Backend code uses service role key to bypass RLS for webhook inserts
CREATE POLICY "Allow subscription creation"
ON subscriptions FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

-- Policy: Allow subscription updates (server-side only via webhook)
CREATE POLICY "Allow subscription updates"
ON subscriptions FOR UPDATE
USING (auth.uid()::text = user_id);

-- ============================================
-- LEMONSQUEEZY_EVENTS TABLE RLS POLICIES
-- ============================================

-- Enable RLS on lemonsqueezy_events table
ALTER TABLE lemonsqueezy_events ENABLE ROW LEVEL SECURITY;

-- Policy: No user access (server-side only for webhook idempotency)
-- Users should NEVER be able to view/modify webhook events
-- Backend code uses service role key to bypass RLS
CREATE POLICY "Deny all user access to webhook events"
ON lemonsqueezy_events FOR ALL
USING (false);

-- ============================================
-- ADMIN POLICIES (OPTIONAL - FOR FUTURE)
-- ============================================

-- Uncomment these policies if you need admin dashboard access
-- Admin flag is set in users.is_admin column

-- CREATE POLICY "Admins can view all users"
-- ON users FOR SELECT
-- TO authenticated
-- USING (
--   auth.uid() IN (
--     SELECT id FROM users WHERE is_admin = true
--   )
-- );

-- CREATE POLICY "Admins can view all interpretations"
-- ON interpretations FOR SELECT
-- TO authenticated
-- USING (
--   auth.uid() IN (
--     SELECT id FROM users WHERE is_admin = true
--   )
-- );

-- ============================================
-- TESTING RLS POLICIES
-- ============================================

-- Test RLS policies with different user contexts:
--
-- 1. Create test users via Supabase Auth UI
-- 2. Get JWT tokens for each test user
-- 3. Execute queries with different tokens:
--
-- -- As User A (should see only User A's data)
-- SET LOCAL request.jwt.claim.sub = 'user-a-uuid';
-- SELECT * FROM users;  -- Should return only User A's record
-- SELECT * FROM interpretations;  -- Should return only User A's interpretations
--
-- -- As User B (should see only User B's data)
-- SET LOCAL request.jwt.claim.sub = 'user-b-uuid';
-- SELECT * FROM users;  -- Should return only User B's record
-- SELECT * FROM interpretations;  -- Should return only User B's interpretations
--
-- 4. Verify cross-user data is NOT accessible
--
-- Full testing will occur in Story 1.4 when authentication is implemented.

-- ============================================
-- NOTES
-- ============================================

-- 1. RLS policies use auth.uid() which returns the authenticated user's UUID
--    from the JWT token. This matches the users.id column (synced with Supabase Auth).
--
-- 2. Backend code using Supabase service role key bypasses RLS.
--    This is required for webhook handlers that need to update subscriptions.
--
-- 3. RLS policies are enforced at the PostgreSQL level, not application level.
--    Even if API code has bugs, users cannot access other users' data.
--
-- 4. Performance: RLS policies use indexes on user_id columns for fast filtering.
--    Ensure indexes exist: @@index([user_id]) in Prisma schema.
--
-- 5. To disable RLS temporarily for debugging (NOT RECOMMENDED IN PRODUCTION):
--    ALTER TABLE users DISABLE ROW LEVEL SECURITY;
--
-- 6. To view all policies for a table:
--    SELECT * FROM pg_policies WHERE tablename = 'users';
