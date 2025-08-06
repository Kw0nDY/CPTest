import { useState } from "react";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import DataIntegrationTab from "@/components/data-integration/data-integration-tab";
import AutomationListTab from "@/components/automation/automation-list-tab";
import AIModelManagementTab from "@/components/ai-models/ai-model-management-tab";
import BOIOverviewTab from "@/components/boi/boi-overview-tab";
import UserManagementPage from "@/components/settings/user-management";
import APIKeyManagementPage from "@/components/settings/api-key-management";

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
        return <UserManagementPage />;
      case "api-keys":
        return <APIKeyManagementPage />;
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
