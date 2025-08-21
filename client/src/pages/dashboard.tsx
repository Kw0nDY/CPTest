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
import ViewComponentRenderer from "@/components/view/view-component-renderer";
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

type ViewType = "data-integration" | "view-setting" | "automation" | "model-upload" | "model-configuration" | "model-configuration-new" | "boi-overview" | "boi-input-setting" | "boi-insights" | "boi-reports" | "member" | "apis" | "view-list" | string;

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
      case "data-integration":
        return <DataIntegrationTab />;
      case "view-setting":
        return <ViewSettingTab />;
      case "automation":
        return <AutomationListTab />;
      case "model-upload":
        return <AIModelManagementTab activeTab={activeView} />;
      case "model-configuration":
        return <ModelConfigurationTab />;
      case "boi-overview":
      case "boi-input-setting":
      case "boi-insights":
      case "boi-reports":
        return <BOIOverviewTab activeTab={activeView} />;
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
