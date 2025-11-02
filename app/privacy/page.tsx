import React from 'react';
import Link from 'next/link';
import { PrivacyIcon } from '@/components/features/privacy/PrivacyIcon';
import { ProviderInfo } from '@/components/features/privacy/ProviderInfo';

export const metadata = {
  title: 'Privacy Policy | TowerOfBabel',
  description:
    'Learn how TowerOfBabel protects your privacy and which AI providers process your messages.',
};

/**
 * Privacy policy page - explains data handling and LLM provider details.
 * Server Component (static content, no interactivity needed).
 *
 * Displays:
 * - Clear statement that TowerOfBabel does not store message content
 * - Current AI provider information (name, privacy policy, data retention)
 * - What metadata we store vs. what we don't store
 * - User control and consent information
 *
 * @see docs/stories/5.1.story.md
 */
export default function PrivacyPage(): React.JSX.Element {
  // Provider info sourced from environment variables
  const currentProvider = {
    name: process.env.NEXT_PUBLIC_LLM_PROVIDER_NAME || 'OpenAI',
    privacyUrl:
      process.env.NEXT_PUBLIC_LLM_PROVIDER_PRIVACY_URL ||
      'https://openai.com/privacy',
    dataRetentionDays: parseInt(
      process.env.NEXT_PUBLIC_LLM_DATA_RETENTION_DAYS || '30',
      10
    ),
    dataRetentionPolicy:
      process.env.NEXT_PUBLIC_LLM_DATA_RETENTION_POLICY ||
      'OpenAI retains API data for 30 days for abuse monitoring, then permanently deletes it.',
  };

  return (
    <div className="container max-w-4xl py-16 space-y-12">
      {/* Hero Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <PrivacyIcon className="h-8 w-8" />
          <h1 className="text-4xl font-bold">Privacy Policy</h1>
        </div>
        <p className="text-xl text-muted-foreground">
          Your privacy is our priority. Learn how we protect your data.
        </p>
      </section>

      {/* Key Message */}
      <section className="bg-accent/50 border border-accent rounded-lg p-8 space-y-4">
        <h2 className="text-2xl font-semibold">
          We Don&apos;t Store Your Messages
        </h2>
        <p className="text-lg">
          TowerOfBabel does <strong>NOT</strong> store the content of your
          messages. We only save metadata (timestamp, culture pair, character
          count, feedback) to improve our service. Your sensitive communications
          remain private.
        </p>
      </section>

      {/* Provider Disclosure */}
      <section className="space-y-6">
        <h2 className="text-3xl font-bold">AI Provider Information</h2>
        <ProviderInfo provider={currentProvider} />
      </section>

      {/* How We Protect Privacy */}
      <section className="space-y-6">
        <h2 className="text-3xl font-bold">How We Protect Your Privacy</h2>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold">What We Store (Metadata Only)</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>User ID:</strong> Your account identifier (for usage
              tracking)
            </li>
            <li>
              <strong>Timestamp:</strong> When the interpretation was created
            </li>
            <li>
              <strong>Culture Pair:</strong> Sender and receiver cultures (e.g.,
              &quot;American → Japanese&quot;)
            </li>
            <li>
              <strong>Character Count:</strong> Length of analyzed message (for
              analytics)
            </li>
            <li>
              <strong>Feedback:</strong> Your thumbs up/down rating (optional)
            </li>
          </ul>

          <h3 className="text-xl font-semibold">What We DON&apos;T Store</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Message Content:</strong> Your original messages are never
              saved in our database
            </li>
            <li>
              <strong>Interpretation Results:</strong> Cultural insights and
              emotion gauges are not stored
            </li>
            <li>
              <strong>Optimized Messages:</strong> Outbound optimization results
              are not stored
            </li>
          </ul>
        </div>
      </section>

      {/* User Control */}
      <section className="space-y-4">
        <h2 className="text-3xl font-bold">Your Control</h2>
        <p className="text-lg">
          You choose whether to use TowerOfBabel knowing the AI provider&apos;s
          privacy terms. If you&apos;re uncomfortable with {currentProvider.name}
          &apos;s data retention policy, you can choose not to use the service
          for highly sensitive communications.
        </p>
        <p className="text-lg">
          For data deletion requests, see our{' '}
          <Link href="/privacy#gdpr" className="underline text-primary">
            GDPR compliance section
          </Link>{' '}
          (Story 5.2).
        </p>
      </section>

      {/* Last Updated */}
      <footer className="text-sm text-muted-foreground border-t pt-6">
        <p>
          Last updated:{' '}
          {new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </footer>
    </div>
  );
}
