import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare } from 'lucide-react';
import { useCommunityPosts } from '@/hooks/useCommunityPosts';
import { CommunityPost } from './CommunityPost';
import { RelaySelector } from '@/components/RelaySelector';

interface CommunityFeedProps {
  communityId: string;
}

export function CommunityFeed({ communityId }: CommunityFeedProps) {
  const { data: posts, isLoading, error } = useCommunityPosts(communityId, 30);

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

  if (!posts || posts.length === 0) {
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
      {posts.map((post) => (
        <CommunityPost 
          key={post.id} 
          event={post} 
          communityId={communityId}
          showReplies={true} 
        />
      ))}

      {/* Load More Indicator */}
      {posts.length >= 30 && (
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