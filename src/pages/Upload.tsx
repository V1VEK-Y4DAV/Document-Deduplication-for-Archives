import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload as UploadIcon, FileText, Calendar, AlertCircle, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Upload() {
  const [files, setFiles] = useState<any[]>([]);
  const [processed, setProcessed] = useState(false);

  const handleProcess = () => {
    // Simulate processing
    setProcessed(true);
  };

  const mockResults = {
    exact: [
      { name: "budget_2024_copy.pdf", date: "Jan 15, 2024", match: 100 },
      { name: "policy_duplicate.docx", date: "Dec 10, 2023", match: 100 },
    ],
    similar: [
      { name: "meeting_notes_v2.pdf", date: "Jan 10, 2024", match: 85 },
      { name: "report_draft.docx", date: "Dec 20, 2023", match: 78 },
    ],
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Upload Documents for Duplicate Check</h1>
        <p className="text-muted-foreground">Upload your documents to identify duplicates and similar files</p>
      </div>

      {/* Upload Zone */}
      <Card className="p-8">
        <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary transition-colors cursor-pointer">
          <UploadIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Drop your documents here or click to browse</h3>
          <p className="text-sm text-muted-foreground mb-4">Supported formats: PDF, DOCX, DOC, TXT</p>
          <Button variant="outline" size="lg">
            Select Files
          </Button>
        </div>

        {files.length > 0 && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Selected Files</h4>
              <Button onClick={handleProcess}>Process for Duplicates</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Results Section */}
      {processed && (
        <>
          {/* Uploaded File Info */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Uploaded File</h3>
            <div className="flex items-center gap-4 p-4 bg-accent rounded-lg">
              <FileText className="h-8 w-8 text-primary" />
              <div className="flex-1">
                <p className="font-medium">new_document.pdf</p>
                <p className="text-sm text-muted-foreground">File size: 2.4 MB</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Uploaded: Just now</span>
              </div>
            </div>
          </Card>

          {/* Exact Duplicates */}
          <Card className="p-6 border-destructive/50">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <h3 className="text-lg font-semibold text-destructive">Exact Duplicates Found</h3>
            </div>
            <div className="space-y-3">
              {mockResults.exact.map((file, index) => (
                <div key={index} className="flex items-center gap-4 p-4 bg-stat-red rounded-lg">
                  <FileText className="h-6 w-6 text-destructive" />
                  <div className="flex-1">
                    <p className="font-medium">{file.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {file.date}
                      </span>
                      <Badge variant="destructive" className="text-xs">
                        {file.match}% Match
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Preview
                    </Button>
                    <Button variant="outline" size="sm">
                      Keep New
                    </Button>
                    <Button variant="destructive" size="sm">
                      Delete New
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Similar Documents */}
          <Card className="p-6 border-warning/50">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="h-5 w-5 text-warning" />
              <h3 className="text-lg font-semibold text-warning-foreground">Similar Documents (Near Duplicates)</h3>
            </div>
            <div className="space-y-3">
              {mockResults.similar.map((file, index) => (
                <div key={index} className="flex items-center gap-4 p-4 bg-stat-amber rounded-lg">
                  <FileText className="h-6 w-6 text-warning" />
                  <div className="flex-1">
                    <p className="font-medium">{file.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {file.date}
                      </span>
                      <Badge className="text-xs bg-warning text-warning-foreground">
                        {file.match}% Match
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Preview
                    </Button>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
