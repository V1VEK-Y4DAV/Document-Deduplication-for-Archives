import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search as SearchIcon, FileText, User, Calendar, Flame, Download, Eye, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";

type Document = {
  id: string;
  file_name: string;
  created_at: string;
  department_id: string | null;
  similarity_score: number | null;
  file_type: string;
  storage_path: string;
  profiles: {
    full_name: string | null;
  } | null;
  departments: {
    name: string;
  } | null;
};

export default function Search() {
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("similarity");
  const [groupBySimilarity, setGroupBySimilarity] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch departments
  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch documents with filters
  const { data: documents, isLoading } = useQuery({
    queryKey: ["documents", debouncedSearch, departmentFilter, typeFilter, dateFrom, dateTo, sortBy],
    queryFn: async () => {
      let query = supabase
        .from("documents")
        .select(`
          *,
          profiles:user_id (full_name),
          departments:department_id (name)
        `);

      // Apply search filter
      if (debouncedSearch) {
        query = query.ilike("file_name", `%${debouncedSearch}%`);
      }

      // Apply department filter
      if (departmentFilter !== "all") {
        query = query.eq("department_id", departmentFilter);
      }

      // Apply type filter
      if (typeFilter !== "all") {
        query = query.ilike("file_type", `%${typeFilter}%`);
      }

      // Apply date filters
      if (dateFrom) {
        query = query.gte("created_at", dateFrom);
      }
      if (dateTo) {
        query = query.lte("created_at", dateTo);
      }

      // Apply sorting
      switch (sortBy) {
        case "similarity":
          query = query.order("similarity_score", { ascending: false });
          break;
        case "name":
          query = query.order("file_name");
          break;
        case "date":
          query = query.order("created_at", { ascending: false });
          break;
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Document[];
    },
  });

  // Group documents by similarity if enabled
  const processedDocuments = groupBySimilarity && documents
    ? documents.reduce((acc, doc) => {
        const score = doc.similarity_score || 0;
        const group = Math.floor(score / 10) * 10;
        if (!acc[group]) acc[group] = [];
        acc[group].push(doc);
        return acc;
      }, {} as Record<number, Document[]>)
    : null;

  const handleReset = () => {
    setSearchQuery("");
    setDepartmentFilter("all");
    setTypeFilter("all");
    setDateFrom("");
    setDateTo("");
    setSortBy("similarity");
    setGroupBySimilarity(false);
  };

  const handleDownload = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .download(doc.storage_path);
      
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.file_name;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Download started");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download document");
    }
  };

  const handleView = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .createSignedUrl(doc.storage_path, 60);
      
      if (error) throw error;
      
      window.open(data.signedUrl, "_blank");
    } catch (error) {
      console.error("View error:", error);
      toast.error("Failed to view document");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Advanced Document Search</h1>
        <p className="text-muted-foreground">Search and filter documents across your archive</p>
      </div>

      {/* Search Controls */}
      <Card className="p-6">
        <div className="space-y-4">
          {/* Main Search Bar */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search documents by name, content, or author..."
              className="pl-10 h-12 text-lg"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Department: All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments?.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Document Type: All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="docx">Word Document</SelectItem>
                <SelectItem value="txt">Text File</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              placeholder="From"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <Input
              type="date"
              placeholder="To"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleReset}>Reset Filters</Button>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="group-similarity"
                checked={groupBySimilarity}
                onCheckedChange={setGroupBySimilarity}
              />
              <Label htmlFor="group-similarity">Group by similarity</Label>
            </div>
          </div>
        </div>
      </Card>

      {/* Results Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </span>
            ) : (
              <>
                Found <span className="font-semibold text-foreground">{documents?.length || 0}</span> documents
              </>
            )}
          </p>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="similarity">Similarity</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="date">Date</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : groupBySimilarity && processedDocuments ? (
          // Grouped view
          <div className="space-y-6">
            {Object.entries(processedDocuments)
              .sort(([a], [b]) => Number(b) - Number(a))
              .map(([group, docs]) => (
                <div key={group} className="space-y-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Flame className="h-5 w-5 text-primary" />
                    {group}-{Number(group) + 9}% Similarity ({docs.length} documents)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {docs.map((doc) => (
                      <DocumentCard key={doc.id} doc={doc} onView={handleView} onDownload={handleDownload} />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        ) : documents && documents.length > 0 ? (
          // Regular grid view
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} onView={handleView} onDownload={handleDownload} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No documents found. Try adjusting your filters.
          </div>
        )}
      </div>
    </div>
  );
}

// Document Card Component
function DocumentCard({
  doc,
  onView,
  onDownload,
}: {
  doc: Document;
  onView: (doc: Document) => void;
  onDownload: (doc: Document) => void;
}) {
  return (
    <Card className="p-4 hover:shadow-lg transition-shadow">
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <FileText className="h-8 w-8 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate">{doc.file_name}</h3>
            <div className="flex items-center gap-2 mt-1">
              {doc.departments && (
                <Badge variant="outline" className="text-xs">
                  {doc.departments.name}
                </Badge>
              )}
              {doc.similarity_score !== null && (
                <Badge className="text-xs bg-primary/10 text-primary hover:bg-primary/20">
                  <Flame className="h-3 w-3 mr-1" />
                  {doc.similarity_score}%
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>Author: {doc.profiles?.full_name || "Unknown"}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>Date: {format(new Date(doc.created_at), "MMM dd, yyyy")}</span>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onView(doc)}>
            <Eye className="h-3 w-3 mr-1" />
            View
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onDownload(doc)}>
            <Download className="h-3 w-3 mr-1" />
            Download
          </Button>
        </div>
      </div>
    </Card>
  );
}
