import { Card, CardContent } from "@/components/ui/card";
import { LayoutDashboard, Database, Link2 } from "lucide-react";

interface StatusCardProps {
  title: string;
  value: number | string;
  icon: "sources" | "mappings" | "queries";
  iconColor?: string;
  bgColor?: string;
}

export default function StatusCard({ 
  title, 
  value, 
  icon,
  iconColor = "text-blue-600",
  bgColor = "bg-blue-100" 
}: StatusCardProps) {
  
  const getIcon = () => {
    switch (icon) {
      case "sources":
        return <Database className={`h-6 w-6 ${iconColor}`} />;
      case "mappings":
        return <Link2 className={`h-6 w-6 ${iconColor}`} />;
      case "queries":
        return <LayoutDashboard className={`h-6 w-6 ${iconColor}`} />;
      default:
        return <Database className={`h-6 w-6 ${iconColor}`} />;
    }
  };
  
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
      <div className="flex items-center">
        <div className={`flex-shrink-0 ${bgColor} rounded-md p-3`}>
          {getIcon()}
        </div>
        <div className="ml-4">
          <h4 className="text-sm font-medium text-gray-600">{title}</h4>
          <p className="text-2xl font-semibold text-gray-800">{value}</p>
        </div>
      </div>
    </div>
  );
}
