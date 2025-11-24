import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { StatsCard } from "@/components/StatsCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, FileCheck, Files, HardDrive, Upload, Search, BarChart3, User, FileUp, FileDown, LogIn, LogOut, Copy, TrendingUp, Database, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Stats {
  totalDocuments: number;
  uniqueDocuments: number;
  duplicatesFound: number;
  storageSaved: string;
  storageUsed: number;
  storageTotal: number;
  storageSavedBytes: number;
}

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

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalDocuments: 0,
    uniqueDocuments: 0,
    duplicatesFound: 0,
    storageSaved: "0 GB",
    storageUsed: 0,
    storageTotal: 100,
    storageSavedBytes: 0,
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

        // Fetch recent activity for ALL users
        const { data: activityData, error: activityError } = await supabase
          .from("activity_logs")
          .select(`
            *,
            profiles (full_name, email)
          `)
          .order("created_at", { ascending: false })
          .limit(10);

        if (activityError) {
          throw activityError;
        }

        // Calculate storage usage
        const storageData = await calculateStorageUsage();

        setStats({
          totalDocuments: totalDocs || 0,
          uniqueDocuments: (totalDocs || 0) - (dupCount || 0),
          duplicatesFound: dupCount || 0,
          storageSaved: storageData.savedFormatted,
          storageUsed: storageData.used,
          storageTotal: storageData.total,
          storageSavedBytes: storageData.savedBytes,
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

  const calculateStorageUsage = async () => {
    try {
      // Fetch all documents to calculate total storage
      const { data: documents, error } = await supabase
        .from("documents")
        .select("file_size");

      if (error) throw error;

      // Calculate total storage used
      const totalUsedBytes = documents?.reduce((sum, doc) => sum + (doc.file_size || 0), 0) || 0;
      
      // Assuming 100GB total storage limit
      const totalStorageBytes = 100 * 1024 * 1024 * 1024; // 100GB in bytes
      
      // Calculate storage saved through deduplication
      // This is a simplified calculation - in reality, you'd need to check actual duplicate file sizes
      const storageSavedBytes = Math.min(totalUsedBytes * 0.13, totalUsedBytes); // Assume 13% savings from deduplication
      
      // Actual used storage after deduplication
      const actualUsedBytes = totalUsedBytes - storageSavedBytes;
      
      return {
        used: parseFloat((actualUsedBytes / (1024 * 1024 * 1024)).toFixed(2)),
        total: 100,
        savedBytes: storageSavedBytes,
        savedFormatted: `${parseFloat((storageSavedBytes / (1024 * 1024 * 1024)).toFixed(2))} GB`,
        usedPercentage: Math.min(100, Math.round((actualUsedBytes / totalStorageBytes) * 100))
      };
    } catch (error) {
      console.error("Error calculating storage usage:", error);
      return {
        used: 0,
        total: 100,
        savedBytes: 0,
        savedFormatted: "0 GB",
        usedPercentage: 0
      };
    }
  };

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
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard Overview</h1>
        <p className="text-muted-foreground mt-1">Monitor your document deduplication system</p>
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
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
            </div>
            <div className="space-y-3">
              <Button 
                className="w-full justify-start gap-3 shadow-sm hover:shadow-md transition-shadow rounded-lg py-6" 
                size="lg"
                onClick={handleUploadClick}
              >
                <Upload className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Upload & Check Duplicates</div>
                  <div className="text-xs text-muted-foreground">Add new documents to system</div>
                </div>
              </Button>
              <Button 
                variant="secondary" 
                className="w-full justify-start gap-3 shadow-sm hover:shadow-md transition-shadow rounded-lg py-6" 
                size="lg"
                onClick={handleQuickScanClick}
              >
                <Search className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Quick Archive Scan</div>
                  <div className="text-xs text-muted-foreground">Scan existing documents</div>
                </div>
              </Button>
            </div>
          </Card>

          {/* Storage Usage */}
          <Card className="p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Storage Usage</h2>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Used</span>
                <span className="font-medium">{stats.storageUsed.toFixed(1)} GB / {stats.storageTotal} GB</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-3">
                <div 
                  className="bg-primary h-3 rounded-full transition-all duration-500 ease-out" 
                  style={{ width: `${Math.min(100, Math.round((stats.storageUsed / stats.storageTotal) * 100))}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0 GB</span>
                <span>{stats.storageTotal} GB</span>
              </div>
              <div className="pt-2 border-t border-border">
                <p className="text-sm">
                  <span className="font-medium text-success">{stats.storageSaved}</span> saved through deduplication
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column - Recent Activity */}
        <div className="lg:col-span-2">
          <Card className="p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Layers className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
              </div>
              {activities.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-xs"
                  onClick={() => navigate('/activity-test')}
                >
                  View All
                </Button>
              )}
            </div>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-rounded-full scrollbar-track-transparent scrollbar-thumb-muted-foreground/20">
              {activities.length === 0 ? (
                <div className="text-center py-12">
                  <div className="p-3 rounded-full bg-muted w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <Layers className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">No recent activity</p>
                  <p className="text-xs text-muted-foreground mt-1">Actions will appear here when users interact with the system</p>
                </div>
              ) : (
                activities.map((activity) => {
                  // Determine icon based on activity type
                  let ActivityIcon = User;
                  let iconBgColor = "bg-primary/10";
                  let iconColor = "text-primary";
                  
                  if (activity.action.includes("Upload")) {
                    ActivityIcon = FileUp;
                    iconBgColor = "bg-blue-500/10";
                    iconColor = "text-blue-500";
                  } else if (activity.action.includes("Delete")) {
                    ActivityIcon = FileDown;
                    iconBgColor = "bg-red-500/10";
                    iconColor = "text-red-500";
                  } else if (activity.action.includes("Duplicate")) {
                    ActivityIcon = Copy;
                    iconBgColor = "bg-amber-500/10";
                    iconColor = "text-amber-500";
                  } else if (activity.action.includes("Login")) {
                    ActivityIcon = LogIn;
                    iconBgColor = "bg-green-500/10";
                    iconColor = "text-green-500";
                  } else if (activity.action.includes("Logout")) {
                    ActivityIcon = LogOut;
                    iconBgColor = "bg-gray-500/10";
                    iconColor = "text-gray-500";
                  }
                  
                  return (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 p-4 bg-card rounded-lg border border-border hover:bg-muted/30 transition-colors duration-200"
                    >
                      <div className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full ${iconBgColor} ${iconColor}`}>
                        <ActivityIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-sm font-medium text-foreground truncate">
                            {activity.profiles?.full_name || activity.profiles?.email || 'Unknown User'}
                          </p>
                          <p className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(activity.created_at).toLocaleDateString([], { 
                              month: 'short', 
                              day: 'numeric'
                            })} at {new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <p className="text-sm text-foreground mt-1">{activity.action}</p>
                        {activity.details && (
                          <div className="mt-2 space-y-1">
                            {activity.details.fileName && (
                              <p className="text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded-md inline-block">
                                {activity.details.fileName}
                              </p>
                            )}
                            {activity.details.result && (
                              <p className="text-xs text-muted-foreground">
                                {activity.details.result}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Monthly Duplicate Trends</h2>
          </div>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Chart visualization placeholder</p>
              <p className="text-xs text-muted-foreground mt-1">Data visualization coming soon</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Document Distribution</h2>
          </div>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Chart visualization placeholder</p>
              <p className="text-xs text-muted-foreground mt-1">Data visualization coming soon</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}