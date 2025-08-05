import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { 
  createCommunityPostTags,
  createCommunityReplyTags,
  JOIN_REQUEST_KIND,
  GROUP_POST_KIND,
  GROUP_POST_REPLY_KIND
} from '@/lib/community';

interface PublishPostParams {
  content: string;
  communityId: string;
}

interface PublishReplyParams {
  content: string;
  communityId: string;
  parentEventId: string;
  parentAuthorPubkey: string;
}

interface JoinCommunityParams {
  message: string;
  communityId: string;
}

/**
 * Hook for community actions (posting, replying, joining)
 */
export function useCommunityActions(communityId: string) {
  const { user } = useCurrentUser();
  const { mutateAsync: createEvent } = useNostrPublish();
  const queryClient = useQueryClient();

  const publishPost = useMutation({
    mutationFn: async ({ content, communityId }: PublishPostParams) => {
      if (!user) {
        throw new Error('User must be logged in to post');
      }

      const tags = createCommunityPostTags(communityId);

      return await createEvent({
        kind: GROUP_POST_KIND,
        content,
        tags,
      });
    },
    onSuccess: () => {
      // Invalidate community posts to refresh the feed
      queryClient.invalidateQueries({ 
        queryKey: ['community-posts', communityId] 
      });
    },
  });

  const publishReply = useMutation({
    mutationFn: async ({ 
      content, 
      communityId, 
      parentEventId, 
      parentAuthorPubkey 
    }: PublishReplyParams) => {
      if (!user) {
        throw new Error('User must be logged in to reply');
      }

      const tags = createCommunityReplyTags(
        communityId,
        parentEventId,
        parentAuthorPubkey
      );

      return await createEvent({
        kind: GROUP_POST_REPLY_KIND,
        content,
        tags,
      });
    },
    onSuccess: (_, { parentEventId }) => {
      // Invalidate replies for the specific post
      queryClient.invalidateQueries({ 
        queryKey: ['community-post-replies', parentEventId, communityId] 
      });
      // Also invalidate community posts in case this affects the main feed
      queryClient.invalidateQueries({ 
        queryKey: ['community-posts', communityId] 
      });
    },
  });

  const joinCommunity = useMutation({
    mutationFn: async ({ message, communityId }: JoinCommunityParams) => {
      if (!user) {
        throw new Error('User must be logged in to join community');
      }

      const tags = [
        ['a', communityId],
        ['p', communityId.split(':')[1]], // Community creator pubkey
      ];

      return await createEvent({
        kind: JOIN_REQUEST_KIND,
        content: message,
        tags,
      });
    },
  });

  return {
    publishPost,
    publishReply,
    joinCommunity,
  };
}