import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare } from 'lucide-react';
import { useCommunityPosts } from '@/hooks/useCommunityPosts';
import { useCommunityPosts as useModerationPosts, usePinnedPosts, useMemberLists } from '@/hooks/useCommunityManagement';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCommunity } from '@/hooks/useCommunity';
import { isModerator } from '@/lib/community';
import { CommunityPost } from './CommunityPost';
import { RelaySelector } from '@/components/RelaySelector';

interface CommunityFeedProps {
  communityId: string;
}

export function CommunityFeed({ communityId }: CommunityFeedProps) {
  const { user } = useCurrentUser();
  const { data: community } = useCommunity(communityId);
  const { data: posts, isLoading, error } = useCommunityPosts(communityId, 30);
  const { data: moderationPosts } = useModerationPosts(communityId);
  const { data: pinnedPosts } = usePinnedPosts(communityId);
  const { data: memberLists } = useMemberLists(communityId);
  
  // Check if current user is a moderator
  const isUserModerator = user && community ? isModerator(user.pubkey, community) : false;
  
  // Create a map of moderation status for posts
  const moderationStatusMap = new Map();
  if (moderationPosts) {
    moderationPosts.forEach(post => {
      moderationStatusMap.set(post.id, {
        isApproved: post.isApproved,
        isRemoved: post.isRemoved,
      });
    });
  }
  
  // Helper function to check if a post should be considered approved
  // Per NIP.md line 330: "Comments from users in the approved members list (Kind 34551) 
  // are automatically considered approved without requiring individual Kind 4550 approval events."
  const isPostApproved = (post: { id: string; pubkey: string }) => {
    const moderationStatus = moderationStatusMap.get(post.id);
    
    // If explicitly removed, it's not approved
    if (moderationStatus?.isRemoved) {
      return false;
    }
    
    // If explicitly approved by moderator, it's approved
    if (moderationStatus?.isApproved) {
      return true;
    }
    
    // Auto-approval workflow: check if author is in approved members list
    if (memberLists?.approved.includes(post.pubkey)) {
      return true;
    }
    
    // If there's no moderation status and author is not in approved list, 
    // the post is pending approval (for non-members)
    return false;
  };
  
  // Create a set of pinned post IDs for quick lookup
  const pinnedPostIds = new Set(pinnedPosts?.map(p => p.eventId) || []);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-3">
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-4 w-3/5" />
                  </div>
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="py-8 text-center">
          <p className="text-destructive">Failed to load community posts</p>
          <p className="text-sm text-muted-foreground mt-2">
            Please check your connection and try again
          </p>
        </CardContent>
      </Card>
    );
  }

  // For empty state, check if we have any content to show
  const hasContentToShow = () => {
    if (!posts || posts.length === 0) return false;
    
    if (isUserModerator) {
      // Moderators can see all posts
      return true;
    }
    
    // Non-moderators can only see approved posts
    return posts.some(post => isPostApproved(post));
  };

  if (!posts || !hasContentToShow()) {
    return (
      <div className="space-y-4">
        <Card className="border-dashed">
          <CardContent className="py-12 px-8 text-center">
            <div className="max-w-sm mx-auto space-y-6">
              <div className="space-y-2">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground" />
                <h3 className="font-semibold">No posts yet</h3>
                <p className="text-muted-foreground text-sm">
                  Be the first to share something with the community!
                </p>
              </div>
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Try switching to a different relay to discover more content:
                </p>
                <RelaySelector className="w-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Posts Feed */}
      {posts.map((post) => {
        const moderationStatus = moderationStatusMap.get(post.id);
        const isPinned = pinnedPostIds.has(post.id);
        const postApproved = isPostApproved(post);
        
        // For non-moderators, hide unapproved posts
        if (!isUserModerator && !postApproved) {
          return null;
        }
        
        return (
          <CommunityPost 
            key={post.id} 
            event={post} 
            communityId={communityId}
            showReplies={true}
            isApproved={postApproved}
            isRemoved={moderationStatus?.isRemoved ?? false}
            isPinned={isPinned}
          />
        );
      }).filter(Boolean)}

      {/* Load More Indicator */}
      {posts && posts.length >= 30 && (
        <Card className="border-dashed">
          <CardContent className="py-6 text-center">
            <p className="text-sm text-muted-foreground">
              Showing latest 30 posts. Refresh to see newer content.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}