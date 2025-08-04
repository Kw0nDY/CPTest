import { useState } from "react";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import DataIntegrationTab from "@/components/data-integration/data-integration-tab";
import AutomationListTab from "@/components/automation/automation-list-tab";
import AIModelManagementTab from "@/components/ai-models/ai-model-management-tab";
import BOIOverviewTab from "@/components/boi/boi-overview-tab";

type ViewType = "data-integration" | "automation" | "model-upload" | "model-configuration" | "model-testing" | "boi-overview" | "boi-insights" | "boi-reports" | "user-management" | "api-keys";

export default function Dashboard() {
  const [activeView, setActiveView] = useState<ViewType>("data-integration");

  const handleViewChange = (view: string) => {
    setActiveView(view as ViewType);
  };

  const renderContent = () => {
    switch (activeView) {
      case "data-integration":
        return <DataIntegrationTab />;
      case "automation":
        return <AutomationListTab />;
      case "model-upload":
      case "model-configuration":
      case "model-testing":
        return <AIModelManagementTab activeTab={activeView} />;
      case "boi-overview":
      case "boi-insights":
      case "boi-reports":
        return <BOIOverviewTab activeTab={activeView} />;
      case "user-management":
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">User Management</h1>
            <p className="text-gray-600">User management functionality will be implemented here.</p>
          </div>
        );
      case "api-keys":
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">API Key Management</h1>
            <p className="text-gray-600">API key management functionality will be implemented here.</p>
          </div>
        );
      default:
        return <DataIntegrationTab />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header />
      
      <div className="flex flex-1 pt-12">
        <Sidebar activeView={activeView} onViewChange={handleViewChange} />
        
        <main className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
