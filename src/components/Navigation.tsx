import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LoginArea } from '@/components/auth/LoginArea';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { siteConfig } from '@/lib/config';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const { user } = useCurrentUser();

  // Use immediate site title from config (no loading delay)
  const siteTitle = siteConfig.siteTitle;

  // Build navigation items based on enabled features
  const navItems = [
    { path: '/', label: 'Home', enabled: true },
  ];

  if (siteConfig.enableEvents) {
    navItems.push({ path: '/events', label: 'Events', enabled: true });
  }

  if (siteConfig.enableBlog) {
    navItems.push({ path: '/blog', label: 'Blog', enabled: true });
  }

  if (siteConfig.aboutNaddr) {
    navItems.push({ path: '/about', label: 'About', enabled: true });
  }

  // Show Social tab only for signed-in users when community is configured
  if (user && siteConfig.communityId) {
    navItems.push({ path: '/social', label: 'Social', enabled: true });
  }

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Title */}
          <Link to="/" className="font-bold text-xl">
            {siteTitle}
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={isActive(item.path) ? 'default' : 'ghost'}
                  size="sm"
                >
                  {item.label}
                </Button>
              </Link>
            ))}
            <LoginArea className="ml-4" />
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMenuOpen(false)}
              >
                <Button
                  variant={isActive(item.path) ? 'default' : 'ghost'}
                  size="sm"
                  className="w-full justify-start"
                >
                  {item.label}
                </Button>
              </Link>
            ))}
            <div className="pt-4 border-t">
              <LoginArea className="w-full" />
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}