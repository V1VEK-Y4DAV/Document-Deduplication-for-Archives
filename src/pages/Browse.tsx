import { useState, useEffect, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Folder,
  FileText,
  ChevronRight,
  Home,
  Grid3x3,
  List,
  Download,
  Eye,
  Flame,
  Search,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";

interface Document {
  id: string;
  file_name: string;
  file_size: number;
  created_at: string;
  file_type: string;
  storage_path: string;
}

export default function Browse() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;
  const { user } = useAuth();

  // Fetch documents with React Query
  const { data: documents = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['browseDocuments', user?.id, searchTerm, sortBy, currentPage],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from('documents')
        .select(`
          id,
          file_name,
          file_size,
          created_at,
          file_type,
          storage_path
        `)
        .eq('user_id', user.id);
      
      // Apply search filter
      if (searchTerm) {
        query = query.ilike('file_name', `%${searchTerm}%`);
      }
      
      // Apply sorting
      switch (sortBy) {
        case "name":
          query = query.order('file_name');
          break;
        case "date":
          query = query.order('created_at', { ascending: false });
          break;
        case "size":
          query = query.order('file_size', { ascending: false });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }
      
      // Apply pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return data || [];
    },
    enabled: !!user,
    staleTime: 30000, // Cache for 30 seconds
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  // Fetch total document count for pagination
  const { data: totalCount = 0 } = useQuery({
    queryKey: ['documentCount', user?.id, searchTerm],
    queryFn: async () => {
      if (!user) return 0;
      
      let query = supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      // Apply search filter
      if (searchTerm) {
        query = query.ilike('file_name', `%${searchTerm}%`);
      }
      
      const { count, error } = await query;
      
      if (error) throw error;
      
      return count || 0;
    },
    enabled: !!user,
    staleTime: 30000, // Cache for 30 seconds
  });

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handleViewDocument = useCallback(async (storagePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .createSignedUrl(storagePath, 60);
      
      if (error) throw error;
      
      window.open(data.signedUrl, "_blank");
    } catch (error) {
      console.error("View error:", error);
      toast.error("Failed to view document");
    }
  }, []);

  const handleDownloadDocument = useCallback(async (storagePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .download(storagePath);
      
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Download started");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download document");
    }
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
  }, []);

  const handleSortChange = useCallback((value: string) => {
    setSortBy(value);
    setCurrentPage(1); // Reset to first page when sorting
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-destructive mb-4">
            <FileText className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">Error loading documents</h3>
          <p className="text-muted-foreground mb-4">
            {error instanceof Error ? error.message : "An unknown error occurred"}
          </p>
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Document Archive</h1>
        <p className="text-muted-foreground">Browse and manage your document archive</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Panel - Simple Navigation */}
        <Card className="p-4 lg:col-span-1">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Folder className="h-5 w-5 text-primary" />
            Navigation
          </h3>
          <div className="space-y-1">
            <div className="flex items-center gap-2 p-2 bg-primary/10 text-primary rounded-lg font-medium">
              <Home className="h-4 w-4" />
              <span className="text-sm">All Documents</span>
              <Badge variant="secondary" className="text-xs ml-auto">
                {totalCount}
              </Badge>
            </div>
          </div>
        </Card>

        {/* Main Area - Document Grid/List */}
        <div className="lg:col-span-3 space-y-4">
          {/* Breadcrumb & Controls */}
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Home className="h-4 w-4" />
                <ChevronRight className="h-4 w-4" />
                <span className="text-foreground font-medium">All Documents</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search documents..."
                    className="pl-8 w-48"
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                  />
                </div>
                <Select value={sortBy} onValueChange={handleSortChange}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="size">Size</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex border rounded-lg overflow-hidden">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    className="rounded-none"
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid3x3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    className="rounded-none border-l"
                    onClick={() => setViewMode("list")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Document Grid/List */}
          {documents.length === 0 ? (
            <Card className="p-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">No documents found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? "No documents match your search criteria" : "Upload your first document to get started"}
              </p>
            </Card>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((doc) => (
                <Card key={doc.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">{doc.file_name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(doc.created_at), "MMM dd, yyyy")}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{(doc.file_size / 1024 / 1024).toFixed(2)} MB</span>
                      <span className="uppercase">{doc.file_type.split('/').pop()}</span>
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleViewDocument(doc.storage_path)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleDownloadDocument(doc.storage_path, doc.file_name)}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-4">
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-4 p-3 hover:bg-accent rounded-lg transition-colors"
                  >
                    <FileText className="h-6 w-6 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{doc.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(doc.created_at), "MMM dd, yyyy")}
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDocument(doc.storage_path)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadDocument(doc.storage_path, doc.file_name)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Pagination */}
          {totalCount > itemsPerPage && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalCount)} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} documents
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  {totalPages > 5 && (
                    <>
                      {currentPage < totalPages - 2 && <span className="px-2">...</span>}
                      <Button
                        variant={currentPage === totalPages ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(totalPages)}
                      >
                        {totalPages}
                      </Button>
                    </>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}