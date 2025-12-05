import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/utils/activityLogger";
import md5 from "crypto-js/md5";

export interface DuplicateResult {
  exact: Array<{
    id: string;
    file_name: string;
    file_size: number;
    created_at: string;
    match_percentage: number;
  }>;
  similar: Array<{
    id: string;
    file_name: string;
    file_size: number;
    created_at: string;
    similarity_score: number;
  }>;
}

export const deduplicationService = {
  /**
   * Generate content hash for exact duplicate detection
   */
  generateContentHash: async function(file: File): Promise<string> {
    // For demo purposes, we'll use the file content to generate a hash
    // In a real implementation, you would extract the actual text content
    const arrayBuffer = await file.arrayBuffer();
    const hash = md5(new Uint8Array(arrayBuffer).toString());
    return hash.toString();
  },

  /**
   * Check for duplicates of an uploaded document
   */
  checkForDuplicates: async function(
    userId: string,
    file: File,
    documentId: string
  ): Promise<DuplicateResult> {
    try {
      // Generate content hash for exact duplicate detection
      const contentHash = await this.generateContentHash(file);
      
      // Check for exact duplicates (same content hash)
      const { data: exactDuplicates, error: exactError } = await supabase
        .from("documents")
        .select("id, file_name, file_size, created_at")
        .eq("content_hash", contentHash)
        .neq("id", documentId) // Exclude the current document
        .eq("user_id", userId);

      if (exactError) {
        console.error("Error checking exact duplicates:", exactError);
      }

      // For similar documents, we'll now use content hash similarity instead of filename similarity
      // In a real implementation, you would use NLP techniques to compare content
      const fileName = file.name.toLowerCase();
      const fileNameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
      
      // NEW: Get documents with similar content hashes for better similarity detection
      const { data: allDocuments, error: allDocsError } = await supabase
        .from("documents")
        .select("id, file_name, file_size, created_at, content_hash")
        .eq("user_id", userId)
        .neq("id", documentId);

      if (allDocsError) {
        console.error("Error fetching documents for similarity check:", allDocsError);
      }

      // Calculate similarity scores based on content hash differences
      const similarDocuments = (allDocuments || []).map(doc => {
        // Compare content hashes to determine similarity
        // The more characters that match in the hash, the more similar the documents
        let similarity = 0;
        if (doc.content_hash) {
          let matchingChars = 0;
          const hashLength = Math.min(contentHash.length, doc.content_hash.length);
          
          // Count matching characters in the hash
          for (let i = 0; i < hashLength; i++) {
            if (contentHash[i] === doc.content_hash[i]) {
              matchingChars++;
            }
          }
          
          // Convert to percentage (0-100)
          similarity = Math.round((matchingChars / hashLength) * 100);
        }
        
        return {
          ...doc,
          similarity_score: similarity
        };
      }).filter(doc => doc.similarity_score >= 70) // Only show documents with 70%+ similarity
        .sort((a, b) => b.similarity_score - a.similarity_score) // Sort by similarity
        .slice(0, 5); // Limit to top 5 similar documents

      // Log the duplicate detection activity
      await logActivity({
        userId,
        action: "Duplicate Check Completed",
        entityType: "document",
        entityId: documentId,
        details: {
          fileName: file.name,
          fileSize: file.size,
          exactDuplicatesFound: (exactDuplicates || []).length,
          similarDocumentsFound: similarDocuments.length,
          timestamp: new Date().toISOString(),
          result: "Duplicate check completed successfully"
        }
      });

      return {
        exact: (exactDuplicates || []).map(doc => ({
          ...doc,
          match_percentage: 100
        })),
        similar: similarDocuments
      };
    } catch (error) {
      console.error("Error in duplicate detection:", error);
      
      // Log the error activity
      await logActivity({
        userId,
        action: "Duplicate Check Failed",
        entityType: "document",
        entityId: documentId,
        details: {
          fileName: file.name,
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
          result: "Duplicate check failed"
        }
      });
      
      return {
        exact: [],
        similar: []
      };
    }
  },

  /**
   * Update document with content hash after upload
   */
  updateDocumentHash: async function(
    documentId: string,
    userId: string,
    file: File
  ): Promise<void> {
    try {
      const contentHash = await this.generateContentHash(file);
      
      const { error } = await supabase
        .from("documents")
        .update({ content_hash: contentHash })
        .eq("id", documentId)
        .eq("user_id", userId);

      if (error) {
        console.error("Error updating document hash:", error);
        throw error;
      }
      
      // Log the hash update activity
      await logActivity({
        userId,
        action: "Document Hash Updated",
        entityType: "document",
        entityId: documentId,
        details: {
          fileName: file.name,
          contentHash: contentHash.substring(0, 10) + "...",
          timestamp: new Date().toISOString(),
          result: "Document hash updated successfully"
        }
      });
    } catch (error) {
      console.error("Error updating document hash:", error);
      
      // Log the error activity
      await logActivity({
        userId,
        action: "Document Hash Update Failed",
        entityType: "document",
        entityId: documentId,
        details: {
          fileName: file.name,
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
          result: "Document hash update failed"
        }
      });
      throw error;
    }
  },

  /**
   * Get all duplicate documents for a user
   */
  getAllDuplicateDocuments: async function(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('duplicates')
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
        .or(`source_document.user_id.eq.${userId},duplicate_document.user_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching duplicate documents:", error);
      throw error;
    }
  },

  /**
   * Delete a duplicate document entry and the actual document
   */
  deleteDuplicateDocuments: async function(sourceDocumentId: string, duplicateDocumentId: string, userId: string): Promise<void> {
    try {
      // First, delete the duplicate record from duplicates table
      const { error: duplicateError } = await supabase
        .from("duplicates")
        .delete()
        .or(`source_document_id.eq.${sourceDocumentId},duplicate_document_id.eq.${duplicateDocumentId}`);

      if (duplicateError) throw duplicateError;

      // Then delete the actual duplicate document
      const { error: documentError } = await supabase
        .from("documents")
        .delete()
        .eq("id", duplicateDocumentId)
        .eq("user_id", userId);

      if (documentError) throw documentError;
      
      // Log the deletion activity
      await logActivity({
        userId,
        action: "Duplicate Document Deleted",
        entityType: "document",
        entityId: duplicateDocumentId,
        details: {
          sourceDocumentId,
          timestamp: new Date().toISOString(),
          result: "Duplicate document deleted successfully"
        }
      });
    } catch (error) {
      console.error("Error deleting duplicate documents:", error);
      
      // Log the error activity
      await logActivity({
        userId,
        action: "Duplicate Document Deletion Failed",
        entityType: "document",
        entityId: duplicateDocumentId,
        details: {
          sourceDocumentId,
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
          result: "Duplicate document deletion failed"
        }
      });
      throw error;
    }
  },

  /**
   * Update duplicate status (reviewed/dismissed)
   */
  updateDuplicateStatus: async function(duplicateId: string, status: "exact" | "similar" | "reviewed" | "dismissed", userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("duplicates")
        .update({ 
          status,
          reviewed_at: new Date().toISOString(),
          reviewed_by: userId
        })
        .eq("id", duplicateId);

      if (error) throw error;
      
      // Log the status update activity
      await logActivity({
        userId,
        action: "Duplicate Status Updated",
        entityType: "duplicate",
        entityId: duplicateId,
        details: {
          status,
          timestamp: new Date().toISOString(),
          result: "Duplicate status updated successfully"
        }
      });
    } catch (error) {
      console.error("Error updating duplicate status:", error);
      
      // Log the error activity
      await logActivity({
        userId,
        action: "Duplicate Status Update Failed",
        entityType: "duplicate",
        entityId: duplicateId,
        details: {
          status,
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
          result: "Duplicate status update failed"
        }
      });
      throw error;
    }
  }
};