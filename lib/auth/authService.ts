import { User } from '@supabase/supabase-js';
import { findUserById, createUser } from '@/lib/db/repositories/userRepository';
import { log } from '@/lib/observability/logger';

/**
 * Gets existing user from database or creates new user on first sign-in.
 *
 * CRITICAL: User ID from Supabase auth.users.id matches database users.id.
 * This enables RLS policies to work correctly.
 *
 * Pattern Explanation:
 * - Supabase Auth creates user in auth.users table with UUID
 * - We create matching record in public.users table with SAME UUID
 * - RLS policies use auth.uid() = users.id to enforce row-level security
 *
 * Default Values:
 * - tier: "trial" (14-day trial, 10 messages)
 * - messages_used_count: 0
 * - is_admin: false (set via database default)
 *
 * @param authUser - Supabase authenticated user from auth.getUser()
 * @returns Database user record (existing or newly created)
 *
 * @example
 * ```typescript
 * // In auth callback route
 * const { data: { user } } = await supabase.auth.getUser();
 * if (user) {
 *   const dbUser = await getOrCreateUser(user);
 *   console.log('User tier:', dbUser.tier);
 * }
 * ```
 */
export async function getOrCreateUser(
  authUser: User
): Promise<Awaited<ReturnType<typeof createUser>> | NonNullable<Awaited<ReturnType<typeof findUserById>>>> {
  // Check if user exists in database
  const existingUser = await findUserById(authUser.id);

  if (!existingUser) {
    // First sign-in: create user record with trial tier
    const newUser = await createUser({
      id: authUser.id, // CRITICAL: Use Supabase auth user ID
      email: authUser.email!,
      name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || null,
    });

    log.info('New user created', {
      email: newUser.email,
      tier: newUser.tier,
      userId: newUser.id
    });
    return newUser;
  }

  log.info('Existing user signed in', {
    email: existingUser.email,
    tier: existingUser.tier,
    userId: existingUser.id
  });
  return existingUser;
}
