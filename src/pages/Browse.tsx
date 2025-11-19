import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Folder,
  FileText,
  ChevronRight,
  Home,
  Grid3x3,
  List,
  Download,
  Eye,
  Flame,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Browse() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const folders = [
    { name: "Administration", count: 234 },
    { name: "Finance", count: 567 },
    { name: "Human Resources", count: 189 },
    { name: "Projects", count: 423 },
    { name: "Policies", count: 156 },
  ];

  const documents = [
    { name: "Annual_Report_2024.pdf", size: "2.4 MB", date: "2024-01-15", similarity: 95 },
    { name: "Budget_Proposal.docx", size: "1.8 MB", date: "2024-01-10", similarity: 88 },
    { name: "Staff_Guidelines.pdf", size: "3.2 MB", date: "2024-01-08", similarity: 82 },
    { name: "Meeting_Notes.docx", size: "0.9 MB", date: "2024-01-05", similarity: 76 },
    { name: "Project_Plan.pdf", size: "4.1 MB", date: "2024-01-03", similarity: 71 },
    { name: "Training_Manual.docx", size: "2.7 MB", date: "2023-12-28", similarity: 68 },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Document Archive</h1>
        <p className="text-muted-foreground">Browse and manage your document archive</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Panel - Folder Tree */}
        <Card className="p-4 lg:col-span-1">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Folder className="h-5 w-5 text-primary" />
            Folders
          </h3>
          <div className="space-y-1">
            <div className="flex items-center gap-2 p-2 bg-primary/10 text-primary rounded-lg font-medium">
              <Home className="h-4 w-4" />
              <span className="text-sm">Root Archive</span>
            </div>
            {folders.map((folder, index) => (
              <button
                key={index}
                className="w-full flex items-center gap-2 p-2 hover:bg-accent rounded-lg text-left transition-colors"
              >
                <Folder className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm flex-1">{folder.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {folder.count}
                </Badge>
              </button>
            ))}
          </div>
        </Card>

        {/* Main Area - Document Grid/List */}
        <div className="lg:col-span-3 space-y-4">
          {/* Breadcrumb & Controls */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Home className="h-4 w-4" />
                <ChevronRight className="h-4 w-4" />
                <span className="text-foreground font-medium">Root Archive</span>
              </div>
              <div className="flex items-center gap-2">
                <Select defaultValue="name">
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="size">Size</SelectItem>
                    <SelectItem value="similarity">Similarity</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-1 border border-border rounded-lg p-1">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid3x3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Documents Display */}
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {documents.map((doc, index) => (
                <Card key={index} className="p-4 hover:shadow-lg transition-shadow">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <FileText className="h-8 w-8 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">{doc.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{doc.size}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {doc.date}
                      </Badge>
                      {doc.similarity > 80 && (
                        <Badge className="text-xs bg-primary/10 text-primary hover:bg-primary/20">
                          <Flame className="h-3 w-3 mr-1" />
                          {doc.similarity}%
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-4">
              <div className="space-y-2">
                {documents.map((doc, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-3 hover:bg-accent rounded-lg transition-colors"
                  >
                    <FileText className="h-6 w-6 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">{doc.date}</p>
                    </div>
                    <span className="text-sm text-muted-foreground">{doc.size}</span>
                    {doc.similarity > 80 && (
                      <Badge className="text-xs bg-primary/10 text-primary hover:bg-primary/20">
                        <Flame className="h-3 w-3 mr-1" />
                        {doc.similarity}%
                      </Badge>
                    )}
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
