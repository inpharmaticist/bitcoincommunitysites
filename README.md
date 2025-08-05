# Bitcoin Community Sites

A configurable Bitcoin community website built on Nostr, powered by React and TailwindCSS. Create beautiful, decentralized community sites that individual Bitcoin groups can customize and deploy.

![Built with Nostr](https://img.shields.io/badge/Built%20with-Nostr-purple?style=for-the-badge)
![React](https://img.shields.io/badge/React-18.x-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=for-the-badge&logo=typescript)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.x-cyan?style=for-the-badge&logo=tailwindcss)

## 🚀 Features

### 📅 **Events System**
- **NIP-52 Calendar Events**: Display upcoming Bitcoin community events
- **Multi-relay Support**: Query events from multiple Nostr relays
- **Event Details**: Rich event information with dates, locations, and descriptions
- **RSVP Functionality**: Allow users to RSVP to events (configurable)

### 📝 **Blog Platform**  
- **Multi-Author Support**: Display posts from organizer + additional contributors
- **NIP-23 Long-form Content**: Full blog posts with rich formatting
- **Individual Post Pages**: Dedicated pages for each blog post with SEO optimization
- **Comments & Reactions**: NIP-22 threaded comments and NIP-25 emoji reactions
- **Dynamic Routing**: SEO-friendly URLs using Nostr naddr identifiers

### 💬 **Community Social**
- **NIP-72 Communities**: Optional community discussion pages
- **Authenticated Access**: Social features only for signed-in users
- **Threaded Discussions**: Full conversation threading with replies
- **Community Management**: Join requests and moderation support

### 🔐 **Nostr Authentication**
- **NIP-07 Browser Extension**: Seamless login with Alby, nos2x, etc.
- **Multi-Account Support**: Switch between different Nostr accounts
- **Profile Management**: Edit profile information directly in the app

### 🎨 **Customizable Design**
- **Environment-Based Config**: Fully customizable via `.env` file
- **Dynamic Feature Boxes**: Configure homepage content boxes
- **Responsive Design**: Mobile-first, works on all devices
- **Light/Dark Mode**: Automatic theme switching support

### ⚡ **Performance & Developer Experience**
- **Vite Build System**: Fast development and optimized production builds
- **TypeScript**: Full type safety throughout the application
- **Component Library**: shadcn/ui components for consistent design
- **Real-time Updates**: Live content updates via Nostr subscriptions

## 🛠️ Technology Stack

- **Frontend**: React 18.x with TypeScript
- **Styling**: TailwindCSS 3.x + shadcn/ui components
- **Build Tool**: Vite for fast development and production builds
- **Nostr Integration**: @nostrify/react for protocol interactions
- **State Management**: TanStack Query for data fetching and caching
- **Routing**: React Router with dynamic route generation
- **Forms**: React Hook Form with validation
- **Testing**: Vitest + React Testing Library

## 📦 Quick Start

### Prerequisites

- Node.js 18+ and npm
- A Nostr keypair (npub for your community organizer)
- Optional: NIP-72 community ID for social features

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd meetupsites
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure your community**
   
   Create a `.env` file in the project root and add your community details:
   ```bash
   # Required: Your meetup organizer's npub
   VITE_MEETUP_NPUB=npub1your_organizer_pubkey_here
   
   # Required: Site branding
   VITE_SITE_TITLE=Your Bitcoin Meetup
   VITE_SITE_DESCRIPTION=Join our Bitcoin community gatherings
   
   # Optional: Enable features as needed
   VITE_ENABLE_BLOG=true
   VITE_ENABLE_EVENTS=true
   VITE_ENABLE_RSVP=true
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

## ⚙️ Configuration Guide

### Required Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_MEETUP_NPUB` | Organizer's Nostr public key | `npub1abc123...` |
| `VITE_SITE_TITLE` | Your community name | `Denver Bitcoin Community` |
| `VITE_SITE_DESCRIPTION` | Short description | `Join 200+ Bitcoiners in Denver` |

### Optional Features

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_ENABLE_BLOG` | `true` | Show blog page with long-form posts |
| `VITE_ENABLE_EVENTS` | `true` | Show events page with NIP-52 calendar |
| `VITE_ENABLE_RSVP` | `true` | Allow RSVPs to events |
| `VITE_ENABLE_SOCIAL` | `false` | Enable organizer's social notes |

### Advanced Configuration

#### Multi-Author Blog
```bash
# Add additional blog authors (comma-separated npubs)
VITE_BLOG_AUTHORS=npub1author1...,npub1author2...,npub1author3...
```

#### Custom About Page
```bash
# Use a specific Nostr long-form post as your About page
VITE_ABOUT_NADDR=naddr1your_about_post_address_here
```

#### Community Social Features
```bash
# Enable NIP-72 community discussion page
VITE_COMMUNITY_ID=34550:pubkey:community_identifier
```

#### Homepage Customization
```bash
# Customize the 3 feature boxes on your homepage
VITE_FEATURE_BOX_1_TITLE=Events
VITE_FEATURE_BOX_1_DESCRIPTION=Stay updated with our upcoming Bitcoin community events

VITE_FEATURE_BOX_2_TITLE=Blog  
VITE_FEATURE_BOX_2_DESCRIPTION=Read insights from our community

VITE_FEATURE_BOX_3_TITLE=RSVP
VITE_FEATURE_BOX_3_DESCRIPTION=Reserve your spot at our next event
```

#### Relay Configuration
```bash
# Override default relays (comma-separated)
VITE_DEFAULT_RELAYS=wss://relay.damus.io,wss://relay.nostr.band
```

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui component library
│   ├── auth/           # Authentication components
│   ├── community/      # NIP-72 community features
│   └── comments/       # NIP-22 commenting system
├── hooks/              # Custom React hooks
│   ├── useNostr.ts     # Core Nostr integration
│   ├── useAuthor.ts    # Profile data fetching
│   ├── useBlogPosts.ts # Multi-author blog queries
│   ├── useReactions.ts # NIP-25 reaction system
│   └── useCommunity*.ts # Community-related hooks
├── pages/              # Route components
│   ├── Index.tsx       # Homepage
│   ├── Blog.tsx        # Blog listing page
│   ├── BlogPost.tsx    # Individual blog post pages
│   ├── Events.tsx      # Events listing page
│   ├── Social.tsx      # Community social page
│   └── About.tsx       # About page (if configured)
├── lib/                # Utility functions
│   ├── config.ts       # Environment configuration
│   ├── community.ts    # NIP-72 utilities
│   └── utils.ts        # General utilities
└── contexts/           # React context providers
```

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run tests and linting
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript checks

### Adding Features

1. **New Pages**: Add to `src/pages/` and update `AppRouter.tsx`
2. **New Components**: Follow shadcn/ui patterns in `src/components/`
3. **New Hooks**: Add custom hooks to `src/hooks/`
4. **Configuration**: Add new options to `src/lib/config.ts`

### Testing

The project includes comprehensive testing:
- **Unit Tests**: Component and utility function tests
- **Integration Tests**: Full user workflows
- **Type Safety**: TypeScript compilation validation
- **Code Quality**: ESLint and Prettier checks

## 🌐 Nostr Protocol Integration

This project implements several Nostr Improvement Proposals (NIPs):

- **NIP-01**: Basic protocol flow and event structure
- **NIP-07**: Browser extension authentication
- **NIP-19**: Bech32-encoded identifiers (npub, naddr, etc.)
- **NIP-22**: Threaded comments with proper threading
- **NIP-23**: Long-form content for blog posts
- **NIP-25**: Reactions (likes, dislikes, emoji reactions)
- **NIP-52**: Calendar events for meetup scheduling
- **NIP-72**: Moderated communities for social features

### Relay Usage

The application connects to multiple Nostr relays by default:
- `relay.damus.io` - General purpose relay
- `relay.nostr.band` - Content aggregation relay  
- `relay.primal.net` - Popular client relay

Users can customize relay configuration via environment variables.

## 🚀 Deployment

### GitHub Pages (Recommended)

Deploy your Bitcoin community site for free using GitHub Pages:

#### 1. Fork & Configure

1. **Fork this repository** to your GitHub account

2. **Edit the `.env` file** directly on GitHub:
   - Navigate to the `.env` file in your forked repository
   - Click the pencil icon to edit
   - Update with your community configuration:
   ```bash
   # Required: Your community organizer's npub
   VITE_MEETUP_NPUB=npub1your_organizer_pubkey_here
   
   # Required: Site branding
   VITE_SITE_TITLE=Your Bitcoin Community
   VITE_SITE_DESCRIPTION=Join our Bitcoin community gatherings
   
   # Optional: Enable features as needed
   VITE_ENABLE_BLOG=true
   VITE_ENABLE_EVENTS=true
   VITE_ENABLE_RSVP=true
   ```
   - Click "Commit changes" to save

#### 2. Enable GitHub Pages

1. **Go to your repository** on GitHub
2. **Click "Settings"** tab
3. **Scroll to "Pages"** in the left sidebar
4. **Configure Source**:
   - **Source**: Deploy from a branch
   - **Branch**: `main`
   - **Folder**: `/ (root)`
5. **Click "Save"**

GitHub will automatically build and deploy your site whenever you make changes to the `main` branch.

Your site will be available at: `https://YOUR_USERNAME.github.io/bitcoincommunitysites/`

#### 3. Custom Domain (Optional)

To use your own domain:

1. **Configure DNS** at your domain provider:
   - Add a CNAME record pointing to `YOUR_USERNAME.github.io`

2. **Update GitHub Pages settings**:
   - Go to Settings > Pages  
   - In the "Custom domain" field, enter your domain (e.g., `yourmeetup.com`)
   - Click "Save"
   - Enable "Enforce HTTPS" (recommended)

GitHub will automatically create the CNAME file in your repository.

### Other Static Hosting Options

The app builds to static files and works with any static hosting provider:

- **Netlify**: Connect your Git repo for automatic deployments
- **Vercel**: Zero-config deployment with Git integration  
- **IPFS**: Decentralized hosting via InterPlanetary File System

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

### Environment Variables in Production

Make sure to set your production environment variables:
- Set `VITE_MEETUP_NPUB` to your actual organizer npub
- Configure `VITE_SITE_TITLE` and `VITE_SITE_DESCRIPTION`
- Enable desired features (`VITE_ENABLE_*`)
- Set custom relay configuration if needed

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Use existing component patterns
- Add tests for new features
- Update documentation as needed
- Follow the existing code style

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Nostr Protocol**: Built on the decentralized Nostr protocol
- **shadcn/ui**: Beautiful, accessible UI components
- **MKStack**: Powered by the MKStack framework
- **Bitcoin Community**: Inspired by Bitcoin communities worldwide

## 📞 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Report bugs via GitHub Issues
- **Community**: Join the discussion on Nostr using the community features

---

**Vibed with [MKStack](https://soapbox.pub/mkstack)** 🚀

*Building the decentralized future, one community at a time.*