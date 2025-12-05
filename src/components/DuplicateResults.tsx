import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Calendar, 
  AlertCircle, 
  CheckCircle,
  Eye,
  Trash2
} from "lucide-react";
import { DuplicateResult } from "@/services/deduplicationService";
import { toast } from "sonner";

interface DuplicateResultsProps {
  duplicates: DuplicateResult;
  onAction: (action: string, fileId: string, fileName: string) => void;
}

export const DuplicateResults = ({ duplicates, onAction }: DuplicateResultsProps) => {
  return (
    <div className="space-y-6">
      {/* Exact Duplicates */}
      {duplicates.exact.length > 0 && (
        <Card className="p-6 border-destructive/50">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <h3 className="text-lg font-semibold text-destructive-foreground">Exact Duplicates Found</h3>
          </div>
          <div className="space-y-3">
            {duplicates.exact.map((file, index) => (
              <div key={index} className="flex items-center gap-4 p-4 bg-stat-red rounded-lg">
                <FileText className="h-6 w-6 text-destructive" />
                <div className="flex-1">
                  <p className="font-medium">{file.file_name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(file.created_at).toLocaleDateString()}
                    </span>
                    <Badge className="text-xs bg-destructive text-destructive-foreground">
                      {file.match_percentage}% Match
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => toast.info("Preview functionality would be implemented here")}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onAction("keep_both", file.id, file.file_name)}
                  >
                    Keep Both
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => onAction("delete_duplicate", file.id, file.file_name)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Similar Documents */}
      {duplicates.similar.length > 0 && (
        <Card className="p-6 border-warning/50">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-5 w-5 text-warning" />
            <h3 className="text-lg font-semibold text-warning-foreground">Similar Documents (Near Duplicates)</h3>
          </div>
          <div className="space-y-3">
            {duplicates.similar.map((file, index) => (
              <div key={index} className="flex items-center gap-4 p-4 bg-stat-amber rounded-lg">
                <FileText className="h-6 w-6 text-warning" />
                <div className="flex-1">
                  <p className="font-medium">{file.file_name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(file.created_at).toLocaleDateString()}
                    </span>
                    <Badge className="text-xs bg-warning text-warning-foreground">
                      {file.similarity_score}% Match
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => toast.info("Preview functionality would be implemented here")}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onAction("merge", file.id, file.file_name)}
                  >
                    Merge
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => onAction("keep_both", file.id, file.file_name)}
                  >
                    Keep Both
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* No Duplicates Found */}
      {duplicates.exact.length === 0 && duplicates.similar.length === 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-4 p-4 bg-stat-green rounded-lg">
            <CheckCircle className="h-8 w-8 text-success" />
            <div className="flex-1">
              <p className="font-medium">No duplicates found</p>
              <p className="text-sm text-muted-foreground">Your uploaded documents appear to be unique</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};