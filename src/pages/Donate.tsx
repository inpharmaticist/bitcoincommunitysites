import { useState, useEffect, useMemo } from 'react';
import { useSeoMeta } from '@unhead/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Navigation } from '@/components/Navigation';
import { useAuthor } from '@/hooks/useAuthor';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useZaps } from '@/hooks/useZaps';
import { useWallet } from '@/hooks/useWallet';
import { Zap, Copy, ExternalLink } from 'lucide-react';
import { siteConfig } from '@/lib/config';
import { useToast } from '@/hooks/useToast';
import QRCode from 'qrcode';
import { nip19 } from 'nostr-tools';
import type { Event } from 'nostr-tools';

export default function Donate() {
  const [amount, setAmount] = useState('1000');
  const [message, setMessage] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const { webln, activeNWC } = useWallet();
  
  // Convert npub to hex for useAuthor and creating a profile event target
  const recipientPubkey = useMemo(() => {
    try {
      if (siteConfig.meetupNpub.startsWith('npub1')) {
        const decoded = nip19.decode(siteConfig.meetupNpub);
        return decoded.data as string;
      }
      return siteConfig.meetupNpub; // Already hex
    } catch {
      return siteConfig.meetupNpub;
    }
  }, []);

  const author = useAuthor(recipientPubkey);

  // Create a fake profile event for zapping the user
  const profileTarget: Event | null = useMemo(() => {
    if (!author.data?.event || !recipientPubkey) return null;
    
    return {
      id: author.data.event.id,
      pubkey: recipientPubkey,
      created_at: author.data.event.created_at,
      kind: author.data.event.kind,
      tags: author.data.event.tags,
      content: author.data.event.content,
      sig: author.data.event.sig,
    };
  }, [author.data?.event, recipientPubkey]);

  const { zap, isZapping } = useZaps(
    profileTarget || { id: '', pubkey: recipientPubkey, created_at: 0, kind: 0, tags: [], content: '', sig: '' },
    webln,
    activeNWC
  );
  
  const siteTitle = siteConfig.siteTitle;
  const metadata = author.data?.metadata;
  const lightningAddress = metadata?.lud16 || metadata?.lud06;


  useSeoMeta({
    title: `Donate - ${siteTitle}`,
    description: `Support ${siteTitle} by making a Lightning donation`,
  });

  // Generate QR code for Lightning address
  useEffect(() => {
    if (lightningAddress) {
      const lightningUri = `lightning:${lightningAddress}`;
      QRCode.toDataURL(lightningUri, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      }).then(setQrCodeDataUrl).catch(() => {
        // Silently fail QR code generation
      });
    }
  }, [lightningAddress]);

  const handleCopyAddress = async () => {
    if (lightningAddress) {
      try {
        await navigator.clipboard.writeText(lightningAddress);
        toast({
          title: 'Copied!',
          description: 'Lightning address copied to clipboard',
        });
      } catch {
        toast({
          title: 'Failed to copy',
          description: 'Could not copy Lightning address',
          variant: 'destructive',
        });
      }
    }
  };

  const handleOpenInWallet = () => {
    if (lightningAddress) {
      const lightningUri = `lightning:${lightningAddress}`;
      window.open(lightningUri, '_blank');
    }
  };

  const handleZap = () => {
    if (!user) {
      toast({
        title: 'Login required',
        description: 'Please log in to send a zap',
        variant: 'destructive',
      });
      return;
    }

    if (!lightningAddress) {
      toast({
        title: 'No Lightning address',
        description: 'The organizer has not set up a Lightning address for donations',
        variant: 'destructive',
      });
      return;
    }

    const amountSats = parseInt(amount); // Amount is already in sats
    if (isNaN(amountSats) || amountSats <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid amount in sats',
        variant: 'destructive',
      });
      return;
    }

    zap(amountSats, message);
  };

  const suggestedAmounts = [
    { label: '1 sat', value: '1' },
    { label: '10 sats', value: '10' },
    { label: '100 sats', value: '100' },
    { label: '1,000 sats', value: '1000' },
    { label: '10,000 sats', value: '10000' },
  ];

  if (author.isLoading || !recipientPubkey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-accent/20">
        <Navigation />
        <div className="pt-24 pb-16 px-4">
          <div className="container mx-auto">
            <div className="max-w-2xl mx-auto">
              <Card>
                <CardHeader>
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (author.error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-accent/20">
        <Navigation />
        <div className="pt-24 pb-16 px-4">
          <div className="container mx-auto">
            <div className="max-w-2xl mx-auto">
              <Card className="border-destructive">
                <CardContent className="py-12 text-center">
                  <Zap className="h-12 w-12 mx-auto mb-4 text-destructive" />
                  <h2 className="text-xl font-semibold mb-2">Error Loading Profile</h2>
                  <p className="text-muted-foreground mb-4">
                    Could not load the organizer's profile information.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Error: {author.error?.message || 'Unknown error'}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!lightningAddress) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-accent/20">
        <Navigation />
        <div className="pt-24 pb-16 px-4">
          <div className="container mx-auto">
            <div className="max-w-2xl mx-auto">
              <Card className="border-muted">
                <CardContent className="py-12 text-center">
                  <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h2 className="text-xl font-semibold mb-2">Donations Not Available</h2>
                  <p className="text-muted-foreground mb-4">
                    The organizer has not set up a Lightning address for donations yet.
                  </p>
                  <details className="text-sm text-muted-foreground">
                    <summary className="cursor-pointer">Debug Info</summary>
                    <pre className="mt-2 text-left">
                      {JSON.stringify({
                        hasAuthorData: !!author.data,
                        hasMetadata: !!metadata,
                        lud16: metadata?.lud16,
                        lud06: metadata?.lud06,
                        pubkey: recipientPubkey
                      }, null, 2)}
                    </pre>
                  </details>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-accent/20">
      <Navigation />

      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-2">Support {siteTitle}</h1>
              <p className="text-xl text-muted-foreground">
                Help us continue our mission by making a Lightning donation
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Lightning Donation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Lightning Address Display */}
                <div className="space-y-2">
                  <Label>Lightning Address</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      value={lightningAddress} 
                      readOnly 
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyAddress}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleOpenInWallet}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* QR Code */}
                {qrCodeDataUrl && (
                  <div className="text-center">
                    <Label className="block mb-2">QR Code</Label>
                    <div className="inline-block p-4 bg-white rounded-lg">
                      <img 
                        src={qrCodeDataUrl} 
                        alt="Lightning Address QR Code" 
                        className="w-48 h-48"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Scan with your Lightning wallet
                    </p>
                  </div>
                )}

                {/* Zap Interface (for logged in users) */}
                {user && (
                  <div className="space-y-4 border-t pt-6">
                    <h3 className="text-lg font-semibold">Send a Zap</h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount (sats)</Label>
                      <Input
                        id="amount"
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="1000"
                      />
                      <div className="flex flex-wrap gap-2">
                        {suggestedAmounts.map((suggested) => (
                          <Button
                            key={suggested.value}
                            variant="outline"
                            size="sm"
                            onClick={() => setAmount(suggested.value)}
                          >
                            {suggested.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Message (optional)</Label>
                      <Textarea
                        id="message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Thanks for all you do!"
                        rows={3}
                      />
                    </div>

                    <Button
                      onClick={handleZap}
                      disabled={isZapping}
                      className="w-full"
                      size="lg"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      {isZapping ? 'Sending Zap...' : 'Send Zap'}
                    </Button>
                  </div>
                )}

                {/* Login prompt for non-logged in users */}
                {!user && (
                  <div className="border-t pt-6 text-center">
                    <p className="text-muted-foreground mb-2">
                      Log in with Nostr to send zaps directly from this page
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}