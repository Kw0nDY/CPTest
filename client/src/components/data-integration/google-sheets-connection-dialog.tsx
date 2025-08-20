import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { FileSpreadsheet, Calendar, Users, Eye, EyeOff, ChevronDown, ChevronRight, ArrowLeft, ArrowRight, Settings, CheckCircle, RefreshCw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { GoogleApiConfigDialog } from "./google-api-config-dialog";

// Google Sheets 데이터 미리보기 컴포넌트
function SheetDataPreview({ sheetId }: { sheetId: string }) {
  const { data: sheetData, isLoading } = useQuery({
    queryKey: ['/api/google/sheets', sheetId, 'data'],
    enabled: !!sheetId
  });

  if (isLoading) {
    return <div className="text-sm text-gray-500">데이터를 불러오는 중...</div>;
  }

  if (!sheetData?.worksheets?.length) {
    return <div className="text-sm text-gray-500">데이터가 없습니다.</div>;
  }

  return (
    <div className="pl-5 border-l-2 border-gray-200 dark:border-gray-700 space-y-3">
      {sheetData.worksheets.slice(0, 2).map((worksheet: any, idx: number) => (
        <div key={idx} className="text-sm">
          <div className="font-medium text-gray-800 dark:text-gray-200 mb-1">
            {worksheet.title} ({worksheet.totalRows} rows)
          </div>
          {worksheet.headers.length > 0 && (
            <div className="text-gray-600 dark:text-gray-400">
              Columns: {worksheet.headers.slice(0, 3).join(', ')}
              {worksheet.headers.length > 3 && ` +${worksheet.headers.length - 3} more`}
            </div>
          )}
        </div>
      ))}
      {sheetData.worksheets.length > 2 && (
        <div className="text-sm text-gray-500">
          +{sheetData.worksheets.length - 2} more worksheets
        </div>
      )}
    </div>
  );
}

interface Sheet {
  name: string;
  properties: {
    title: string;
    gridProperties: {
      rowCount: number;
      columnCount: number;
    };
  };
}

interface GoogleApiConfig {
  id: string;
  title: string;
  type: 'drive' | 'sheets';
  clientId: string;
  clientSecret: string;
  projectId?: string;
  apiKey?: string;
  scopes: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface GoogleSheetsConnectionDialogProps {
  trigger?: React.ReactNode;
  onConnect?: (dataSource: any) => void;
}

export function GoogleSheetsConnectionDialog({ trigger, onConnect }: GoogleSheetsConnectionDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<'google-login' | 'sheet-selection' | 'review'>(
    'google-login'
  );
  const [connectionData, setConnectionData] = useState<any>(null);
  const [selectedDriveConfig, setSelectedDriveConfig] = useState<GoogleApiConfig | null>(null);
  const [selectedSheetsConfig, setSelectedSheetsConfig] = useState<GoogleApiConfig | null>(null);
  const [config, setConfig] = useState({
    title: '',
    description: ''
  });
  const [expandedSheets, setExpandedSheets] = useState<Set<string>>(new Set());
  const [loadingSheets, setLoadingSheets] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get available Google Sheets from actual user's Google account
  const { data: sheetsResponse, isLoading: isSheetsLoading, refetch: refetchSheets } = useQuery({
    queryKey: ['/api/google/sheets'],
    enabled: currentStep === 'sheet-selection' && !!connectionData,
    retry: false,
    staleTime: 0, // Always fetch fresh data
    cacheTime: 0  // Don't cache results
  });
  
  const availableSheets = sheetsResponse?.sheets || [];

  // Get sheet data preview
  const { data: sheetData } = useQuery({
    queryKey: ['/api/google-sheets/data', selectedSheets],
    queryFn: async () => {
      if (selectedSheets.length === 0) return null;
      const response = await apiRequest('POST', '/api/google-sheets/data', {
        sheetIds: selectedSheets
      });
      return response.json();
    },
    enabled: currentStep === 'review' && selectedSheets.length > 0
  });

  // Connect mutation
  const connectMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/google-sheets/connect', data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "연결 성공",
        description: "Google Sheets가 성공적으로 연결되었습니다."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/data-sources'] });
      onConnect?.(data);
      setOpen(false);
      resetDialog();
    },
    onError: (error: any) => {
      toast({
        title: "연결 실패",
        description: error.message || "Google Sheets 연결에 실패했습니다.",
        variant: "destructive"
      });
    }
  });

  // Check existing login status when dialog opens
  const checkExistingLogin = async () => {
    try {
      const response = await apiRequest('GET', '/api/google/account');
      const accountData = await response.json();
      
      if (accountData && accountData.user_email) {
        setConnectionData(accountData);
        setCurrentStep('sheet-selection');
        // 새 계정으로 로그인했을 때 시트 목록 새로고침
        queryClient.invalidateQueries({ queryKey: ['/api/google/sheets'] });
        return true;
      }
    } catch (error) {
      // No existing login
      console.log('No existing Google login found');
    }
    return false;
  };

  // Effect to check login status when dialog opens
  useEffect(() => {
    if (open && currentStep === 'google-login' && !connectionData) {
      checkExistingLogin();
    }
  }, [open]);

  const resetDialog = () => {
    setCurrentStep('google-login');
    setSelectedSheets([]);
    setConnectionData(null);
    setSelectedDriveConfig(null);
    setSelectedSheetsConfig(null);
    setConfig({ title: '', description: '' });
    setExpandedSheets(new Set());
  };

  const handleNext = () => {
    if (currentStep === 'google-login') {
      setCurrentStep('sheet-selection');
    } else if (currentStep === 'sheet-selection') {
      setCurrentStep('review');
    }
  };

  const handleBack = () => {
    if (currentStep === 'sheet-selection') {
      setCurrentStep('google-login');
    } else if (currentStep === 'review') {
      setCurrentStep('sheet-selection');
    }
  };

  const handleConnect = () => {
    connectMutation.mutate({
      title: config.title,
      description: config.description,
      selectedSheets,
      driveConfig: selectedDriveConfig,
      sheetsConfig: selectedSheetsConfig,
      connectionData
    });
  };

  const handleRefreshSheets = async () => {
    setLoadingSheets(true);
    try {
      // 캐시 무효화 후 새로고침
      queryClient.invalidateQueries({ queryKey: ['/api/google/sheets'] });
      await refetchSheets();
    } catch (error) {
      console.error('Failed to refresh sheets:', error);
    } finally {
      setLoadingSheets(false);
    }
  };

  const getStepNumber = (step: string) => {
    // 3단계 프로세스: 구글 로그인 → 시트 선택 → 검토
    const steps = ['google-login', 'sheet-selection', 'review'];
    return steps.indexOf(step) + 1;
  };

  const getProgress = () => {
    return (getStepNumber(currentStep) / 3) * 100; // 3단계로 변경
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="w-full">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Google Sheets 연결
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Google Sheets 연결 설정
          </DialogTitle>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>단계 {getStepNumber(currentStep)} / 3</span>
            <span>{Math.round(getProgress())}% 완료</span>
          </div>
          <Progress value={getProgress()} className="w-full" />
        </div>

        {/* Step Navigation */}
        <div className="flex justify-between items-center text-sm">
          {['구글 로그인', '시트 선택', '검토'].map((stepName, index) => (
            <div key={stepName} className="flex items-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                index + 1 <= getStepNumber(currentStep) 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-500'
              }`}>
                {index + 1 < getStepNumber(currentStep) ? (
                  <CheckCircle className="w-3 h-3" />
                ) : (
                  index + 1
                )}
              </div>
              <span className={`ml-2 ${
                index + 1 === getStepNumber(currentStep) 
                  ? 'text-blue-600 font-medium' 
                  : index + 1 < getStepNumber(currentStep)
                    ? 'text-gray-900'
                    : 'text-gray-500'
              }`}>
                {stepName}
              </span>
              {index < 2 && (
                <ArrowRight className="w-4 h-4 mx-3 text-gray-300" />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {/* Step 1: Google Login */}
          {currentStep === 'google-login' && (
            <div className="space-y-6">
              {connectionData?.access_token ? (
                // 이미 로그인된 상태
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-2">Google 계정 로그인 완료</h3>
                  <p className="text-muted-foreground mb-6">
                    Google 계정으로 성공적으로 로그인되었습니다.
                  </p>
                  
                  <div className="space-y-4 max-w-md mx-auto">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-medium text-lg">
                          {connectionData?.user_name?.charAt(0) || connectionData?.user_email?.charAt(0) || 'G'}
                        </div>
                        <div className="text-left flex-1">
                          <p className="font-medium text-green-800">
                            {connectionData?.user_name || 'Google 사용자'}
                          </p>
                          <p className="text-sm text-green-600">
                            {connectionData?.user_email || 'user@example.com'}
                          </p>
                          <p className="text-xs text-green-500 mt-1">
                            Google Sheets 접근 권한 활성화됨
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <Button 
                        variant="outline"
                        onClick={async () => {
                          try {
                            await apiRequest('POST', '/api/google/logout');
                            setConnectionData(null);
                            setCurrentStep('google-login'); // 로그아웃 후 첫 단계로 이동
                            // 캐시된 시트 목록 무효화
                            queryClient.invalidateQueries({ queryKey: ['/api/google/sheets'] });
                            queryClient.invalidateQueries({ queryKey: ['/api/google/account'] });
                            toast({
                              title: "로그아웃 완료",
                              description: `${connectionData?.user_name || 'Google 계정'}에서 로그아웃되었습니다.`
                            });
                          } catch (error) {
                            toast({
                              title: "로그아웃 실패",
                              description: "로그아웃 중 오류가 발생했습니다.",
                              variant: "destructive"
                            });
                          }
                        }}
                        className="flex-1"
                      >
                        계정 변경
                      </Button>
                      
                      <Button 
                        onClick={handleNext}
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                      >
                        다음 단계로
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                // 로그인이 필요한 상태
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                    <FileSpreadsheet className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-2">Google 계정으로 로그인</h3>
                  <p className="text-muted-foreground mb-6">
                    Google Sheets에 접근하려면 Google 계정으로 로그인해주세요.
                  </p>
                  
                  <div className="space-y-4 max-w-md mx-auto">
                    <Button 
                      onClick={async () => {
                        try {
                          toast({
                            title: "Google 로그인 시작",
                            description: "Google 인증 페이지로 이동합니다..."
                          });
                          
                          // 실제 Google OAuth URL 가져오기
                          const response = await apiRequest('GET', '/auth/google/login');
                          const result = await response.json();
                          const { authUrl } = result;
                          
                          // 새 창에서 Google OAuth 페이지 열기
                          window.open(authUrl, '_blank', 'width=500,height=600');
                          
                          // 로그인 완료 확인을 위한 폴링
                          const checkAuthStatus = async () => {
                            try {
                              const response = await apiRequest('GET', '/api/google/account');
                              const accountResponse = await response.json();
                              setConnectionData(accountResponse);
                              toast({
                                title: "로그인 완료",
                                description: `${accountResponse.user_name}님, 환영합니다!`
                              });
                              setCurrentStep('sheet-selection');
                              clearInterval(authCheckInterval);
                            } catch (error) {
                              // 아직 로그인되지 않음
                            }
                          };
                          
                          const authCheckInterval = setInterval(checkAuthStatus, 2000);
                          
                          // 30초 후 폴링 중단
                          setTimeout(() => {
                            clearInterval(authCheckInterval);
                          }, 30000);
                          
                        } catch (error) {
                          toast({
                            title: "로그인 실패",
                            description: "Google 로그인에 실패했습니다.",
                            variant: "destructive"
                          });
                        }
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
                      size="lg"
                    >
                      <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Google로 로그인
                    </Button>
                    
                    <div className="text-xs text-muted-foreground">
                      Google Sheets 데이터에 안전하게 접근하기 위해 Google OAuth 2.0을 사용합니다.
                      로그인 후 스프레드시트 목록을 확인하고 연결할 수 있습니다.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Sheet Selection */}
          {currentStep === 'sheet-selection' && (
            <div className="space-y-6">
              <div className="text-center py-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">스프레드시트 선택</h3>
                    <p className="text-muted-foreground">
                      연결하고 싶은 Google Sheets를 선택하세요.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshSheets}
                    disabled={loadingSheets}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingSheets ? 'animate-spin' : ''}`} />
                    새로고침
                  </Button>
                </div>
              </div>

              {(isSheetsLoading || loadingSheets) ? (
                <div className="text-center py-8">
                  <div className="inline-flex items-center">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
                    Google Sheets를 불러오는 중...
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {availableSheets.length > 0 ? (
                    availableSheets.map((sheet: any, index: number) => (
                    <Card
                      key={sheet?.id || `sheet-${index}`}
                      className={`cursor-pointer transition-colors ${
                        selectedSheets.includes(sheet?.id || `sheet-${index}`)
                          ? 'ring-2 ring-blue-500 bg-blue-50'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        const sheetId = sheet?.id || `sheet-${index}`;
                        if (selectedSheets.includes(sheetId)) {
                          setSelectedSheets(selectedSheets.filter(id => id !== sheetId));
                        } else {
                          setSelectedSheets([...selectedSheets, sheetId]);
                        }
                      }}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Checkbox 
                              checked={selectedSheets.includes(sheet?.id || `sheet-${index}`)}
                              onCheckedChange={() => {}}
                            />
                            <div>
                              <CardTitle className="text-base">{sheet?.name || 'Untitled Sheet'}</CardTitle>
                              <CardDescription>
                                {sheet?.sheets?.length || 0}개 시트 • 마지막 수정: {
                                  sheet?.lastModified 
                                    ? new Date(sheet.lastModified).toLocaleDateString('ko-KR', {
                                        year: 'numeric',
                                        month: 'short', 
                                        day: 'numeric'
                                      })
                                    : '정보 없음'
                                }
                              </CardDescription>
                            </div>
                          </div>
                          <Badge variant="secondary">
                            {sheet?.sheets?.length || 0} 시트
                          </Badge>
                        </div>
                      </CardHeader>
                    </Card>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-muted-foreground">
                        {sheetsResponse?.error ? (
                          <div>
                            <p className="mb-2">{sheetsResponse.error}</p>
                            {sheetsResponse.helpMessage && (
                              <p className="text-sm">{sheetsResponse.helpMessage}</p>
                            )}
                          </div>
                        ) : (
                          <p>Google Sheets를 찾을 수 없습니다. Google 계정에 스프레드시트가 있는지 확인해주세요.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Review */}
          {currentStep === 'review' && (
            <div className="space-y-6">
              <div className="text-center py-4">
                <h3 className="text-xl font-semibold mb-2">연결 설정 검토</h3>
                <p className="text-muted-foreground">
                  설정을 확인하고 Google Sheets 연결을 완료하세요.
                </p>
              </div>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>연결 정보</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="font-medium">Google 계정</Label>
                        <p className="text-muted-foreground">{connectionData?.user_email || 'user@example.com'}</p>
                      </div>
                      <div>
                        <Label className="font-medium">선택된 시트</Label>
                        <p className="text-muted-foreground">{selectedSheets.length}개 스프레드시트</p>
                      </div>
                      <div>
                        <Label className="font-medium">연결 상태</Label>
                        <Badge variant="default" className="ml-2">준비 완료</Badge>
                      </div>
                      <div>
                        <Label className="font-medium">권한</Label>
                        <p className="text-muted-foreground">Google Sheets 읽기/쓰기</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="title">데이터 소스 이름 *</Label>
                      <Input
                        id="title"
                        value={config.title}
                        onChange={(e) => setConfig(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="예: 회사 Google Sheets, 마케팅 데이터, 매출 관리 시트"
                      />
                      <p className="text-xs text-muted-foreground">
                        이 Google Sheets 연결을 구별할 수 있는 이름을 입력하세요. 
                        나중에 데이터 소스 목록에서 이 이름으로 표시됩니다.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">설명 (선택사항)</Label>
                      <Input
                        id="description"
                        value={config.description}
                        onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="예: 2024년 매출 데이터, 고객 정보 관리, 재고 현황"
                      />
                      <p className="text-xs text-muted-foreground">
                        이 데이터 소스에 대한 추가 설명을 입력하세요 (선택사항).
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 'google-login'}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            이전
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                resetDialog();
              }}
            >
              취소
            </Button>

            {currentStep === 'review' ? (
              <Button
                onClick={handleConnect}
                disabled={connectMutation.isPending || !config.title}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {connectMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    연결 중...
                  </>
                ) : (
                  '연결 완료'
                )}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={currentStep === 'google-login' && !connectionData?.access_token}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
              >
                다음
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}