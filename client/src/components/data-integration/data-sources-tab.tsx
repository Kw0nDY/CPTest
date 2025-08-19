import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building, TrendingUp, Users, Handshake, Database, FileSpreadsheet, CheckCircle, Trash2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { GoogleSheetsDialog } from './google-sheets-dialog';

interface SystemSource {
  id: string;
  name: string;
  type: string;
  icon: string;
  color: string;
  description: string;
}

interface DataSourcesTabProps {
  onNext: () => void;
}

const systemSources: SystemSource[] = [
  { id: 'sap', name: 'SAP ERP', type: 'erp', icon: 'Building', color: 'blue', description: 'Enterprise Resource Planning' },
  { id: 'oracle', name: 'Oracle ERP', type: 'erp', icon: 'TrendingUp', color: 'green', description: 'Cloud Applications' },
  { id: 'salesforce', name: 'Salesforce', type: 'crm', icon: 'Users', color: 'blue', description: 'Customer Platform' },
  { id: 'hubspot', name: 'HubSpot', type: 'crm', icon: 'Handshake', color: 'orange', description: 'Customer Platform' },
  { id: 'mysql', name: 'MySQL', type: 'database', icon: 'Database', color: 'purple', description: 'Database' },
  { id: 'excel', name: 'Microsoft Excel', type: 'file', icon: 'FileSpreadsheet', color: 'green', description: 'OneDrive/SharePoint Excel Files' },
  { id: 'google-sheets', name: 'Google Sheets', type: 'file', icon: 'FileSpreadsheet', color: 'blue', description: 'Google Drive Spreadsheets' },
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
  const [isConnecting, setIsConnecting] = useState(false);
  const [excelFiles, setExcelFiles] = useState<any[]>([]);
  const [showExcelFiles, setShowExcelFiles] = useState(false);
  const [showGoogleSheetsDialog, setShowGoogleSheetsDialog] = useState(false);

  const { toast } = useToast();

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
      toast({ title: "데이터 소스 연결됨", description: "Successfully connected to data source" });
      setSelectedSource(null);
      setConnectionForm({
        name: '',
        endpoint: '',
        authMethod: 'oauth2',
        clientId: '',
        clientSecret: '',
      });
    },
    onError: (error) => {
      console.error('Connection error:', error);
      toast({ title: "연결 실패", description: "Failed to connect data source", variant: "destructive" });
    },
  });

  const deleteDataSourceMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/data-sources/${id}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/data-sources'] });
      toast({ title: "데이터 소스 삭제됨", description: "Data source has been successfully deleted" });
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast({ title: "삭제 실패", description: "Failed to delete data source", variant: "destructive" });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (dataSourceId: string) => {
      const response = await apiRequest('POST', `/api/data-sources/${dataSourceId}/test`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "테스트 성공", description: "Connection test successful" });
    },
    onError: (error) => {
      console.error('Test error:', error);
      toast({ title: "테스트 실패", description: "Connection test failed", variant: "destructive" });
    },
  });

  const connectedSources = dataSources.filter((ds: any) => ds.status === 'connected');

  const getIcon = (iconName: string) => {
    const iconMap: { [key: string]: any } = {
      Building,
      TrendingUp,
      Users,
      Handshake,
      Database,
      FileSpreadsheet,
    };
    const IconComponent = iconMap[iconName] || Database;
    return <IconComponent className="w-4 h-4" />;
  };

  const getColorClasses = (color: string) => {
    const colorMap: { [key: string]: string } = {
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      orange: 'bg-orange-100 text-orange-600',
      purple: 'bg-purple-100 text-purple-600',
      red: 'bg-red-100 text-red-600',
    };
    return colorMap[color] || 'bg-gray-100 text-gray-600';
  };

  const handleSourceSelect = (source: SystemSource) => {
    setSelectedSource(source);
    setConnectionForm(prev => ({ ...prev, name: `${source.name} 연결` }));
  };

  const handleTestConnection = (dataSourceId: string) => {
    testConnectionMutation.mutate(dataSourceId);
  };

  const handleDeleteDataSource = async (dataSourceId: string, dataSourceName: string) => {
    if (window.confirm(`정말로 "${dataSourceName}" 데이터 소스를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
      deleteDataSourceMutation.mutate(dataSourceId);
    }
  };

  const handleSaveConnection = async () => {
    if (!selectedSource) return;

    if (selectedSource.id === 'excel') {
      // Handle Microsoft Excel OAuth connection
      await handleExcelOAuthConnection();
    } else if (selectedSource.id === 'google-sheets') {
      // Handle Google Sheets OAuth connection
      setShowGoogleSheetsDialog(true);
    } else {
      const data = {
        ...connectionForm,
        type: selectedSource.id,
        status: 'disconnected',
        category: selectedSource.type,
        config: {},
        credentials: {
          clientId: connectionForm.clientId,
          clientSecret: connectionForm.clientSecret,
        },
      };

      createDataSourceMutation.mutate(data);
    }
  };

  const handleExcelOAuthConnection = async () => {
    setIsConnecting(true);
    try {
      // Create Excel data source first
      const dataSourceData = {
        name: connectionForm.name || 'Microsoft Excel',
        type: 'excel',
        category: 'file',
        config: {},
        credentials: null,
        status: 'disconnected'
      };

      const response = await apiRequest('POST', '/api/data-sources', dataSourceData);
      const dataSource = await response.json();

      // Get OAuth authorization URL
      const authResponse = await apiRequest('POST', `/api/data-sources/${dataSource.id}/oauth/authorize`, {
        clientId: connectionForm.clientId
      });
      const authData = await authResponse.json();

      if (authData.authUrl) {
        // Open Microsoft OAuth popup
        const popup = window.open(
          authData.authUrl,
          'microsoft-oauth',
          'width=600,height=700,scrollbars=yes,resizable=yes'
        );

        // Monitor popup for completion
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            setIsConnecting(false);
            // Refresh data sources to check connection status
            queryClient.invalidateQueries({ queryKey: ['/api/data-sources'] });
            toast({ 
              title: "Microsoft Excel 연결 완료", 
              description: "Excel 파일 목록을 불러오는 중입니다." 
            });
            // Auto-load Excel files after successful connection
            setTimeout(() => loadExcelFiles(dataSource.id), 2000);
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Excel OAuth error:', error);
      toast({ 
        title: "연결 실패", 
        description: "Microsoft Excel 연결에 실패했습니다.", 
        variant: "destructive" 
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const loadExcelFiles = async (dataSourceId: string) => {
    try {
      const response = await apiRequest('GET', `/api/data-sources/${dataSourceId}/excel-files`);
      const data = await response.json();
      setExcelFiles(data.files || []);
      setShowExcelFiles(true);
      toast({ 
        title: "Excel 파일 로드 완료", 
        description: `${data.files?.length || 0}개의 Excel 파일을 찾았습니다.` 
      });
    } catch (error) {
      console.error('Error loading Excel files:', error);
      toast({ 
        title: "파일 로드 실패", 
        description: "Excel 파일을 불러오는데 실패했습니다.", 
        variant: "destructive" 
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Available Data Sources */}
        <Card>
          <CardHeader>
            <CardTitle>Available Data Sources</CardTitle>
            <p className="text-sm text-gray-600">Select a system to connect to</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* ERP Systems */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">ERP Systems</h4>
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
                    data-testid={`source-${source.id}`}
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
              <h4 className="text-sm font-medium text-gray-700 mb-3">CRM Systems</h4>
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
                    data-testid={`source-${source.id}`}
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
              <h4 className="text-sm font-medium text-gray-700 mb-3">Other Systems</h4>
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
                    data-testid={`source-${source.id}`}
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
              {selectedSource ? `${selectedSource.name} Connection Setup` : 'Select Data Source'}
            </CardTitle>
            <p className="text-sm text-gray-600">
              {selectedSource ? 'Enter API connection information' : 'Select a system to connect from the left'}
            </p>
          </CardHeader>
          <CardContent>
            {selectedSource ? (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="connection-name">Connection Name</Label>
                  <Input
                    id="connection-name"
                    value={connectionForm.name}
                    onChange={(e) => setConnectionForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Sales Team Salesforce"
                    data-testid="input-connection-name"
                  />
                </div>
                
                {selectedSource.id !== 'excel' && (
                  <div>
                    <Label htmlFor="endpoint">API Endpoint</Label>
                    <Input
                      id="endpoint"
                      type="url"
                      value={connectionForm.endpoint}
                      onChange={(e) => setConnectionForm(prev => ({ ...prev, endpoint: e.target.value }))}
                      placeholder="https://your-domain.salesforce.com"
                      data-testid="input-endpoint"
                    />
                  </div>
                )}

                {selectedSource.id !== 'excel' && (
                  <div>
                    <Label htmlFor="auth-method">Authentication Method</Label>
                    <Select
                      value={connectionForm.authMethod}
                      onValueChange={(value) => setConnectionForm(prev => ({ ...prev, authMethod: value }))}
                    >
                      <SelectTrigger data-testid="select-auth-method">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                        <SelectItem value="api_token">API Token</SelectItem>
                        <SelectItem value="basic_auth">Basic Auth</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {selectedSource.id === 'excel' && (
                  <div className="space-y-4 p-4 bg-blue-50 rounded-lg border">
                    <div className="flex items-center space-x-2">
                      <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                      <h4 className="font-medium text-blue-900">Microsoft Excel 연결</h4>
                    </div>
                    <p className="text-sm text-blue-700">
                      Microsoft Graph API를 통해 OneDrive 또는 SharePoint의 Excel 파일에 접근합니다.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="excel-client-id">Microsoft Application Client ID (선택사항)</Label>
                      <Input
                        id="excel-client-id"
                        value={connectionForm.clientId}
                        onChange={(e) => setConnectionForm(prev => ({ ...prev, clientId: e.target.value }))}
                        placeholder="기본 설정 사용 (비어둘 수 있음)"
                        data-testid="input-excel-client-id"
                      />
                      <p className="text-xs text-gray-600">
                        사용자 정의 Microsoft 앱을 사용하려면 Client ID를 입력하세요. 비어두면 기본 설정을 사용합니다.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium text-blue-900">연결 후 가능한 작업:</h5>
                      <ul className="text-xs text-blue-700 space-y-1">
                        <li>• OneDrive의 Excel 파일 목록 조회</li>
                        <li>• 워크시트 데이터 실시간 읽기</li>
                        <li>• 셀 범위 데이터 추출</li>
                        <li>• 자동 토큰 갱신 (Refresh Token)</li>
                      </ul>
                    </div>
                  </div>
                )}

                {selectedSource.id === 'google-sheets' && (
                  <div className="space-y-4 p-4 bg-blue-50 rounded-lg border">
                    <div className="flex items-center space-x-2">
                      <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                      <h4 className="font-medium text-blue-900">Google Sheets 연결</h4>
                    </div>
                    <p className="text-sm text-blue-700">
                      Google Drive API를 통해 Google Sheets 스프레드시트에 접근합니다.
                    </p>
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium text-blue-900">연결 후 가능한 작업:</h5>
                      <ul className="text-xs text-blue-700 space-y-1">
                        <li>• Google Drive의 Sheets 파일 목록 조회</li>
                        <li>• 워크시트 데이터 실시간 읽기</li>
                        <li>• 시트별 데이터 추출</li>
                        <li>• OAuth 2.0 보안 인증</li>
                      </ul>
                    </div>
                  </div>
                )}

                {selectedSource.id !== 'excel' && selectedSource.id !== 'google-sheets' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="client-id">Client ID</Label>
                      <Input
                        id="client-id"
                        value={connectionForm.clientId}
                        onChange={(e) => setConnectionForm(prev => ({ ...prev, clientId: e.target.value }))}
                        placeholder="Enter client ID"
                        data-testid="input-client-id"
                      />
                    </div>
                    <div>
                      <Label htmlFor="client-secret">Client Secret</Label>
                      <Input
                        id="client-secret"
                        type="password"
                        value={connectionForm.clientSecret}
                        onChange={(e) => setConnectionForm(prev => ({ ...prev, clientSecret: e.target.value }))}
                        placeholder="••••••••"
                        data-testid="input-client-secret"
                      />
                    </div>
                  </div>
                )}

                <div className="flex space-x-3">
                  {selectedSource.id === 'excel' ? (
                    <Button 
                      onClick={handleSaveConnection}
                      disabled={isConnecting || !connectionForm.name}
                      className="w-full"
                      data-testid="button-connect-excel"
                    >
                      {isConnecting ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Microsoft 로그인 중...</span>
                        </div>
                      ) : (
                        'Microsoft Excel 연결'
                      )}
                    </Button>
                  ) : selectedSource.id === 'google-sheets' ? (
                    <Button 
                      onClick={handleSaveConnection}
                      disabled={isConnecting || !connectionForm.name}
                      className="w-full"
                      data-testid="button-connect-google-sheets"
                    >
                      {isConnecting ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Google 로그인 중...</span>
                        </div>
                      ) : (
                        'Google Sheets 연결'
                      )}
                    </Button>
                  ) : (
                    <>
                      <Button 
                        variant="outline"
                        disabled={!connectionForm.name || !connectionForm.endpoint}
                        onClick={() => {
                          handleSaveConnection();
                        }}
                        data-testid="button-test-connection"
                      >
                        Test Connection
                      </Button>
                      <Button 
                        onClick={handleSaveConnection}
                        disabled={createDataSourceMutation.isPending || !connectionForm.name}
                        data-testid="button-save-connection"
                      >
                        {createDataSourceMutation.isPending ? 'Saving...' : 'Save & Continue'}
                      </Button>
                    </>
                  )}
                </div>

                {/* Connected Sources */}
                {connectedSources.length > 0 && (
                  <div className="border border-green-200 bg-green-50 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">Connection Successful</span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      {connectedSources.length} data source{connectedSources.length > 1 ? 's' : ''} connected.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Database className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>Please select a data source to connect</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Excel Files List */}
      {showExcelFiles && excelFiles.length > 0 && (
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Available Excel Files</CardTitle>
              <p className="text-sm text-gray-600">Select files to import data from</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {excelFiles.map((file) => (
                  <div
                    key={file.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      toast({ 
                        title: "파일 선택됨", 
                        description: `${file.name} 파일이 선택되었습니다.` 
                      });
                    }}
                    data-testid={`excel-file-${file.id}`}
                  >
                    <div className="flex items-center space-x-3">
                      <FileSpreadsheet className="h-8 w-8 text-green-600" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                        <p className="text-sm text-gray-500">
                          {Math.round(file.size / 1024)} KB • {new Date(file.lastModified).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Connected Sources List */}
      {dataSources.length > 0 && (
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Connected Data Sources</CardTitle>
              <p className="text-sm text-gray-600">Manage your active connections</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dataSources.map((dataSource: any) => (
                  <div key={dataSource.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded flex items-center justify-center ${
                        dataSource.status === 'connected' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {dataSource.type === 'excel' ? <FileSpreadsheet className="w-4 h-4" /> : <Database className="w-4 h-4" />}
                      </div>
                      <div>
                        <h4 className="text-sm font-medium">{dataSource.name}</h4>
                        <p className="text-xs text-gray-500">
                          {dataSource.type.toUpperCase()} • {dataSource.status}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {dataSource.status === 'connected' && (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestConnection(dataSource.id)}
                        disabled={testConnectionMutation.isPending}
                        data-testid={`button-test-${dataSource.id}`}
                      >
                        Test
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteDataSource(dataSource.id, dataSource.name)}
                        disabled={deleteDataSourceMutation.isPending}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        data-testid={`button-delete-${dataSource.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="mt-8 text-center">
        <Button onClick={onNext} disabled={connectedSources.length === 0} data-testid="button-continue">
          Continue to Data Mapping
        </Button>
      </div>
      
      <GoogleSheetsDialog 
        open={showGoogleSheetsDialog}
        onOpenChange={setShowGoogleSheetsDialog}
        onConnectionSuccess={() => {
          setShowGoogleSheetsDialog(false);
          setSelectedSource(null);
          queryClient.invalidateQueries({ queryKey: ['/api/data-sources'] });
          toast({ title: "Google Sheets 연결됨", description: "Google Sheets connection successful" });
        }}
      />
    </div>
  );
}