import { useState, useEffect } from "react";
import { 
  ChevronRight, 
  ChevronDown, 
  ChevronLeft,
  Database, 
  Bot, 
  BarChart, 
  Users, 
  Key, 
  Settings2,
  Zap,
  Eye,
  RefreshCw,
  TrendingUp,
  MessageCircle,
  Shield,
  Activity
} from "lucide-react";
import { useQuery } from '@tanstack/react-query';

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
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
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

export default function Sidebar({ activeView, onViewChange, isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['data-pipeline', 'ai-laboratory', 'main-menu'])
  );
  
  // Fetch views from API
  const { data: views = [], refetch: refetchViews } = useQuery({
    queryKey: ['/api/views'],
    staleTime: 0, // Always fresh data for menu updates
  });

  const [assignedViews, setAssignedViews] = useState<AssignedView[]>(sampleAssignedViews);

  // Refresh function for views
  const handleRefreshViews = () => {
    refetchViews();
  };

  const coreModules: MenuItem[] = [
    {
      id: "data-pipeline",
      label: "Data Pipeline",
      icon: Database,
      items: [
        { id: "data-integration", label: "Data Sources" },
        { id: "data-quality", label: "Data Quality & Security" },
        { id: "data-monitoring", label: "Real-time Monitoring" },
      ]
    },
    {
      id: "view-dashboard",
      label: "View & Dashboard",
      icon: Eye,
      items: [
        { id: "view-setting", label: "Dashboard Builder" },
        { id: "team-workspaces", label: "Team Workspaces" },
        { id: "performance-analytics", label: "Performance Analytics" },
      ]
    },
    {
      id: "automation-engine",
      label: "Automation Engine",
      icon: Zap,
      items: [
        { id: "automation", label: "Workflow Designer" },
        { id: "process-automation", label: "Process Automation" },
        { id: "trigger-management", label: "Trigger Management" },
      ]
    },
    {
      id: "ai-laboratory",
      label: "AI Laboratory",
      icon: Bot,
      items: [
        { id: "model-development", label: "Model Development" },
        { id: "model-upload", label: "Model Upload" },
        { id: "model-configuration", label: "Model Configuration" },
        { id: "model-testing", label: "Testing & Validation" },
      ]
    },
    {
      id: "intelligence-hub",
      label: "Intelligence Hub",
      icon: TrendingUp,
      items: [
        { id: "ai-results", label: "AI Results Analysis" },
        { id: "performance-insights", label: "Performance Insights" },
        { id: "prediction-analytics", label: "Prediction Analytics" },
      ]
    },
    {
      id: "business-intelligence",
      label: "Business Intelligence",
      icon: BarChart,
      items: [
        { id: "boi-overview", label: "Strategic Overview" },
        { id: "organization-analytics", label: "Organization Analytics" },
        { id: "ai-recommendations", label: "AI Recommendations" },
      ]
    },
    {
      id: "assistant",
      label: "Assistant",
      icon: MessageCircle,
      items: [
        { id: "ai-chat", label: "AI Chat Interface" },
        { id: "knowledge-base", label: "Knowledge Base" },
        { id: "task-automation", label: "Task Automation" },
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

  // Create dynamic main menu items based on views
  const getMainMenuItems = () => {
    const baseItems = [{ id: "view-list", label: "All Views" }];
    
    // Add views from API
    const viewItems = Array.isArray(views) ? views.map((view: any) => ({
      id: view.id,
      label: view.name
    })) : [];
    
    return [...baseItems, ...viewItems];
  };

  const mainMenuItems: MenuItem[] = [
    {
      id: "main-menu",
      label: "Main Menu",
      icon: Eye,
      items: getMainMenuItems()
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
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wider">{title}</h2>
        {title === "Main Menu" && (
          <button
            onClick={handleRefreshViews}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
            title="Refresh views"
          >
            <RefreshCw className="h-3 w-3 text-gray-500" />
          </button>
        )}
      </div>
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
    <aside className={`${isCollapsed ? 'w-16' : 'w-72'} bg-gradient-to-b from-gray-50 to-white border-r border-gray-200 h-full overflow-y-auto shadow-sm transition-all duration-300 relative`}>
      {/* Collapse Toggle Button */}
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="absolute top-4 -right-3 z-10 bg-white border border-gray-200 rounded-full p-1 shadow-sm hover:shadow-md transition-shadow"
          data-testid="sidebar-collapse-toggle"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          )}
        </button>
      )}
      
      <nav className="p-5">
        {!isCollapsed ? (
          <>
            {renderSection(coreModules, "Core Modules")}
            {renderSection(managementItems, "Management")}
            {renderSection(mainMenuItems, "Main Menu")}
          </>
        ) : (
          <div className="space-y-4">
            {/* Collapsed view - just icons */}
            {[...coreModules, ...managementItems, ...mainMenuItems].map((section) => (
              <div key={section.id} className="flex flex-col items-center">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="flex items-center justify-center w-10 h-10 text-gray-700 rounded-lg hover:bg-blue-50 hover:text-blue-700 transition-colors"
                  title={section.label}
                >
                  <section.icon className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </nav>
    </aside>
  );
}
