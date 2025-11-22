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
  }
};