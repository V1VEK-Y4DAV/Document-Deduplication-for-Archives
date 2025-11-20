import { Card } from "@/components/ui/card";

export default function Settings() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage your application preferences</p>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Application Settings</h2>
        <p className="text-muted-foreground">
          This is the settings page. You can add various configuration options here.
        </p>
      </Card>
    </div>
  );
}