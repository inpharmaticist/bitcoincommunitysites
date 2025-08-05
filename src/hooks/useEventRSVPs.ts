import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';

interface EventRSVP {
  event: NostrEvent;
  status: 'accepted' | 'declined' | 'tentative';
  fb?: 'free' | 'busy';
  author: string;
  note?: string;
}

function validateRSVP(event: NostrEvent): boolean {
  if (event.kind !== 31925) return false;
  
  const aTag = event.tags.find(([name]) => name === 'a')?.[1];
  const dTag = event.tags.find(([name]) => name === 'd')?.[1];
  const statusTag = event.tags.find(([name]) => name === 'status')?.[1];
  
  return !!(aTag && dTag && statusTag && ['accepted', 'declined', 'tentative'].includes(statusTag));
}

export function useEventRSVPs(eventCoordinates: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['event-rsvps', eventCoordinates],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(1500)]);
      
      // Query for RSVP events (kind 31925) that reference this event
      const events = await nostr.query([
        {
          kinds: [31925],
          '#a': [eventCoordinates],
          limit: 500,
        }
      ], { signal });

      // Filter and transform RSVPs
      const rsvps: EventRSVP[] = events
        .filter(validateRSVP)
        .map(event => {
          const status = event.tags.find(([name]) => name === 'status')?.[1] as 'accepted' | 'declined' | 'tentative';
          const fb = event.tags.find(([name]) => name === 'fb')?.[1] as 'free' | 'busy' | undefined;
          
          return {
            event,
            status,
            fb,
            author: event.pubkey,
            note: event.content || undefined,
          };
        });

      return rsvps;
    },
    enabled: !!eventCoordinates,
  });
}