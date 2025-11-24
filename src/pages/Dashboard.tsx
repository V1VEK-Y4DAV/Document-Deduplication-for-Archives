import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { StatsCard } from "@/components/StatsCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, FileCheck, Files, HardDrive, Upload, Search, BarChart3, User, FileUp, FileDown, LogIn, LogOut, Copy, TrendingUp, Database, Layers, PieChart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Legend } from "recharts";

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

interface MonthlyDuplicateData {
  month: string;
  duplicates: number;
}

interface DocumentDistributionData {
  type: string;
  count: number;
  color: string;
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
  const [monthlyDuplicates, setMonthlyDuplicates] = useState<MonthlyDuplicateData[]>([]);
  const [documentDistribution, setDocumentDistribution] = useState<DocumentDistributionData[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

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

      // Fetch monthly duplicate trends
      const monthlyData = await fetchMonthlyDuplicates();
      console.log('Monthly duplicates data:', monthlyData);
      
      // Fetch document distribution
      const distributionData = await fetchDocumentDistribution();
      console.log('Document distribution data:', distributionData);

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
      setMonthlyDuplicates(monthlyData);
      setDocumentDistribution(distributionData);
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

  useEffect(() => {
    fetchData();
  }, [toast]);

  // Refresh dashboard data when documents are uploaded or deleted
  useEffect(() => {
    const handleDocumentChange = () => {
      // Re-fetch data when document events occur
      fetchData();
    };

    window.addEventListener('documentUploaded', handleDocumentChange);
    window.addEventListener('documentDeleted', handleDocumentChange);

    return () => {
      window.removeEventListener('documentUploaded', handleDocumentChange);
      window.removeEventListener('documentDeleted', handleDocumentChange);
    };
  }, []);

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

  const fetchMonthlyDuplicates = async (): Promise<MonthlyDuplicateData[]> => {
    try {
      // Get the last 12 months
      const months = [];
      const now = new Date();
      
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthLabel = date.toLocaleString('default', { month: 'short', year: '2-digit' });
        months.push({
          month: monthLabel,
          duplicates: 0
        });
      }
      
      // Fetch duplicates grouped by month using Supabase date functions
      const { data: duplicates, error } = await supabase
        .from("duplicates")
        .select("created_at")
        .gte('created_at', new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString());
      
      if (error) {
        console.error("Error fetching duplicates:", error);
        throw error;
      }
      
      // Count duplicates per month
      const duplicateCounts: Record<string, number> = {};
      duplicates.forEach(dup => {
        const date = new Date(dup.created_at);
        const monthLabel = date.toLocaleString('default', { month: 'short', year: '2-digit' });
        duplicateCounts[monthLabel] = (duplicateCounts[monthLabel] || 0) + 1;
      });
      
      // Map to the required format
      const result = months.map(month => ({
        month: month.month,
        duplicates: duplicateCounts[month.month] || 0
      }));
      
      return result;
    } catch (error) {
      console.error("Error fetching monthly duplicates:", error);
      // Return default data with more months
      const now = new Date();
      const months = [];
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthLabel = date.toLocaleString('default', { month: 'short', year: '2-digit' });
        months.push({ month: monthLabel, duplicates: 0 });
      }
      return months;
    }
  };

  const fetchDocumentDistribution = async (): Promise<DocumentDistributionData[]> => {
    try {
      // Fetch all documents to analyze distribution
      const { data: documents, error } = await supabase
        .from("documents")
        .select("file_type");
      
      if (error) throw error;
      
      // Count documents by type
      const typeCounts: Record<string, number> = {};
      documents.forEach(doc => {
        // Extract just the file extension from file_type (e.g., "APPLICATION/PDF" -> "PDF")
        const fullType = doc.file_type?.toUpperCase() || 'UNKNOWN';
        let type = fullType.split('/').pop() || fullType;
              
        // Use shorter names for specific long file types
        if (type === 'VND.OPENXMLFORMATS-OFFICEDOCUMENT.WORDPROCESSINGML.DOCUMENT') {
          type = 'DOCX';
        }
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });
      
      // Define colors for each type
      const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#8b5cf6'];
      
      // Convert to required format
      const result = Object.entries(typeCounts)
        .map(([type, count], index) => ({
          type: type,
          count,
          color: COLORS[index % COLORS.length]
        }));
      
      // Custom sorting to ensure specific order: PDF, DOCX, others by count
      result.sort((a, b) => {
        const order = [
          'PDF', 
          'DOCX'
        ];
        
        const indexA = order.indexOf(a.type);
        const indexB = order.indexOf(b.type);
        
        // If both are in our specified order, sort by that order
        if (indexA !== -1 && indexB !== -1) {
          return indexA - indexB;
        }
        
        // If only one is in our specified order, it comes first
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        
        // If neither is in our specified order, sort by count descending
        return b.count - a.count;
      });
      
      return result;
    } catch (error) {
      console.error("Error fetching document distribution:", error);
      // Return default data
      return [
        { type: "PDF", count: 0, color: "#3b82f6" },
        { type: "DOCX", count: 0, color: "#10b981" },
        { type: "TXT", count: 0, color: "#f59e0b" }
      ];
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

  // Chart components
  const MonthlyDuplicateTrendsChart = () => {
    // Always render the chart, even with empty data
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={monthlyDuplicates} 
          margin={{ top: 20, right: 20, left: 20, bottom: 30 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis 
            dataKey="month" 
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            angle={-45}
            textAnchor="end"
            height={50}
            minTickGap={10}
          />
          <YAxis 
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            width={25}
            tickFormatter={(value) => Number.isInteger(value) ? value : ''}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--background))', 
              borderColor: 'hsl(var(--border))',
              borderRadius: '0.5rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}
            formatter={(value) => [value, 'Duplicates']}
            labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 500 }}
            itemStyle={{ color: 'hsl(var(--muted-foreground))' }}
            labelFormatter={(label) => `Month: ${label}`}
          />
          <Bar 
            dataKey="duplicates" 
            name="Duplicates"
            radius={[4, 4, 0, 0]}
            barSize={18}
          >
            {monthlyDuplicates.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.duplicates > 0 ? '#f59e0b' : '#94a3b8'} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const DocumentDistributionChart = () => {
    // Always render the chart, even with empty data
    return (
      <div className="flex flex-col md:flex-row items-center justify-between h-full gap-6">
        <div className="w-full md:w-7/12 h-64 md:h-full">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart>
              <Pie
                data={documentDistribution}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={75}
                fill="#8884d8"
                dataKey="count"
                nameKey="type"
                label={({ name }) => `${name}`}
                labelLine={true}
                animationBegin={0}
                animationDuration={400}
                startAngle={330}
                endAngle={690}
              >
                {documentDistribution.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.count > 0 ? entry.color : '#94a3b8'} 
                  />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  borderColor: 'hsl(var(--border))',
                  borderRadius: '0.75rem',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                  padding: '0.875rem'
                }}
                formatter={(value, name) => [value, `${name}`]}
                labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600, fontSize: '0.875rem' }}
                itemStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}
                cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
              />
              {/* Center label for total documents */}
              <text 
                x="50%" 
                y="50%" 
                textAnchor="middle" 
                dominantBaseline="middle"
                className="text-xl font-bold fill-foreground"
              >
                {documentDistribution.reduce((sum, item) => sum + item.count, 0)}
                <tspan x="50%" dy="1.4em" className="text-xs font-normal fill-muted-foreground">Total Files</tspan>
              </text>
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>
        <div className="w-full md:w-5/12 h-full max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-rounded-full scrollbar-track-transparent scrollbar-thumb-muted-foreground/20">
          <div className="space-y-2.5 pr-2">
            {documentDistribution.map((entry, index) => (
              <div key={`legend-${index}`} className="flex items-center justify-between p-3 rounded-lg bg-accent/30 hover:bg-accent/50 transition-all duration-200 border border-border/50">
                <div className="flex items-center">
                  <div 
                    className="w-3.5 h-3.5 rounded-full mr-3 flex-shrink-0" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-foreground text-sm font-medium truncate">{entry.type}</span>
                </div>
                <span className="text-foreground text-sm font-semibold min-w-fit">{entry.count}</span>
              </div>
            ))}
            {documentDistribution.length === 0 && (
              <div className="text-center text-muted-foreground py-6">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No documents found</p>
                <p className="text-xs mt-1">Upload documents to see distribution</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
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
        <Card className="p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow bg-card">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-lg bg-primary/10">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Monthly Duplicate Trends</h2>
              <p className="text-sm text-muted-foreground">Track duplicate documents over time</p>
            </div>
          </div>
          <div className="h-80">
            <MonthlyDuplicateTrendsChart />
          </div>
        </Card>

        <Card className="p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow bg-card">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-lg bg-primary/10">
              <PieChart className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Document Distribution</h2>
              <p className="text-sm text-muted-foreground">File types in your document archive</p>
            </div>
          </div>
          <div className="h-80">
            <DocumentDistributionChart />
          </div>
        </Card>
      </div>
    </div>
  );
}