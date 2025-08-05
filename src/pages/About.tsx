import { useSeoMeta } from '@unhead/react';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { nip19 } from 'nostr-tools';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Navigation } from '@/components/Navigation';
import { siteConfig } from '@/lib/config';
import { Calendar } from 'lucide-react';

function useAboutContent() {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['about-content', siteConfig.aboutNaddr],
    queryFn: async (c) => {
      if (!siteConfig.aboutNaddr) {
        throw new Error('No about page naddr configured');
      }

      try {
        // Decode the naddr
        const decoded = nip19.decode(siteConfig.aboutNaddr);
        if (decoded.type !== 'naddr') {
          throw new Error('Invalid naddr format');
        }

        const naddr = decoded.data;
        const signal = AbortSignal.any([c.signal, AbortSignal.timeout(1500)]);
        
        // Query for the specific long-form content
        const events = await nostr.query([
          {
            kinds: [naddr.kind],
            authors: [naddr.pubkey],
            '#d': [naddr.identifier],
            limit: 1,
          }
        ], { signal });

        if (events.length === 0) {
          throw new Error('About page content not found');
        }

        return events[0];
      } catch (error) {
        console.error('Failed to fetch about content:', error);
        throw error;
      }
    },
    enabled: !!siteConfig.aboutNaddr
  });
}

export default function About() {
  const { data: aboutContent, isLoading, error } = useAboutContent();
  
  const siteTitle = siteConfig.siteTitle;
  const pageTitle = aboutContent?.tags.find(([name]) => name === 'title')?.[1] || 'About';
  const publishedAt = aboutContent?.tags.find(([name]) => name === 'published_at')?.[1];
  
  // Format publish date if available
  const publishDate = publishedAt 
    ? new Date(parseInt(publishedAt) * 1000)
    : aboutContent ? new Date(aboutContent.created_at * 1000) : null;
  
  const dateDisplay = publishDate?.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  useSeoMeta({
    title: `${pageTitle} - ${siteTitle}`,
    description: `Learn more about ${siteTitle}`,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-accent/20">
      <Navigation />

      {/* Main Content */}
      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto">
            {isLoading && (
              <Card>
                <CardContent className="py-12">
                  <Skeleton className="h-10 w-48 mb-4" />
                  <Skeleton className="h-4 w-32 mb-8" />
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </CardContent>
              </Card>
            )}

            {error && (
              <Card className="border-destructive">
                <CardContent className="py-12 text-center">
                  <p className="text-destructive">
                    Failed to load about page content. Please try again later.
                  </p>
                </CardContent>
              </Card>
            )}

            {aboutContent && (
              <Card>
                <CardContent className="py-12">
                  <h1 className="text-4xl font-bold mb-4">{pageTitle}</h1>
                  
                  {dateDisplay && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
                      <Calendar className="h-4 w-4" />
                      <span>Last updated: {dateDisplay}</span>
                    </div>
                  )}
                  
                  <div className="prose prose-gray dark:prose-invert max-w-none">
                    <div 
                      className="whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: aboutContent.content }}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}