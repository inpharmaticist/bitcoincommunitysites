import { useSeoMeta } from '@unhead/react';
import { useParams, Navigate } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Navigation } from '@/components/Navigation';
import { CommentsSection } from '@/components/comments/CommentsSection';
import { Calendar, Clock, Tag, Heart, MessageSquare, ThumbsDown } from 'lucide-react';
import { useAuthor } from '@/hooks/useAuthor';
import { useReactions, useReactionActions } from '@/hooks/useReactions';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '@/hooks/useToast';
import { genUserName } from '@/lib/genUserName';
import { siteConfig } from '@/lib/config';

function useBlogPost(naddr: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['blog-post', naddr],
    queryFn: async (c) => {
      try {
        // Decode the naddr
        const decoded = nip19.decode(naddr);
        if (decoded.type !== 'naddr') {
          throw new Error('Invalid naddr format');
        }

        const addrData = decoded.data;
        const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
        
        // Query for the specific blog post
        const events = await nostr.query([
          {
            kinds: [addrData.kind],
            authors: [addrData.pubkey],
            '#d': [addrData.identifier],
            limit: 1,
          }
        ], { signal });

        if (events.length === 0) {
          return null;
        }

        const event = events[0];

        // Validate it's a long-form content event
        if (event.kind !== 30023) {
          throw new Error('Not a long-form content event');
        }

        // Check for required tags
        const dTag = event.tags.find(([name]) => name === 'd')?.[1];
        const title = event.tags.find(([name]) => name === 'title')?.[1];

        if (!dTag || !title || !event.content.trim()) {
          throw new Error('Invalid blog post format');
        }

        return event;
      } catch (error) {
        console.error('Failed to fetch blog post:', error);
        throw error;
      }
    },
    retry: 2,
    enabled: !!naddr,
  });
}

function ReactionButtons({ event }: { event: NostrEvent }) {
  const { user } = useCurrentUser();
  const { data: reactions } = useReactions(event.id, event.pubkey);
  const { publishReaction } = useReactionActions(event.id, event.pubkey, event.kind);
  const { toast } = useToast();

  const handleReaction = async (reactionContent: string) => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please log in to react to posts.",
        variant: "destructive",
      });
      return;
    }

    try {
      await publishReaction.mutateAsync({ content: reactionContent });
      toast({
        title: "Reaction added!",
        description: "Your reaction has been published.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to publish reaction. Please try again.",
        variant: "destructive",
      });
    }
  };

  const isUserReaction = (content: string) => {
    return reactions?.userReaction === content;
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        variant={isUserReaction('+') ? 'default' : 'outline'}
        size="sm"
        onClick={() => handleReaction('+')}
        disabled={publishReaction.isPending}
        className="gap-1"
      >
        <Heart className="h-4 w-4" />
        {reactions?.likes || 0}
      </Button>
      
      <Button
        variant={isUserReaction('-') ? 'default' : 'outline'}
        size="sm"
        onClick={() => handleReaction('-')}
        disabled={publishReaction.isPending}
        className="gap-1"
      >
        <ThumbsDown className="h-4 w-4" />
        {reactions?.dislikes || 0}
      </Button>

      {/* Show emoji reactions */}
      {reactions && Object.entries(reactions.emojis).map(([emoji, count]) => (
        <Button
          key={emoji}
          variant={isUserReaction(emoji) ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleReaction(emoji)}
          disabled={publishReaction.isPending}
          className="gap-1"
        >
          <span>{emoji}</span>
          {count}
        </Button>
      ))}
    </div>
  );
}

export default function BlogPost() {
  const { naddr } = useParams<{ naddr: string }>();
  const { data: post, isLoading, error } = useBlogPost(naddr || '');
  const author = useAuthor(post?.pubkey || '');

  // Set up SEO meta early with default values
  const seoTitle = post?.tags.find(([name]) => name === 'title')?.[1] || 'Blog Post';
  const seoSummary = post?.tags.find(([name]) => name === 'summary')?.[1];
  
  useSeoMeta({
    title: `${seoTitle} - ${siteConfig.siteTitle}`,
    description: seoSummary || `Read "${seoTitle}" on ${siteConfig.siteTitle}`,
  });

  if (!naddr) {
    return <Navigate to="/blog" replace />;
  }

  // Validate naddr format
  try {
    const decoded = nip19.decode(naddr);
    if (decoded.type !== 'naddr') {
      return <Navigate to="/blog" replace />;
    }
  } catch {
    return <Navigate to="/blog" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-accent/20">
        <Navigation />
        <div className="pt-24 pb-16 px-4">
          <div className="container mx-auto">
            <div className="max-w-4xl mx-auto">
              <Card>
                <CardHeader>
                  <Skeleton className="h-8 w-3/4 mb-4" />
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-accent/20">
        <Navigation />
        <div className="pt-24 pb-16 px-4">
          <div className="container mx-auto">
            <div className="max-w-4xl mx-auto">
              <Card className="border-destructive">
                <CardContent className="py-12 text-center">
                  <p className="text-destructive">
                    {error ? 'Failed to load blog post' : 'Blog post not found'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Please check the URL and try again.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const title = post.tags.find(([name]) => name === 'title')?.[1] || 'Untitled';
  const summary = post.tags.find(([name]) => name === 'summary')?.[1];
  const image = post.tags.find(([name]) => name === 'image')?.[1];
  const publishedAt = post.tags.find(([name]) => name === 'published_at')?.[1];
  
  // Get tags for display
  const tags = post.tags.filter(([name]) => name === 't').map(([_, value]) => value);
  
  // Format publish date
  const publishDate = publishedAt 
    ? new Date(parseInt(publishedAt) * 1000)
    : new Date(post.created_at * 1000);
  
  const dateDisplay = publishDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const metadata = author.data?.metadata;
  const displayName = metadata?.name ?? genUserName(post.pubkey);
  const profileImage = metadata?.picture;

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-accent/20">
      <Navigation />
      
      {/* Main Content */}
      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Blog Post */}
            <Card>
              <CardHeader className="space-y-6">
                {image && (
                  <div className="aspect-video w-full overflow-hidden rounded-lg">
                    <img 
                      src={image} 
                      alt={title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold mb-4">{title}</h1>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{dateDisplay}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{Math.ceil(post.content.length / 200)} min read</span>
                    </div>
                  </div>

                  {summary && (
                    <p className="text-lg text-muted-foreground mb-4">{summary}</p>
                  )}
                  
                  {tags.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap mb-4">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      {tags.map((tag, index) => (
                        <Badge key={index} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="prose prose-gray dark:prose-invert max-w-none">
                  <div 
                    className="whitespace-pre-wrap leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: post.content }}
                  />
                </div>
                
                {/* Author Info */}
                <div className="border-t pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      {profileImage ? (
                        <img 
                          src={profileImage} 
                          alt={displayName}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-semibold">
                          {displayName.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold">{displayName}</p>
                      <p className="text-sm text-muted-foreground">Author</p>
                    </div>
                  </div>
                </div>
                
                {/* Reactions */}
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Heart className="h-5 w-5" />
                      Reactions
                    </h3>
                    <ReactionButtons event={post} />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Comments Section */}
            <Card>
              <CardHeader>
                <h3 className="font-semibold flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Comments
                </h3>
              </CardHeader>
              <CardContent>
                <CommentsSection 
                  root={post}
                  title=""
                  emptyStateMessage="No comments yet"
                  emptyStateSubtitle="Be the first to share your thoughts!"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}