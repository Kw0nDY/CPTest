import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { 
  Key, 
  Plus, 
  Copy, 
  Trash2, 
  Eye, 
  EyeOff, 
  Calendar,
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface APIKey {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  status: 'active' | 'expired' | 'revoked';
  createdAt: string;
  expiresAt: string;
  lastUsed: string;
  usage: number;
  limit: number;
}

const mockAPIKeys: APIKey[] = [
  {
    id: '1',
    name: 'Production API Key',
    key: 'cp_prod_1234567890abcdef',
    permissions: ['read', 'write', 'delete'],
    status: 'active',
    createdAt: '2024-12-01',
    expiresAt: '2025-12-01',
    lastUsed: '2025-01-06',
    usage: 15420,
    limit: 100000
  },
  {
    id: '2',
    name: 'Development API Key',
    key: 'cp_dev_abcdef1234567890',
    permissions: ['read', 'write'],
    status: 'active',
    createdAt: '2024-11-15',
    expiresAt: '2025-11-15',
    lastUsed: '2025-01-05',
    usage: 8750,
    limit: 50000
  },
  {
    id: '3',
    name: 'Analytics Read-Only',
    key: 'cp_analytics_9876543210fedcba',
    permissions: ['read'],
    status: 'expired',
    createdAt: '2024-06-01',
    expiresAt: '2024-12-01',
    lastUsed: '2024-11-28',
    usage: 45230,
    limit: 25000
  },
  {
    id: '4',
    name: 'Integration Testing',
    key: 'cp_test_fedcba0987654321',
    permissions: ['read'],
    status: 'revoked',
    createdAt: '2024-10-01',
    expiresAt: '2025-10-01',
    lastUsed: '2024-12-15',
    usage: 2340,
    limit: 10000
  }
];

export default function APIKeyManagementPage() {
  const [apiKeys, setAPIKeys] = useState<APIKey[]>(mockAPIKeys);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [newKey, setNewKey] = useState({
    name: '',
    permissions: [] as string[],
    expiresAt: '',
    limit: 10000,
    description: ''
  });
  
  const { toast } = useToast();

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'revoked': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUsageColor = (usage: number, limit: number) => {
    const percentage = (usage / limit) * 100;
    if (percentage > 90) return 'text-red-600';
    if (percentage > 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  const toggleKeyVisibility = (keyId: string) => {
    const newVisible = new Set(visibleKeys);
    if (newVisible.has(keyId)) {
      newVisible.delete(keyId);
    } else {
      newVisible.add(keyId);
    }
    setVisibleKeys(newVisible);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "API key copied to clipboard",
    });
  };

  const generateAPIKey = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'cp_' + newKey.name.toLowerCase().replace(/\s+/g, '_') + '_';
    for (let i = 0; i < 16; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleAddAPIKey = () => {
    const apiKey: APIKey = {
      id: Date.now().toString(),
      name: newKey.name,
      key: generateAPIKey(),
      permissions: newKey.permissions,
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0],
      expiresAt: newKey.expiresAt,
      lastUsed: 'Never',
      usage: 0,
      limit: newKey.limit
    };
    
    setAPIKeys([...apiKeys, apiKey]);
    setNewKey({ name: '', permissions: [], expiresAt: '', limit: 10000, description: '' });
    setShowAddDialog(false);
    
    toast({
      title: "API Key Created",
      description: `${newKey.name} has been created successfully`,
    });
  };

  const revokeAPIKey = (keyId: string) => {
    setAPIKeys(apiKeys.map(key => 
      key.id === keyId 
        ? { ...key, status: 'revoked' as APIKey['status'] }
        : key
    ));
    
    toast({
      title: "API Key Revoked",
      description: "The API key has been revoked and is no longer valid",
    });
  };

  const deleteAPIKey = (keyId: string) => {
    setAPIKeys(apiKeys.filter(key => key.id !== keyId));
    toast({
      title: "API Key Deleted",
      description: "The API key has been permanently deleted",
    });
  };

  const togglePermission = (permission: string) => {
    const newPermissions = newKey.permissions.includes(permission)
      ? newKey.permissions.filter(p => p !== permission)
      : [...newKey.permissions, permission];
    setNewKey({ ...newKey, permissions: newPermissions });
  };

  const maskKey = (key: string, isVisible: boolean) => {
    if (isVisible) return key;
    const prefix = key.substring(0, 8);
    const suffix = key.substring(key.length - 4);
    return `${prefix}${'*'.repeat(key.length - 12)}${suffix}`;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Key Management</h1>
          <p className="text-gray-600 mt-1">Manage API keys and access permissions</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="keyName">API Key Name</Label>
                <Input
                  id="keyName"
                  value={newKey.name}
                  onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
                  placeholder="Enter a descriptive name"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newKey.description}
                  onChange={(e) => setNewKey({ ...newKey, description: e.target.value })}
                  placeholder="Describe the purpose of this API key"
                  rows={3}
                />
              </div>

              <div>
                <Label>Permissions</Label>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  {['read', 'write', 'delete'].map((permission) => (
                    <div key={permission} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={permission}
                        checked={newKey.permissions.includes(permission)}
                        onChange={() => togglePermission(permission)}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor={permission} className="text-sm font-normal">
                        {permission.charAt(0).toUpperCase() + permission.slice(1)}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expiresAt">Expiration Date</Label>
                  <Input
                    id="expiresAt"
                    type="date"
                    value={newKey.expiresAt}
                    onChange={(e) => setNewKey({ ...newKey, expiresAt: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="limit">Usage Limit</Label>
                  <Input
                    id="limit"
                    type="number"
                    value={newKey.limit}
                    onChange={(e) => setNewKey({ ...newKey, limit: parseInt(e.target.value) || 10000 })}
                    placeholder="10000"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddAPIKey} 
                  disabled={!newKey.name || newKey.permissions.length === 0}
                >
                  Create API Key
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Key className="w-8 h-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-2xl font-bold text-gray-900">{apiKeys.length}</p>
                <p className="text-sm text-gray-600">Total Keys</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div className="ml-3">
                <p className="text-2xl font-bold text-gray-900">
                  {apiKeys.filter(k => k.status === 'active').length}
                </p>
                <p className="text-sm text-gray-600">Active Keys</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <div className="ml-3">
                <p className="text-2xl font-bold text-gray-900">
                  {apiKeys.filter(k => k.status === 'expired').length}
                </p>
                <p className="text-sm text-gray-600">Expired Keys</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Activity className="w-8 h-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-2xl font-bold text-gray-900">
                  {apiKeys.reduce((sum, key) => sum + key.usage, 0).toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">Total Requests</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>API Key</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.map((apiKey) => (
                <TableRow key={apiKey.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-gray-900">{apiKey.name}</p>
                      <p className="text-sm text-gray-600">
                        Expires: {new Date(apiKey.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                        {maskKey(apiKey.key, visibleKeys.has(apiKey.id))}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleKeyVisibility(apiKey.id)}
                      >
                        {visibleKeys.has(apiKey.id) ? 
                          <EyeOff className="w-4 h-4" /> : 
                          <Eye className="w-4 h-4" />
                        }
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(apiKey.key)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {apiKey.permissions.map((permission) => (
                        <Badge key={permission} variant="secondary" className="text-xs">
                          {permission}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusBadgeColor(apiKey.status)}>
                      {apiKey.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className={`font-medium ${getUsageColor(apiKey.usage, apiKey.limit)}`}>
                        {apiKey.usage.toLocaleString()} / {apiKey.limit.toLocaleString()}
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className={`h-2 rounded-full ${
                            (apiKey.usage / apiKey.limit) > 0.9 ? 'bg-red-600' :
                            (apiKey.usage / apiKey.limit) > 0.7 ? 'bg-yellow-600' : 'bg-green-600'
                          }`}
                          style={{ width: `${Math.min((apiKey.usage / apiKey.limit) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{apiKey.lastUsed}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      {apiKey.status === 'active' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => revokeAPIKey(apiKey.id)}
                        >
                          Revoke
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteAPIKey(apiKey.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}