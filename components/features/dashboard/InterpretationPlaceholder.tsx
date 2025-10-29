/**
 * Interpretation Form Placeholder Component
 *
 * Visual placeholder for the interpretation form that will be implemented in Epic 2.
 * Reserves space to prevent layout shift when actual form is added.
 *
 * Server Component - Static placeholder, no interactivity.
 *
 * Dimensions match expected form size:
 * - Textarea: ~200px height
 * - Culture selectors: ~80px
 * - Button: ~50px
 * - Spacing: ~50px
 * - Total: ~380px (matches p-8 padding + content)
 */

/**
 * InterpretationPlaceholder component renders placeholder for interpretation form
 * @returns {JSX.Element} Placeholder element
 */
export function InterpretationPlaceholder(): JSX.Element {
  return (
    <div className="bg-gray-50 dark:bg-gray-900 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center min-h-[380px] flex flex-col items-center justify-center">
      {/* TODO: Epic 2 Story 2.1 - Interpretation form goes here */}
      <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">
        Interpretation tool coming soon (Epic 2)
      </p>
      <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
        Paste messages, select cultures, and get cultural interpretations
      </p>
    </div>
  );
}
