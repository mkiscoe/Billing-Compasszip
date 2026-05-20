import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { LayoutDashboard, Building2, GraduationCap, AlertTriangle, History, Shield, Activity, LogOut, Inbox, Receipt, FileSearch, FilePlus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const main = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Payers", url: "/payers", icon: Building2 },
  { title: "Training", url: "/training", icon: GraduationCap },
  { title: "Denials & Appeals", url: "/denials", icon: AlertTriangle },
  { title: "Invoicing", url: "/invoicing", icon: Receipt },
  { title: "Change Log", url: "/change-log", icon: History },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { isAdmin, user, signOut, roles, isClaimsTracker } = useAuth();

  const isActive = (p: string) => p === "/" ? pathname === "/" : pathname.startsWith(p);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="h-8 w-8 rounded-md bg-sidebar-primary flex items-center justify-center shrink-0">
            <Activity className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-semibold text-sidebar-foreground truncate">MedBilling KB</div>
              <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">Internal reference</div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Knowledge</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {main.map((i) => (
                <SidebarMenuItem key={i.url}>
                  <SidebarMenuButton asChild isActive={isActive(i.url)}>
                    <NavLink to={i.url} end={i.url === "/"}>
                      <i.icon className="h-4 w-4" />
                      <span>{i.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {isClaimsTracker && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/claims")}>
                    <NavLink to="/claims"><FileSearch className="h-4 w-4" /><span>Claims tracking</span></NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/admin")}>
                    <NavLink to="/admin"><Shield className="h-4 w-4" /><span>Manage</span></NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/suggestions")}>
                    <NavLink to="/suggestions"><Inbox className="h-4 w-4" /><span>Suggestions</span></NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/payer-requests")}>
                    <NavLink to="/payer-requests"><FilePlus className="h-4 w-4" /><span>Payer requests</span></NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {!collapsed && user && (
          <div className="px-2 py-2">
            <div className="text-xs text-sidebar-foreground truncate">{user.email}</div>
            <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">
              {roles[0] ?? "viewer"}
            </div>
          </div>
        )}
        <Button variant="ghost" size="sm" className="justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" onClick={signOut}>
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Sign out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
