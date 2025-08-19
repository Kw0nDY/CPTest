import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ExternalLink, 
  FileSpreadsheet, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Key,
  Cloud,
  Database,
  Shield
} from "lucide-react";

interface MicrosoftExcelConnectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ExcelFile {
  id: string;
  name: string;
  lastModified: string;
  size: number;
  webUrl: string;
  worksheets?: string[];
  sampleData?: Record<string, any[]>;
}

interface ConnectionState {
  status: 'idle' | 'authorizing' | 'connected' | 'loading-files' | 'error';
  accessToken?: string;
  expiresAt?: string;
  error?: string;
  files?: ExcelFile[];
  selectedFiles?: string[];
}

export function MicrosoftExcelConnector({ open, onOpenChange, onSuccess }: MicrosoftExcelConnectorProps) {
  const [connection, setConnection] = useState<ConnectionState>({ status: 'idle' });
  const [clientId, setClientId] = useState('');
  const { toast } = useToast();

  // Check for existing tokens on mount
  useEffect(() => {
    if (open) {
      checkExistingConnection();
    }
  }, [open]);

  const checkExistingConnection = async () => {
    // Check if we have stored credentials
    try {
      const response = await fetch('/api/microsoft-excel/status');
      if (response.ok) {
        const data = await response.json();
        if (data.connected) {
          setConnection({
            status: 'connected',
            accessToken: data.accessToken,
            expiresAt: data.expiresAt
          });
          await loadExcelFiles(data.accessToken);
        }
      }
    } catch (error) {
      console.log('No existing connection found');
    }
  };

  const handleAuthorize = async () => {
    if (!clientId.trim()) {
      toast({
        title: "Client ID Required",
        description: "Please enter your Microsoft Application Client ID",
        variant: "destructive"
      });
      return;
    }

    setConnection({ status: 'authorizing' });

    try {
      // Step 1: Get authorization URL
      const response = await fetch('/api/microsoft-excel/authorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clientId })
      });

      if (!response.ok) {
        throw new Error('Failed to get authorization URL');
      }

      const { authUrl } = await response.json();

      // Step 2: Open authorization window
      const authWindow = window.open(
        authUrl,
        'microsoft-auth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      // Step 3: Listen for authorization completion
      const checkAuthCompletion = setInterval(async () => {
        try {
          if (authWindow?.closed) {
            clearInterval(checkAuthCompletion);
            
            // Check if authorization was successful
            const statusResponse = await fetch('/api/microsoft-excel/status');
            if (statusResponse.ok) {
              const data = await statusResponse.json();
              if (data.connected) {
                setConnection({
                  status: 'connected',
                  accessToken: data.accessToken,
                  expiresAt: data.expiresAt
                });
                
                toast({
                  title: "Authorization Successful",
                  description: "Connected to Microsoft Excel successfully!"
                });
                
                await loadExcelFiles(data.accessToken);
              } else {
                throw new Error('Authorization failed');
              }
            } else {
              throw new Error('Failed to verify authorization');
            }
          }
        } catch (error) {
          clearInterval(checkAuthCompletion);
          setConnection({ 
            status: 'error', 
            error: 'Authorization failed. Please try again.' 
          });
          
          toast({
            title: "Authorization Failed",
            description: "Failed to connect to Microsoft Excel. Please check your credentials and try again.",
            variant: "destructive"
          });
        }
      }, 1000);

    } catch (error) {
      setConnection({ 
        status: 'error', 
        error: 'Failed to start authorization process' 
      });
      
      toast({
        title: "Connection Error",
        description: "Failed to start Microsoft Excel authorization. Please try again.",
        variant: "destructive"
      });
    }
  };

  const loadExcelFiles = async (accessToken: string) => {
    setConnection(prev => ({ ...prev, status: 'loading-files' }));

    try {
      const response = await fetch('/api/microsoft-excel/files', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load Excel files');
      }

      const files = await response.json();
      
      setConnection(prev => ({
        ...prev,
        status: 'connected',
        files,
        selectedFiles: []
      }));

      toast({
        title: "Files Loaded",
        description: `Found ${files.length} Excel files in your OneDrive`
      });

    } catch (error) {
      setConnection(prev => ({
        ...prev,
        status: 'error',
        error: 'Failed to load Excel files'
      }));
      
      toast({
        title: "Loading Failed",
        description: "Failed to load Excel files from OneDrive",
        variant: "destructive"
      });
    }
  };

  const toggleFileSelection = (fileId: string) => {
    setConnection(prev => ({
      ...prev,
      selectedFiles: prev.selectedFiles?.includes(fileId)
        ? prev.selectedFiles.filter(id => id !== fileId)
        : [...(prev.selectedFiles || []), fileId]
    }));
  };

  const handleConnect = async () => {
    if (!connection.selectedFiles?.length) {
      toast({
        title: "No Files Selected",
        description: "Please select at least one Excel file to connect",
        variant: "destructive"
      });
      return;
    }

    try {
      const selectedFileData = connection.files?.filter(f => 
        connection.selectedFiles?.includes(f.id)
      );

      // Create data source with selected files
      const response = await fetch('/api/data-sources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `Microsoft Excel (${selectedFileData?.length} files)`,
          type: 'excel',
          category: 'cloud',
          vendor: 'Microsoft',
          status: 'connected',
          config: {
            connectionType: 'oauth',
            provider: 'microsoft',
            files: selectedFileData?.map(f => ({
              id: f.id,
              name: f.name,
              webUrl: f.webUrl,
              worksheets: f.worksheets || []
            })),
            accessToken: connection.accessToken,
            expiresAt: connection.expiresAt
          },
          connectionDetails: {
            provider: 'Microsoft Graph API',
            scope: 'Files.Read Sites.Read.All'
          },
          lastSync: new Date().toISOString()
        })
      });

      if (response.ok) {
        toast({
          title: "Data Source Created",
          description: "Microsoft Excel files have been successfully connected as a data source."
        });
        
        onSuccess();
        onOpenChange(false);
      } else {
        throw new Error('Failed to create data source');
      }

    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to create Microsoft Excel data source. Please try again.",
        variant: "destructive"
      });
    }
  };

  const disconnect = () => {
    setConnection({ status: 'idle' });
    setClientId('');
  };

  const renderContent = () => {
    switch (connection.status) {
      case 'idle':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Microsoft Application Setup
                </CardTitle>
                <CardDescription>
                  To connect to Microsoft Excel, you need to provide your Microsoft Application Client ID.
                  This enables secure OAuth 2.0 authentication to access your Excel files.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="client-id">Microsoft Application Client ID</Label>
                  <Input
                    id="client-id"
                    type="text"
                    placeholder="Enter your Client ID"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    data-testid="input-client-id"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    You can find this in your Azure App Registration
                  </p>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Required Permissions:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Files.Read - Read your Excel files</li>
                    <li>• Sites.Read.All - Access SharePoint sites</li>
                    <li>• User.Read - Read your profile</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleAuthorize} disabled={!clientId.trim()}>
                <Key className="h-4 w-4 mr-2" />
                Authorize Microsoft Excel
              </Button>
            </div>
          </div>
        );

      case 'authorizing':
        return (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Authorizing...</h3>
            <p className="text-gray-500">
              Please complete the authorization in the popup window
            </p>
          </div>
        );

      case 'loading-files':
        return (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Loading Excel Files...</h3>
            <p className="text-gray-500">
              Retrieving your Excel files from OneDrive
            </p>
          </div>
        );

      case 'connected':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-green-700">Connected to Microsoft Excel</h3>
                <p className="text-sm text-gray-500">
                  Select Excel files to include in your data source
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={disconnect}>
                Disconnect
              </Button>
            </div>

            {connection.files && connection.files.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {connection.files.map((file) => (
                  <Card 
                    key={file.id} 
                    className={`cursor-pointer transition-colors ${
                      connection.selectedFiles?.includes(file.id) 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => toggleFileSelection(file.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <FileSpreadsheet className="h-8 w-8 text-green-600" />
                          <div>
                            <p className="font-medium">{file.name}</p>
                            <p className="text-sm text-gray-500">
                              {new Date(file.lastModified).toLocaleDateString()} • {(file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <a 
                            href={file.webUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                          {connection.selectedFiles?.includes(file.id) && (
                            <CheckCircle className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileSpreadsheet className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No Excel files found in your OneDrive</p>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleConnect}
                disabled={!connection.selectedFiles?.length}
              >
                <Database className="h-4 w-4 mr-2" />
                Connect Selected Files ({connection.selectedFiles?.length || 0})
              </Button>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="text-center py-8">
            <XCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-red-700 mb-2">Connection Error</h3>
            <p className="text-gray-500 mb-4">{connection.error}</p>
            <Button onClick={() => setConnection({ status: 'idle' })}>
              Try Again
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Connect Microsoft Excel
          </DialogTitle>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}