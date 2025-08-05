import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { 
  COMMUNITY_DEFINITION_KIND,
  extractCommunityMetadata,
  parseCommunityId
} from '@/lib/community';

/**
 * Hook to fetch community definition and metadata
 */
export function useCommunity(communityId: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['community', communityId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      
      try {
        const { pubkey, identifier } = parseCommunityId(communityId);
        
        const events = await nostr.query([{
          kinds: [COMMUNITY_DEFINITION_KIND],
          authors: [pubkey],
          '#d': [identifier],
          limit: 1,
        }], { signal });

        if (events.length === 0) {
          return null;
        }

        const communityEvent = events[0];
        return extractCommunityMetadata(communityEvent);
      } catch (error) {
        console.error('Error fetching community:', error);
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    enabled: !!communityId,
  });
}