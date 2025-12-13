import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/utils/activityLogger";
import md5 from "crypto-js/md5";
import { performanceMonitor } from "@/utils/performanceMonitor";

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
    return performanceMonitor.track("generateContentHash", async () => {
      try {
        // For demo purposes, we'll use the file content to generate a hash
        // In a real implementation, you would extract the actual text content
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        // Convert to hex string for consistent hashing
        let hexString = '';
        for (let i = 0; i < uint8Array.length; i++) {
          hexString += uint8Array[i].toString(16).padStart(2, '0');
        }
        const hash = md5(hexString);
        return hash.toString();
      } catch (error) {
        console.error("Error generating content hash:", error);
        throw error;
      }
    });
  },
  /**
   * Check for duplicates of an uploaded document
   */
  checkForDuplicates: async function(
    userId: string,
    file: File,
    documentId: string
  ): Promise<DuplicateResult> {
    return performanceMonitor.track("checkForDuplicates", async () => {
      try {
        // Generate content hash for exact duplicate detection
        const contentHash = await this.generateContentHash(file);
        
        // Add a small delay to ensure database consistency
        await new Promise(resolve => setTimeout(resolve, 100));        
        // Get all user documents except the current one with pagination
        // Only check documents that have content_hash populated
        const { data: allDocuments, error: allDocsError } = await supabase
          .from("documents")
          .select("id, file_name, file_size, created_at, content_hash")
          .eq("user_id", userId)
          .neq("id", documentId)
          .not("content_hash", "is", null)
          .limit(100); // Limit to 100 documents to prevent performance issues
        
        if (allDocsError) {
          console.error("Error fetching documents for similarity check:", allDocsError);
          throw allDocsError;
        }        
        // Get deleted duplicate pairs for this user with pagination
        const { data: deletedPairs, error: deletedPairsError } = await supabase
          .from("deleted_duplicates_memory")
          .select("source_content_hash, duplicate_content_hash")
          .eq("user_id", userId)
          .limit(1000); // Limit to 1000 deleted pairs
        
        if (deletedPairsError) {
          console.error("Error fetching deleted duplicates memory:", deletedPairsError);
          // Continue without the memory filter if there's an error
        }
        
        // Create a set of deleted hash pairs for quick lookup
        const deletedHashPairs = new Set();
        if (deletedPairs) {
          deletedPairs.forEach(pair => {
            // Add both directions since order doesn't matter
            deletedHashPairs.add(`${pair.source_content_hash}|${pair.duplicate_content_hash}`);
            deletedHashPairs.add(`${pair.duplicate_content_hash}|${pair.source_content_hash}`);
          });
        }        
        // Filter out documents that have been previously deleted as duplicates
        const documentsToCheck = (allDocuments || []).filter(doc => {
          if (!doc.content_hash) return false;
          
          // Check if this pair has been previously deleted (both directions)
          const pairKey1 = `${contentHash}|${doc.content_hash}`;
          const pairKey2 = `${doc.content_hash}|${contentHash}`;
          const isDeleted = deletedHashPairs.has(pairKey1) || deletedHashPairs.has(pairKey2);
          return !isDeleted;
        });
        
        // Check for exact duplicates (same content hash) among non-deleted pairs
        const exactDuplicates = documentsToCheck.filter(doc => doc.content_hash === contentHash);
        
        // Calculate similarity scores based on content hash differences
        const similarDocuments = documentsToCheck.map(doc => {
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
            exactDuplicatesFound: exactDuplicates.length,
            similarDocumentsFound: similarDocuments.length,
            timestamp: new Date().toISOString(),
            result: "Duplicate check completed successfully"
          }
        });

        return {
          exact: exactDuplicates.map(doc => ({
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
    });
  },

  /**
   * Update document with content hash after upload
   */
  updateDocumentHash: async function(
    documentId: string,
    userId: string,
    file: File
  ): Promise<string> {
    return performanceMonitor.track("updateDocumentHash", async () => {
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
        
        // Verify the update was successful by re-fetching the document
        const { data: updatedDoc, error: fetchError } = await supabase
          .from("documents")
          .select("content_hash")
          .eq("id", documentId)
          .eq("user_id", userId)
          .single();
          
        if (fetchError) {
          console.error("Error fetching updated document:", fetchError);
          throw fetchError;
        }
        
        // Return the content hash to ensure consistency
        return updatedDoc.content_hash;        
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
    });
  },

  /**
   * Get all duplicate documents for a user with pagination
   */
  getAllDuplicateDocuments: async function(userId: string, page: number = 1, limit: number = 50): Promise<any[]> {
    return performanceMonitor.track("getAllDuplicateDocuments", async () => {
      try {
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        
        console.log(`Fetching duplicates for user ${userId}, page ${page}, limit ${limit}`);
        
        // Fetch duplicates where either the source or duplicate document belongs to the user
        const { data: sourceData, error: sourceError } = await supabase
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
          .eq('source_document.user_id', userId)
          .order('created_at', { ascending: false })
          .range(from, to);

        if (sourceError) throw sourceError;

        const { data: duplicateData, error: duplicateError } = await supabase
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
          .eq('duplicate_document.user_id', userId)
          .order('created_at', { ascending: false })
          .range(from, to);

        if (duplicateError) throw duplicateError;

        // Combine and deduplicate results
        const combinedData = [...(sourceData || []), ...(duplicateData || [])];
        const uniqueData = combinedData.filter((item, index, self) => 
          index === self.findIndex(t => t.id === item.id)
        );
        
        console.log("Supabase query result:", { sourceData, sourceError, duplicateData, duplicateError });
        
        return uniqueData;
      } catch (error) {
        console.error("Error fetching duplicate documents:", error);
        throw error;
      }
    });
  },

  /**
   * Delete a duplicate document entry and the actual document
   */
  deleteDuplicateDocuments: async function(sourceDocumentId: string, duplicateDocumentId: string, userId: string): Promise<void> {
    return performanceMonitor.track("deleteDuplicateDocuments", async () => {
      try {
        // First, get the document details for memory storage
        const { data: sourceDoc, error: sourceError } = await supabase
          .from("documents")
          .select("content_hash, file_name")
          .eq("id", sourceDocumentId)
          .single();
        
        if (sourceError) throw sourceError;
        
        const { data: duplicateDoc, error: duplicateError } = await supabase
          .from("documents")
          .select("content_hash, file_name")
          .eq("id", duplicateDocumentId)
          .single();
        
        if (duplicateError) throw duplicateError;
        
        // Store the deleted duplicate pair in memory to prevent re-scanning
        if (sourceDoc.content_hash && duplicateDoc.content_hash) {
          const { error: memoryError } = await supabase
            .from("deleted_duplicates_memory")
            .insert({
              user_id: userId,
              source_content_hash: sourceDoc.content_hash,
              duplicate_content_hash: duplicateDoc.content_hash,
              source_file_name: sourceDoc.file_name,
              duplicate_file_name: duplicateDoc.file_name,
              notes: "Deleted during duplicate management"
            });
          
          if (memoryError) {
            console.error("Error storing deleted duplicate memory:", memoryError);
            // Don't throw error here as this is supplementary functionality
          }
        }
        
        // Delete the actual duplicate document
        const { error: documentError } = await supabase
          .from("documents")
          .delete()
          .eq("id", duplicateDocumentId)
          .eq("user_id", userId);

        if (documentError) throw documentError;
        
        // Then delete the duplicate record from duplicates table
        const { error: duplicateError2 } = await supabase
          .from("duplicates")
          .delete()
          .eq("source_document_id", sourceDocumentId)
          .eq("duplicate_document_id", duplicateDocumentId);

        if (duplicateError2) throw duplicateError2;
        
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
    });
  },

  /**
   * Update duplicate status (reviewed/dismissed)
   */
  updateDuplicateStatus: async function(duplicateId: string, status: "exact" | "similar" | "reviewed" | "dismissed", userId: string): Promise<void> {
    return performanceMonitor.track("updateDuplicateStatus", async () => {
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
    });
  },
  
  /**
   * Get count of deleted duplicates from memory
   */
  getDeletedDuplicatesCount: async function(userId: string): Promise<number> {
    return performanceMonitor.track("getDeletedDuplicatesCount", async () => {
      try {
        const { count, error } = await supabase
          .from("deleted_duplicates_memory")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId);
        
        if (error) throw error;
        return count || 0;
      } catch (error) {
        console.error("Error fetching deleted duplicates count:", error);
        return 0;
      }
    });
  },
  
  /**
   * Performance-optimized function to check if a document pair has been previously deleted
   */
  checkIfPreviouslyDeleted: async function(userId: string, sourceHash: string, duplicateHash: string): Promise<boolean> {
    return performanceMonitor.track("checkIfPreviouslyDeleted", async () => {
      try {
        const { data, error } = await supabase
          .from("deleted_duplicates_memory")
          .select("id")
          .eq("user_id", userId)
          .or(`and(source_content_hash.eq."${sourceHash}",duplicate_content_hash.eq."${duplicateHash}"),and(source_content_hash.eq."${duplicateHash}",duplicate_content_hash.eq."${sourceHash}")`)
          .limit(1);
        
        if (error) throw error;
        return (data && data.length > 0) || false;
      } catch (error) {
        console.error("Error checking if previously deleted:", error);
        return false;
      }
    });
  }
};




