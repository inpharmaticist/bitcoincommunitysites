import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  ThumbsUp, 
  ThumbsDown, 
  Smile, 
  Loader2
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useReactions, useReactionActions } from '@/hooks/useReactions';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '@/hooks/useToast';
import { useOptimisticCommunity } from '@/hooks/useOptimisticCommunity';
import { cn } from '@/lib/utils';
import type { NostrEvent } from '@nostrify/nostrify';

interface ReactionsBarProps {
  event: NostrEvent;
  className?: string;
  communityId?: string;
}

const EMOJI_REACTIONS = ['❤️', '👍', '👎', '😂', '😢', '😮', '😡', '🔥', '💯', '🎉'];

export function ReactionsBar({ event, className, communityId }: ReactionsBarProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const { user } = useCurrentUser();
  const { toast } = useToast();
  
  // Extract community ID from event tags if not provided
  const actualCommunityId = communityId || event.tags.find(([name]) => name === 'h')?.[1] || '';
  const { addOptimisticReaction, removeOptimisticReaction, clearOptimisticReaction } = useOptimisticCommunity(actualCommunityId);
  
  const { 
    data: reactions, 
    isLoading: reactionsLoading,
    error: reactionsError 
  } = useReactions(event.id, event.pubkey);
  
  // Clear optimistic reaction when server data confirms it
  useEffect(() => {
    if (reactions?.userReaction && !reactions?.optimisticUserReaction) {
      clearOptimisticReaction(event.id, reactions.userReaction);
    }
  }, [reactions?.userReaction, reactions?.optimisticUserReaction, event.id, clearOptimisticReaction]);
  
  const { publishReaction, removeReaction } = useReactionActions(
    event.id, 
    event.pubkey, 
    event.kind
  );

  const handleReaction = async (content: string) => {
    if (!user) {
      toast({
        title: "Login required",
        description: "You must be logged in to react to posts.",
        variant: "destructive",
      });
      return;
    }

    try {
      // If user already has this reaction, remove it
      if (reactions?.userReaction === content || reactions?.optimisticUserReaction === content) {
        // Apply optimistic update immediately
        removeOptimisticReaction(event.id);
        
        await removeReaction.mutateAsync();
        toast({
          title: "Reaction removed",
          description: "Your reaction has been removed.",
        });
      } else {
        // Apply optimistic update immediately
        addOptimisticReaction(event.id, content);
        
        // Add new reaction
        await publishReaction.mutateAsync({ content });
        toast({
          title: "Reaction added",
          description: `You reacted with ${content === '+' ? '👍' : content === '-' ? '👎' : content}`,
        });
      }
    } catch (error) {
      console.error('Reaction error:', error);
      // Revert optimistic update on error
      if (reactions?.userReaction === content || reactions?.optimisticUserReaction === content) {
        addOptimisticReaction(event.id, content); // Re-add if we tried to remove
      } else {
        removeOptimisticReaction(event.id); // Remove if we tried to add
      }
      
      toast({
        title: "Error",
        description: "Failed to react. Please try again.",
        variant: "destructive",
      });
    }
    
    setShowEmojiPicker(false);
  };

  const handleEmojiReaction = (emoji: string) => {
    handleReaction(emoji);
  };

  if (reactionsError) {
    console.error('Failed to load reactions:', reactionsError);
  }

  const isReacting = publishReaction.isPending || removeReaction.isPending;
  const userReaction = reactions?.optimisticUserReaction || reactions?.userReaction;

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      {/* Like Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleReaction('+')}
        disabled={isReacting || !user}
        className={cn(
          "text-muted-foreground hover:text-foreground",
          userReaction === '+' && "text-blue-600 bg-blue-50 hover:bg-blue-100"
        )}
      >
        {isReacting && userReaction === '+' ? (
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
        ) : (
          <ThumbsUp className="h-4 w-4 mr-1" />
        )}
        {reactions?.likes || 0}
      </Button>

      {/* Dislike Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleReaction('-')}
        disabled={isReacting || !user}
        className={cn(
          "text-muted-foreground hover:text-foreground",
          userReaction === '-' && "text-red-600 bg-red-50 hover:bg-red-100"
        )}
      >
        {isReacting && userReaction === '-' ? (
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
        ) : (
          <ThumbsDown className="h-4 w-4 mr-1" />
        )}
        {reactions?.dislikes || 0}
      </Button>

      {/* Emoji Reactions */}
      {reactions && Object.keys(reactions.emojis).length > 0 && (
        <div className="flex items-center space-x-1">
          {Object.entries(reactions.emojis).map(([emoji, count]) => (
            <Button
              key={emoji}
              variant="ghost"
              size="sm"
              onClick={() => handleReaction(emoji)}
              disabled={isReacting || !user}
              className={cn(
                "text-muted-foreground hover:text-foreground px-2",
                userReaction === emoji && "bg-primary/10 text-primary"
              )}
            >
              <span className="mr-1">{emoji}</span>
              {count}
            </Button>
          ))}
        </div>
      )}

      {/* Emoji Picker */}
      <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={!user}
            className="text-muted-foreground hover:text-foreground"
          >
            <Smile className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" side="top">
          <div className="grid grid-cols-5 gap-2">
            {EMOJI_REACTIONS.map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                onClick={() => handleEmojiReaction(emoji)}
                disabled={isReacting}
                className="h-10 w-10 p-0 text-lg hover:bg-primary/10"
              >
                {emoji}
              </Button>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
            Click an emoji to react
          </div>
        </PopoverContent>
      </Popover>

      {/* Loading indicator */}
      {reactionsLoading && (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}