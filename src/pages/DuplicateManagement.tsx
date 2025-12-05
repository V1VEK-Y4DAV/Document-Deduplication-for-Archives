import { useState, useEffect } from "react";
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
  const { user } = useAuth();
  const [duplicates, setDuplicates] = useState<DuplicateDocument[]>([]);
  const [filteredDuplicates, setFilteredDuplicates] = useState<DuplicateDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("similarity");
  const [selectedDuplicates, setSelectedDuplicates] = useState<string[]>([]);

  useEffect(() => {
    fetchDuplicates();
  }, []);

  useEffect(() => {
    filterAndSortDuplicates();
  }, [duplicates, statusFilter, sortBy]);

  const fetchDuplicates = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from("duplicates")
        .select(`
          *,
          source_document:documents!duplicates_source_document_id_fkey (
            id,
            file_name,
            file_size,
            created_at,
            file_type,
            storage_path,
            profiles:user_id (full_name)
          ),
          duplicate_document:documents!duplicates_duplicate_document_id_fkey (
            id,
            file_name,
            file_size,
            created_at,
            file_type,
            storage_path,
            profiles:user_id (full_name)
          )
        `)
        .order("similarity_percentage", { ascending: false });

      // For non-admin users, only show their duplicates
      if (user) {
        query = query.or(`source_document.user_id.eq.${user.id},duplicate_document.user_id.eq.${user.id}`);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      setDuplicates(data || []);
    } catch (error) {
      console.error("Error fetching duplicates:", error);
      toast.error("Failed to load duplicates");
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortDuplicates = () => {
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
    
    setFilteredDuplicates(filtered);
  };

  const handleDownload = async (storagePath: string, fileName: string) => {
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
  };

  const handleView = async (storagePath: string) => {
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
  };

  const handleMarkAsReviewed = async (duplicateId: string) => {
    try {
      const { error } = await supabase
        .from("duplicates")
        .update({ 
          status: "reviewed",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq("id", duplicateId);

      if (error) throw error;
      
      // Update local state
      setDuplicates(prev => prev.map(dup => 
        dup.id === duplicateId 
          ? { ...dup, status: "reviewed", reviewed_at: new Date().toISOString(), reviewed_by: user?.id } 
          : dup
      ));
      
      toast.success("Marked as reviewed");
    } catch (error) {
      console.error("Error updating duplicate:", error);
      toast.error("Failed to update duplicate status");
    }
  };

  const handleDismiss = async (duplicateId: string) => {
    try {
      const { error } = await supabase
        .from("duplicates")
        .update({ status: "dismissed" })
        .eq("id", duplicateId);

      if (error) throw error;
      
      // Update local state
      setDuplicates(prev => prev.map(dup => 
        dup.id === duplicateId ? { ...dup, status: "dismissed" } : dup
      ));
      
      toast.success("Duplicate dismissed");
    } catch (error) {
      console.error("Error dismissing duplicate:", error);
      toast.error("Failed to dismiss duplicate");
    }
  };

  const handleDeleteDuplicate = async (documentId: string) => {
    try {
      // First, delete the duplicate record from duplicates table
      const { error: duplicateError } = await supabase
        .from("duplicates")
        .delete()
        .or(`source_document_id.eq.${documentId},duplicate_document_id.eq.${documentId}`);

      if (duplicateError) throw duplicateError;

      // Then delete the actual document
      const { error: documentError } = await supabase
        .from("documents")
        .delete()
        .eq("id", documentId);

      if (documentError) throw documentError;
      
      // Update local state
      setDuplicates(prev => prev.filter(dup => 
        dup.source_document.id !== documentId && dup.duplicate_document.id !== documentId
      ));
      
      toast.success("Duplicate document deleted");
    } catch (error) {
      console.error("Error deleting duplicate:", error);
      toast.error("Failed to delete duplicate document");
    }
  };

  const getStatusBadge = (status: string) => {
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
  };

  const handleSelectAll = () => {
    if (selectedDuplicates.length === filteredDuplicates.length) {
      setSelectedDuplicates([]);
    } else {
      setSelectedDuplicates(filteredDuplicates.map(dup => dup.id));
    }
  };

  const handleSelectDuplicate = (id: string) => {
    setSelectedDuplicates(prev => 
      prev.includes(id) 
        ? prev.filter(dupId => dupId !== id) 
        : [...prev, id]
    );
  };

  const handleBulkAction = async (action: "review" | "dismiss" | "delete") => {
    try {
      const promises = selectedDuplicates.map(id => {
        switch (action) {
          case "review":
            return handleMarkAsReviewed(id);
          case "dismiss":
            return handleDismiss(id);
          case "delete":
            const duplicate = filteredDuplicates.find(dup => dup.id === id);
            return duplicate ? handleDeleteDuplicate(duplicate.duplicate_document.id) : Promise.resolve();
          default:
            return Promise.resolve();
        }
      });
      
      await Promise.all(promises);
      
      setSelectedDuplicates([]);
      toast.success(`Bulk ${action} completed`);
    } catch (error) {
      console.error(`Error in bulk ${action}:`, error);
      toast.error(`Failed to complete bulk ${action}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Duplicate Management</h1>
          <p className="text-muted-foreground mt-1">
            Review and manage duplicate documents in your archive
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchDuplicates}
            disabled={loading}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters and Controls */}
      <Card className="p-6 rounded-xl border shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="exact">Exact Match</SelectItem>
                <SelectItem value="similar">Similar</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Sort by:</span>
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
                variant="outline" 
                size="sm" 
                onClick={() => handleBulkAction("delete")}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
      </div>

      {/* Duplicates List */}
      <Card className="p-6 rounded-xl border shadow-sm">
        <div className="rounded-lg border">
          <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-muted/50 text-sm font-medium text-foreground border-b">
            <div className="col-span-5">Source Document</div>
            <div className="col-span-5">Duplicate Document</div>
            <div className="col-span-2 flex justify-end">Actions</div>
          </div>
          
          {filteredDuplicates.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">No duplicates found</h3>
              <p className="text-muted-foreground">
                All documents in your archive are unique
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredDuplicates.map((duplicate) => (
                <div 
                  key={duplicate.id} 
                  className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-muted/30 transition-colors"
                >
                  {/* Source Document */}
                  <div className="col-span-5">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-foreground truncate">
                            {duplicate.source_document.file_name}
                          </h4>
                          {getStatusBadge(duplicate.status)}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span>{(duplicate.source_document.file_size / 1024).toFixed(1)} KB</span>
                          <span>{format(new Date(duplicate.source_document.created_at), "MMM dd, yyyy")}</span>
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {duplicate.source_document.profiles?.full_name || "Unknown"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {duplicate.source_document.file_type}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {duplicate.similarity_percentage}% similar
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Duplicate Document */}
                  <div className="col-span-5">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground truncate">
                          {duplicate.duplicate_document.file_name}
                        </h4>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span>{(duplicate.duplicate_document.file_size / 1024).toFixed(1)} KB</span>
                          <span>{format(new Date(duplicate.duplicate_document.created_at), "MMM dd, yyyy")}</span>
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {duplicate.duplicate_document.profiles?.full_name || "Unknown"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {duplicate.duplicate_document.file_type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleView(duplicate.source_document.storage_path)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(duplicate.source_document.storage_path, duplicate.source_document.file_name)}
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
                      onClick={() => handleDeleteDuplicate(duplicate.duplicate_document.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}