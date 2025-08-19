import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  FileSpreadsheet, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink,
  RefreshCw,
  User,
  Plus,
  Link
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface GoogleSheetsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface GoogleAccount {
  email: string;
  name: string;
  picture: string;
}

interface GoogleSheet {
  id: string;
  name: string;
  url: string;
  sheets: string[];
  lastModified: string;
}

export function GoogleSheetsDialog({ open, onOpenChange, onSuccess }: GoogleSheetsDialogProps) {
  const [authStatus, setAuthStatus] = useState<'idle' | 'authorizing' | 'authorized' | 'error'>('idle');
  const [account, setAccount] = useState<GoogleAccount | null>(null);
  const [sheets, setSheets] = useState<GoogleSheet[]>([]);
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState<boolean>(false);
  const [manualUrl, setManualUrl] = useState<string>("");
  const { toast } = useToast();

  const handleGoogleAuth = async () => {
    setAuthStatus('authorizing');
    console.log('Starting Google OAuth flow...');
    
    try {
      // Initiate Google OAuth flow
      const response = await apiRequest('POST', '/api/google-sheets/auth', {});
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Auth response:', result);
      
      if (result.authUrl) {
        console.log('Opening popup with URL:', result.authUrl);
        
        // Open Google OAuth in popup window
        const authWindow = window.open(
          result.authUrl, 
          'google-auth', 
          'width=500,height=600,scrollbars=yes,resizable=yes'
        );
        
        console.log('Popup window opened:', !!authWindow);
        
        if (!authWindow) {
          throw new Error('팝업이 차단되었습니다. 브라우저에서 팝업을 허용해주세요.');
        }

        // Listen for messages from the popup window
        const handleMessage = async (event: MessageEvent) => {
          if (event.source !== authWindow) return;
          
          if (event.data.type === 'google-auth-success') {
            window.removeEventListener('message', handleMessage);
            
            setAccount(event.data.account);
            setAuthStatus('authorized');
            await loadGoogleSheets();
            
            toast({
              title: "Google 계정 연결 완료",
              description: `${event.data.account.email}로 성공적으로 연결되었습니다.`
            });
          } else if (event.data.type === 'google-auth-error') {
            window.removeEventListener('message', handleMessage);
            
            setAuthStatus('error');
            toast({
              title: "인증 실패",
              description: event.data.error || "Google 계정 연결에 실패했습니다.",
              variant: "destructive"
            });
          }
        };

        window.addEventListener('message', handleMessage);

        // Also check if window is closed without auth
        const checkClosed = setInterval(() => {
          if (authWindow?.closed) {
            clearInterval(checkClosed);
            window.removeEventListener('message', handleMessage);
            
            // Only set error if not already authorized
            if (authStatus === 'authorizing') {
              setAuthStatus('error');
              toast({
                title: "인증 취소됨",
                description: "Google 인증이 취소되었습니다.",
                variant: "destructive"
              });
            }
          }
        }, 1000);

      } else {
        throw new Error('Auth URL not received from server');
      }
    } catch (error) {
      console.error('Google auth error:', error);
      setAuthStatus('error');
      
      let errorMessage = "Google 인증을 시작할 수 없습니다.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "인증 오류",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const loadGoogleSheets = async () => {
    try {
      // Add timestamp to prevent caching
      const timestamp = Date.now();
      const response = await apiRequest('GET', `/api/google-sheets/list?t=${timestamp}`);
      const result = await response.json();
      
      if (result.success) {
        setSheets(result.sheets || []);
        
        // If API has issues or no sheets found, enable manual input
        if (result.needsManualInput || result.error || result.sheets.length === 0) {
          setShowUrlInput(true);
          toast({
            title: "직접 URL 입력 가능",
            description: result.helpMessage || "Google Sheets URL을 직접 입력하여 연결할 수 있습니다.",
            variant: "default"
          });
        }
      } else if (result.needsDriveApi) {
        setShowUrlInput(true);
        toast({
          title: "API 제한",
          description: "Google Sheets API가 제한되어 있습니다. 직접 URL을 입력해주세요.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Failed to load sheets:', error);
      setShowUrlInput(true);
      
      let description = "Google Sheets API 연결이 실패했습니다. 직접 URL을 입력하여 연결할 수 있습니다.";
      
      // Handle specific API error responses
      if (error.error && error.needsDriveApi) {
        description = "Google Sheets API가 비활성화되어 있습니다. 직접 URL을 입력해주세요.";
      } else if (error.message) {
        description = `${error.message} 직접 URL을 입력하여 연결할 수 있습니다.`;
      }
      
      toast({
        title: "API 연결 실패", 
        description: description,
        variant: "destructive"
      });
    }
  };

  const handleConnectSheets = async () => {
    if (selectedSheets.length === 0) {
      toast({
        title: "시트 선택 필요",
        description: "연결할 Google Sheets를 하나 이상 선택해주세요.",
        variant: "destructive"
      });
      return;
    }

    setIsConnecting(true);
    
    try {
      const response = await apiRequest('POST', '/api/data-sources', {
        id: `google-sheets-${Date.now()}`,
        name: `Google Sheets - ${account?.email}`,
        type: 'google-sheets',
        category: 'file',
        vendor: 'Google',
        status: 'connected',
        config: {
          account: account,
          selectedSheets: selectedSheets,
          sheets: sheets.filter(sheet => selectedSheets.includes(sheet.id))
        },
        connectionDetails: {
          account: account?.email,
          sheetsCount: selectedSheets.length,
          authType: 'OAuth 2.0'
        },
        recordCount: 0
      });

      await queryClient.invalidateQueries({ queryKey: ['/api/data-sources'] });
      
      toast({
        title: "Google Sheets 연결 완료",
        description: `${selectedSheets.length}개의 스프레드시트가 성공적으로 연결되었습니다.`
      });
      
      onSuccess?.();
      onOpenChange(false);
      
    } catch (error) {
      console.error('Failed to connect sheets:', error);
      toast({
        title: "연결 실패",
        description: "Google Sheets 연결에 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleManualUrlAdd = async () => {
    if (!manualUrl.trim()) {
      toast({
        title: "URL 필요",
        description: "Google Sheets URL을 입력해주세요.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Check URL format first
      const match = manualUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (!match) {
        toast({
          title: "잘못된 URL",
          description: "올바른 Google Sheets URL을 입력해주세요. 예: https://docs.google.com/spreadsheets/d/[ID]/edit",
          variant: "destructive"
        });
        return;
      }
      
      const spreadsheetId = match[1];
      
      // Check if already exists
      const existingSheet = sheets.find(s => s.id === spreadsheetId);
      if (existingSheet) {
        toast({
          title: "이미 추가됨",
          description: "이 Google Sheets는 이미 목록에 있습니다.",
          variant: "destructive"
        });
        return;
      }
      
      // Try to extract name from URL or use default
      let sheetName = `Google Sheet (${spreadsheetId.substring(0, 8)}...)`;
      
      // Add the sheet to the list immediately
      const newSheet: GoogleSheet = {
        id: spreadsheetId,
        name: sheetName,
        url: manualUrl,
        sheets: ["Sheet1"], // Default sheet name
        lastModified: new Date().toISOString()
      };
      
      setSheets(prev => [...prev, newSheet]);
      setSelectedSheets(prev => [...prev, spreadsheetId]); // Auto-select the new sheet
      setManualUrl("");
      
      toast({
        title: "시트 추가 완료",
        description: "Google Sheets가 목록에 추가되고 선택되었습니다.",
      });
      
    } catch (error) {
      console.error('Error adding manual URL:', error);
      toast({
        title: "시트 추가 실패",
        description: "Google Sheets URL을 추가할 수 없습니다.",
        variant: "destructive"
      });
    }
  };

  const handleSheetToggle = (sheetId: string) => {
    setSelectedSheets(prev => 
      prev.includes(sheetId) 
        ? prev.filter(id => id !== sheetId)
        : [...prev, sheetId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            Google Sheets 연결
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Authentication Step */}
          {authStatus === 'idle' && (
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <FileSpreadsheet className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Google 계정으로 로그인</h3>
                <p className="text-gray-600 mb-4">
                  Google Sheets에 액세스하려면 먼저 Google 계정으로 로그인해주세요.
                </p>
                <Button onClick={handleGoogleAuth} className="bg-blue-600 hover:bg-blue-700">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Google 계정으로 로그인
                </Button>
              </div>
            </div>
          )}

          {/* Authorizing Step */}
          {authStatus === 'authorizing' && (
            <div className="text-center space-y-4">
              <Progress value={50} className="w-full" />
              <div>
                <h3 className="text-lg font-semibold mb-2">인증 진행 중...</h3>
                <p className="text-gray-600">
                  팝업 창에서 Google 계정 인증을 완료해주세요.
                </p>
              </div>
            </div>
          )}

          {/* Error Step */}
          {authStatus === 'error' && (
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">인증 실패</h3>
                <p className="text-gray-600 mb-4">
                  Google 계정 연결에 실패했습니다. 다시 시도해주세요.
                </p>
                <Button onClick={handleGoogleAuth} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  다시 시도
                </Button>
              </div>
            </div>
          )}

          {/* Authorized - Sheet Selection */}
          {authStatus === 'authorized' && account && (
            <div className="space-y-4">
              {/* Account Info */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{account.name}</p>
                      <p className="text-sm text-gray-600">{account.email}</p>
                    </div>
                    <Badge variant="secondary" className="ml-auto bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Connected
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* API Help Card */}
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-3">
                      <div>
                        <h4 className="font-medium text-amber-800">Google Drive API 활성화 필요</h4>
                        <p className="text-sm text-amber-700 mt-1">
                          Google Sheets 목록을 자동으로 가져오려면 Google Drive API를 활성화해야 합니다.
                        </p>
                      </div>
                      
                      <div className="text-sm text-amber-700">
                        <p className="font-medium mb-2">활성화 방법:</p>
                        <ol className="list-decimal list-inside space-y-1 text-xs">
                          <li>
                            <a 
                              href="https://console.cloud.google.com/apis/library/drive.googleapis.com" 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-blue-600 underline hover:text-blue-800"
                            >
                              Google Cloud Console
                            </a>에서 Google Drive API 페이지로 이동
                          </li>
                          <li>프로젝트 선택 후 "사용 설정" 클릭</li>
                          <li>페이지 새로고침 후 다시 시도</li>
                        </ol>
                      </div>
                      
                      <div className="pt-2 border-t border-amber-300">
                        <p className="text-sm font-medium text-amber-800 mb-2">대안: 직접 URL 입력</p>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-amber-300 text-amber-800 hover:bg-amber-100"
                          onClick={() => setShowUrlInput(!showUrlInput)}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          {showUrlInput ? "URL 입력 취소" : "직접 URL 추가"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Manual URL Input */}
              {showUrlInput && (
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Link className="w-4 h-4 text-blue-600" />
                        <h4 className="font-medium">Google Sheets URL 직접 입력</h4>
                      </div>
                      
                      <div>
                        <Label htmlFor="manual-url" className="text-sm text-gray-700">Google Sheets URL</Label>
                        <Input
                          id="manual-url"
                          placeholder="https://docs.google.com/spreadsheets/d/..."
                          value={manualUrl}
                          onChange={(e) => setManualUrl(e.target.value)}
                          className="mt-1"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          예: https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
                        </p>
                      </div>
                      
                      <Button 
                        size="sm" 
                        onClick={handleManualUrlAdd}
                        disabled={!manualUrl.trim()}
                        className="w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        시트 추가
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Sheets Selection */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Google Sheets 선택</h3>
                  <Button onClick={loadGoogleSheets} variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    새로고침
                  </Button>
                </div>

                {sheets.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {sheets.map((sheet) => (
                      <Card 
                        key={sheet.id} 
                        className={`cursor-pointer transition-colors ${
                          selectedSheets.includes(sheet.id) 
                            ? 'ring-2 ring-blue-500 bg-blue-50' 
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => handleSheetToggle(sheet.id)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selectedSheets.includes(sheet.id)}
                              onChange={() => handleSheetToggle(sheet.id)}
                              className="w-4 h-4"
                            />
                            <FileSpreadsheet className="w-5 h-5 text-green-600 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{sheet.name}</p>
                              <p className="text-sm text-gray-600">
                                {sheet.sheets.length} 워크시트 • 수정일: {new Date(sheet.lastModified).toLocaleDateString()}
                              </p>
                            </div>
                            <ExternalLink className="w-4 h-4 text-gray-400" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>사용 가능한 Google Sheets가 없습니다.</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button onClick={onOpenChange.bind(null, false)} variant="outline" className="flex-1">
                  취소
                </Button>
                <Button 
                  onClick={handleConnectSheets} 
                  disabled={selectedSheets.length === 0 || isConnecting}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {isConnecting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      연결 중...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Google Sheets 연결 ({selectedSheets.length})
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}