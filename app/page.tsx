/**
 * Home page for the TowerOfBabel application.
 * Server Component by default.
 */
export default function Home(): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <h1 className="text-4xl font-bold mb-4">Welcome to TowerOfBabel</h1>
      <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
        Cultural interpretation tool for cross-cultural communication
      </p>
      <div className="text-sm text-gray-500">
        Project initialization complete. Ready for development.
      </div>
    </div>
  );
}
