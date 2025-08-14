import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft,
  Plus,
  GripVertical,
  X,
  Database,
  Table,
  BarChart3,
  Activity,
  Layers,
  Save,
  Eye,
  Settings,
  Filter,
  Clock
} from 'lucide-react';

interface DataColumn {
  id: string;
  name: string;
  type: string;
  description: string;
  dataSource: string;
  dataSourceName: string;
}

interface ViewBlock {
  id: string;
  type: 'table' | 'chart' | 'metric' | 'filter';
  title: string;
  dataColumns: DataColumn[];
  position: { x: number; y: number };
  size: { width: number; height: number };
  config: any;
}

interface CreateViewEditorProps {
  onBack: () => void;
}

const availableDataSources = [
  {
    id: 'aveva-pi',
    name: 'AVEVA PI System',
    type: 'PI Web API',
    status: 'connected',
    columns: [
      { id: 'pi_1', name: 'BitWeight', type: 'FLOAT', description: 'Drilling bit weight in pounds' },
      { id: 'pi_2', name: 'HoleDepth', type: 'FLOAT', description: 'Current hole depth in feet' },
      { id: 'pi_3', name: 'PumpPressure', type: 'FLOAT', description: 'Mud pump pressure (PSI)' },
      { id: 'pi_4', name: 'TopDriveRPM', type: 'FLOAT', description: 'Top drive rotation speed (RPM)' },
      { id: 'pi_5', name: 'WellPadID', type: 'STRING', description: 'Well pad identifier' },
      { id: 'pi_6', name: 'OperationalStatus', type: 'STRING', description: 'Current operational state' },
      { id: 'pi_7', name: 'AssetName', type: 'STRING', description: 'Asset element name' },
      { id: 'pi_8', name: 'Timestamp', type: 'DATETIME', description: 'Data timestamp' }
    ]
  },
  {
    id: 'sap-erp',
    name: 'SAP ERP',
    type: 'SOAP/REST',
    status: 'connected',
    columns: [
      { id: 'sap_1', name: 'ProductionRate', type: 'FLOAT', description: 'Production rate per hour' },
      { id: 'sap_2', name: 'Efficiency', type: 'FLOAT', description: 'Overall equipment efficiency %' },
      { id: 'sap_3', name: 'DowntimeMinutes', type: 'INTEGER', description: 'Total downtime in minutes' },
      { id: 'sap_4', name: 'QualityScore', type: 'FLOAT', description: 'Quality assessment score' },
      { id: 'sap_5', name: 'OrderNumber', type: 'STRING', description: 'Production order number' },
      { id: 'sap_6', name: 'MaterialCode', type: 'STRING', description: 'Material/product code' },
      { id: 'sap_7', name: 'PlantCode', type: 'STRING', description: 'Manufacturing plant code' },
      { id: 'sap_8', name: 'LastUpdated', type: 'DATETIME', description: 'Last data update' }
    ]
  },
  {
    id: 'salesforce-crm',
    name: 'Salesforce CRM',
    type: 'REST API',
    status: 'connected',
    columns: [
      { id: 'sf_1', name: 'AccountName', type: 'STRING', description: 'Customer account name' },
      { id: 'sf_2', name: 'Revenue', type: 'CURRENCY', description: 'Account annual revenue' },
      { id: 'sf_3', name: 'Industry', type: 'STRING', description: 'Customer industry sector' },
      { id: 'sf_4', name: 'ContactCount', type: 'INTEGER', description: 'Number of contacts' },
      { id: 'sf_5', name: 'OpportunityStage', type: 'STRING', description: 'Sales opportunity stage' },
      { id: 'sf_6', name: 'CloseDate', type: 'DATE', description: 'Expected close date' },
      { id: 'sf_7', name: 'Territory', type: 'STRING', description: 'Sales territory' },
      { id: 'sf_8', name: 'CreatedDate', type: 'DATETIME', description: 'Record creation date' }
    ]
  }
];

export default function CreateViewEditor({ onBack }: CreateViewEditorProps) {
  const [viewName, setViewName] = useState('');
  const [viewDescription, setViewDescription] = useState('');
  const [viewType, setViewType] = useState<'asset' | 'event' | 'streaming'>('asset');
  const [selectedDataSource, setSelectedDataSource] = useState('');
  const [viewBlocks, setViewBlocks] = useState<ViewBlock[]>([]);
  const [draggedColumn, setDraggedColumn] = useState<DataColumn | null>(null);
  const [nextBlockId, setNextBlockId] = useState(1);
  
  const { toast } = useToast();
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (column: any, dataSource: any) => {
    const dataColumn: DataColumn = {
      id: column.id,
      name: column.name,
      type: column.type,
      description: column.description,
      dataSource: dataSource.id,
      dataSourceName: dataSource.name
    };
    setDraggedColumn(dataColumn);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedColumn || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newBlock: ViewBlock = {
      id: `block_${nextBlockId}`,
      type: 'table',
      title: `${draggedColumn.dataSourceName} - ${draggedColumn.name}`,
      dataColumns: [draggedColumn],
      position: { x: Math.max(0, x - 150), y: Math.max(0, y - 50) },
      size: { width: 300, height: 200 },
      config: {}
    };

    setViewBlocks(prev => [...prev, newBlock]);
    setNextBlockId(prev => prev + 1);
    setDraggedColumn(null);
  };

  const removeBlock = (blockId: string) => {
    setViewBlocks(prev => prev.filter(block => block.id !== blockId));
  };

  const addColumnToBlock = (blockId: string, column: DataColumn) => {
    setViewBlocks(prev => 
      prev.map(block => 
        block.id === blockId 
          ? { ...block, dataColumns: [...block.dataColumns, column] }
          : block
      )
    );
  };

  const changeBlockType = (blockId: string, newType: 'table' | 'chart' | 'metric' | 'filter') => {
    setViewBlocks(prev => 
      prev.map(block => 
        block.id === blockId 
          ? { ...block, type: newType }
          : block
      )
    );
  };

  const getBlockIcon = (type: string) => {
    switch (type) {
      case 'table': return <Table className="h-4 w-4" />;
      case 'chart': return <BarChart3 className="h-4 w-4" />;
      case 'metric': return <Activity className="h-4 w-4" />;
      case 'filter': return <Filter className="h-4 w-4" />;
      default: return <Layers className="h-4 w-4" />;
    }
  };

  const getDataSourceIcon = (sourceId: string) => {
    switch (sourceId) {
      case 'aveva-pi': return '📊';
      case 'sap-erp': return '🏭';
      case 'salesforce-crm': return '👥';
      default: return '📁';
    }
  };

  const handleSaveView = () => {
    if (!viewName.trim()) {
      toast({ title: "Error", description: "Please enter a view name", variant: "destructive" });
      return;
    }

    if (viewBlocks.length === 0) {
      toast({ title: "Error", description: "Please add at least one data block", variant: "destructive" });
      return;
    }

    toast({ title: "Success", description: "View created successfully" });
    onBack();
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={onBack} data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Automation
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Create View</h1>
              <p className="text-sm text-gray-600">Design your data visualization and automation view</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" data-testid="button-preview">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button onClick={handleSaveView} data-testid="button-save-view">
              <Save className="h-4 w-4 mr-2" />
              Save View
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Configuration */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-medium text-gray-900 mb-3">View Configuration</h3>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="view-name">View Name</Label>
                <Input
                  id="view-name"
                  value={viewName}
                  onChange={(e) => setViewName(e.target.value)}
                  placeholder="Enter view name"
                  data-testid="input-view-name"
                />
              </div>
              
              <div>
                <Label htmlFor="view-description">Description</Label>
                <Input
                  id="view-description"
                  value={viewDescription}
                  onChange={(e) => setViewDescription(e.target.value)}
                  placeholder="Brief description"
                  data-testid="input-view-description"
                />
              </div>
              
              <div>
                <Label htmlFor="view-type">View Type</Label>
                <Select value={viewType} onValueChange={(value: 'asset' | 'event' | 'streaming') => setViewType(value)}>
                  <SelectTrigger data-testid="select-view-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asset">Asset View</SelectItem>
                    <SelectItem value="event">Event View</SelectItem>
                    <SelectItem value="streaming">Streaming View</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Data Sources */}
          <div className="flex-1 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-medium text-gray-900">Connected Data Sources</h3>
              <p className="text-xs text-gray-600 mt-1">Drag columns to the canvas to create blocks</p>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {availableDataSources.map((dataSource) => (
                  <Card key={dataSource.id} className="border border-gray-200">
                    <CardHeader className="pb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getDataSourceIcon(dataSource.id)}</span>
                        <div className="flex-1">
                          <CardTitle className="text-sm">{dataSource.name}</CardTitle>
                          <p className="text-xs text-gray-600">{dataSource.type}</p>
                        </div>
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          {dataSource.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      <div className="space-y-1">
                        {dataSource.columns.map((column) => (
                          <div
                            key={column.id}
                            draggable
                            onDragStart={() => handleDragStart(column, dataSource)}
                            className="flex items-center space-x-2 p-2 bg-gray-50 rounded cursor-move hover:bg-gray-100 transition-colors"
                            data-testid={`column-${column.id}`}
                          >
                            <GripVertical className="h-3 w-3 text-gray-400" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-900 truncate">{column.name}</p>
                              <p className="text-xs text-gray-600">{column.type}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 bg-white border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">View Canvas</h3>
                <p className="text-sm text-gray-600">Drop data columns here to create visualization blocks</p>
              </div>
              <div className="text-sm text-gray-600">
                Blocks: {viewBlocks.length}
              </div>
            </div>
          </div>

          <div
            ref={canvasRef}
            className="flex-1 relative bg-gray-50 overflow-auto"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            data-testid="canvas-area"
          >
            {viewBlocks.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Layers className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">Drop data columns here to start building</p>
                  <p className="text-sm text-gray-500 mt-1">Drag columns from the left panel to create visualization blocks</p>
                </div>
              </div>
            ) : (
              viewBlocks.map((block) => (
                <div
                  key={block.id}
                  className="absolute bg-white border border-gray-200 rounded-lg shadow-sm"
                  style={{
                    left: block.position.x,
                    top: block.position.y,
                    width: block.size.width,
                    height: block.size.height
                  }}
                  data-testid={`block-${block.id}`}
                >
                  <div className="flex items-center justify-between p-3 border-b border-gray-200">
                    <div className="flex items-center space-x-2">
                      {getBlockIcon(block.type)}
                      <span className="text-sm font-medium truncate">{block.title}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Select value={block.type} onValueChange={(value: any) => changeBlockType(block.id, value)}>
                        <SelectTrigger className="w-20 h-6 text-xs" data-testid={`select-block-type-${block.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="table">Table</SelectItem>
                          <SelectItem value="chart">Chart</SelectItem>
                          <SelectItem value="metric">Metric</SelectItem>
                          <SelectItem value="filter">Filter</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeBlock(block.id)}
                        className="h-6 w-6 p-0"
                        data-testid={`button-remove-${block.id}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="p-3">
                    <div className="space-y-2">
                      {block.dataColumns.map((column, index) => (
                        <div key={index} className="flex items-center space-x-2 text-xs">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="font-medium">{column.name}</span>
                          <span className="text-gray-500">({column.type})</span>
                        </div>
                      ))}
                      
                      {block.type === 'chart' && (
                        <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-800">
                          📈 Chart visualization will be rendered here
                        </div>
                      )}
                      
                      {block.type === 'metric' && (
                        <div className="mt-3 p-2 bg-green-50 rounded text-xs text-green-800">
                          📊 Key metrics will be displayed here
                        </div>
                      )}
                      
                      {block.type === 'filter' && (
                        <div className="mt-3 p-2 bg-purple-50 rounded text-xs text-purple-800">
                          🔍 Filter controls will be placed here
                        </div>
                      )}
                      
                      {block.type === 'table' && block.dataColumns.length > 0 && (
                        <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-700">
                          📋 Data table with {block.dataColumns.length} column(s)
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}