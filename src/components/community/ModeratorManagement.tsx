import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Shield, 
  Crown, 
  UserPlus, 
  UserMinus, 
  AlertCircle,
  X
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useCommunity } from '@/hooks/useCommunity';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useMemberLists } from '@/hooks/useCommunityManagement';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useAuthor } from '@/hooks/useAuthor';
import { useToast } from '@/hooks/useToast';
import { genUserName } from '@/lib/genUserName';
import { getUniqueModerators } from '@/lib/community';

interface ModeratorManagementProps {
  communityId: string;
  onClose: () => void;
}

// Component for displaying a user card with moderator actions
function UserCard({ 
  pubkey, 
  isModerator, 
  isCreator, 
  canPromote, 
  canDemote, 
  onPromote, 
  onDemote,
  isLoading 
}: {
  pubkey: string;
  isModerator: boolean;
  isCreator: boolean;
  canPromote: boolean;
  canDemote: boolean;
  onPromote: () => void;
  onDemote: () => void;
  isLoading: boolean;
}) {
  const author = useAuthor(pubkey);
  const metadata = author.data?.metadata;
  const displayName = metadata?.name ?? genUserName(pubkey);
  const profileImage = metadata?.picture;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={profileImage} alt={displayName} />
          <AvatarFallback className="text-sm">
            {displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm">{displayName}</p>
            {isCreator && (
              <Badge variant="default" className="text-xs">
                <Crown className="h-3 w-3 mr-1" />
                Creator
              </Badge>
            )}
            {isModerator && !isCreator && (
              <Badge variant="secondary" className="text-xs">
                <Shield className="h-3 w-3 mr-1" />
                Moderator
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {pubkey.slice(0, 16)}...
          </p>
        </div>
      </div>
      
      <div className="flex gap-2">
        {canPromote && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isLoading}
              >
                <UserPlus className="h-4 w-4 mr-1" />
                Promote
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Promote to Moderator</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to promote {displayName} to moderator? 
                  They will be able to moderate posts and manage community members.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onPromote}>
                  Promote to Moderator
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        
        {canDemote && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isLoading}
              >
                <UserMinus className="h-4 w-4 mr-1" />
                Remove
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove Moderator</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to remove {displayName} as a moderator? 
                  They will lose all moderation privileges.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={onDemote}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Remove Moderator
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}

export function ModeratorManagement({ communityId, onClose }: ModeratorManagementProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const { user } = useCurrentUser();
  const { data: community } = useCommunity(communityId);
  const { data: memberLists } = useMemberLists(communityId);
  const { mutateAsync: publishEvent } = useNostrPublish();
  const { toast } = useToast();

  const isOwner = user && community && community.creator === user.pubkey;

  const handlePromoteToModerator = async (pubkey: string) => {
    if (!community || !user || !isOwner) return;

    setIsUpdating(true);
    try {
      // Create updated community definition with new moderator
      const updatedModerators = [...community.moderators, pubkey];
      
      // Build tags for the updated community definition
      const tags: string[][] = [
        ['d', community.id.split(':')[2]], // Extract identifier from communityId
      ];

      // Add name if it exists
      if (community.name) {
        tags.push(['name', community.name]);
      }

      // Add description if it exists
      if (community.description) {
        tags.push(['description', community.description]);
      }

      // Add image if it exists
      if (community.image) {
        tags.push(['image', community.image]);
      }

      // Add moderator tags (including existing ones + new one)
      updatedModerators.forEach(moderatorPubkey => {
        tags.push(['p', moderatorPubkey, '', 'moderator']);
      });

      // Add relay tags if they exist
      if (community.relays) {
        community.relays.forEach(relay => {
          tags.push(['relay', relay]);
        });
      }

      // Publish updated community definition
      await publishEvent({
        kind: 34550,
        content: '',
        tags,
      });

      toast({
        title: "Moderator promoted",
        description: "The user has been successfully promoted to moderator.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to promote user to moderator. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveModerator = async (pubkey: string) => {
    if (!community || !user || !isOwner) return;

    setIsUpdating(true);
    try {
      // Create updated community definition without the moderator
      const updatedModerators = community.moderators.filter(mod => mod !== pubkey);
      
      // Build tags for the updated community definition
      const tags: string[][] = [
        ['d', community.id.split(':')[2]], // Extract identifier from communityId
      ];

      // Add name if it exists
      if (community.name) {
        tags.push(['name', community.name]);
      }

      // Add description if it exists
      if (community.description) {
        tags.push(['description', community.description]);
      }

      // Add image if it exists
      if (community.image) {
        tags.push(['image', community.image]);
      }

      // Add remaining moderator tags
      updatedModerators.forEach(moderatorPubkey => {
        tags.push(['p', moderatorPubkey, '', 'moderator']);
      });

      // Add relay tags if they exist
      if (community.relays) {
        community.relays.forEach(relay => {
          tags.push(['relay', relay]);
        });
      }

      // Publish updated community definition
      await publishEvent({
        kind: 34550,
        content: '',
        tags,
      });

      toast({
        title: "Moderator removed",
        description: "The moderator has been successfully removed.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to remove moderator. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isOwner) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">Access Denied</h3>
          <p className="text-muted-foreground text-sm">
            Only the community creator can manage moderators.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!community || !memberLists) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  const allModerators = getUniqueModerators(community);
  const approvedMembers = memberLists.approved || [];
  
  // Members who can be promoted (approved but not already moderators)
  const promotableMembers = approvedMembers.filter(
    pubkey => !allModerators.includes(pubkey)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Moderator Management
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Manage moderators for {community.name}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Current Moderators */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Current Moderators ({allModerators.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {allModerators.map(pubkey => (
            <UserCard
              key={pubkey}
              pubkey={pubkey}
              isModerator={community.moderators.includes(pubkey)}
              isCreator={pubkey === community.creator}
              canPromote={false}
              canDemote={pubkey !== community.creator && community.moderators.includes(pubkey)}
              onPromote={() => {}}
              onDemote={() => handleRemoveModerator(pubkey)}
              isLoading={isUpdating}
            />
          ))}
        </CardContent>
      </Card>

      {/* Promote Members */}
      {promotableMembers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Promote to Moderator ({promotableMembers.length})
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Select approved members to promote to moderator status
            </p>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {promotableMembers.map(pubkey => (
                  <UserCard
                    key={pubkey}
                    pubkey={pubkey}
                    isModerator={false}
                    isCreator={false}
                    canPromote={true}
                    canDemote={false}
                    onPromote={() => handlePromoteToModerator(pubkey)}
                    onDemote={() => {}}
                    isLoading={isUpdating}
                  />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/10">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                About Moderator Management
              </p>
              <ul className="text-blue-700 dark:text-blue-300 space-y-1">
                <li>• Only approved members can be promoted to moderators</li>
                <li>• Moderators can approve/remove posts and manage members</li>
                <li>• The community creator cannot be removed as a moderator</li>
                <li>• Changes update the community definition (Kind 34550)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}