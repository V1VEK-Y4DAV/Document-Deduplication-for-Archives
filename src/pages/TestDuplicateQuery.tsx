import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const TestDuplicateQuery = () => {
  const { user } = useAuth();
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    const testQuery = async () => {
      if (!user) {
        setError("User not authenticated");
        return;
      }

      try {
        console.log("Testing query for user:", user.id);
        
        // Fetch duplicates where the source document belongs to the user
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
          .eq('source_document.user_id', user.id)
          .order('created_at', { ascending: false })
          .range(0, 49);

        if (sourceError) throw sourceError;

        // Fetch duplicates where the duplicate document belongs to the user
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
          .eq('duplicate_document.user_id', user.id)
          .order('created_at', { ascending: false })
          .range(0, 49);

        if (duplicateError) throw duplicateError;

        // Combine and deduplicate results
        const combinedData = [...(sourceData || []), ...(duplicateData || [])];
        const uniqueData = combinedData.filter((item, index, self) => 
          index === self.findIndex(t => t.id === item.id)
        );

        console.log("Query result:", { sourceData, sourceError, duplicateData, duplicateError });
        
        setResult(uniqueData);
      } catch (err) {
        console.error("Caught error:", err);
        setError(err);
      }
    };

    testQuery();
  }, [user]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Test Duplicate Query</h1>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <h2 className="font-bold">Error:</h2>
          <pre>{JSON.stringify(error, null, 2)}</pre>
        </div>
      )}
      {result && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          <h2 className="font-bold">Success:</h2>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
      {!result && !error && <div>Loading...</div>}
    </div>
  );
};

export default TestDuplicateQuery;