import { useSeoMeta } from '@unhead/react';
import { Link } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import type { NostrEvent } from '@nostrify/nostrify';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Navigation } from '@/components/Navigation';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { siteConfig } from '@/lib/config';

function EventCard({ event }: { event: NostrEvent }) {
  const title = event.tags.find(([name]) => name === 'title')?.[1] || 'Untitled Event';
  const summary = event.tags.find(([name]) => name === 'summary')?.[1];
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

  // Count participants (p tags with role)
  const participants = event.tags.filter(([name]) => name === 'p').length;

  // Create the event coordinates for the link
  const naddr = nip19.naddrEncode({
    identifier: event.tags.find(([name]) => name === 'd')?.[1] || '',
    pubkey: event.pubkey,
    kind: event.kind,
  });

  return (
    <Link to={`/events/${naddr}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {summary && (
            <p className="text-muted-foreground">{summary}</p>
          )}
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{dateDisplay}</span>
          </div>
          
          {timeDisplay && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{timeDisplay}</span>
            </div>
          )}
          
          {location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{location}</span>
            </div>
          )}
          
          {participants > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{participants} invited</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export default function Events() {
  const { data: events, isLoading, error } = useCalendarEvents();
  
  const siteTitle = siteConfig.siteTitle;

  useSeoMeta({
    title: `Upcoming Events - ${siteTitle}`,
    description: `View upcoming Bitcoin community events and meetups hosted by ${siteTitle}`,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-accent/20">
      <Navigation />

      {/* Main Content */}
      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold mb-2">Upcoming Events</h1>
            <p className="text-xl text-muted-foreground mb-8">
              Join us for our Bitcoin meetups and special events
            </p>

            {isLoading && (
              <div className="grid gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-3/4" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {error && (
              <Card className="border-destructive">
                <CardContent className="pt-6">
                  <p className="text-destructive">
                    Failed to load events. Please try again later.
                  </p>
                </CardContent>
              </Card>
            )}

            {events && events.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg text-muted-foreground">
                    No upcoming events scheduled yet.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Check back soon for new events!
                  </p>
                </CardContent>
              </Card>
            )}

            {events && events.length > 0 && (
              <div className="grid gap-6">
                {events.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}