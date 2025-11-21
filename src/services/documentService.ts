import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
      // Create a unique file path
      const fileExtension = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExtension}`;
      const filePath = `${userId}/${fileName}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Failed to upload file: ${uploadError.message}`);
      }

      // Create document record in database
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

      if (insertError) {
        // If database insert fails, try to delete the uploaded file
        await supabase.storage.from('documents').remove([filePath]);
        throw new Error(`Failed to save document record: ${insertError.message}`);
      }

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
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Document[];
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error("Failed to fetch documents");
      return [];
    }
  },

  async deleteDocument(documentId: string, storagePath: string): Promise<boolean> {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([storagePath]);

      if (storageError) {
        throw new Error(`Failed to delete file from storage: ${storageError.message}`);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (dbError) {
        throw new Error(`Failed to delete document record: ${dbError.message}`);
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