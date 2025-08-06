import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, MessageSquare } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthor } from '@/hooks/useAuthor';
import { useCommunityActions } from '@/hooks/useCommunityActions';
import { useToast } from '@/hooks/useToast';
import { LoginArea } from '@/components/auth/LoginArea';
import { genUserName } from '@/lib/genUserName';
import { useOptimisticCommunity } from '@/hooks/useOptimisticCommunity';

interface CommunityPostFormProps {
  communityId: string;
}

export function CommunityPostForm({ communityId }: CommunityPostFormProps) {
  const [content, setContent] = useState('');
  const { user } = useCurrentUser();
  const author = useAuthor(user?.pubkey || '');
  const { publishPost } = useCommunityActions(communityId);
  const { toast } = useToast();
  const { addOptimisticPost } = useOptimisticCommunity(communityId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast({
        title: "Error",
        description: "Please enter some content for your post.",
        variant: "destructive",
      });
      return;
    }

    // Add optimistic post immediately
    addOptimisticPost(content.trim());
    
    // Clear form immediately for better UX
    const contentToPost = content.trim();
    setContent('');

    try {
      await publishPost.mutateAsync({ 
        content: contentToPost,
        communityId,
      });
      
      toast({
        title: "Post published!",
        description: "Your post has been shared with the community.",
      });
    } catch (error) {
      console.error('Post error:', error);
      
      // Restore form content on error
      setContent(contentToPost);
      
      toast({
        title: "Error",
        description: "Failed to publish post. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="py-8 text-center p-3 sm:p-6">
          <div className="max-w-sm mx-auto space-y-4">
            <p className="text-muted-foreground">
              Join the conversation in the community
            </p>
            <LoginArea className="w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const metadata = author.data?.metadata;
  const displayName = metadata?.name ?? genUserName(user.pubkey);
  const profileImage = metadata?.picture;

  return (
    <Card>
      <CardHeader className="p-3 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5 text-primary" />
          Share with the Community
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-start space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={profileImage} alt={displayName} />
              <AvatarFallback className="text-sm">
                {displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3">
              <Textarea
                placeholder="Share your thoughts with the community..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[100px] resize-none"
                disabled={publishPost.isPending}
              />
              
              <div className="flex items-center justify-end">
                <Button 
                  type="submit" 
                  disabled={!content.trim() || publishPost.isPending}
                  size="sm"
                >
                  {publishPost.isPending ? (
                    'Publishing...'
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Post
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}