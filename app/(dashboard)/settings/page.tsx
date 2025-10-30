import { createClient } from '@/lib/auth/supabaseServer';
import { findUserWithBilling } from '@/lib/db/repositories/userRepository';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { BillingSection } from '@/components/features/settings/BillingSection';
import { SettingsSkeleton } from '@/components/ui/SettingsSkeleton';

/**
 * Account Settings Page
 *
 * Server Component - Fetches user data from database for billing section.
 * Uses database-as-source-of-truth pattern for tier and customer_id.
 *
 * CRITICAL: All user tier and billing data comes from database queries (NOT JWT).
 *
 * @see architecture/16-coding-standards.md#server-components-by-default
 */
export default function SettingsPage(): JSX.Element {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <SettingsContent />
    </Suspense>
  );
}

async function SettingsContent(): Promise<JSX.Element> {
  // 1. AUTHENTICATION
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/sign-in');
  }

  // 2. AUTHORIZATION - Query database for tier and customer_id
  const userRecord = await findUserWithBilling(user.id);

  if (!userRecord) {
    redirect('/sign-in');
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Account Settings</h1>

      {/* Navigation Tabs */}
      <div className="flex gap-4 mb-8 border-b">
        <button className="px-4 py-2 border-b-2 border-primary font-medium">
          Account
        </button>
        <button className="px-4 py-2 text-muted-foreground hover:text-foreground">
          Billing
        </button>
        <button className="px-4 py-2 text-muted-foreground hover:text-foreground">
          Preferences
        </button>
      </div>

      {/* Billing Section */}
      <BillingSection
        tier={userRecord.tier}
        customerId={userRecord.lemonsqueezy_customer_id}
        subscription={userRecord.subscription}
        messagesUsed={userRecord.messages_used_count}
        messagesResetDate={userRecord.messages_reset_date}
      />

      {/* Future sections: Account Info, Preferences, etc. */}
    </div>
  );
}
