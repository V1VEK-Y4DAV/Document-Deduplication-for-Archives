import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Eye, Trash2, Calendar, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { documentService, Document } from "@/services/documentService";
import { format } from "date-fns";
import { toast } from "sonner";

export default function Storage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchDocuments();
    }
  }, [user]);

  const fetchDocuments = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const docs = await documentService.getDocuments(user.id);
      setDocuments(docs);
    } catch (err) {
      console.error("Error fetching documents:", err);
      setError("Failed to load documents. Please try again later.");
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const { data, error } = await documentService.supabase.storage
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
      const { data, error } = await documentService.supabase.storage
        .from("documents")
        .createSignedUrl(doc.storage_path, 60);
      
      if (error) throw error;
      
      window.open(data.signedUrl, "_blank");
    } catch (error) {
      console.error("View error:", error);
      toast.error("Failed to view document. The file may not exist or you may not have permission to access it.");
    }
  };

  const handleDelete = async (doc: Document) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${doc.file_name}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      const success = await documentService.deleteDocument(doc.id, doc.storage_path);
      if (success) {
        // Update the UI immediately
        setDocuments(prev => prev.filter(d => d.id !== doc.id));
        toast.success("Document deleted successfully");
      } else {
        toast.error("Failed to delete document");
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete document");
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes("pdf")) return "📄";
    if (fileType.includes("word") || fileType.includes("doc")) return "📝";
    if (fileType.includes("text") || fileType.includes("txt")) return "📄";
    return "📁";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="p-8 text-center max-w-md">
          <FileText className="h-16 w-16 mx-auto mb-4 text-destructive" />
          <h3 className="text-lg font-semibold mb-2">Error Loading Documents</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchDocuments}>Retry</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Document Storage</h1>
        <p className="text-muted-foreground">Manage all your uploaded documents</p>
      </div>

      {documents.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No documents found</h3>
          <p className="text-muted-foreground mb-4">Upload your first document to get started</p>
          <Button onClick={() => window.location.hash = "/upload"}>Upload Document</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <Card key={doc.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="text-2xl">
                  {getFileIcon(doc.file_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{doc.file_name}</h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{format(new Date(doc.created_at), "MMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>{(doc.file_size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 mt-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleView(doc)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleDownload(doc)}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleDelete(doc)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}