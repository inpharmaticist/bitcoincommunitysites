import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle, 
  Send, 
  Check, 
  Trash2, 
  Pin, 
  PinOff,
  MoreHorizontal,
  X
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { NostrEvent } from '@nostrify/nostrify';
import { useAuthor } from '@/hooks/useAuthor';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCommunity } from '@/hooks/useCommunity';
import { useCommunityActions } from '@/hooks/useCommunityActions';
import { useCommunityPostReplies } from '@/hooks/useCommunityPosts';
import { usePinnedPosts, useCommunityActions as useModerationActions, useMemberLists, useCommunityPosts as useModerationPosts } from '@/hooks/useCommunityManagement';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { genUserName } from '@/lib/genUserName';
import { isModerator } from '@/lib/community';
import { NoteContent } from '@/components/NoteContent';

interface CommunityPostProps {
  event: NostrEvent;
  communityId: string;
  showReplies?: boolean;
  isReply?: boolean;
  isApproved?: boolean;
  isRemoved?: boolean;
  isPinned?: boolean;
}

export function CommunityPost({ 
  event, 
  communityId, 
  showReplies = false, 
  isReply = false,
  isApproved = true, // Default to approved for display
  isRemoved = false,
  isPinned = false
}: CommunityPostProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const { user } = useCurrentUser();
  const author = useAuthor(event.pubkey);
  const currentUserAuthor = useAuthor(user?.pubkey || '');
  const { data: community } = useCommunity(communityId);
  const { publishReply } = useCommunityActions(communityId);
  const { data: replies = [] } = useCommunityPostReplies(
    showReplies ? event.id : '',
    communityId
  );
  const { data: pinnedPosts } = usePinnedPosts(communityId);
  const { data: memberLists } = useMemberLists(communityId); 
  const { data: moderationPosts } = useModerationPosts(communityId);
  const { approvePost, removePost, pinPost, unpinPost } = useModerationActions(communityId);
  const { mutateAsync: publishEvent } = useNostrPublish();
  const { toast } = useToast();
  
  // Check if current user is a moderator
  const isUserModerator = user && community ? isModerator(user.pubkey, community) : false;
  
  // Check if current user is the author of this post
  const isAuthor = user?.pubkey === event.pubkey;
  
  // Create a map of moderation status for posts (including replies)
  const moderationStatusMap = new Map();
  if (moderationPosts) {
    moderationPosts.forEach(post => {
      moderationStatusMap.set(post.id, {
        isApproved: post.isApproved,
        isRemoved: post.isRemoved,
      });
    });
  }

  // Helper function to check if a post should be considered approved
  // Per NIP.md line 330: "Comments from users in the approved members list (Kind 34551) 
  // are automatically considered approved without requiring individual Kind 4550 approval events."
  const isPostApproved = (post: { id: string; pubkey: string }) => {
    const moderationStatus = moderationStatusMap.get(post.id);
    
    // If explicitly removed, it's not approved
    if (moderationStatus?.isRemoved) {
      return false;
    }
    
    // If explicitly approved by moderator, it's approved
    if (moderationStatus?.isApproved) {
      return true;
    }
    
    // Auto-approval workflow: check if author is in approved members list
    if (memberLists?.approved.includes(post.pubkey)) {
      return true;
    }
    
    // If there's no moderation status and author is not in approved list, 
    // the post is pending approval (for non-members)
    return false;
  };

  // Check if this specific post is pinned
  const isThisPostPinned = isPinned || (pinnedPosts?.some(p => p.eventId === event.id) ?? false);

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

  const handleApprovePost = async () => {
    try {
      await approvePost.mutateAsync({ 
        eventId: event.id, 
        eventContent: JSON.stringify(event),
        authorPubkey: event.pubkey 
      });
      toast({
        title: "Post approved",
        description: "The post has been approved and will be visible to all users.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to approve post. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRemovePost = async () => {
    const reason = prompt("Optional: Enter a reason for removing this post");
    try {
      await removePost.mutateAsync({ 
        eventId: event.id, 
        authorPubkey: event.pubkey,
        reason: reason || undefined
      });
      toast({
        title: "Post removed",
        description: "The post has been removed from the community.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to remove post. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePinPost = async () => {
    try {
      if (isThisPostPinned) {
        await unpinPost.mutateAsync({ eventId: event.id });
        toast({
          title: "Post unpinned",
          description: "The post has been unpinned.",
        });
      } else {
        await pinPost.mutateAsync({ eventId: event.id });
        toast({
          title: "Post pinned",
          description: "The post has been pinned to the top of the community.",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: `Failed to ${isThisPostPinned ? 'unpin' : 'pin'} post. Please try again.`,
        variant: "destructive",
      });
    }
  };

  const handleDeletePost = async () => {
    if (!confirm("Are you sure you want to delete this post? This action cannot be undone.")) {
      return;
    }
    
    try {
      // Create NIP-9 deletion request event
      await publishEvent({
        kind: 5, // NIP-9 deletion request
        content: "Post deleted by author",
        tags: [
          ['e', event.id], // Reference to the event being deleted
          ['k', event.kind.toString()], // Kind of the event being deleted
        ],
      });
      
      toast({
        title: "Post deleted",
        description: "Your post has been marked for deletion. It may take time to propagate across relays.",
      });
    } catch {
      toast({
        title: "Error",  
        description: "Failed to delete post. Please try again.",
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

  // Don't render removed posts for non-moderators
  if (isRemoved && !isUserModerator) {
    return null;
  }

  return (
    <Card className={`${
      isReply ? 'ml-8 border-l-2 border-primary/20' : ''
    } ${
      isRemoved ? 'opacity-60 border-destructive/30' : ''
    } ${
      isThisPostPinned ? 'border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-900/10' : ''
    }`}>
      <CardContent className="p-3 sm:p-6">
        <div className="flex items-start space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profileImage} alt={displayName} />
            <AvatarFallback className="text-sm">
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-sm">{displayName}</span>
                <span className="text-xs text-muted-foreground">
                  {formatTimestamp(event.created_at)}
                </span>
                {isThisPostPinned && (
                  <Badge variant="secondary" className="text-xs">
                    <Pin className="h-3 w-3 mr-1" />
                    Pinned
                  </Badge>
                )}
                {isRemoved && isUserModerator && (
                  <Badge variant="destructive" className="text-xs">
                    Removed
                  </Badge>
                )}
                {!isApproved && isUserModerator && (
                  <Badge variant="outline" className="text-xs">
                    Pending Approval
                  </Badge>
                )}
              </div>
              
              {/* Actions Menu - Show for moderators or post authors */}
              {(isUserModerator || isAuthor) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Open post menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {/* Author actions */}
                    {isAuthor && (
                      <DropdownMenuItem 
                        onClick={handleDeletePost}
                        className="text-destructive focus:text-destructive"
                      >
                        <X className="h-4 w-4 mr-2" />
                        {isReply ? 'Delete Reply' : 'Delete Post'}
                      </DropdownMenuItem>
                    )}
                    
                    {/* Moderator actions */}
                    {isUserModerator && (
                      <>
                        {isAuthor && <DropdownMenuSeparator />}
                        
                        {!isApproved && (
                          <DropdownMenuItem 
                            onClick={handleApprovePost}
                            disabled={approvePost.isPending}
                          >
                            <Check className="h-4 w-4 mr-2" />
                            {isReply ? 'Approve Reply' : 'Approve Post'}
                          </DropdownMenuItem>
                        )}
                        
                        <DropdownMenuItem 
                          onClick={handlePinPost}
                          disabled={pinPost.isPending || unpinPost.isPending}
                        >
                          {isThisPostPinned ? (
                            <>
                              <PinOff className="h-4 w-4 mr-2" />
                              {isReply ? 'Unpin Reply' : 'Unpin Post'}
                            </>
                          ) : (
                            <>
                              <Pin className="h-4 w-4 mr-2" />
                              {isReply ? 'Pin Reply' : 'Pin Post'}
                            </>
                          )}
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        
                        {!isRemoved && (
                          <DropdownMenuItem 
                            onClick={handleRemovePost}
                            disabled={removePost.isPending}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {isReply ? 'Remove Reply' : 'Remove Post'}
                          </DropdownMenuItem>
                        )}
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
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
                {replies.map((reply) => {
                  const replyModerationStatus = moderationStatusMap.get(reply.id);
                  const replyApproved = isPostApproved(reply);
                  const replyRemoved = replyModerationStatus?.isRemoved ?? false;
                  const replyPinned = pinnedPosts?.some(p => p.eventId === reply.id) ?? false;
                  
                  // For non-moderators, hide unapproved replies
                  if (!isUserModerator && !replyApproved) {
                    return null;
                  }
                  
                  return (
                    <CommunityPost
                      key={reply.id}
                      event={reply}
                      communityId={communityId}
                      showReplies={false}
                      isReply={true}
                      isApproved={replyApproved}
                      isRemoved={replyRemoved}
                      isPinned={replyPinned}
                    />
                  );
                }).filter(Boolean)}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}