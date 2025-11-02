import Link from 'next/link';
import { PrivacyBadge } from '@/components/features/privacy/PrivacyBadge';

/**
 * Home page / Landing page for the TowerOfBabel application.
 * Server Component by default.
 *
 * Provides call-to-action to sign in and start using the cultural interpretation tool.
 */
export default function Home(): JSX.Element {
  const providerName = process.env.NEXT_PUBLIC_LLM_PROVIDER_NAME || 'OpenAI';
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto">
        <h1 className="text-5xl font-bold mb-6 text-gray-900 dark:text-white">
          Welcome to TowerOfBabel
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-4">
          Bridge cultural communication gaps with AI-powered interpretation
        </p>
        <p className="text-lg text-gray-500 dark:text-gray-400 mb-8">
          Understand how your message might be perceived across different cultures.
          Get actionable insights to communicate more effectively.
        </p>

        {/* Call-to-Action Button */}
        <Link
          href="/sign-in"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg text-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
        >
          Get Started
        </Link>

        {/* Secondary Info */}
        <div className="mt-8 text-sm text-gray-500 dark:text-gray-400 space-y-3">
          <p>Start with a free trial • No credit card required</p>
          <div className="flex justify-center">
            <PrivacyBadge variant="landing" providerName={providerName} />
          </div>
        </div>
      </div>

      {/* Feature Highlights */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        <div className="text-center p-6">
          <div className="text-4xl mb-4">🌍</div>
          <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
            Cross-Cultural Insights
          </h3>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            Understand how your message is perceived across 30+ cultures
          </p>
        </div>

        <div className="text-center p-6">
          <div className="text-4xl mb-4">💡</div>
          <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
            AI-Powered Analysis
          </h3>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            Advanced LLM technology analyzes tone, context, and cultural nuances
          </p>
        </div>

        <div className="text-center p-6">
          <div className="text-4xl mb-4">✨</div>
          <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
            Actionable Recommendations
          </h3>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            Get specific suggestions to improve your cross-cultural communication
          </p>
        </div>
      </div>
    </div>
  );
}
