import { useState } from "react";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import DataIntegrationTab from "@/components/data-integration/data-integration-tab";
import ViewListTab from "@/components/view/view-list-tab";
import ViewSettingTab from "@/components/view/view-setting-tab";
import AutomationListTab from "@/components/automation/automation-list-tab";
import AIModelManagementTab from "@/components/ai-models/ai-model-management-tab";
import ModelConfigurationTab from "@/components/ai-models/model-configuration-tab";
import ModelConfigurationTabNew from "@/components/ai-models/model-configuration-tab-new";
import BOIOverviewTab from "@/components/boi/boi-overview-tab";
import SettingPage from "@/pages/setting";
import ManagementPage from "@/pages/management";
import { availableUsers, type User } from "@/components/layout/header";

// Placeholder component for new modules
function PlaceholderModule({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{title}</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">{description}</p>
        </div>
        
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-8 border border-blue-200">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-2xl font-bold">🚀</span>
            </div>
          </div>
          <div className="text-center space-y-4">
            <h3 className="text-xl font-semibold text-gray-900">Coming Soon</h3>
            <p className="text-gray-700 max-w-lg mx-auto">
              This advanced module is part of our enterprise AI platform roadmap. 
              It will integrate seamlessly with your existing workflows and data.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-6">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">AI-Powered</span>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">Enterprise Ready</span>
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">Scalable</span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-blue-600 text-lg">📊</span>
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Advanced Analytics</h4>
            <p className="text-sm text-gray-600">Deep insights and predictive analytics powered by your data</p>
          </div>
          
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-green-600 text-lg">⚡</span>
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Automation</h4>
            <p className="text-sm text-gray-600">Intelligent automation that learns from your workflows</p>
          </div>
          
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-purple-600 text-lg">🔒</span>
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Enterprise Security</h4>
            <p className="text-sm text-gray-600">Bank-level security with compliance and audit trails</p>
          </div>
        </div>
      </div>
    </div>
  );
}
import ViewComponentRenderer from "@/components/view/view-component-renderer";
import AIResultsAnalysis from "@/components/intelligence/ai-results-analysis";
import DataQualitySecurity from "@/components/data-pipeline/data-quality-security";
import { useQuery } from "@tanstack/react-query";
import type { View } from "@shared/schema";

// Dynamic View Renderer Component
function DynamicViewRenderer({ viewId }: { viewId: string }) {
  const { data: views = [] } = useQuery<View[]>({
    queryKey: ['/api/views']
  });

  // Find the view by ID directly (viewId should be the actual view.id)
  const view = views.find(v => v.id === viewId);

  if (!view) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">View Not Found</h1>
        <p className="text-gray-600">The requested view could not be found.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{view.name}</h1>
        <p className="text-gray-600">{view.description}</p>
      </div>
      
      <div className="space-y-6">
        {view.layout?.grids?.map((grid, gridIndex) => (
          <div key={grid.id} className={`grid gap-6 grid-cols-${grid.columns}`}>
            {Array.from({ length: grid.columns }, (_, colIndex) => {
              const columnComponents = grid.components
                .filter(comp => comp.gridPosition === colIndex)
                .sort((a, b) => (a.order || 0) - (b.order || 0));
              
              return (
                <div key={colIndex} className="col-span-1 space-y-4">
                  {columnComponents.map((component) => (
                    <ViewComponentRenderer key={component.id} component={component} />
                  ))}
                </div>
              );
            })}
          </div>
        ))}
        
        {(!view.layout?.grids || view.layout.grids.length === 0) && (
          <div className="flex items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Components</h3>
              <p className="text-gray-500">This view has no components configured yet.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type ViewType = 
  // Data Pipeline
  | "data-integration" | "data-quality" | "data-monitoring"
  // View & Dashboard  
  | "view-setting" | "team-workspaces" | "performance-analytics"
  // Automation Engine
  | "automation" | "process-automation" | "trigger-management"
  // AI Laboratory
  | "model-development" | "model-upload" | "model-configuration" | "model-testing"
  // Intelligence Hub
  | "ai-results" | "performance-insights" | "prediction-analytics"
  // Business Intelligence
  | "boi-overview" | "organization-analytics" | "ai-recommendations"
  // Assistant
  | "ai-chat" | "knowledge-base" | "task-automation"
  // Management & Other
  | "member" | "apis" | "view-list" | string;

export default function Dashboard() {
  const [activeView, setActiveView] = useState<ViewType>("data-integration");
  const [currentUser, setCurrentUser] = useState<User>(availableUsers[0]); // Default to Admin
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleViewChange = (view: string) => {
    setActiveView(view as ViewType);
  };

  const handleUserChange = (user: User) => {
    setCurrentUser(user);
  };

  const renderContent = () => {
    switch (activeView) {
      // Data Pipeline
      case "data-integration":
        return <DataIntegrationTab />;
      case "data-quality":
        return <DataQualitySecurity />;
      case "data-monitoring":
        return <PlaceholderModule title="Real-time Monitoring" description="Live data pipeline monitoring with alerts and performance metrics" />;
      
      // View & Dashboard
      case "view-setting":
        return <ViewSettingTab />;
      case "team-workspaces":
        return <PlaceholderModule title="Team Workspaces" description="Collaborative dashboards and team-specific view management" />;
      case "performance-analytics":
        return <PlaceholderModule title="Performance Analytics" description="Dashboard usage analytics and performance optimization insights" />;
      
      // Automation Engine
      case "automation":
        return <AutomationListTab />;
      case "process-automation":
        return <PlaceholderModule title="Process Automation" description="Advanced business process automation with conditional logic" />;
      case "trigger-management":
        return <PlaceholderModule title="Trigger Management" description="Event-driven automation triggers and scheduling" />;
      
      // AI Laboratory
      case "model-development":
        return <PlaceholderModule title="Model Development" description="Train AI models using your integrated data with automated ML pipelines" />;
      case "model-upload":
        return <AIModelManagementTab activeTab={activeView} />;
      case "model-configuration":
        return <ModelConfigurationTab />;
      case "model-testing":
        return <PlaceholderModule title="Testing & Validation" description="Model performance testing, A/B testing, and validation frameworks" />;
      
      // Intelligence Hub
      case "ai-results":
        return <AIResultsAnalysis />;
      case "performance-insights":
        return <PlaceholderModule title="Performance Insights" description="AI performance metrics, trends, and optimization recommendations" />;
      case "prediction-analytics":
        return <PlaceholderModule title="Prediction Analytics" description="Predictive analytics dashboard with forecasting and trend analysis" />;
      
      // Business Intelligence
      case "boi-overview":
        return <BOIOverviewTab activeTab={activeView} />;
      case "organization-analytics":
        return <PlaceholderModule title="Organization Analytics" description="Company-wide analytics, team performance, and strategic insights" />;
      case "ai-recommendations":
        return <PlaceholderModule title="AI Recommendations" description="AI-powered strategic recommendations for business optimization" />;
      
      // Assistant
      case "ai-chat":
        return <PlaceholderModule title="AI Chat Interface" description="Intelligent assistant for querying data, executing workflows, and getting insights" />;
      case "knowledge-base":
        return <PlaceholderModule title="Knowledge Base" description="Centralized knowledge management with AI-powered search and recommendations" />;
      case "task-automation":
        return <PlaceholderModule title="Task Automation" description="Natural language task automation and workflow generation" />;
      
      // Management & Other
      case "member":
      case "apis":
        return <ManagementPage currentUser={currentUser} />;
      case "view-list":
        return <ViewListTab />;
      default:
        // Check if this is a view ID (from database views)
        if (activeView.startsWith('view-') && activeView.length > 10) {
          return <DynamicViewRenderer viewId={activeView} />;
        }
        return <DataIntegrationTab />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header currentUser={currentUser} onUserChange={handleUserChange} />
      
      <div className="flex flex-1 pt-14">
        <Sidebar 
          activeView={activeView} 
          onViewChange={handleViewChange}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
        
        <main className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
