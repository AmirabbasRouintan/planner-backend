import * as React from "react";
import { format, addDays, subMonths, addMonths, setMonth, setYear, getMonth, getYear } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  Plus,
  Calendar as CalendarIcon,
  RefreshCw,
  BarChart3,
  CheckSquare,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Users,
  Menu,
  X,
  Bell,
  User,
  MoreHorizontal,
  Settings,
  HelpCircle,
  LogOut,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { CalendarNotifications } from "@/components/calendar/calendar-notifications";
import type { CalendarEvent } from "./types";

interface CalendarNavProps {
  isAuthenticated: boolean;
  user: {
    id: string;
    email: string;
    name?: string;
    username: string;
    is_admin?: boolean;
    is_v2ray_admin?: boolean;
    has_v2ray_access?: boolean;
  } | null;
  logout: () => void;
  selectedDate: Date;
  setSelectedDate: React.Dispatch<React.SetStateAction<Date>>;
  setCreatingEvent: React.Dispatch<React.SetStateAction<boolean>>;
  showChecklist: boolean;
  setShowChecklist: React.Dispatch<React.SetStateAction<boolean>>;
  setShowSummary: React.Dispatch<React.SetStateAction<boolean>>;
  isRefreshing: boolean;
  saveAllAndRefresh: () => Promise<void>;
  handleImport: () => void;
  handleExport: () => void;
  events: CalendarEvent[];
  todayEvents: CalendarEvent[];
  importantEvents: CalendarEvent[];
  isScrolled: boolean;
  isSearchOpen: boolean;
  setIsSearchOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  activeSection: string;
  setActiveSection: React.Dispatch<React.SetStateAction<string>>;
}

export const CalendarNav: React.FC<CalendarNavProps> = ({
  isAuthenticated,
  user,
  logout,
  selectedDate,
  setSelectedDate,
  setCreatingEvent,
  showChecklist,
  setShowChecklist,
  setShowSummary,
  isRefreshing,
  saveAllAndRefresh,
  handleImport,
  handleExport,
  events,
  todayEvents,
  importantEvents,
  isScrolled,
  isSearchOpen,
  setIsSearchOpen,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  activeSection,
  setActiveSection
}) => {
  // Navigation items
  const navItems = [
    { id: "calendar", label: "Calendar", icon: CalendarIcon },
    { id: "tasks", label: "Tasks", icon: CheckSquare },
    { id: "teams", label: "Teams", icon: Users },
    { id: "notifications", label: "Notifications", icon: Bell }
  ];

  // Mobile bottom nav items
  const mobileNavItems = [
    { id: "calendar", label: "Calendar", icon: CalendarIcon },
    { id: "create", label: "Create", icon: Plus, isPrimary: true },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "profile", label: "Profile", icon: User }
  ];

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user?.name) return "U";
    return user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Navigation Components
  const DesktopNav = () => (
    <nav className="hidden lg:flex items-center gap-8">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeSection === item.id;

        return (
          <Button
            key={item.id}
            variant="ghost"
            className={`relative h-10 px-3 rounded-lg font-medium transition-all duration-200 ${
              isActive
                ? "text-foreground bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
            onClick={() => setActiveSection(item.id)}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="w-4 h-4 mr-2" />
            {item.label}
            {isActive && (
              <div className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary rounded-full" />
            )}
          </Button>
        );
      })}
    </nav>
  );

  const TabletNav = () => {
    const visibleItems = navItems.slice(0, 3);
    const hiddenItems = navItems.slice(3);

    return (
      <nav className="hidden sm:flex lg:hidden items-center gap-4">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <Button
              key={item.id}
              variant="ghost"
              size="icon"
              className={`relative h-10 w-10 rounded-lg transition-all duration-200 ${
                isActive
                  ? "text-foreground bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
              onClick={() => setActiveSection(item.id)}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="w-4 h-4" />
              {isActive && (
                <div className="absolute bottom-1 left-2 right-2 h-0.5 bg-primary rounded-full" />
              )}
            </Button>
          );
        })}

        {hiddenItems.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50"
                aria-label="More navigation items"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {hiddenItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;

                return (
                  <DropdownMenuItem
                    key={item.id}
                    className={`flex items-center gap-3 ${
                      isActive ? "bg-muted" : ""
                    }`}
                    onClick={() => setActiveSection(item.id)}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                    {isActive && (
                      <div className="ml-auto w-1.5 h-1.5 bg-primary rounded-full" />
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </nav>
    );
  };

  const MobileBottomNav = () => (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border sm:hidden z-40">
      <div className="flex items-center justify-around h-16 px-4">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          const isCreate = item.id === "create";

          if (isCreate) {
            return (
              <div key={item.id} className="relative -top-4">
                <Button
                  size="icon"
                  className="h-12 w-12 rounded-full shadow-lg bg-foreground text-background hover:bg-foreground/90"
                  onClick={() => setCreatingEvent(true)}
                  aria-label={item.label}
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </div>
            );
          }

          return (
            <Button
              key={item.id}
              variant="ghost"
              size="icon"
              className={`flex flex-col items-center justify-center h-16 w-16 rounded-lg transition-all duration-200 ${
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveSection(item.id)}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs mt-1 font-medium">{item.label}</span>
              {isActive && (
                <div className="absolute top-1 w-1 h-1 bg-primary rounded-full" />
              )}
            </Button>
          );
        })}
      </div>
    </nav>
  );

  const SearchComponent = () => (
    <div className="relative">
      {isSearchOpen ? (
        <div className="absolute right-0 top-0 bg-background border border-border rounded-lg shadow-lg p-1 min-w-[280px]">
          <div className="flex items-center gap-2 px-3">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <Input
              type="text"
              placeholder="Search events..."
              className="border-0 shadow-none focus-visible:ring-0 px-0 h-9"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Escape") setIsSearchOpen(false);
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => setIsSearchOpen(false)}
              aria-label="Close search"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50"
          onClick={() => setIsSearchOpen(true)}
          aria-label="Search events"
        >
          <Search className="w-4 h-4" />
        </Button>
      )}
    </div>
  );

  const ProfileDropdown = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-10 w-10 rounded-lg p-0 hover:bg-muted/50 transition-all duration-200"
          aria-label="User menu"
        >
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-muted text-foreground font-medium text-sm">
            {getUserInitials()}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="flex items-center gap-3 p-2">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted text-foreground font-medium text-xs">
            {getUserInitials()}
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {user?.name || "User"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email || ""}
            </p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="flex items-center gap-3">
          <Settings className="w-4 h-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem className="flex items-center gap-3">
          <HelpCircle className="w-4 h-4" />
          Help & Support
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="flex items-center gap-3 text-destructive focus:text-destructive"
          onClick={logout}
        >
          <LogOut className="w-4 h-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const MobileMenu = () => (
    <div
      className={`fixed inset-0 z-50 lg:hidden transition-all duration-300 ${
        isMobileMenuOpen
          ? "bg-background/80 backdrop-blur-sm"
          : "pointer-events-none"
      }`}
    >
      <div
        className={`fixed inset-y-0 left-0 w-80 bg-background border-r border-border shadow-xl transition-transform duration-300 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary text-primary-foreground">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <span className="text-lg font-semibold">Calendar</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <nav className="flex-1 p-6">
            <div className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;

                return (
                  <Button
                    key={item.id}
                    variant="ghost"
                    className={`w-full justify-start h-12 px-4 rounded-lg font-medium ${
                      isActive
                        ? "bg-primary/10 text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => {
                      setActiveSection(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    <Icon className="w-4 h-4 mr-3" />
                    {item.label}
                    {isActive && (
                      <div className="ml-auto w-2 h-2 bg-primary rounded-full" />
                    )}
                  </Button>
                );
              })}
            </div>
          </nav>

          <div className="p-6 border-t border-border">
            <ProfileDropdown />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {isAuthenticated && (
        <header
          className={`sticky top-0 z-40 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 transition-all duration-300 ${
            isScrolled ? "border-b border-border shadow-sm" : ""
          }`}
        >
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 py-4">
              {/* Top Row - Logo, Nav, Search, Profile */}
              <div className="flex items-center justify-between w-full lg:w-auto">
                <div className="flex items-center gap-4 lg:gap-8">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden h-10 w-10 rounded-lg text-foreground hover:bg-muted/50"
                    onClick={() => setIsMobileMenuOpen(true)}
                    aria-label="Open menu"
                  >
                    <Menu className="w-5 h-5" />
                  </Button>

                  <Button
                    variant="ghost"
                    className="flex items-center gap-3 h-10 px-3 rounded-lg hover:bg-muted/50 transition-all duration-200"
                    onClick={() => setActiveSection("calendar")}
                    aria-label="Go to calendar"
                  >
                    <div className="flex items-center justify-center h-6 w-6 rounded bg-primary text-primary-foreground">
                      <CalendarIcon className="w-3 h-3" />
                    </div>
                    <span className="text-lg font-semibold text-foreground hidden sm:inline">
                      Calendar
                    </span>
                  </Button>

                  <Separator
                    orientation="vertical"
                    className="h-6 hidden lg:flex"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <SearchComponent />
                  <ProfileDropdown />
                </div>
              </div>

              {/* Bottom Row - Date Navigation and Actions */}
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 w-full">
                {/* Date Navigation */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 min-w-0">
                  {/* Current Date Display */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                      <CalendarIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground truncate">
                        {format(selectedDate, "EEEE")}
                      </h1>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            className="h-auto p-0 text-sm text-muted-foreground font-medium hover:text-foreground transition-colors justify-start"
                            aria-label="Change month and year"
                          >
                            {format(selectedDate, "MMMM d, yyyy")}
                            <ChevronDown className="w-3 h-3 ml-1 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-4" align="start">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-sm">
                                Select Month & Year
                              </h4>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">
                                  Month
                                </label>
                                <Select
                                  value={getMonth(selectedDate).toString()}
                                  onValueChange={(value) =>
                                    setSelectedDate(
                                      setMonth(selectedDate, parseInt(value))
                                    )
                                  }
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Array.from({ length: 12 }, (_, i) => (
                                      <SelectItem key={i} value={i.toString()}>
                                        {format(new Date(2024, i, 1), "MMMM")}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">
                                  Year
                                </label>
                                <Select
                                  value={getYear(selectedDate).toString()}
                                  onValueChange={(value) =>
                                    setSelectedDate(
                                      setYear(selectedDate, parseInt(value))
                                    )
                                  }
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Array.from({ length: 11 }, (_, i) => {
                                      const year = getYear(new Date()) - 5 + i;
                                      return (
                                        <SelectItem
                                          key={year}
                                          value={year.toString()}
                                        >
                                          {year}
                                        </SelectItem>
                                      );
                                    })}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="flex justify-end">
                              <Button
                                onClick={() => setSelectedDate(new Date())}
                                variant="outline"
                                size="sm"
                                className="text-xs"
                              >
                                Today
                              </Button>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <Separator
                    orientation="vertical"
                    className="h-12 mx-1 hidden sm:flex"
                  />

                  {/* Navigation Controls */}
                  <nav
                    className="flex items-center gap-1 shrink-0 w-full sm:w-auto mt-2 sm:mt-0"
                    aria-label="Date navigation"
                    role="group"
                  >
                    {/* Month Navigation */}
                    <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg border border-border/50">
                      <Button
                        onClick={() =>
                          setSelectedDate(subMonths(selectedDate, 1))
                        }
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-background hover:shadow-sm transition-all duration-200"
                        aria-label="Previous month"
                      >
                        <ChevronsLeft className="w-4 h-4" />
                      </Button>

                      <Separator orientation="vertical" className="h-4" />

                      <Button
                        onClick={() => setSelectedDate(addDays(selectedDate, -1))}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-background hover:shadow-sm transition-all duration-200"
                        aria-label="Previous day"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>

                      <Button
                        onClick={() => setSelectedDate(new Date())}
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 text-xs font-semibold hover:bg-background hover:shadow-sm transition-all duration-200 min-w-[60px]"
                        aria-label="Go to today"
                      >
                        Today
                      </Button>

                      <Button
                        onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-background hover:shadow-sm transition-all duration-200"
                        aria-label="Next day"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>

                      <Separator orientation="vertical" className="h-4" />

                      <Button
                        onClick={() =>
                          setSelectedDate(addMonths(selectedDate, 1))
                        }
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-background hover:shadow-sm transition-all duration-200"
                        aria-label="Next month"
                      >
                        <ChevronsRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </nav>
                </div>

                {/* Stats and Actions */}
                <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full lg:w-auto justify-between lg:justify-end">
                  {/* Event Stats */}
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="gap-2 px-3 py-2 text-sm font-medium bg-card/80 backdrop-blur border border-border"
                      >
                        <BarChart3 className="w-4 h-4" />
                        <span>{todayEvents.length}</span>
                        <span className="hidden xs:inline">events</span>
                      </Badge>
                      {importantEvents.length > 0 && (
                        <Badge className="gap-2 px-3 py-2 text-sm font-medium bg-muted text-foreground border border-border">
                          <Star className="w-4 h-4" />
                          <span>{importantEvents.length}</span>
                          <span className="hidden xs:inline">important</span>
                        </Badge>
                      )}
                    </div>

                    <Separator
                      orientation="vertical"
                      className="h-6 hidden sm:flex"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                    <CalendarNotifications
                      events={events.map((event) => ({
                        id: event.id,
                        title: event.title,
                        startTime: new Date(event.startDate),
                        endTime: new Date(event.endDate)
                      }))}
                    />

                    <Button
                      onClick={() => setShowChecklist(!showChecklist)}
                      variant={showChecklist ? "default" : "outline"}
                      size="sm"
                      className="h-10 gap-2 px-4 rounded-lg font-medium transition-all duration-200"
                      aria-pressed={showChecklist}
                      aria-label="Toggle checklist"
                    >
                      <CheckSquare className="w-4 h-4" />
                      <span className="hidden sm:inline">Checklist</span>
                    </Button>

                    <Button
                      onClick={() => setShowSummary(true)}
                      variant="outline"
                      size="sm"
                      className="h-10 gap-2 px-4 rounded-lg font-medium border border-border hover:bg-muted"
                      aria-label="Show event summary"
                    >
                      <BarChart3 className="w-4 h-4" />
                      <span className="hidden sm:inline">Summary</span>
                    </Button>

                    <Button
                      onClick={saveAllAndRefresh}
                      variant="outline"
                      size="sm"
                      disabled={isRefreshing}
                      className="h-10 gap-2 px-4 rounded-lg font-medium border border-border hover:bg-muted disabled:opacity-50 transition-all duration-200"
                      aria-label="Sync calendar data"
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${
                          isRefreshing ? "animate-spin" : ""
                        }`}
                      />
                      <span className="hidden sm:inline">Sync</span>
                    </Button>

                    <Separator orientation="vertical" className="h-6 mx-1" />

                    <div className="flex items-center gap-1">
                      <Button
                        onClick={handleImport}
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 rounded-lg border border-border hover:bg-muted"
                        aria-label="Import events"
                      >
                        <Upload className="w-4 h-4" />
                      </Button>

                      <Button
                        onClick={handleExport}
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 rounded-lg border border-border hover:bg-muted"
                        aria-label="Export events"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>

                    <Button
                      onClick={() => setCreatingEvent(true)}
                      size="sm"
                      className="h-10 gap-2 px-4 rounded-lg font-semibold bg-foreground text-background hover:bg-foreground/90 shadow-lg hover:shadow-xl transition-all duration-200 hidden sm:flex"
                      aria-label="Create new event"
                    >
                      <Plus className="w-5 h-5" />
                      <span>New Event</span>
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Navigation for larger screens */}
              <div className="hidden lg:absolute lg:left-1/2 lg:transform lg:-translate-x-1/2 lg:bottom-0">
                <DesktopNav />
              </div>
            </div>
            
            {/* Navigation for smaller screens */}
            <div className="lg:hidden pb-2">
              <TabletNav />
            </div>
          </div>
        </header>
      )}
      
      {/* Mobile Menu */}
      <MobileMenu />
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </>
  );
};