import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';

interface EventReaction {
  event: NostrEvent;
  content: string;
  author: string;
  isLike: boolean;
  isDislike: boolean;
}

function validateReaction(event: NostrEvent): boolean {
  if (event.kind !== 7) return false;
  
  // Must have an 'e' tag or 'a' tag
  const eTag = event.tags.find(([name]) => name === 'e')?.[1];
  const aTag = event.tags.find(([name]) => name === 'a')?.[1];
  
  return !!(eTag || aTag);
}

export function useEventReactions(eventId?: string, eventCoordinates?: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['event-reactions', eventId, eventCoordinates],
    queryFn: async (c) => {
      if (!eventId && !eventCoordinates) throw new Error('Either eventId or eventCoordinates required');
      
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(1500)]);
      
      // Build filter based on what we have
      const filters: { kinds: number[]; '#e'?: string[]; '#a'?: string[]; limit: number }[] = [];
      
      if (eventId) {
        filters.push({
          kinds: [7],
          '#e': [eventId],
          limit: 500,
        });
      }
      
      if (eventCoordinates) {
        filters.push({
          kinds: [7],
          '#a': [eventCoordinates],
          limit: 500,
        });
      }
      
      const events = await nostr.query(filters, { signal });

      // Filter and transform reactions
      const reactions: EventReaction[] = events
        .filter(validateReaction)
        .map(event => {
          const content = event.content || '';
          
          return {
            event,
            content,
            author: event.pubkey,
            isLike: content === '+' || content === '',
            isDislike: content === '-',
          };
        });

      return reactions;
    },
    enabled: !!(eventId || eventCoordinates),
  });
}