import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { MessageCircle, Send } from 'lucide-react';
import type { NostrEvent } from '@nostrify/nostrify';
import { useAuthor } from '@/hooks/useAuthor';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCommunityActions } from '@/hooks/useCommunityActions';
import { useCommunityPostReplies } from '@/hooks/useCommunityPosts';
import { useToast } from '@/hooks/useToast';
import { genUserName } from '@/lib/genUserName';
import { NoteContent } from '@/components/NoteContent';

interface CommunityPostProps {
  event: NostrEvent;
  communityId: string;
  showReplies?: boolean;
  isReply?: boolean;
}

export function CommunityPost({ 
  event, 
  communityId, 
  showReplies = false, 
  isReply = false 
}: CommunityPostProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const { user } = useCurrentUser();
  const author = useAuthor(event.pubkey);
  const currentUserAuthor = useAuthor(user?.pubkey || '');
  const { publishReply } = useCommunityActions(communityId);
  const { data: replies = [] } = useCommunityPostReplies(
    showReplies ? event.id : '',
    communityId
  );
  const { toast } = useToast();

  const metadata = author.data?.metadata;
  const displayName = metadata?.name ?? genUserName(event.pubkey);
  const profileImage = metadata?.picture;

  const currentUserMetadata = currentUserAuthor.data?.metadata;
  const currentUserDisplayName = currentUserMetadata?.name ?? (user ? genUserName(user.pubkey) : '');
  const currentUserProfileImage = currentUserMetadata?.picture;

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!replyContent.trim()) {
      toast({
        title: "Error",
        description: "Please enter a reply.",
        variant: "destructive",
      });
      return;
    }

    try {
      await publishReply.mutateAsync({
        content: replyContent.trim(),
        communityId,
        parentEventId: event.id,
        parentAuthorPubkey: event.pubkey,
      });
      setReplyContent('');
      setShowReplyForm(false);
      toast({
        title: "Reply posted!",
        description: "Your reply has been published.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to post reply. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    
    return date.toLocaleDateString();
  };

  return (
    <Card className={isReply ? 'ml-8 border-l-2 border-primary/20' : ''}>
      <CardContent className="p-3 sm:p-6">
        <div className="flex items-start space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profileImage} alt={displayName} />
            <AvatarFallback className="text-sm">
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-3">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-sm">{displayName}</span>
              <span className="text-xs text-muted-foreground">
                {formatTimestamp(event.created_at)}
              </span>
            </div>
            
            <div className="text-sm break-words">
              <NoteContent event={event} />
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="text-muted-foreground hover:text-foreground"
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                Reply
                {replies.length > 0 && ` (${replies.length})`}
              </Button>
            </div>
            
            {/* Reply Form */}
            {showReplyForm && user && (
              <form onSubmit={handleReplySubmit} className="space-y-3 pt-3">
                <div className="flex items-start space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={currentUserProfileImage} alt={currentUserDisplayName} />
                    <AvatarFallback className="text-xs">
                      {currentUserDisplayName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <Textarea
                      placeholder="Write a reply..."
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      className="min-h-[80px] resize-none text-sm"
                      disabled={publishReply.isPending}
                    />
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowReplyForm(false);
                          setReplyContent('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={!replyContent.trim() || publishReply.isPending}
                      >
                        {publishReply.isPending ? (
                          'Replying...'
                        ) : (
                          <>
                            <Send className="h-3 w-3 mr-1" />
                            Reply
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </form>
            )}
            
            {/* Replies */}
            {showReplies && replies.length > 0 && (
              <div className="space-y-3 pt-3">
                <Separator />
                {replies.map((reply) => (
                  <CommunityPost
                    key={reply.id}
                    event={reply}
                    communityId={communityId}
                    showReplies={false}
                    isReply={true}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}