import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { StatsCard } from "@/components/StatsCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, FileCheck, Files, HardDrive, Upload, Search, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Stats {
  totalDocuments: number;
  uniqueDocuments: number;
  duplicatesFound: number;
  storageSaved: string;
}

interface Activity {
  id: string;
  action: string;
  details: any;
  created_at: string;
  user_id: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalDocuments: 0,
    uniqueDocuments: 0,
    duplicatesFound: 0,
    storageSaved: "0 GB",
  });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch document stats
        const { count: totalDocs } = await supabase
          .from("documents")
          .select("*", { count: "exact", head: true });

        const { count: dupCount } = await supabase
          .from("duplicates")
          .select("*", { count: "exact", head: true });

        // Fetch recent activity
        const { data: activityData } = await supabase
          .from("activity_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5);

        setStats({
          totalDocuments: totalDocs || 0,
          uniqueDocuments: (totalDocs || 0) - (dupCount || 0),
          duplicatesFound: dupCount || 0,
          storageSaved: "0 GB", // This would need calculation from actual file sizes
        });

        setActivities(activityData || []);
      } catch (error: any) {
        toast({
          title: "Error loading dashboard",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  const handleUploadClick = () => {
    navigate("/upload");
  };

  const handleQuickScanClick = () => {
    toast({
      title: "Quick Archive Scan",
      description: "This feature is not yet implemented. Please use the Upload page to check for duplicates.",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard Overview</h1>
        <p className="text-muted-foreground">Monitor your document deduplication system</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Documents"
          value={stats.totalDocuments}
          icon={FileText}
          variant="blue"
        />
        <StatsCard
          title="Unique Documents"
          value={stats.uniqueDocuments}
          icon={FileCheck}
          variant="green"
        />
        <StatsCard
          title="Duplicates Found"
          value={stats.duplicatesFound}
          icon={Files}
          variant="red"
        />
        <StatsCard title="Storage Saved" value={stats.storageSaved} icon={HardDrive} variant="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Quick Actions */}
        <div className="lg:col-span-1">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Button 
                className="w-full justify-start gap-2" 
                size="lg"
                onClick={handleUploadClick}
              >
                <Upload className="h-5 w-5" />
                Upload & Check Duplicates
              </Button>
              <Button 
                variant="secondary" 
                className="w-full justify-start gap-2" 
                size="lg"
                onClick={handleQuickScanClick}
              >
                <Search className="h-5 w-5" />
                Quick Archive Scan
              </Button>
            </div>
          </Card>

          {/* Storage Usage */}
          <Card className="p-6 mt-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Storage Usage</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Used</span>
                <span className="font-medium">64.2 GB / 100 GB</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: "64%" }}></div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                8.4 GB saved through deduplication
              </p>
            </div>
          </Card>
        </div>

        {/* Right Column - Recent Activity */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h2>
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {activities.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No recent activity</p>
              ) : (
                activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex gap-3 pb-4 border-b border-border last:border-0 last:pb-0"
                  >
                    <div className="w-2 h-2 mt-2 rounded-full bg-primary flex-shrink-0"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{activity.action}</p>
                      {activity.details && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {activity.details.result || ""}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(activity.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Monthly Duplicate Trends</h2>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Chart visualization placeholder</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Document Distribution</h2>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Chart visualization placeholder</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}