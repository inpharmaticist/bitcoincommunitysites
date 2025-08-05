import { useSeoMeta } from '@unhead/react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Navigation } from '@/components/Navigation';
import { Calendar, Users, BookOpen } from 'lucide-react';
import { siteConfig } from '@/lib/config';

export default function Index() {
  // Use immediate config values (no loading delay)
  const siteTitle = siteConfig.siteTitle;
  const description = siteConfig.siteDescription;

  useSeoMeta({
    title: `${siteTitle} - Bitcoin Community`,
    description: description,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-accent/20">
      <Navigation />

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              {siteTitle}
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8">
              {description}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {siteConfig.enableEvents && (
                <Link to="/events">
                  <Button size="lg" className="w-full sm:w-auto">
                    <Calendar className="mr-2 h-5 w-5" />
                    View Upcoming Events
                  </Button>
                </Link>
              )}
              {siteConfig.aboutNaddr && (
                <Link to="/about">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    Learn More About Us
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-4xl mx-auto justify-items-center">
            {siteConfig.enableEvents && (
              <Card className="bg-card/50 backdrop-blur border-primary/20">
                <CardContent className="p-6">
                  <Calendar className="h-12 w-12 text-primary mb-4" />
                  <h3 className="text-xl font-semibold mb-2">{siteConfig.featureBoxes.box1.title}</h3>
                  <p className="text-muted-foreground">
                    {siteConfig.featureBoxes.box1.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {siteConfig.enableBlog && (
              <Card className="bg-card/50 backdrop-blur border-primary/20">
                <CardContent className="p-6">
                  <BookOpen className="h-12 w-12 text-primary mb-4" />
                  <h3 className="text-xl font-semibold mb-2">{siteConfig.featureBoxes.box2.title}</h3>
                  <p className="text-muted-foreground">
                    {siteConfig.featureBoxes.box2.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {siteConfig.enableRsvp && (
              <Card className="bg-card/50 backdrop-blur border-primary/20">
                <CardContent className="p-6">
                  <Users className="h-12 w-12 text-primary mb-4" />
                  <h3 className="text-xl font-semibold mb-2">{siteConfig.featureBoxes.box3.title}</h3>
                  <p className="text-muted-foreground">
                    {siteConfig.featureBoxes.box3.description}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {siteConfig.enableEvents && (
        <section className="py-16 px-4">
          <div className="container mx-auto text-center">
            <Card className="max-w-2xl mx-auto bg-primary text-primary-foreground">
              <CardContent className="p-8">
                <h2 className="text-3xl font-bold mb-4">Ready to Join Us?</h2>
                <p className="text-lg mb-6 opacity-90">
                  Whether you're new to Bitcoin or a seasoned veteran, you'll find a welcoming community at our gatherings.
                </p>
                <Link to="/events">
                  <Button size="lg" variant="secondary">
                    See Our Next Event
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-8 px-4 border-t">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} {siteTitle}</p>
          <p className="mt-2">
            <a href="https://soapbox.pub/mkstack" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
              Vibed with MKStack
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}