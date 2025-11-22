import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logActivity } from "@/utils/activityLogger";

export interface UploadDocumentParams {
  file: File;
  userId: string;
  departmentId?: string;
}

export interface Document {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  department_id: string | null;
  created_at: string;
}

export const documentService = {
  supabase, // Export supabase client for use in other components
  
  async uploadDocument({ file, userId, departmentId }: UploadDocumentParams): Promise<{ success: boolean; document?: Document; error?: string }> {
    try {
      console.log("Starting upload process for file:", file.name);
      
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("User not authenticated. Please log in first.");
      }
      
      console.log("User authenticated:", session.user.id);
      
      // Validate file
      if (!file) {
        throw new Error("No file provided");
      }
      
      // Validate file name
      if (!file.name || typeof file.name !== 'string') {
        throw new Error("Invalid file name");
      }
      
      // Validate file size
      if (typeof file.size !== 'number' || file.size < 0) {
        throw new Error("Invalid file size");
      }
      
      // Create a unique file path - must match storage policy (user_id/filename)
      const fileExtension = file.name.split('.').pop();
      if (!fileExtension) {
        throw new Error("Invalid file type");
      }
      
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExtension}`;
      // Fix the file path to match the storage policy: userId/filename
      const filePath = `${userId}/${fileName}`;
      
      console.log("File path generated:", filePath);

      // Upload file to storage
      console.log("Uploading file to storage...");
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      console.log("Upload result:", { uploadData, uploadError });

      if (uploadError) {
        throw new Error(`Failed to upload file: ${uploadError.message}`);
      }

      // Create document record in database
      console.log("Creating document record in database...");
      const { data: documentData, error: insertError } = await supabase
        .from('documents')
        .insert({
          user_id: userId,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type || `application/${fileExtension}`,
          storage_path: filePath,
          department_id: departmentId
        })
        .select()
        .single();
      
      console.log("Database insert result:", { documentData, insertError });

      if (insertError) {
        // If database insert fails, try to delete the uploaded file
        console.log("Cleaning up uploaded file due to database error...");
        await supabase.storage.from('documents').remove([filePath]);
        throw new Error(`Failed to save document record: ${insertError.message}`);
      }

      // Log the activity
      await logActivity({
        userId,
        action: "Document Uploaded",
        entityType: "document",
        entityId: documentData.id,
        details: {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type || `application/${fileExtension}`,
          result: "Successfully uploaded document"
        }
      });

      toast.success("Document uploaded successfully");
      return { success: true, document: documentData as Document };
    } catch (error) {
      console.error("Upload error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(`Upload failed: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  },

  async getDocuments(userId: string): Promise<Document[]> {
    try {
      console.log("Fetching documents for user:", userId);
      
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("User not authenticated. Please log in first.");
      }
      
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Supabase error:", error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      console.log("Fetched documents:", data);
      return data as Document[];
    } catch (error) {
      console.error("Error fetching documents:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(`Failed to fetch documents: ${errorMessage}`);
      // Return empty array instead of throwing to prevent app crash
      return [];
    }
  },

  async deleteDocument(documentId: string, storagePath: string): Promise<boolean> {
    try {
      console.log("Deleting document:", documentId, "Storage path:", storagePath);
      
      // Get document info for logging
      const { data: documentData, error: fetchError } = await supabase
        .from('documents')
        .select('file_name, file_size, user_id, file_type')
        .eq('id', documentId)
        .single();

      // Delete from storage first
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([storagePath]);

      if (storageError) {
        console.error("Storage delete error:", storageError);
        throw new Error(`Failed to delete file from storage: ${storageError.message}`);
      }
      
      console.log("Successfully deleted file from storage");

      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (dbError) {
        console.error("Database delete error:", dbError);
        throw new Error(`Failed to delete document record: ${dbError.message}`);
      }
      
      console.log("Successfully deleted document record from database");

      // Log the activity
      if (documentData) {
        await logActivity({
          userId: documentData.user_id,
          action: "Document Deleted",
          entityType: "document",
          entityId: documentId,
          details: {
            fileName: documentData.file_name,
            fileSize: documentData.file_size,
            fileType: documentData.file_type,
            result: "Successfully deleted document"
          }
        });
      }

      toast.success("Document deleted successfully");
      return true;
    } catch (error) {
      console.error("Delete error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(`Delete failed: ${errorMessage}`);
      return false;
    }
  }
};