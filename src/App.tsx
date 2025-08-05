// NOTE: This file should normally not be modified unless you are adding a new provider.
// To add new routes, edit the AppRouter.tsx file.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createHead, UnheadProvider } from '@unhead/react/client';
import { InferSeoMetaPlugin } from '@unhead/addons';
import { Suspense } from 'react';
import NostrProvider from '@/components/NostrProvider';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NostrLoginProvider } from '@nostrify/react/login';
import { AppProvider } from '@/components/AppProvider';
import { NWCProvider } from '@/contexts/NWCContext';
import { AppConfig } from '@/contexts/AppContext';
import AppRouter from './AppRouter';
import { siteConfig } from '@/lib/config';

const head = createHead({
  plugins: [
    InferSeoMetaPlugin(),
  ],
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60000, // 1 minute
      gcTime: Infinity,
    },
  },
});

const defaultConfig: AppConfig = {
  theme: "light",
  relayUrl: siteConfig.defaultRelays[0], // Use first configured relay as default
};

// Create preset relays including configured ones
const configuredRelays = siteConfig.defaultRelays.map(url => {
  const domain = url.replace(/^wss?:\/\//, '');
  const name = domain === 'relay.nostr.band' ? 'Nostr.Band' :
              domain === 'relay.damus.io' ? 'Damus' :
              domain === 'relay.primal.net' ? 'Primal' :
              domain === 'relay.chorus.community' ? 'Chorus' :
              domain === 'relay.lexingtonbitcoin.org' ? 'Lexington Bitcoin' :
              domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
  return { url, name };
});

const fallbackRelays = [
  { url: 'wss://ditto.pub/relay', name: 'Ditto' },
];

const presetRelays = [...configuredRelays, ...fallbackRelays];

export function App() {
  return (
    <UnheadProvider head={head}>
      <AppProvider storageKey="nostr:app-config" defaultConfig={defaultConfig} presetRelays={presetRelays}>
        <QueryClientProvider client={queryClient}>
          <NostrLoginProvider storageKey='nostr:login'>
            <NostrProvider>
              <NWCProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <Suspense>
                    <AppRouter />
                  </Suspense>
                </TooltipProvider>
              </NWCProvider>
            </NostrProvider>
          </NostrLoginProvider>
        </QueryClientProvider>
      </AppProvider>
    </UnheadProvider>
  );
}

export default App;
