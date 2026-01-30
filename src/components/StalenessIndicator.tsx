'use client';

import { useConnectivity } from '@/contexts/ConnectivityContext';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale/de';
import { Clock } from 'lucide-react';

interface StalenessIndicatorProps {
  cachedAt: number | null;
}

/**
 * Shows relative timestamp for cached data when offline.
 * Only renders when device is offline and cachedAt is provided.
 */
export function StalenessIndicator({ cachedAt }: StalenessIndicatorProps) {
  const { isOnline } = useConnectivity();

  // Only show when offline and have a timestamp
  if (isOnline || !cachedAt) {
    return null;
  }

  const relativeTime = formatDistanceToNow(cachedAt, {
    locale: de,
    addSuffix: false,
  });

  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-500">
      <Clock className="h-3 w-3" />
      <span>Zuletzt synchronisiert: vor {relativeTime}</span>
    </div>
  );
}
