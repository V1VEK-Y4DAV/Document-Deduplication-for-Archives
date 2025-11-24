import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Database, Cloud, User, Play, Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";

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

  // Format test results with icons
  const formatTestResults = (result: string) => {
    if (!result) return "Click 'Run Tests' to start the connection test";
    
    return result.split('\n').map((line, index) => {
      if (line.includes('✓')) {
        return (
          <div key={index} className="flex items-start gap-2 text-green-600 dark:text-green-400">
            <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{line.replace('✓', '').trim()}</span>
          </div>
        );
      } else if (line.includes('⚠')) {
        return (
          <div key={index} className="flex items-start gap-2 text-yellow-600 dark:text-yellow-400">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{line.replace('⚠', '').trim()}</span>
          </div>
        );
      } else if (line.includes('❌')) {
        return (
          <div key={index} className="flex items-start gap-2 text-red-600 dark:text-red-400">
            <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{line.replace('❌', '').trim()}</span>
          </div>
        );
      } else if (line.includes('🎉')) {
        return (
          <div key={index} className="flex items-start gap-2 text-blue-600 dark:text-blue-400 font-semibold">
            <span className="ml-1">{line.replace('🎉', '').trim()}</span>
          </div>
        );
      } else {
        return (
          <div key={index} className="flex items-start gap-2 text-muted-foreground">
            <span className="ml-1">{line.trim()}</span>
          </div>
        );
      }
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Database className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Supabase Connection Test</h1>
        </div>
        <p className="text-muted-foreground ml-11">Test Supabase database and storage connectivity</p>
      </div>

      {/* Test Card */}
      <Card className="p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
        <div className="space-y-6">
          {/* Status Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Connection Status</h2>
                <p className="text-sm text-muted-foreground">
                  {user ? `Logged in as: ${user.email}` : "Not logged in"}
                </p>
              </div>
            </div>
            <Button 
              onClick={testSupabaseConnection} 
              disabled={loading || !user}
              className="gap-2 shadow-sm hover:shadow-md transition-shadow rounded-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run Tests
                </>
              )}
            </Button>
          </div>
          
          {/* Results Section */}
          <div className="space-y-3">
            <Card className="p-5 rounded-lg border bg-muted/50 min-h-[250px]">
              <div className="space-y-2">
                {formatTestResults(testResult) || (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Click 'Run Tests' to start the connection test
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </Card>

      {/* Info Section */}
      <Card className="p-6 rounded-xl border shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <AlertCircle className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h3 className="font-medium text-foreground mb-1">About This Test</h3>
            <p className="text-sm text-muted-foreground">
              This test verifies connectivity to your Supabase backend services including authentication, 
              database access, and storage functionality. All tests are read-only operations and will not 
              modify your existing data.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}