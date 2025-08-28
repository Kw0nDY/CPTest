import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  X, 
  Save, 
  Plus,
  Trash2,
  Move,
  BarChart3,
  Activity,
  Gauge,
  Table,
  MapPin,
  Image as ImageIcon,
  Type,
  Clock,
  Zap,
  Database,
  Layout,
  Grid,
  Maximize2,
  Minimize2,
  Copy,
  Eye,
  EyeOff
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
  visible: boolean;
  config: {
    title?: string;
    dataSource?: string;
    chartType?: 'bar' | 'line' | 'pie' | 'area' | 'doughnut' | 'scatter';
    metrics?: string[];
    dimensions?: string[];
    filters?: DataFilter[];
    styling?: ComponentStyling;
    refreshRate?: number;
    showLegend?: boolean;
    showGrid?: boolean;
    animation?: boolean;
  };
}

interface DataFilter {
  field: string;
  operator: 'equals' | 'contains' | 'greater' | 'less' | 'between';
  value: any;
}

interface ComponentStyling {
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  fontSize?: number;
  padding?: number;
  borderRadius?: number;
  shadow?: boolean;
}

interface DataField {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  description?: string;
  sampleValues?: any[];
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
  { 
    id: 'aveva-pi', 
    name: 'AVEVA PI System', 
    type: 'Industrial Data',
    status: 'connected',
    fields: [
      { name: 'timestamp', type: 'date' as const, description: 'Measurement timestamp' },
      { name: 'temperature', type: 'number' as const, description: 'Temperature readings', sampleValues: [23.5, 24.1, 22.8] },
      { name: 'pressure', type: 'number' as const, description: 'Pressure measurements', sampleValues: [1013.25, 1014.2, 1012.8] },
      { name: 'flow_rate', type: 'number' as const, description: 'Flow rate data', sampleValues: [45.2, 46.1, 44.8] },
      { name: 'equipment_id', type: 'string' as const, description: 'Equipment identifier', sampleValues: ['EQ001', 'EQ002', 'EQ003'] },
      { name: 'status', type: 'string' as const, description: 'Equipment status', sampleValues: ['Running', 'Idle', 'Maintenance'] }
    ]
  },
  { 
    id: 'sap-erp', 
    name: 'SAP ERP', 
    type: 'Enterprise Resource Planning',
    status: 'connected',
    fields: [
      { name: 'order_id', type: 'string' as const, description: 'Order identifier', sampleValues: ['ORD001', 'ORD002', 'ORD003'] },
      { name: 'customer_name', type: 'string' as const, description: 'Customer name', sampleValues: ['ABC Corp', 'XYZ Ltd', 'DEF Inc'] },
      { name: 'order_amount', type: 'number' as const, description: 'Order value', sampleValues: [15000, 23500, 8750] },
      { name: 'order_date', type: 'date' as const, description: 'Order creation date' },
      { name: 'delivery_status', type: 'string' as const, description: 'Delivery status', sampleValues: ['Pending', 'Shipped', 'Delivered'] },
      { name: 'region', type: 'string' as const, description: 'Sales region', sampleValues: ['North', 'South', 'East', 'West'] }
    ]
  },
  { 
    id: 'oracle-db', 
    name: 'Oracle Database', 
    type: 'Database',
    status: 'connected',
    fields: [
      { name: 'user_id', type: 'string' as const, description: 'User identifier' },
      { name: 'session_duration', type: 'number' as const, description: 'Session length in minutes', sampleValues: [45, 62, 38] },
      { name: 'page_views', type: 'number' as const, description: 'Number of page views', sampleValues: [12, 8, 15] },
      { name: 'login_time', type: 'date' as const, description: 'Login timestamp' },
      { name: 'user_type', type: 'string' as const, description: 'User category', sampleValues: ['Admin', 'Manager', 'User'] }
    ]
  },
  { 
    id: 'salesforce', 
    name: 'Salesforce CRM', 
    type: 'Customer Relationship Management',
    status: 'connected',
    fields: [
      { name: 'lead_id', type: 'string' as const, description: 'Lead identifier' },
      { name: 'company', type: 'string' as const, description: 'Company name', sampleValues: ['Tech Corp', 'Innovation Ltd', 'Future Inc'] },
      { name: 'lead_score', type: 'number' as const, description: 'Lead qualification score', sampleValues: [85, 92, 76] },
      { name: 'created_date', type: 'date' as const, description: 'Lead creation date' },
      { name: 'stage', type: 'string' as const, description: 'Sales stage', sampleValues: ['Qualified', 'Proposal', 'Negotiation', 'Closed'] },
      { name: 'industry', type: 'string' as const, description: 'Industry sector', sampleValues: ['Technology', 'Healthcare', 'Finance'] }
    ]
  }
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
  const [activeTab, setActiveTab] = useState<'design' | 'data' | 'preview'>('design');
  const [selectedDataSource, setSelectedDataSource] = useState<string>('');
  const [availableFields, setAvailableFields] = useState<DataField[]>([]);

  useEffect(() => {
    if (selectedDataSource) {
      const dataSource = availableDataSources.find(ds => ds.id === selectedDataSource);
      setAvailableFields(dataSource?.fields || []);
    }
  }, [selectedDataSource]);

  const addComponent = (type: string) => {
    const newComponent: UIComponent = {
      id: `component-${Date.now()}`,
      type: type as any,
      position: { x: 0, y: 0, w: 4, h: 3 },
      visible: true,
      config: {
        title: `New ${type}`,
        dataSource: editingView.dataSources[0] || '',
        chartType: type === 'chart' ? 'bar' : undefined,
        metrics: [],
        dimensions: [],
        filters: [],
        styling: {
          backgroundColor: '#ffffff',
          borderColor: '#e5e7eb',
          textColor: '#374151',
          fontSize: 14,
          padding: 16,
          borderRadius: 8,
          shadow: true
        },
        refreshRate: 30,
        showLegend: true,
        showGrid: true,
        animation: true
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

  const toggleComponentVisibility = (componentId: string) => {
    const updatedComponents = editingView.layout.components.map(comp =>
      comp.id === componentId ? { ...comp, visible: !comp.visible } : comp
    );
    setEditingView({
      ...editingView,
      layout: { ...editingView.layout, components: updatedComponents }
    });
  };

  const duplicateComponent = (component: UIComponent) => {
    const newComponent = {
      ...component,
      id: `component-${Date.now()}`,
      config: { ...component.config, title: `${component.config.title} (Copy)` }
    };
    setEditingView({
      ...editingView,
      layout: {
        ...editingView.layout,
        components: [...editingView.layout.components, newComponent]
      }
    });
  };

  const getSelectedDataSource = () => {
    return availableDataSources.find(ds => ds.id === selectedDataSource);
  };

  const renderDesignTab = () => (
    <div className="flex flex-1">
      {/* Left Sidebar - Components & Properties */}
      <div className="w-80 border-r bg-white flex flex-col">
        {/* Component Library */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Components</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingComponent(!isAddingComponent)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {isAddingComponent && (
            <div className="space-y-2 mb-4">
              {componentTypes.map((compType) => (
                <Button
                  key={compType.type}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => addComponent(compType.type)}
                >
                  <compType.icon className="h-4 w-4 mr-2" />
                  {compType.label}
                </Button>
              ))}
            </div>
          )}

          {/* Component List */}
          <div className="space-y-2">
            {editingView.layout.components.map((component) => (
              <div
                key={component.id}
                className={`flex items-center justify-between p-2 rounded border cursor-pointer ${
                  selectedComponent?.id === component.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
                onClick={() => setSelectedComponent(component)}
              >
                <div className="flex items-center space-x-2">
                  {component.visible ? (
                    <Eye className="h-4 w-4 text-gray-500" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="text-sm font-medium truncate">
                    {component.config.title}
                  </span>
                </div>
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleComponentVisibility(component.id);
                    }}
                  >
                    {component.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateComponent(component);
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteComponent(component.id);
                    }}
                    className="text-red-600"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Properties Panel */}
        {selectedComponent && (
          <div className="flex-1 p-4 overflow-y-auto">
            <h3 className="font-semibold mb-4">Properties</h3>
            
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
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${source.status === 'connected' ? 'bg-green-500' : 'bg-gray-400'}`} />
                          <span>{source.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedComponent.type === 'chart' && (
                <>
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
                        <SelectItem value="doughnut">Doughnut Chart</SelectItem>
                        <SelectItem value="scatter">Scatter Plot</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="show-legend"
                        checked={selectedComponent.config.showLegend}
                        onCheckedChange={(checked) => updateComponent(selectedComponent.id, {
                          config: { ...selectedComponent.config, showLegend: checked as boolean }
                        })}
                      />
                      <Label htmlFor="show-legend" className="text-sm">Show Legend</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="show-grid"
                        checked={selectedComponent.config.showGrid}
                        onCheckedChange={(checked) => updateComponent(selectedComponent.id, {
                          config: { ...selectedComponent.config, showGrid: checked as boolean }
                        })}
                      />
                      <Label htmlFor="show-grid" className="text-sm">Show Grid</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="animation"
                        checked={selectedComponent.config.animation}
                        onCheckedChange={(checked) => updateComponent(selectedComponent.id, {
                          config: { ...selectedComponent.config, animation: checked as boolean }
                        })}
                      />
                      <Label htmlFor="animation" className="text-sm">Enable Animation</Label>
                    </div>
                  </div>
                </>
              )}

              <Separator />
              
              <div>
                <Label htmlFor="refresh-rate">Refresh Rate (seconds)</Label>
                <Input
                  id="refresh-rate"
                  type="number"
                  value={selectedComponent.config.refreshRate}
                  onChange={(e) => updateComponent(selectedComponent.id, {
                    config: { ...selectedComponent.config, refreshRate: parseInt(e.target.value) || 30 }
                  })}
                />
              </div>

              <div>
                <Label>Styling</Label>
                <div className="space-y-2 mt-2">
                  <div>
                    <Label htmlFor="bg-color" className="text-xs">Background Color</Label>
                    <Input
                      id="bg-color"
                      type="color"
                      value={selectedComponent.config.styling?.backgroundColor || '#ffffff'}
                      onChange={(e) => updateComponent(selectedComponent.id, {
                        config: { 
                          ...selectedComponent.config, 
                          styling: { ...selectedComponent.config.styling, backgroundColor: e.target.value }
                        }
                      })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="text-color" className="text-xs">Text Color</Label>
                    <Input
                      id="text-color"
                      type="color"
                      value={selectedComponent.config.styling?.textColor || '#374151'}
                      onChange={(e) => updateComponent(selectedComponent.id, {
                        config: { 
                          ...selectedComponent.config, 
                          styling: { ...selectedComponent.config.styling, textColor: e.target.value }
                        }
                      })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Canvas */}
      <div className="flex-1 overflow-auto p-6 bg-gray-100">
        <div className="min-h-full bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Canvas</h2>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                Grid: 12 columns
              </Badge>
              <Button variant="outline" size="sm">
                <Grid className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="components">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="grid grid-cols-12 gap-4 min-h-96"
                >
                  {editingView.layout.components
                    .filter(comp => comp.visible)
                    .map((component, index) => (
                    <Draggable
                      key={component.id}
                      draggableId={component.id}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`col-span-${component.position.w} border rounded-lg p-4 bg-white cursor-pointer transition-all ${
                            selectedComponent?.id === component.id
                              ? 'border-blue-500 shadow-lg ring-2 ring-blue-200'
                              : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                          } ${snapshot.isDragging ? 'shadow-2xl rotate-2' : ''}`}
                          onClick={() => setSelectedComponent(component)}
                          style={{
                            backgroundColor: component.config.styling?.backgroundColor,
                            color: component.config.styling?.textColor,
                            borderRadius: `${component.config.styling?.borderRadius}px`
                          }}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <div {...provided.dragHandleProps} className="cursor-move">
                                <Move className="h-4 w-4 text-gray-400" />
                              </div>
                              <h4 className="font-medium">{component.config.title}</h4>
                              <Badge variant="secondary" className="text-xs capitalize">
                                {component.type}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="bg-gray-50 rounded p-6 text-center text-gray-600 min-h-24 flex flex-col items-center justify-center">
                            {component.type === 'chart' && <BarChart3 className="h-8 w-8 mb-2" />}
                            {component.type === 'table' && <Table className="h-8 w-8 mb-2" />}
                            {component.type === 'metric' && <Gauge className="h-8 w-8 mb-2" />}
                            {component.type === 'text' && <Type className="h-8 w-8 mb-2" />}
                            {component.type === 'image' && <ImageIcon className="h-8 w-8 mb-2" />}
                            {component.type === 'map' && <MapPin className="h-8 w-8 mb-2" />}
                            {component.type === 'gauge' && <Activity className="h-8 w-8 mb-2" />}
                            {component.type === 'timeline' && <Clock className="h-8 w-8 mb-2" />}
                            <p className="text-sm font-medium">
                              {component.config.dataSource
                                ? availableDataSources.find(ds => ds.id === component.config.dataSource)?.name
                                : 'No data source'
                              }
                            </p>
                            {component.config.chartType && (
                              <p className="text-xs text-gray-500 capitalize">{component.config.chartType} chart</p>
                            )}
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  
                  {editingView.layout.components.filter(c => c.visible).length === 0 && (
                    <div className="col-span-12 text-center py-16 text-gray-500">
                      <Zap className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-medium mb-2">Start Building Your View</h3>
                      <p className="text-sm mb-4">Add components from the left panel to create your dashboard</p>
                      <Button onClick={() => setIsAddingComponent(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add First Component
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      </div>
    </div>
  );

  const renderDataTab = () => (
    <div className="flex-1 p-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Data Sources</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {availableDataSources.map((source) => (
            <Card 
              key={source.id} 
              className={`cursor-pointer transition-all ${
                selectedDataSource === source.id ? 'ring-2 ring-blue-500' : 'hover:shadow-md'
              }`}
              onClick={() => setSelectedDataSource(source.id)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{source.name}</CardTitle>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${source.status === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm text-gray-600 capitalize">{source.status}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600">{source.type}</p>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">Available Fields: {source.fields.length}</p>
                <div className="flex flex-wrap gap-1">
                  {source.fields.slice(0, 4).map((field) => (
                    <Badge key={field.name} variant="outline" className="text-xs">
                      {field.name}
                    </Badge>
                  ))}
                  {source.fields.length > 4 && (
                    <Badge variant="outline" className="text-xs">+{source.fields.length - 4} more</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {selectedDataSource && (
          <Card>
            <CardHeader>
              <CardTitle>
                Data Fields - {getSelectedDataSource()?.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableFields.map((field) => (
                  <div key={field.name} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{field.name}</h4>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {field.type}
                      </Badge>
                    </div>
                    {field.description && (
                      <p className="text-sm text-gray-600 mb-2">{field.description}</p>
                    )}
                    {field.sampleValues && field.sampleValues.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Sample Values:</p>
                        <div className="text-xs text-gray-700">
                          {field.sampleValues.slice(0, 3).join(', ')}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );

  const renderPreviewTab = () => (
    <div className="flex-1 p-6 bg-gray-900">
      <div className="bg-white rounded-lg shadow-lg p-6 h-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">{editingView.name}</h2>
          <Badge className="bg-green-100 text-green-800">
            Live Preview
          </Badge>
        </div>
        
        <div className="grid grid-cols-12 gap-4">
          {editingView.layout.components
            .filter(comp => comp.visible)
            .map((component) => (
            <div
              key={component.id}
              className={`col-span-${component.position.w} border rounded-lg p-4 bg-white shadow-sm`}
              style={{
                backgroundColor: component.config.styling?.backgroundColor,
                color: component.config.styling?.textColor,
                borderRadius: `${component.config.styling?.borderRadius}px`
              }}
            >
              <h4 className="font-medium mb-3">{component.config.title}</h4>
              <div className="bg-gray-50 rounded p-6 text-center min-h-24 flex flex-col items-center justify-center">
                {component.type === 'chart' && <BarChart3 className="h-12 w-12 mb-2 text-blue-600" />}
                {component.type === 'table' && <Table className="h-12 w-12 mb-2 text-green-600" />}
                {component.type === 'metric' && <Gauge className="h-12 w-12 mb-2 text-purple-600" />}
                {component.type === 'text' && <Type className="h-12 w-12 mb-2 text-gray-600" />}
                {component.type === 'image' && <ImageIcon className="h-12 w-12 mb-2 text-orange-600" />}
                {component.type === 'map' && <MapPin className="h-12 w-12 mb-2 text-red-600" />}
                {component.type === 'gauge' && <Activity className="h-12 w-12 mb-2 text-yellow-600" />}
                {component.type === 'timeline' && <Clock className="h-12 w-12 mb-2 text-indigo-600" />}
                <p className="text-sm font-medium">
                  {component.config.dataSource
                    ? `Connected to ${availableDataSources.find(ds => ds.id === component.config.dataSource)?.name}`
                    : 'Awaiting data connection'
                  }
                </p>
                {component.config.refreshRate && (
                  <p className="text-xs text-gray-500">Refreshes every {component.config.refreshRate}s</p>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {editingView.layout.components.filter(c => c.visible).length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <Eye className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">Preview will appear here</h3>
            <p className="text-sm">Add and configure components to see the live preview</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white shadow-sm">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold">Edit View: {editingView.name}</h1>
          <Badge variant="outline" className="text-xs">
            {editingView.layout.components.length} component(s)
          </Badge>
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

      {/* Navigation Tabs */}
      <div className="border-b bg-gray-50">
        <div className="flex">
          <Button
            variant={activeTab === 'design' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('design')}
            className="flex items-center space-x-2 rounded-none"
          >
            <Layout className="h-4 w-4" />
            <span>Design</span>
          </Button>
          <Button
            variant={activeTab === 'data' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('data')}
            className="flex items-center space-x-2 rounded-none"
          >
            <Database className="h-4 w-4" />
            <span>Data</span>
          </Button>
          <Button
            variant={activeTab === 'preview' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('preview')}
            className="flex items-center space-x-2 rounded-none"
          >
            <Eye className="h-4 w-4" />
            <span>Preview</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {activeTab === 'design' && renderDesignTab()}
        {activeTab === 'data' && renderDataTab()}
        {activeTab === 'preview' && renderPreviewTab()}
      </div>
    </div>
  );
}