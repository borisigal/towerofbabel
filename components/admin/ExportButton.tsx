/**
 * ExportButton Component
 *
 * Button to download CSV export of feedback data.
 * Calls GET /api/admin/feedback/export with current date range.
 *
 * Features:
 * - Loading state during download
 * - Disabled state during loading
 * - Error handling with toast notification
 * - Download icon
 *
 * @see docs/stories/4.5.story.md
 */

'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { log } from '@/lib/observability/logger';

/**
 * ExportButton Component
 *
 * Downloads CSV file with feedback metadata for selected date range.
 * Shows loading spinner during download.
 */
export function ExportButton(): JSX.Element {
  const [isExporting, setIsExporting] = useState(false);
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // Get current range from URL params (default to '30d')
  const currentRange = searchParams.get('range') || '30d';

  /**
   * Handle export button click
   * Fetches CSV from API and triggers browser download
   */
  const handleExport = async (): Promise<void> => {
    setIsExporting(true);

    try {
      log.info('Starting feedback export', { dateRange: currentRange });

      // Call export API
      const response = await fetch(
        `/api/admin/feedback/export?range=${currentRange}`
      );

      if (!response.ok) {
        // Handle error response
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Export failed');
      }

      // Get CSV content from response
      const csvContent = await response.text();

      // Create blob and download link
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Set filename from Content-Disposition header or generate one
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename =
        filenameMatch?.[1] ||
        `feedback-export-${currentRange}-${new Date().toISOString().split('T')[0]}.csv`;

      link.download = filename;

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up blob URL
      window.URL.revokeObjectURL(url);

      log.info('Feedback export successful', {
        dateRange: currentRange,
        filename,
      });

      toast({
        title: 'Export successful',
        description: `Downloaded ${filename}`,
      });
    } catch (error) {
      log.error('Feedback export failed', {
        dateRange: currentRange,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      toast({
        title: 'Export failed',
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={isExporting}
      variant="outline"
      className="gap-2"
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {isExporting ? 'Exporting...' : 'Export CSV'}
    </Button>
  );
}
