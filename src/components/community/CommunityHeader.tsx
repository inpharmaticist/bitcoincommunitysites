import React from 'react';
import { Button } from '@/components/ui/button';  
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Settings, Check, Clock, X, UserMinus } from 'lucide-react';
import { useCommunity, useCommunityJoinActions } from '@/hooks/useCommunity';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useMemberLists, useJoinRequests } from '@/hooks/useCommunityManagement';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { isModerator, getUniqueModeratorsCount } from '@/lib/community';
import { useToast } from '@/hooks/useToast';

interface CommunityHeaderProps {
  communityId: string;
  onManagementClick?: () => void;
}

export function CommunityHeader({ communityId, onManagementClick }: CommunityHeaderProps) {
  const { data: community, isLoading } = useCommunity(communityId);
  const { user } = useCurrentUser();
  const { joinCommunity } = useCommunityJoinActions(communityId);
  const { data: memberLists } = useMemberLists(communityId);
  const { data: joinRequests } = useJoinRequests(communityId);
  const { mutateAsync: publishEvent } = useNostrPublish();
  const { toast } = useToast();

  // Check user's membership status
  const userMembershipStatus = React.useMemo(() => {
    if (!user || !memberLists) return 'guest';
    
    const userPubkey = user.pubkey;
    
    if (memberLists.approved.includes(userPubkey)) {
      return 'approved';
    }
    if (memberLists.declined.includes(userPubkey)) {
      return 'declined';
    }
    if (memberLists.banned.includes(userPubkey)) {
      return 'banned';
    }
    
    // Check if user has a pending join request
    const hasPendingRequest = joinRequests?.some(request => request.pubkey === userPubkey);
    if (hasPendingRequest) {
      return 'pending';
    }
    
    return 'guest';
  }, [user, memberLists, joinRequests]);

  const isUserModerator = user && community && isModerator(user.pubkey, community);

  const handleJoinCommunity = async () => {
    try {
      await joinCommunity.mutateAsync({
        message: "I'm excited to join this community and participate in the discussions!",
      });
      toast({
        title: "Join request sent!",
        description: "Your request to join the community has been submitted to the moderators.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to send join request. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleLeaveCommunity = async () => {
    if (!confirm("Are you sure you want to leave this community?")) return;
    
    try {
      await publishEvent({
        kind: 4553, // NIP-72 extension: Leave request
        content: "I am leaving this community.",
        tags: [
          ['a', communityId], // References the target community
        ],
      });
      toast({
        title: "Left community",
        description: "You have successfully left the community.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to leave community. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (!community) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Community not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="p-3 sm:p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={community.image} alt={community.name} />
              <AvatarFallback className="text-lg font-bold bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                {community.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">
                {community.name}
              </h1>
              <p className="text-muted-foreground">
                {(() => {
                  const count = getUniqueModeratorsCount(community);
                  return `${count} moderator${count !== 1 ? 's' : ''}`;
                })()}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            {isUserModerator && onManagementClick && (
              <Button 
                onClick={onManagementClick}
                variant="outline"
                size="sm"
              >
                <Settings className="h-4 w-4 mr-2" />
                Manage
              </Button>
            )}
            {user && !isUserModerator && (
              <div className="flex items-center gap-2">
                {/* Membership Status Badge */}
                {userMembershipStatus === 'approved' && (
                  <>
                    <Badge variant="default" className="text-xs">
                      <Check className="h-3 w-3 mr-1" />
                      Member
                    </Badge>
                    <Button 
                      onClick={handleLeaveCommunity}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      <UserMinus className="h-4 w-4 mr-1" />
                      Leave
                    </Button>
                  </>
                )}
                {userMembershipStatus === 'pending' && (
                  <Badge variant="secondary" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending
                  </Badge>
                )}
                {userMembershipStatus === 'declined' && (
                  <Badge variant="outline" className="text-xs">
                    <X className="h-3 w-3 mr-1" />
                    Declined
                  </Badge>
                )}
                {userMembershipStatus === 'banned' && (
                  <Badge variant="destructive" className="text-xs">
                    <UserMinus className="h-3 w-3 mr-1" />
                    Banned
                  </Badge>
                )}
                
                {/* Join Button - Only show for guests or declined users */}
                {(userMembershipStatus === 'guest' || userMembershipStatus === 'declined') && (
                  <Button 
                    onClick={handleJoinCommunity}
                    disabled={joinCommunity.isPending}
                    size="sm"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    {joinCommunity.isPending ? 'Joining...' : userMembershipStatus === 'declined' ? 'Request Again' : 'Join Community'}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      {community.description && (
        <CardContent className="p-3 sm:p-6">
          <p className="text-sm leading-relaxed">{community.description}</p>
        </CardContent>
      )}
      
      {/* Membership Status Information */}
      {user && !isUserModerator && userMembershipStatus !== 'guest' && (
        <CardContent className="p-3 sm:p-6 pt-0">
          <div className="text-sm text-muted-foreground">
            {userMembershipStatus === 'approved' && (
              <p>✅ You are a member of this community and can participate in discussions.</p>
            )}
            {userMembershipStatus === 'pending' && (
              <p>⏳ Your join request is being reviewed by the moderators.</p>
            )}
            {userMembershipStatus === 'declined' && (
              <p>❌ Your previous join request was declined. You can submit a new request.</p>
            )}
            {userMembershipStatus === 'banned' && (
              <p>🚫 You are banned from this community and cannot participate.</p>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}