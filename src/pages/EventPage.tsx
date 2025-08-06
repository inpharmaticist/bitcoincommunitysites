import { useSeoMeta } from '@unhead/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Navigation } from '@/components/Navigation';
import { Calendar, Clock, MapPin, Users, Heart, ThumbsUp, ThumbsDown, CheckCircle, XCircle, Clock4 } from 'lucide-react';
import { useCalendarEvent } from '@/hooks/useCalendarEvent';
import { useEventRSVPs } from '@/hooks/useEventRSVPs';
import { useEventReactions } from '@/hooks/useEventReactions';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useAuthor } from '@/hooks/useAuthor';
import { CommentsSection } from '@/components/comments/CommentsSection';
import { genUserName } from '@/lib/genUserName';
import { siteConfig } from '@/lib/config';
import { useState, useMemo } from 'react';

interface EventPageProps {
  kind: number;
  pubkey: string;
  identifier: string;
}

interface RSVP {
  status: 'accepted' | 'declined' | 'tentative';
  author: string;
  note?: string;
}

function RSVPButton({ 
  currentRSVP, 
  optimisticStatus,
  isSubmitting,
  onRSVP 
}: { 
  currentRSVP: RSVP | null; 
  optimisticStatus: 'accepted' | 'declined' | 'tentative' | null;
  isSubmitting: boolean;
  onRSVP: (status: 'accepted' | 'declined' | 'tentative') => void;
}) {
  const { user } = useCurrentUser();
  
  if (!user) {
    return (
      <div className="text-sm text-muted-foreground">
        Log in to RSVP to this event
      </div>
    );
  }

  // Use optimistic status if available, otherwise fall back to server data
  const currentStatus = optimisticStatus || currentRSVP?.status;

  return (
    <div className="flex gap-2">
      <Button
        onClick={() => onRSVP('accepted')}
        variant={currentStatus === 'accepted' ? 'default' : 'outline'}
        size="sm"
        className="flex items-center gap-2"
        disabled={isSubmitting}
      >
        <CheckCircle className="h-4 w-4" />
        Going
      </Button>
      <Button
        onClick={() => onRSVP('tentative')}
        variant={currentStatus === 'tentative' ? 'default' : 'outline'}
        size="sm"
        className="flex items-center gap-2"
        disabled={isSubmitting}
      >
        <Clock4 className="h-4 w-4" />
        Maybe
      </Button>
      <Button
        onClick={() => onRSVP('declined')}
        variant={currentStatus === 'declined' ? 'destructive' : 'outline'}
        size="sm"
        className="flex items-center gap-2"
        disabled={isSubmitting}
      >
        <XCircle className="h-4 w-4" />
        Can't Go
      </Button>
    </div>
  );
}

interface Reaction {
  content: string;
  author: string;
  isLike: boolean;
  isDislike: boolean;
}

function ReactionButton({ reactions, onReact }: {
  reactions: Reaction[];
  onReact: (content: string) => void;
}) {
  const { user } = useCurrentUser();
  
  if (!user) return null;

  const likes = reactions.filter(r => r.isLike);
  const dislikes = reactions.filter(r => r.isDislike);
  const userLiked = likes.some(r => r.author === user.pubkey);
  const userDisliked = dislikes.some(r => r.author === user.pubkey);

  return (
    <div className="flex items-center gap-4">
      <Button
        onClick={() => onReact(userLiked ? '' : '+')}
        variant={userLiked ? 'default' : 'ghost'}
        size="sm"
        className="flex items-center gap-2"
      >
        <ThumbsUp className="h-4 w-4" />
        {likes.length > 0 && <span>{likes.length}</span>}
      </Button>
      <Button
        onClick={() => onReact(userDisliked ? '' : '-')}
        variant={userDisliked ? 'destructive' : 'ghost'}
        size="sm"
        className="flex items-center gap-2"
      >
        <ThumbsDown className="h-4 w-4" />
        {dislikes.length > 0 && <span>{dislikes.length}</span>}
      </Button>
      <Button
        onClick={() => onReact('❤️')}
        variant="ghost"
        size="sm"
        className="flex items-center gap-2"
      >
        <Heart className="h-4 w-4" />
        {reactions.filter(r => r.content === '❤️').length > 0 && (
          <span>{reactions.filter(r => r.content === '❤️').length}</span>
        )}
      </Button>
    </div>
  );
}

export function EventPage({ kind, pubkey, identifier }: EventPageProps) {
  const { data: event, isLoading, error } = useCalendarEvent(kind, pubkey, identifier);
  const { user } = useCurrentUser();
  const { mutateAsync: createEvent } = useNostrPublish();
  const [isRSVPing, setIsRSVPing] = useState(false);
  const [isReacting, setIsReacting] = useState(false);
  
  // Optimistic RSVP state for immediate UI feedback
  const [optimisticRSVP, setOptimisticRSVP] = useState<'accepted' | 'declined' | 'tentative' | null>(null);

  // Create event coordinates for RSVP and reaction queries
  const eventCoordinates = event ? `${event.kind}:${event.pubkey}:${identifier}` : '';
  
  const { data: rsvps = [] } = useEventRSVPs(eventCoordinates);
  const { data: reactions = [] } = useEventReactions(event?.id, eventCoordinates);
  const author = useAuthor(event?.pubkey || '');

  // Find current user's RSVP from server data
  const serverRSVP: RSVP | null = user ? rsvps.find(rsvp => rsvp.author === user.pubkey) || null : null;
  
  // Clear optimistic state when server data updates
  const currentRSVP = useMemo(() => {
    if (serverRSVP && optimisticRSVP && serverRSVP.status === optimisticRSVP) {
      // Server caught up with our optimistic update, clear optimistic state
      setOptimisticRSVP(null);
    }
    return serverRSVP;
  }, [serverRSVP, optimisticRSVP]);

  // Count attendees by status with optimistic updates
  const accepted = useMemo(() => {
    let count = rsvps.filter(rsvp => rsvp.status === 'accepted').length;
    // Adjust count based on optimistic state
    if (user && optimisticRSVP) {
      const hadAccepted = serverRSVP?.status === 'accepted';
      const willAccept = optimisticRSVP === 'accepted';
      if (!hadAccepted && willAccept) count++;
      if (hadAccepted && !willAccept) count--;
    }
    return count;
  }, [rsvps, user, optimisticRSVP, serverRSVP]);

  const tentative = useMemo(() => {
    let count = rsvps.filter(rsvp => rsvp.status === 'tentative').length;
    // Adjust count based on optimistic state
    if (user && optimisticRSVP) {
      const hadTentative = serverRSVP?.status === 'tentative';
      const willBeTentative = optimisticRSVP === 'tentative';
      if (!hadTentative && willBeTentative) count++;
      if (hadTentative && !willBeTentative) count--;
    }
    return count;
  }, [rsvps, user, optimisticRSVP, serverRSVP]);

  const declined = useMemo(() => {
    let count = rsvps.filter(rsvp => rsvp.status === 'declined').length;
    // Adjust count based on optimistic state
    if (user && optimisticRSVP) {
      const hadDeclined = serverRSVP?.status === 'declined';
      const willDecline = optimisticRSVP === 'declined';
      if (!hadDeclined && willDecline) count++;
      if (hadDeclined && !willDecline) count--;
    }
    return count;
  }, [rsvps, user, optimisticRSVP, serverRSVP]);

  // Extract event data for SEO (needs to be done before conditional returns)
  const title = event?.tags.find(([name]) => name === 'title')?.[1] || 'Event';
  const summary = event?.tags.find(([name]) => name === 'summary')?.[1];
  const description = event?.content;
  const authorName = author.data?.metadata?.name ?? (event ? genUserName(event.pubkey) : 'Unknown');

  useSeoMeta({
    title: `${title} - ${siteConfig.siteTitle}`,
    description: summary || description || `Event organized by ${authorName}`,
  });

  const handleRSVP = async (status: 'accepted' | 'declined' | 'tentative') => {
    if (!user || !event || isRSVPing) return;
    
    // Immediately update UI with optimistic state
    setOptimisticRSVP(status);
    setIsRSVPing(true);
    
    try {
      // Generate a unique identifier for this RSVP
      const rsvpId = `${event.id}-${user.pubkey}-${Date.now()}`;
      
      const tags = [
        ['a', eventCoordinates],
        ['e', event.id],
        ['d', rsvpId],
        ['status', status],
        ['p', event.pubkey],
      ];

      // Add free/busy tag if status is not declined
      if (status !== 'declined') {
        tags.push(['fb', 'busy']);
      }

      // Await the event creation to ensure it's sent to relays
      await createEvent({
        kind: 31925,
        content: '',
        tags,
      });
      
      console.log(`RSVP sent successfully: ${status}`);
    } catch (error) {
      // On error, revert the optimistic update
      console.error('RSVP failed:', error);
      setOptimisticRSVP(null);
      // Optionally show an error toast here
    } finally {
      setIsRSVPing(false);
    }
  };

  const handleReact = async (content: string) => {
    if (!user || !event || isReacting) return;
    
    setIsReacting(true);
    
    try {
      const tags = [
        ['e', event.id],
        ['p', event.pubkey],
        ['k', event.kind.toString()],
      ];

      // Add 'a' tag for addressable events
      if (event.kind >= 30000) {
        tags.push(['a', eventCoordinates]);
      }

      await createEvent({
        kind: 7,
        content,
        tags,
      });
      
      console.log(`Reaction sent successfully: ${content}`);
    } catch (error) {
      console.error('Reaction failed:', error);
    } finally {
      setIsReacting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-accent/20">
        <Navigation />
        <div className="pt-24 pb-16 px-4">
          <div className="container mx-auto max-w-4xl">
            <Card>
              <CardHeader>
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-accent/20">
        <Navigation />
        <div className="pt-24 pb-16 px-4">
          <div className="container mx-auto max-w-4xl">
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <p className="text-destructive">
                  Event not found or failed to load.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Extract event data
  const eventTitle = event.tags.find(([name]) => name === 'title')?.[1] || 'Untitled Event';
  const location = event.tags.find(([name]) => name === 'location')?.[1];
  const start = event.tags.find(([name]) => name === 'start')?.[1];
  const end = event.tags.find(([name]) => name === 'end')?.[1];

  // Format date/time based on event kind
  let dateDisplay = '';
  let timeDisplay = '';
  
  if (event.kind === 31922 && start) {
    // Date-based event
    const startDate = new Date(start);
    dateDisplay = startDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    if (end && end !== start) {
      const endDate = new Date(end);
      dateDisplay += ` - ${endDate.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric',
        year: endDate.getFullYear() !== startDate.getFullYear() ? 'numeric' : undefined
      })}`;
    }
  } else if (event.kind === 31923 && start) {
    // Time-based event
    const startTime = new Date(parseInt(start) * 1000);
    dateDisplay = startTime.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    timeDisplay = startTime.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      timeZoneName: 'short'
    });
    
    if (end) {
      const endTime = new Date(parseInt(end) * 1000);
      timeDisplay += ` - ${endTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        timeZoneName: endTime.getDate() !== startTime.getDate() ? 'short' : undefined
      })}`;
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-accent/20">
      <Navigation />

      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-4xl space-y-6">
          {/* Main Event Card */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-3xl mb-2">{eventTitle}</CardTitle>
                  <p className="text-muted-foreground">
                    Organized by {authorName}
                  </p>
                </div>
                <Badge variant="secondary">
                  {event.kind === 31922 ? 'All Day' : 'Timed'}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {summary && (
                <p className="text-lg text-muted-foreground">{summary}</p>
              )}

              {/* Event Details */}
              <div className="grid gap-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">{dateDisplay}</span>
                </div>
                
                {timeDisplay && (
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <span>{timeDisplay}</span>
                  </div>
                )}
                
                {location && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <span>{location}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div className="flex gap-4 text-sm">
                    <span className="text-green-600">{accepted} going</span>
                    <span className="text-yellow-600">{tentative} maybe</span>
                    <span className="text-gray-600">{declined} can't go</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              {description && (
                <div>
                  <h3 className="font-semibold mb-2">About This Event</h3>
                  <div className="whitespace-pre-wrap break-words text-muted-foreground">
                    {description}
                  </div>
                </div>
              )}

              {/* RSVP and Reactions */}
              <div className="border-t pt-6 space-y-4">
                <div>
                  <h3 className="font-semibold mb-3">Will you attend?</h3>
                  <RSVPButton 
                    currentRSVP={currentRSVP} 
                    optimisticStatus={optimisticRSVP}
                    isSubmitting={isRSVPing}
                    onRSVP={handleRSVP} 
                  />
                  {(currentRSVP || optimisticRSVP) && (
                    <p className="text-sm text-muted-foreground mt-2">
                      You RSVP'd: <strong>{optimisticRSVP || currentRSVP?.status}</strong>
                      {isRSVPing && <span className="ml-2 text-xs">(saving...)</span>}
                    </p>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Reactions</h3>
                  <ReactionButton 
                    reactions={reactions} 
                    onReact={handleReact} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comments Section */}
          <CommentsSection 
            root={event}
            title="Event Discussion"
            emptyStateMessage="No discussion yet"
            emptyStateSubtitle="Be the first to comment on this event!"
          />
        </div>
      </div>
    </div>
  );
}