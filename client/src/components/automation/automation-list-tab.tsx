import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import CreateViewEditor from './create-view-editor';
import { 
  Plus, 
  Play, 
  Pause, 
  Settings, 
  Eye,
  Clock,
  Zap,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  MoreVertical,
  Database,
  BarChart3,
  Activity,
  Layers,
  Square
} from 'lucide-react';

interface AutomationView {
  id: string;
  name: string;
  description: string;
  type: 'asset' | 'event' | 'streaming';
  status: 'active' | 'paused' | 'draft' | 'publishing' | 'stopped';
  runMode: 'once' | 'continuous' | 'scheduled';
  dataSource: {
    id: string;
    name: string;
    type: string;
  };
  selectedAssets: Array<{
    path: string;
    name: string;
    type: string;
  }>;
  viewConfiguration: {
    columns: string[];
    filters: any[];
    timeRange?: string;
    interval?: string;
  };
  automationRules: Array<{
    id: string;
    trigger: string;
    condition: string;
    action: string;
    enabled: boolean;
  }>;
  lastRun?: string;
  nextRun?: string;
  runCount: number;
  successRate: number;
  createdAt: string;
}

const sampleAutomationViews: AutomationView[] = [
  {
    id: '1',
    name: 'Drilling Operations Monitor',
    description: 'Real-time monitoring of drilling operations with automated alerts',
    type: 'asset',
    status: 'publishing',
    runMode: 'continuous',
    dataSource: {
      id: 'aveva-pi',
      name: 'AVEVA PI System',
      type: 'PI Web API'
    },
    selectedAssets: [
      { path: 'PetroLux/Upstream/Conventional Oil/Fort McMurray Field/Well Pad 001', name: 'Well Pad 001', type: 'Well Pad' },
      { path: 'PetroLux/Upstream/Conventional Oil/Fort McMurray Field/Well Pad 002', name: 'Well Pad 002', type: 'Well Pad' }
    ],
    viewConfiguration: {
      columns: ['BitWeight', 'HoleDepth', 'PumpPressure', 'TopDriveRPM'],
      filters: [{ field: 'OperationalStatus', operator: 'equals', value: 'Drilling' }],
      timeRange: 'Last 24 hours',
      interval: '5 minutes'
    },
    automationRules: [
      {
        id: 'rule1',
        trigger: 'Data Value Change',
        condition: 'PumpPressure > 3500 PSI',
        action: 'Send Alert to Operations Team',
        enabled: true
      },
      {
        id: 'rule2',
        trigger: 'Asset Status Change',
        condition: 'OperationalStatus = "Emergency Stop"',
        action: 'Create Emergency Ticket',
        enabled: true
      }
    ],
    lastRun: '2025-01-15T09:19:00Z',
    runCount: 1247,
    successRate: 99.8,
    createdAt: '2025-01-10T00:00:00Z'
  },
  {
    id: '2',
    name: 'Production Performance Dashboard',
    description: 'Asset performance tracking with automated reporting',
    type: 'asset',
    status: 'active',
    runMode: 'scheduled',
    dataSource: {
      id: 'sap-erp',
      name: 'SAP ERP',
      type: 'SOAP/REST'
    },
    selectedAssets: [
      { path: 'SAP/Production/Lines/Line_A', name: 'Production Line A', type: 'Production Line' }
    ],
    viewConfiguration: {
      columns: ['ProductionRate', 'Efficiency', 'DowntimeMinutes', 'QualityScore'],
      filters: [],
      timeRange: 'Last 7 days',
      interval: '1 hour'
    },
    automationRules: [
      {
        id: 'rule3',
        trigger: 'Schedule',
        condition: 'Daily at 08:00',
        action: 'Generate Performance Report',
        enabled: true
      }
    ],
    lastRun: '2025-01-15T08:00:00Z',
    nextRun: '2025-01-16T08:00:00Z',
    runCount: 45,
    successRate: 97.8,
    createdAt: '2025-01-05T00:00:00Z'
  },
  {
    id: '3',
    name: 'Equipment Maintenance Events',
    description: 'Event-driven maintenance scheduling based on sensor data',
    type: 'event',
    status: 'active',
    runMode: 'continuous',
    dataSource: {
      id: 'aveva-pi',
      name: 'AVEVA PI System',
      type: 'PI Web API'
    },
    selectedAssets: [
      { path: 'PetroLux/Upstream/Equipment/Pumps', name: 'Pump Systems', type: 'Equipment Group' }
    ],
    viewConfiguration: {
      columns: ['EventType', 'AssetName', 'Severity', 'Timestamp'],
      filters: [{ field: 'EventType', operator: 'in', value: ['Vibration Alert', 'Temperature Warning'] }],
      interval: 'On change'
    },
    automationRules: [
      {
        id: 'rule4',
        trigger: 'Event Occurrence',
        condition: 'Severity = "High"',
        action: 'Schedule Maintenance',
        enabled: true
      }
    ],
    lastRun: '2025-01-15T14:22:00Z',
    runCount: 89,
    successRate: 94.4,
    createdAt: '2025-01-08T00:00:00Z'
  },
  {
    id: '4',
    name: 'Real-time Streaming Analytics',
    description: 'Continuous data streaming with ML-based anomaly detection',
    type: 'streaming',
    status: 'draft',
    runMode: 'continuous',
    dataSource: {
      id: 'aveva-pi',
      name: 'AVEVA PI System',
      type: 'PI Web API'
    },
    selectedAssets: [
      { path: 'PetroLux/Upstream/Sensors/Temperature', name: 'Temperature Sensors', type: 'Sensor Group' }
    ],
    viewConfiguration: {
      columns: ['SensorID', 'Value', 'Quality', 'Timestamp'],
      filters: [],
      interval: 'Real-time'
    },
    automationRules: [
      {
        id: 'rule5',
        trigger: 'ML Anomaly Detection',
        condition: 'Anomaly Score > 0.85',
        action: 'Trigger Investigation Workflow',
        enabled: false
      }
    ],
    runCount: 0,
    successRate: 0,
    createdAt: '2025-01-14T00:00:00Z'
  }
];

export default function AutomationListTab() {
  const [selectedView, setSelectedView] = useState<AutomationView | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showCreateEditor, setShowCreateEditor] = useState(false);

  const { toast } = useToast();

  const { data: automationViews = sampleAutomationViews } = useQuery({
    queryKey: ['/api/automation-views'],
    queryFn: () => Promise.resolve(sampleAutomationViews),
  });

  const toggleViewMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'start' | 'pause' | 'publish' | 'stop' }) => {
      return apiRequest(`/api/automation-views/${id}/${action}`, 'POST');
    },
    onSuccess: (data, variables) => {
      toast({ 
        title: "Success", 
        description: `View ${variables.action}ed successfully.` 
      });
    },
  });

  const handleToggleView = (view: AutomationView, action: 'start' | 'pause' | 'publish' | 'stop') => {
    toggleViewMutation.mutate({ id: view.id, action });
  };

  const handleViewDetails = (view: AutomationView) => {
    setSelectedView(view);
    setShowDetailDialog(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'publishing': return 'bg-blue-100 text-blue-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'stopped': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'asset': return <BarChart3 className="h-4 w-4" />;
      case 'event': return <Zap className="h-4 w-4" />;
      case 'streaming': return <Activity className="h-4 w-4" />;
      default: return <Layers className="h-4 w-4" />;
    }
  };

  const getRunModeIcon = (mode: string) => {
    switch (mode) {
      case 'once': return <Play className="h-4 w-4" />;
      case 'continuous': return <Activity className="h-4 w-4" />;
      case 'scheduled': return <Clock className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  const handleCreateView = () => {
    setShowCreateEditor(true);
  };

  const handleBackFromEditor = () => {
    setShowCreateEditor(false);
  };

  if (showCreateEditor) {
    return <CreateViewEditor onBack={handleBackFromEditor} />;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Automation Views</h1>
          <p className="text-gray-600 mt-1">Create and manage automated data views and workflows</p>
        </div>
        <Button onClick={handleCreateView} data-testid="button-create-view">
          <Plus className="h-4 w-4 mr-2" />
          Create View
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {automationViews.map((view: AutomationView) => (
          <Card key={view.id} className="border border-gray-200 hover:border-blue-300 transition-colors">
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
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-1">
                  <Database className="h-3 w-3 text-gray-400" />
                  <span className="text-gray-600">{view.dataSource.name}</span>
                </div>
                <div className="flex items-center space-x-1">
                  {getRunModeIcon(view.runMode)}
                  <span className="text-gray-600 capitalize">{view.runMode}</span>
                </div>
              </div>
              
              <div className="text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Assets: {view.selectedAssets.length}</span>
                  <span>Rules: {view.automationRules.length}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span>Runs: {view.runCount}</span>
                  <span>Success: {view.successRate}%</span>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleViewDetails(view)}
                  data-testid={`button-view-details-${view.id}`}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View
                </Button>
                
                {view.status === 'draft' ? (
                  <Button 
                    size="sm" 
                    onClick={() => handleToggleView(view, 'publish')}
                    data-testid={`button-publish-${view.id}`}
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Publish
                  </Button>
                ) : view.status === 'active' || view.status === 'publishing' ? (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleToggleView(view, 'pause')}
                    data-testid={`button-pause-${view.id}`}
                  >
                    <Pause className="h-3 w-3 mr-1" />
                    Pause
                  </Button>
                ) : (
                  <Button 
                    size="sm" 
                    onClick={() => handleToggleView(view, 'start')}
                    data-testid={`button-start-${view.id}`}
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Start
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>



      {/* View Details Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              {selectedView && getTypeIcon(selectedView.type)}
              <span>{selectedView?.name}</span>
              <Badge className={selectedView ? getStatusColor(selectedView.status) : ''}>
                {selectedView?.status}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              {selectedView?.description}
            </DialogDescription>
          </DialogHeader>
          
          {selectedView && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Data Source</h4>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium">{selectedView.dataSource.name}</p>
                    <p className="text-xs text-gray-600">{selectedView.dataSource.type}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Run Configuration</h4>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      {getRunModeIcon(selectedView.runMode)}
                      <span className="text-sm font-medium capitalize">{selectedView.runMode}</span>
                    </div>
                    {selectedView.viewConfiguration.interval && (
                      <p className="text-xs text-gray-600 mt-1">Interval: {selectedView.viewConfiguration.interval}</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Selected Assets ({selectedView.selectedAssets.length})</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {selectedView.selectedAssets.map((asset, index) => (
                    <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                      <p className="font-medium">{asset.name}</p>
                      <p className="text-xs text-gray-600">{asset.path}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Automation Rules ({selectedView.automationRules.length})</h4>
                <div className="space-y-2">
                  {selectedView.automationRules.map((rule, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{rule.trigger}</span>
                        <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                          {rule.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        <strong>Condition:</strong> {rule.condition}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Action:</strong> {rule.action}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{selectedView.runCount}</p>
                  <p className="text-xs text-gray-600">Total Runs</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{selectedView.successRate}%</p>
                  <p className="text-xs text-gray-600">Success Rate</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-900">{selectedView.lastRun ? new Date(selectedView.lastRun).toLocaleString() : 'Never'}</p>
                  <p className="text-xs text-gray-600">Last Run</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-900">{selectedView.nextRun ? new Date(selectedView.nextRun).toLocaleString() : 'N/A'}</p>
                  <p className="text-xs text-gray-600">Next Run</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}