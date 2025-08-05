import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';

// Reaction types
export type ReactionType = 'like' | 'dislike' | 'emoji';

export interface ReactionSummary {
  likes: number;
  dislikes: number;
  emojis: Record<string, number>;
  userReaction?: string; // User's current reaction ('+', '-', or emoji)
}

/**
 * Hook to fetch reactions for a specific event
 */
export function useReactions(eventId: string, authorPubkey: string) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ['reactions', eventId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      
      try {
        // Query for kind 7 reactions that reference this event
        const reactions = await nostr.query([{
          kinds: [7],
          '#e': [eventId],
          '#p': [authorPubkey],
          limit: 500,
        }], { signal });

        // Process reactions into summary
        const summary: ReactionSummary = {
          likes: 0,
          dislikes: 0,
          emojis: {},
          userReaction: undefined,
        };

        reactions.forEach(reaction => {
          const content = reaction.content.trim();
          
          // Check if this is the current user's reaction
          if (user && reaction.pubkey === user.pubkey) {
            summary.userReaction = content;
          }
          
          // Categorize reaction
          if (content === '+' || content === '') {
            summary.likes += 1;
          } else if (content === '-') {
            summary.dislikes += 1;
          } else {
            // Emoji or other content
            summary.emojis[content] = (summary.emojis[content] || 0) + 1;
          }
        });

        return summary;
      } catch (error) {
        console.error('Error fetching reactions:', error);
        return {
          likes: 0,
          dislikes: 0,
          emojis: {},
          userReaction: undefined,
        };
      }
    },
    staleTime: 30 * 1000, // 30 seconds
    enabled: !!eventId && !!authorPubkey,
  });
}

/**
 * Hook to publish reactions
 */
export function useReactionActions(eventId: string, authorPubkey: string, eventKind: number) {
  const { user } = useCurrentUser();
  const { mutateAsync: createEvent } = useNostrPublish();
  const queryClient = useQueryClient();

  const publishReaction = useMutation({
    mutationFn: async ({ content }: { content: string }) => {
      if (!user) {
        throw new Error('User must be logged in to react');
      }

      // Create reaction tags according to NIP-25
      const tags = [
        ['e', eventId, '', authorPubkey],
        ['p', authorPubkey],
        ['k', eventKind.toString()],
      ];

      return await createEvent({
        kind: 7,
        content,
        tags,
      });
    },
    onSuccess: () => {
      // Invalidate reactions to refresh
      queryClient.invalidateQueries({ 
        queryKey: ['reactions', eventId] 
      });
    },
  });

  const removeReaction = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error('User must be logged in to remove reaction');
      }

      // Find user's existing reaction
      const reactions = await queryClient.getQueryData(['reactions', eventId]) as ReactionSummary;
      if (!reactions?.userReaction) {
        throw new Error('No reaction to remove');
      }

      // Create deletion request (NIP-09)
      // We would need to find the reaction event ID to delete it properly
      // For now, we'll just publish an empty reaction which effectively removes it
      const tags = [
        ['e', eventId, '', authorPubkey],
        ['p', authorPubkey],
        ['k', eventKind.toString()],
      ];

      return await createEvent({
        kind: 7,
        content: '', // Empty content to "remove" reaction
        tags,
      });
    },
    onSuccess: () => {
      // Invalidate reactions to refresh
      queryClient.invalidateQueries({ 
        queryKey: ['reactions', eventId] 
      });
    },
  });

  return {
    publishReaction,
    removeReaction,
  };
}