import { useState } from 'react';
import { useSeoMeta } from '@unhead/react';
import { Navigation } from '@/components/Navigation';
import { CommunityHeader } from '@/components/community/CommunityHeader';
import { CommunityPostForm } from '@/components/community/CommunityPostForm';
import { CommunityFeed } from '@/components/community/CommunityFeed';
import { CommunityManagement } from '@/components/community/CommunityManagement';
import { siteConfig } from '@/lib/config';

export default function Community() {
  const [showManagement, setShowManagement] = useState(false);
  const siteTitle = siteConfig.siteTitle;

  useSeoMeta({
    title: `Community - ${siteTitle}`,
    description: `Join the community discussion on ${siteTitle}`,
  });

  if (!siteConfig.communityId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-accent/20">
        <Navigation />
        <div className="pt-24 pb-16 px-4">
          <div className="container mx-auto text-center">
            <p className="text-muted-foreground">
              Community features are not configured for this site.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-accent/20">
      <Navigation />
      
      {/* Main Content */}
      <div className="pt-24 pb-16 px-4">
        <div className="w-full mx-auto px-2 sm:px-4 sm:container sm:max-w-4xl">
          <div className="space-y-6">
            {showManagement ? (
              <CommunityManagement 
                communityId={siteConfig.communityId} 
                onClose={() => setShowManagement(false)}
              />
            ) : (
              <>
                {/* Community Header */}
                <CommunityHeader 
                  communityId={siteConfig.communityId} 
                  onManagementClick={() => setShowManagement(true)}
                />
                
                {/* Post Creation Form */}
                <CommunityPostForm communityId={siteConfig.communityId} />
                
                {/* Community Feed */}
                <CommunityFeed communityId={siteConfig.communityId} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}