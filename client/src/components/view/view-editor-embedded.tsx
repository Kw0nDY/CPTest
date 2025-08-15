import { useState } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronLeft, ChevronRight, Plus, Grid3X3, BarChart3, Table, Gauge, Eye, Layout, 
         Settings, Zap, X, Trash2, Copy, Monitor, Text, Image as ImageIcon, Map, Clock, 
         ChevronUp, ChevronDown, Move } from 'lucide-react';
import type { View, GridRow, UIComponent } from '@shared/schema';

interface ViewEditorProps {
  view: View;
  onClose: () => void;
  onSave: (view: View) => void;
}

// Drag and Drop Types
const ItemTypes = {
  COMPONENT: 'component',
  GRID_ROW: 'grid_row'
};

interface DraggedComponent {
  id: string;
  type: UIComponent['type'];
  gridId?: string;
  position?: number;
}

interface DraggedGrid {
  id: string;
  index: number;
}

function ViewEditor({ view, onClose, onSave }: ViewEditorProps) {
  const [editingView, setEditingView] = useState<View>(view);
  const [selectedComponent, setSelectedComponent] = useState<UIComponent | null>(null);
  const [selectedGrid, setSelectedGrid] = useState<GridRow | null>(null);
  const [isAddingComponent, setIsAddingComponent] = useState(false);
  const [isAddingGrid, setIsAddingGrid] = useState(false);
  const [activeTab, setActiveTab] = useState<'design' | 'preview'>('design');
  const [isComponentsPanelCollapsed, setIsComponentsPanelCollapsed] = useState(false);
  const [isPropertiesPanelCollapsed, setIsPropertiesPanelCollapsed] = useState(false);
  const [isDataFieldsModalOpen, setIsDataFieldsModalOpen] = useState(false);

  // Mock data sources
  const availableDataSources = [
    {
      id: 'sap-erp',
      name: 'SAP ERP',
      fields: [
        { name: 'employee_count', type: 'number', description: 'Total number of employees', sampleValues: ['1240', '985', '1560'] },
        { name: 'department', type: 'string', description: 'Department name', sampleValues: ['Engineering', 'Sales', 'Marketing'] },
        { name: 'budget', type: 'number', description: 'Department budget', sampleValues: ['$2.5M', '$1.2M', '$890K'] }
      ]
    },
    {
      id: 'aveva-pi',
      name: 'AVEVA PI System',
      fields: [
        { name: 'temperature', type: 'number', description: 'Equipment temperature', sampleValues: ['72.5°F', '68.2°F', '75.1°F'] },
        { name: 'pressure', type: 'number', description: 'System pressure', sampleValues: ['145 PSI', '152 PSI', '148 PSI'] },
        { name: 'flow_rate', type: 'number', description: 'Flow rate measurement', sampleValues: ['24.8 L/min', '26.1 L/min', '23.5 L/min'] }
      ]
    }
  ];

  const componentTypes = [
    { type: 'chart', icon: BarChart3, label: 'Chart' },
    { type: 'table', icon: Table, label: 'Table' },
    { type: 'metric', icon: Gauge, label: 'Metric' },
    { type: 'text', icon: Text, label: 'Text' },
    { type: 'image', icon: ImageIcon, label: 'Image' },
    { type: 'timeline', icon: Clock, label: 'Timeline' }
  ];

  const addGrid = (columns: number) => {
    const newGrid: GridRow = {
      id: `grid-${Date.now()}`,
      columns,
      components: []
    };
    
    const updatedGrids = [...(editingView.layout?.grids || []), newGrid];
    setEditingView({
      ...editingView,
      layout: { grids: updatedGrids }
    });
    setIsAddingGrid(false);
  };

  const addComponent = (type: UIComponent['type']) => {
    if (!selectedGrid) return;

    const newComponent: UIComponent = {
      id: `component-${Date.now()}`,
      type,
      gridPosition: 0,
      config: {
        dataSource: '',
        selectedFields: [],
        chartType: type === 'chart' ? 'bar' : undefined,
        refreshRate: 30,
        animationEnabled: true
      }
    };

    const updatedGrids = (editingView.layout?.grids || []).map(grid => {
      if (grid.id === selectedGrid.id) {
        return { ...grid, components: [...grid.components, newComponent] };
      }
      return grid;
    });

    setEditingView({
      ...editingView,
      layout: { grids: updatedGrids }
    });
    setIsAddingComponent(false);
    setSelectedComponent(newComponent);
    setIsPropertiesPanelCollapsed(false);
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

  // Component movement functions
  const moveComponent = (draggedId: string, targetGridId: string, targetPosition: number) => {
    const updatedGrids = (editingView.layout?.grids || []).map(grid => {
      // Remove component from source grid
      const componentsWithoutDragged = grid.components.filter(comp => comp.id !== draggedId);
      
      if (grid.id === targetGridId) {
        // Find the dragged component from any grid
        let draggedComponent: UIComponent | null = null;
        (editingView.layout?.grids || []).forEach(g => {
          const found = g.components.find(comp => comp.id === draggedId);
          if (found) draggedComponent = found;
        });
        
        if (draggedComponent) {
          // Update component position and add to target grid
          const updatedComponent = { ...draggedComponent, gridPosition: targetPosition };
          const targetComponents = grid.id === targetGridId ? componentsWithoutDragged : grid.components;
          targetComponents.splice(targetPosition, 0, updatedComponent);
          return { ...grid, components: targetComponents };
        }
      }
      
      return { ...grid, components: componentsWithoutDragged };
    });

    setEditingView({
      ...editingView,
      layout: { grids: updatedGrids }
    });
  };

  const moveComponentWithinGrid = (componentId: string, direction: 'up' | 'down') => {
    const updatedGrids = (editingView.layout?.grids || []).map(grid => {
      const componentIndex = grid.components.findIndex(comp => comp.id === componentId);
      if (componentIndex === -1) return grid;

      const newComponents = [...grid.components];
      const targetIndex = direction === 'up' ? componentIndex - 1 : componentIndex + 1;
      
      if (targetIndex >= 0 && targetIndex < newComponents.length) {
        // Swap positions
        [newComponents[componentIndex], newComponents[targetIndex]] = 
        [newComponents[targetIndex], newComponents[componentIndex]];
      }
      
      return { ...grid, components: newComponents };
    });

    setEditingView({
      ...editingView,
      layout: { grids: updatedGrids }
    });
  };

  const moveGrid = (dragIndex: number, hoverIndex: number) => {
    const grids = editingView.layout?.grids || [];
    const draggedGrid = grids[dragIndex];
    const newGrids = [...grids];
    newGrids.splice(dragIndex, 1);
    newGrids.splice(hoverIndex, 0, draggedGrid);

    setEditingView({
      ...editingView,
      layout: { grids: newGrids }
    });
  };

  // Draggable Grid Component
  const DraggableGrid = ({ grid, index }: { grid: GridRow; index: number }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
      type: ItemTypes.GRID_ROW,
      item: { id: grid.id, index },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }), [grid.id, index]);

    const [, drop] = useDrop(() => ({
      accept: ItemTypes.GRID_ROW,
      hover: (item: DraggedGrid) => {
        if (item.index !== index) {
          moveGrid(item.index, index);
          item.index = index;
        }
      },
    }), [index]);

    return (
      <div
        ref={(node) => drag(drop(node))}
        className={`mb-4 border rounded-lg bg-white shadow-sm ${isDragging ? 'opacity-50' : ''}`}
      >
        <div className="p-3 border-b bg-gray-50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Move className="h-4 w-4 text-gray-400 cursor-move" />
            <span className="text-sm font-medium">Grid Row ({grid.columns} columns)</span>
          </div>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => {
                const updatedGrids = (editingView.layout?.grids || []).filter(g => g.id !== grid.id);
                setEditingView({
                  ...editingView,
                  layout: { grids: updatedGrids }
                });
              }}
            >
              <Trash2 className="h-3 w-3 text-red-600" />
            </Button>
          </div>
        </div>
        <div className={`grid ${getGridColumns(grid.columns)} gap-4 p-4`}>
          {Array.from({ length: grid.columns }).map((_, columnIndex) => {
            const columnComponents = grid.components.filter(comp => comp.gridPosition === columnIndex);
            return (
              <DropZone key={columnIndex} gridId={grid.id} position={columnIndex}>
                <div className="min-h-[100px] space-y-2">
                  {columnComponents.map((component, compIndex) => (
                    <DraggableComponent 
                      key={component.id}
                      component={component}
                      index={compIndex}
                      gridId={grid.id}
                    />
                  ))}
                  {columnComponents.length === 0 && (
                    <div className="h-24 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-400">
                      <span className="text-sm">Drop component here</span>
                    </div>
                  )}
                </div>
              </DropZone>
            );
          })}
        </div>
      </div>
    );
  };

  // Draggable Component
  const DraggableComponent = ({ component, index, gridId }: { 
    component: UIComponent; 
    index: number;
    gridId: string;
  }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
      type: ItemTypes.COMPONENT,
      item: { id: component.id, type: component.type, gridId, position: component.gridPosition },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
      canDrag: true,
    }), [component.id, gridId, component.gridPosition]);

    return (
      <div
        ref={drag}
        className={`p-3 border rounded-lg bg-white hover:shadow-md transition-all duration-200 ${isDragging ? 'opacity-50 scale-95 shadow-lg border-blue-300' : 'cursor-move'}`}
        onClick={() => setSelectedComponent(component)}
        style={{ touchAction: 'none' }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            {component.type === 'chart' && <BarChart3 className="h-4 w-4 text-blue-600" />}
            {component.type === 'table' && <Table className="h-4 w-4 text-green-600" />}
            {component.type === 'metric' && <Gauge className="h-4 w-4 text-purple-600" />}
            {component.type === 'text' && <Text className="h-4 w-4 text-gray-600" />}
            {component.type === 'image' && <ImageIcon className="h-4 w-4 text-orange-600" />}
            {component.type === 'timeline' && <Clock className="h-4 w-4 text-red-600" />}
            <span className="text-sm font-medium capitalize">{component.type}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                moveComponentWithinGrid(component.id, 'up');
              }}
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                moveComponentWithinGrid(component.id, 'down');
              }}
            >
              <ChevronDown className="h-3 w-3" />
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
    );
  };

  // Drop Zone Component  
  const DropZone = ({ children, gridId, position }: { 
    children: React.ReactNode; 
    gridId: string; 
    position: number;
  }) => {
    const [{ isOver, canDrop }, drop] = useDrop(() => ({
      accept: ItemTypes.COMPONENT,
      drop: (item: DraggedComponent) => {
        if (item.gridId !== gridId || item.position !== position) {
          moveComponent(item.id, gridId, position);
        }
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    }), [gridId, position]);

    return (
      <div
        ref={drop}
        className={`transition-all duration-200 rounded ${
          isOver && canDrop 
            ? 'bg-blue-50 border-2 border-blue-300 border-dashed' 
            : canDrop 
            ? 'border-2 border-transparent' 
            : ''
        }`}
      >
        {children}
      </div>
    );
  };

  const renderDesignTab = () => (
    <div className="flex h-full">
      {/* Left Elements Panel */}
      <div className={`bg-gray-50 border-r transition-all duration-300 ${isComponentsPanelCollapsed ? 'w-12' : 'w-80'} flex flex-col shadow-sm relative`}>
        <div className="p-3 border-b flex items-center justify-between bg-gray-50 relative">
          {!isComponentsPanelCollapsed && <h3 className="font-semibold text-base">Elements</h3>}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsComponentsPanelCollapsed(!isComponentsPanelCollapsed)}
            className={`h-7 w-7 p-0 transition-all duration-300 hover:bg-blue-100 hover:text-blue-600 ${isComponentsPanelCollapsed ? 'absolute top-2 left-1/2 transform -translate-x-1/2' : 'ml-auto'}`}
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
              className="w-8 h-8 p-0 hover:bg-blue-100 hover:text-blue-600"
              title="Grid Layout"
              data-testid="collapsed-grid-button"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-8 h-8 p-0 hover:bg-blue-100 hover:text-blue-600"
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
                {componentTypes.map(({ type, icon: Icon, label }) => (
                  <Button
                    key={type}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedGrid) {
                        addComponent(type as UIComponent['type']);
                      } else {
                        alert('Please select a grid first');
                      }
                    }}
                    className="flex items-center space-x-2 text-xs p-2"
                  >
                    <Icon className="h-3 w-3" />
                    <span>{label}</span>
                  </Button>
                ))}
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
            {(editingView.layout?.grids || []).map((grid, gridIndex) => (
              <DraggableGrid key={grid.id} grid={grid} index={gridIndex} />
            ))}
            
            {(editingView.layout?.grids || []).length === 0 && (
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
      <div className={`bg-gray-50 border-l transition-all duration-300 ${isPropertiesPanelCollapsed ? 'w-12' : 'w-80'} flex flex-col shadow-sm relative`}>
        <div className="p-3 border-b flex items-center justify-between bg-gray-50 relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPropertiesPanelCollapsed(!isPropertiesPanelCollapsed)}
            className={`h-7 w-7 p-0 transition-all duration-300 hover:bg-blue-100 hover:text-blue-600 ${isPropertiesPanelCollapsed ? 'absolute top-2 left-1/2 transform -translate-x-1/2' : 'mr-auto'}`}
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
              className="w-8 h-8 p-0 hover:bg-blue-100 hover:text-blue-600"
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
                  <h4 className="text-sm font-semibold mb-2">Component Properties</h4>
                  <p className="text-xs text-gray-600 capitalize">{selectedComponent.type} Component</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-medium">Data Source</Label>
                    <Select
                      value={selectedComponent.config.dataSource}
                      onValueChange={(value) => updateComponent(selectedComponent.id, {
                        config: { ...selectedComponent.config, dataSource: value }
                      })}
                    >
                      <SelectTrigger className="h-8 text-xs">
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
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs font-medium">Data Fields</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsDataFieldsModalOpen(true)}
                          className="h-6 text-xs"
                        >
                          Configure
                        </Button>
                      </div>
                      {selectedComponent.config.selectedFields && selectedComponent.config.selectedFields.length > 0 && (
                        <div className="space-y-1">
                          {selectedComponent.config.selectedFields.map((field: string) => (
                            <Badge key={field} variant="outline" className="text-xs">
                              {field}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {selectedComponent.type === 'chart' && (
                    <div>
                      <Label className="text-xs font-medium">Chart Type</Label>
                      <Select
                        value={selectedComponent.config.chartType}
                        onValueChange={(value) => updateComponent(selectedComponent.id, {
                          config: { ...selectedComponent.config, chartType: value }
                        })}
                      >
                        <SelectTrigger className="h-8 text-xs">
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
                    <Label className="text-xs font-medium">Refresh Rate (seconds)</Label>
                    <Input
                      type="number"
                      value={selectedComponent.config.refreshRate}
                      onChange={(e) => updateComponent(selectedComponent.id, {
                        config: { ...selectedComponent.config, refreshRate: parseInt(e.target.value) }
                      })}
                      className="h-8 text-xs"
                      min="1"
                      max="3600"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={selectedComponent.config.animationEnabled}
                      onCheckedChange={(checked) => updateComponent(selectedComponent.id, {
                        config: { ...selectedComponent.config, animationEnabled: checked }
                      })}
                    />
                    <Label className="text-xs">Enable animations</Label>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500">
                <Settings className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Select a component to edit its properties</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderPreviewTab = () => (
    <div className="p-6 bg-gray-50 h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">{editingView.name}</h2>
        
        {(editingView.layout?.grids || []).map((grid) => (
          <div key={grid.id} className="mb-8">
            <div className={`grid ${getGridColumns(grid.columns)} gap-6`}>
              {Array.from({ length: grid.columns }).map((_, columnIndex) => {
                const columnComponents = grid.components.filter(comp => comp.gridPosition === columnIndex);
                return (
                  <div key={columnIndex} className="space-y-4">
                    {columnComponents.map((component) => (
                      <div key={component.id} className="bg-white rounded-lg shadow-sm border p-6">
                        <div className="flex items-center justify-center h-32">
                          {component.type === 'chart' && <BarChart3 className="h-12 w-12 mb-2 text-blue-600" />}
                          {component.type === 'table' && <Table className="h-12 w-12 mb-2 text-green-600" />}
                          {component.type === 'metric' && <Gauge className="h-12 w-12 mb-2 text-purple-600" />}
                          {component.type === 'text' && <Text className="h-12 w-12 mb-2 text-gray-600" />}
                          {component.type === 'image' && <ImageIcon className="h-12 w-12 mb-2 text-orange-600" />}
                          {component.type === 'timeline' && <Clock className="h-12 w-12 mb-2 text-red-600" />}
                          <div className="text-center">
                            <p className="text-lg font-medium capitalize">{component.type} Component</p>
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
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        
        {(editingView.layout?.grids || []).length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Monitor className="h-16 w-16 mx-auto mb-4" />
            <p className="text-lg">Preview will appear here once you add grids and components</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-full flex flex-col bg-white">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-white shadow-sm">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={onClose}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-semibold">Edit View: {editingView.name}</h1>
            <Badge variant="outline" className="text-xs">
              {(editingView.layout?.grids || []).reduce((total, grid) => total + grid.components.length, 0)} component(s)
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
          <div className="flex">
            <button
              onClick={() => setActiveTab('design')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'design' 
                  ? 'border-blue-500 text-blue-600 bg-blue-50' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Design
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'preview' 
                  ? 'border-blue-500 text-blue-600 bg-blue-50' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Preview
            </button>
          </div>
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
                          <div className="text-right">
                            <p className="text-xs text-gray-500 mb-1">Sample values:</p>
                            <div className="text-xs text-gray-600">
                              {field.sampleValues.slice(0, 2).map((value, index) => (
                                <div key={index}>{value}</div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ));
                  })()}
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 p-6 border-t">
                <Button variant="outline" onClick={() => setIsDataFieldsModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsDataFieldsModalOpen(false)} className="bg-blue-600 hover:bg-blue-700">
                  Save Configuration
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DndProvider>
  );
}

export default ViewEditor;