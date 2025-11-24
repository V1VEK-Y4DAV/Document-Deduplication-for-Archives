import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { UserPlus, Search, MoreVertical, Mail, Shield, Users, CheckCircle, Clock, Key } from "lucide-react";
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
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground mt-1">Manage system users and permissions</p>
        </div>
        <Button className="gap-2 shadow-sm hover:shadow-md transition-shadow">
          <UserPlus className="h-4 w-4" />
          Add New User
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Users</p>
              <p className="text-2xl font-bold">{users.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Users</p>
              <p className="text-2xl font-bold text-success">
                {users.filter((u) => u.status === "active").length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-5 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Key className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Admins</p>
              <p className="text-2xl font-bold text-primary">
                {users.filter((u) => u.role === "admin").length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-5 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Managers</p>
              <p className="text-2xl font-bold text-primary">
                {users.filter((u) => u.role === "manager").length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Users Table Card */}
      <Card className="p-6 rounded-xl border shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-semibold text-foreground">User Directory</h2>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search users by name or email..."
              className="pl-9 py-2 rounded-lg"
            />
          </div>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-medium text-foreground py-3">Name</TableHead>
                <TableHead className="font-medium text-foreground py-3">Email</TableHead>
                <TableHead className="font-medium text-foreground py-3">Role</TableHead>
                <TableHead className="font-medium text-foreground py-3">Last Login</TableHead>
                <TableHead className="font-medium text-foreground py-3">Status</TableHead>
                <TableHead className="font-medium text-foreground py-3 w-16">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user, index) => (
                <TableRow 
                  key={user.id || index} 
                  className="hover:bg-muted/30 transition-colors"
                >
                  <TableCell className="font-medium py-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center">
                        {(user.full_name || user.email)?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <span>{user.full_name || user.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{user.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge
                      variant={user.role === "admin" ? "default" : "secondary"}
                      className="gap-1 px-3 py-1 rounded-full text-xs font-medium"
                    >
                      {user.role === "admin" && <Shield className="h-3 w-3" />}
                      {user.role?.charAt(0).toUpperCase() + user.role?.slice(1) || "User"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground py-4">
                    {user.last_login || "Never"}
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge
                      variant={user.status === "active" ? "default" : "secondary"}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        user.status === "active"
                          ? "bg-success/10 text-success hover:bg-success/10"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {user.status || "inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-muted rounded-md"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent 
                        align="end"
                        className="rounded-lg shadow-lg border"
                      >
                        <DropdownMenuItem className="cursor-pointer rounded-sm py-2">
                          Edit User
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer rounded-sm py-2">
                          Change Role
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer rounded-sm py-2">
                          Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer rounded-sm py-2 text-destructive focus:text-destructive focus:bg-destructive/10">
                          Deactivate
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}