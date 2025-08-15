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
  const [selectedView, setSelectedView] = useState<ViewConfig | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

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
      ...newView,
      name: `${view.name} (Copy)`,
      description: view.description,
      type: view.type,
      assignedTo: view.assignedTo,
      assignedDepartments: view.assignedDepartments
    };
    createViewMutation.mutate(duplicatedView);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">View Setting</h1>
          <p className="text-gray-600 mt-1">Create and manage dynamic views for your dashboard</p>
        </div>
        
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
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
                <Button variant="outline" onClick={() => setIsCreateModalOpen(false)} className="flex-1">Cancel</Button>
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

      {/* Full-screen View Editor */}
      {showEditor && editingView && (
        <ViewEditor
          view={editingView}
          onClose={() => {
            setShowEditor(false);
            setEditingView(null);
          }}
          onSave={handleSaveView}
        />
      )}
    </div>
  );
}