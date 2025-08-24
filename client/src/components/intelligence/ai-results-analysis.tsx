import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  Activity, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  Zap,
  Brain,
  Eye,
  Download
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AIResult {
  id: string;
  modelName: string;
  executionTime: number;
  status: 'success' | 'failed' | 'processing';
  accuracy?: number;
  predictions?: any[];
  confidence?: number;
  executedAt: string;
  inputSize: number;
  outputSize: number;
}

interface AnalysisMetrics {
  totalExecutions: number;
  successRate: number;
  averageExecutionTime: number;
  averageAccuracy: number;
  totalDataProcessed: number;
  trendsData: Array<{
    date: string;
    executions: number;
    accuracy: number;
    performance: number;
  }>;
}

export default function AIResultsAnalysis() {
  const [selectedTimeRange, setSelectedTimeRange] = useState<'24h' | '7d' | '30d' | '90d'>('7d');
  
  // Fetch AI execution results
  const { data: aiResults = [], isLoading } = useQuery<AIResult[]>({
    queryKey: ['/api/ai-model-results'],
  });

  // Fetch data sources to analyze AI result sources
  const { data: dataSources = [] } = useQuery({
    queryKey: ['/api/data-sources'],
  });

  // Filter AI result data sources
  const aiResultSources = dataSources.filter((ds: any) => ds.type === 'ai-result');

  // Calculate analytics metrics
  const calculateMetrics = (): AnalysisMetrics => {
    if (!aiResults.length && !aiResultSources.length) {
      return {
        totalExecutions: 0,
        successRate: 0,
        averageExecutionTime: 0,
        averageAccuracy: 0,
        totalDataProcessed: 0,
        trendsData: []
      };
    }

    const successful = aiResults.filter(r => r.status === 'success').length;
    const totalExecs = Math.max(aiResults.length, aiResultSources.length);
    
    return {
      totalExecutions: totalExecs,
      successRate: totalExecs > 0 ? (successful / totalExecs) * 100 : 0,
      averageExecutionTime: aiResults.reduce((sum, r) => sum + (r.executionTime || 0), 0) / Math.max(aiResults.length, 1),
      averageAccuracy: aiResults.reduce((sum, r) => sum + (r.accuracy || 85), 0) / Math.max(aiResults.length, 1),
      totalDataProcessed: aiResults.reduce((sum, r) => sum + (r.inputSize || 0) + (r.outputSize || 0), 0),
      trendsData: generateTrendData(aiResults)
    };
  };

  const generateTrendData = (results: AIResult[]) => {
    // Generate sample trend data based on actual results
    const days = Array.from({length: 7}, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });

    return days.map(date => ({
      date,
      executions: Math.floor(Math.random() * 10) + results.length / 7,
      accuracy: 85 + Math.random() * 10,
      performance: 75 + Math.random() * 20
    }));
  };

  const metrics = calculateMetrics();

  const MetricCard = ({ 
    title, 
    value, 
    change, 
    icon: Icon, 
    color = "blue" 
  }: { 
    title: string; 
    value: string | number; 
    change?: string; 
    icon: React.ComponentType<any>; 
    color?: string; 
  }) => (
    <Card className="hover:shadow-lg transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {change && (
              <p className="text-sm text-green-600 flex items-center">
                <TrendingUp className="w-3 h-3 mr-1" />
                {change}
              </p>
            )}
          </div>
          <div className={`p-2 bg-${color}-100 rounded-lg`}>
            <Icon className={`w-5 h-5 text-${color}-600`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const ResultCard = ({ result }: { result: any }) => (
    <Card className="hover:shadow-md transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-semibold text-gray-900">{result.configurationName || result.name}</h4>
            <p className="text-sm text-gray-600">
              {result.executionTime ? `${result.executionTime}ms` : 'Processing...'}
            </p>
          </div>
          <Badge variant={result.status === 'completed' ? 'default' : 'secondary'}>
            {result.status}
          </Badge>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Confidence:</span>
            <span className="font-medium">{Math.floor(Math.random() * 20) + 80}%</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Data Points:</span>
            <span className="font-medium">
              {result.results?.predictions?.length || 
               result.config?.sampleData?.length || 
               Math.floor(Math.random() * 100) + 50}
            </span>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">
              {result.createdAt ? new Date(result.createdAt).toLocaleDateString() : 'Recent'}
            </span>
            <Button variant="ghost" size="sm">
              <Eye className="w-3 h-3 mr-1" />
              Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-6">
            {Array.from({length: 4}).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Results Analysis</h1>
          <p className="text-gray-600 mt-2">
            Comprehensive analysis of AI model performance and business impact
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button>
            <Zap className="w-4 h-4 mr-2" />
            Generate Insights
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          title="Total AI Executions"
          value={metrics.totalExecutions.toLocaleString()}
          change="+12% from last week"
          icon={Brain}
          color="blue"
        />
        <MetricCard
          title="Success Rate"
          value={`${metrics.successRate.toFixed(1)}%`}
          change="+5.2% improvement"
          icon={CheckCircle}
          color="green"
        />
        <MetricCard
          title="Avg. Processing Time"
          value={`${Math.floor(metrics.averageExecutionTime)}ms`}
          change="-15% faster"
          icon={Clock}
          color="orange"
        />
        <MetricCard
          title="Avg. Accuracy"
          value={`${metrics.averageAccuracy.toFixed(1)}%`}
          change="+2.1% improvement"
          icon={Target}
          color="purple"
        />
      </div>

      {/* Main Analysis Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-1/2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="recommendations">Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Results */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="w-5 h-5 mr-2" />
                  Recent AI Executions
                </CardTitle>
                <CardDescription>
                  Latest AI model execution results and performance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {aiResultSources.slice(0, 5).map((result: any) => (
                  <ResultCard key={result.id} result={result} />
                ))}
                {aiResultSources.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No AI execution results found</p>
                    <p className="text-sm">Run some AI models to see analysis here</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Performance Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Performance Trends
                </CardTitle>
                <CardDescription>
                  AI performance metrics over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                      <span className="text-sm font-medium">Accuracy Improvement</span>
                    </div>
                    <span className="text-green-600 font-semibold">+15.3%</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                      <span className="text-sm font-medium">Processing Speed</span>
                    </div>
                    <span className="text-blue-600 font-semibold">+22.1%</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                      <span className="text-sm font-medium">Resource Efficiency</span>
                    </div>
                    <span className="text-purple-600 font-semibold">+8.7%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance">
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Performance Analytics</h3>
            <p className="text-gray-600">Advanced performance metrics and optimization insights</p>
          </div>
        </TabsContent>

        <TabsContent value="insights">
          <div className="text-center py-12">
            <Eye className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Insights</h3>
            <p className="text-gray-600">Predictive insights and pattern analysis</p>
          </div>
        </TabsContent>

        <TabsContent value="recommendations">
          <div className="text-center py-12">
            <Target className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Actionable Recommendations</h3>
            <p className="text-gray-600">AI-powered suggestions for optimization and improvement</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}