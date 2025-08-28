import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Plus, Search, Filter, BarChart3, Activity, Layers, Clock, Play, Pause, Settings } from 'lucide-react';

interface DataView {
  id: string;
  name: string;
  description: string;
  type: 'asset' | 'event' | 'streaming';
  status: 'active' | 'paused' | 'draft';
  lastUpdated: string;
  createdBy: string;
  dataSource: string;
  runMode: 'once' | 'continuous' | 'scheduled';
}

const sampleViews: DataView[] = [
  {
    id: '1',
    name: 'Drilling Operations Monitor',
    description: 'Real-time monitoring of drilling operations with automated alerts',
    type: 'asset',
    status: 'active',
    lastUpdated: '2025-01-15T09:19:00Z',
    createdBy: 'admin',
    dataSource: 'AVEVA PI System',
    runMode: 'continuous'
  },
  {
    id: '2',
    name: 'Production Performance Dashboard',
    description: 'Asset performance tracking with automated reporting',
    type: 'asset',
    status: 'active',
    lastUpdated: '2025-01-15T08:00:00Z',
    createdBy: 'admin',
    dataSource: 'SAP ERP',
    runMode: 'scheduled'
  },
  {
    id: '3',
    name: 'Equipment Maintenance Events',
    description: 'Event-driven maintenance scheduling and tracking',
    type: 'event',
    status: 'draft',
    lastUpdated: '2025-01-14T16:00:00Z',
    createdBy: 'mike',
    dataSource: 'Salesforce CRM',
    runMode: 'once'
  },
  {
    id: '4',
    name: 'Real-time Sensor Data Stream',
    description: 'Continuous streaming data from IoT sensors',
    type: 'streaming',
    status: 'paused',
    lastUpdated: '2025-01-14T14:30:00Z',
    createdBy: 'admin',
    dataSource: 'AVEVA PI System',
    runMode: 'continuous'
  }
];

export default function ViewListTab() {
  const [views, setViews] = useState<DataView[]>(sampleViews);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredViews = views.filter((view) => {
    const matchesSearch = view.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         view.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || view.status === statusFilter;
    const matchesType = typeFilter === 'all' || view.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'asset': return <BarChart3 className="h-4 w-4" />;
      case 'event': return <Activity className="h-4 w-4" />;
      case 'streaming': return <Layers className="h-4 w-4" />;
      default: return <Eye className="h-4 w-4" />;
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Views</h1>
          <p className="text-gray-600 mt-1">Create and manage data visualization views</p>
        </div>
        <Button data-testid="button-create-view">
          <Plus className="h-4 w-4 mr-2" />
          Create View
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search views..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-views"
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
          </SelectContent>
        </Select>
        
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40" data-testid="select-type-filter">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="asset">Asset</SelectItem>
            <SelectItem value="event">Event</SelectItem>
            <SelectItem value="streaming">Streaming</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{views.length}</div>
            <div className="text-sm text-gray-600">Total Views</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {views.filter(v => v.status === 'active').length}
            </div>
            <div className="text-sm text-gray-600">Active</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {views.filter(v => v.status === 'paused').length}
            </div>
            <div className="text-sm text-gray-600">Paused</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">
              {views.filter(v => v.status === 'draft').length}
            </div>
            <div className="text-sm text-gray-600">Draft</div>
          </CardContent>
        </Card>
      </div>

      {/* Views Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredViews.map((view) => (
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
            
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Data Source:</span>
                  <span className="font-medium">{view.dataSource}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <div className="flex items-center space-x-1">
                    {getTypeIcon(view.type)}
                    <span className="capitalize">{view.type}</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Run Mode:</span>
                  <div className="flex items-center space-x-1">
                    {getRunModeIcon(view.runMode)}
                    <span className="capitalize">{view.runMode}</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Updated:</span>
                  <span>{new Date(view.lastUpdated).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Created by:</span>
                  <span className="capitalize">{view.createdBy}</span>
                </div>
              </div>
              
              <div className="flex space-x-2 pt-2">
                <Button size="sm" className="flex-1" data-testid={`button-view-${view.id}`}>
                  <Eye className="h-3 w-3 mr-1" />
                  View
                </Button>
                <Button size="sm" variant="outline" data-testid={`button-edit-${view.id}`}>
                  <Settings className="h-3 w-3" />
                </Button>
                {view.status === 'active' ? (
                  <Button size="sm" variant="outline" data-testid={`button-pause-${view.id}`}>
                    <Pause className="h-3 w-3" />
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" data-testid={`button-start-${view.id}`}>
                    <Play className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredViews.length === 0 && (
        <div className="text-center py-12">
          <Filter className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">No views found</p>
          <p className="text-sm text-gray-500 mt-1">
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}
    </div>
  );
}