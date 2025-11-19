import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard,
  Upload,
  Search,
  FolderOpen,
  Users,
  Settings,
  BarChart3,
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
}

export const Sidebar = ({ isOpen }: SidebarProps) => {
  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    { icon: Upload, label: "Upload Documents", path: "/upload" },
    { icon: Search, label: "Advanced Search", path: "/search" },
    { icon: FolderOpen, label: "Archive Browser", path: "/browse" },
    { icon: Users, label: "User Management", path: "/admin/users", admin: true },
    { icon: Settings, label: "System Settings", path: "/admin/settings", admin: true },
    { icon: BarChart3, label: "Reports & Analytics", path: "/reports" },
  ];

  return (
    <aside
      className={`fixed top-16 left-0 h-[calc(100vh-4rem-2.5rem)] bg-sidebar text-sidebar-foreground transition-all duration-300 z-40 overflow-y-auto ${
        isOpen ? "w-64" : "w-0"
      }`}
    >
      <nav className="p-4 space-y-1">
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
      </nav>
    </aside>
  );
};
