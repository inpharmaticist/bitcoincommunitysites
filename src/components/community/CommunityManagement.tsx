import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Users, 
  Pin, 
  MessageSquare, 
  Shield,
  Settings,
  X,
  Check,
  XCircle,
  UserPlus,
  UserMinus,
  Clock,
  Trash2,
  Crown
} from 'lucide-react';
import { useCommunity } from '@/hooks/useCommunity';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthor } from '@/hooks/useAuthor';
import { isModerator } from '@/lib/community';
import { genUserName } from '@/lib/genUserName';
import { useJoinRequests, useMemberLists, usePinnedPosts, useCommunityActions, useCommunityPosts, useModerationLogs, type CommunityPost, type ModerationAction } from '@/hooks/useCommunityManagement';
import { ModeratorManagement } from './ModeratorManagement';
import { useToast } from '@/hooks/useToast';

interface CommunityManagementProps {
  communityId: string;
  onClose: () => void;
}

// Component for displaying join requests
function JoinRequestCard({ request, onApprove, onDecline, isLoading }: {
  request: { id: string; pubkey: string; created_at: number; content: string };
  onApprove: () => void;
  onDecline: () => void;
  isLoading: boolean;
}) {
  const author = useAuthor(request.pubkey);
  const metadata = author.data?.metadata;
  const displayName = metadata?.name ?? genUserName(request.pubkey);
  const profileImage = metadata?.picture;
  
  const timeAgo = new Date(request.created_at * 1000).toLocaleDateString();

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profileImage} alt={displayName} />
            <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-semibold text-sm truncate">{displayName}</p>
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {timeAgo}
              </Badge>
            </div>
            
            {request.content && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {request.content}
              </p>
            )}
            
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={onApprove}
                disabled={isLoading}
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={onDecline}
                disabled={isLoading}
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Decline
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Component for displaying community posts that need moderation
function PostModerationCard({ post, onApprove, onRemove, isLoading }: {
  post: CommunityPost;
  onApprove: () => void;
  onRemove: () => void;
  isLoading: boolean;
}) {
  const author = useAuthor(post.pubkey);
  const metadata = author.data?.metadata;
  const displayName = metadata?.name ?? genUserName(post.pubkey);
  const profileImage = metadata?.picture;
  
  const timeAgo = new Date(post.created_at * 1000).toLocaleDateString();
  
  const getStatusBadge = () => {
    if (post.isRemoved) {
      return <Badge variant="destructive" className="text-xs">Removed</Badge>;
    }
    if (post.isApproved) {
      return <Badge variant="default" className="text-xs">Approved</Badge>;
    }
    return <Badge variant="secondary" className="text-xs">Pending</Badge>;
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={profileImage} alt={displayName} />
              <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold text-sm truncate">{displayName}</p>
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {timeAgo}
                </Badge>
                {getStatusBadge()}
              </div>
              
              <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                {post.content}
              </p>
              
              {post.approvals.length > 0 && (
                <p className="text-xs text-green-600 mb-2">
                  Approved by {post.approvals.length} moderator{post.approvals.length !== 1 ? 's' : ''}
                </p>
              )}
              
              {post.removals.length > 0 && (
                <p className="text-xs text-red-600 mb-2">
                  Removed by {post.removals.length} moderator{post.removals.length !== 1 ? 's' : ''}
                </p>
              )}
              
              {!post.isRemoved && (
                <div className="flex gap-2">
                  {!post.isApproved && (
                    <Button 
                      size="sm" 
                      onClick={onApprove}
                      disabled={isLoading}
                      className="flex-1"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={onRemove}
                    disabled={isLoading}
                    className={post.isApproved ? "flex-1" : ""}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Component for displaying moderation action logs
function ModerationLogCard({ action }: { action: ModerationAction }) {
  const moderator = useAuthor(action.moderatorPubkey);
  const targetAuthor = useAuthor(action.targetAuthorPubkey);
  
  const moderatorName = moderator.data?.metadata?.name ?? genUserName(action.moderatorPubkey);
  const targetAuthorName = targetAuthor.data?.metadata?.name ?? genUserName(action.targetAuthorPubkey);
  
  const timeAgo = new Date(action.created_at * 1000).toLocaleDateString();
  
  const actionConfig = {
    approve: { icon: Check, color: 'text-green-600', bg: 'bg-green-50', label: 'Approved' },
    remove: { icon: Trash2, color: 'text-red-600', bg: 'bg-red-50', label: 'Removed' },
  };
  
  const config = actionConfig[action.action];
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border">
      <div className={`flex items-center justify-center w-8 h-8 rounded-full ${config.bg}`}>
        <Icon className={`h-4 w-4 ${config.color}`} />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-medium">{moderatorName}</span> {config.label.toLowerCase()} a post by{' '}
          <span className="font-medium">{targetAuthorName}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {timeAgo} • Post ID: {action.targetEventId.slice(0, 16)}...
        </p>
        {action.reason && (
          <p className="text-xs text-muted-foreground mt-1 italic">
            Reason: {action.reason}
          </p>
        )}
      </div>
    </div>
  );
}

// Component for displaying member lists
function MemberCard({ pubkey, type }: { pubkey: string; type: 'approved' | 'declined' | 'banned' }) {
  const author = useAuthor(pubkey);
  const metadata = author.data?.metadata;
  const displayName = metadata?.name ?? genUserName(pubkey);
  const profileImage = metadata?.picture;
  
  const typeConfig = {
    approved: { icon: Check, color: 'text-green-600', bg: 'bg-green-50', label: 'Approved' },
    declined: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Declined' },
    banned: { icon: UserMinus, color: 'text-red-600', bg: 'bg-red-50', label: 'Banned' },
  };
  
  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border">
      <Avatar className="h-8 w-8">
        <AvatarImage src={profileImage} alt={displayName} />
        <AvatarFallback className="text-xs">{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{displayName}</p>
      </div>
      
      <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${config.bg}`}>
        <Icon className={`h-3 w-3 ${config.color}`} />
        <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
      </div>
    </div>
  );
}

export function CommunityManagement({ communityId, onClose }: CommunityManagementProps) {
  const [activeTab, setActiveTab] = useState('members');
  const [showModeratorManagement, setShowModeratorManagement] = useState(false);
  const { data: community } = useCommunity(communityId);
  const { user } = useCurrentUser();
  const { toast } = useToast();
  
  // Fetch management data
  const { data: joinRequests, isLoading: joinRequestsLoading } = useJoinRequests(communityId);
  const { data: memberLists, isLoading: memberListsLoading } = useMemberLists(communityId);
  const { data: pinnedPosts, isLoading: pinnedPostsLoading } = usePinnedPosts(communityId);
  const { data: communityPosts, isLoading: communityPostsLoading } = useCommunityPosts(communityId);
  const { data: moderationLogs, isLoading: moderationLogsLoading } = useModerationLogs(communityId);
  
  // Management actions
  const { approveMember, declineMember, unpinPost, approvePost, removePost } = useCommunityActions(communityId);

  const handleApproveMember = async (pubkey: string) => {
    try {
      await approveMember.mutateAsync({ pubkey });
      toast({
        title: "Member approved",
        description: "The user has been added to the approved members list.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to approve member. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeclineMember = async (pubkey: string) => {
    try {
      await declineMember.mutateAsync({ pubkey });
      toast({
        title: "Request declined",
        description: "The join request has been declined.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to decline request. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleApprovePost = async (post: CommunityPost) => {
    try {
      await approvePost.mutateAsync({ 
        eventId: post.id, 
        eventContent: JSON.stringify({
          id: post.id,
          pubkey: post.pubkey,
          created_at: post.created_at,
          kind: 1111,
          content: post.content,
        }),
        authorPubkey: post.pubkey 
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

  const handleRemovePost = async (post: CommunityPost) => {
    try {
      const reason = prompt("Optional: Enter a reason for removing this post");
      await removePost.mutateAsync({ 
        eventId: post.id, 
        authorPubkey: post.pubkey,
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

  if (!user || !community || !isModerator(user.pubkey, community)) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">Access Denied</h3>
          <p className="text-muted-foreground text-sm">
            You don't have permission to manage this community.
          </p>
        </CardContent>
      </Card>
    );
  }

  const isOwner = community.creator === user.pubkey;
  
  // If showing moderator management, render that instead
  if (showModeratorManagement) {
    return (
      <ModeratorManagement 
        communityId={communityId} 
        onClose={() => setShowModeratorManagement(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <Settings className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Community Management
                  <Badge variant={isOwner ? "default" : "secondary"}>
                    {isOwner ? "Owner" : "Moderator"}
                  </Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Manage {community.name} community settings and content
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Management Tabs */}
      <Card>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="border-b">
              <TabsList className="grid w-full grid-cols-4 h-auto p-1">
                <TabsTrigger value="members" className="flex items-center gap-2 py-3">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Members</span>
                </TabsTrigger>
                <TabsTrigger value="content" className="flex items-center gap-2 py-3">
                  <MessageSquare className="h-4 w-4" />
                  <span className="hidden sm:inline">Content</span>
                </TabsTrigger>
                <TabsTrigger value="pinned" className="flex items-center gap-2 py-3">
                  <Pin className="h-4 w-4" />
                  <span className="hidden sm:inline">Pinned</span>
                </TabsTrigger>
                {isOwner && (
                  <TabsTrigger value="moderators" className="flex items-center gap-2 py-3">
                    <Crown className="h-4 w-4" />
                    <span className="hidden sm:inline">Moderators</span>
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            <div className="p-6">
              <TabsContent value="members" className="mt-0">
                <div className="space-y-6">
                  {/* Join Requests */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <UserPlus className="h-5 w-5" />
                      <h3 className="font-semibold">Pending Join Requests</h3>
                      {joinRequests && joinRequests.length > 0 && (
                        <Badge variant="secondary">{joinRequests.length}</Badge>
                      )}
                    </div>
                    
                    {joinRequestsLoading ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                          <Card key={i}>
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="flex-1 space-y-2">
                                  <Skeleton className="h-4 w-32" />
                                  <Skeleton className="h-3 w-48" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : joinRequests && joinRequests.length > 0 ? (
                      <ScrollArea className="h-96">
                        <div className="space-y-3">
                          {joinRequests.map((request) => (
                            <JoinRequestCard
                              key={request.id}
                              request={request}
                              onApprove={() => handleApproveMember(request.pubkey)}
                              onDecline={() => handleDeclineMember(request.pubkey)}
                              isLoading={approveMember.isPending || declineMember.isPending}
                            />
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <Card>
                        <CardContent className="py-8 text-center">
                          <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                          <p className="text-muted-foreground">No pending join requests</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  <Separator />

                  {/* Member Lists */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Users className="h-5 w-5" />
                      <h3 className="font-semibold">Member Lists</h3>
                    </div>
                    
                    {memberListsLoading ? (
                      <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map(i => (
                          <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <Skeleton className="h-4 flex-1" />
                            <Skeleton className="h-6 w-20 rounded-full" />
                          </div>
                        ))}
                      </div>
                    ) : memberLists ? (
                      <div className="space-y-4">
                        {memberLists.approved.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-green-600 mb-2">
                              Approved Members ({memberLists.approved.length})
                            </h4>
                            <div className="space-y-2">
                              {memberLists.approved.map((pubkey) => (
                                <MemberCard key={pubkey} pubkey={pubkey} type="approved" />
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {memberLists.declined.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-orange-600 mb-2">
                              Declined Requests ({memberLists.declined.length})
                            </h4>
                            <div className="space-y-2">
                              {memberLists.declined.map((pubkey) => (
                                <MemberCard key={pubkey} pubkey={pubkey} type="declined" />
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {memberLists.banned.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-red-600 mb-2">
                              Banned Users ({memberLists.banned.length})
                            </h4>
                            <div className="space-y-2">
                              {memberLists.banned.map((pubkey) => (
                                <MemberCard key={pubkey} pubkey={pubkey} type="banned" />
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {memberLists.approved.length === 0 && 
                         memberLists.declined.length === 0 && 
                         memberLists.banned.length === 0 && (
                          <Card>
                            <CardContent className="py-8 text-center">
                              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                              <p className="text-muted-foreground">No members to display</p>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="content" className="mt-0">
                <div className="space-y-6">
                  {/* Posts Requiring Moderation */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <MessageSquare className="h-5 w-5" />
                      <h3 className="font-semibold">Community Posts</h3>
                      {communityPosts && communityPosts.length > 0 && (
                        <Badge variant="secondary">{communityPosts.length}</Badge>
                      )}
                    </div>
                    
                    {communityPostsLoading ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                          <Card key={i}>
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-4 w-16" />
                                    <Skeleton className="h-4 w-20" />
                                  </div>
                                  <Skeleton className="h-4 w-full" />
                                  <Skeleton className="h-4 w-3/4" />
                                  <div className="flex gap-2 pt-2">
                                    <Skeleton className="h-8 w-20" />
                                    <Skeleton className="h-8 w-20" />
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : communityPosts && communityPosts.length > 0 ? (
                      <ScrollArea className="h-96">
                        <div className="space-y-3">
                          {communityPosts.map((post) => (
                            <PostModerationCard
                              key={post.id}
                              post={post}
                              onApprove={() => handleApprovePost(post)}
                              onRemove={() => handleRemovePost(post)}
                              isLoading={approvePost.isPending || removePost.isPending}
                            />
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <Card>
                        <CardContent className="py-8 text-center">
                          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                          <p className="text-muted-foreground">No posts to moderate</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  <Separator />

                  {/* Moderation Logs */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Shield className="h-5 w-5" />
                      <h3 className="font-semibold">Moderation Log</h3>
                      {moderationLogs && moderationLogs.length > 0 && (
                        <Badge variant="secondary">{moderationLogs.length}</Badge>
                      )}
                    </div>
                    
                    {moderationLogsLoading ? (
                      <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map(i => (
                          <div key={i} className="flex items-start gap-3 p-3 rounded-lg border">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <div className="flex-1 space-y-1">
                              <Skeleton className="h-4 w-3/4" />
                              <Skeleton className="h-3 w-1/2" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : moderationLogs && moderationLogs.length > 0 ? (
                      <ScrollArea className="h-64">
                        <div className="space-y-2">
                          {moderationLogs.map((action) => (
                            <ModerationLogCard key={action.id} action={action} />
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <Card>
                        <CardContent className="py-8 text-center">
                          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                          <p className="text-muted-foreground">No moderation actions yet</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="pinned" className="mt-0">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Pin className="h-5 w-5" />
                    <h3 className="font-semibold">Pinned Posts</h3>
                    {pinnedPosts && pinnedPosts.length > 0 && (
                      <Badge variant="secondary">{pinnedPosts.length}</Badge>
                    )}
                  </div>
                  
                  {pinnedPostsLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => (
                        <Card key={i}>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <Skeleton className="h-10 w-10 rounded-full" />
                              <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-48" />
                                <Skeleton className="h-3 w-32" />
                              </div>
                              <Skeleton className="h-8 w-20" />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : pinnedPosts && pinnedPosts.length > 0 ? (
                    <div className="space-y-3">
                      {pinnedPosts.map((pinnedPost) => (
                        <Card key={pinnedPost.eventId}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Pin className="h-5 w-5 text-yellow-600" />
                                <div>
                                  <p className="font-medium text-sm">
                                    Post ID: {pinnedPost.eventId.slice(0, 16)}...
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Pinned {new Date(pinnedPost.created_at * 1000).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => unpinPost.mutateAsync({ eventId: pinnedPost.eventId })}
                                disabled={unpinPost.isPending}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Unpin
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="py-8 text-center">
                        <Pin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="font-semibold mb-2">No Pinned Posts</h3>
                        <p className="text-muted-foreground text-sm">
                          Pinned posts will appear here when moderators pin important content.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {isOwner && (
                <TabsContent value="moderators" className="mt-0">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Crown className="h-5 w-5" />
                        <h3 className="font-semibold">Moderator Management</h3>
                      </div>
                      <Button 
                        onClick={() => setShowModeratorManagement(true)}
                        className="flex items-center gap-2"
                      >
                        <Crown className="h-4 w-4" />
                        Manage Moderators
                      </Button>
                    </div>
                    
                    <Card>
                      <CardContent className="py-8 text-center">
                        <Crown className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="font-semibold mb-2">Moderator Management</h3>
                        <p className="text-muted-foreground text-sm mb-4">
                          Promote approved members to moderators or remove existing moderators.
                        </p>
                        <Button 
                          onClick={() => setShowModeratorManagement(true)}
                          className="flex items-center gap-2"
                        >
                          <Crown className="h-4 w-4" />
                          Open Moderator Management
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              )}
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}