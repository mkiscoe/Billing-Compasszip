import { useEffect } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/lib/auth";
import { GlobalSearch } from "@/components/GlobalSearch";
import { supabase } from "@/integrations/supabase/client";

export default function AppLayout() {
  const { session, loading } = useAuth();

  // Track each new login session and increment login_count in profiles.
  // Uses last_sign_in_at as a stable session marker stored in localStorage.
  useEffect(() => {
    if (!session?.user) return;
    const uid = session.user.id;
    const lastSignIn = (session.user as any).last_sign_in_at ?? "";
    const key = `login_tracked_${uid}`;
    if (localStorage.getItem(key) === lastSignIn) return; // already counted this session
    localStorage.setItem(key, lastSignIn);
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("login_count,first_login_at")
        .eq("id", uid)
        .single();
      await supabase.from("profiles").update({
        login_count: (profile?.login_count ?? 0) + 1,
        first_login_at: profile?.first_login_at ?? new Date().toISOString(),
      }).eq("id", uid);
    })();
  }, [session?.user?.id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!session) return <Navigate to="/auth" replace />;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-2 border-b bg-card px-3 sticky top-0 z-30">
            <SidebarTrigger />
            <div className="flex-1 max-w-xl"><GlobalSearch /></div>
          </header>
          <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
