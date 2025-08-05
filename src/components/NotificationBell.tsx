import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Heart, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications, useNotificationUpdates } from '@/hooks/useNotifications';
import { useAuthor } from '@/hooks/useAuthor';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { genUserName } from '@/lib/genUserName';
import { formatDistanceToNow } from 'date-fns';
import { siteConfig } from '@/lib/config';
import type { Notification } from '@/hooks/useNotifications';

function NotificationItem({ notification, onRead, onNavigate }: {
  notification: Notification;
  onRead: (id: string) => void;
  onNavigate: (notification: Notification) => void;
}) {
  const author = useAuthor(notification.author);
  const metadata = author.data?.metadata;
  const displayName = metadata?.name ?? genUserName(notification.author);
  const profileImage = metadata?.picture;

  const handleClick = () => {
    if (!notification.read) {
      onRead(notification.id);
    }
    onNavigate(notification);
  };

  const getNotificationText = () => {
    if (notification.type === 'reaction') {
      const content = notification.event.content;
      if (content === '+' || content === '') {
        return 'liked your community post';
      } else if (content === '-') {
        return 'disliked your community post';
      } else {
        return `reacted ${content} to your community post`;
      }
    } else {
      return 'replied to your community post';
    }
  };

  const getIcon = () => {
    if (notification.type === 'reaction') {
      return <Heart className="h-4 w-4 text-red-500" />;
    } else {
      return <MessageCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  const getPreviewText = () => {
    if (notification.targetEvent) {
      const text = notification.targetEvent.content;
      return text.length > 50 ? `${text.slice(0, 50)}...` : text;
    }
    return '';
  };

  return (
    <DropdownMenuItem
      className={`p-3 cursor-pointer hover:bg-accent transition-colors ${!notification.read ? 'bg-blue-50 dark:bg-blue-950/20' : ''}`}
      onClick={handleClick}
    >
      <div className="flex items-start space-x-3 w-full">
        <Avatar className="h-8 w-8">
          <AvatarImage src={profileImage} alt={displayName} />
          <AvatarFallback className="text-xs">
            {displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            {getIcon()}
            <span className="text-sm font-medium">{displayName}</span>
            <span className="text-xs text-muted-foreground">• {siteConfig.siteTitle}</span>
            {!notification.read && (
              <div className="h-2 w-2 bg-blue-500 rounded-full" />
            )}
          </div>

          <p className="text-sm text-muted-foreground mt-1">
            {getNotificationText()} • <span className="text-xs">Click to view thread</span>
          </p>

          {getPreviewText() && (
            <p className="text-xs text-muted-foreground mt-1 italic">
              "{getPreviewText()}"
            </p>
          )}

          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
          </p>
        </div>
      </div>
    </DropdownMenuItem>
  );
}

export function NotificationBell() {
  const { user } = useCurrentUser();
  const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  // Set up real-time updates
  useNotificationUpdates();

  if (!user || !siteConfig.communityId) {
    return null;
  }

  const handleMarkAllRead = () => {
    markAllAsRead();
  };

  const handleNotificationRead = (id: string) => {
    markAsRead([id]);
  };

  const handleNotificationNavigate = (_notification: Notification) => {
    setIsOpen(false); // Close the dropdown

    // For now, navigate to community page since we don't have individual post pages
    // In the future, this could navigate to specific posts
    navigate('/community');
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && unreadCount > 0) {
      // Mark visible notifications as read after a short delay
      setTimeout(() => {
        const visibleNotifications = notifications.slice(0, 10); // First 10 notifications
        const unreadIds = visibleNotifications
          .filter(n => !n.read)
          .map(n => n.id);
        if (unreadIds.length > 0) {
          markAsRead(unreadIds);
        }
      }, 1000);
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <div className="p-3">
          <div className="flex items-center justify-between">
            <DropdownMenuLabel className="p-0 font-semibold">Notifications</DropdownMenuLabel>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                className="text-xs"
              >
                Mark all read
              </Button>
            )}
          </div>
        </div>

        <DropdownMenuSeparator />

        <ScrollArea className="h-96">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No notifications yet</p>
              <p className="text-xs mt-1">
                You'll see reactions and replies to your posts here
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={handleNotificationRead}
                  onNavigate={handleNotificationNavigate}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2 text-center">
              <p className="text-xs text-muted-foreground">
                Showing latest {Math.min(notifications.length, 100)} notifications
              </p>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}