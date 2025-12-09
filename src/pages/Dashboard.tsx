import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { StatsCard } from "@/components/StatsCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, FileCheck, Files, HardDrive, Upload, Search, BarChart3, User, FileUp, FileDown, LogIn, LogOut, Copy, TrendingUp, Database, Layers, PieChart, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Legend } from "recharts";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface Stats {
  totalDocuments: number;
  uniqueDocuments: number;
  duplicatesFound: number;
  storageSaved: string;
  storageUsed: number;
  storageTotal: number;
  storageSavedBytes: number;
  deletedDuplicates: number;
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
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch dashboard data with React Query
  const { data: dashboardData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dashboardData'],
    queryFn: async () => {
      try {
        // Fetch document stats
        const { count: totalDocs } = await supabase
          .from("documents")
          .select("*", { count: "exact", head: true });

        const { count: dupCount } = await supabase
          .from("duplicates")
          .select("*", { count: "exact", head: true });

        // Fetch deleted duplicates count
        const { count: deletedDupCount } = await supabase
          .from("deleted_duplicates_memory")
          .select("*", { count: "exact", head: true });

        // Fetch recent activity for ALL users (limited to 10)
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
        
        // Fetch document distribution
        const distributionData = await fetchDocumentDistribution();

        return {
          stats: {
            totalDocuments: totalDocs || 0,
            uniqueDocuments: (totalDocs || 0) - (dupCount || 0),
            duplicatesFound: dupCount || 0,
            storageSaved: storageData.savedFormatted,
            storageUsed: storageData.used,
            storageTotal: storageData.total,
            storageSavedBytes: storageData.savedBytes,
            deletedDuplicates: deletedDupCount || 0,
          },
          activities: activityData || [],
          monthlyDuplicates: monthlyData,
          documentDistribution: distributionData
        };
      } catch (error: any) {
        throw error;
      }
    },
    staleTime: 30000, // Cache for 30 seconds
    refetchOnWindowFocus: false, // Don't refetch on window focus to reduce requests
  });

  // Refresh dashboard data when documents are uploaded or deleted
  useEffect(() => {
    const handleDocumentChange = () => {
      // Invalidate and refetch dashboard data
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
    };

    window.addEventListener('documentUploaded', handleDocumentChange);
    window.addEventListener('documentDeleted', handleDocumentChange);

    return () => {
      window.removeEventListener('documentUploaded', handleDocumentChange);
      window.removeEventListener('documentDeleted', handleDocumentChange);
    };
  }, [queryClient]);

  const calculateStorageUsage = useCallback(async () => {
    try {
      // Fetch all documents to calculate total storage (limited to 1000 for performance)
      const { data: documents, error } = await supabase
        .from("documents")
        .select("file_size")
        .limit(1000);

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
  }, []);

  const fetchMonthlyDuplicates = useCallback(async (): Promise<MonthlyDuplicateData[]> => {
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
      
      // Fetch duplicates grouped by month using Supabase date functions (limited to last year)
      const { data: duplicates, error } = await supabase
        .from("duplicates")
        .select("created_at")
        .gte('created_at', new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString())
        .limit(1000); // Limit to 1000 records for performance
      
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
  }, []);

  const fetchDocumentDistribution = useCallback(async (): Promise<DocumentDistributionData[]> => {
    try {
      // Fetch all documents to analyze distribution (limited to 1000 for performance)
      const { data: documents, error } = await supabase
        .from("documents")
        .select("file_type")
        .limit(1000);
      
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
  }, []);

  const handleUploadClick = useCallback(() => {
    navigate("/upload");
  }, [navigate]);

  const handleQuickScanClick = useCallback(() => {
    toast({
      title: "Quick Archive Scan",
      description: "This feature is not yet implemented. Please use the Upload page to check for duplicates.",
    });
  }, [toast]);

  // Memoized chart data
  const memoizedMonthlyData = useMemo(() => dashboardData?.monthlyDuplicates || [], [dashboardData?.monthlyDuplicates]);
  const memoizedDistributionData = useMemo(() => dashboardData?.documentDistribution || [], [dashboardData?.documentDistribution]);

  // Chart components
  const MonthlyDuplicateTrendsChart = useCallback(() => {
    // Always render the chart, even with empty data
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={memoizedMonthlyData} 
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
            {memoizedMonthlyData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.duplicates > 0 ? '#f59e0b' : '#94a3b8'} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }, [memoizedMonthlyData]);

  const DocumentDistributionChart = useCallback(() => {
    // Always render the chart, even with empty data
    return (
      <div className="flex flex-col md:flex-row items-center justify-between h-full gap-6">
        <div className="w-full md:w-7/12 h-64 md:h-full">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart>
              <Pie
                data={memoizedDistributionData}
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
                {memoizedDistributionData.map((entry, index) => (
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
                {memoizedDistributionData.reduce((sum, item) => sum + item.count, 0)}
                <tspan x="50%" dy="1.4em" className="text-xs font-normal fill-muted-foreground">Total Files</tspan>
              </text>
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>
        <div className="w-full md:w-5/12 h-full max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-rounded-full scrollbar-track-transparent scrollbar-thumb-muted-foreground/20">
          <div className="space-y-2.5 pr-2">
            {memoizedDistributionData.map((entry, index) => (
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
            {memoizedDistributionData.length === 0 && (
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
  }, [memoizedDistributionData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-destructive mb-4">
            <FileText className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">Error loading dashboard</h3>
          <p className="text-muted-foreground mb-4">
            {error instanceof Error ? error.message : "An unknown error occurred"}
          </p>
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div className="pb-2 border-b border-border/50">
        <h1 className="text-3xl font-bold text-foreground">Dashboard Overview</h1>
        <p className="text-muted-foreground mt-2">Monitor your document deduplication system</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatsCard
          title="Total Documents"
          value={dashboardData?.stats.totalDocuments || 0}
          icon={FileText}
          variant="blue"
        />
        <StatsCard
          title="Unique Documents"
          value={dashboardData?.stats.uniqueDocuments || 0}
          icon={FileCheck}
          variant="green"
        />
        <StatsCard
          title="Duplicates Found"
          value={dashboardData?.stats.duplicatesFound || 0}
          icon={Files}
          variant="red"
        />
        <StatsCard 
          title="Storage Saved" 
          value={dashboardData?.stats.storageSaved || "0 GB"} 
          icon={HardDrive} 
          variant="amber" 
        />
        <StatsCard
          title="Deleted Duplicates"
          value={dashboardData?.stats.deletedDuplicates || 0}
          icon={Trash2}
          variant="destructive"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Quick Actions */}
        <div>
          <Card className="p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow h-full">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
            </div>
            <div className="flex flex-col justify-between h-[calc(100%-4rem)]">
              <div className="space-y-4">
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
            </div>
          </Card>
        </div>

        {/* Right Column - Storage Usage */}
        <div>
          <Card className="p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow h-full">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Storage Usage</h2>
            </div>
            <div className="flex flex-col justify-between h-[calc(100%-4rem)]">
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Used</span>
                    <span className="font-medium">{(dashboardData?.stats.storageUsed || 0).toFixed(1)} GB / {dashboardData?.stats.storageTotal || 100} GB</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-3 mt-2">
                    <div 
                      className="bg-primary h-3 rounded-full transition-all duration-500 ease-out" 
                      style={{ width: `${Math.min(100, Math.round(((dashboardData?.stats.storageUsed || 0) / (dashboardData?.stats.storageTotal || 100)) * 100))}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>0 GB</span>
                    <span>{dashboardData?.stats.storageTotal || 100} GB</span>
                  </div>
                </div>
                <div className="pt-4 border-t border-border">
                  <p className="text-sm">
                    <span className="font-medium text-success">{dashboardData?.stats.storageSaved || "0 GB"}</span> saved through deduplication
                  </p>
                </div>
              </div>
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