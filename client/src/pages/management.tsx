import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Users, 
  Key, 
  Settings,
  Trash2,
  Edit,
  Shield,
  Building,
  Monitor,
  Activity
} from 'lucide-react';
import type { User } from '../components/layout/header';
import { availableUsers } from '../components/layout/header';

interface SystemMetric {
  id: string;
  name: string;
  value: string;
  status: 'good' | 'warning' | 'error';
  lastUpdated: string;
}

const systemMetrics: SystemMetric[] = [
  { id: '1', name: 'Active Users', value: '24', status: 'good', lastUpdated: '2025-01-15T14:30:00Z' },
  { id: '2', name: 'Data Sources', value: '8', status: 'good', lastUpdated: '2025-01-15T14:28:00Z' },
  { id: '3', name: 'Running Views', value: '12', status: 'good', lastUpdated: '2025-01-15T14:25:00Z' },
  { id: '4', name: 'Active Automations', value: '6', status: 'warning', lastUpdated: '2025-01-15T14:20:00Z' },
  { id: '5', name: 'System Load', value: '78%', status: 'warning', lastUpdated: '2025-01-15T14:30:00Z' },
  { id: '6', name: 'Storage Usage', value: '45%', status: 'good', lastUpdated: '2025-01-15T14:29:00Z' }
];

interface ManagementPageProps {
  currentUser: User;
}

export default function ManagementPage({ currentUser }: ManagementPageProps) {
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  
  const { toast } = useToast();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'user': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Management</h1>
          <p className="text-gray-600 mt-1">Manage users, API keys, and system settings</p>
        </div>
        <Badge className="bg-blue-100 text-blue-800">
          Admin Access Required
        </Badge>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {systemMetrics.map((metric) => (
          <Card key={metric.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{metric.name}</p>
                  <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                </div>
                <Badge className={getStatusColor(metric.status)}>
                  {metric.status}
                </Badge>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Updated {new Date(metric.lastUpdated).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" data-testid="tab-users">
            <Users className="h-4 w-4 mr-2" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="apikeys" data-testid="tab-apikeys">
            <Key className="h-4 w-4 mr-2" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="system" data-testid="tab-system">
            <Settings className="h-4 w-4 mr-2" />
            System Settings
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="users" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">User Accounts</h3>
            <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-user">
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input id="username" placeholder="Enter username" data-testid="input-username" />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="Enter email" data-testid="input-email" />
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <select id="role" className="w-full p-2 border rounded" data-testid="select-role">
                      <option value="user">User</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="department">Department</Label>
                    <Input id="department" placeholder="Enter department" data-testid="input-department" />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowUserDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => {
                      toast({ title: "User Added", description: "New user has been created successfully." });
                      setShowUserDialog(false);
                    }} data-testid="button-save-user">
                      Create User
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="grid gap-4">
            {availableUsers.map((user) => (
              <Card key={user.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-700 font-semibold">
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-600">{user.department}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getRoleColor(user.role)}>
                        {user.role.toUpperCase()}
                      </Badge>
                      <Button size="sm" variant="outline" data-testid={`button-edit-user-${user.id}`}>
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      {user.id !== 'admin' && (
                        <Button size="sm" variant="outline" data-testid={`button-delete-user-${user.id}`}>
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="apikeys" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">API Key Management</h3>
            <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-apikey">
                  <Plus className="h-4 w-4 mr-2" />
                  Generate API Key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Generate New API Key</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="key-name">Key Name</Label>
                    <Input id="key-name" placeholder="Enter key name" data-testid="input-key-name" />
                  </div>
                  <div>
                    <Label htmlFor="key-permissions">Permissions</Label>
                    <select id="key-permissions" className="w-full p-2 border rounded" data-testid="select-permissions">
                      <option value="read">Read Only</option>
                      <option value="write">Read & Write</option>
                      <option value="admin">Full Access</option>
                    </select>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowApiKeyDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => {
                      toast({ title: "API Key Generated", description: "New API key has been created successfully." });
                      setShowApiKeyDialog(false);
                    }} data-testid="button-generate-key">
                      Generate Key
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="grid gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">AVEVA PI System API Key</p>
                    <p className="text-sm text-gray-600">Used for PI Web API connections</p>
                    <p className="text-xs text-gray-500 mt-1">Created on 2025-01-10</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                    <Button size="sm" variant="outline">
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button size="sm" variant="outline">
                      <Trash2 className="h-3 w-3 mr-1" />
                      Revoke
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">SAP ERP Integration Key</p>
                    <p className="text-sm text-gray-600">Used for SAP system integration</p>
                    <p className="text-xs text-gray-500 mt-1">Created on 2025-01-08</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                    <Button size="sm" variant="outline">
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button size="sm" variant="outline">
                      <Trash2 className="h-3 w-3 mr-1" />
                      Revoke
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="system" className="space-y-4">
          <h3 className="text-lg font-semibold">System Configuration</h3>
          
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Monitor className="h-5 w-5" />
                  <span>System Monitoring</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Enable Real-time Monitoring</span>
                  <Button size="sm" variant="outline">Configure</Button>
                </div>
                <div className="flex items-center justify-between">
                  <span>Log Retention Period</span>
                  <span className="text-gray-600">30 days</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Alert Thresholds</span>
                  <Button size="sm" variant="outline">Set Limits</Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Performance Settings</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Data Refresh Interval</span>
                  <span className="text-gray-600">5 minutes</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Max Concurrent Users</span>
                  <span className="text-gray-600">50</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Cache Duration</span>
                  <span className="text-gray-600">1 hour</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Security Settings</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Session Timeout</span>
                  <span className="text-gray-600">8 hours</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Password Policy</span>
                  <Button size="sm" variant="outline">Configure</Button>
                </div>
                <div className="flex items-center justify-between">
                  <span>Two-Factor Authentication</span>
                  <Badge className="bg-yellow-100 text-yellow-800">Optional</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}