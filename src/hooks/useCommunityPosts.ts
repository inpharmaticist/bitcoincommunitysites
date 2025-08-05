import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { 
  GROUP_POST_KIND,
  GROUP_POST_REPLY_KIND,
  validateCommunityPost,
  extractCommunityIdFromPost
} from '@/lib/community';

/**
 * Hook to fetch posts from a community
 */
export function useCommunityPosts(
  communityId: string,
  limit: number = 50
) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['community-posts', communityId, limit],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      
      try {
        // Query for community posts per NIP.md lines 344-353
        // Use uppercase 'A' tags for top-level posts as recommended
        const queries = [
          {
            kinds: [GROUP_POST_KIND], // Kind 1111 community posts per NIP.md
            '#A': [communityId], // Root scope filter (uppercase A)
            limit,
          },
          // Also query lowercase 'a' for backward compatibility with existing posts
          {
            kinds: [GROUP_POST_KIND], // Kind 1111 community posts per NIP.md
            '#a': [communityId], // Parent scope filter (lowercase a)
            limit,
          }
        ];

        const eventArrays = await Promise.all(
          queries.map(query => nostr.query([query], { signal }))
        );
        
        // Flatten and deduplicate
        const eventMap = new Map();
        eventArrays.forEach(events => {
          events.forEach(event => {
            eventMap.set(event.id, event);
          });
        });
        
        const events = Array.from(eventMap.values());

        // Filter and validate community posts per NIP.md specification
        const validPosts = events.filter(event => {
          // Validate that the event is properly tagged for the community
          if (!validateCommunityPost(event)) {
            return false;
          }
          
          // Ensure it's for the correct community
          const postCommunityId = extractCommunityIdFromPost(event);
          if (postCommunityId !== communityId) {
            return false;
          }
          
          // Per NIP.md line 353: filter results where the `k` tag value is "34550" (top-level posts)
          const parentKind = event.tags.find(([name]) => name === 'k')?.[1];
          if (parentKind !== '34550') {
            return false; // Only show top-level posts, not replies
          }
          
          // Double-check: exclude replies (events that have 'e' tags referencing other events)
          const hasEventReference = event.tags.some(([name]) => name === 'e');
          return !hasEventReference;
        });

        // Sort by creation time (newest first)
        return validPosts.sort((a, b) => b.created_at - a.created_at);
      } catch (error) {
        console.error('Error fetching community posts:', error);
        return [];
      }
    },
    staleTime: 10 * 1000, // 10 seconds - shorter for more responsive updates
    retry: 2,
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    enabled: !!communityId,
  });
}

/**
 * Hook to fetch replies to a specific community post (including nested replies)
 */
export function useCommunityPostReplies(
  postId: string,
  communityId: string
) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['community-post-replies', postId, communityId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      
      try {
        // Use multiple query strategies to ensure we don't miss any replies
        const queries = [
          // Query 1: Direct replies to this specific post (most important)
          {
            kinds: [1, GROUP_POST_REPLY_KIND],
            '#e': [postId],
            limit: 200,
          },
          // Query 2: All kind 1111 replies that reference the community (lowercase 'a')
          {
            kinds: [GROUP_POST_REPLY_KIND], // kind 1111 (group replies)
            '#a': [communityId],
            limit: 200,
          },
          // Query 3: All kind 1111 replies that reference the community (uppercase 'A')
          {
            kinds: [GROUP_POST_REPLY_KIND], // kind 1111 (group replies)
            '#A': [communityId],
            limit: 200,
          },
          // Query 4: All kind 1 notes that reference the community (lowercase 'a')
          {
            kinds: [1], // kind 1 (notes)
            '#a': [communityId],
            limit: 200,
          },
          // Query 5: All kind 1 notes that reference the community (uppercase 'A')
          {
            kinds: [1], // kind 1 (notes)
            '#A': [communityId],
            limit: 200,
          },
        ];

        const allRepliesArrays = await Promise.all(
          queries.map(query => nostr.query([query], { signal }))
        );
        
        // Flatten and deduplicate
        const allRepliesMap = new Map();
        allRepliesArrays.forEach(replies => {
          replies.forEach(reply => {
            allRepliesMap.set(reply.id, reply);
          });
        });
        
        const allReplies = Array.from(allRepliesMap.values());

        // Filter to get replies in this thread (direct replies + replies to replies)
        const threadReplies = allReplies.filter(event => {
          // Get all 'e' tags
          const eTags = event.tags.filter(([name]) => name === 'e');
          
          // For replies, we need at least one e-tag
          if (eTags.length === 0) {
            return false;
          }
          
          // Check if it references the community (for kind 1111 this should be present)
          // Handle both lowercase 'a' and uppercase 'A' tags
          const hasCommunityRef = event.tags.some(([name, value]) => 
            (name === 'a' || name === 'A') && value === communityId
          );
          
          // For kind 1111, we require community reference
          if (event.kind === GROUP_POST_REPLY_KIND && !hasCommunityRef) {
            return false;
          }

          // Check if this reply is part of the thread
          const isDirectReply = eTags.some(([, eventId]) => eventId === postId);
          
          if (isDirectReply) {
            return true;
          }
          
          // Check if it's a reply to another reply in this thread
          const isNestedReply = eTags.some(([, eventId]) => {
            const parentReply = allReplies.find(reply => reply.id === eventId);
            
            if (!parentReply) {
              return false;
            }
            
            // Check if parent is a direct reply to the main post
            const parentHasDirectReply = parentReply.tags.some(([name, value]) => name === 'e' && value === postId);
            
            if (parentHasDirectReply) {
              return true;
            }
            
            // Recursively check if parent is part of the thread (up to 3 levels deep)
            const checkParentThread = (replyId: string, depth: number = 0): boolean => {
              if (depth > 3) return false; // Prevent infinite recursion
              
              const reply = allReplies.find(r => r.id === replyId);
              if (!reply) return false;
              
              // Check if this reply directly references the main post
              if (reply.tags.some(([name, value]) => name === 'e' && value === postId)) {
                return true;
              }
              
              // Check if this reply references another reply that's part of the thread
              const replyETags = reply.tags.filter(([name]) => name === 'e');
              return replyETags.some(([, parentId]) => checkParentThread(parentId, depth + 1));
            };
            
            return checkParentThread(eventId);
          });

          return isNestedReply;
        });

        // Sort by creation time (oldest first for threaded view)
        return threadReplies.sort((a, b) => a.created_at - b.created_at);
      } catch (error) {
        console.error('Error fetching post replies:', error);
        return [];
      }
    },
    staleTime: 5 * 1000, // 5 seconds - very short for replies to appear quickly
    retry: 2,
    enabled: !!postId && !!communityId, // Only run if we have both IDs
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  });
}