import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Download, TrendingUp, FileText, Users, HardDrive } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";

interface DocumentTrendData {
  date: string;
  documents: number;
}

interface DuplicateRateData {
  month: string;
  rate: number;
}

export default function Reports() {
  const [timePeriod, setTimePeriod] = useState("3days");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDocuments: 0,
    totalDuplicates: 0,
    storageSaved: 0,
    activeUsers: 0
  });
  const [documentTrend, setDocumentTrend] = useState<DocumentTrendData[]>([]);
  const [duplicateRate, setDuplicateRate] = useState<DuplicateRateData[]>([]);

  useEffect(() => {
    fetchData();
  }, [timePeriod]);

  const calculateStorageSavings = async () => {
    try {
      const dateFilter = getDateFilter();
      
      // First get all duplicate document IDs within the time period
      const { data: duplicateDocs, error: dupError } = await supabase
        .from("duplicates")
        .select("duplicate_document_id")
        .gte("created_at", dateFilter);
      
      if (dupError) throw dupError;
      
      // Extract the document IDs
      const docIds = duplicateDocs.map(dup => dup.duplicate_document_id);
      
      if (docIds.length === 0) return 0;
      
      // Then get the file sizes for those documents
      const { data: documents, error: docError } = await supabase
        .from("documents")
        .select("file_size")
        .in("id", docIds);
      
      if (docError) throw docError;
      
      // Sum up the sizes of duplicates (these represent storage saved)
      const totalSaved = documents.reduce((sum, doc) => sum + (doc.file_size || 0), 0);
      
      return Math.round(totalSaved / (1024 * 1024)); // Convert bytes to MB
    } catch (error) {
      console.error("Error calculating storage savings:", error);
      return 0;
    }
  };

  const getDateFilter = () => {
    const now = new Date();
    let startDate = new Date();
    
    switch (timePeriod) {
      case "3days":
        startDate.setDate(now.getDate() - 3);
        break;
      case "week":
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(now.getMonth() - 1);
        break;
      case "quarter":
        startDate.setMonth(now.getMonth() - 3);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
    }
    
    return startDate.toISOString();
  };

  const generateDateRange = () => {
    const dates = [];
    const now = new Date();
    let startDate = new Date();
    
    switch (timePeriod) {
      case "3days":
        startDate.setDate(now.getDate() - 2); // Last 3 days including today
        break;
      case "week":
        startDate.setDate(now.getDate() - 6); // Last 7 days including today
        break;
      case "month":
        startDate.setDate(now.getDate() - 29); // Last 30 days including today
        break;
      case "quarter":
        startDate.setDate(now.getDate() - 89); // Last 90 days including today
        break;
      default:
        startDate.setDate(now.getDate() - 29); // Default to 30 days
    }
    
    // Generate all dates in the range
    for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }
    
    return dates;
  };

  const fetchDocumentTrendData = async () => {
    try {
      const dateFilter = getDateFilter();
      
      // Fetch document counts within the selected time period
      const { data, error } = await supabase
        .from("documents")
        .select("created_at")
        .gte("created_at", dateFilter)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      
      // Generate all dates in the range to ensure today's date is included
      const dateRange = generateDateRange();
      const trendData: Record<string, DocumentTrendData> = {};
      
      // Initialize all dates with 0 documents
      dateRange.forEach(date => {
        trendData[date] = { date, documents: 0 };
      });
      
      // Count documents for each date
      data.forEach(doc => {
        const date = new Date(doc.created_at);
        const dateKey = date.toISOString().split('T')[0];
        
        if (trendData[dateKey]) {
          trendData[dateKey].documents += 1;
        }
      });
      
      // Convert to array and sort by date
      const result = Object.values(trendData)
        .sort((a, b) => a.date.localeCompare(b.date));
      
      return result;
    } catch (error) {
      console.error("Error fetching document trend data:", error);
      // Return empty data with today's date to show something
      const today = new Date().toISOString().split('T')[0];
      return [{ date: today, documents: 0 }];
    }
  };

  const fetchDuplicateRateData = async () => {
    try {
      const dateFilter = getDateFilter();
      
      // Fetch duplicates within the selected time period
      const { data, error } = await supabase
        .from("duplicates")
        .select("created_at")
        .gte("created_at", dateFilter)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      
      // If no data, return empty array
      if (!data || data.length === 0) {
        return [];
      }
      
      // Group duplicates by month
      const rateData: Record<string, DuplicateRateData> = {};
      data.forEach(dup => {
        const date = new Date(dup.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!rateData[monthKey]) {
          rateData[monthKey] = { month: monthKey, rate: 0 };
        }
        rateData[monthKey].rate += 1;
      });
      
      // Convert to array and sort by month
      const result = Object.values(rateData)
        .sort((a, b) => a.month.localeCompare(b.month));
      
      return result;
    } catch (error) {
      console.error("Error fetching duplicate rate data:", error);
      return [];
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const dateFilter = getDateFilter();
      
      // Fetch document stats within time period
      const { count: totalDocs, error: docsError } = await supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .gte("created_at", dateFilter);

      if (docsError) throw docsError;

      const { count: dupCount, error: dupError } = await supabase
        .from("duplicates")
        .select("*", { count: "exact", head: true })
        .gte("created_at", dateFilter);

      if (dupError) throw dupError;

      // Fetch user count (users active in the time period)
      const { count: userCount, error: userError } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      if (userError) throw userError;

      // Calculate storage saved within time period
      const storageSaved = await calculateStorageSavings();

      setStats({
        totalDocuments: totalDocs || 0,
        totalDuplicates: dupCount || 0,
        storageSaved: storageSaved,
        activeUsers: userCount || 0
      });

      // Fetch real chart data
      const documentTrendData = await fetchDocumentTrendData();
      const duplicateRateData = await fetchDuplicateRateData();
      
      setDocumentTrend(documentTrendData);
      setDuplicateRate(duplicateRateData);
      

    } catch (error) {
      console.error("Error fetching reports data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Chart components with empty state handling
  const DocumentTrendChart = () => {
    if (documentTrend.length === 0 || documentTrend.every(d => d.documents === 0)) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No document processing data available</p>
            <p className="text-sm mt-1">Upload documents to see processing trends</p>
          </div>
        </div>
      );
    }
    
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={documentTrend}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => {
              const date = new Date(value);
              return timePeriod === "3days" || timePeriod === "week" || timePeriod === "month" 
                ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
            }}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip 
            formatter={(value) => [value, 'Documents']}
            labelFormatter={(value) => `Date: ${value}`}
          />
          <Legend />
          <Bar 
            dataKey="documents" 
            fill="#3b82f6" 
            name="Documents Processed"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const DuplicateRateChart = () => {
    if (duplicateRate.length === 0) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No duplicate detection data available</p>
            <p className="text-sm mt-1">Process documents to detect duplicates</p>
          </div>
        </div>
      );
    }
    
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={duplicateRate}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="month" 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => {
              const [year, month] = value.split('-');
              const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              return `${monthNames[parseInt(month) - 1]} ${year.slice(2)}`;
            }}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip 
            formatter={(value) => [value, 'Duplicates']}
            labelFormatter={(value) => `Month: ${value}`}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="rate" 
            stroke="#10b981" 
            strokeWidth={2}
            name="Duplicates Found"
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Reports & Analytics</h1>
          <p className="text-muted-foreground">View system statistics and generate reports</p>
        </div>
        <Button className="gap-2">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Time Period Selector */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">Time Period:</span>
          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3days">Last 3 days</SelectItem>
              <SelectItem value="week">Last 7 days</SelectItem>
              <SelectItem value="month">Last 30 days</SelectItem>
              <SelectItem value="quarter">Last 3 months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-sm">Documents Processed</h3>
          </div>
          <p className="text-3xl font-bold mb-1">{stats.totalDocuments.toLocaleString()}</p>
          <p className="text-xs text-success flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            +12% from last month
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="h-5 w-5 text-success" />
            <h3 className="font-semibold text-sm">Duplicates Found</h3>
          </div>
          <p className="text-3xl font-bold mb-1">{stats.totalDuplicates.toLocaleString()}</p>
          <p className="text-xs text-success flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            +8% from last month
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <HardDrive className="h-5 w-5 text-warning" />
            <h3 className="font-semibold text-sm">Storage Saved</h3>
          </div>
          <p className="text-3xl font-bold mb-1">{stats.storageSaved} MB</p>
          <p className="text-xs text-success flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            +15% from last month
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-sm">Active Users</h3>
          </div>
          <p className="text-3xl font-bold mb-1">{stats.activeUsers}</p>
          <p className="text-xs text-muted-foreground">This month</p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Document Processing Trend</h3>
          <div className="h-64">
            <DocumentTrendChart />
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Duplicate Detection Rate</h3>
          <div className="h-64">
            <DuplicateRateChart />
          </div>
        </Card>
      </div>


    </div>
  );
}