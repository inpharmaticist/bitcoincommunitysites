import { useMemo } from 'react';
import { nip19 } from 'nostr-tools';
import { useAuthor } from '@/hooks/useAuthor';
import { siteConfig } from '@/lib/config';

export function useOrganizer() {
  // Decode the npub to get the hex pubkey
  const organizerPubkey = useMemo(() => {
    try {
      const decoded = nip19.decode(siteConfig.meetupNpub);
      if (decoded.type !== 'npub') {
        throw new Error('Invalid npub format');
      }
      return decoded.data as string;
    } catch (error) {
      console.error('Failed to decode organizer npub:', error);
      return null;
    }
  }, []);

  // Use the useAuthor hook to fetch organizer profile
  const author = useAuthor(organizerPubkey || '');

  return {
    pubkey: organizerPubkey,
    profile: author.data?.metadata,
    isLoading: author.isLoading,
    error: organizerPubkey ? author.error : new Error('Invalid organizer npub'),
  };
}