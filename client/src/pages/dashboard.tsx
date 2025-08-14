import { useState } from "react";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import DataIntegrationTab from "@/components/data-integration/data-integration-tab";
import ViewListTab from "@/components/view/view-list-tab";
import AutomationListTab from "@/components/automation/automation-list-tab";
import AIModelManagementTab from "@/components/ai-models/ai-model-management-tab";
import BOIOverviewTab from "@/components/boi/boi-overview-tab";
import SettingPage from "@/pages/setting";
import ManagementPage from "@/pages/management";
import { availableUsers, type User } from "@/components/layout/header";

type ViewType = "data-integration" | "setting" | "management" | "view-list" | "view-drilling" | "view-production" | "view-maintenance" | "automation" | "model-upload" | "model-configuration" | "model-testing" | "boi-overview" | "boi-insights" | "boi-reports";

export default function Dashboard() {
  const [activeView, setActiveView] = useState<ViewType>("data-integration");
  const [currentUser, setCurrentUser] = useState<User>(availableUsers[0]); // Default to Admin

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
      case "setting":
        return <SettingPage currentUser={currentUser} />;
      case "management":
        return <ManagementPage currentUser={currentUser} />;
      case "view-list":
        return <ViewListTab />;
      case "view-drilling":
      case "view-production":
      case "view-maintenance":
        return <ViewListTab />;
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
      default:
        return <DataIntegrationTab />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header currentUser={currentUser} onUserChange={handleUserChange} />
      
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
