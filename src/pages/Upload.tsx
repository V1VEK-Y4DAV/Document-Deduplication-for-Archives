import { useState, useRef, ChangeEvent, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload as UploadIcon, FileText, Calendar, AlertCircle, CheckCircle, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { documentService, Document } from "@/services/documentService";
import { toast } from "sonner";

interface SelectedFile extends File {
  id: string;
}

export default function Upload() {
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [processed, setProcessed] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    // Check if auth is ready
    if (user !== undefined) {
      setAuthChecked(true);
    }
  }, [user]);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).map(file => {
        // Create a proper File object with an id property
        const fileWithId = Object.assign(file, {
          id: Math.random().toString(36).substring(2, 9)
        }) as SelectedFile;
        return fileWithId;
      });
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(file => file.id !== id));
  };

  const handleProcess = async () => {
    if (!authChecked) {
      toast.error("Authentication status not ready. Please wait.");
      return;
    }

    if (!user) {
      toast.error("You must be logged in to upload documents");
      return;
    }

    if (files.length === 0) {
      toast.error("Please select at least one file to upload");
      return;
    }

    // Check file sizes
    const maxFileSize = 50 * 1024 * 1024; // 50MB
    for (const file of files) {
      if (file.size > maxFileSize) {
        toast.error(`File ${file.name} is too large. Maximum size is 50MB.`);
        return;
      }
    }

    setUploading(true);
    
    try {
      console.log("Starting upload process for", files.length, "files");
      
      // Upload each file
      const uploadPromises = files.map(file => 
        documentService.uploadDocument({
          file,
          userId: user.id,
          departmentId: undefined
        })
      );

      const results = await Promise.all(uploadPromises);
      
      // Check if all uploads were successful
      const allSuccessful = results.every(result => result.success);
      
      if (allSuccessful) {
        setProcessed(true);
        setFiles([]);
        toast.success(`Successfully uploaded ${files.length} document(s)`);
      } else {
        const errors = results.filter(result => !result.success).map(result => result.error);
        toast.error(`Some uploads failed: ${errors.join(', ')}`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to process documents");
    } finally {
      setUploading(false);
    }
  };

  const mockResults = {
    exact: [
      { name: "budget_2024_copy.pdf", date: "Jan 15, 2024", match: 100 },
      { name: "policy_duplicate.docx", date: "Dec 10, 2023", match: 100 },
    ],
    similar: [
      { name: "meeting_notes_v2.pdf", date: "Jan 10, 2024", match: 85 },
      { name: "report_draft.docx", date: "Dec 20, 2023", match: 78 },
    ],
  };

  if (!authChecked) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Upload Documents for Duplicate Check</h1>
        <p className="text-muted-foreground">Upload your documents to identify duplicates and similar files</p>
      </div>

      {/* Upload Zone */}
      <Card className="p-8">
        <div 
          className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Drop your documents here or click to browse</h3>
          <p className="text-sm text-muted-foreground mb-4">Supported formats: PDF, DOCX, DOC, TXT (Max 50MB each)</p>
          <Button variant="outline" size="lg" disabled={uploading || !user}>
            {uploading ? "Uploading..." : "Select Files"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.doc,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {files.length > 0 && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Selected Files ({files.length})</h4>
              <Button onClick={handleProcess} disabled={uploading || !user}>
                {uploading ? "Processing..." : "Upload Documents"}
              </Button>
            </div>
            
            <div className="space-y-2">
              {files.map((file) => (
                <div key={file.id} className="flex items-center gap-3 p-3 bg-accent rounded-lg">
                  <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(file.id)}
                    className="h-8 w-8"
                    disabled={uploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Results Section */}
      {processed && (
        <>
          {/* Uploaded File Info */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Upload Complete</h3>
            <div className="flex items-center gap-4 p-4 bg-accent rounded-lg">
              <CheckCircle className="h-8 w-8 text-success" />
              <div className="flex-1">
                <p className="font-medium">Documents successfully uploaded</p>
                <p className="text-sm text-muted-foreground">Your files have been processed and stored</p>
              </div>
            </div>
          </Card>

          {/* Exact Duplicates */}
          <Card className="p-6 border-destructive/50">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <h3 className="text-lg font-semibold text-destructive-foreground">Exact Duplicates Found</h3>
            </div>
            <div className="space-y-3">
              {mockResults.exact.map((file, index) => (
                <div key={index} className="flex items-center gap-4 p-4 bg-stat-red rounded-lg">
                  <FileText className="h-6 w-6 text-destructive" />
                  <div className="flex-1">
                    <p className="font-medium">{file.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {file.date}
                      </span>
                      <Badge className="text-xs bg-destructive text-destructive-foreground">
                        {file.match}% Match
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Preview
                    </Button>
                    <Button variant="outline" size="sm">
                      Keep New
                    </Button>
                    <Button variant="destructive" size="sm">
                      Delete New
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Similar Documents */}
          <Card className="p-6 border-warning/50">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="h-5 w-5 text-warning" />
              <h3 className="text-lg font-semibold text-warning-foreground">Similar Documents (Near Duplicates)</h3>
            </div>
            <div className="space-y-3">
              {mockResults.similar.map((file, index) => (
                <div key={index} className="flex items-center gap-4 p-4 bg-stat-amber rounded-lg">
                  <FileText className="h-6 w-6 text-warning" />
                  <div className="flex-1">
                    <p className="font-medium">{file.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {file.date}
                      </span>
                      <Badge className="text-xs bg-warning text-warning-foreground">
                        {file.match}% Match
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Preview
                    </Button>
                    <Button variant="outline" size="sm">
                      Merge
                    </Button>
                    <Button variant="secondary" size="sm">
                      Keep Both
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}