import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Search, 
  Filter, 
  Zap, 
  Play, 
  Pause, 
  Settings, 
  Activity,
  Clock,
  FileText,
  Trash2,
  CheckCircle,
  AlertCircle,
  Database,
  BarChart3,
  RefreshCw
} from 'lucide-react';

interface AutomationWorkflow {
  id: string;
  name: string;
  description: string;
  type: 'data_sync' | 'alert_system' | 'scheduled_report' | 'data_processing';
  status: 'active' | 'paused' | 'draft' | 'error';
  triggerType: 'schedule' | 'event' | 'manual';
  schedule?: string;
  lastRun?: string;
  nextRun?: string;
  successRate: number;
  createdBy: string;
  lastUpdated: string;
  connectedSystems: string[];
  runCount: number;
}

const sampleAutomations: AutomationWorkflow[] = [
  {
    id: '1',
    name: 'Alert Management System',
    description: 'Automated alert processing and escalation workflow',
    type: 'alert_system',
    status: 'active',
    triggerType: 'event',
    lastRun: '2025-01-15T14:30:00Z',
    nextRun: '2025-01-15T15:30:00Z',
    successRate: 98.5,
    createdBy: 'admin',
    lastUpdated: '2025-01-15T10:00:00Z',
    connectedSystems: ['AVEVA PI System', 'SAP ERP'],
    runCount: 1247
  },
  {
    id: '2',
    name: 'Financial Data Sync',
    description: 'Automated synchronization of financial data between systems',
    type: 'data_sync',
    status: 'active',
    triggerType: 'schedule',
    schedule: 'Daily at 08:00',
    lastRun: '2025-01-15T08:00:00Z',
    nextRun: '2025-01-16T08:00:00Z',
    successRate: 99.2,
    createdBy: 'admin',
    lastUpdated: '2025-01-14T16:00:00Z',
    connectedSystems: ['SAP ERP', 'Salesforce CRM'],
    runCount: 45
  },
  {
    id: '3',
    name: 'Production Report Generator',
    description: 'Automated weekly production performance reports',
    type: 'scheduled_report',
    status: 'paused',
    triggerType: 'schedule',
    schedule: 'Weekly on Monday at 09:00',
    lastRun: '2025-01-08T09:00:00Z',
    nextRun: '2025-01-22T09:00:00Z',
    successRate: 95.8,
    createdBy: 'mike',
    lastUpdated: '2025-01-08T12:00:00Z',
    connectedSystems: ['AVEVA PI System'],
    runCount: 12
  },
  {
    id: '4',
    name: 'Equipment Maintenance Scheduler',
    description: 'Automated maintenance scheduling based on sensor data',
    type: 'data_processing',
    status: 'error',
    triggerType: 'event',
    lastRun: '2025-01-14T22:00:00Z',
    successRate: 87.3,
    createdBy: 'admin',
    lastUpdated: '2025-01-14T22:30:00Z',
    connectedSystems: ['AVEVA PI System', 'SAP ERP'],
    runCount: 89
  }
];

export default function AutomationListTab() {
  const [automations, setAutomations] = useState<AutomationWorkflow[]>(sampleAutomations);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  const { toast } = useToast();

  const filteredAutomations = automations.filter((automation) => {
    const matchesSearch = automation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         automation.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || automation.status === statusFilter;
    const matchesType = typeFilter === 'all' || automation.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'data_sync': return <Database className="h-4 w-4" />;
      case 'alert_system': return <AlertCircle className="h-4 w-4" />;
      case 'scheduled_report': return <FileText className="h-4 w-4" />;
      case 'data_processing': return <BarChart3 className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTriggerIcon = (trigger: string) => {
    switch (trigger) {
      case 'schedule': return <Clock className="h-4 w-4" />;
      case 'event': return <Activity className="h-4 w-4" />;
      case 'manual': return <Play className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  const handleCreateAutomation = () => {
    toast({ 
      title: "Automation Created", 
      description: "New automation workflow has been created successfully." 
    });
    setShowCreateDialog(false);
  };

  const toggleAutomationStatus = (id: string) => {
    setAutomations(prev => prev.map(automation => {
      if (automation.id === id) {
        const newStatus = automation.status === 'active' ? 'paused' : 'active';
        toast({
          title: `Automation ${newStatus === 'active' ? 'Started' : 'Paused'}`,
          description: `${automation.name} has been ${newStatus === 'active' ? 'started' : 'paused'}.`
        });
        return { ...automation, status: newStatus as any };
      }
      return automation;
    }));
  };

  const runAutomation = (id: string) => {
    const automation = automations.find(a => a.id === id);
    if (automation) {
      toast({
        title: "Automation Started",
        description: `${automation.name} is now running manually.`
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Automation Workflows</h1>
          <p className="text-gray-600 mt-1">Create and manage automated business processes</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-automation">
              <Plus className="h-4 w-4 mr-2" />
              Create Automation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Automation</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="automation-name">Automation Name</Label>
                <Input id="automation-name" placeholder="Enter automation name" data-testid="input-automation-name" />
              </div>
              
              <div>
                <Label htmlFor="automation-description">Description</Label>
                <Textarea id="automation-description" placeholder="Describe what this automation does" data-testid="textarea-automation-description" />
              </div>
              
              <div>
                <Label>Automation Type</Label>
                <Select>
                  <SelectTrigger data-testid="select-automation-type">
                    <SelectValue placeholder="Select automation type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="data_sync">Data Synchronization</SelectItem>
                    <SelectItem value="alert_system">Alert System</SelectItem>
                    <SelectItem value="scheduled_report">Scheduled Report</SelectItem>
                    <SelectItem value="data_processing">Data Processing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Trigger Type</Label>
                <Select>
                  <SelectTrigger data-testid="select-trigger-type">
                    <SelectValue placeholder="Select trigger type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="schedule">Schedule</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateAutomation} data-testid="button-save-automation">
                  Create Automation
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search automations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-automations"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40" data-testid="select-status-filter">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40" data-testid="select-type-filter">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="data_sync">Data Sync</SelectItem>
            <SelectItem value="alert_system">Alert System</SelectItem>
            <SelectItem value="scheduled_report">Scheduled Report</SelectItem>
            <SelectItem value="data_processing">Data Processing</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{automations.length}</div>
            <div className="text-sm text-gray-600">Total Automations</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {automations.filter(a => a.status === 'active').length}
            </div>
            <div className="text-sm text-gray-600">Active</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {automations.filter(a => a.status === 'paused').length}
            </div>
            <div className="text-sm text-gray-600">Paused</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {Math.round(automations.reduce((acc, auto) => acc + auto.successRate, 0) / automations.length)}%
            </div>
            <div className="text-sm text-gray-600">Avg Success Rate</div>
          </CardContent>
        </Card>
      </div>

      {/* Automations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAutomations.map((automation) => (
          <Card key={automation.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  {getTypeIcon(automation.type)}
                  <CardTitle className="text-base">{automation.name}</CardTitle>
                </div>
                <Badge className={getStatusColor(automation.status)}>
                  {automation.status}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">{automation.description}</p>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <div className="flex items-center space-x-1">
                    {getTypeIcon(automation.type)}
                    <span className="capitalize">{automation.type.replace('_', ' ')}</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Trigger:</span>
                  <div className="flex items-center space-x-1">
                    {getTriggerIcon(automation.triggerType)}
                    <span className="capitalize">{automation.triggerType}</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Success Rate:</span>
                  <span className="font-medium text-green-600">{automation.successRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Run Count:</span>
                  <span className="font-medium">{automation.runCount}</span>
                </div>
                {automation.lastRun && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Run:</span>
                    <span>{new Date(automation.lastRun).toLocaleDateString()}</span>
                  </div>
                )}
                {automation.nextRun && automation.status === 'active' && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Next Run:</span>
                    <span>{new Date(automation.nextRun).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
              
              <div className="border-t pt-3">
                <div className="text-xs text-gray-600 mb-2">Connected Systems:</div>
                <div className="flex flex-wrap gap-1">
                  {automation.connectedSystems.map((system, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {system}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="flex space-x-2 pt-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => runAutomation(automation.id)}
                  disabled={automation.status === 'error'}
                  data-testid={`button-run-${automation.id}`}
                >
                  <Play className="h-3 w-3 mr-1" />
                  Run
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => toggleAutomationStatus(automation.id)}
                  data-testid={`button-toggle-${automation.id}`}
                >
                  {automation.status === 'active' ? (
                    <>
                      <Pause className="h-3 w-3 mr-1" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3 mr-1" />
                      Start
                    </>
                  )}
                </Button>
                <Button size="sm" variant="outline" data-testid={`button-settings-${automation.id}`}>
                  <Settings className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAutomations.length === 0 && (
        <div className="text-center py-12">
          <Filter className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">No automations found</p>
          <p className="text-sm text-gray-500 mt-1">
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}
    </div>
  );
}