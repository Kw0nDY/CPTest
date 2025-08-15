import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Play, 
  Pause, 
  Copy,
  BarChart3,
  Activity,
  Gauge,
  Eye,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import ViewEditor from "./view-editor-embedded";
import type { View, UIComponent, GridRow } from "@shared/schema";

export default function ViewSettingTab() {
  const [editingView, setEditingView] = useState<View | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newView, setNewView] = useState({
    name: '',
    description: '',
    type: 'dashboard' as 'dashboard' | 'monitor' | 'analytics' | 'report',
    assignedTo: [] as string[],
    assignedDepartments: [] as string[]
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch views from API
  const { data: views = [], isLoading, error } = useQuery<View[]>({
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
    onSuccess: (createdView) => {
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
      // Open editor with the new view
      setEditingView(createdView);
      setShowEditor(true);
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
    mutationFn: async (view: View) => {
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

  // Move view order mutation
  const moveViewMutation = useMutation({
    mutationFn: async ({ viewId, direction }: { viewId: string; direction: 'up' | 'down' }) => {
      const currentIndex = views.findIndex(v => v.id === viewId);
      if (currentIndex === -1) return;
      
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= views.length) return;
      
      // Update view order by swapping updatedAt timestamps
      const currentView = views[currentIndex];
      const targetView = views[targetIndex];
      
      const newCurrentView = {
        ...currentView,
        updatedAt: targetView.updatedAt
      };
      const newTargetView = {
        ...targetView,
        updatedAt: currentView.updatedAt
      };
      
      // Update both views
      await Promise.all([
        fetch(`/api/views/${currentView.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newCurrentView)
        }),
        fetch(`/api/views/${targetView.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newTargetView)
        })
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/views'] });
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

  const handleEditView = (view: View) => {
    setEditingView(view);
    setShowEditor(true);
  };

  const handleSaveView = (updatedView: View) => {
    updateViewMutation.mutate(updatedView);
    setShowEditor(false);
    setEditingView(null);
  };

  const handleDeleteView = (viewId: string) => {
    if (confirm('Are you sure you want to delete this view?')) {
      deleteViewMutation.mutate(viewId);
    }
  };

  const handleMoveView = (viewId: string, direction: 'up' | 'down') => {
    moveViewMutation.mutate({ viewId, direction });
  };

  const toggleViewStatus = (viewId: string) => {
    const view = views.find(v => v.id === viewId);
    if (view) {
      const updatedView = {
        ...view,
        status: view.status === 'active' ? 'paused' : 'active'
      } as View;
      updateViewMutation.mutate(updatedView);
    }
  };

  const duplicateView = (view: View) => {
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
      <ViewEditor
        view={editingView}
        onClose={() => {
          setShowEditor(false);
          setEditingView(null);
        }}
        onSave={handleSaveView}
      />
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

      {/* Views Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {views.map((view) => (
          <Card key={view.id} className="hover:shadow-lg transition-shadow h-full flex flex-col">
            <CardHeader className="pb-4">
              {/* Header with Icon, Title, and Status - Fixed Height */}
              <div className="flex items-start justify-between min-h-[32px] mb-3">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    {getTypeIcon(view.type)}
                  </div>
                  <CardTitle className="text-lg truncate flex-1">{view.name}</CardTitle>
                </div>
                <Badge className={`${getStatusColor(view.status)} flex-shrink-0 ml-2`}>
                  {view.status}
                </Badge>
              </div>
              
              {/* Description - Fixed Height */}
              <div className="min-h-[48px] max-h-[48px] overflow-hidden">
                <p className="text-sm text-gray-600 line-clamp-2">{view.description}</p>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col">
              {/* Stats Grid - Fixed Height */}
              <div className="space-y-4 mb-6 min-h-[120px]">
                <div className="flex items-center justify-between text-sm min-h-[20px]">
                  <span className="text-gray-600 font-medium">Type:</span>
                  <span className="capitalize font-semibold text-gray-900">{view.type}</span>
                </div>
                <div className="flex items-center justify-between text-sm min-h-[20px]">
                  <span className="text-gray-600 font-medium">Data Sources:</span>
                  <span className="font-semibold text-gray-900">{view.dataSources?.length || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm min-h-[20px]">
                  <span className="text-gray-600 font-medium">Assigned:</span>
                  <span className="font-semibold text-gray-900">{(view.assignedTo?.length || 0) + (view.assignedDepartments?.length || 0)}</span>
                </div>
                <div className="flex items-center justify-between text-sm min-h-[20px]">
                  <span className="text-gray-600 font-medium">Updated:</span>
                  <span className="font-semibold text-gray-900 text-xs">{view.updatedAt}</span>
                </div>
              </div>
              
              {/* Action Buttons - Always at Bottom */}
              <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-200">
                {/* Move Buttons */}
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMoveView(view.id, 'up')}
                    disabled={views.findIndex(v => v.id === view.id) === 0}
                    className="h-9 w-9 p-0 hover:bg-blue-100 hover:text-blue-600"
                    title="Move Up"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMoveView(view.id, 'down')}
                    disabled={views.findIndex(v => v.id === view.id) === views.length - 1}
                    className="h-9 w-9 p-0 hover:bg-blue-100 hover:text-blue-600"
                    title="Move Down"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditView(view)}
                    className="h-9 w-9 p-0 hover:bg-gray-100"
                    data-testid={`edit-view-${view.id}`}
                    title="Edit View"
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleViewStatus(view.id)}
                    className="h-9 w-9 p-0 hover:bg-gray-100"
                    data-testid={`toggle-view-${view.id}`}
                    title={view.status === 'active' ? 'Pause View' : 'Activate View'}
                  >
                    {view.status === 'active' ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => duplicateView(view)}
                    className="h-9 w-9 p-0 hover:bg-gray-100"
                    data-testid={`copy-view-${view.id}`}
                    title="Copy View"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteView(view.id)}
                    className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    data-testid={`delete-view-${view.id}`}
                    title="Delete View"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}