import { useState } from "react";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import DataSourcesTab from "@/components/data-integration/data-sources-tab";
import DataMappingTab from "@/components/data-integration/data-mapping-tab";
import AutomationTab from "@/components/data-integration/automation-tab";
import AiConfigTab from "@/components/data-integration/ai-config-tab";
import BoiSettingsTab from "@/components/data-integration/boi-settings-tab";

type TabType = "data-sources" | "data-mapping" | "automation" | "ai-config" | "boi-settings";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>("data-sources");

  const tabs = [
    { id: "data-sources" as const, label: "데이터 소스 연결", step: 1 },
    { id: "data-mapping" as const, label: "데이터 매핑", step: 2 },
    { id: "automation" as const, label: "자동화 설정", step: 3 },
    { id: "ai-config" as const, label: "AI 모델 연동", step: 4 },
    { id: "boi-settings" as const, label: "BOI 설정", step: 5 },
  ];

  const currentStep = tabs.find(tab => tab.id === activeTab)?.step || 1;

  const renderTabContent = () => {
    switch (activeTab) {
      case "data-sources":
        return <DataSourcesTab onNext={() => setActiveTab("data-mapping")} />;
      case "data-mapping":
        return <DataMappingTab onNext={() => setActiveTab("automation")} onPrev={() => setActiveTab("data-sources")} />;
      case "automation":
        return <AutomationTab onNext={() => setActiveTab("ai-config")} onPrev={() => setActiveTab("data-mapping")} />;
      case "ai-config":
        return <AiConfigTab onNext={() => setActiveTab("boi-settings")} onPrev={() => setActiveTab("automation")} />;
      case "boi-settings":
        return <BoiSettingsTab onPrev={() => setActiveTab("ai-config")} />;
      default:
        return <DataSourcesTab onNext={() => setActiveTab("data-mapping")} />;
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
