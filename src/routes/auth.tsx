import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, Lock } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Admin Sign In | Avery & Co." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AuthPage,
  errorComponent: ({ error, reset }) => (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="luxury-card max-w-md p-8 text-center">
        <p className="text-sm text-destructive">{error.message}</p>
        <Button className="mt-4" onClick={reset}>Retry</Button>
      </div>
    </div>
  ),
  notFoundComponent: () => <div>Not found</div>,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/admin" },
        });
        if (error) throw error;
        toast.success("Account created — signing you in…");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in");
      }
      navigate({ to: "/admin" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="story-link mb-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to site
        </Link>
        <div className="luxury-card p-8 sm:p-10">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-content-center rounded-full bg-wood text-wood-foreground">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground">Avery &amp; Co.</p>
              <h1 className="font-display text-3xl text-foreground">{mode === "signup" ? "Create admin account" : "Admin sign in"}</h1>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-1 rounded-full bg-secondary p-1 text-xs uppercase tracking-[0.24em]">
            <button type="button" onClick={() => setMode("signin")} className={`rounded-full px-3 py-2 transition-colors ${mode === "signin" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>Sign in</button>
            <button type="button" onClick={() => setMode("signup")} className={`rounded-full px-3 py-2 transition-colors ${mode === "signup" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>Sign up</button>
          </div>
          <form onSubmit={onSubmit} className="mt-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} className="h-11" />
            </div>
            <Button type="submit" variant="luxury" size="lg" disabled={loading} className="w-full">
              {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
            </Button>
          </form>
          <p className="mt-6 text-center text-xs leading-6 text-muted-foreground">
            {mode === "signup"
              ? "The first account becomes the site administrator automatically. Additional accounts are non-admin by default."
              : "Forgot password? Contact your workspace admin to reset access."}
          </p>
        </div>
      </div>
    </main>
  );
}
