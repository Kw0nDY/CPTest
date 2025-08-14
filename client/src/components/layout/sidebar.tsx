import { useState, useEffect } from "react";
import { 
  ChevronRight, 
  ChevronDown, 
  Database, 
  Bot, 
  BarChart, 
  Users, 
  Key, 
  Settings2,
  Zap,
  Eye
} from "lucide-react";

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  items: Array<{ id: string; label: string }>;
}

interface AssignedView {
  id: string;
  name: string;
  description: string;
  type: 'asset' | 'event' | 'streaming';
  status: 'active' | 'paused' | 'draft';
  assignedTo: string[];
  assignedDepartments: string[];
}

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

// Sample assigned views data - this would come from Setting page assignments
const sampleAssignedViews: AssignedView[] = [
  {
    id: 'view-drilling',
    name: 'Drilling Operations Monitor',
    description: 'Real-time monitoring of drilling operations with automated alerts',
    type: 'asset',
    status: 'active',
    assignedTo: ['mike', 'david'],
    assignedDepartments: ['IT Department']
  },
  {
    id: 'view-production',
    name: 'Production Performance Dashboard',
    description: 'Asset performance tracking with automated reporting',
    type: 'asset',
    status: 'active',
    assignedTo: ['mike'],
    assignedDepartments: ['Operations']
  },
  {
    id: 'view-maintenance',
    name: 'Equipment Maintenance Events',
    description: 'Event-driven maintenance scheduling and tracking',
    type: 'event',
    status: 'draft',
    assignedTo: ['sarah'],
    assignedDepartments: ['Operations']
  }
];

export default function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['data-integration'])
  );
  const [assignedViews, setAssignedViews] = useState<AssignedView[]>(sampleAssignedViews);

  const menuItems: MenuItem[] = [
    {
      id: "setting",
      label: "Setting",
      icon: Settings2,
      items: [
        { id: "data-integration", label: "Data Integration" },
        { id: "view-setting", label: "View Setting" },
        { id: "automation", label: "Automation" },
      ]
    },
    {
      id: "ai-fac",
      label: "AI Fac",
      icon: Bot,
      items: [
        { id: "model-upload", label: "Upload Models" },
        { id: "model-configuration", label: "Model Configuration" },
        { id: "model-testing", label: "Model Testing" },
      ]
    },
    {
      id: "view",
      label: "View",
      icon: Eye,
      items: [
        { id: "view-list", label: "All Views" },
        ...assignedViews.map(view => ({
          id: view.id,
          label: view.name
        }))
      ]
    },
    {
      id: "management",
      label: "Management",
      icon: Users,
      items: [
        { id: "management", label: "System Management" },
      ]
    },
    {
      id: "boi",
      label: "BOI",
      icon: BarChart,
      items: [
        { id: "boi-overview", label: "Overview" },
        { id: "boi-insights", label: "AI Insights" },
        { id: "boi-reports", label: "Reports" },
      ]
    }
  ];

  const settingsItems: any[] = [];

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  return (
    <aside className="w-60 bg-white border-r border-gray-200 h-full overflow-y-auto">
      <nav className="p-4">
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-600 mb-3">Main Menu</h2>
          <ul className="space-y-2">
            {menuItems.map((section) => (
              <li key={section.id}>
                <button
                  onClick={() => toggleSection(section.id)}
                  className="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-700 rounded hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center">
                    <section.icon className="w-4 h-4 mr-3" />
                    {section.label}
                  </div>
                  {expandedSections.has(section.id) ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                {expandedSections.has(section.id) && (
                  <ul className="ml-6 mt-1 space-y-1">
                    {section.items.map((item) => (
                      <li key={item.id}>
                        <button
                          onClick={() => onViewChange(item.id)}
                          className={`flex items-center w-full px-3 py-2 text-sm rounded transition-colors ${
                            activeView === item.id
                              ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                              : "text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {item.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
        
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-600 mb-3">Settings</h2>
          <ul className="space-y-1">
            {settingsItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => onViewChange(item.id)}
                  className={`flex items-center w-full px-3 py-2 text-sm rounded transition-colors ${
                    activeView === item.id
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <item.icon className="w-4 h-4 mr-3" />
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </aside>
  );
}
