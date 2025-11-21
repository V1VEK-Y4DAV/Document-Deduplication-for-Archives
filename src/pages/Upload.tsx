import { useState, useRef, ChangeEvent, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload as UploadIcon, FileText, Calendar, AlertCircle, CheckCircle, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { documentService, Document } from "@/services/documentService";
import { deduplicationService, DuplicateResult } from "@/services/deduplicationService";
import { toast } from "sonner";

interface SelectedFile extends File {
  id: string;
}

export default function Upload() {
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [processed, setProcessed] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [duplicateResults, setDuplicateResults] = useState<DuplicateResult | null>(null);
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
    setDuplicateResults(null);
    
    try {
      console.log("Starting upload process for", files.length, "files");
      
      // Upload each file and check for duplicates
      const results = [];
      for (const file of files) {
        // Upload the file
        const uploadResult = await documentService.uploadDocument({
          file,
          userId: user.id,
          departmentId: undefined
        });
        
        if (uploadResult.success && uploadResult.document) {
          // Update document with content hash
          await deduplicationService.updateDocumentHash(
            uploadResult.document.id,
            user.id,
            file
          );
          
          // Check for duplicates
          const duplicates = await deduplicationService.checkForDuplicates(
            user.id,
            file,
            uploadResult.document.id
          );
          
          results.push({
            file,
            document: uploadResult.document,
            duplicates
          });
        } else {
          results.push({
            file,
            error: uploadResult.error
          });
        }
      }
      
      // Check if all uploads were successful
      const allSuccessful = results.every(result => !result.error);
      
      if (allSuccessful) {
        // Fix: Show duplicate results from any file that has duplicates, not just the first one
        // Look for the first file with duplicates, or show results from the first file if none have duplicates
        let resultsToShow = null;
        if (results.length > 0) {
          // Find the first file with actual duplicates
          const fileWithDuplicates = results.find(result => 
            result.duplicates && 
            (result.duplicates.exact.length > 0 || result.duplicates.similar.length > 0)
          );
          
          // If we found a file with duplicates, show those results
          // Otherwise, show results from the first file
          resultsToShow = fileWithDuplicates ? fileWithDuplicates.duplicates : results[0].duplicates;
        }
        
        if (resultsToShow) {
          setDuplicateResults(resultsToShow);
        }
        
        setProcessed(true);
        setFiles([]);
        toast.success(`Successfully uploaded ${files.length} document(s) and checked for duplicates`);
      } else {
        const errors = results.filter(result => result.error).map(result => result.error);
        toast.error(`Some uploads failed: ${errors.join(', ')}`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to process documents");
    } finally {
      setUploading(false);
    }
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
      {processed && duplicateResults && (
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
          {duplicateResults.exact.length > 0 && (
            <Card className="p-6 border-destructive/50">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <h3 className="text-lg font-semibold text-destructive-foreground">Exact Duplicates Found</h3>
              </div>
              <div className="space-y-3">
                {duplicateResults.exact.map((file, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 bg-stat-red rounded-lg">
                    <FileText className="h-6 w-6 text-destructive" />
                    <div className="flex-1">
                      <p className="font-medium">{file.file_name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(file.created_at).toLocaleDateString()}
                        </span>
                        <Badge className="text-xs bg-destructive text-destructive-foreground">
                          {file.match_percentage}% Match
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
          )}

          {/* Similar Documents */}
          {duplicateResults.similar.length > 0 && (
            <Card className="p-6 border-warning/50">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="h-5 w-5 text-warning" />
                <h3 className="text-lg font-semibold text-warning-foreground">Similar Documents (Near Duplicates)</h3>
              </div>
              <div className="space-y-3">
                {duplicateResults.similar.map((file, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 bg-stat-amber rounded-lg">
                    <FileText className="h-6 w-6 text-warning" />
                    <div className="flex-1">
                      <p className="font-medium">{file.file_name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(file.created_at).toLocaleDateString()}
                        </span>
                        <Badge className="text-xs bg-warning text-warning-foreground">
                          {file.similarity_score}% Match
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
          )}

          {/* No Duplicates Found */}
          {duplicateResults.exact.length === 0 && duplicateResults.similar.length === 0 && (
            <Card className="p-6">
              <div className="flex items-center gap-4 p-4 bg-stat-green rounded-lg">
                <CheckCircle className="h-8 w-8 text-success" />
                <div className="flex-1">
                  <p className="font-medium">No duplicates found</p>
                  <p className="text-sm text-muted-foreground">Your uploaded documents appear to be unique</p>
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}