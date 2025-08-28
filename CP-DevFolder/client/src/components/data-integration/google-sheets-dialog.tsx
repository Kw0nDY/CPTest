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
  Link,
  Eye,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
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
        title: "Authentication Error",
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
        
        // Show a note if sheets are available
        if (result.sheets && result.sheets.length > 0) {
          toast({
            title: "Google Sheets Loaded",
            description: `Found ${result.sheets.length} spreadsheet(s).`,
            variant: "default"
          });
        }
      } else if (result.needsDriveApi) {
        toast({
          title: "API Limitation",
          description: "Google Drive API is required. Please enable it in Google Cloud Console.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Failed to load sheets:', error);
      
      let description = "Failed to connect to Google Sheets API.";
      
      // Handle specific API error responses
      if (error.error && error.needsDriveApi) {
        description = "Google Sheets API is disabled. Please enable it in Google Cloud Console.";
      } else if (error.message) {
        description = error.message;
      }
      
      toast({
        title: "API Connection Failed", 
        description: description,
        variant: "destructive"
      });
    }
  };

  const handleConnectSheets = async () => {
    if (selectedSheets.length === 0) {
      toast({
        title: "Sheet Selection Required",
        description: "Please select one or more Google Sheets to connect.",
        variant: "destructive"
      });
      return;
    }

    setIsConnecting(true);
    
    try {
      // Use the new Google Sheets connect endpoint that loads actual data
      const response = await apiRequest('POST', '/api/google-sheets/connect', {
        selectedSheets: selectedSheets
      });

      const result = await response.json();

      if (result.success) {
        await queryClient.invalidateQueries({ queryKey: ['/api/data-sources'] });
        
        toast({
          title: "Google Sheets Connected",
          description: result.message || `${selectedSheets.length} spreadsheet(s) connected successfully.`
        });
        
        onSuccess?.();
        onOpenChange(false);
      } else {
        throw new Error(result.error || 'Connection failed');
      }
      
    } catch (error) {
      console.error('Failed to connect sheets:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Google Sheets.",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };



  const handleSheetToggle = (sheetId: string) => {
    setSelectedSheets(prev => 
      prev.includes(sheetId) 
        ? prev.filter(id => id !== sheetId)
        : [...prev, sheetId]
    );
  };

  // Sheet Preview Component
  const SheetPreviewCard = ({ sheet, isSelected, onToggle }: {
    sheet: GoogleSheet;
    isSelected: boolean;
    onToggle: () => void;
  }) => {
    const [showPreview, setShowPreview] = useState(false);
    const [selectedWorksheet, setSelectedWorksheet] = useState(sheet.sheets[0] || '');
    
    const { data: previewData, isLoading: isLoadingPreview } = useQuery({
      queryKey: ['/api/google-sheets', sheet.id, 'data', selectedWorksheet],
      queryFn: async () => {
        const response = await apiRequest('GET', `/api/google-sheets/${sheet.id}/data?sheetName=${encodeURIComponent(selectedWorksheet)}`);
        return response.json();
      },
      enabled: showPreview && authStatus === 'authorized' && selectedWorksheet.length > 0,
      retry: false
    });
    
    return (
      <Card className={`transition-all duration-200 ${
        isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
      }`}>
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Sheet Header */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={onToggle}
                className="w-4 h-4 rounded border-gray-300"
              />
              <FileSpreadsheet className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{sheet.name}</p>
                <p className="text-sm text-gray-600">
                  {sheet.sheets.length} worksheet(s) • Modified: {new Date(sheet.lastModified).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowPreview(!showPreview)}
                  className="h-8"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Preview
                  {showPreview ? 
                    <ChevronUp className="w-3 h-3 ml-1" /> : 
                    <ChevronDown className="w-3 h-3 ml-1" />
                  }
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => window.open(sheet.url, '_blank')}
                  className="h-8"
                >
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            </div>
            
            {/* Data Preview */}
            {showPreview && (
              <div className="border-t pt-3 space-y-3">
                {/* Worksheet Selection */}
                {sheet.sheets.length > 1 && (
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium">Worksheet:</Label>
                    <select 
                      value={selectedWorksheet}
                      onChange={(e) => setSelectedWorksheet(e.target.value)}
                      className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
                    >
                      {sheet.sheets.map((worksheetName) => (
                        <option key={worksheetName} value={worksheetName}>
                          {worksheetName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                {/* Preview Data */}
                {isLoadingPreview ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span className="text-sm text-gray-600">Loading data...</span>
                  </div>
                ) : previewData?.success ? (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">
                      "{selectedWorksheet}" Data Preview ({previewData.data.totalRows} rows)
                    </div>
                    <div className="bg-gray-50 rounded-md p-3 max-h-48 overflow-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-200">
                            {previewData.data.headers?.slice(0, 5).map((header: string, index: number) => (
                              <th key={index} className="text-left p-1 font-medium text-gray-700">
                                {header || `Column${index + 1}`}
                              </th>
                            ))}
                            {previewData.data.headers?.length > 5 && (
                              <th className="text-left p-1 font-medium text-gray-500">...</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.data.rows?.slice(0, 3).map((row: any, index: number) => (
                            <tr key={index} className="border-b border-gray-100">
                              {previewData.data.headers?.slice(0, 5).map((header: string, colIndex: number) => (
                                <td key={colIndex} className="p-1 text-gray-600 truncate max-w-20">
                                  {row[header] || '-'}
                                </td>
                              ))}
                              {previewData.data.headers?.length > 5 && (
                                <td className="p-1 text-gray-400">...</td>
                              )}
                            </tr>
                          ))}
                          {previewData.data.rows?.length > 3 && (
                            <tr>
                              <td colSpan={Math.min(previewData.data.headers?.length || 0, 6)} 
                                  className="p-1 text-center text-gray-400 text-xs">
                                ... {previewData.data.rows.length - 3} more rows
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-3 text-sm text-red-600">
                    <AlertCircle className="w-4 h-4 mx-auto mb-1" />
                    Cannot load preview
                    <div className="text-xs text-gray-500 mt-1">
                      {previewData?.error || "An error occurred while loading data"}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            Google Sheets Connection
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
                <h3 className="text-lg font-semibold mb-2">Sign in with Google Account</h3>
                <p className="text-gray-600 mb-4">
                  To access Google Sheets, please first sign in with your Google account.
                </p>
                <Button onClick={handleGoogleAuth} className="bg-blue-600 hover:bg-blue-700">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Sign in with Google Account
                </Button>
              </div>
            </div>
          )}

          {/* Authorizing Step */}
          {authStatus === 'authorizing' && (
            <div className="text-center space-y-4">
              <Progress value={50} className="w-full" />
              <div>
                <h3 className="text-lg font-semibold mb-2">Authentication in progress...</h3>
                <p className="text-gray-600">
                  Please complete Google account authentication in the popup window.
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



              {/* Sheets Selection */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Select Google Sheets</h3>
                  <Button onClick={loadGoogleSheets} variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>

                {sheets.length > 0 ? (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {sheets.map((sheet) => (
                      <SheetPreviewCard 
                        key={sheet.id}
                        sheet={sheet}
                        isSelected={selectedSheets.includes(sheet.id)}
                        onToggle={() => handleSheetToggle(sheet.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No available Google Sheets found.</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button onClick={onOpenChange.bind(null, false)} variant="outline" className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={handleConnectSheets} 
                  disabled={selectedSheets.length === 0 || isConnecting}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {isConnecting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Connect Google Sheets ({selectedSheets.length})
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