import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronLeft, ChevronRight, Plus, Grid3X3, BarChart3, Table, Gauge, Eye, Layout, 
         Settings, Zap, X, Trash2, Copy, Monitor, Text, Image as ImageIcon, Map, Clock } from 'lucide-react';
import type { View, GridRow, UIComponent } from '@shared/schema';

interface ViewEditorProps {
  view: View;
  onClose: () => void;
  onSave: (view: View) => void;
}

export default function ViewEditor({ view, onClose, onSave }: ViewEditorProps) {
  const [editingView, setEditingView] = useState<View>(view);
  const [selectedComponent, setSelectedComponent] = useState<UIComponent | null>(null);
  const [selectedGrid, setSelectedGrid] = useState<GridRow | null>(null);
  const [isAddingComponent, setIsAddingComponent] = useState(false);
  const [isAddingGrid, setIsAddingGrid] = useState(false);
  const [activeTab, setActiveTab] = useState<'design' | 'preview'>('design');
  const [isComponentsPanelCollapsed, setIsComponentsPanelCollapsed] = useState(false);
  const [isPropertiesPanelCollapsed, setIsPropertiesPanelCollapsed] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isTabsCollapsed, setIsTabsCollapsed] = useState(false);
  const [isDataFieldsModalOpen, setIsDataFieldsModalOpen] = useState(false);

  const availableDataSources = [
    {
      id: 'sap-erp',
      name: 'SAP ERP',
      fields: [
        { name: 'order_number', type: 'string', description: 'Production order number', sampleValues: ['PO001', 'PO002', 'PO003'] },
        { name: 'quantity', type: 'number', description: 'Order quantity', sampleValues: [100, 250, 150] },
        { name: 'status', type: 'string', description: 'Order status', sampleValues: ['In Progress', 'Completed', 'Pending'] },
        { name: 'due_date', type: 'date', description: 'Due date', sampleValues: ['2024-01-15', '2024-01-20', '2024-01-25'] },
        { name: 'priority', type: 'string', description: 'Priority level', sampleValues: ['High', 'Medium', 'Low'] }
      ]
    },
    {
      id: 'aveva-pi',
      name: 'AVEVA PI System',
      fields: [
        { name: 'temperature', type: 'number', description: 'Temperature reading', sampleValues: [75.2, 82.1, 78.9] },
        { name: 'pressure', type: 'number', description: 'Pressure value', sampleValues: [14.7, 15.2, 14.9] },
        { name: 'flow_rate', type: 'number', description: 'Flow rate measurement', sampleValues: [120.5, 115.8, 125.2] },
        { name: 'timestamp', type: 'datetime', description: 'Measurement timestamp', sampleValues: ['2024-01-15 10:30:00', '2024-01-15 10:31:00', '2024-01-15 10:32:00'] },
        { name: 'unit_id', type: 'string', description: 'Unit identifier', sampleValues: ['Unit-A1', 'Unit-B2', 'Unit-C3'] }
      ]
    },
    {
      id: 'salesforce-crm',
      name: 'Salesforce CRM',
      fields: [
        { name: 'account_name', type: 'string', description: 'Customer account name', sampleValues: ['ABC Manufacturing', 'XYZ Corp', 'Global Industries'] },
        { name: 'opportunity_value', type: 'number', description: 'Opportunity value', sampleValues: [50000, 75000, 120000] },
        { name: 'stage', type: 'string', description: 'Sales stage', sampleValues: ['Qualification', 'Proposal', 'Closed Won'] },
        { name: 'close_date', type: 'date', description: 'Expected close date', sampleValues: ['2024-02-15', '2024-03-01', '2024-02-28'] },
        { name: 'probability', type: 'number', description: 'Win probability', sampleValues: [75, 60, 90] }
      ]
    },
    {
      id: 'oracle-db',
      name: 'Oracle Database',
      fields: [
        { name: 'product_id', type: 'string', description: 'Product identifier', sampleValues: ['PROD001', 'PROD002', 'PROD003'] },
        { name: 'stock_level', type: 'number', description: 'Current stock level', sampleValues: [500, 250, 750] },
        { name: 'reorder_point', type: 'number', description: 'Reorder point', sampleValues: [100, 50, 150] },
        { name: 'cost', type: 'number', description: 'Unit cost', sampleValues: [25.50, 45.75, 32.25] },
        { name: 'supplier', type: 'string', description: 'Supplier name', sampleValues: ['Supplier A', 'Supplier B', 'Supplier C'] }
      ]
    }
  ];

  const addGrid = (columns: number) => {
    const newGrid: GridRow = {
      id: `grid-${Date.now()}`,
      columns,
      components: []
    };
    setEditingView({
      ...editingView,
      layout: {
        ...editingView.layout,
        grids: [...(editingView.layout?.grids || []), newGrid]
      }
    });
    setIsAddingGrid(false);
  };

  const addComponent = (gridId: string, type: 'chart' | 'table' | 'metric' | 'text' | 'image' | 'map' | 'timeline') => {
    const grid = editingView.layout?.grids.find(g => g.id === gridId);
    if (!grid) return;

    const newComponent: UIComponent = {
      id: `component-${Date.now()}`,
      type,
      gridPosition: 0,
      visible: true,
      config: {
        title: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        dataSource: '',
        selectedFields: [],
        refreshRate: 30,
        styling: {
          backgroundColor: '#ffffff',
          textColor: '#000000',
          borderRadius: 8
        }
      }
    };

    const updatedGrids = (editingView.layout?.grids || []).map(g => 
      g.id === gridId 
        ? { ...g, components: [...g.components, newComponent] }
        : g
    );

    setEditingView({
      ...editingView,
      layout: { grids: updatedGrids }
    });
    setSelectedComponent(newComponent);
    setIsPropertiesPanelCollapsed(false); // Auto-expand properties panel when component is added
    setIsAddingComponent(false);
  };

  const updateComponent = (componentId: string, updates: Partial<UIComponent>) => {
    const updatedGrids = (editingView.layout?.grids || []).map(grid => ({
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
    const updatedGrids = (editingView.layout?.grids || []).map(grid => ({
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
      {/* Left Elements Panel */}
      <div className={`bg-gray-50 border-r transition-all duration-300 ${isComponentsPanelCollapsed ? 'w-12' : 'w-80'} flex flex-col shadow-sm`}>
        <div className="p-3 border-b flex items-center justify-between bg-gray-50">
          {!isComponentsPanelCollapsed && <h3 className="font-semibold text-base">Elements</h3>}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsComponentsPanelCollapsed(!isComponentsPanelCollapsed)}
            className="h-8 w-8 p-0"
            data-testid="toggle-left-panel"
          >
            {isComponentsPanelCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {isComponentsPanelCollapsed ? (
          <div className="flex-1 flex flex-col items-center py-4 space-y-3">
            <Button
              variant="ghost"
              size="sm"
              className="w-8 h-8 p-0"
              title="Grid Layout"
              data-testid="collapsed-grid-button"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-8 h-8 p-0"
              title="Components"
              data-testid="collapsed-components-button"
            >
              <Zap className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            {/* Grid Layout Section */}
            <div className="p-4 border-b bg-white">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-900">Grid Layout</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAddingGrid(!isAddingGrid)}
                  className="h-7 w-7 p-0"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              
              {isAddingGrid && (
                <div className="space-y-2 mb-3 p-3 bg-blue-50 rounded-md">
                  <p className="text-xs text-gray-600">Add new grid row:</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map(cols => (
                      <Button
                        key={cols}
                        variant="outline"
                        size="sm"
                        onClick={() => addGrid(cols)}
                        className="text-xs"
                      >
                        {cols} Col
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Components Section */}
            <div className="p-4 bg-white flex-1">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Components</h4>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingComponent(!isAddingComponent)}
                  className="flex items-center space-x-2 text-xs p-2"
                >
                  <BarChart3 className="h-3 w-3" />
                  <span>Chart</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingComponent(!isAddingComponent)}
                  className="flex items-center space-x-2 text-xs p-2"
                >
                  <Table className="h-3 w-3" />
                  <span>Table</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingComponent(!isAddingComponent)}
                  className="flex items-center space-x-2 text-xs p-2"
                >
                  <Gauge className="h-3 w-3" />
                  <span>Metric</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingComponent(!isAddingComponent)}
                  className="flex items-center space-x-2 text-xs p-2"
                >
                  <Text className="h-3 w-3" />
                  <span>Text</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingComponent(!isAddingComponent)}
                  className="flex items-center space-x-2 text-xs p-2"
                >
                  <ImageIcon className="h-3 w-3" />
                  <span>Image</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingComponent(!isAddingComponent)}
                  className="flex items-center space-x-2 text-xs p-2"
                >
                  <Clock className="h-3 w-3" />
                  <span>Timeline</span>
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 bg-white overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">{editingView.name}</h2>
            <Button
              onClick={() => addGrid(2)}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Grid</span>
            </Button>
          </div>

          <div className="space-y-6">
            {(editingView.layout?.grids || []).map((grid) => (
              <div 
                key={grid.id} 
                className={`border-2 border-dashed border-gray-200 rounded-lg p-4 ${selectedGrid?.id === grid.id ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-300'}`}
                onClick={() => setSelectedGrid(grid)}
              >
                <div className="flex items-center justify-between mb-4">
                  <Badge variant="outline" className="text-xs">
                    {grid.columns} Column Grid ({grid.components.length} components)
                  </Badge>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsAddingComponent(true);
                        setSelectedGrid(grid);
                      }}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                <div className={`grid ${getGridColumns(grid.columns)} gap-4`}>
                  {Array.from({ length: grid.columns }).map((_, colIndex) => {
                    const columnComponents = grid.components.filter(comp => comp.gridPosition === colIndex);
                    
                    return (
                      <div key={colIndex} className="min-h-32 bg-gray-50 rounded border-2 border-dashed border-gray-200 p-3">
                        <div className="text-xs text-gray-500 mb-2">Column {colIndex + 1}</div>
                        <div className="space-y-2">
                          {columnComponents.map((component) => (
                            <div
                              key={component.id}
                              className={`p-3 bg-white rounded border cursor-pointer transition-all ${
                                selectedComponent?.id === component.id 
                                  ? 'border-blue-500 shadow-md' 
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedComponent(component);
                                setIsPropertiesPanelCollapsed(false); // Auto-expand properties panel when component is selected
                              }}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  {component.type === 'chart' && <BarChart3 className="h-4 w-4 text-blue-600" />}
                                  {component.type === 'table' && <Table className="h-4 w-4 text-green-600" />}
                                  {component.type === 'metric' && <Gauge className="h-4 w-4 text-purple-600" />}
                                  {component.type === 'text' && <Text className="h-4 w-4 text-gray-600" />}
                                  {component.type === 'image' && <ImageIcon className="h-4 w-4 text-orange-600" />}
                                  {component.type === 'timeline' && <Clock className="h-4 w-4 text-red-600" />}
                                  <span className="text-sm font-medium">{component.config.title}</span>
                                </div>
                                <div className="flex space-x-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Duplicate component logic
                                    }}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-red-600"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteComponent(component.id);
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              <div className="text-xs text-gray-500">
                                {component.config.dataSource ? (
                                  <span className="text-green-600">
                                    Connected to {availableDataSources.find(ds => ds.id === component.config.dataSource)?.name}
                                  </span>
                                ) : (
                                  <span className="text-orange-600">No data source</span>
                                )}
                              </div>
                            </div>
                          ))}
                          
                          {columnComponents.length === 0 && (
                            <Button
                              variant="ghost"
                              className="w-full h-24 border-2 border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600"
                              onClick={() => {
                                setIsAddingComponent(true);
                                setSelectedGrid(grid);
                              }}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Drop component here
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            
            {editingView.layout.grids.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Grid3X3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">No grids yet</p>
                <p className="text-sm mb-4">Start by adding a grid layout to organize your components</p>
                <Button onClick={() => addGrid(2)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Grid
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Properties Panel */}
      <div className={`bg-gray-50 border-l transition-all duration-300 ${isPropertiesPanelCollapsed ? 'w-12' : 'w-80'} flex flex-col shadow-sm`}>
        <div className="p-3 border-b flex items-center justify-between bg-gray-50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPropertiesPanelCollapsed(!isPropertiesPanelCollapsed)}
            className="h-8 w-8 p-0"
            data-testid="toggle-properties-panel"
          >
            {isPropertiesPanelCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
          {!isPropertiesPanelCollapsed && <h3 className="font-semibold text-base">Properties</h3>}
        </div>
        
        {isPropertiesPanelCollapsed ? (
          <div className="flex-1 flex flex-col items-center py-4 space-y-3">
            <Button
              variant="ghost"
              size="sm"
              className="w-8 h-8 p-0"
              title="Properties"
              data-testid="collapsed-properties-button"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto bg-white">
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
                      config: { ...selectedComponent.config, dataSource: value, selectedFields: [] }
                    })}
                  >
                    <SelectTrigger className="mt-1">
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

                {selectedComponent.config.dataSource && (
                  <div>
                    <div className="flex items-center justify-between">
                      <Label>Data Fields</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsDataFieldsModalOpen(true)}
                        className="text-xs"
                      >
                        Configure Fields
                      </Button>
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      {selectedComponent.config.selectedFields?.length || 0} field(s) selected
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Label htmlFor="comp-visible">Visible</Label>
                  <Switch
                    id="comp-visible"
                    checked={selectedComponent.visible}
                    onCheckedChange={(checked) => updateComponent(selectedComponent.id, {
                      visible: checked
                    })}
                  />
                </div>

                {selectedComponent.type === 'chart' && (
                  <div>
                    <Label htmlFor="chart-type">Chart Type</Label>
                    <Select
                      value={selectedComponent.config.chartType || 'bar'}
                      onValueChange={(value: 'bar' | 'line' | 'pie' | 'area' | 'doughnut' | 'scatter') => updateComponent(selectedComponent.id, {
                        config: { ...selectedComponent.config, chartType: value }
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
        )}
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
          {(editingView.layout?.grids || []).map((grid) => (
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
                          {component.type === 'text' && <Text className="h-12 w-12 mb-2 text-gray-600" />}
                          {component.type === 'image' && <ImageIcon className="h-12 w-12 mb-2 text-orange-600" />}
                          {component.type === 'timeline' && <Clock className="h-12 w-12 mb-2 text-red-600" />}
                          <p className="text-sm text-gray-500 mt-2">
                            {component.config.dataSource ? (
                              <>Connected to {availableDataSources.find(ds => ds.id === component.config.dataSource)?.name}</>
                            ) : (
                              'No data source configured'
                            )}
                          </p>
                          {component.config.selectedFields && component.config.selectedFields.length > 0 && (
                            <p className="text-xs text-gray-400 mt-1">
                              Fields: {component.config.selectedFields.join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
          
          {editingView.layout.grids.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Monitor className="h-16 w-16 mx-auto mb-4" />
              <p className="text-lg">Preview will appear here once you add grids and components</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white shadow-sm">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
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

      {/* Data Fields Configuration Modal */}
      {selectedComponent && isDataFieldsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-lg font-semibold">Configure Data Fields</h2>
                <p className="text-sm text-gray-600">
                  Select fields from {availableDataSources.find(ds => ds.id === selectedComponent.config.dataSource)?.name}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIsDataFieldsModalOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-3">
                {(() => {
                  const selectedSource = availableDataSources.find(ds => ds.id === selectedComponent.config.dataSource);
                  return selectedSource?.fields.map((field) => (
                    <div key={field.name} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id={`modal-field-${field.name}`}
                          checked={selectedComponent.config.selectedFields?.includes(field.name) || false}
                          onCheckedChange={(checked) => {
                            const currentFields = selectedComponent.config.selectedFields || [];
                            const updatedFields = checked 
                              ? [...currentFields, field.name]
                              : currentFields.filter((f: string) => f !== field.name);
                            updateComponent(selectedComponent.id, {
                              config: { ...selectedComponent.config, selectedFields: updatedFields }
                            });
                          }}
                        />
                        <div>
                          <Label htmlFor={`modal-field-${field.name}`} className="font-medium">
                            {field.name}
                          </Label>
                          <p className="text-sm text-gray-500">{field.description}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {field.type}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      {field.sampleValues && (
                        <div className="text-sm text-gray-400">
                          <div className="text-xs text-gray-500 mb-1">Sample values:</div>
                          <div className="flex space-x-1">
                            {field.sampleValues.slice(0, 3).map((val, idx) => (
                              <span key={idx} className="bg-gray-100 px-2 py-1 rounded text-xs">
                                {String(val)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )) || [];
                })()}
              </div>
            </div>
            
            <div className="flex items-center justify-between p-6 border-t bg-gray-50">
              <div className="text-sm text-gray-600">
                {selectedComponent.config.selectedFields?.length || 0} field(s) selected
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => setIsDataFieldsModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsDataFieldsModalOpen(false)} className="bg-blue-600 hover:bg-blue-700">
                  Apply Selection
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}