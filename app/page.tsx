import Link from 'next/link';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PrivacyBadge } from '@/components/features/privacy/PrivacyBadge';

/**
 * Home page / Landing page for the TowerOfBabel application.
 * Server Component by default.
 *
 * Provides clear value proposition, benefits list, and call-to-action for users to sign up.
 * Updated for Story 5.5: Final UI Polish with professional hero section and emotion gauge preview.
 */
export default function Home(): JSX.Element {
  const providerName = process.env.NEXT_PUBLIC_LLM_PROVIDER_NAME || 'Anthropic';
  return (
    <div className="container mx-auto px-4">
      {/* Hero Section */}
      <section className="py-20 text-center space-y-8">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
          Understand What People Really Mean Across Cultures
        </h1>

        <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
          AI-powered cultural interpretation that reveals hidden meanings,
          emotions, and communication styles before you hit send.
        </p>

        {/* Benefits List */}
        <ul className="text-lg space-y-3 max-w-2xl mx-auto text-left">
          <li className="flex items-start gap-3">
            <CheckCircle className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
            <span>
              <strong>Decode emotions:</strong> See how your message might be perceived across cultures
            </span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
            <span>
              <strong>Optimize outbound:</strong> Get culturally-adapted suggestions before sending
            </span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
            <span>
              <strong>Privacy-first:</strong> We never store your message content
            </span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
            <span>
              <strong>Instant insights:</strong> Get interpretations in 3-5 seconds
            </span>
          </li>
        </ul>

        {/* CTA Button */}
        <div className="flex flex-col items-center gap-4">
          <Button size="lg" asChild>
            <Link href="/sign-in">Get Started Free</Link>
          </Button>
          <p className="text-sm text-muted-foreground">
            Start with a free trial • No credit card required
          </p>

          {/* Privacy Badge from Story 5.1 */}
          <PrivacyBadge variant="landing" providerName={providerName} />
        </div>
      </section>

      {/* Emotion Gauge Preview Section */}
      <section className="py-16">
        <div className="bg-accent/50 rounded-lg p-8 max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold mb-4 text-center">
            See Emotions Before You Send
          </h2>
          <p className="text-center text-muted-foreground mb-6">
            Our emotion gauges show how your message might land across cultures
          </p>
          {/* Placeholder for emotion gauge screenshot */}
          <div className="rounded-lg border shadow-lg bg-card p-8 text-center">
            <p className="text-muted-foreground text-sm">
              📸 Emotion gauge preview screenshot will be added here
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              (Screenshot to be captured from working interpretation results)
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
