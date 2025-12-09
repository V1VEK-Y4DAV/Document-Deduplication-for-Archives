import { useState, useRef, ChangeEvent, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload as UploadIcon, FileText, Calendar, AlertCircle, CheckCircle, X, Eye, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { documentService, Document } from "@/services/documentService";
import { deduplicationService, DuplicateResult } from "@/services/deduplicationService";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DuplicateResults } from "@/components/DuplicateResults";

interface SelectedFile extends File {
  id: string;
}

interface ProcessedFile {
  file: File;
  document: Document;
  duplicates: DuplicateResult;
}

export default function Upload() {
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
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
    // Reset the input value to allow selecting the same file again
    if (e.target) {
      e.target.value = "";
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
    setProcessedFiles([]);
    
    try {
      console.log("Starting upload process for", files.length, "files");
      
      // Upload each file and check for duplicates
      const results: ProcessedFile[] = [];
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
          toast.error(`Failed to upload ${file.name}: ${uploadResult.error}`);
        }
      }
      
      // Check if all uploads were successful
      const allSuccessful = results.length === files.length;
      
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
        
        setProcessedFiles(results);
        setProcessed(true);
        setFiles([]);
        toast.success(`Successfully uploaded ${files.length} document(s) and checked for duplicates`);
      } else {
        toast.error(`Some uploads failed. Successfully uploaded ${results.length} out of ${files.length} files.`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to process documents");
    } finally {
      setUploading(false);
    }
  };

  const handleViewDocument = async (storagePath: string) => {
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

  const handleDeleteDocument = async (documentId: string, fileName: string) => {
    try {
      if (!user) return;
      
      // Delete the document
      const { error } = await supabase
        .from("documents")
        .delete()
        .eq("id", documentId)
        .eq("user_id", user.id);

      if (error) throw error;
      
      // Remove from processed files
      setProcessedFiles(prev => prev.filter(pf => pf.document.id !== documentId));
      
      // If this was in the current duplicate results, update those too
      if (duplicateResults) {
        const newExact = duplicateResults.exact.filter(f => f.id !== documentId);
        const newSimilar = duplicateResults.similar.filter(f => f.id !== documentId);
        
        setDuplicateResults({
          exact: newExact,
          similar: newSimilar
        });
      }
      
      toast.success(`Document ${fileName} deleted successfully`);
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete document");
    }
  };

  const handleDuplicateAction = async (action: string, fileId: string, fileName: string) => {
    if (!user) return;
    
    switch (action) {
      case "keep_both":
        toast.info(`Keeping both versions of ${fileName}`);
        break;
      case "merge":
        toast.info(`Merging documents for ${fileName}`);
        break;
      case "delete_duplicate":
        try {
          // Get the current document's hash
          const { data: currentDoc, error: docError } = await supabase
            .from("documents")
            .select("content_hash, file_name")
            .eq("id", fileId)
            .single();
          
          if (docError) throw docError;
          
          // Find the processed file that contains this duplicate
          const processedFile = processedFiles.find(pf => 
            pf.duplicates.exact.some(d => d.id === fileId) || 
            pf.duplicates.similar.some(d => d.id === fileId)
          );
          
          if (processedFile && currentDoc.content_hash) {
            // Get the source document (the one we just uploaded)
            const sourceDoc = processedFile.document;
            
            if (sourceDoc.content_hash) {
              // Store in deleted duplicates memory
              const { error: memoryError } = await supabase
                .from("deleted_duplicates_memory")
                .insert({
                  user_id: user.id,
                  source_content_hash: sourceDoc.content_hash,
                  duplicate_content_hash: currentDoc.content_hash,
                  source_file_name: sourceDoc.file_name,
                  duplicate_file_name: currentDoc.file_name,
                  notes: "Deleted during upload duplicate check"
                });
              
              if (memoryError) {
                console.error("Error storing deleted duplicate memory:", memoryError);
              }
            }
          }
          
          // Delete the duplicate document
          const { error } = await supabase
            .from("documents")
            .delete()
            .eq("id", fileId)
            .eq("user_id", user.id);
          
          if (error) throw error;
          
          // Update UI to remove the deleted duplicate
          if (duplicateResults) {
            const newExact = duplicateResults.exact.filter(f => f.id !== fileId);
            const newSimilar = duplicateResults.similar.filter(f => f.id !== fileId);
            
            setDuplicateResults({
              exact: newExact,
              similar: newSimilar
            });
          }
          
          toast.success(`Duplicate ${fileName} deleted successfully`);
        } catch (error) {
          console.error("Delete duplicate error:", error);
          toast.error("Failed to delete duplicate document");
        }
        break;
      default:
        toast.info(`Action ${action} performed on ${fileName}`);
    }
  };

  const handleUploadMore = () => {
    setProcessed(false);
    setDuplicateResults(null);
    setProcessedFiles([]);
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
          {/* Uploaded Files Info */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Upload Complete</h3>
              <Button onClick={handleUploadMore} variant="outline">
                Upload More Documents
              </Button>
            </div>
            <div className="space-y-3">
              {processedFiles.map((pf, index) => (
                <div key={index} className="flex items-center gap-4 p-4 bg-accent rounded-lg">
                  <FileText className="h-6 w-6 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{pf.file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Uploaded successfully
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleViewDocument(pf.document.storage_path)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => handleDeleteDocument(pf.document.id, pf.file.name)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Duplicate Results */}
          {duplicateResults && (
            <DuplicateResults 
              duplicates={duplicateResults} 
              onAction={handleDuplicateAction} 
            />
          )}
        </>
      )}
    </div>
  );
}