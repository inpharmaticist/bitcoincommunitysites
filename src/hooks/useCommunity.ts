import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useCurrentUser } from '@/hooks/useCurrentUser';
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

/**
 * Hook for community join request actions
 */
export function useCommunityJoinActions(communityId: string) {
  const { user } = useCurrentUser();
  const { mutateAsync: publishEvent } = useNostrPublish();
  const queryClient = useQueryClient();

  const joinCommunity = useMutation({
    mutationFn: async ({ message }: { message?: string }) => {
      if (!user) throw new Error('User must be logged in to join community');
      
      return await publishEvent({
        kind: 4552, // Join Request kind from Chorus extensions
        content: message || 'I would like to join this community.',
        tags: [
          ['a', communityId],
        ],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['join-requests', communityId] });
    },
  });

  const leaveCommunity = useMutation({
    mutationFn: async ({ message }: { message?: string }) => {
      if (!user) throw new Error('User must be logged in to leave community');
      
      return await publishEvent({
        kind: 4553, // Leave Request kind from Chorus extensions
        content: message || 'I am leaving this community.',
        tags: [
          ['a', communityId],
        ],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['join-requests', communityId] });
      queryClient.invalidateQueries({ queryKey: ['member-lists', communityId] });
    },
  });

  return {
    joinCommunity,
    leaveCommunity,
  };
}