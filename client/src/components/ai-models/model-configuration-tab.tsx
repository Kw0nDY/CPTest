import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Plus,
  Folder,
  Play,
  Save,
  ChevronLeft,
  Settings,
  Eye,
  MoreVertical,
} from "lucide-react";

export default function ModelConfigurationTab() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'folders' | 'editor'>('folders');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolder, setNewFolder] = useState({ name: '', description: '' });

  // Mock data
  const modelConfigFolders = [
    {
      id: '1',
      name: 'Traffic Analysis',
      description: 'Models for traffic flow prediction and optimization',
      createdAt: new Date().toISOString()
    },
    {
      id: '2', 
      name: 'KPI Optimization',
      description: 'Performance optimization models',
      createdAt: new Date().toISOString()
    }
  ];

  const modelConfigurations = [
    {
      id: '1',
      name: 'Traffic Flow Model',
      description: 'STGCN-based traffic prediction',
      folderId: '1',
      nodes: [],
      connections: [],
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    }
  ];

  if (viewMode === 'editor') {
    return (
      <div className="h-full flex flex-col">
        <div className="border-b bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => setViewMode('folders')}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Configurations
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Sample Configuration</h1>
                <p className="text-sm text-gray-600">AI Model Workflow Editor</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline">
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button>
                <Play className="w-4 h-4 mr-2" />
                Test Configuration
              </Button>
            </div>
          </div>
        </div>
        
        <div className="flex-1 p-6">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Model Configuration Editor</h3>
            <p className="text-gray-600">Visual node-based AI model configuration interface</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Model Configuration</h1>
          <p className="text-gray-600">Create and manage AI model workflows</p>
        </div>
        <Button onClick={() => setShowNewFolderDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Folder
        </Button>
      </div>

      {!selectedFolder ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modelConfigFolders.map((folder) => (
            <Card key={folder.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Folder className="w-5 h-5 text-blue-600" />
                    <CardTitle className="text-lg">{folder.name}</CardTitle>
                  </div>
                  <Badge variant="secondary">1 config</Badge>
                </div>
                <p className="text-sm text-gray-600">{folder.description}</p>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-gray-500 mb-4">
                  Created: {new Date(folder.createdAt).toLocaleDateString()}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setSelectedFolder(folder.id)}
                >
                  Open Folder
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => setSelectedFolder(null)}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Folders
            </Button>
            <h2 className="text-xl font-bold">
              {modelConfigFolders.find(f => f.id === selectedFolder)?.name} Configurations
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modelConfigurations
              .filter(config => config.folderId === selectedFolder)
              .map((config) => (
                <Card key={config.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{config.name}</CardTitle>
                    <p className="text-sm text-gray-600">{config.description}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs text-gray-500 mb-4">
                      <div>Created: {new Date(config.createdAt).toLocaleDateString()}</div>
                      <div>Modified: {new Date(config.lastModified).toLocaleDateString()}</div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => setViewMode('editor')}
                      >
                        <Settings className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      )}

      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="folder-name">Folder Name</Label>
              <Input
                id="folder-name"
                value={newFolder.name}
                onChange={(e) => setNewFolder(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter folder name"
              />
            </div>
            <div>
              <Label htmlFor="folder-description">Description</Label>
              <Input
                id="folder-description"
                value={newFolder.description}
                onChange={(e) => setNewFolder(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter folder description"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button 
                onClick={() => {
                  toast({ 
                    title: "Success", 
                    description: "Folder created successfully" 
                  });
                  setShowNewFolderDialog(false);
                  setNewFolder({ name: '', description: '' });
                }}
                className="flex-1"
              >
                Create Folder
              </Button>
              <Button variant="outline" onClick={() => setShowNewFolderDialog(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}