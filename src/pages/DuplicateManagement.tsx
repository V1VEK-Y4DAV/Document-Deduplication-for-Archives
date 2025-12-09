import { useState, useEffect, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  User, 
  Calendar, 
  Download, 
  Eye, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Filter,
  RotateCcw
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { toast } from "sonner";
import { deduplicationService } from "@/services/deduplicationService";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface DuplicateDocument {
  id: string;
  source_document: {
    id: string;
    file_name: string;
    file_size: number;
    created_at: string;
    file_type: string;
    storage_path: string;
    profiles: {
      full_name: string | null;
    } | null;
  };
  duplicate_document: {
    id: string;
    file_name: string;
    file_size: number;
    created_at: string;
    file_type: string;
    storage_path: string;
    profiles: {
      full_name: string | null;
    } | null;
  };
  similarity_percentage: number;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export default function DuplicateManagement() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("similarity");
  const [selectedDuplicates, setSelectedDuplicates] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch duplicate documents with pagination
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['duplicateDocuments', user?.id, currentPage, itemsPerPage],
    queryFn: async () => {
      if (!user) throw new Error("User not authenticated");
      
      console.log("Fetching duplicates for user:", user.id);
      
      try {
        const data = await deduplicationService.getAllDuplicateDocuments(
          user.id, 
          currentPage, 
          itemsPerPage
        );
        
        console.log("Received data:", data);
        
        // Fetch deleted duplicates count
        const count = await deduplicationService.getDeletedDuplicatesCount(user.id);
        
        return {
          duplicates: data,
          deletedDuplicatesCount: count
        };
      } catch (err) {
        console.error("Error in queryFn:", err);
        throw err;
      }
    },
    enabled: !!user,
    staleTime: 30000, // Cache for 30 seconds
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  const duplicates = data?.duplicates || [];
  const deletedDuplicatesCount = data?.deletedDuplicatesCount || 0;

  // Memoized filtered and sorted duplicates
  const filteredAndSortedDuplicates = useMemo(() => {
    let filtered = [...duplicates];
    
    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(dup => dup.status === statusFilter);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "similarity":
          return b.similarity_percentage - a.similarity_percentage;
        case "date":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "name":
          return a.source_document.file_name.localeCompare(b.source_document.file_name);
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [duplicates, statusFilter, sortBy]);

  const totalPages = Math.ceil(duplicates.length / itemsPerPage);

  const handleDownload = useCallback(async (storagePath: string, fileName: string) => {
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

  const handleView = useCallback(async (storagePath: string) => {
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

  const handleMarkAsReviewed = useCallback(async (duplicateId: string) => {
    try {
      if (!user) return;
      
      await deduplicationService.updateDuplicateStatus(duplicateId, "reviewed", user.id);
      
      // Update local state
      queryClient.invalidateQueries({ queryKey: ['duplicateDocuments', user.id, currentPage, itemsPerPage] });
      
      toast.success("Marked as reviewed");
    } catch (error) {
      console.error("Error updating duplicate:", error);
      toast.error("Failed to update duplicate status");
    }
  }, [user, queryClient, currentPage, itemsPerPage]);

  const handleDismiss = useCallback(async (duplicateId: string) => {
    try {
      if (!user) return;
      
      await deduplicationService.updateDuplicateStatus(duplicateId, "dismissed", user.id);
      
      // Update local state
      queryClient.invalidateQueries({ queryKey: ['duplicateDocuments', user.id, currentPage, itemsPerPage] });
      
      toast.success("Duplicate dismissed");
    } catch (error) {
      console.error("Error dismissing duplicate:", error);
      toast.error("Failed to dismiss duplicate");
    }
  }, [user, queryClient, currentPage, itemsPerPage]);

  const handleDeleteDuplicate = useCallback(async (sourceDocumentId: string, duplicateDocumentId: string) => {
    try {
      if (!user) return;
      
      await deduplicationService.deleteDuplicateDocuments(sourceDocumentId, duplicateDocumentId, user.id);
      
      // Update local state
      queryClient.invalidateQueries({ queryKey: ['duplicateDocuments', user.id, currentPage, itemsPerPage] });
      
      toast.success("Duplicate document deleted");
    } catch (error) {
      console.error("Error deleting duplicate:", error);
      toast.error("Failed to delete duplicate document");
    }
  }, [user, queryClient, currentPage, itemsPerPage]);

  const getStatusBadge = useCallback((status: string) => {
    switch (status) {
      case "exact":
        return <Badge className="bg-destructive hover:bg-destructive/90">Exact Match</Badge>;
      case "similar":
        return <Badge className="bg-warning hover:bg-warning/90">Similar</Badge>;
      case "reviewed":
        return <Badge className="bg-success hover:bg-success/90">Reviewed</Badge>;
      case "dismissed":
        return <Badge className="bg-muted hover:bg-muted/90">Dismissed</Badge>;
      default:
        return <Badge className="bg-muted">{status}</Badge>;
    }
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedDuplicates.length === filteredAndSortedDuplicates.length) {
      setSelectedDuplicates([]);
    } else {
      setSelectedDuplicates(filteredAndSortedDuplicates.map(dup => dup.id));
    }
  }, [selectedDuplicates.length, filteredAndSortedDuplicates]);

  const handleSelectDuplicate = useCallback((id: string) => {
    setSelectedDuplicates(prev => 
      prev.includes(id) 
        ? prev.filter(dupId => dupId !== id) 
        : [...prev, id]
    );
  }, []);

  const handleBulkAction = useCallback(async (action: "review" | "dismiss" | "delete") => {
    try {
      if (!user) return;
      
      const promises = selectedDuplicates.map(id => {
        const duplicate = filteredAndSortedDuplicates.find(dup => dup.id === id);
        if (!duplicate) return Promise.resolve();
        
        switch (action) {
          case "review":
            return deduplicationService.updateDuplicateStatus(id, "reviewed", user.id);
          case "dismiss":
            return deduplicationService.updateDuplicateStatus(id, "dismissed", user.id);
          case "delete":
            return deduplicationService.deleteDuplicateDocuments(
              duplicate.source_document.id, 
              duplicate.duplicate_document.id, 
              user.id
            );
          default:
            return Promise.resolve();
        }
      });
      
      await Promise.all(promises);
      
      // Update local state
      queryClient.invalidateQueries({ queryKey: ['duplicateDocuments', user.id, currentPage, itemsPerPage] });
      setSelectedDuplicates([]);
      
      toast.success(`Bulk action completed successfully`);
    } catch (error) {
      console.error("Error performing bulk action:", error);
      toast.error("Failed to perform bulk action");
    }
  }, [selectedDuplicates, filteredAndSortedDuplicates, user, queryClient, currentPage, itemsPerPage]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    setSelectedDuplicates([]);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading duplicate management...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-destructive mb-4">
            <AlertTriangle className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">Error loading duplicates</h3>
          <p className="text-muted-foreground mb-4">
            {error instanceof Error ? error.message : "An unknown error occurred"}
          </p>
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="pb-2 border-b border-border/50">
        <h1 className="text-3xl font-bold text-foreground">Duplicate Management</h1>
        <p className="text-muted-foreground mt-2">Review and manage duplicate documents in your archive</p>
      </div>

      {/* Filters and Controls */}
      <Card className="p-6 rounded-xl border shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Filter by Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="exact">Exact Match</SelectItem>
                  <SelectItem value="similar">Similar</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Sort by</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="similarity">Similarity</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-5 rounded-xl border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Exact Duplicates</p>
              <p className="text-2xl font-bold text-destructive">
                {duplicates.filter(d => d.status === "exact").length}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-5 rounded-xl border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Similar Documents</p>
              <p className="text-2xl font-bold text-warning">
                {duplicates.filter(d => d.status === "similar").length}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-5 rounded-xl border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Reviewed</p>
              <p className="text-2xl font-bold text-success">
                {duplicates.filter(d => d.status === "reviewed").length}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-5 rounded-xl border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted/10">
              <XCircle className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Dismissed</p>
              <p className="text-2xl font-bold text-muted-foreground">
                {duplicates.filter(d => d.status === "dismissed").length}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-5 rounded-xl border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <Trash2 className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Deleted Duplicates</p>
              <p className="text-2xl font-bold text-destructive">
                {deletedDuplicatesCount}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Bulk Actions */}
      {selectedDuplicates.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {selectedDuplicates.length} selected
          </span>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleBulkAction("review")}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Mark Reviewed
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleBulkAction("dismiss")}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Dismiss
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => handleBulkAction("delete")}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Duplicates List */}
      <Card className="p-6 rounded-xl border shadow-sm">
        <div className="rounded-lg border">
          <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-muted/50 text-sm font-medium text-foreground border-b">
            <div className="col-span-5">Source Document</div>
            <div className="col-span-5">Duplicate Document</div>
            <div className="col-span-2 flex justify-end">Actions</div>
          </div>
          
          {filteredAndSortedDuplicates.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">No duplicates found</h3>
              <p className="text-muted-foreground">
                All documents in your archive are unique
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredAndSortedDuplicates.map((duplicate) => (
                <div 
                  key={duplicate.id} 
                  className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-muted/30 transition-colors"
                >
                  {/* Source Document */}
                  <div className="col-span-5">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{duplicate.source_document.file_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(duplicate.source_document.created_at), "MMM dd, yyyy")}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {(duplicate.source_document.file_size / 1024 / 1024).toFixed(2)} MB
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Duplicate Document */}
                  <div className="col-span-5">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <FileText className="h-5 w-5 text-destructive" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{duplicate.duplicate_document.file_name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(duplicate.duplicate_document.created_at), "MMM dd, yyyy")}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {(duplicate.duplicate_document.file_size / 1024 / 1024).toFixed(2)} MB
                          </Badge>
                          <Badge className="text-xs bg-destructive/10 text-destructive">
                            {duplicate.similarity_percentage}% Match
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="col-span-2 flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleView(duplicate.duplicate_document.storage_path)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(duplicate.duplicate_document.storage_path, duplicate.duplicate_document.file_name)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarkAsReviewed(duplicate.id)}
                      disabled={duplicate.status === "reviewed"}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteDuplicate(duplicate.source_document.id, duplicate.duplicate_document.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Pagination */}
        {duplicates.length > itemsPerPage && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-muted-foreground">
              Showing {Math.min((currentPage - 1) * itemsPerPage + 1, duplicates.length)} to {Math.min(currentPage * itemsPerPage, duplicates.length)} of {duplicates.length} duplicates
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
      </Card>
    </div>
  );
}