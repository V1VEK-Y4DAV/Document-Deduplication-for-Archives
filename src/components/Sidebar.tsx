import { useState } from "react";
import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard,
  Upload,
  Search,
  FolderOpen,
  Users,
  BarChart3,
  LogOut,
  Database,
  Bug,
  Activity,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  isOpen: boolean;
}

export const Sidebar = ({ isOpen }: SidebarProps) => {
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const { signOut } = useAuth();
  
  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    { icon: Upload, label: "Upload Documents", path: "/upload" },
    { icon: Search, label: "Advanced Search", path: "/search" },
    { icon: FolderOpen, label: "Archive Browser", path: "/browse" },
    { icon: Database, label: "Document Storage", path: "/storage" },
    { icon: Bug, label: "Test Supabase", path: "/test-supabase" },
    { icon: Activity, label: "Activity Test", path: "/activity-test" },
    { icon: Users, label: "User Management", path: "/admin/users", admin: true },
    { icon: BarChart3, label: "Reports & Analytics", path: "/reports" },
  ];

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <aside
      className={`fixed top-16 left-0 h-[calc(100vh-4rem-2.5rem)] bg-sidebar text-sidebar-foreground transition-all duration-300 z-40 overflow-y-auto ${
        isOpen ? "w-64" : "w-0"
      }`}
    >
      <nav className="p-4 h-full flex flex-col">
        <div className="space-y-1 flex-grow">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              activeClassName="bg-sidebar-accent font-medium"
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">{item.label}</span>
              {item.admin && (
                <span className="ml-auto text-xs bg-sidebar-primary text-sidebar-primary-foreground px-2 py-0.5 rounded">
                  Admin
                </span>
              )}
            </NavLink>
          ))}
        </div>
        {/* Logout button at the bottom */}
        <div className="pt-4 border-t border-sidebar-border">
          <AlertDialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
            <AlertDialogTrigger asChild>
              <button
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors w-full text-left"
              >
                <LogOut className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm">Logout</span>
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to logout? You will need to sign in again to access the application.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleLogout} className="bg-destructive hover:bg-destructive/90">
                  Logout
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </nav>
    </aside>
  );
};