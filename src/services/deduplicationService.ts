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

      // For similar documents, we'll simulate a search based on filename similarity
      // In a real implementation, you would use NLP techniques to compare content
      const fileName = file.name.toLowerCase();
      const fileNameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
      
      // Simple similarity check based on filename
      const { data: allDocuments, error: allDocsError } = await supabase
        .from("documents")
        .select("id, file_name, file_size, created_at")
        .eq("user_id", userId)
        .neq("id", documentId);

      if (allDocsError) {
        console.error("Error fetching documents for similarity check:", allDocsError);
      }

      // Calculate similarity scores (simplified for demo)
      const similarDocuments = (allDocuments || []).map(doc => {
        const docFileName = doc.file_name.toLowerCase();
        const docFileNameWithoutExt = docFileName.substring(0, docFileName.lastIndexOf('.'));
        
        // Simple string similarity (in a real implementation, use proper NLP)
        let similarity = 0;
        if (fileNameWithoutExt.includes(docFileNameWithoutExt) || 
            docFileNameWithoutExt.includes(fileNameWithoutExt)) {
          similarity = 80 + Math.random() * 20; // 80-100% similarity
        } else if (Math.abs(fileNameWithoutExt.length - docFileNameWithoutExt.length) < 5) {
          similarity = 60 + Math.random() * 20; // 60-80% similarity
        } else {
          similarity = 30 + Math.random() * 30; // 30-60% similarity
        }
        
        return {
          ...doc,
          similarity_score: Math.round(similarity)
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