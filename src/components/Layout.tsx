import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu, Search, Bell, User, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sidebar } from "./Sidebar";

export const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Top Navigation Bar */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-50 flex items-center px-4 gap-4">
        {/* Left Section */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hover:bg-accent"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-primary-foreground font-bold">
              E
            </div>
            <span className="font-semibold text-foreground hidden md:block">
              E-Office Deduplication Hub
            </span>
          </div>
        </div>

        {/* Center Section - Search */}
        <div className="flex-1 max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search documents..."
              className="pl-9 bg-accent/50 border-border"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative hover:bg-accent">
            <Bell className="h-5 w-5" />
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-destructive text-xs">
              3
            </Badge>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 hover:bg-accent">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground">
                  {user?.user_metadata?.full_name?.[0]?.toUpperCase() || <User className="h-4 w-4" />}
                </div>
                <span className="hidden md:block">{user?.user_metadata?.full_name || user?.email}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-popover">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile Settings</DropdownMenuItem>
              <DropdownMenuItem>Preferences</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} />

      {/* Main Content Area */}
      <main
        className={`flex-1 pt-16 transition-all duration-300 ${
          sidebarOpen ? "ml-64" : "ml-0"
        }`}
      >
        <div className="p-6">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer
        className={`fixed bottom-0 right-0 h-10 bg-card border-t border-border flex items-center px-4 text-xs text-muted-foreground transition-all duration-300 ${
          sidebarOpen ? "left-64" : "left-0"
        }`}
      >
        <div className="flex items-center gap-4">
          <span>System Status: </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-success rounded-full"></span>
            Online
          </span>
          <span className="mx-2">|</span>
          <span>Server: Active</span>
          <span className="mx-2">|</span>
          <span>Last Sync: 2 minutes ago</span>
        </div>
      </footer>
    </div>
  );
};
