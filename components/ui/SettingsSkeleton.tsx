/**
 * Settings Page Loading Skeleton
 *
 * Displays placeholder UI while user data and subscription info is being fetched.
 * Used in Account Settings page Suspense boundary.
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function SettingsSkeleton(): JSX.Element {
  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      {/* Page Title Skeleton */}
      <div className="h-10 w-64 bg-gray-200 rounded-md animate-pulse mb-8" />

      {/* Navigation Tabs Skeleton */}
      <div className="flex gap-4 mb-8">
        <div className="h-10 w-24 bg-gray-200 rounded-md animate-pulse" />
        <div className="h-10 w-24 bg-gray-200 rounded-md animate-pulse" />
        <div className="h-10 w-32 bg-gray-200 rounded-md animate-pulse" />
      </div>

      {/* Billing Section Skeleton */}
      <Card>
        <CardHeader>
          <div className="h-7 w-32 bg-gray-200 rounded-md animate-pulse mb-2" />
          <div className="h-4 w-64 bg-gray-100 rounded-md animate-pulse" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-6 w-full bg-gray-100 rounded-md animate-pulse" />
          <div className="h-6 w-3/4 bg-gray-100 rounded-md animate-pulse" />
          <div className="h-10 w-40 bg-gray-200 rounded-md animate-pulse mt-4" />
        </CardContent>
      </Card>
    </div>
  );
}
