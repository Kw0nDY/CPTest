import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Database, 
  Plus, 
  Search, 
  CheckCircle, 
  AlertCircle, 
  Settings,
  Filter,
  ExternalLink,
  Zap
} from 'lucide-react';

interface DataSource {
  id: string;
  name: string;
  type: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
  recordCount?: number;
  config: {
    host?: string;
    port?: string;
    database?: string;
    username?: string;
  };
}

interface AvailableDataSource {
  id: string;
  name: string;
  type: string;
  category: 'scm' | 'qms' | 'plm' | 'mes' | 'erp' | 'crm';
  description: string;
  vendor: string;
  features: string[];
}

const availableDataSources: AvailableDataSource[] = [
  {
    id: 'salesforce-crm',
    name: 'Salesforce CRM',
    type: 'REST API',
    category: 'crm',
    description: 'Customer relationship management platform',
    vendor: 'Salesforce',
    features: ['Real-time sync', 'OAuth 2.0', 'Bulk API', 'Custom fields']
  },
  {
    id: 'sap-erp',
    name: 'SAP ERP',
    type: 'SOAP/REST',
    category: 'erp',
    description: 'Enterprise resource planning system',
    vendor: 'SAP',
    features: ['RFC connector', 'IDoc support', 'BAPI integration', 'Real-time']
  },
  {
    id: 'oracle-db',
    name: 'Oracle Database',
    type: 'Database',
    category: 'erp',
    description: 'Relational database management system',
    vendor: 'Oracle',
    features: ['JDBC connector', 'Stored procedures', 'Triggers', 'Views']
  },
  {
    id: 'mysql-db',
    name: 'MySQL Database',
    type: 'Database',
    category: 'erp',
    description: 'Open-source relational database',
    vendor: 'MySQL',
    features: ['JDBC connector', 'Replication', 'Clustering', 'JSON support']
  },
  {
    id: 'mes-system',
    name: 'Manufacturing Execution System',
    type: 'REST API',
    category: 'mes',
    description: 'Production floor management system',
    vendor: 'Various',
    features: ['Real-time production data', 'Quality tracking', 'Equipment monitoring']
  },
  {
    id: 'plm-system',
    name: 'Product Lifecycle Management',
    type: 'REST API',
    category: 'plm',
    description: 'Product development and lifecycle management',
    vendor: 'Various',
    features: ['Design data', 'BOM management', 'Change tracking', 'Collaboration']
  },
  {
    id: 'qms-system',
    name: 'Quality Management System',
    type: 'REST API',
    category: 'qms',
    description: 'Quality control and compliance management',
    vendor: 'Various',
    features: ['Audit trails', 'Compliance reporting', 'Defect tracking', 'Certificates']
  },
  {
    id: 'scm-system',
    name: 'Supply Chain Management',
    type: 'REST API',
    category: 'scm',
    description: 'Supply chain planning and execution',
    vendor: 'Various',
    features: ['Demand planning', 'Inventory optimization', 'Supplier management', 'Logistics']
  }
];

const categoryLabels = {
  scm: 'Supply Chain',
  qms: 'Quality Management',
  plm: 'Product Lifecycle',
  mes: 'Manufacturing Execution',
  erp: 'Enterprise Resource Planning',
  crm: 'Customer Relationship'
};

export default function DataIntegrationTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);
  const [selectedDataSource, setSelectedDataSource] = useState<AvailableDataSource | null>(null);
  const [connectionConfig, setConnectionConfig] = useState({
    host: '',
    port: '',
    database: '',
    username: '',
    password: ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: dataSources = [] } = useQuery<DataSource[]>({
    queryKey: ['/api/data-sources'],
  });

  const createDataSourceMutation = useMutation({
    mutationFn: async (config: any) => {
      return apiRequest('/api/data-sources', 'POST', config);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/data-sources'] });
      toast({ title: "Success", description: "Data source connected successfully." });
      setShowConnectionDialog(false);
      setConnectionConfig({ host: '', port: '', database: '', username: '', password: '' });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to connect data source.", variant: "destructive" });
    },
  });

  const filteredDataSources = useMemo(() => {
    return availableDataSources.filter(ds => {
      const matchesSearch = ds.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           ds.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           ds.vendor.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || ds.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);

  const handleConnect = (dataSource: AvailableDataSource) => {
    setSelectedDataSource(dataSource);
    setShowConnectionDialog(true);
  };

  const handleSaveConnection = () => {
    if (!selectedDataSource || !connectionConfig.host) return;
    
    const config = {
      name: selectedDataSource.name,
      type: selectedDataSource.type,
      category: selectedDataSource.category,
      vendor: selectedDataSource.vendor,
      config: connectionConfig
    };

    createDataSourceMutation.mutate(config);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      connected: 'bg-green-100 text-green-800',
      disconnected: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800'
    };
    return variants[status as keyof typeof variants] || variants.disconnected;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Integration</h1>
          <p className="text-gray-600">Manage your data source connections and integrations</p>
        </div>
      </div>

      <Tabs defaultValue="connected" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="connected">Connected Data Sources</TabsTrigger>
          <TabsTrigger value="available">Available Data Sources</TabsTrigger>
        </TabsList>

        <TabsContent value="connected" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Connected Data Sources
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dataSources.length === 0 ? (
                <div className="text-center py-12">
                  <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Sources Connected</h3>
                  <p className="text-gray-600 mb-4">Connect your first data source to get started with data integration.</p>
                  <Button onClick={() => setShowConnectionDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Connect Data Source
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dataSources.map((ds: DataSource) => (
                    <Card key={ds.id} className="border border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(ds.status)}
                            <h4 className="font-medium text-gray-900">{ds.name}</h4>
                          </div>
                          <Badge className={getStatusBadge(ds.status)}>
                            {ds.status}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex justify-between">
                            <span>Type:</span>
                            <span>{ds.type}</span>
                          </div>
                          {ds.recordCount && (
                            <div className="flex justify-between">
                              <span>Records:</span>
                              <span>{ds.recordCount.toLocaleString()}</span>
                            </div>
                          )}
                          {ds.lastSync && (
                            <div className="flex justify-between">
                              <span>Last Sync:</span>
                              <span>{new Date(ds.lastSync).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 mt-4">
                          <Button variant="outline" size="sm" className="flex-1">
                            <Settings className="w-4 h-4 mr-1" />
                            Configure
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1">
                            <Zap className="w-4 h-4 mr-1" />
                            Test
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="available" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Available Data Sources</CardTitle>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search data sources..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full sm:w-48">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {Object.entries(categoryLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDataSources.map((ds) => (
                  <Card key={ds.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-1">{ds.name}</h4>
                          <Badge variant="outline" className="text-xs">
                            {categoryLabels[ds.category]}
                          </Badge>
                        </div>
                        <Badge variant="secondary">{ds.type}</Badge>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">{ds.description}</p>
                      
                      <div className="mb-3">
                        <p className="text-xs text-gray-500 mb-1">Features:</p>
                        <div className="flex flex-wrap gap-1">
                          {ds.features.slice(0, 2).map((feature) => (
                            <Badge key={feature} variant="outline" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                          {ds.features.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{ds.features.length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          onClick={() => handleConnect(ds)}
                          className="flex-1"
                          size="sm"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Connect
                        </Button>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Connection Configuration Dialog */}
      <Dialog open={showConnectionDialog} onOpenChange={setShowConnectionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect to {selectedDataSource?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="host">Host/Server</Label>
              <Input
                id="host"
                value={connectionConfig.host}
                onChange={(e) => setConnectionConfig(prev => ({ ...prev, host: e.target.value }))}
                placeholder="localhost or server.company.com"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="port">Port</Label>
                <Input
                  id="port"
                  value={connectionConfig.port}
                  onChange={(e) => setConnectionConfig(prev => ({ ...prev, port: e.target.value }))}
                  placeholder="5432"
                />
              </div>
              <div>
                <Label htmlFor="database">Database</Label>
                <Input
                  id="database"
                  value={connectionConfig.database}
                  onChange={(e) => setConnectionConfig(prev => ({ ...prev, database: e.target.value }))}
                  placeholder="production"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={connectionConfig.username}
                onChange={(e) => setConnectionConfig(prev => ({ ...prev, username: e.target.value }))}
                placeholder="admin"
              />
            </div>
            
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={connectionConfig.password}
                onChange={(e) => setConnectionConfig(prev => ({ ...prev, password: e.target.value }))}
                placeholder="••••••••"
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button 
                onClick={handleSaveConnection}
                disabled={createDataSourceMutation.isPending || !connectionConfig.host}
                className="flex-1"
              >
                {createDataSourceMutation.isPending ? 'Connecting...' : 'Connect'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowConnectionDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}