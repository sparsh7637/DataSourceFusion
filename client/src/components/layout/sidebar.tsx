import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

import {
  LayoutDashboard,
  Database,
  Link2,
  Zap,
  FileBarChart,
  Settings,
  Menu,
} from "lucide-react";

const sidebarLinks = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/data-sources", icon: Database, label: "Data Sources" },
  { href: "/schema-mapping", icon: Link2, label: "Schema Mapping" },
  { href: "/query-builder", icon: Zap, label: "Query Builder" },
  { href: "/results", icon: FileBarChart, label: "Results" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div
      className={cn(
        "bg-gray-900 text-white flex-shrink-0 transition-all duration-300 ease-in-out h-screen sticky top-0",
        sidebarOpen ? "w-64" : "w-20"
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        {sidebarOpen ? (
          <h1 className="text-xl font-bold">Data Aggregator</h1>
        ) : (
          <div className="flex items-center justify-center h-8 w-8">
            <span className="text-lg font-bold">DA</span>
          </div>
        )}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1 rounded-md hover:bg-gray-800"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      <nav className="p-2">
        <ul className="space-y-1">
          {sidebarLinks.map((link) => (
            <li key={link.href}>
              <Link href={link.href}>
                <a
                  className={cn(
                    "flex items-center p-2 rounded-md",
                    location === link.href
                      ? "bg-blue-700 text-white"
                      : "text-gray-300 hover:bg-gray-800"
                  )}
                >
                  <link.icon className="h-5 w-5 mr-3" />
                  {sidebarOpen && <span>{link.label}</span>}
                </a>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="absolute bottom-0 w-full p-4 border-t border-gray-800">
        {sidebarOpen ? (
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
              <span className="text-gray-700 font-medium">JD</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">John Doe</p>
              <p className="text-xs text-gray-400">Admin</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
              <span className="text-gray-700 font-medium">JD</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
