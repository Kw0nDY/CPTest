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
  Grid3X3,
  ChevronUp,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Columns,
  Rows,
  Settings
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
    grids: GridRow[];
  };
  createdAt: string;
  updatedAt: string;
}

interface GridRow {
  id: string;
  columns: number; // 1, 2, 3, or 4
  components: UIComponent[];
}

interface UIComponent {
  id: string;
  type: 'chart' | 'table' | 'metric' | 'text' | 'image' | 'map' | 'gauge' | 'timeline';
  gridPosition: number; // 0, 1, 2, 3 (column index)
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

export default function ViewEditorEmbedded({ view, onClose, onSave }: ViewEditorProps) {
  const [editingView, setEditingView] = useState<ViewConfig>({
    ...view,
    layout: view.layout.grids ? view.layout : { grids: [] }
  });
  const [selectedComponent, setSelectedComponent] = useState<UIComponent | null>(null);
  const [selectedGrid, setSelectedGrid] = useState<GridRow | null>(null);
  const [isAddingComponent, setIsAddingComponent] = useState(false);
  const [isAddingGrid, setIsAddingGrid] = useState(false);
  const [activeTab, setActiveTab] = useState<'design' | 'preview'>('design');
  const [isComponentsPanelCollapsed, setIsComponentsPanelCollapsed] = useState(false);
  const [isTabsCollapsed, setIsTabsCollapsed] = useState(false);

  const addGrid = (columns: number) => {
    const newGrid: GridRow = {
      id: `grid-${Date.now()}`,
      columns,
      components: []
    };

    setEditingView({
      ...editingView,
      layout: {
        grids: [...editingView.layout.grids, newGrid]
      }
    });
    setSelectedGrid(newGrid);
    setIsAddingGrid(false);
  };

  const moveGrid = (gridId: string, direction: 'up' | 'down') => {
    const grids = [...editingView.layout.grids];
    const currentIndex = grids.findIndex(g => g.id === gridId);
    
    if (direction === 'up' && currentIndex > 0) {
      [grids[currentIndex], grids[currentIndex - 1]] = [grids[currentIndex - 1], grids[currentIndex]];
    } else if (direction === 'down' && currentIndex < grids.length - 1) {
      [grids[currentIndex], grids[currentIndex + 1]] = [grids[currentIndex + 1], grids[currentIndex]];
    }

    setEditingView({
      ...editingView,
      layout: { grids }
    });
  };

  const deleteGrid = (gridId: string) => {
    const updatedGrids = editingView.layout.grids.filter(g => g.id !== gridId);
    setEditingView({
      ...editingView,
      layout: { grids: updatedGrids }
    });
    
    if (selectedGrid?.id === gridId) {
      setSelectedGrid(null);
    }
  };

  const addComponentToGrid = (gridId: string, type: string, position: number) => {
    const newComponent: UIComponent = {
      id: `component-${Date.now()}`,
      type: type as any,
      gridPosition: position,
      visible: true,
      config: {
        title: `New ${type}`,
        dataSource: '',
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

    const updatedGrids = editingView.layout.grids.map(grid => {
      if (grid.id === gridId) {
        return {
          ...grid,
          components: [...grid.components, newComponent]
        };
      }
      return grid;
    });

    setEditingView({
      ...editingView,
      layout: { grids: updatedGrids }
    });
    setSelectedComponent(newComponent);
    setIsAddingComponent(false);
  };

  const updateComponent = (componentId: string, updates: Partial<UIComponent>) => {
    const updatedGrids = editingView.layout.grids.map(grid => ({
      ...grid,
      components: grid.components.map(comp =>
        comp.id === componentId ? { ...comp, ...updates } : comp
      )
    }));
    
    setEditingView({
      ...editingView,
      layout: { grids: updatedGrids }
    });

    if (selectedComponent?.id === componentId) {
      setSelectedComponent({ ...selectedComponent, ...updates });
    }
  };

  const deleteComponent = (componentId: string) => {
    const updatedGrids = editingView.layout.grids.map(grid => ({
      ...grid,
      components: grid.components.filter(comp => comp.id !== componentId)
    }));
    
    setEditingView({
      ...editingView,
      layout: { grids: updatedGrids }
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

  const getGridColumns = (columns: number) => {
    switch (columns) {
      case 1: return 'grid-cols-1';
      case 2: return 'grid-cols-2';
      case 3: return 'grid-cols-3';
      case 4: return 'grid-cols-4';
      default: return 'grid-cols-1';
    }
  };

  const renderDesignTab = () => (
    <div className="flex h-full">
      {/* Left Sidebar - Elements Panel */}
      <div className={`bg-white border-r transition-all duration-300 ${isComponentsPanelCollapsed ? 'w-12' : 'w-80'} flex flex-col`}>
        <div className="p-3 border-b flex items-center justify-between">
          {!isComponentsPanelCollapsed && <h3 className="font-semibold text-base">Elements</h3>}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsComponentsPanelCollapsed(!isComponentsPanelCollapsed)}
          >
            {isComponentsPanelCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {!isComponentsPanelCollapsed && (
          <>
            {/* Grid Layout Section */}
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">Grid Layout</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingGrid(!isAddingGrid)}
                  className="h-8 px-2"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {isAddingGrid && (
                <div className="space-y-2 mb-4">
                  {[1, 2, 3, 4].map((cols) => (
                    <Button
                      key={cols}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-8"
                      onClick={() => addGrid(cols)}
                    >
                      <Grid3X3 className="h-4 w-4 mr-2" />
                      {cols} Column{cols > 1 ? 's' : ''}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Components Section */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                <h4 className="font-medium mb-3">Components</h4>
                <div className="space-y-2">
                  {componentTypes.map((compType) => (
                    <div
                      key={compType.type}
                      className="flex items-center p-3 rounded border cursor-pointer hover:bg-gray-50 transition-colors"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('component-type', compType.type);
                      }}
                    >
                      <compType.icon className="h-5 w-5 mr-3" />
                      <span className="text-sm font-medium">{compType.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main Canvas */}
      <div className="flex-1 bg-gray-50 overflow-hidden flex flex-col">
        <div className="p-4 bg-white border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{editingView.name}</h2>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsAddingGrid(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Grid
              </Button>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-6">
            {editingView.layout.grids.map((grid, gridIndex) => (
              <div 
                key={grid.id} 
                className={`border rounded-lg p-4 bg-white shadow-sm ${selectedGrid?.id === grid.id ? 'border-blue-500' : 'border-gray-200'}`}
                onClick={() => setSelectedGrid(grid)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <Grid3X3 className="h-4 w-4" />
                      <span className="font-medium">{grid.columns} Column Grid</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {grid.components.length} component(s)
                    </Badge>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveGrid(grid.id, 'up');
                      }}
                      disabled={gridIndex === 0}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveGrid(grid.id, 'down');
                      }}
                      disabled={gridIndex === editingView.layout.grids.length - 1}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteGrid(grid.id);
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div 
                  className={`grid ${getGridColumns(grid.columns)} gap-4 min-h-40`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const componentType = e.dataTransfer.getData('component-type');
                    if (componentType) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const columnWidth = rect.width / grid.columns;
                      const targetColumn = Math.floor(x / columnWidth);
                      addComponentToGrid(grid.id, componentType, targetColumn);
                    }
                  }}
                >
                  {Array.from({ length: grid.columns }).map((_, colIndex) => {
                    const columnsComponents = grid.components.filter(comp => comp.gridPosition === colIndex);
                    
                    return (
                      <div key={colIndex} className="border-2 border-dashed border-gray-300 rounded-lg p-4 min-h-40 bg-gray-50">
                        {columnsComponents.length === 0 ? (
                          <div className="text-center text-gray-400 h-full flex flex-col items-center justify-center">
                            <Plus className="h-8 w-8 mb-2" />
                            <p className="text-sm">Drop component here</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {columnsComponents.map((component) => (
                              <div
                                key={component.id}
                                className={`border rounded-lg p-4 bg-white cursor-pointer transition-all ${
                                  selectedComponent?.id === component.id
                                    ? 'border-blue-500 shadow-lg ring-2 ring-blue-200'
                                    : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedComponent(component);
                                }}
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center space-x-2">
                                    <h4 className="font-medium text-sm">{component.config.title}</h4>
                                    <Badge variant="secondary" className="text-xs capitalize">
                                      {component.type}
                                    </Badge>
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
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                                
                                <div className="bg-gray-50 rounded p-4 text-center text-gray-600 min-h-20 flex flex-col items-center justify-center">
                                  {component.type === 'chart' && <BarChart3 className="h-8 w-8 mb-2 text-blue-600" />}
                                  {component.type === 'table' && <Table className="h-8 w-8 mb-2 text-green-600" />}
                                  {component.type === 'metric' && <Gauge className="h-8 w-8 mb-2 text-purple-600" />}
                                  {component.type === 'text' && <Type className="h-8 w-8 mb-2 text-gray-600" />}
                                  {component.type === 'image' && <ImageIcon className="h-8 w-8 mb-2 text-orange-600" />}
                                  {component.type === 'map' && <MapPin className="h-8 w-8 mb-2 text-red-600" />}
                                  {component.type === 'gauge' && <Activity className="h-8 w-8 mb-2 text-yellow-600" />}
                                  {component.type === 'timeline' && <Clock className="h-8 w-8 mb-2 text-indigo-600" />}
                                  <p className="text-xs font-medium">
                                    {component.config.dataSource
                                      ? availableDataSources.find(ds => ds.id === component.config.dataSource)?.name || 'No data source'
                                      : 'No data source'
                                    }
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {editingView.layout.grids.length === 0 && (
              <div className="text-center py-20 text-gray-500">
                <Grid3X3 className="h-20 w-20 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-medium mb-2">Start with a Grid Layout</h3>
                <p className="text-sm mb-6">Add grid rows to organize your components</p>
                <Button onClick={() => setIsAddingGrid(true)} size="lg">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Grid
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Properties Panel */}
      <div className="w-80 bg-white border-l flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-base">Properties</h3>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {selectedComponent ? (
            <div className="p-4 space-y-4">
              <div>
                <Label htmlFor="comp-title">Title</Label>
                <Input
                  id="comp-title"
                  value={selectedComponent.config.title}
                  onChange={(e) => updateComponent(selectedComponent.id, {
                    config: { ...selectedComponent.config, title: e.target.value }
                  })}
                  className="mt-1"
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
                  <SelectTrigger className="mt-1">
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
                <div>
                  <Label htmlFor="chart-type">Chart Type</Label>
                  <Select
                    value={selectedComponent.config.chartType}
                    onValueChange={(value) => updateComponent(selectedComponent.id, {
                      config: { ...selectedComponent.config, chartType: value as any }
                    })}
                  >
                    <SelectTrigger className="mt-1">
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
              )}

              <div>
                <Label htmlFor="refresh-rate">Refresh Rate (seconds)</Label>
                <Input
                  id="refresh-rate"
                  type="number"
                  value={selectedComponent.config.refreshRate}
                  onChange={(e) => updateComponent(selectedComponent.id, {
                    config: { ...selectedComponent.config, refreshRate: parseInt(e.target.value) || 30 }
                  })}
                  className="mt-1"
                />
              </div>
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500">
              <Settings className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">Select a component to edit its properties</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderPreviewTab = () => (
    <div className="flex-1 p-6 bg-gray-100">
      <div className="bg-white rounded-lg shadow-lg p-6 h-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">{editingView.name}</h2>
          <Badge className="bg-green-100 text-green-800">
            Live Preview
          </Badge>
        </div>
        
        <div className="space-y-6">
          {editingView.layout.grids.map((grid) => (
            <div key={grid.id} className={`grid ${getGridColumns(grid.columns)} gap-4`}>
              {Array.from({ length: grid.columns }).map((_, colIndex) => {
                const columnsComponents = grid.components.filter(comp => comp.gridPosition === colIndex && comp.visible);
                
                return (
                  <div key={colIndex} className="space-y-4">
                    {columnsComponents.map((component) => (
                      <div
                        key={component.id}
                        className="border rounded-lg p-4 bg-white shadow-sm"
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
                );
              })}
            </div>
          ))}
        </div>
        
        {editingView.layout.grids.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <Eye className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">Preview will appear here</h3>
            <p className="text-sm">Add grids and components to see the live preview</p>
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
          <h1 className="text-lg font-semibold">Edit View: {editingView.name}</h1>
          <Badge variant="outline" className="text-xs">
            {editingView.layout.grids.reduce((total, grid) => total + grid.components.length, 0)} component(s)
          </Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            Save View
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b bg-white flex">
        <Button
          variant={activeTab === 'design' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('design')}
          className="flex items-center space-x-2 rounded-none"
        >
          <Layout className="h-4 w-4" />
          <span>Design</span>
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

      <div className="flex-1 overflow-hidden">
        {activeTab === 'design' && renderDesignTab()}
        {activeTab === 'preview' && renderPreviewTab()}
      </div>
    </div>
  );
}