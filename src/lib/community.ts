import type { NostrEvent } from '@nostrify/nostrify';

// NIP-72 Core Event Kinds
export const COMMUNITY_DEFINITION_KIND = 34550;
export const POST_APPROVAL_KIND = 4550;

// NIP-72 Extensions Event Kinds (Chorus)
export const APPROVED_MEMBERS_KIND = 34551;
export const DECLINED_MEMBERS_KIND = 34552;
export const BANNED_MEMBERS_KIND = 34553;
export const PINNED_POSTS_KIND = 34554;
export const PINNED_GROUPS_KIND = 34555;
export const POST_REMOVAL_KIND = 4551;
export const JOIN_REQUEST_KIND = 4552;
export const LEAVE_REQUEST_KIND = 4553;
export const CLOSE_REPORT_KIND = 4554;
// Per NIP.md: "All group discussions in Chorus use Kind 1111 (NIP-22 Comments)"
export const GROUP_POST_KIND = 1111; // Changed from 11 to 1111 per NIP.md
export const GROUP_POST_REPLY_KIND = 1111;

// Community metadata interface
export interface CommunityMetadata {
  id: string;
  name: string;
  description?: string;
  image?: string;
  creator: string;
  moderators: string[];
  relays?: string[];
}

// Parse community ID into components
export function parseCommunityId(communityId: string) {
  const parts = communityId.split(':');
  if (parts.length !== 3 || parts[0] !== '34550') {
    throw new Error('Invalid community ID format');
  }
  
  return {
    kind: parseInt(parts[0]),
    pubkey: parts[1],
    identifier: parts[2],
  };
}

// Create community a-tag
export function createCommunityATag(communityId: string, relay?: string): string[] {
  const tag = ['a', communityId];
  if (relay) {
    tag.push(relay);
  }
  return tag;
}

// Extract community metadata from kind 34550 event
export function extractCommunityMetadata(event: NostrEvent): CommunityMetadata | null {
  if (event.kind !== COMMUNITY_DEFINITION_KIND) {
    return null;
  }

  const dTag = event.tags.find(([name]) => name === 'd')?.[1];
  if (!dTag) {
    return null;
  }

  const communityId = `${event.kind}:${event.pubkey}:${dTag}`;
  const name = event.tags.find(([name]) => name === 'name')?.[1] || dTag;
  const description = event.tags.find(([name]) => name === 'description')?.[1];
  const image = event.tags.find(([name]) => name === 'image')?.[1];
  
  const moderators = event.tags
    .filter(([name, , , role]) => name === 'p' && role === 'moderator')
    .map(([, pubkey]) => pubkey);

  const relays = event.tags
    .filter(([name]) => name === 'relay')
    .map(([, relay]) => relay);

  return {
    id: communityId,
    name,
    description,
    image,
    creator: event.pubkey,
    moderators,
    relays,
  };
}

// Check if user is moderator of community
export function isModerator(userPubkey: string, community: CommunityMetadata): boolean {
  return community.creator === userPubkey || community.moderators.includes(userPubkey);
}

// Get unique moderator count (creator + moderators, but don't double-count)
export function getUniqueModeratorsCount(community: CommunityMetadata): number {
  const uniqueModerators = new Set([community.creator, ...community.moderators]);
  return uniqueModerators.size;
}

// Get list of unique moderators (creator + moderators, but don't double-count)
export function getUniqueModerators(community: CommunityMetadata): string[] {
  const uniqueModerators = new Set([community.creator, ...community.moderators]);
  return Array.from(uniqueModerators);
}

// Check if user is in approved members list
export function isApprovedMember(userPubkey: string, approvedMembersEvent: NostrEvent | null): boolean {
  if (!approvedMembersEvent || approvedMembersEvent.kind !== APPROVED_MEMBERS_KIND) {
    return false;
  }
  
  return approvedMembersEvent.tags.some(([name, pubkey]) => name === 'p' && pubkey === userPubkey);
}

// Check if user is banned
export function isBannedMember(userPubkey: string, bannedMembersEvent: NostrEvent | null): boolean {
  if (!bannedMembersEvent || bannedMembersEvent.kind !== BANNED_MEMBERS_KIND) {
    return false;
  }
  
  return bannedMembersEvent.tags.some(([name, pubkey]) => name === 'p' && pubkey === userPubkey);
}

// Check if post is pinned
export function isPinnedPost(eventId: string, pinnedPostsEvent: NostrEvent | null): boolean {
  if (!pinnedPostsEvent || pinnedPostsEvent.kind !== PINNED_POSTS_KIND) {
    return false;
  }
  
  return pinnedPostsEvent.tags.some(([name, id]) => name === 'e' && id === eventId);
}

// Validate community post event
export function validateCommunityPost(event: NostrEvent): boolean {
  // Check if event has community a-tag (handle both lowercase 'a' and uppercase 'A')
  const communityTag = event.tags.find(([name, value]) => 
    (name === 'a' || name === 'A') && value?.startsWith('34550:')
  );
  
  return !!communityTag;
}

// Validate community reply event (kind 1111 or kind 1 with proper tags)
export function validateCommunityReply(event: NostrEvent): boolean {
  // Must have community a-tag (handle both lowercase 'a' and uppercase 'A')
  const communityTag = event.tags.find(([name, value]) => 
    (name === 'a' || name === 'A') && value?.startsWith('34550:')
  );
  if (!communityTag) return false;
  
  // Must have at least one 'e' tag (indicating it's a reply)
  const eTags = event.tags.filter(([name]) => name === 'e');
  if (eTags.length === 0) return false;
  
  return true;
}

// Extract community ID from post event
export function extractCommunityIdFromPost(event: NostrEvent): string | null {
  const communityTag = event.tags.find(([name, value]) => 
    (name === 'a' || name === 'A') && value?.startsWith('34550:')
  );
  
  return communityTag?.[1] || null;
}

// Create tags for posting to community
export function createCommunityPostTags(communityId: string, _relay?: string): string[][] {
  const tags: string[][] = [];
  
  // Extract community creator pubkey from communityId (format: "34550:pubkey:identifier")
  const communityCreatorPubkey = communityId.split(':')[1];
  
  // NIP-22 compliant tags for top-level community posts per NIP.md lines 254-260
  // Root scope tags (uppercase)
  tags.push(['A', communityId]); // Root scope: the community
  tags.push(['K', '34550']);     // Root kind: community
  tags.push(['P', communityCreatorPubkey]); // Root author: community creator
  
  // Parent scope tags (lowercase) - same as root for top-level posts
  tags.push(['a', communityId]); // Parent scope: same as root
  tags.push(['k', '34550']);     // Parent kind: community  
  tags.push(['p', communityCreatorPubkey]); // Parent author: community creator
  
  return tags;
}

// Create tags for community reply
export function createCommunityReplyTags(
  communityId: string,
  parentEventId: string,
  parentAuthorPubkey: string,
  _relay?: string
): string[][] {
  const tags: string[][] = [];
  
  // Extract community creator pubkey from communityId (format: "34550:pubkey:identifier")
  const communityCreatorPubkey = communityId.split(':')[1];
  
  // NIP-22 compliant tags for community replies per NIP.md lines 283-289
  // Root scope tags (uppercase) - always point to the community
  tags.push(['A', communityId]); // Root scope: the community
  tags.push(['K', '34550']);     // Root kind: community
  tags.push(['P', communityCreatorPubkey]); // Root author: community creator
  
  // Parent event tags (lowercase) - point to the specific comment being replied to
  tags.push(['e', parentEventId]); // Parent event: the comment being replied to
  tags.push(['k', '1111']);       // Parent kind: comment (Kind 1111)
  tags.push(['p', parentAuthorPubkey]); // Parent author: comment author
  
  return tags;
}