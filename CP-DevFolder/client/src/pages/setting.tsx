import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Users, 
  Eye, 
  Zap, 
  Settings,
  Trash2,
  Edit,
  UserPlus,
  Building,
  Shield
} from 'lucide-react';
import type { User } from '../components/layout/header';
import { availableUsers } from '../components/layout/header';

interface ViewAssignment {
  id: string;
  viewId: string;
  viewName: string;
  viewType: 'asset' | 'event' | 'streaming';
  assignedUsers: string[];
  assignedDepartments: string[];
  createdAt: string;
  createdBy: string;
}

interface AutomationAssignment {
  id: string;
  automationId: string;
  automationName: string;
  assignedUsers: string[];
  assignedDepartments: string[];
  createdAt: string;
  createdBy: string;
}

// Sample data for assignments
const sampleViewAssignments: ViewAssignment[] = [
  {
    id: '1',
    viewId: 'view_1',
    viewName: 'Drilling Operations Monitor',
    viewType: 'asset',
    assignedUsers: ['mike', 'david'],
    assignedDepartments: ['IT Department'],
    createdAt: '2025-01-15T09:00:00Z',
    createdBy: 'admin'
  },
  {
    id: '2',
    viewId: 'view_2',
    viewName: 'Production Performance Dashboard',
    viewType: 'asset',
    assignedUsers: ['mike'],
    assignedDepartments: ['Operations'],
    createdAt: '2025-01-14T10:00:00Z',
    createdBy: 'admin'
  },
  {
    id: '3',
    viewId: 'view_3',
    viewName: 'Financial Reports Overview',
    viewType: 'asset',
    assignedUsers: ['lisa'],
    assignedDepartments: ['Finance'],
    createdAt: '2025-01-13T08:00:00Z',
    createdBy: 'admin'
  }
];

const sampleAutomationAssignments: AutomationAssignment[] = [
  {
    id: '1',
    automationId: 'auto_1',
    automationName: 'Alert Management System',
    assignedUsers: ['mike', 'sarah'],
    assignedDepartments: ['IT Department', 'Operations'],
    createdAt: '2025-01-15T11:00:00Z',
    createdBy: 'admin'
  },
  {
    id: '2',
    automationId: 'auto_2',
    automationName: 'Financial Data Sync',
    assignedUsers: ['lisa'],
    assignedDepartments: ['Finance'],
    createdAt: '2025-01-14T09:00:00Z',
    createdBy: 'admin'
  }
];

const departments = ['IT Department', 'Operations', 'Finance', 'Engineering', 'Sales', 'Marketing'];

interface SettingPageProps {
  currentUser: User;
}

export default function SettingPage({ currentUser }: SettingPageProps) {
  const [viewAssignments, setViewAssignments] = useState<ViewAssignment[]>(sampleViewAssignments);
  const [automationAssignments, setAutomationAssignments] = useState<AutomationAssignment[]>(sampleAutomationAssignments);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assignmentType, setAssignmentType] = useState<'view' | 'automation'>('view');
  
  const { toast } = useToast();

  const getUserName = (userId: string) => {
    const user = availableUsers.find(u => u.id === userId);
    return user ? user.name : userId;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'asset': return <Eye className="h-4 w-4" />;
      case 'event': return <Zap className="h-4 w-4" />;
      case 'streaming': return <Settings className="h-4 w-4" />;
      default: return <Eye className="h-4 w-4" />;
    }
  };

  const handleCreateAssignment = () => {
    toast({ 
      title: "Assignment Created", 
      description: `${assignmentType === 'view' ? 'View' : 'Automation'} assignment created successfully.` 
    });
    setShowAssignDialog(false);
  };

  const removeAssignment = (id: string, type: 'view' | 'automation') => {
    if (type === 'view') {
      setViewAssignments(prev => prev.filter(assignment => assignment.id !== id));
    } else {
      setAutomationAssignments(prev => prev.filter(assignment => assignment.id !== id));
    }
    toast({ title: "Assignment Removed", description: "Assignment has been removed successfully." });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assignment Settings</h1>
          <p className="text-gray-600 mt-1">Assign views and automations to users and departments</p>
        </div>
        <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-assignment">
              <Plus className="h-4 w-4 mr-2" />
              Create Assignment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Assignment</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label>Assignment Type</Label>
                <Select value={assignmentType} onValueChange={(value: 'view' | 'automation') => setAssignmentType(value)}>
                  <SelectTrigger data-testid="select-assignment-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">View Assignment</SelectItem>
                    <SelectItem value="automation">Automation Assignment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Select {assignmentType === 'view' ? 'View' : 'Automation'}</Label>
                <Select>
                  <SelectTrigger data-testid="select-target">
                    <SelectValue placeholder={`Choose a ${assignmentType}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {assignmentType === 'view' ? (
                      <>
                        <SelectItem value="view_1">Drilling Operations Monitor</SelectItem>
                        <SelectItem value="view_2">Production Performance Dashboard</SelectItem>
                        <SelectItem value="view_3">Equipment Maintenance Events</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="auto_1">Alert Management System</SelectItem>
                        <SelectItem value="auto_2">Financial Data Sync</SelectItem>
                        <SelectItem value="auto_3">Maintenance Scheduler</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Assign to Users</Label>
                <Select>
                  <SelectTrigger data-testid="select-users">
                    <SelectValue placeholder="Select users" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.department})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Assign to Departments</Label>
                <Select>
                  <SelectTrigger data-testid="select-departments">
                    <SelectValue placeholder="Select departments" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateAssignment} data-testid="button-save-assignment">
                  Create Assignment
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="views" className="space-y-4">
        <TabsList>
          <TabsTrigger value="views" data-testid="tab-view-assignments">
            View Assignments ({viewAssignments.length})
          </TabsTrigger>
          <TabsTrigger value="automations" data-testid="tab-automation-assignments">
            Automation Assignments ({automationAssignments.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="views" className="space-y-4">
          <div className="grid gap-4">
            {viewAssignments.map((assignment) => (
              <Card key={assignment.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getTypeIcon(assignment.viewType)}
                      <div>
                        <CardTitle className="text-lg">{assignment.viewName}</CardTitle>
                        <p className="text-sm text-gray-600 capitalize">{assignment.viewType} View</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline" data-testid={`button-edit-${assignment.id}`}>
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => removeAssignment(assignment.id, 'view')}
                        data-testid={`button-remove-${assignment.id}`}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Assigned Users</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {assignment.assignedUsers.length > 0 ? (
                        assignment.assignedUsers.map((userId) => (
                          <Badge key={userId} variant="outline" className="flex items-center space-x-1">
                            <UserPlus className="h-3 w-3" />
                            <span>{getUserName(userId)}</span>
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500">No users assigned</span>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <Building className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Assigned Departments</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {assignment.assignedDepartments.length > 0 ? (
                        assignment.assignedDepartments.map((dept) => (
                          <Badge key={dept} variant="outline" className="flex items-center space-x-1">
                            <Building className="h-3 w-3" />
                            <span>{dept}</span>
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500">No departments assigned</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500 pt-2 border-t">
                    Created by {getUserName(assignment.createdBy)} on {new Date(assignment.createdAt).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="automations" className="space-y-4">
          <div className="grid gap-4">
            {automationAssignments.map((assignment) => (
              <Card key={assignment.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Zap className="h-5 w-5 text-blue-600" />
                      <div>
                        <CardTitle className="text-lg">{assignment.automationName}</CardTitle>
                        <p className="text-sm text-gray-600">Automation Workflow</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline" data-testid={`button-edit-auto-${assignment.id}`}>
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => removeAssignment(assignment.id, 'automation')}
                        data-testid={`button-remove-auto-${assignment.id}`}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Assigned Users</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {assignment.assignedUsers.length > 0 ? (
                        assignment.assignedUsers.map((userId) => (
                          <Badge key={userId} variant="outline" className="flex items-center space-x-1">
                            <UserPlus className="h-3 w-3" />
                            <span>{getUserName(userId)}</span>
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500">No users assigned</span>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <Building className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Assigned Departments</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {assignment.assignedDepartments.length > 0 ? (
                        assignment.assignedDepartments.map((dept) => (
                          <Badge key={dept} variant="outline" className="flex items-center space-x-1">
                            <Building className="h-3 w-3" />
                            <span>{dept}</span>
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500">No departments assigned</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500 pt-2 border-t">
                    Created by {getUserName(assignment.createdBy)} on {new Date(assignment.createdAt).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}