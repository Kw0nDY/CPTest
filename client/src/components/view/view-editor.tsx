import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  X, 
  Save, 
  Plus,
  Trash2,
  Move,
  BarChart3,
  PieChart,
  Activity,
  Gauge,
  Table,
  MapPin,
  Image as ImageIcon,
  Type,
  Calendar,
  Clock,
  Zap
} from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

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
    components: UIComponent[];
  };
  createdAt: string;
  updatedAt: string;
}

interface UIComponent {
  id: string;
  type: 'chart' | 'table' | 'metric' | 'text' | 'image' | 'map' | 'gauge' | 'timeline';
  position: { x: number; y: number; w: number; h: number };
  config: {
    title?: string;
    dataSource?: string;
    chartType?: 'bar' | 'line' | 'pie' | 'area';
    metrics?: string[];
    filters?: any[];
    styling?: any;
  };
}

const componentTypes = [
  { type: 'chart', label: 'Chart', icon: BarChart3, description: 'Bar, line, pie, and area charts' },
  { type: 'table', label: 'Data Table', icon: Table, description: 'Tabular data display' },
  { type: 'metric', label: 'KPI Metric', icon: Gauge, description: 'Key performance indicators' },
  { type: 'text', label: 'Text Block', icon: Type, description: 'Static text and descriptions' },
  { type: 'image', label: 'Image', icon: ImageIcon, description: 'Static images and logos' },
  { type: 'map', label: 'Map View', icon: MapPin, description: 'Geographic data visualization' },
  { type: 'gauge', label: 'Gauge', icon: Activity, description: 'Circular progress indicators' },
  { type: 'timeline', label: 'Timeline', icon: Clock, description: 'Time-based event display' }
];

const availableDataSources = [
  { id: 'aveva-pi', name: 'AVEVA PI System', type: 'Industrial Data' },
  { id: 'sap-erp', name: 'SAP ERP', type: 'Enterprise Resource Planning' },
  { id: 'oracle-db', name: 'Oracle Database', type: 'Database' },
  { id: 'salesforce', name: 'Salesforce CRM', type: 'Customer Relationship Management' }
];

interface ViewEditorProps {
  view: ViewConfig;
  onClose: () => void;
  onSave: (view: ViewConfig) => void;
}

export default function ViewEditor({ view, onClose, onSave }: ViewEditorProps) {
  const [editingView, setEditingView] = useState<ViewConfig>(view);
  const [selectedComponent, setSelectedComponent] = useState<UIComponent | null>(null);
  const [isAddingComponent, setIsAddingComponent] = useState(false);

  const addComponent = (type: string) => {
    const newComponent: UIComponent = {
      id: `component-${Date.now()}`,
      type: type as any,
      position: { x: 0, y: 0, w: 4, h: 3 },
      config: {
        title: `New ${type}`,
        dataSource: editingView.dataSources[0] || '',
        chartType: type === 'chart' ? 'bar' : undefined,
        metrics: [],
        filters: [],
        styling: {}
      }
    };

    setEditingView({
      ...editingView,
      layout: {
        ...editingView.layout,
        components: [...editingView.layout.components, newComponent]
      }
    });
    setSelectedComponent(newComponent);
    setIsAddingComponent(false);
  };

  const updateComponent = (componentId: string, updates: Partial<UIComponent>) => {
    const updatedComponents = editingView.layout.components.map(comp =>
      comp.id === componentId ? { ...comp, ...updates } : comp
    );
    
    setEditingView({
      ...editingView,
      layout: { ...editingView.layout, components: updatedComponents }
    });

    if (selectedComponent?.id === componentId) {
      setSelectedComponent({ ...selectedComponent, ...updates });
    }
  };

  const deleteComponent = (componentId: string) => {
    const updatedComponents = editingView.layout.components.filter(comp => comp.id !== componentId);
    setEditingView({
      ...editingView,
      layout: { ...editingView.layout, components: updatedComponents }
    });
    
    if (selectedComponent?.id === componentId) {
      setSelectedComponent(null);
    }
  };

  const handleSave = () => {
    const updatedView = {
      ...editingView,
      updatedAt: new Date().toISOString().split('T')[0]
    };
    onSave(updatedView);
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(editingView.layout.components);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setEditingView({
      ...editingView,
      layout: { ...editingView.layout, components: items }
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold">Edit View: {editingView.name}</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddingComponent(true)}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Component</span>
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save View
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Component Palette (when adding) */}
        {isAddingComponent && (
          <div className="w-80 border-r bg-gray-50 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Add Component</h3>
              <Button variant="ghost" size="sm" onClick={() => setIsAddingComponent(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-3">
              {componentTypes.map((compType) => (
                <Card 
                  key={compType.type}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => addComponent(compType.type)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center space-x-3">
                      <compType.icon className="h-6 w-6 text-blue-600" />
                      <div>
                        <p className="font-medium text-sm">{compType.label}</p>
                        <p className="text-xs text-gray-600">{compType.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Main Canvas */}
        <div className="flex-1 overflow-auto p-6 bg-gray-100">
          <div className="min-h-full bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">View Preview</h2>
            
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="components">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-4 min-h-96"
                  >
                    {editingView.layout.components.map((component, index) => (
                      <Draggable
                        key={component.id}
                        draggableId={component.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`border rounded-lg p-4 bg-white cursor-pointer transition-all ${
                              selectedComponent?.id === component.id
                                ? 'border-blue-500 shadow-md'
                                : 'border-gray-200 hover:border-gray-300'
                            } ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                            onClick={() => setSelectedComponent(component)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <div {...provided.dragHandleProps}>
                                  <Move className="h-4 w-4 text-gray-400" />
                                </div>
                                <h4 className="font-medium">{component.config.title}</h4>
                                <span className="text-xs text-gray-500 capitalize">
                                  {component.type}
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteComponent(component.id);
                                }}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            <div className="bg-gray-50 rounded p-4 text-center text-gray-600">
                              {component.type === 'chart' && <BarChart3 className="h-8 w-8 mx-auto mb-2" />}
                              {component.type === 'table' && <Table className="h-8 w-8 mx-auto mb-2" />}
                              {component.type === 'metric' && <Gauge className="h-8 w-8 mx-auto mb-2" />}
                              {component.type === 'text' && <Type className="h-8 w-8 mx-auto mb-2" />}
                              {component.type === 'image' && <ImageIcon className="h-8 w-8 mx-auto mb-2" />}
                              {component.type === 'map' && <MapPin className="h-8 w-8 mx-auto mb-2" />}
                              {component.type === 'gauge' && <Activity className="h-8 w-8 mx-auto mb-2" />}
                              {component.type === 'timeline' && <Clock className="h-8 w-8 mx-auto mb-2" />}
                              <p className="text-sm">
                                {component.config.dataSource
                                  ? `Data: ${availableDataSources.find(ds => ds.id === component.config.dataSource)?.name}`
                                  : 'No data source selected'
                                }
                              </p>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    
                    {editingView.layout.components.length === 0 && (
                      <div className="text-center py-12 text-gray-500">
                        <Zap className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No components added yet</p>
                        <p className="text-sm">Click "Add Component" to start building your view</p>
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        </div>

        {/* Properties Panel */}
        {selectedComponent && (
          <div className="w-80 border-l bg-white p-4 overflow-y-auto">
            <h3 className="font-semibold mb-4">Component Properties</h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="comp-title">Title</Label>
                <Input
                  id="comp-title"
                  value={selectedComponent.config.title}
                  onChange={(e) => updateComponent(selectedComponent.id, {
                    config: { ...selectedComponent.config, title: e.target.value }
                  })}
                />
              </div>
              
              <div>
                <Label htmlFor="comp-datasource">Data Source</Label>
                <Select
                  value={selectedComponent.config.dataSource}
                  onValueChange={(value) => updateComponent(selectedComponent.id, {
                    config: { ...selectedComponent.config, dataSource: value }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select data source" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDataSources.map((source) => (
                      <SelectItem key={source.id} value={source.id}>
                        {source.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedComponent.type === 'chart' && (
                <div>
                  <Label htmlFor="chart-type">Chart Type</Label>
                  <Select
                    value={selectedComponent.config.chartType}
                    onValueChange={(value) => updateComponent(selectedComponent.id, {
                      config: { ...selectedComponent.config, chartType: value as any }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bar">Bar Chart</SelectItem>
                      <SelectItem value="line">Line Chart</SelectItem>
                      <SelectItem value="pie">Pie Chart</SelectItem>
                      <SelectItem value="area">Area Chart</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600">
                  Component Type: <span className="font-medium capitalize">{selectedComponent.type}</span>
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Position: {selectedComponent.position.x}, {selectedComponent.position.y}
                </p>
                <p className="text-sm text-gray-600">
                  Size: {selectedComponent.position.w} × {selectedComponent.position.h}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}