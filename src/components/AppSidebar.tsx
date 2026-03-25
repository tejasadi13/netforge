import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Network, Save, Building2, Shield, Server,
  User, Settings, LogOut, ChevronLeft, ChevronRight, ShieldCheck, Router
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Create Topology", icon: Network, path: "/dashboard/create" },
  { label: "Saved Topologies", icon: Save, path: "/dashboard/saved" },
  { label: "Departments", icon: Building2, path: "/dashboard/departments" },
  { label: "Security Analysis", icon: Shield, path: "/dashboard/security" },
  { label: "Cisco", icon: Router, path: "/dashboard/cisco" },
  { label: "GNS3 Integration", icon: Server, path: "/dashboard/gns3" },
  { label: "Profile", icon: User, path: "/dashboard/profile" },
];

const adminItems = [
  { label: "Admin Panel", icon: Settings, path: "/dashboard/admin" },
];

export default function AppSidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const allItems = user?.role === "admin" ? [...navItems, ...adminItems] : navItems;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className={cn(
      "flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 sticky top-0",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 border-b border-sidebar-border">
        <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
          <Network className="h-5 w-5 text-primary" />
        </div>
        {!collapsed && <span className="text-lg font-bold text-primary glow-text">NetForge</span>}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {allItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/dashboard"}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
        {!collapsed && user && (
          <div className="px-3 py-2 rounded-lg bg-sidebar-accent/50">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
              {user.role === "admin" && (
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-primary">
                  Admin
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground capitalize flex items-center gap-1">
              {user.role === "admin" && <ShieldCheck className="h-3 w-3 text-primary" />}
              {user.role}
            </p>
          </div>
        )}
        <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 w-full transition-colors">
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
        <button onClick={() => setCollapsed(!collapsed)} className="flex items-center justify-center w-full py-1.5 rounded-lg text-muted-foreground hover:bg-sidebar-accent transition-colors">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
}
