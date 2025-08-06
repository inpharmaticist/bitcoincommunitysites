import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';
import { useCurrentUser } from './useCurrentUser';
import type { ReactionSummary } from './useReactions';

export interface OptimisticPost extends NostrEvent {
  isOptimistic?: boolean;
  optimisticId?: string;
}

export interface OptimisticReaction {
  eventId: string;
  content: string;
  isRemoving?: boolean;
}

export interface OptimisticState {
  posts: OptimisticPost[];
  reactions: Map<string, OptimisticReaction>;
  replies: Map<string, OptimisticPost[]>; // parent event id -> replies
}

export function useOptimisticCommunity(communityId: string) {
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  
  const [optimisticState, setOptimisticState] = useState<OptimisticState>({
    posts: [],
    reactions: new Map(),
    replies: new Map(),
  });

  // Add optimistic post
  const addOptimisticPost = useCallback((content: string, kind = 1111) => {
    if (!user) return null;

    const optimisticId = `optimistic-${Date.now()}-${Math.random()}`;
    const optimisticPost: OptimisticPost = {
      id: optimisticId,
      pubkey: user.pubkey,
      created_at: Math.floor(Date.now() / 1000),
      kind,
      content,
      tags: [
        ['h', communityId],
      ],
      sig: 'optimistic',
      isOptimistic: true,
      optimisticId,
    };

    setOptimisticState(prev => ({
      ...prev,
      posts: [optimisticPost, ...prev.posts],
    }));

    return optimisticId;
  }, [user, communityId]);

  // Add optimistic reply
  const addOptimisticReply = useCallback((
    content: string,
    parentEventId: string,
    parentAuthorPubkey: string
  ) => {
    if (!user) return null;

    const optimisticId = `optimistic-reply-${Date.now()}-${Math.random()}`;
    const optimisticReply: OptimisticPost = {
      id: optimisticId,
      pubkey: user.pubkey,
      created_at: Math.floor(Date.now() / 1000),
      kind: 1111,
      content,
      tags: [
        ['h', communityId],
        ['e', parentEventId, '', parentAuthorPubkey, 'reply'],
        ['p', parentAuthorPubkey],
      ],
      sig: 'optimistic',
      isOptimistic: true,
      optimisticId,
    };

    setOptimisticState(prev => {
      const existingReplies = prev.replies.get(parentEventId) || [];
      return {
        ...prev,
        replies: new Map(prev.replies).set(parentEventId, [...existingReplies, optimisticReply]),
      };
    });

    return optimisticId;
  }, [user, communityId]);

  // Add optimistic reaction
  const addOptimisticReaction = useCallback((eventId: string, content: string) => {
    if (!user) return;

    setOptimisticState(prev => ({
      ...prev,
      reactions: new Map(prev.reactions).set(eventId, { eventId, content }),
    }));

    // Update the reactions query cache optimistically
    queryClient.setQueryData(['reactions', eventId], (oldData: ReactionSummary | undefined) => {
      if (!oldData) {
        // Create initial reaction data if none exists
        const newData: ReactionSummary = {
          likes: 0,
          dislikes: 0,
          emojis: {},
        };
        
        // Add new reaction counts
        if (content === '+') {
          newData.likes = 1;
        } else if (content === '-') {
          newData.dislikes = 1;
        } else {
          newData.emojis[content] = 1;
        }
        
        newData.userReaction = content;
        newData.optimisticUserReaction = content;
        
        return newData;
      }
      
      const newData = { ...oldData };
      
      // Remove previous user reaction counts
      if (oldData.userReaction) {
        if (oldData.userReaction === '+') {
          newData.likes = Math.max(0, newData.likes - 1);
        } else if (oldData.userReaction === '-') {
          newData.dislikes = Math.max(0, newData.dislikes - 1);
        } else {
          newData.emojis = { ...newData.emojis };
          newData.emojis[oldData.userReaction] = Math.max(0, (newData.emojis[oldData.userReaction] || 0) - 1);
          if (newData.emojis[oldData.userReaction] === 0) {
            delete newData.emojis[oldData.userReaction];
          }
        }
      }
      
      // Add new reaction counts
      if (content === '+') {
        newData.likes = (newData.likes || 0) + 1;
      } else if (content === '-') {
        newData.dislikes = (newData.dislikes || 0) + 1;
      } else {
        newData.emojis = { ...newData.emojis };
        newData.emojis[content] = (newData.emojis[content] || 0) + 1;
      }
      
      newData.userReaction = content;
      newData.optimisticUserReaction = content;
      
      return newData;
    });
  }, [user, queryClient]);

  // Remove optimistic reaction
  const removeOptimisticReaction = useCallback((eventId: string) => {
    if (!user) return;

    const currentReaction = optimisticState.reactions.get(eventId);
    if (!currentReaction) return;

    setOptimisticState(prev => {
      const newReactions = new Map(prev.reactions);
      newReactions.delete(eventId);
      return {
        ...prev,
        reactions: newReactions,
      };
    });

    // Update the reactions query cache optimistically
    queryClient.setQueryData(['reactions', eventId], (oldData: ReactionSummary | undefined) => {
      if (!oldData || !currentReaction) return oldData;
      
      const newData = { ...oldData };
      
      // Remove reaction counts
      if (currentReaction.content === '+') {
        newData.likes = Math.max(0, newData.likes - 1);
      } else if (currentReaction.content === '-') {
        newData.dislikes = Math.max(0, newData.dislikes - 1);
      } else {
        newData.emojis = { ...newData.emojis };
        newData.emojis[currentReaction.content] = Math.max(0, (newData.emojis[currentReaction.content] || 0) - 1);
        if (newData.emojis[currentReaction.content] === 0) {
          delete newData.emojis[currentReaction.content];
        }
      }
      
      newData.userReaction = undefined;
      newData.optimisticUserReaction = undefined;
      
      return newData;
    });
  }, [user, queryClient, optimisticState.reactions]);

  // Remove optimistic post/reply after successful publish
  const removeOptimisticItem = useCallback((optimisticId: string) => {
    setOptimisticState(prev => {
      // Remove from posts
      const posts = prev.posts.filter(p => p.optimisticId !== optimisticId);
      
      // Remove from replies
      const replies = new Map();
      for (const [parentId, parentReplies] of prev.replies) {
        const filteredReplies = parentReplies.filter(r => r.optimisticId !== optimisticId);
        if (filteredReplies.length > 0) {
          replies.set(parentId, filteredReplies);
        }
      }
      
      return {
        ...prev,
        posts,
        replies,
      };
    });
  }, []);

  // Clear optimistic reaction when server data confirms it
  const clearOptimisticReaction = useCallback((eventId: string, confirmedReaction?: string) => {
    const optimisticReaction = optimisticState.reactions.get(eventId);
    
    if (optimisticReaction && optimisticReaction.content === confirmedReaction) {
      setOptimisticState(prev => {
        const newReactions = new Map(prev.reactions);
        newReactions.delete(eventId);
        return {
          ...prev,
          reactions: newReactions,
        };
      });
      
      // Clear optimistic flag in query cache
      queryClient.setQueryData(['reactions', eventId], (oldData: ReactionSummary | undefined) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          optimisticUserReaction: undefined,
        };
      });
    }
  }, [optimisticState.reactions, queryClient]);

  // Get merged posts (server + optimistic) with deduplication
  const getMergedPosts = useCallback((serverPosts: NostrEvent[] = []) => {
    if (!user || optimisticState.posts.length === 0) {
      return [...optimisticState.posts, ...serverPosts];
    }

    // Check for duplicates based on content and author
    const deduplicatedOptimisticPosts = optimisticState.posts.filter(optimisticPost => {
      // Look for a server post that might be the same as this optimistic post
      const matchingServerPost = serverPosts.find(serverPost => 
        serverPost.pubkey === optimisticPost.pubkey &&
        serverPost.content === optimisticPost.content &&
        // Check if created within reasonable timeframe (optimistic posts use current timestamp)
        Math.abs(serverPost.created_at - optimisticPost.created_at) < 300 // 5 minutes tolerance
      );
      
      // If we found a matching server post, remove the optimistic one
      if (matchingServerPost) {
        // Also clean up the optimistic state
        setTimeout(() => {
          setOptimisticState(prev => ({
            ...prev,
            posts: prev.posts.filter(p => p.optimisticId !== optimisticPost.optimisticId),
          }));
        }, 0);
        return false;
      }
      
      return true;
    });

    return [...deduplicatedOptimisticPosts, ...serverPosts];
  }, [optimisticState.posts, user]);

  // Get merged replies for a post (server + optimistic) with deduplication
  const getMergedReplies = useCallback((parentEventId: string, serverReplies: NostrEvent[] = []) => {
    const optimisticReplies = optimisticState.replies.get(parentEventId) || [];
    
    if (!user || optimisticReplies.length === 0) {
      return [...optimisticReplies, ...serverReplies];
    }

    // Check for duplicates based on content and author
    const deduplicatedOptimisticReplies = optimisticReplies.filter(optimisticReply => {
      // Look for a server reply that might be the same as this optimistic reply
      const matchingServerReply = serverReplies.find(serverReply => 
        serverReply.pubkey === optimisticReply.pubkey &&
        serverReply.content === optimisticReply.content &&
        // Check if created within reasonable timeframe
        Math.abs(serverReply.created_at - optimisticReply.created_at) < 300 // 5 minutes tolerance
      );
      
      // If we found a matching server reply, remove the optimistic one
      if (matchingServerReply) {
        // Also clean up the optimistic state
        setTimeout(() => {
          setOptimisticState(prev => {
            const updatedReplies = new Map(prev.replies);
            const existingReplies = updatedReplies.get(parentEventId) || [];
            const filteredReplies = existingReplies.filter(r => r.optimisticId !== optimisticReply.optimisticId);
            
            if (filteredReplies.length === 0) {
              updatedReplies.delete(parentEventId);
            } else {
              updatedReplies.set(parentEventId, filteredReplies);
            }
            
            return {
              ...prev,
              replies: updatedReplies,
            };
          });
        }, 0);
        return false;
      }
      
      return true;
    });

    return [...deduplicatedOptimisticReplies, ...serverReplies];
  }, [optimisticState.replies, user]);

  return {
    // State
    optimisticState,
    
    // Actions
    addOptimisticPost,
    addOptimisticReply,
    addOptimisticReaction,
    removeOptimisticReaction,
    removeOptimisticItem,
    clearOptimisticReaction,
    
    // Helpers
    getMergedPosts,
    getMergedReplies,
  };
}