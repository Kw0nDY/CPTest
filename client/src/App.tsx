import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Header from "./components/layout/header";
import Navigation from "./components/layout/navigation";
import MainMenuPage from "./pages/main-menu";
import DataIntegrationTab from "./components/data-integration/data-integration-tab";
import ViewListTab from "./components/view/view-list-tab";
import AutomationListTab from "./components/automation/automation-list-tab";
import AiModelManagementTab from "./components/ai-models/ai-model-management-tab";
import SettingPage from "./pages/setting";
import ManagementPage from "./pages/management";
import NotFound from "@/pages/not-found";
import { availableUsers, type User } from "./components/layout/header";

function Router() {
  const [currentUser, setCurrentUser] = useState<User>(availableUsers[0]); // Default to Admin

  const handleUserChange = (user: User) => {
    setCurrentUser(user);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Header currentUser={currentUser} onUserChange={handleUserChange} />
      
      <div className="flex flex-1 overflow-hidden">
        <Navigation />
        
        <main className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto">
            <Switch>
              <Route path="/">
                <MainMenuPage currentUser={currentUser} />
              </Route>
              <Route path="/data-integration">
                <DataIntegrationTab />
              </Route>
              <Route path="/view">
                <ViewListTab />
              </Route>
              <Route path="/automation">
                <AutomationListTab />
              </Route>
              <Route path="/ai-models">
                <AiModelManagementTab />
              </Route>
              <Route path="/setting">
                <SettingPage currentUser={currentUser} />
              </Route>
              <Route path="/management">
                <ManagementPage currentUser={currentUser} />
              </Route>
              <Route component={NotFound} />
            </Switch>
          </div>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
