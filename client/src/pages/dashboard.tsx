import { useState } from "react";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import DataIntegrationTab from "@/components/data-integration/data-integration-tab";
import AutomationListTab from "@/components/automation/automation-list-tab";
import AIModelManagementTab from "@/components/ai-models/ai-model-management-tab";
import BOIOverviewTab from "@/components/boi/boi-overview-tab";

type TabType = "data-integration" | "automation-list" | "ai-models" | "boi-overview";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>("data-integration");

  const tabs = [
    { id: "data-integration" as const, label: "Data Integration" },
    { id: "automation-list" as const, label: "Automation List" },
    { id: "ai-models" as const, label: "AI Model Management" },
    { id: "boi-overview" as const, label: "BOI Overview" },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "data-integration":
        return <DataIntegrationTab />;
      case "automation-list":
        return <AutomationListTab />;
      case "ai-models":
        return <AIModelManagementTab />;
      case "boi-overview":
        return <BOIOverviewTab />;
      default:
        return <DataIntegrationTab />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header />
      
      <div className="flex flex-1 pt-12">
        <Sidebar />
        
        <main className="flex-1 overflow-hidden">
          {/* Tab Navigation */}
          <div className="bg-white border-b border-gray-200 px-6 py-3">
            <div className="flex space-x-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "tab-active"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-full overflow-y-auto">
            {renderTabContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
