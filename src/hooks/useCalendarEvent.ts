import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';

function validateCalendarEvent(event: NostrEvent): boolean {
  // Check if it's a calendar event kind
  if (![31922, 31923].includes(event.kind)) return false;

  // Check for required tags according to NIP-52
  const d = event.tags.find(([name]) => name === 'd')?.[1];
  const title = event.tags.find(([name]) => name === 'title')?.[1];
  const start = event.tags.find(([name]) => name === 'start')?.[1];

  // All calendar events require 'd', 'title', and 'start' tags
  if (!d || !title || !start) return false;

  // Additional validation for date-based events (kind 31922)
  if (event.kind === 31922) {
    // start tag should be in YYYY-MM-DD format for date-based events
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(start)) return false;
  }

  // Additional validation for time-based events (kind 31923)
  if (event.kind === 31923) {
    // start tag should be a unix timestamp for time-based events
    const timestamp = parseInt(start);
    if (isNaN(timestamp) || timestamp <= 0) return false;
  }

  return true;
}

export function useCalendarEvent(kind: number, pubkey: string, identifier: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['calendar-event', kind, pubkey, identifier],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(1500)]);
      
      const events = await nostr.query([
        {
          kinds: [kind],
          authors: [pubkey],
          '#d': [identifier],
          limit: 1,
        }
      ], { signal });

      if (events.length === 0) return null;
      
      const event = events[0];
      return validateCalendarEvent(event) ? event : null;
    },
    enabled: !!(kind && pubkey && identifier),
  });
}