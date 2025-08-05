import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";
import { lazy, Suspense } from "react";
import { siteConfig } from "@/lib/config";

import Index from "./pages/Index";
import { NIP19Page } from "./pages/NIP19Page";
import NotFound from "./pages/NotFound";

// Lazy load pages based on configuration
const Events = lazy(() => import("./pages/Events"));
const EventPost = lazy(() => import("./pages/EventPost"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const About = lazy(() => import("./pages/About"));
const Social = lazy(() => import("./pages/Social"));

export function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Index />} />
        
        {/* Conditionally render routes based on configuration */}
        {siteConfig.enableEvents && (
          <>
            <Route path="/events" element={
              <Suspense fallback={<div>Loading...</div>}>
                <Events />
              </Suspense>
            } />
            <Route path="/events/:naddr" element={
              <Suspense fallback={<div>Loading...</div>}>
                <EventPost />
              </Suspense>
            } />
          </>
        )}
        
        {siteConfig.enableBlog && (
          <>
            <Route path="/blog" element={
              <Suspense fallback={<div>Loading...</div>}>
                <Blog />
              </Suspense>
            } />
            <Route path="/blog/:naddr" element={
              <Suspense fallback={<div>Loading...</div>}>
                <BlogPost />
              </Suspense>
            } />
          </>
        )}
        
        {siteConfig.aboutNaddr && (
          <Route path="/about" element={
            <Suspense fallback={<div>Loading...</div>}>
              <About />
            </Suspense>
          } />
        )}
        
        {siteConfig.communityId && (
          <Route path="/social" element={
            <Suspense fallback={<div>Loading...</div>}>
              <Social />
            </Suspense>
          } />
        )}
        
        {/* NIP-19 route for npub1, note1, naddr1, nevent1, nprofile1 */}
        <Route path="/:nip19" element={<NIP19Page />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
export default AppRouter;