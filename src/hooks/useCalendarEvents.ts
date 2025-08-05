import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';
import { useOrganizer } from '@/hooks/useOrganizer';

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

export function useCalendarEvents() {
  const { nostr } = useNostr();
  const { pubkey: organizerPubkey } = useOrganizer();

  return useQuery({
    queryKey: ['calendar-events', organizerPubkey],
    queryFn: async (c) => {
      if (!organizerPubkey) throw new Error('No organizer pubkey available');
      
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(1500)]);
      
      // Query for both date-based and time-based calendar events
      const events = await nostr.query([
        {
          kinds: [31922, 31923],
          authors: [organizerPubkey],
          limit: 100,
        }
      ], { signal });

      // Filter and sort events
      const now = Math.floor(Date.now() / 1000);
      
      return events
        .filter(validateCalendarEvent)
        .filter(event => {
          // Filter out past events
          const start = event.tags.find(([name]) => name === 'start')?.[1];
          if (!start) return false;
          
          if (event.kind === 31922) {
            // For date-based events, compare dates
            const eventDate = new Date(start);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return eventDate >= today;
          } else {
            // For time-based events, compare timestamps
            const timestamp = parseInt(start);
            return timestamp >= now;
          }
        })
        .sort((a, b) => {
          // Sort by start date/time
          const aStart = a.tags.find(([name]) => name === 'start')?.[1] || '';
          const bStart = b.tags.find(([name]) => name === 'start')?.[1] || '';
          
          if (a.kind === 31922 && b.kind === 31922) {
            return aStart.localeCompare(bStart);
          } else if (a.kind === 31923 && b.kind === 31923) {
            return parseInt(aStart) - parseInt(bStart);
          } else {
            // Mixed kinds - convert date to timestamp for comparison
            const aTime = a.kind === 31922 ? new Date(aStart).getTime() / 1000 : parseInt(aStart);
            const bTime = b.kind === 31922 ? new Date(bStart).getTime() / 1000 : parseInt(bStart);
            return aTime - bTime;
          }
        });
    },
    enabled: !!organizerPubkey,
  });
}