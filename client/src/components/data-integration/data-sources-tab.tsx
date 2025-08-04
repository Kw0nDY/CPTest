import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressIndicator } from "@/components/ui/progress-indicator";
import { Building, TrendingUp, Users, Handshake, Database, FileSpreadsheet, CheckCircle } from "lucide-react";
import { SystemSource } from "@/types/integration";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DataSourcesTabProps {
  onNext: () => void;
}

const systemSources: SystemSource[] = [
  { id: 'sap', name: 'SAP ERP', type: 'erp', icon: 'Building', color: 'blue', description: 'Enterprise Resource Planning' },
  { id: 'oracle', name: 'Oracle ERP', type: 'erp', icon: 'TrendingUp', color: 'green', description: 'Cloud Applications' },
  { id: 'salesforce', name: 'Salesforce', type: 'crm', icon: 'Users', color: 'blue', description: 'Customer Platform' },
  { id: 'hubspot', name: 'HubSpot', type: 'crm', icon: 'Handshake', color: 'orange', description: 'Customer Platform' },
  { id: 'mysql', name: 'MySQL', type: 'database', icon: 'Database', color: 'purple', description: 'Database' },
  { id: 'excel', name: 'Excel/CSV', type: 'file', icon: 'FileSpreadsheet', color: 'red', description: 'File Import' },
];

export default function DataSourcesTab({ onNext }: DataSourcesTabProps) {
  const [selectedSource, setSelectedSource] = useState<SystemSource | null>(null);
  const [connectionForm, setConnectionForm] = useState({
    name: '',
    endpoint: '',
    authMethod: 'oauth2',
    clientId: '',
    clientSecret: '',
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: dataSources = [] } = useQuery({
    queryKey: ['/api/data-sources'],
  });

  const createDataSourceMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/data-sources', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/data-sources'] });
      toast({ title: "성공", description: "데이터 소스가 생성되었습니다." });
    },
    onError: () => {
      toast({ title: "오류", description: "데이터 소스 생성에 실패했습니다.", variant: "destructive" });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('POST', `/api/data-sources/${id}/test`);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "연결 성공", description: data.message });
        queryClient.invalidateQueries({ queryKey: ['/api/data-sources'] });
      }
    },
    onError: () => {
      toast({ title: "연결 실패", description: "연결 테스트에 실패했습니다.", variant: "destructive" });
    },
  });

  const handleSourceSelect = (source: SystemSource) => {
    setSelectedSource(source);
    setConnectionForm(prev => ({ ...prev, name: `${source.name} 연결` }));
  };

  const handleSaveConnection = async () => {
    if (!selectedSource) return;

    const data = {
      ...connectionForm,
      type: selectedSource.id,
      status: 'disconnected',
      credentials: {
        clientId: connectionForm.clientId,
        clientSecret: connectionForm.clientSecret,
      },
    };

    createDataSourceMutation.mutate(data);
  };

  const handleTestConnection = (id: string) => {
    testConnectionMutation.mutate(id);
  };

  const getIcon = (iconName: string) => {
    const icons = { Building, TrendingUp, Users, Handshake, Database, FileSpreadsheet };
    const Icon = icons[iconName as keyof typeof icons] || Building;
    return <Icon className="w-5 h-5" />;
  };

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      orange: 'bg-orange-100 text-orange-600',
      purple: 'bg-purple-100 text-purple-600',
      red: 'bg-red-100 text-red-600',
    };
    return colors[color as keyof typeof colors] || 'bg-gray-100 text-gray-600';
  };

  const connectedSources = dataSources.filter((ds: any) => ds.status === 'connected');

  return (
    <div className="p-6 space-y-6">
      <ProgressIndicator 
        title="데이터 소스 연결 진행 상황" 
        currentStep={1} 
        totalSteps={5}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Available Data Sources */}
        <Card>
          <CardHeader>
            <CardTitle>사용 가능한 데이터 소스</CardTitle>
            <p className="text-sm text-gray-600">연결할 시스템을 선택하세요</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* ERP Systems */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">ERP 시스템</h4>
              <div className="grid grid-cols-1 gap-3">
                {systemSources.filter(s => s.type === 'erp').map((source) => (
                  <div
                    key={source.id}
                    onClick={() => handleSourceSelect(source)}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedSource?.id === source.id
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-primary hover:bg-primary/5'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded flex items-center justify-center ${getColorClasses(source.color)}`}>
                        {getIcon(source.icon)}
                      </div>
                      <div>
                        <h5 className="text-sm font-medium">{source.name}</h5>
                        <p className="text-xs text-gray-500">{source.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CRM Systems */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">CRM 시스템</h4>
              <div className="grid grid-cols-1 gap-3">
                {systemSources.filter(s => s.type === 'crm').map((source) => (
                  <div
                    key={source.id}
                    onClick={() => handleSourceSelect(source)}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedSource?.id === source.id
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-primary hover:bg-primary/5'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded flex items-center justify-center ${getColorClasses(source.color)}`}>
                        {getIcon(source.icon)}
                      </div>
                      <div>
                        <h5 className="text-sm font-medium">{source.name}</h5>
                        <p className="text-xs text-gray-500">{source.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Other Systems */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">기타 시스템</h4>
              <div className="grid grid-cols-1 gap-3">
                {systemSources.filter(s => s.type === 'database' || s.type === 'file').map((source) => (
                  <div
                    key={source.id}
                    onClick={() => handleSourceSelect(source)}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedSource?.id === source.id
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-primary hover:bg-primary/5'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded flex items-center justify-center ${getColorClasses(source.color)}`}>
                        {getIcon(source.icon)}
                      </div>
                      <div>
                        <h5 className="text-sm font-medium">{source.name}</h5>
                        <p className="text-xs text-gray-500">{source.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuration Panel */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedSource ? `${selectedSource.name} 연결 설정` : '데이터 소스 선택'}
            </CardTitle>
            <p className="text-sm text-gray-600">
              {selectedSource ? 'API 연결 정보를 입력하세요' : '왼쪽에서 연결할 시스템을 선택하세요'}
            </p>
          </CardHeader>
          <CardContent>
            {selectedSource ? (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="connection-name">연결 이름</Label>
                  <Input
                    id="connection-name"
                    value={connectionForm.name}
                    onChange={(e) => setConnectionForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="예: 영업팀 Salesforce"
                  />
                </div>
                
                <div>
                  <Label htmlFor="endpoint">API 엔드포인트</Label>
                  <Input
                    id="endpoint"
                    type="url"
                    value={connectionForm.endpoint}
                    onChange={(e) => setConnectionForm(prev => ({ ...prev, endpoint: e.target.value }))}
                    placeholder="https://your-domain.salesforce.com"
                  />
                </div>

                <div>
                  <Label htmlFor="auth-method">인증 방식</Label>
                  <Select
                    value={connectionForm.authMethod}
                    onValueChange={(value) => setConnectionForm(prev => ({ ...prev, authMethod: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                      <SelectItem value="api_token">API Token</SelectItem>
                      <SelectItem value="basic_auth">Basic Auth</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="client-id">클라이언트 ID</Label>
                    <Input
                      id="client-id"
                      value={connectionForm.clientId}
                      onChange={(e) => setConnectionForm(prev => ({ ...prev, clientId: e.target.value }))}
                      placeholder="입력하세요"
                    />
                  </div>
                  <div>
                    <Label htmlFor="client-secret">클라이언트 시크릿</Label>
                    <Input
                      id="client-secret"
                      type="password"
                      value={connectionForm.clientSecret}
                      onChange={(e) => setConnectionForm(prev => ({ ...prev, clientSecret: e.target.value }))}
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="flex space-x-3">
                  <Button 
                    variant="outline"
                    disabled={!connectionForm.name || !connectionForm.endpoint}
                    onClick={() => {
                      // First save, then test
                      handleSaveConnection();
                    }}
                  >
                    연결 테스트
                  </Button>
                  <Button 
                    onClick={handleSaveConnection}
                    disabled={createDataSourceMutation.isPending || !connectionForm.name}
                  >
                    {createDataSourceMutation.isPending ? '저장 중...' : '저장 및 계속'}
                  </Button>
                </div>

                {/* Connected Sources */}
                {connectedSources.length > 0 && (
                  <div className="border border-green-200 bg-green-50 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">연결 성공</span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      {connectedSources.length}개의 데이터 소스가 연결되었습니다.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Database className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>연결할 데이터 소스를 선택해주세요</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Connected Sources List */}
      {dataSources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>연결된 데이터 소스</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dataSources.map((source: any) => (
                <div key={source.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded flex items-center justify-center ${
                      source.status === 'connected' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {getIcon('Database')}
                    </div>
                    <div>
                      <h5 className="text-sm font-medium">{source.name}</h5>
                      <p className="text-xs text-gray-500">{source.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      source.status === 'connected' 
                        ? 'bg-green-100 text-green-800'
                        : source.status === 'error'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {source.status === 'connected' ? '연결됨' : source.status === 'error' ? '오류' : '미연결'}
                    </span>
                    {source.status !== 'connected' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTestConnection(source.id)}
                        disabled={testConnectionMutation.isPending}
                      >
                        {testConnectionMutation.isPending ? '테스트 중...' : '연결 테스트'}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button 
          onClick={onNext}
          disabled={connectedSources.length === 0}
        >
          데이터 매핑으로 계속
        </Button>
      </div>
    </div>
  );
}
