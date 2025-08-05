// Site configuration loaded from environment variables

export interface FeatureBox {
  title: string;
  description: string;
}

export interface SiteConfig {
  // Required
  meetupNpub: string;
  siteTitle: string;
  siteDescription: string;
  
  // Optional content
  aboutNaddr?: string;
  blogAuthors?: string[]; // Additional npubs for blog authors
  communityId?: string; // NIP-72 community ID for social feature
  welcomeText: string; // Customizable welcome text for CTA section
  
  // Feature flags
  enableBlog: boolean;
  enableEvents: boolean;
  enableRsvp: boolean;
  enableSocial: boolean;
  enableDonationPage: boolean;
  
  // Feature box content
  featureBoxes: {
    box1: FeatureBox; // Events
    box2: FeatureBox; // Blog
    box3: FeatureBox; // RSVP
  };
  
  // Relay configuration
  defaultRelays: string[];
}

// Default relays if none specified
const DEFAULT_RELAYS = [
  'wss://relay.nostr.band',
  'wss://relay.damus.io',
  'wss://relay.primal.net',
  'wss://relay.chorus.community'
];

// Parse boolean environment variables
function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}

// Parse relay configuration
function parseRelays(value: string | undefined): string[] {
  if (!value || value.trim() === '') return DEFAULT_RELAYS;
  
  return value.split(',').map(relay => {
    const trimmed = relay.trim();
    // Ensure relay URLs start with wss:// or ws://
    if (!trimmed.startsWith('ws://') && !trimmed.startsWith('wss://')) {
      return `wss://${trimmed}`;
    }
    return trimmed;
  });
}

// Parse comma-separated npubs for blog authors
function parseBlogAuthors(value: string | undefined): string[] | undefined {
  if (!value || value.trim() === '') return undefined;
  
  return value.split(',')
    .map(npub => npub.trim())
    .filter(npub => npub.length > 0 && npub.startsWith('npub1'));
}

// Load and validate configuration
export function loadSiteConfig(): SiteConfig {
  const meetupNpub = import.meta.env.VITE_MEETUP_NPUB;
  const siteTitle = import.meta.env.VITE_SITE_TITLE;
  const siteDescription = import.meta.env.VITE_SITE_DESCRIPTION;
  
  if (!meetupNpub) {
    throw new Error('VITE_MEETUP_NPUB is required in .env file');
  }
  
  if (!siteTitle) {
    throw new Error('VITE_SITE_TITLE is required in .env file');
  }
  
  if (!siteDescription) {
    throw new Error('VITE_SITE_DESCRIPTION is required in .env file');
  }
  
  return {
    meetupNpub,
    siteTitle,
    siteDescription,
    aboutNaddr: import.meta.env.VITE_ABOUT_NADDR || undefined,
    blogAuthors: parseBlogAuthors(import.meta.env.VITE_BLOG_AUTHORS),
    communityId: import.meta.env.VITE_COMMUNITY_ID || undefined,
    welcomeText: import.meta.env.VITE_WELCOME_TEXT || "Whether you're new to Bitcoin or a seasoned veteran, you'll find a welcoming community at our gatherings.",
    enableBlog: parseBoolean(import.meta.env.VITE_ENABLE_BLOG, true),
    enableEvents: parseBoolean(import.meta.env.VITE_ENABLE_EVENTS, true),
    enableRsvp: parseBoolean(import.meta.env.VITE_ENABLE_RSVP, true),
    enableSocial: parseBoolean(import.meta.env.VITE_ENABLE_SOCIAL, false),
    enableDonationPage: parseBoolean(import.meta.env.VITE_ENABLE_DONATION_PAGE, false),
    featureBoxes: {
      box1: {
        title: import.meta.env.VITE_FEATURE_BOX_1_TITLE || 'Events',
        description: import.meta.env.VITE_FEATURE_BOX_1_DESCRIPTION || 'Stay updated with our upcoming Bitcoin meetups and gatherings.',
      },
      box2: {
        title: import.meta.env.VITE_FEATURE_BOX_2_TITLE || 'Blog',
        description: import.meta.env.VITE_FEATURE_BOX_2_DESCRIPTION || 'Read our latest articles about Bitcoin technology and community.',
      },
      box3: {
        title: import.meta.env.VITE_FEATURE_BOX_3_TITLE || 'RSVP',
        description: import.meta.env.VITE_FEATURE_BOX_3_DESCRIPTION || 'Reserve your spot and connect with fellow Bitcoin enthusiasts.',
      },
    },
    defaultRelays: parseRelays(import.meta.env.VITE_DEFAULT_RELAYS),
  };
}

// Export singleton config
export const siteConfig = loadSiteConfig();