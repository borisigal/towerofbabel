import React from 'react';

interface ProviderInfoProps {
  provider: {
    name: string;
    privacyUrl: string;
    dataRetentionDays: number;
    dataRetentionPolicy: string;
  };
}

/**
 * Displays current LLM provider information with privacy policy link.
 * Server Component (static content, no state).
 *
 * Shows provider name, privacy policy URL, and data retention policy
 * on the /privacy page. Helps users understand which AI provider processes
 * their messages and their data handling practices.
 *
 * @param provider - LLM provider information (name, privacy URL, retention policy)
 */
export function ProviderInfo({ provider }: ProviderInfoProps): React.JSX.Element {
  return (
    <div className="border rounded-lg p-6 space-y-4">
      <div className="space-y-2">
        <h3 className="text-xl font-semibold">Current AI Provider</h3>
        <p className="text-2xl font-bold text-primary">{provider.name}</p>
      </div>

      <div className="space-y-2">
        <h4 className="font-semibold">Privacy Policy</h4>
        <a
          href={provider.privacyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline inline-flex items-center gap-1"
        >
          View {provider.name} Privacy Policy →
        </a>
      </div>

      <div className="space-y-2">
        <h4 className="font-semibold">Data Retention Policy</h4>
        <p className="text-muted-foreground">{provider.dataRetentionPolicy}</p>
        {provider.dataRetentionDays > 0 && (
          <p className="text-sm text-muted-foreground">
            After {provider.dataRetentionDays} days, {provider.name} permanently
            deletes your data.
          </p>
        )}
        {provider.dataRetentionDays === 0 && (
          <p className="text-sm text-muted-foreground">
            {provider.name} does not retain your data after processing.
          </p>
        )}
      </div>
    </div>
  );
}
