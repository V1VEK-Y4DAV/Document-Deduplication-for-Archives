import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Download, TrendingUp, FileText, Users, HardDrive } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Reports() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Reports & Analytics</h1>
          <p className="text-muted-foreground">View system statistics and generate reports</p>
        </div>
        <Button className="gap-2">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Time Period Selector */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">Time Period:</span>
          <Select defaultValue="month">
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last 7 days</SelectItem>
              <SelectItem value="month">Last 30 days</SelectItem>
              <SelectItem value="quarter">Last 3 months</SelectItem>
              <SelectItem value="year">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-sm">Documents Processed</h3>
          </div>
          <p className="text-3xl font-bold mb-1">2,847</p>
          <p className="text-xs text-success flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            +12% from last month
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="h-5 w-5 text-success" />
            <h3 className="font-semibold text-sm">Duplicates Found</h3>
          </div>
          <p className="text-3xl font-bold mb-1">456</p>
          <p className="text-xs text-success flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            +8% from last month
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <HardDrive className="h-5 w-5 text-warning" />
            <h3 className="font-semibold text-sm">Storage Saved</h3>
          </div>
          <p className="text-3xl font-bold mb-1">3.2 GB</p>
          <p className="text-xs text-success flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            +15% from last month
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-sm">Active Users</h3>
          </div>
          <p className="text-3xl font-bold mb-1">24</p>
          <p className="text-xs text-muted-foreground">This month</p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Document Processing Trend</h3>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Chart visualization showing monthly document processing</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Duplicate Detection Rate</h3>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Chart showing duplicate detection over time</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Department Statistics */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Department Activity</h3>
        <div className="space-y-4">
          {[
            { dept: "Finance", docs: 567, duplicates: 89, savings: "2.1 GB" },
            { dept: "Human Resources", docs: 423, duplicates: 67, savings: "1.5 GB" },
            { dept: "Administration", docs: 389, duplicates: 54, savings: "1.2 GB" },
            { dept: "Projects", docs: 312, duplicates: 41, savings: "0.9 GB" },
            { dept: "IT", docs: 278, duplicates: 38, savings: "0.8 GB" },
          ].map((dept, index) => (
            <div key={index} className="flex items-center gap-4 p-4 bg-accent rounded-lg">
              <div className="flex-1">
                <p className="font-medium">{dept.dept}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Documents</p>
                <p className="font-semibold">{dept.docs}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Duplicates</p>
                <p className="font-semibold text-destructive">{dept.duplicates}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Saved</p>
                <p className="font-semibold text-success">{dept.savings}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
