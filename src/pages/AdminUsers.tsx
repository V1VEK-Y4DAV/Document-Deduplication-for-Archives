import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { UserPlus, Search, MoreVertical, Mail, Shield } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import type { Database } from "@/integrations/supabase/types";

type UserProfile = Database["public"]["Tables"]["profiles"]["Row"] & {
  role?: string;
  last_login?: string;
  status?: string;
};

export default function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch profiles
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*");
      
      if (error) throw error;
      
      // Fetch user roles
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("*");
      
      // Combine profiles with roles
      const usersWithRoles = profiles.map(profile => {
        const userRole = userRoles?.find(role => role.user_id === profile.id);
        return {
          ...profile,
          role: userRole?.role || "user",
          last_login: profile.updated_at ? new Date(profile.updated_at).toLocaleString() : "Never",
          status: profile.updated_at ? "active" : "inactive"
        };
      });
      
      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">User Management</h1>
          <p className="text-muted-foreground">Manage system users and permissions</p>
        </div>
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          Add New User
        </Button>
      </div>

      <Card className="p-6">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search users by name or email..."
              className="pl-9"
            />
          </div>
        </div>

        {/* Users Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-16">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user, index) => (
              <TableRow key={user.id || index}>
                <TableCell className="font-medium">
                  {user.full_name || user.email}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {user.email}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={user.role === "admin" ? "default" : "secondary"}
                    className="gap-1"
                  >
                    {user.role === "admin" && <Shield className="h-3 w-3" />}
                    {user.role?.charAt(0).toUpperCase() + user.role?.slice(1) || "User"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {user.last_login || "Never"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={user.status === "active" ? "default" : "secondary"}
                    className={
                      user.status === "active"
                        ? "bg-success hover:bg-success/90"
                        : "bg-muted"
                    }
                  >
                    {user.status || "inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Edit User</DropdownMenuItem>
                      <DropdownMenuItem>Change Role</DropdownMenuItem>
                      <DropdownMenuItem>Reset Password</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        Deactivate
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Users</p>
          <p className="text-2xl font-bold">{users.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Active Users</p>
          <p className="text-2xl font-bold text-success">
            {users.filter((u) => u.status === "active").length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Admins</p>
          <p className="text-2xl font-bold text-primary">
            {users.filter((u) => u.role === "admin").length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Managers</p>
          <p className="text-2xl font-bold text-primary">
            {users.filter((u) => u.role === "manager").length}
          </p>
        </Card>
      </div>
    </div>
  );
}
