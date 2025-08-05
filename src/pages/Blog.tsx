import { useSeoMeta } from '@unhead/react';
import { Link } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import type { NostrEvent } from '@nostrify/nostrify';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Navigation } from '@/components/Navigation';
import { Calendar, Clock, Tag } from 'lucide-react';
import { useBlogPosts } from '@/hooks/useBlogPosts';
import { siteConfig } from '@/lib/config';

function BlogPostCard({ post }: { post: NostrEvent }) {
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
  
  // Create the naddr for the link
  const naddr = nip19.naddrEncode({
    identifier: post.tags.find(([name]) => name === 'd')?.[1] || '',
    pubkey: post.pubkey,
    kind: post.kind,
  });

  return (
    <Link to={`/blog/${naddr}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
        {image && (
          <div className="aspect-video w-full overflow-hidden rounded-t-lg">
            <img 
              src={image} 
              alt={title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <CardHeader>
          <CardTitle className="text-xl line-clamp-2">{title}</CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{dateDisplay}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {summary && (
            <p className="text-muted-foreground line-clamp-3">{summary}</p>
          )}
          
          {tags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className="h-4 w-4 text-muted-foreground" />
              {tags.map((tag, index) => (
                <span key={index} className="text-xs bg-secondary px-2 py-1 rounded">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export default function Blog() {
  const { data: posts, isLoading, error } = useBlogPosts();
  
  const siteTitle = siteConfig.siteTitle;

  useSeoMeta({
    title: `Blog - ${siteTitle}`,
    description: `Read the latest articles and updates from ${siteTitle}`,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-accent/20">
      <Navigation />

      {/* Main Content */}
      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-4xl font-bold mb-2">Blog</h1>
            <p className="text-xl text-muted-foreground mb-8">
              Latest articles and updates from our community
            </p>

            {isLoading && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i}>
                    <Skeleton className="aspect-video w-full rounded-t-lg" />
                    <CardHeader>
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-5/6" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {error && (
              <Card className="border-destructive">
                <CardContent className="pt-6">
                  <p className="text-destructive">
                    Failed to load blog posts. Please try again later.
                  </p>
                </CardContent>
              </Card>
            )}

            {posts && posts.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg text-muted-foreground">
                    No blog posts yet.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Check back soon for updates!
                  </p>
                </CardContent>
              </Card>
            )}

            {posts && posts.length > 0 && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.map((post) => (
                  <BlogPostCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}