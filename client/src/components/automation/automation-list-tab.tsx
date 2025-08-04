import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
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
  MoreVertical
} from 'lucide-react';

interface Automation {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'draft';
  trigger: {
    type: 'schedule' | 'webhook' | 'manual' | 'data_change';
    config: any;
  };
  actions: Array<{
    id: string;
    type: string;
    name: string;
    config: any;
  }>;
  lastRun?: string;
  nextRun?: string;
  runCount: number;
  successRate: number;
  createdAt: string;
}

const sampleAutomations: Automation[] = [
  {
    id: '1',
    name: 'Daily Sales Report',
    description: 'Generate and send daily sales report to management',
    status: 'active',
    trigger: {
      type: 'schedule',
      config: { cron: '0 9 * * *', timezone: 'UTC' }
    },
    actions: [
      { id: '1', type: 'data_extract', name: 'Extract Sales Data', config: {} },
      { id: '2', type: 'data_transform', name: 'Calculate Metrics', config: {} },
      { id: '3', type: 'send_email', name: 'Send Report', config: {} }
    ],
    lastRun: '2024-01-15T09:00:00Z',
    nextRun: '2024-01-16T09:00:00Z',
    runCount: 145,
    successRate: 98.6,
    createdAt: '2023-12-01T00:00:00Z'
  },
  {
    id: '2',
    name: 'Customer Data Sync',
    description: 'Sync customer data between CRM and ERP systems',
    status: 'active',
    trigger: {
      type: 'data_change',
      config: { source: 'salesforce', table: 'accounts' }
    },
    actions: [
      { id: '1', type: 'data_validate', name: 'Validate Customer Data', config: {} },
      { id: '2', type: 'data_sync', name: 'Sync to ERP', config: {} },
      { id: '3', type: 'notification', name: 'Notify Admin', config: {} }
    ],
    lastRun: '2024-01-15T14:30:00Z',
    runCount: 892,
    successRate: 99.2,
    createdAt: '2023-11-15T00:00:00Z'
  },
  {
    id: '3',
    name: 'Quality Alert Processing',
    description: 'Process quality alerts and create tickets',
    status: 'paused',
    trigger: {
      type: 'webhook',
      config: { endpoint: '/webhook/quality-alert' }
    },
    actions: [
      { id: '1', type: 'data_parse', name: 'Parse Alert Data', config: {} },
      { id: '2', type: 'create_ticket', name: 'Create JIRA Ticket', config: {} },
      { id: '3', type: 'send_notification', name: 'Alert Team', config: {} }
    ],
    lastRun: '2024-01-14T16:45:00Z',
    runCount: 67,
    successRate: 94.1,
    createdAt: '2024-01-01T00:00:00Z'
  }
];

export default function AutomationListTab() {
  const [selectedAutomation, setSelectedAutomation] = useState<Automation | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { toast } = useToast();

  const { data: automations = sampleAutomations } = useQuery({
    queryKey: ['/api/automations'],
    queryFn: () => Promise.resolve(sampleAutomations), // Mock data for now
  });

  const toggleAutomationMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'start' | 'pause' }) => {
      return apiRequest(`/api/automations/${id}/${action}`, 'POST');
    },
    onSuccess: (data, variables) => {
      toast({ 
        title: "Success", 
        description: `Automation ${variables.action === 'start' ? 'started' : 'paused'} successfully.` 
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'bg-green-100 text-green-800',
      paused: 'bg-yellow-100 text-yellow-800',
      draft: 'bg-gray-100 text-gray-800'
    };
    return variants[status as keyof typeof variants] || variants.draft;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'paused':
        return <Pause className="w-4 h-4 text-yellow-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTriggerLabel = (trigger: Automation['trigger']) => {
    switch (trigger.type) {
      case 'schedule':
        return 'Scheduled';
      case 'webhook':
        return 'Webhook';
      case 'data_change':
        return 'Data Change';
      case 'manual':
        return 'Manual';
      default:
        return 'Unknown';
    }
  };

  const handleViewDetails = (automation: Automation) => {
    setSelectedAutomation(automation);
    setShowDetailDialog(true);
  };

  const handleToggleAutomation = (automation: Automation) => {
    const action = automation.status === 'active' ? 'pause' : 'start';
    toggleAutomationMutation.mutate({ id: automation.id, action });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Automation List</h1>
          <p className="text-gray-600">Manage and monitor your automated workflows</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Automation
        </Button>
      </div>

      {/* Automation Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {automations.map((automation) => (
          <Card key={automation.id} className="border border-gray-200 hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(automation.status)}
                  <CardTitle className="text-lg">{automation.name}</CardTitle>
                </div>
                <Badge className={getStatusBadge(automation.status)}>
                  {automation.status}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">{automation.description}</p>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Trigger Info */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Trigger:</span>
                <Badge variant="outline">{getTriggerLabel(automation.trigger)}</Badge>
              </div>

              {/* Actions Count */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Actions:</span>
                <span className="font-medium">{automation.actions.length} steps</span>
              </div>

              {/* Performance Metrics */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Success Rate:</span>
                  <div className="font-medium text-green-600">{automation.successRate}%</div>
                </div>
                <div>
                  <span className="text-gray-600">Total Runs:</span>
                  <div className="font-medium">{automation.runCount}</div>
                </div>
              </div>

              {/* Last/Next Run */}
              {automation.lastRun && (
                <div className="text-sm">
                  <span className="text-gray-600">Last Run:</span>
                  <div className="font-medium">
                    {new Date(automation.lastRun).toLocaleDateString()} at{' '}
                    {new Date(automation.lastRun).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )}

              {automation.nextRun && automation.status === 'active' && (
                <div className="text-sm">
                  <span className="text-gray-600">Next Run:</span>
                  <div className="font-medium text-blue-600">
                    {new Date(automation.nextRun).toLocaleDateString()} at{' '}
                    {new Date(automation.nextRun).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewDetails(automation)}
                  className="flex-1"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View
                </Button>
                <Button
                  variant={automation.status === 'active' ? 'outline' : 'default'}
                  size="sm"
                  onClick={() => handleToggleAutomation(automation)}
                  className="flex-1"
                >
                  {automation.status === 'active' ? (
                    <>
                      <Pause className="w-4 h-4 mr-1" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-1" />
                      Start
                    </>
                  )}
                </Button>
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedAutomation && getStatusIcon(selectedAutomation.status)}
              {selectedAutomation?.name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedAutomation && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Status</h4>
                  <Badge className={getStatusBadge(selectedAutomation.status)}>
                    {selectedAutomation.status}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Trigger Type</h4>
                  <Badge variant="outline">{getTriggerLabel(selectedAutomation.trigger)}</Badge>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                <p className="text-gray-600">{selectedAutomation.description}</p>
              </div>

              {/* Workflow Steps */}
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Workflow Steps</h4>
                <div className="space-y-3">
                  {selectedAutomation.actions.map((action, index) => (
                    <div key={action.id} className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{action.name}</div>
                        <div className="text-sm text-gray-600">{action.type.replace('_', ' ')}</div>
                      </div>
                      {index < selectedAutomation.actions.length - 1 && (
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Performance Metrics */}
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Performance Metrics</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-800">{selectedAutomation.successRate}%</div>
                    <div className="text-sm text-green-600">Success Rate</div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-800">{selectedAutomation.runCount}</div>
                    <div className="text-sm text-blue-600">Total Runs</div>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-purple-800">
                      {Math.floor(Math.random() * 300) + 100}ms
                    </div>
                    <div className="text-sm text-purple-600">Avg Runtime</div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={() => handleToggleAutomation(selectedAutomation)}
                  className="flex-1"
                >
                  {selectedAutomation.status === 'active' ? (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Pause Automation
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Start Automation
                    </>
                  )}
                </Button>
                <Button variant="outline" className="flex-1">
                  <Settings className="w-4 h-4 mr-2" />
                  Edit Configuration
                </Button>
                <Button variant="outline">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Dialog Placeholder */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Automation</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <Zap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Automation Builder</h3>
            <p className="text-gray-600 mb-4">Visual workflow builder will be implemented here</p>
            <Button onClick={() => setShowCreateDialog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}