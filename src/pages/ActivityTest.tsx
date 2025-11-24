import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/utils/activityLogger";
import { Activity as ActivityIcon, Plus, Trash2, User, Clock, FileText, LogIn, LogOut, FileUp, FileDown, Copy, Search } from "lucide-react";

interface ActivityLog {
  id: string;
  action: string;
  details: any;
  created_at: string;
  user_id: string;
  profiles?: {
    full_name: string | null;
    email: string;
  };
}

export default function ActivityTest() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from("activity_logs")
        .select(`
          *,
          profiles (full_name, email)
        `)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setLoading(false);
    }
  };

  const testActivityLogging = async () => {
    if (!user) return;
    
    await logActivity({
      userId: user.id,
      action: "Test Activity",
      entityType: "test",
      details: {
        message: "This is a test activity log entry",
        timestamp: new Date().toISOString(),
        userId: user.id
      }
    });
    
    // Refresh the activity list
    fetchActivities();
  };

  const clearActivities = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from("activity_logs")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all (dummy condition)
      
      if (error) throw error;
      
      // Refresh the activity list
      fetchActivities();
    } catch (error) {
      console.error("Error clearing activities:", error);
    }
  };

  const deleteActivity = async (activityId: string) => {
    try {
      const { error } = await supabase
        .from("activity_logs")
        .delete()
        .eq("id", activityId);
      
      if (error) throw error;
      
      // Refresh the activity list
      fetchActivities();
    } catch (error) {
      console.error("Error deleting activity:", error);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Activity Log Test</h1>
        <p className="text-muted-foreground">Test and view activity logging functionality</p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button onClick={testActivityLogging}>Generate Test Activity</Button>
        <Button variant="destructive" onClick={clearActivities}>Clear All Activities</Button>
      </div>

      {/* Activity Card */}
      <Card className="p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Recent Activities</h2>
        </div>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading activities...</p>
          </div>
        ) : activities.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No activities found</p>
        ) : (
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-rounded-full scrollbar-track-transparent scrollbar-thumb-muted-foreground/20">
            {activities.map((activity) => {
              // Determine icon based on activity type
              let ActivityIconComponent = User;
              let iconBgColor = "bg-primary/10";
              let iconColor = "text-primary";
              
              if (activity.action.includes("Upload")) {
                ActivityIconComponent = FileUp;
                iconBgColor = "bg-blue-500/10";
                iconColor = "text-blue-500";
              } else if (activity.action.includes("Delete")) {
                ActivityIconComponent = FileDown;
                iconBgColor = "bg-red-500/10";
                iconColor = "text-red-500";
              } else if (activity.action.includes("Duplicate")) {
                ActivityIconComponent = Copy;
                iconBgColor = "bg-amber-500/10";
                iconColor = "text-amber-500";
              } else if (activity.action.includes("Login")) {
                ActivityIconComponent = LogIn;
                iconBgColor = "bg-green-500/10";
                iconColor = "text-green-500";
              } else if (activity.action.includes("Logout")) {
                ActivityIconComponent = LogOut;
                iconBgColor = "bg-gray-500/10";
                iconColor = "text-gray-500";
              } else if (activity.action.includes("Search")) {
                ActivityIconComponent = Search;
                iconBgColor = "bg-purple-500/10";
                iconColor = "text-purple-500";
              }

              return (
                <div 
                  key={activity.id} 
                  className="p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors duration-200 relative"
                >
                  {/* Delete Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-3 right-3 h-7 w-7 rounded-full hover:bg-destructive/10 transition-colors shadow-none text-destructive"
                    onClick={() => deleteActivity(activity.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pr-8">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${iconBgColor} mt-0.5`}>
                        <ActivityIconComponent className={`h-4 w-4 ${iconColor}`} />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">

                        </p>
                        <p className="text-sm text-muted-foreground mt-1">{activity.action}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground whitespace-nowrap">
                      <Clock className="h-4 w-4" />
                      <span>{new Date(activity.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  {activity.details && (
                    <div className="mt-4 p-4 bg-accent/50 rounded-lg border">
                      <pre className="text-xs overflow-x-auto text-foreground">
                        {JSON.stringify(activity.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}