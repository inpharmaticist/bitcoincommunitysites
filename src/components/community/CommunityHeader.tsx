import { Button } from '@/components/ui/button';  
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Users } from 'lucide-react';
import { useCommunity } from '@/hooks/useCommunity';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCommunityActions } from '@/hooks/useCommunityActions';
import { isModerator, getUniqueModeratorsCount } from '@/lib/community';
import { useToast } from '@/hooks/useToast';

interface CommunityHeaderProps {
  communityId: string;
}

export function CommunityHeader({ communityId }: CommunityHeaderProps) {
  const { data: community, isLoading } = useCommunity(communityId);
  const { user } = useCurrentUser();
  const { joinCommunity } = useCommunityActions(communityId);
  const { toast } = useToast();

  const handleJoinCommunity = async () => {
    try {
      await joinCommunity.mutateAsync({
        message: "I'm excited to join this community and participate in the discussions!",
        communityId,
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

  const isUserModerator = user && isModerator(user.pubkey, community);

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
            {user && !isUserModerator && (
              <Button 
                onClick={handleJoinCommunity}
                disabled={joinCommunity.isPending}
                size="sm"
              >
                <Users className="h-4 w-4 mr-2" />
                {joinCommunity.isPending ? 'Joining...' : 'Join Community'}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      {community.description && (
        <CardContent className="p-3 sm:p-6">
          <p className="text-sm leading-relaxed">{community.description}</p>
        </CardContent>
      )}
    </Card>
  );
}