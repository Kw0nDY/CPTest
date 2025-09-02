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
  Activity,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen
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
    new Set(['data-pipeline', 'data-quality-security', 'ai-laboratory', 'main-menu'])
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
        { id: "pipeline-builder", label: "Pipeline Builder" },
        { id: "pipeline-runs", label: "Pipeline Runs" },
      ]
    },
    {
      id: "data-quality-security",
      label: "Data Quality & Security",
      icon: Shield,
      items: [
        { id: "data-quality", label: "Quality Rules" },
        { id: "data-profiling", label: "Data Profiling" },
        { id: "pii-policies", label: "PII Policies" },
      ]
    },
    {
      id: "realtime-monitoring",
      label: "Real-time Monitoring",
      icon: Activity,
      items: [
        { id: "system-health", label: "System Health" },
        { id: "connector-status", label: "Connector Status" },
        { id: "alert-management", label: "Alert Management" },
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

  // Handle collapsed icon click - expand sidebar and section
  const handleCollapsedIconClick = (sectionId: string) => {
    if (isCollapsed && onToggleCollapse) {
      onToggleCollapse(); // Expand sidebar
      setTimeout(() => {
        const newExpanded = new Set(expandedSections);
        newExpanded.add(sectionId);
        setExpandedSections(newExpanded);
      }, 100); // Small delay to allow sidebar animation
    } else {
      toggleSection(sectionId);
    }
  };

  const renderSection = (sections: MenuItem[], title: string) => (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wider truncate">{title}</h2>
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
              <div className="flex items-center min-w-0 flex-1 mr-2">
                <section.icon className="w-4 h-4 mr-3 flex-shrink-0" />
                <span className="truncate">{section.label}</span>
              </div>
              <div className="flex-shrink-0">
                {expandedSections.has(section.id) ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </div>
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
                      <span className="truncate">{item.label}</span>
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
      {/* Collapse Toggle Button - Only show when expanded */}
      {onToggleCollapse && !isCollapsed && (
        <button
          onClick={onToggleCollapse}
          className="absolute top-6 right-4 z-10 bg-white border border-gray-200 rounded-lg p-2 shadow-sm hover:shadow-md hover:bg-gray-50 transition-all duration-200 group"
          data-testid="sidebar-collapse-toggle"
          title="Collapse sidebar"
        >
          <PanelLeftClose className="w-4 h-4 text-gray-600 group-hover:text-blue-600 transition-colors" />
        </button>
      )}
      
      <nav className={`${!isCollapsed ? 'p-5 pr-16' : 'p-5'}`}>
        {!isCollapsed ? (
          <>
            {renderSection(coreModules, "Core Modules")}
            {renderSection(managementItems, "Management")}
            {renderSection(mainMenuItems, "Main Menu")}
          </>
        ) : (
          <div className="flex flex-col items-center py-4">
            {/* Collapsed view - just icons */}
            <div className="w-full flex flex-col items-center">
              <div className="text-center mb-6">
                <button
                  onClick={onToggleCollapse}
                  className="w-10 h-10 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center hover:scale-105 transition-all duration-200"
                  title="Expand sidebar"
                >
                  <ChevronRight className="w-5 h-5 text-white" />
                </button>
              </div>
              
              <div className="space-y-4 w-full flex flex-col items-center">
                {[...coreModules, ...managementItems, ...mainMenuItems].map((section) => (
                  <div key={section.id} className="flex justify-center">
                    <button
                      onClick={() => handleCollapsedIconClick(section.id)}
                      className="group flex items-center justify-center w-10 h-10 text-gray-600 rounded-lg hover:bg-blue-50 hover:text-blue-700 hover:scale-105 transition-all duration-200 relative"
                      title={section.label}
                    >
                      <section.icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                      
                      {/* Hover tooltip */}
                      <div className="absolute left-12 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none max-w-32 truncate">
                        <span className="block truncate">{section.label}</span>
                        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-900"></div>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </nav>
    </aside>
  );
}
