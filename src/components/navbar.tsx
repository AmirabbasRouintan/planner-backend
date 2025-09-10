import { Link, useLocation } from "react-router-dom";
import { Home, Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const location = useLocation();

  const navItems = [
    { path: "/home", icon: Home },
    { path: "/planner", icon: Calendar },
    { path: "/auth", icon: User }
  ];

  return (
    <>
      {/* Mobile navbar - fixed at bottom with top border */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background z-10 p-1.5 md:hidden">
        <div className="flex justify-around items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Button
                key={item.path}
                variant={isActive ? "outline" : "ghost"}
                size="icon"
                className={`flex-1 h-12 text-foreground ${
                  isActive ? "border" : "border border-transparent"
                }`}
                asChild
              >
                <Link to={item.path}>
                  <Icon className="h-5 w-5" />
                </Link>
              </Button>
            );
          })}
        </div>
      </nav>

      {/* Desktop dock-style navbar */}
      <nav className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-background/80 backdrop-blur-md border border-border rounded-2xl p-2 z-10 hidden md:flex">
        <div className="flex justify-around items-center space-x-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Button
                key={item.path}
                variant={isActive ? "outline" : "ghost"}
                size="icon"
                className="h-12 w-12 rounded-lg text-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-300 hover:scale-110"
                asChild
              >
                <Link to={item.path}>
                  <Icon className="h-6 w-6" />
                </Link>
              </Button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
