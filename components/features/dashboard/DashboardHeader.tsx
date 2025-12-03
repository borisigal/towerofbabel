/**
 * Dashboard Header Component
 *
 * Displays personalized welcome message for authenticated users.
 * Falls back to email if user name is not available.
 *
 * Server Component - No client-side interactivity needed.
 * Responsive design with smaller text on mobile devices.
 *
 * @example
 * ```tsx
 * <DashboardHeader name="Sarah Johnson" email="sarah@example.com" />
 * // Displays: "Welcome, Sarah Johnson"
 *
 * <DashboardHeader email="user@example.com" />
 * // Displays: "Welcome, user@example.com"
 * ```
 */

interface DashboardHeaderProps {
  /** User's display name (optional) */
  name?: string | null;
  /** User's email address (fallback if no name) */
  email: string;
}

/**
 * DashboardHeader component renders personalized welcome message
 * @param {DashboardHeaderProps} props - Component props
 * @returns {JSX.Element} Dashboard header element
 */
export function DashboardHeader({ name, email }: DashboardHeaderProps): JSX.Element {
  const displayName = name || email;

  return (
    <div className="mb-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-white">
        Welcome, {displayName}
      </h1>
    </div>
  );
}
