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

  const settingsItems: MenuItem[] = [
    {
      id: "data-integration",
      label: "Data Integration",
      icon: Database,
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
      ]
    },
    {
      id: "boi",
      label: "BOI",
      icon: BarChart,
      items: [
        { id: "boi-overview", label: "Overview" },
        { id: "boi-input-setting", label: "Input Setting" },
        { id: "boi-insights", label: "AI Insights" },
        { id: "boi-reports", label: "Reports" },
      ]
    }
  ];

  const managementItems: MenuItem[] = [
    {
      id: "member",
      label: "Member",
      icon: Users,
      items: [
        { id: "member", label: "Member Management" },
      ]
    },
    {
      id: "apis",
      label: "APIs",
      icon: Key,
      items: [
        { id: "apis", label: "API Management" },
      ]
    }
  ];

  const mainMenuItems: MenuItem[] = [
    {
      id: "main-menu",
      label: "Main Menu",
      icon: Eye,
      items: [
        { id: "view-list", label: "All Views" },
        ...assignedViews.map(view => ({
          id: view.id,
          label: view.name
        }))
      ]
    }
  ];

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const renderSection = (sections: MenuItem[], title: string) => (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-gray-800 mb-3 uppercase tracking-wider">{title}</h2>
      <ul className="space-y-2">
        {sections.map((section) => (
          <li key={section.id}>
            <button
              onClick={() => toggleSection(section.id)}
              className="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-blue-50 hover:text-blue-700 transition-colors"
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
                      className={`flex items-center w-full px-3 py-2 text-sm rounded-lg transition-colors ${
                        activeView === item.id
                          ? "bg-blue-100 text-blue-800 font-medium border-l-3 border-blue-600"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
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
  );

  return (
    <aside className="w-72 bg-gradient-to-b from-gray-50 to-white border-r border-gray-200 h-full overflow-y-auto shadow-sm">
      <nav className="p-5">
        {renderSection(settingsItems, "Settings")}
        {renderSection(managementItems, "Management")}
        {renderSection(mainMenuItems, "Main Menu")}
      </nav>
    </aside>
  );
}
