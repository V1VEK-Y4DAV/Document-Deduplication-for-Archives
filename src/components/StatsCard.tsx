import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  variant: "blue" | "green" | "red" | "amber";
}

const variantStyles = {
  blue: "bg-stat-blue text-primary",
  green: "bg-stat-green text-success",
  red: "bg-stat-red text-destructive",
  amber: "bg-stat-amber text-warning",
};

export const StatsCard = ({ title, value, icon: Icon, variant }: StatsCardProps) => {
  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${variantStyles[variant]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </Card>
  );
};
