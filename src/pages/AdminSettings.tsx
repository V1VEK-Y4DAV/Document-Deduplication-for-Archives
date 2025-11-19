import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Activity, Database, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminSettings() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">System Settings</h1>
        <p className="text-muted-foreground">Configure system parameters and preferences</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">General Settings</TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
          <TabsTrigger value="health">System Health</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Duplicate Detection Settings</h3>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Similarity Threshold</Label>
                  <span className="text-sm font-medium">75%</span>
                </div>
                <Slider defaultValue={[75]} max={100} min={50} step={1} />
                <p className="text-xs text-muted-foreground mt-2">
                  Documents with similarity above this threshold will be flagged as potential duplicates
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="retention">File Retention Period (days)</Label>
                <Input
                  id="retention"
                  type="number"
                  defaultValue="365"
                  className="max-w-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Documents older than this will be archived
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-size">Maximum File Size (MB)</Label>
                <Input
                  id="max-size"
                  type="number"
                  defaultValue="50"
                  className="max-w-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum allowed size for uploaded documents
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="processing" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Batch Processing</h3>
            <div className="space-y-4">
              <div className="p-4 bg-accent rounded-lg">
                <p className="text-sm text-muted-foreground mb-4">
                  Run a full archive scan to identify all duplicates across your document collection
                </p>
                <Button size="lg" className="w-full md:w-auto">
                  Run Full Archive Scan
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 border-border">
                  <p className="text-sm text-muted-foreground mb-1">Last Scan</p>
                  <p className="text-lg font-semibold">2 days ago</p>
                </Card>
                <Card className="p-4 border-border">
                  <p className="text-sm text-muted-foreground mb-1">Documents Processed</p>
                  <p className="text-lg font-semibold">12,547</p>
                </Card>
                <Card className="p-4 border-border">
                  <p className="text-sm text-muted-foreground mb-1">Duplicates Found</p>
                  <p className="text-lg font-semibold">1,655</p>
                </Card>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Processing Queue</h3>
            <div className="flex items-center gap-4">
              <Clock className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">5 documents waiting</p>
                <p className="text-sm text-muted-foreground">Estimated processing time: 3 minutes</p>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Activity className="h-5 w-5 text-success" />
                <h3 className="font-semibold">Server Status</h3>
              </div>
              <Badge className="bg-success hover:bg-success/90">
                Online
              </Badge>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Database className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Database Size</h3>
              </div>
              <p className="text-2xl font-bold">64.2 GB</p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="h-5 w-5 text-warning" />
                <h3 className="font-semibold">Processing Queue</h3>
              </div>
              <p className="text-2xl font-bold">5 docs</p>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">System Performance</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>CPU Usage</Label>
                  <span className="text-sm font-medium">45%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div className="bg-success h-2 rounded-full" style={{ width: "45%" }}></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Memory Usage</Label>
                  <span className="text-sm font-medium">62%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div className="bg-warning h-2 rounded-full" style={{ width: "62%" }}></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Storage Usage</Label>
                  <span className="text-sm font-medium">64%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: "64%" }}></div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
