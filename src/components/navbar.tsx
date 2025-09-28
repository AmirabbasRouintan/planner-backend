import { Link, useLocation } from "react-router-dom";
import { Home, Calendar, User, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import type { ComponentType } from "react";

// Define a consistent type for nav items
type NavItem = {
  path: string;
  icon: ComponentType<any>;
  label?: string;
  isV2Ray?: boolean;
};

export default function Navbar() {
  const location = useLocation();
  const { user, isAuthenticated, isAdmin, hasV2RayAccess, isV2RayAdmin } = useAuth();

  const baseNavItems: NavItem[] = [
    { path: "/home", icon: Home },
    { path: "/planner", icon: Calendar },
    { path: "/calendar", icon: Calendar },
    { path: "/auth", icon: User, label: isAuthenticated ? (user?.username?.substring(0, 3) || user?.name?.substring(0, 3) || "...") : undefined }
  ];
  
  const navItems: NavItem[] = (isAdmin || isV2RayAdmin || hasV2RayAccess)
    ? [...baseNavItems, { path: "/v2ray", icon: Wifi, label: "V2Ray", isV2Ray: true }]
    : baseNavItems;

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-background p-2 z-10 md:hidden">
        <div className="flex justify-around items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            const isV2Ray = item.isV2Ray;

            return (
              <Button
                key={item.path}
                variant={isActive ? "outline" : "ghost"}
                size="icon"
                className={`flex-1 h-12 ${
                  isV2Ray 
                    ? isActive 
                      ? "border-2 border-green-500 bg-gradient-to-br from-green-500/20 to-emerald-600/20 dark:from-green-600/30 dark:to-emerald-700/30 text-green-600 dark:text-green-300 shadow-[0_0_8px_rgba(34,197,94,0.3)]" 
                      : "border border-green-300 dark:border-green-700 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/50 dark:to-emerald-950/50 text-green-500 dark:text-green-400"
                    : isActive 
                      ? "border text-foreground" 
                      : "border border-transparent text-foreground"
                }`}
                asChild
              >
                <Link to={item.path} className="flex flex-col items-center justify-center">
                  <Icon className={`h-5 w-5 ${isV2Ray ? "text-current" : ""}`} />
                  {item.label && (
                    <span className={`text-xs mt-1 truncate max-w-[60px] ${isV2Ray ? "font-semibold" : ""}`}>
                      {item.label}
                    </span>
                  )}
                </Link>
              </Button>
            );
          })}
        </div>
      </nav>

      <nav className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-background/80 backdrop-blur-md border border-border rounded-3xl p-1.5 z-10 hidden md:flex">
        <div className="flex justify-around items-center space-x-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            const isV2Ray = item.isV2Ray;

            return (
              <Button
                key={item.path}
                variant={isActive ? "outline" : "ghost"}
                size="icon"
                className={`h-14 w-14 rounded-xl transition-all duration-300 hover:scale-90 ${
                  isV2Ray
                    ? isActive
                      ? "border-2 border-green-500 bg-gradient-to-br from-green-500/20 to-emerald-600/20 dark:from-green-600/30 dark:to-emerald-700/30 text-green-600 dark:text-green-300 shadow-[0_0_12px_rgba(34,197,94,0.4)] hover:shadow-[0_0_16px_rgba(34,197,94,0.6)]" 
                      : "border border-green-300 dark:border-green-700 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/50 dark:to-emerald-950/50 text-green-500 dark:text-green-400 hover:bg-gradient-to-br hover:from-green-100/70 hover:to-emerald-100/70 dark:hover:from-green-900/70 dark:hover:to-emerald-900/70"
                    : "text-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
                asChild
              >
                <Link to={item.path} className="flex flex-col items-center justify-center">
                  <Icon className={`h-7 w-7 ${isV2Ray ? "text-current" : ""}`} />
                  {item.label && (
                    <span className={`text-xs mt-1 truncate max-w-[60px] ${isV2Ray ? "font-semibold" : ""}`}>
                      {item.label}
                    </span>
                  )}
                </Link>
              </Button>
            );
          })}
        </div>
      </nav>
    </>
  );
}