import { useNostr } from '@nostrify/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNostrPublish } from '@/hooks/useNostrPublish';

// Import the same constants and validation functions used by the main feed
import { 
  GROUP_POST_REPLY_KIND,
  validateCommunityPost,
  extractCommunityIdFromPost
} from '@/lib/community';

// Chorus NIP-72 extension event kinds
const COMMUNITY_KINDS = {
  APPROVED_MEMBERS: 34551,
  DECLINED_MEMBERS: 34552,
  BANNED_MEMBERS: 34553,
  PINNED_POSTS: 34554,
  JOIN_REQUEST: 4552,
  LEAVE_REQUEST: 4553,
  POST_REMOVAL: 4551,
  CLOSE_REPORT: 4554,
  POST_APPROVAL: 4550, // NIP-72 standard approval events
  COMMUNITY_POST: GROUP_POST_REPLY_KIND, // Kind 1111 for all community posts per NIP.md
} as const;

export interface JoinRequest {
  id: string;
  pubkey: string;
  created_at: number;
  content: string;
  communityId: string;
}

export interface MemberList {
  approved: string[];
  declined: string[];
  banned: string[];
}

export interface PinnedPost {
  eventId: string;
  pinnedBy: string;
  created_at: number;
}

export interface CommunityPost {
  id: string;
  pubkey: string;
  created_at: number;
  content: string;
  communityId: string;
  isApproved: boolean;
  isRemoved: boolean;
  approvals: string[]; // moderator pubkeys who approved
  removals: string[]; // moderator pubkeys who removed
}

export interface ModerationAction {
  id: string;
  moderatorPubkey: string;
  targetEventId: string;
  targetAuthorPubkey: string;
  action: 'approve' | 'remove';
  reason?: string;
  created_at: number;
}

// Hook to fetch community join requests (filtered against existing member decisions)
export function useJoinRequests(communityId: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['join-requests', communityId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      
      // Fetch join requests and member lists in parallel
      const [joinEvents, memberListEvents] = await Promise.all([
        nostr.query([{
          kinds: [COMMUNITY_KINDS.JOIN_REQUEST],
          '#a': [communityId],
          limit: 100,
        }], { signal }),
        nostr.query([{
          kinds: [
            COMMUNITY_KINDS.APPROVED_MEMBERS,
            COMMUNITY_KINDS.DECLINED_MEMBERS,
            COMMUNITY_KINDS.BANNED_MEMBERS,
          ],
          '#d': [communityId],
          limit: 10,
        }], { signal })
      ]);

      // Build set of users who already have decisions
      const usersWithDecisions = new Set<string>();
      
      memberListEvents.forEach(event => {
        const pubkeys = event.tags
          .filter(([tag]) => tag === 'p')
          .map(([, pubkey]) => pubkey);
        pubkeys.forEach(pubkey => usersWithDecisions.add(pubkey));
      });

      // Filter join requests to only show pending ones (users without existing decisions)
      const pendingRequests = joinEvents.filter(event => 
        !usersWithDecisions.has(event.pubkey)
      );

      return pendingRequests.map((event): JoinRequest => ({
        id: event.id,
        pubkey: event.pubkey,
        created_at: event.created_at,
        content: event.content,
        communityId,
      })).sort((a, b) => b.created_at - a.created_at);
    },
    enabled: !!communityId,
    staleTime: 30000, // 30 seconds
  });
}

// Hook to fetch community member lists
export function useMemberLists(communityId: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['member-lists', communityId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      
      const events = await nostr.query([{
        kinds: [
          COMMUNITY_KINDS.APPROVED_MEMBERS,
          COMMUNITY_KINDS.DECLINED_MEMBERS,
          COMMUNITY_KINDS.BANNED_MEMBERS,
        ],
        '#d': [communityId],
        limit: 10,
      }], { signal });

      const memberList: MemberList = {
        approved: [],
        declined: [],
        banned: [],
      };

      events.forEach(event => {
        const pubkeys = event.tags
          .filter(([tag]) => tag === 'p')
          .map(([, pubkey]) => pubkey);

        switch (event.kind) {
          case COMMUNITY_KINDS.APPROVED_MEMBERS:
            memberList.approved = pubkeys;
            break;
          case COMMUNITY_KINDS.DECLINED_MEMBERS:
            memberList.declined = pubkeys;
            break;
          case COMMUNITY_KINDS.BANNED_MEMBERS:
            memberList.banned = pubkeys;
            break;
        }
      });

      return memberList;
    },
    enabled: !!communityId,
    staleTime: 60000, // 1 minute
  });
}

// Hook to fetch pinned posts
export function usePinnedPosts(communityId: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['pinned-posts', communityId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      
      const events = await nostr.query([{
        kinds: [COMMUNITY_KINDS.PINNED_POSTS],
        '#d': [communityId],
        limit: 1,
      }], { signal });

      if (events.length === 0) return [];

      const pinnedEvent = events[0];
      return pinnedEvent.tags
        .filter(([tag]) => tag === 'e')
        .map(([, eventId]): PinnedPost => ({
          eventId,
          pinnedBy: pinnedEvent.pubkey,
          created_at: pinnedEvent.created_at,
        }));
    },
    enabled: !!communityId,
    staleTime: 60000, // 1 minute
  });
}

// Hook to fetch posts that need moderation
export function useCommunityPosts(communityId: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['community-moderation-posts', communityId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      
      // Fetch community posts, approvals, removals, and member lists
      const [posts, approvals, removals, memberLists] = await Promise.all([
        // Query for community posts per NIP.md specification - same as main feed
        Promise.all([
          nostr.query([{
            kinds: [COMMUNITY_KINDS.COMMUNITY_POST], // Kind 1111 community posts per NIP.md
            '#A': [communityId], // Root scope filter (uppercase A)
            limit: 100,
          }], { signal }),
          // Also query lowercase 'a' for backward compatibility with existing posts
          nostr.query([{
            kinds: [COMMUNITY_KINDS.COMMUNITY_POST], // Kind 1111 community posts per NIP.md
            '#a': [communityId], // Parent scope filter (lowercase a)
            limit: 100,
          }], { signal })
        ]).then(([postsA, postsB]) => {
          // Flatten and deduplicate
          const eventMap = new Map();
          [...postsA, ...postsB].forEach(event => {
            eventMap.set(event.id, event);
          });
          return Array.from(eventMap.values());
        }),
        nostr.query([{
          kinds: [COMMUNITY_KINDS.POST_APPROVAL],
          '#a': [communityId],
          limit: 200,
        }], { signal }),
        nostr.query([{
          kinds: [COMMUNITY_KINDS.POST_REMOVAL],
          '#a': [communityId],
          limit: 100,
        }], { signal }),
        // Fetch member lists for auto-approval logic
        nostr.query([{
          kinds: [COMMUNITY_KINDS.APPROVED_MEMBERS],
          '#d': [communityId],
          limit: 10,
        }], { signal })
      ]);

      // Extract approved members for auto-approval logic
      const approvedMembers = new Set<string>();
      memberLists.forEach(event => {
        const pubkeys = event.tags
          .filter(([tag]) => tag === 'p')
          .map(([, pubkey]) => pubkey);
        pubkeys.forEach(pubkey => approvedMembers.add(pubkey));
      });

      // Create maps for approvals and removals
      const approvalMap = new Map<string, string[]>();
      const removalMap = new Map<string, string[]>();

      approvals.forEach(approval => {
        const eventId = approval.tags.find(([tag]) => tag === 'e')?.[1];
        if (eventId) {
          if (!approvalMap.has(eventId)) approvalMap.set(eventId, []);
          approvalMap.get(eventId)!.push(approval.pubkey);
        }
      });

      removals.forEach(removal => {
        const eventId = removal.tags.find(([tag]) => tag === 'e')?.[1];
        if (eventId) {
          if (!removalMap.has(eventId)) removalMap.set(eventId, []);
          removalMap.get(eventId)!.push(removal.pubkey);
        }
      });

      // Filter community posts and replies that need moderation
      const validPosts = posts.filter(event => {
        // Validate that the event is properly tagged for the community
        if (!validateCommunityPost(event)) {
          return false;
        }
        
        // Ensure it's for the correct community
        const postCommunityId = extractCommunityIdFromPost(event);
        if (postCommunityId !== communityId) {
          return false;
        }
        
        // Include both top-level posts (k="34550") and replies (k="1111")
        // This allows moderators to see all content that might need moderation
        const parentKind = event.tags.find(([name]) => name === 'k')?.[1];
        if (parentKind !== '34550' && parentKind !== '1111') {
          return false;
        }
        
        return true; // Include all valid community posts and replies
      });

      // Only show posts that actually need moderation attention
      return validPosts
        .map((post): CommunityPost => {
          // Auto-approval workflow: posts from approved members are automatically approved
          const isExplicitlyApproved = approvalMap.has(post.id);
          const isAutoApproved = approvedMembers.has(post.pubkey);
          const isApproved = isExplicitlyApproved || isAutoApproved;
          const isRemoved = removalMap.has(post.id);
          
          return {
            id: post.id,
            pubkey: post.pubkey,
            created_at: post.created_at,
            content: post.content,
            communityId,
            isApproved,
            isRemoved,
            approvals: approvalMap.get(post.id) || [],
            removals: removalMap.get(post.id) || [],
          };
        })
        .filter((post) => {
          // Only show posts that need moderation attention:
          // 1. Posts that are not auto-approved (need explicit approval)
          // 2. Posts that have been explicitly removed (for moderation review)
          // 3. Posts that have been explicitly approved (for moderation history)
          
          // Hide auto-approved posts from approved members (they don't need moderation)
          const isAutoApproved = approvedMembers.has(post.pubkey);
          const isExplicitlyModerated = post.approvals.length > 0 || post.removals.length > 0;
          
          // Show if: not auto-approved OR has explicit moderation actions
          return !isAutoApproved || isExplicitlyModerated;
        })
        .sort((a, b) => b.created_at - a.created_at);
    },
    enabled: !!communityId,
    staleTime: 30000, // 30 seconds
  });
}

// Hook to fetch moderation logs
export function useModerationLogs(communityId: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['moderation-logs', communityId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      
      const [approvals, removals] = await Promise.all([
        nostr.query([{
          kinds: [COMMUNITY_KINDS.POST_APPROVAL],
          '#a': [communityId],
          limit: 100,
        }], { signal }),
        nostr.query([{
          kinds: [COMMUNITY_KINDS.POST_REMOVAL],
          '#a': [communityId],
          limit: 100,
        }], { signal })
      ]);

      const actions: ModerationAction[] = [
        ...approvals.map((approval): ModerationAction => ({
          id: approval.id,
          moderatorPubkey: approval.pubkey,
          targetEventId: approval.tags.find(([tag]) => tag === 'e')?.[1] || '',
          targetAuthorPubkey: approval.tags.find(([tag]) => tag === 'p')?.[1] || '',
          action: 'approve',
          created_at: approval.created_at,
        })),
        ...removals.map((removal): ModerationAction => ({
          id: removal.id,
          moderatorPubkey: removal.pubkey,
          targetEventId: removal.tags.find(([tag]) => tag === 'e')?.[1] || '',
          targetAuthorPubkey: removal.tags.find(([tag]) => tag === 'p')?.[1] || '',
          action: 'remove',
          reason: removal.content,
          created_at: removal.created_at,
        }))
      ];

      return actions.sort((a, b) => b.created_at - a.created_at);
    },
    enabled: !!communityId,
    staleTime: 60000, // 1 minute
  });
}

// Hook for community management actions
export function useCommunityActions(communityId: string) {
  const { mutateAsync: publishEvent } = useNostrPublish();
  const queryClient = useQueryClient();

  const approveMember = useMutation({
    mutationFn: async ({ pubkey }: { pubkey: string }) => {
      // First get current member lists
      const currentLists = queryClient.getQueryData<MemberList>(['member-lists', communityId]);
      const currentApproved = currentLists?.approved || [];
      
      // Check if user is already approved
      if (currentApproved.includes(pubkey)) {
        throw new Error('User is already approved');
      }
      
      // Remove from declined/banned lists if present and add to approved
      const currentDeclined = currentLists?.declined || [];
      const currentBanned = currentLists?.banned || [];
      
      const updatedApproved = [...currentApproved, pubkey];
      const updatedDeclined = currentDeclined.filter(pk => pk !== pubkey);
      const updatedBanned = currentBanned.filter(pk => pk !== pubkey);
      
      // Publish all three list updates to ensure consistency
      const approvedEvent = publishEvent({
        kind: COMMUNITY_KINDS.APPROVED_MEMBERS,
        content: '',
        tags: [
          ['d', communityId],
          ...updatedApproved.map(pk => ['p', pk]),
        ],
      });
      
      // Only update declined/banned lists if they changed
      const promises = [approvedEvent];
      
      if (updatedDeclined.length !== currentDeclined.length) {
        promises.push(publishEvent({
          kind: COMMUNITY_KINDS.DECLINED_MEMBERS,
          content: '',
          tags: [
            ['d', communityId],
            ...updatedDeclined.map(pk => ['p', pk]),
          ],
        }));
      }
      
      if (updatedBanned.length !== currentBanned.length) {
        promises.push(publishEvent({
          kind: COMMUNITY_KINDS.BANNED_MEMBERS,
          content: '',
          tags: [
            ['d', communityId],
            ...updatedBanned.map(pk => ['p', pk]),
          ],
        }));
      }
      
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member-lists', communityId] });
      queryClient.invalidateQueries({ queryKey: ['join-requests', communityId] });
    },
  });

  const declineMember = useMutation({
    mutationFn: async ({ pubkey }: { pubkey: string }) => {
      const currentLists = queryClient.getQueryData<MemberList>(['member-lists', communityId]);
      const currentDeclined = currentLists?.declined || [];
      
      // Check if user is already declined
      if (currentDeclined.includes(pubkey)) {
        throw new Error('User is already declined');
      }
      
      // Remove from approved/banned lists if present and add to declined
      const currentApproved = currentLists?.approved || [];
      const currentBanned = currentLists?.banned || [];
      
      const updatedDeclined = [...currentDeclined, pubkey];
      const updatedApproved = currentApproved.filter(pk => pk !== pubkey);
      const updatedBanned = currentBanned.filter(pk => pk !== pubkey);
      
      // Publish all three list updates to ensure consistency
      const declinedEvent = publishEvent({
        kind: COMMUNITY_KINDS.DECLINED_MEMBERS,
        content: '',
        tags: [
          ['d', communityId],
          ...updatedDeclined.map(pk => ['p', pk]),
        ],
      });
      
      const promises = [declinedEvent];
      
      if (updatedApproved.length !== currentApproved.length) {
        promises.push(publishEvent({
          kind: COMMUNITY_KINDS.APPROVED_MEMBERS,
          content: '',
          tags: [
            ['d', communityId],
            ...updatedApproved.map(pk => ['p', pk]),
          ],
        }));
      }
      
      if (updatedBanned.length !== currentBanned.length) {
        promises.push(publishEvent({
          kind: COMMUNITY_KINDS.BANNED_MEMBERS,
          content: '',
          tags: [
            ['d', communityId],
            ...updatedBanned.map(pk => ['p', pk]),
          ],
        }));
      }
      
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member-lists', communityId] });
      queryClient.invalidateQueries({ queryKey: ['join-requests', communityId] });
    },
  });

  const banMember = useMutation({
    mutationFn: async ({ pubkey }: { pubkey: string }) => {
      const currentLists = queryClient.getQueryData<MemberList>(['member-lists', communityId]);
      const currentBanned = currentLists?.banned || [];
      
      // Check if user is already banned
      if (currentBanned.includes(pubkey)) {
        throw new Error('User is already banned');
      }
      
      // Remove from approved/declined lists if present and add to banned
      const currentApproved = currentLists?.approved || [];
      const currentDeclined = currentLists?.declined || [];
      
      const updatedBanned = [...currentBanned, pubkey];
      const updatedApproved = currentApproved.filter(pk => pk !== pubkey);
      const updatedDeclined = currentDeclined.filter(pk => pk !== pubkey);
      
      // Publish all three list updates to ensure consistency
      const bannedEvent = publishEvent({
        kind: COMMUNITY_KINDS.BANNED_MEMBERS,
        content: '',
        tags: [
          ['d', communityId],
          ...updatedBanned.map(pk => ['p', pk]),
        ],
      });
      
      const promises = [bannedEvent];
      
      if (updatedApproved.length !== currentApproved.length) {
        promises.push(publishEvent({
          kind: COMMUNITY_KINDS.APPROVED_MEMBERS,
          content: '',
          tags: [
            ['d', communityId],
            ...updatedApproved.map(pk => ['p', pk]),
          ],
        }));
      }
      
      if (updatedDeclined.length !== currentDeclined.length) {
        promises.push(publishEvent({
          kind: COMMUNITY_KINDS.DECLINED_MEMBERS,
          content: '',
          tags: [
            ['d', communityId],
            ...updatedDeclined.map(pk => ['p', pk]),
          ],
        }));  
      }
      
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member-lists', communityId] });
      queryClient.invalidateQueries({ queryKey: ['join-requests', communityId] });
    },
  });

  const pinPost = useMutation({
    mutationFn: async ({ eventId }: { eventId: string }) => {
      const currentPinned = queryClient.getQueryData<PinnedPost[]>(['pinned-posts', communityId]) || [];
      const currentEventIds = currentPinned.map(p => p.eventId);
      
      if (currentEventIds.includes(eventId)) {
        throw new Error('Post is already pinned');
      }
      
      const updatedEventIds = [...currentEventIds, eventId];
      
      return await publishEvent({
        kind: COMMUNITY_KINDS.PINNED_POSTS,
        content: '',
        tags: [
          ['d', communityId],
          ...updatedEventIds.map(id => ['e', id]),
        ],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pinned-posts', communityId] });
    },
  });

  const unpinPost = useMutation({
    mutationFn: async ({ eventId }: { eventId: string }) => {
      const currentPinned = queryClient.getQueryData<PinnedPost[]>(['pinned-posts', communityId]) || [];
      const currentEventIds = currentPinned.map(p => p.eventId);
      
      const updatedEventIds = currentEventIds.filter(id => id !== eventId);
      
      return await publishEvent({
        kind: COMMUNITY_KINDS.PINNED_POSTS,
        content: '',
        tags: [
          ['d', communityId],
          ...updatedEventIds.map(id => ['e', id]),
        ],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pinned-posts', communityId] });
    },
  });

  const removePost = useMutation({
    mutationFn: async ({ eventId, authorPubkey, reason }: { 
      eventId: string; 
      authorPubkey: string; 
      reason?: string;
    }) => {
      return await publishEvent({
        kind: COMMUNITY_KINDS.POST_REMOVAL,
        content: reason || '',
        tags: [
          ['a', communityId],
          ['e', eventId],
          ['p', authorPubkey],
          ['k', '1111'],
        ],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-posts', communityId] });
      queryClient.invalidateQueries({ queryKey: ['community-moderation-posts', communityId] });
      queryClient.invalidateQueries({ queryKey: ['moderation-logs', communityId] });
    },
  });

  const approvePost = useMutation({
    mutationFn: async ({ eventId, eventContent, authorPubkey }: { 
      eventId: string;
      eventContent: string;
      authorPubkey: string; 
    }) => {
      return await publishEvent({
        kind: COMMUNITY_KINDS.POST_APPROVAL,
        content: eventContent, // Full event JSON for redistribution
        tags: [
          ['a', communityId],
          ['e', eventId],
          ['p', authorPubkey],
          ['k', '1111'],
        ],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-posts', communityId] });
      queryClient.invalidateQueries({ queryKey: ['community-moderation-posts', communityId] });
      queryClient.invalidateQueries({ queryKey: ['moderation-logs', communityId] });
    },
  });

  return {
    approveMember,
    declineMember,
    banMember,
    pinPost,
    unpinPost,
    removePost,
    approvePost,
  };
}