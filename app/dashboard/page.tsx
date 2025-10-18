/**
 * Dashboard page (placeholder for Story 1.4).
 *
 * CRITICAL: This page will be protected by middleware (Task 6).
 * Only authenticated users can access this route.
 *
 * Server Component by default.
 * Future stories will add:
 * - User tier display
 * - Usage statistics
 * - Interpretation history
 * - Quick interpretation form
 */
export default function DashboardPage(): JSX.Element {
  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <p className="text-gray-600 dark:text-gray-300">
          Welcome to TowerOfBabel! You are now authenticated.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
          Dashboard functionality will be added in later stories.
        </p>
      </div>
    </div>
  );
}
