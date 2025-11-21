import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function TestSupabase() {
  const [testResult, setTestResult] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const testSupabaseConnection = async () => {
    setLoading(true);
    setTestResult("Testing Supabase connection...");
    
    try {
      // Test 1: Check auth status
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw new Error(`Session error: ${sessionError.message}`);
      
      setTestResult(prev => prev + `\n✓ Auth session check passed. User: ${session?.user?.id || 'None'}`);
      
      // Test 2: Test database connection (simpler query to avoid aggregate function issues)
      const { data, error: dbError } = await supabase
        .from('documents')
        .select('id')
        .limit(1);
      
      if (dbError) throw new Error(`Database error: ${dbError.message}`);
      
      setTestResult(prev => prev + `\n✓ Database connection successful. Documents table accessible.`);
      
      // Test 3: Test storage access
      const { data: buckets, error: storageError } = await supabase
        .storage
        .listBuckets();
      
      if (storageError) throw new Error(`Storage error: ${storageError.message}`);
      
      const documentsBucket = buckets?.find(bucket => bucket.name === 'documents');
      setTestResult(prev => prev + `\n✓ Storage access successful. Documents bucket ${documentsBucket ? 'found' : 'not found'}.`);
      
      // Test 4: Try to create a small test file
      if (user?.id) {
        const testContent = "Test file content";
        const testFileName = `${user.id}/test_${Date.now()}.txt`;
        
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(testFileName, testContent, {
            contentType: 'text/plain',
            upsert: true
          });
        
        if (uploadError) {
          setTestResult(prev => prev + `\n⚠ Upload test failed: ${uploadError.message}`);
        } else {
          setTestResult(prev => prev + `\n✓ Upload test successful.`);
          
          // Clean up test file
          await supabase.storage.from('documents').remove([testFileName]);
          setTestResult(prev => prev + `\n✓ Test file cleaned up.`);
        }
      }
      
      setTestResult(prev => prev + `\n\n🎉 All tests completed successfully!`);
      toast.success("Supabase connection test passed!");
    } catch (error) {
      console.error("Test error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setTestResult(prev => prev + `\n❌ Test failed: ${errorMessage}`);
      toast.error(`Test failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Supabase Connection Test</h1>
        <p className="text-muted-foreground">Test Supabase database and storage connectivity</p>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Connection Status</h2>
              <p className="text-sm text-muted-foreground">
                {user ? `Logged in as: ${user.email}` : "Not logged in"}
              </p>
            </div>
            <Button onClick={testSupabaseConnection} disabled={loading || !user}>
              {loading ? "Testing..." : "Run Tests"}
            </Button>
          </div>
          
          <div className="mt-4">
            <h3 className="font-medium mb-2">Test Results:</h3>
            <Card className="p-4 bg-muted min-h-[200px]">
              <pre className="text-sm whitespace-pre-wrap font-mono">
                {testResult || "Click 'Run Tests' to start the connection test"}
              </pre>
            </Card>
          </div>
        </div>
      </Card>
    </div>
  );
}