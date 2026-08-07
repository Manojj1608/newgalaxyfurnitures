import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, LogOut } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-admin";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ProductsPanel } from "@/components/admin/products-panel";
import { CategoriesPanel } from "@/components/admin/categories-panel";
import { HomepagePanel } from "@/components/admin/homepage-panel";
import { EnquiriesPanel } from "@/components/admin/enquiries-panel";
import { MediaPanel } from "@/components/admin/media-panel";
import { SettingsPanel } from "@/components/admin/settings-panel";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard | New Galaxy Furniture" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPage,
  errorComponent: ({ error, reset }) => (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="luxury-card max-w-md p-8 text-center">
        <p className="text-sm text-destructive">{error.message}</p>
        <Button className="mt-4" onClick={reset}>
          Retry
        </Button>
      </div>
    </div>
  ),
  notFoundComponent: () => <div>Not found</div>,
});

function AdminPage() {
  const { loading, user, isAdmin } = useAuth();
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/admin/login" });
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="luxury-card max-w-md p-8 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Access denied</p>
          <h1 className="mt-4 font-display text-4xl text-foreground">Admins only</h1>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            You are signed in as <span className="font-medium">{user?.email}</span> but do not have admin
            privileges.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button asChild variant="outlineWarm">
              <Link to="/">Go home</Link>
            </Button>
            <Button onClick={signOut}>Sign out</Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="page-shell flex flex-wrap items-center justify-between gap-4 py-5">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="story-link inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Site
            </Link>
            <div>
              <p className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
                New Galaxy Furniture
              </p>
              <h1 className="font-display text-2xl text-foreground sm:text-3xl">Admin dashboard</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:inline">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <section className="page-shell py-10">
        <Tabs defaultValue="products" className="space-y-8">
          <TabsList className="flex h-auto flex-wrap justify-start gap-1">
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="collections">Collections</TabsTrigger>
            <TabsTrigger value="homepage">Homepage</TabsTrigger>
            <TabsTrigger value="enquiries">Enquiries</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="products">
            <ProductsPanel />
          </TabsContent>
          <TabsContent value="collections">
            <CategoriesPanel />
          </TabsContent>
          <TabsContent value="homepage">
            <HomepagePanel />
          </TabsContent>
          <TabsContent value="enquiries">
            <EnquiriesPanel />
          </TabsContent>
          <TabsContent value="media">
            <MediaPanel />
          </TabsContent>
          <TabsContent value="settings">
            <SettingsPanel />
          </TabsContent>
        </Tabs>
      </section>
    </main>
  );
}
