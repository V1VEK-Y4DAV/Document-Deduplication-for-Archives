import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/utils/activityLogger";

interface Activity {
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
  const [activities, setActivities] = useState<Activity[]>([]);
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

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Activity Log Test</h1>
        <p className="text-muted-foreground">Test and view activity logging functionality</p>
      </div>

      <div className="flex gap-4">
        <Button onClick={testActivityLogging}>Generate Test Activity</Button>
        <Button variant="destructive" onClick={clearActivities}>Clear All Activities</Button>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Activities</h2>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading activities...</p>
          </div>
        ) : activities.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No activities found</p>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                <div className="flex justify-between">
                  <div>
                    <p className="font-medium">
                      {activity.profiles?.full_name || activity.profiles?.email || 'Unknown User'}
                    </p>
                    <p className="text-sm text-muted-foreground">{activity.action}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(activity.created_at).toLocaleString()}
                  </p>
                </div>
                {activity.details && (
                  <div className="mt-2 p-3 bg-accent rounded-lg">
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(activity.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}