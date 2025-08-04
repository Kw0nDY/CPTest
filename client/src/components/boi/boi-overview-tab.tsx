import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { 
  BarChart3, 
  Activity, 
  Database, 
  Brain,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Target,
  Settings
} from 'lucide-react';

interface BOIOverview {
  totalDataSources: number;
  activeConnections: number;
  aiModelsDeployed: number;
  automationsRunning: number;
  dataProcessedToday: number;
  predictionsGenerated: number;
  averageAccuracy: number;
  systemHealth: 'excellent' | 'good' | 'warning' | 'critical';
}

interface DataFlow {
  id: string;
  name: string;
  source: string;
  destination: string;
  status: 'active' | 'paused' | 'error';
  recordsProcessed: number;
  lastProcessed: string;
}

interface AIInsight {
  id: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  category: 'efficiency' | 'quality' | 'prediction' | 'anomaly';
}

const mockOverview: BOIOverview = {
  totalDataSources: 8,
  activeConnections: 6,
  aiModelsDeployed: 3,
  automationsRunning: 12,
  dataProcessedToday: 45230,
  predictionsGenerated: 1247,
  averageAccuracy: 94.2,
  systemHealth: 'excellent'
};

const mockDataFlows: DataFlow[] = [
  {
    id: '1',
    name: 'Customer Data Pipeline',
    source: 'Salesforce CRM',
    destination: 'Customer Classification Model',
    status: 'active',
    recordsProcessed: 15420,
    lastProcessed: '2024-01-15T14:30:00Z'
  },
  {
    id: '2',
    name: 'Production Data Stream',
    source: 'MES System',
    destination: 'Quality Prediction Model',
    status: 'active',
    recordsProcessed: 8930,
    lastProcessed: '2024-01-15T14:25:00Z'
  },
  {
    id: '3',
    name: 'Sales Forecast Pipeline',
    source: 'SAP ERP',
    destination: 'Demand Forecasting Model',
    status: 'paused',
    recordsProcessed: 5670,
    lastProcessed: '2024-01-15T12:00:00Z'
  }
];

const mockInsights: AIInsight[] = [
  {
    id: '1',
    title: 'Customer Segment Shift Detected',
    description: 'Premium customer segment showing 15% increase in conversion rates',
    impact: 'high',
    confidence: 87.3,
    category: 'prediction'
  },
  {
    id: '2',
    title: 'Data Quality Improvement Needed',
    description: 'Missing values in production data affecting model accuracy by 3.2%',
    impact: 'medium',
    confidence: 92.1,
    category: 'quality'
  },
  {
    id: '3',
    title: 'Process Optimization Opportunity',
    description: 'Automation workflow efficiency can be improved by 22% with minor adjustments',
    impact: 'medium',
    confidence: 78.9,
    category: 'efficiency'
  }
];

export default function BOIOverviewTab() {
  const [selectedTimeframe, setSelectedTimeframe] = useState('today');

  const { data: overview = mockOverview } = useQuery({
    queryKey: ['/api/boi/overview', selectedTimeframe],
    queryFn: () => Promise.resolve(mockOverview), // Mock data for now
  });

  const { data: dataFlows = mockDataFlows } = useQuery({
    queryKey: ['/api/boi/data-flows'],
    queryFn: () => Promise.resolve(mockDataFlows), // Mock data for now
  });

  const { data: insights = mockInsights } = useQuery({
    queryKey: ['/api/boi/insights'],
    queryFn: () => Promise.resolve(mockInsights), // Mock data for now
  });

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent':
        return 'text-green-600 bg-green-100';
      case 'good':
        return 'text-blue-600 bg-blue-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'critical':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'paused':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'efficiency':
        return <Zap className="w-4 h-4" />;
      case 'quality':
        return <Target className="w-4 h-4" />;
      case 'prediction':
        return <TrendingUp className="w-4 h-4" />;
      case 'anomaly':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">BOI Overview</h1>
          <p className="text-gray-600">Business Object Intelligence dashboard and insights</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Configure
          </Button>
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Data Sources</p>
                <p className="text-2xl font-bold text-gray-900">{overview.totalDataSources}</p>
                <p className="text-xs text-green-600">{overview.activeConnections} active</p>
              </div>
              <Database className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">AI Models</p>
                <p className="text-2xl font-bold text-gray-900">{overview.aiModelsDeployed}</p>
                <p className="text-xs text-blue-600">{overview.averageAccuracy}% avg accuracy</p>
              </div>
              <Brain className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Automations</p>
                <p className="text-2xl font-bold text-gray-900">{overview.automationsRunning}</p>
                <p className="text-xs text-green-600">12 running</p>
              </div>
              <Zap className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">System Health</p>
                <Badge className={getHealthColor(overview.systemHealth)}>
                  {overview.systemHealth}
                </Badge>
                <p className="text-xs text-gray-600 mt-1">All systems operational</p>
              </div>
              <Activity className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Processing Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-800 mb-2">
                {overview.dataProcessedToday.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Records Processed Today</div>
              <div className="flex items-center justify-center mt-2 text-green-600">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span className="text-xs">+12% from yesterday</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-800 mb-2">
                {overview.predictionsGenerated.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Predictions Generated</div>
              <div className="flex items-center justify-center mt-2 text-blue-600">
                <Users className="w-4 h-4 mr-1" />
                <span className="text-xs">24/7 processing</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-800 mb-2">
                {overview.averageAccuracy}%
              </div>
              <div className="text-sm text-gray-600">Average Accuracy</div>
              <div className="flex items-center justify-center mt-2 text-green-600">
                <Target className="w-4 h-4 mr-1" />
                <span className="text-xs">Above target (90%)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="flows" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="flows">Data Flows</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="flows" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Active Data Flows
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dataFlows.map((flow) => (
                  <div key={flow.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(flow.status)}
                        <h4 className="font-medium text-gray-900">{flow.name}</h4>
                      </div>
                      <Badge className={
                        flow.status === 'active' ? 'bg-green-100 text-green-800' :
                        flow.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }>
                        {flow.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Source:</span>
                        <div className="font-medium">{flow.source}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Destination:</span>
                        <div className="font-medium">{flow.destination}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Records Processed:</span>
                        <div className="font-medium">{flow.recordsProcessed.toLocaleString()}</div>
                      </div>
                    </div>
                    
                    <div className="mt-3 text-sm text-gray-600">
                      Last processed: {new Date(flow.lastProcessed).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                AI-Generated Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {insights.map((insight) => (
                  <div key={insight.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(insight.category)}
                        <h4 className="font-medium text-gray-900">{insight.title}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getImpactColor(insight.impact)}>
                          {insight.impact} impact
                        </Badge>
                        <span className="text-sm text-gray-600">{insight.confidence}% confidence</span>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 mb-3">{insight.description}</p>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                      <Button variant="outline" size="sm">
                        Take Action
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}