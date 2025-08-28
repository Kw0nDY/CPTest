import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Zap, Play, Pause, Clock, Activity, BarChart3, Layers } from 'lucide-react';
import type { User } from '../components/layout/header';

interface AssignedView {
  id: string;
  name: string;
  description: string;
  type: 'asset' | 'event' | 'streaming';
  status: 'active' | 'paused' | 'draft';
  assignedTo: string[]; // user IDs
  assignedDepartments: string[];
  lastUpdated: string;
  createdBy: string;
  runMode: 'once' | 'continuous' | 'scheduled';
}

interface AssignedAutomation {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'draft';
  assignedTo: string[];
  assignedDepartments: string[];
  lastRun?: string;
  nextRun?: string;
  successRate: number;
}

// Sample data - would come from API based on user assignments
const sampleViews: AssignedView[] = [
  {
    id: '1',
    name: 'Drilling Operations Monitor',
    description: 'Real-time monitoring of drilling operations with automated alerts',
    type: 'asset',
    status: 'active',
    assignedTo: ['mike', 'david'],
    assignedDepartments: ['IT Department'],
    lastUpdated: '2025-01-15T09:19:00Z',
    createdBy: 'admin',
    runMode: 'continuous'
  },
  {
    id: '2',
    name: 'Production Performance Dashboard',
    description: 'Asset performance tracking with automated reporting',
    type: 'asset',
    status: 'active',
    assignedTo: ['mike'],
    assignedDepartments: ['Operations'],
    lastUpdated: '2025-01-15T08:00:00Z',
    createdBy: 'admin',
    runMode: 'scheduled'
  },
  {
    id: '3',
    name: 'Financial Reports Overview',
    description: 'Daily financial performance metrics and KPI tracking',
    type: 'asset',
    status: 'active',
    assignedTo: ['lisa'],
    assignedDepartments: ['Finance'],
    lastUpdated: '2025-01-14T16:00:00Z',
    createdBy: 'admin',
    runMode: 'scheduled'
  }
];

const sampleAutomations: AssignedAutomation[] = [
  {
    id: '1',
    name: 'Alert Management System',
    description: 'Automated alert processing and escalation',
    status: 'active',
    assignedTo: ['mike', 'sarah'],
    assignedDepartments: ['IT Department', 'Operations'],
    lastRun: '2025-01-15T14:30:00Z',
    nextRun: '2025-01-15T15:30:00Z',
    successRate: 98.5
  },
  {
    id: '2',
    name: 'Financial Data Sync',
    description: 'Automated synchronization of financial data sources',
    status: 'active',
    assignedTo: ['lisa'],
    assignedDepartments: ['Finance'],
    lastRun: '2025-01-15T08:00:00Z',
    nextRun: '2025-01-16T08:00:00Z',
    successRate: 99.2
  }
];

interface MainMenuPageProps {
  currentUser: User;
}

export default function MainMenuPage({ currentUser }: MainMenuPageProps) {
  const [assignedViews, setAssignedViews] = useState<AssignedView[]>([]);
  const [assignedAutomations, setAssignedAutomations] = useState<AssignedAutomation[]>([]);

  useEffect(() => {
    // Filter views and automations based on current user
    const userViews = sampleViews.filter(view => 
      view.assignedTo.includes(currentUser.id) || 
      view.assignedDepartments.includes(currentUser.department)
    );
    
    const userAutomations = sampleAutomations.filter(automation => 
      automation.assignedTo.includes(currentUser.id) || 
      automation.assignedDepartments.includes(currentUser.department)
    );

    setAssignedViews(userViews);
    setAssignedAutomations(userAutomations);
  }, [currentUser]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'asset': return <BarChart3 className="h-4 w-4" />;
      case 'event': return <Zap className="h-4 w-4" />;
      case 'streaming': return <Activity className="h-4 w-4" />;
      default: return <Layers className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRunModeIcon = (mode: string) => {
    switch (mode) {
      case 'once': return <Play className="h-4 w-4" />;
      case 'continuous': return <Activity className="h-4 w-4" />;
      case 'scheduled': return <Clock className="h-4 w-4" />;
      default: return <Eye className="h-4 w-4" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {currentUser.name}
        </h1>
        <p className="text-gray-600 mt-1">
          Your personalized dashboard showing assigned views and automations
        </p>
        <div className="mt-2 flex items-center space-x-2">
          <Badge className="bg-blue-100 text-blue-800">
            {currentUser.department}
          </Badge>
          <Badge className={currentUser.role === 'admin' ? 'bg-red-100 text-red-800' : 
                           currentUser.role === 'manager' ? 'bg-blue-100 text-blue-800' : 
                           'bg-green-100 text-green-800'}>
            {currentUser.role.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Assigned Views Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Your Assigned Views</h2>
          <Badge variant="outline">{assignedViews.length} views</Badge>
        </div>
        
        {assignedViews.length === 0 ? (
          <Card className="p-8 text-center">
            <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">No views assigned to you</p>
            <p className="text-sm text-gray-500 mt-1">
              Contact your administrator to get access to data views
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignedViews.map((view) => (
              <Card key={view.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      {getTypeIcon(view.type)}
                      <CardTitle className="text-base">{view.name}</CardTitle>
                    </div>
                    <Badge className={getStatusColor(view.status)}>
                      {view.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{view.description}</p>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-1">
                      {getRunModeIcon(view.runMode)}
                      <span className="text-gray-600 capitalize">{view.runMode}</span>
                    </div>
                    <span className="text-gray-500">
                      Updated {new Date(view.lastUpdated).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="mt-3">
                    <Button size="sm" className="w-full" data-testid={`view-access-${view.id}`}>
                      <Eye className="h-3 w-3 mr-1" />
                      Access View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Assigned Automations Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Your Assigned Automations</h2>
          <Badge variant="outline">{assignedAutomations.length} automations</Badge>
        </div>
        
        {assignedAutomations.length === 0 ? (
          <Card className="p-8 text-center">
            <Zap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">No automations assigned to you</p>
            <p className="text-sm text-gray-500 mt-1">
              Contact your administrator to get access to automation workflows
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignedAutomations.map((automation) => (
              <Card key={automation.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <Zap className="h-4 w-4" />
                      <CardTitle className="text-base">{automation.name}</CardTitle>
                    </div>
                    <Badge className={getStatusColor(automation.status)}>
                      {automation.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{automation.description}</p>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Success Rate:</span>
                      <span className="font-medium text-green-600">{automation.successRate}%</span>
                    </div>
                    {automation.lastRun && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Last Run:</span>
                        <span className="text-gray-900">
                          {new Date(automation.lastRun).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {automation.nextRun && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Next Run:</span>
                        <span className="text-gray-900">
                          {new Date(automation.nextRun).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-3 flex space-x-2">
                    <Button size="sm" className="flex-1" data-testid={`automation-manage-${automation.id}`}>
                      <Settings className="h-3 w-3 mr-1" />
                      Manage
                    </Button>
                    {automation.status === 'active' ? (
                      <Button size="sm" variant="outline" data-testid={`automation-pause-${automation.id}`}>
                        <Pause className="h-3 w-3" />
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" data-testid={`automation-start-${automation.id}`}>
                        <Play className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{assignedViews.length}</div>
            <div className="text-sm text-gray-600">Active Views</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{assignedAutomations.length}</div>
            <div className="text-sm text-gray-600">Automations</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {assignedAutomations.reduce((acc, auto) => acc + auto.successRate, 0) / assignedAutomations.length || 0}%
            </div>
            <div className="text-sm text-gray-600">Avg Success Rate</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{currentUser.department}</div>
            <div className="text-sm text-gray-600">Department</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}