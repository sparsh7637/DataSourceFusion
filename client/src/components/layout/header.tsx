import { useLocation } from "wouter";
import { Bell, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const getTitleFromPath = (path: string) => {
  switch (path) {
    case "/":
      return "Dashboard";
    case "/data-sources":
      return "Data Sources";
    case "/schema-mapping":
      return "Schema Mapping";
    case "/query-builder":
      return "Query Builder";
    case "/results":
      return "Results";
    case "/settings":
      return "Settings";
    default:
      return "Not Found";
  }
};

export default function Header() {
  const [location] = useLocation();
  const title = getTitleFromPath(location);

  return (
    <header className="bg-white shadow-sm z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <HelpCircle className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
