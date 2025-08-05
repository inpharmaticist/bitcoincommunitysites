import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { NostrEvent } from '@nostrify/nostrify';
import { useEffect, useMemo } from 'react';
import { siteConfig } from '@/lib/config';

export interface Notification {
  id: string;
  type: 'reaction' | 'reply';
  event: NostrEvent;
  targetEvent: NostrEvent | null;
  timestamp: number;
  read: boolean;
  author: string; // pubkey of the person who reacted/replied
}

/**
 * Extract community ID from a post event
 */
function extractCommunityIdFromPost(event: NostrEvent): string | null {
  const communityTag = event.tags.find(([name]) => name === 'a');
  return communityTag?.[1] || null;
}

/**
 * Hook to fetch notifications for the current user
 */
export function useNotifications() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const [readNotifications, setReadNotifications] = useLocalStorage<string[]>('read-notifications', []);

  const query = useQuery({
    queryKey: ['notifications', user?.pubkey],
    queryFn: async (c) => {
      if (!user || !siteConfig.communityId) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      try {
        // Get reactions and replies to user's content from the community
        const [reactions, replies] = await Promise.all([
          // Get reactions to user's posts
          nostr.query([{
            kinds: [7], // Reaction events
            '#p': [user.pubkey], // Reactions mentioning the user
            '#a': [siteConfig.communityId], // Filter for community posts
            limit: 100,
          }], { signal }),

          // Get replies to user's posts
          nostr.query([{
            kinds: [1, 1111], // Text notes and comments
            '#p': [user.pubkey], // Replies mentioning the user
            '#a': [siteConfig.communityId], // Filter for community posts
            limit: 100,
          }], { signal }),
        ]);

        // Filter out user's own reactions/replies
        const filteredReactions = reactions.filter(event => event.pubkey !== user.pubkey);
        const filteredReplies = replies.filter(event => event.pubkey !== user.pubkey);

        // Get the target events for reactions and replies
        const targetEventIds = new Set<string>();

        // Collect event IDs from reactions
        filteredReactions.forEach(reaction => {
          const eTag = reaction.tags.find(([name]) => name === 'e')?.[1];
          if (eTag) targetEventIds.add(eTag);
        });

        // Collect event IDs from replies
        filteredReplies.forEach(reply => {
          const eTags = reply.tags.filter(([name]) => name === 'e');
          eTags.forEach(([, eventId]) => {
            if (eventId) targetEventIds.add(eventId);
          });
        });

        // Fetch target events
        const targetEvents = targetEventIds.size > 0
          ? await nostr.query([{
              ids: Array.from(targetEventIds),
              limit: targetEventIds.size,
            }], { signal })
          : [];

        const targetEventMap = new Map(targetEvents.map(event => [event.id, event]));

        // Create notification objects
        const notifications: Notification[] = [];

        // Process reactions
        filteredReactions.forEach(reaction => {
          const eTag = reaction.tags.find(([name]) => name === 'e')?.[1];
          const targetEvent = eTag ? targetEventMap.get(eTag) : null;

          // Only include reactions to user's own content from the community
          if (targetEvent && targetEvent.pubkey === user.pubkey) {
            const communityId = extractCommunityIdFromPost(targetEvent);
            if (communityId === siteConfig.communityId) {
              notifications.push({
                id: reaction.id,
                type: 'reaction',
                event: reaction,
                targetEvent,
                timestamp: reaction.created_at * 1000,
                read: readNotifications.includes(reaction.id),
                author: reaction.pubkey,
              });
            }
          }
        });

        // Process replies
        filteredReplies.forEach(reply => {
          const eTags = reply.tags.filter(([name]) => name === 'e');
          const lastETag = eTags[eTags.length - 1]; // Last e-tag is usually the direct parent
          const targetEvent = lastETag ? targetEventMap.get(lastETag[1]) : null;

          // Only include replies to user's own content from the community
          if (targetEvent && targetEvent.pubkey === user.pubkey) {
            const communityId = extractCommunityIdFromPost(targetEvent);
            if (communityId === siteConfig.communityId) {
              notifications.push({
                id: reply.id,
                type: 'reply',
                event: reply,
                targetEvent,
                timestamp: reply.created_at * 1000,
                read: readNotifications.includes(reply.id),
                author: reply.pubkey,
              });
            }
          }
        });

        // Sort by timestamp (newest first)
        notifications.sort((a, b) => b.timestamp - a.timestamp);

        return notifications;
      } catch (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
    enabled: !!user && !!siteConfig.communityId,
  });

  // Mark notifications as read
  const markAsRead = (notificationIds: string[]) => {
    const newReadNotifications = [...readNotifications, ...notificationIds];
    setReadNotifications(newReadNotifications);
  };

  // Mark all notifications as read
  const markAllAsRead = () => {
    if (query.data) {
      const allIds = query.data.map(n => n.id);
      setReadNotifications([...readNotifications, ...allIds]);
    }
  };

  // Get unread count
  const unreadCount = useMemo(() => {
    return query.data?.filter(n => !n.read).length || 0;
  }, [query.data]);

  return {
    ...query,
    notifications: query.data || [],
    unreadCount,
    markAsRead,
    markAllAsRead,
  };
}

/**
 * Hook to get real-time notification updates
 */
export function useNotificationUpdates() {
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    // Set up a timer to periodically refresh notifications
    const interval = setInterval(() => {
      queryClient.invalidateQueries({
        queryKey: ['notifications', user.pubkey]
      });
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [user, queryClient]);
}