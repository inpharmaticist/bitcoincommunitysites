import { useMemo } from 'react';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { nip19 } from 'nostr-tools';
import type { NostrEvent } from '@nostrify/nostrify';
import { useOrganizer } from '@/hooks/useOrganizer';
import { siteConfig } from '@/lib/config';

function validateLongFormContent(event: NostrEvent): boolean {
  // Check if it's a long-form content event (NIP-23)
  if (event.kind !== 30023) return false;

  // Check for required tags
  const d = event.tags.find(([name]) => name === 'd')?.[1];
  const title = event.tags.find(([name]) => name === 'title')?.[1];

  // Long-form content requires 'd' and 'title' tags
  if (!d || !title) return false;

  // Content should exist and not be empty
  if (!event.content || event.content.trim() === '') return false;

  return true;
}

export function useBlogPosts() {
  const { nostr } = useNostr();
  const { pubkey: organizerPubkey } = useOrganizer();

  // Decode additional blog authors from config
  const additionalAuthors = useMemo(() => {
    if (!siteConfig.blogAuthors) return [];
    
    return siteConfig.blogAuthors
      .map(npub => {
        try {
          const decoded = nip19.decode(npub);
          if (decoded.type !== 'npub') return null;
          return decoded.data as string;
        } catch (error) {
          console.warn(`Failed to decode blog author npub: ${npub}`, error);
          return null;
        }
      })
      .filter((pubkey): pubkey is string => pubkey !== null);
  }, []);

  // Combine organizer with additional authors
  const allAuthors = useMemo(() => {
    const authors: string[] = [];
    if (organizerPubkey) authors.push(organizerPubkey);
    authors.push(...additionalAuthors);
    // Remove duplicates
    return [...new Set(authors)];
  }, [organizerPubkey, additionalAuthors]);

  return useQuery({
    queryKey: ['blog-posts', allAuthors],
    queryFn: async (c) => {
      if (allAuthors.length === 0) throw new Error('No blog authors available');
      
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(1500)]);
      
      // Query for long-form content (NIP-23) from all authors
      const events = await nostr.query([
        {
          kinds: [30023],
          authors: allAuthors,
          limit: 50,
        }
      ], { signal });

      // Filter and sort posts by published date
      return events
        .filter(validateLongFormContent)
        .sort((a, b) => {
          // Sort by published_at tag if available, otherwise by created_at
          const aPublished = a.tags.find(([name]) => name === 'published_at')?.[1];
          const bPublished = b.tags.find(([name]) => name === 'published_at')?.[1];
          
          const aTime = aPublished ? parseInt(aPublished) : a.created_at;
          const bTime = bPublished ? parseInt(bPublished) : b.created_at;
          
          return bTime - aTime; // Newest first
        });
    },
    enabled: allAuthors.length > 0,
  });
}