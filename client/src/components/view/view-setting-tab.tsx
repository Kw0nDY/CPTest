import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Users, 
  Play, 
  Pause, 
  Copy,
  Settings,
  Eye,
  BarChart3,
  Activity,
  Gauge
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import ViewEditor from "./view-editor-embedded";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface UIComponent {
  id: string;
  type: 'chart' | 'table' | 'metric' | 'text' | 'image' | 'map' | 'gauge' | 'timeline';
  gridPosition: number;
  visible: boolean;
  config: {
    title?: string;
    dataSource?: string;
    chartType?: 'bar' | 'line' | 'pie' | 'area' | 'doughnut' | 'scatter';
    metrics?: string[];
    dimensions?: string[];
    filters?: any[];
    styling?: any;
    refreshRate?: number;
    showLegend?: boolean;
    showGrid?: boolean;
    animation?: boolean;
  };
}

interface GridRow {
  id: string;
  columns: number;
  components: UIComponent[];
}

interface ViewConfig {
  id: string;
  name: string;
  description: string;
  type: 'dashboard' | 'monitor' | 'analytics' | 'report';
  status: 'active' | 'paused' | 'draft';
  assignedTo: string[];
  assignedDepartments: string[];
  dataSources: string[];
  layout: {
    grids: GridRow[];
    components?: UIComponent[]; // For backward compatibility
  };
  createdAt: string;
  updatedAt: string;
}

// Views data now comes from API

const availableUsers = [
  { id: 'admin', name: 'Admin', department: 'System' },
  { id: 'mike', name: 'Mike Chen', department: 'IT Department' },
  { id: 'sarah', name: 'Sarah Kim', department: 'Operations' },
  { id: 'david', name: 'David Park', department: 'IT Department' },
  { id: 'lisa', name: 'Lisa Wang', department: 'Finance' }
];

const availableDepartments = ['IT Department', 'Operations', 'Finance', 'System'];

const availableDataSources = [
  { id: 'aveva-pi', name: 'AVEVA PI System', type: 'Industrial Data' },
  { id: 'sap-erp', name: 'SAP ERP', type: 'Enterprise Resource Planning' },
  { id: 'oracle-db', name: 'Oracle Database', type: 'Database' },
  { id: 'salesforce', name: 'Salesforce CRM', type: 'Customer Relationship Management' }
];

export default function ViewSettingTab() {
  const [editingView, setEditingView] = useState<ViewConfig | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [selectedView, setSelectedView] = useState<ViewConfig | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [newView, setNewView] = useState({
    name: '',
    description: '',
    type: 'dashboard' as 'dashboard' | 'monitor' | 'analytics' | 'report',
    assignedTo: [] as string[],
    assignedDepartments: [] as string[]
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch views from API
  const { data: views = [], isLoading, error } = useQuery<ViewConfig[]>({
    queryKey: ['/api/views'],
    queryFn: async () => {
      const response = await fetch('/api/views');
      if (!response.ok) throw new Error('Failed to fetch views');
      return response.json();
    }
  });

  // Create view mutation
  const createViewMutation = useMutation({
    mutationFn: async (viewData: any) => {
      const view = {
        id: `view-${Date.now()}`,
        ...viewData,
        status: 'draft',
        dataSources: [],
        layout: { grids: [] },
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0]
      };
      
      const response = await fetch('/api/views', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(view)
      });
      if (!response.ok) throw new Error('Failed to create view');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/views'] });
      setIsCreateDialogOpen(false);
      setNewView({
        name: '',
        description: '',
        type: 'dashboard',
        assignedTo: [],
        assignedDepartments: []
      });
      toast({
        title: "Success",
        description: "View created successfully"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create view",
        variant: "destructive"
      });
    }
  });

  // Update view mutation
  const updateViewMutation = useMutation({
    mutationFn: async (view: ViewConfig) => {
      const response = await fetch(`/api/views/${view.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(view)
      });
      if (!response.ok) throw new Error('Failed to update view');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/views'] });
      toast({
        title: "Success",
        description: "View updated successfully"
      });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to update view",
        variant: "destructive"
      });
    }
  });

  // Delete view mutation
  const deleteViewMutation = useMutation({
    mutationFn: async (viewId: string) => {
      const response = await fetch(`/api/views/${viewId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete view');
      return;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/views'] });
      toast({
        title: "Success",
        description: "View deleted successfully"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete view",
        variant: "destructive" 
      });
    }
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'dashboard': return <BarChart3 className="h-4 w-4" />;
      case 'monitor': return <Activity className="h-4 w-4" />;
      case 'analytics': return <Gauge className="h-4 w-4" />;
      case 'report': return <Eye className="h-4 w-4" />;
      default: return <BarChart3 className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCreateView = () => {
    createViewMutation.mutate(newView);
  };

  const handleSaveView = (view: ViewConfig) => {
    updateViewMutation.mutate(view);
    setShowEditor(false);
    setEditingView(null);
  };

  const handleDeleteView = (viewId: string) => {
    deleteViewMutation.mutate(viewId);
  };

  const handleEditView = (view: ViewConfig) => {
    setEditingView(view);
    setShowEditor(true);
  };

  const handleAssignView = (view: ViewConfig) => {
    setSelectedView(view);
    setIsAssignModalOpen(true);
  };

  const toggleViewStatus = (viewId: string) => {
    const view = views.find(v => v.id === viewId);
    if (view) {
      const updatedView = {
        ...view,
        status: view.status === 'active' ? 'paused' : 'active'
      } as ViewConfig;
      updateViewMutation.mutate(updatedView);
    }
  };

  const deleteView = (viewId: string) => {
    deleteViewMutation.mutate(viewId);
  };

  const duplicateView = (view: ViewConfig) => {
    const duplicatedView = {
      name: `${view.name} (Copy)`,
      description: view.description,
      type: view.type,
      assignedTo: view.assignedTo,
      assignedDepartments: view.assignedDepartments
    };
    createViewMutation.mutate(duplicatedView);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading views...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-red-600">Failed to load views</p>
            <p className="text-gray-600 mt-1">Please try refreshing the page</p>
          </div>
        </div>
      </div>
    );
  }

  if (showEditor && editingView) {
    return (
      <div className="h-full flex">
        {/* System Sidebar - Collapsible */}
        <div className={`bg-gray-50 border-r transition-all duration-300 ${isSidebarCollapsed ? 'w-12' : 'w-64'} flex flex-col shadow-sm`}>
          <div className="p-3 border-b flex items-center justify-between bg-blue-600 text-white">
            {!isSidebarCollapsed && (
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-white rounded text-blue-600 flex items-center justify-center text-sm font-bold">
                  CP
                </div>
                <span className="font-semibold">Collaboration Portal</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="h-8 w-8 p-0 text-white hover:bg-blue-700"
            >
              {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          {isSidebarCollapsed ? (
            <div className="flex-1 flex flex-col items-center py-4 space-y-3">
              <Button variant="ghost" size="sm" className="w-8 h-8 p-0" title="Settings">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto bg-white">
              {/* SETTINGS Section */}
              <div className="p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">SETTINGS</h3>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Button variant="ghost" className="w-full justify-start text-sm font-medium">
                      <Database className="h-4 w-4 mr-3" />
                      Data Integration
                      <ChevronDown className="h-4 w-4 ml-auto" />
                    </Button>
                    <div className="ml-7 space-y-1">
                      <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-gray-600">
                        Data Integration
                      </Button>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-xs bg-blue-100 text-blue-700">
                        View Setting
                      </Button>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-gray-600">
                        Automation
                      </Button>
                    </div>
                  </div>
                  
                  <Button variant="ghost" className="w-full justify-start text-sm font-medium">
                    <Zap className="h-4 w-4 mr-3" />
                    AI Fac
                    <ChevronRight className="h-4 w-4 ml-auto" />
                  </Button>
                  
                  <Button variant="ghost" className="w-full justify-start text-sm font-medium">
                    <BarChart3 className="h-4 w-4 mr-3" />
                    BOI
                    <ChevronRight className="h-4 w-4 ml-auto" />
                  </Button>
                </div>
              </div>

              {/* MANAGEMENT Section */}
              <div className="p-4 border-t">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">MANAGEMENT</h3>
                <div className="space-y-2">
                  <Button variant="ghost" className="w-full justify-start text-sm font-medium">
                    <Users className="h-4 w-4 mr-3" />
                    Member
                    <ChevronRight className="h-4 w-4 ml-auto" />
                  </Button>
                  <Button variant="ghost" className="w-full justify-start text-sm font-medium">
                    <Settings className="h-4 w-4 mr-3" />
                    APIs
                    <ChevronRight className="h-4 w-4 ml-auto" />
                  </Button>
                </div>
              </div>

              {/* MAIN MENU Section */}
              <div className="p-4 border-t">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">MAIN MENU</h3>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Button variant="ghost" className="w-full justify-start text-sm font-medium">
                      <Eye className="h-4 w-4 mr-3" />
                      Main Menu
                      <ChevronDown className="h-4 w-4 ml-auto" />
                    </Button>
                    <div className="ml-7 space-y-1">
                      <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-gray-600">
                        All Views
                      </Button>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-gray-600">
                        Drilling Operations Monitor
                      </Button>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-gray-600">
                        Production Performance Dashboard
                      </Button>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-gray-600">
                        Equipment Maintenance Events
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* View Editor Content */}
        <div className="flex-1">
          <ViewEditor
            view={editingView}
            onClose={() => {
              setShowEditor(false);
              setEditingView(null);
            }}
            onSave={handleSaveView}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">View Setting</h1>
          <p className="text-gray-600 mt-1">Create and manage dynamic views for your dashboard</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2" data-testid="create-view-button">
              <Plus className="h-4 w-4" />
              <span>Create View</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New View</DialogTitle>
              <DialogDescription>Set up a new dashboard view with dynamic UI components</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="view-name">View Name</Label>
                <Input
                  id="view-name"
                  value={newView.name}
                  onChange={(e) => setNewView({ ...newView, name: e.target.value })}
                  placeholder="Enter view name"
                />
              </div>
              
              <div>
                <Label htmlFor="view-description">Description</Label>
                <Textarea
                  id="view-description"
                  value={newView.description}
                  onChange={(e) => setNewView({ ...newView, description: e.target.value })}
                  placeholder="Describe the view purpose"
                />
              </div>
              
              <div>
                <Label htmlFor="view-type">View Type</Label>
                <Select value={newView.type} onValueChange={(value: any) => setNewView({ ...newView, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dashboard">Dashboard</SelectItem>
                    <SelectItem value="monitor">Monitor</SelectItem>
                    <SelectItem value="analytics">Analytics</SelectItem>
                    <SelectItem value="report">Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              

              
              <div className="flex space-x-2 pt-4">
                <Button 
                  onClick={handleCreateView} 
                  className="flex-1"
                  disabled={!newView.name.trim()}
                  data-testid="create-view-submit"
                >
                  Create & Edit
                </Button>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="flex-1">Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {views.map((view) => (
          <Card key={view.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  {getTypeIcon(view.type)}
                  <CardTitle className="text-lg">{view.name}</CardTitle>
                </div>
                <Badge className={getStatusColor(view.status)}>
                  {view.status}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">{view.description}</p>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Data Sources</p>
                <div className="flex flex-wrap gap-1">
                  {view.dataSources.map((sourceId) => {
                    const source = availableDataSources.find(s => s.id === sourceId);
                    return (
                      <Badge key={sourceId} variant="secondary" className="text-xs">
                        {source?.name}
                      </Badge>
                    );
                  })}
                </div>
              </div>
              
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Assignments</p>
                <div className="text-xs text-gray-600">
                  {view.assignedTo.length > 0 && (
                    <p>Users: {view.assignedTo.length}</p>
                  )}
                  {view.assignedDepartments.length > 0 && (
                    <p>Departments: {view.assignedDepartments.join(', ')}</p>
                  )}
                  {view.assignedTo.length === 0 && view.assignedDepartments.length === 0 && (
                    <p className="text-yellow-600">Not assigned</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditView(view)}
                    data-testid={`edit-view-${view.id}`}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => duplicateView(view)}
                    data-testid={`duplicate-view-${view.id}`}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleViewStatus(view.id)}
                    data-testid={`toggle-view-${view.id}`}
                  >
                    {view.status === 'active' ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAssignView(view)}
                    data-testid={`assign-view-${view.id}`}
                  >
                    <Users className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteView(view.id)}
                    className="text-red-600 hover:text-red-700"
                    data-testid={`delete-view-${view.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Assignment Modal */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assignment Setting</DialogTitle>
            <DialogDescription>Assign this view to users and departments</DialogDescription>
          </DialogHeader>
          {selectedView && (
            <div className="space-y-4">
              <div>
                <Label>Assign to Users</Label>
                <div className="space-y-2 mt-2 max-h-32 overflow-y-auto">
                  {availableUsers.map((user) => (
                    <div key={user.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`user-${user.id}`}
                        checked={selectedView.assignedTo.includes(user.id)}
                        onCheckedChange={(checked) => {
                          const updatedView = {
                            ...selectedView,
                            assignedTo: checked
                              ? [...selectedView.assignedTo, user.id]
                              : selectedView.assignedTo.filter(id => id !== user.id)
                          };
                          setSelectedView(updatedView);
                          updateViewMutation.mutate(updatedView);
                        }}
                      />
                      <Label htmlFor={`user-${user.id}`} className="text-sm">
                        {user.name} ({user.department})
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <Label>Assign to Departments</Label>
                <div className="space-y-2 mt-2">
                  {availableDepartments.map((dept) => (
                    <div key={dept} className="flex items-center space-x-2">
                      <Checkbox
                        id={`dept-${dept}`}
                        checked={selectedView.assignedDepartments.includes(dept)}
                        onCheckedChange={(checked) => {
                          const updatedView = {
                            ...selectedView,
                            assignedDepartments: checked
                              ? [...selectedView.assignedDepartments, dept]
                              : selectedView.assignedDepartments.filter(d => d !== dept)
                          };
                          setSelectedView(updatedView);
                          updateViewMutation.mutate(updatedView);
                        }}
                      />
                      <Label htmlFor={`dept-${dept}`} className="text-sm">{dept}</Label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex space-x-2 pt-4">
                <Button onClick={() => setIsAssignModalOpen(false)} className="flex-1">Done</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}