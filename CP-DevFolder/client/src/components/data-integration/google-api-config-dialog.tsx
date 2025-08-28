import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, TestTube, CheckCircle, XCircle, HelpCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { GoogleApiSetupGuide } from "./google-api-setup-guide";

interface GoogleApiConfig {
  id: string;
  title: string;
  type: 'drive' | 'sheets';
  clientId: string;
  clientSecret: string;
  projectId?: string;
  apiKey?: string;
  redirectUri?: string;
  scopes: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface GoogleApiConfigDialogProps {
  type: 'drive' | 'sheets';
  onSelect: (config: GoogleApiConfig) => void;
  selectedConfigId?: string;
}

export function GoogleApiConfigDialog({ type, onSelect, selectedConfigId }: GoogleApiConfigDialogProps) {
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [testingConfigId, setTestingConfigId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch existing configs
  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['/api/google-api-configs', { type }],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/google-api-configs?type=${type}`);
      return response.json();
    }
  });

  // Create new config mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/google-api-configs', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/google-api-configs'] });
      setIsCreating(false);
      toast({
        title: "API 설정 생성 완료",
        description: `${type === 'drive' ? 'Drive' : 'Sheets'} API 설정이 성공적으로 생성되었습니다.`
      });
    },
    onError: (error: any) => {
      toast({
        title: "생성 실패",
        description: error.message || "API 설정 생성에 실패했습니다.",
        variant: "destructive"
      });
    }
  });

  // Delete config mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/google-api-configs/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/google-api-configs'] });
      toast({
        title: "API 설정 삭제 완료",
        description: "API 설정이 성공적으로 삭제되었습니다."
      });
    }
  });

  // Test config mutation
  const testMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('POST', `/api/google-api-configs/${id}/test`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "API 설정 검증 성공",
        description: data.message || "API 설정이 유효합니다."
      });
    },
    onError: (error: any) => {
      toast({
        title: "API 설정 검증 실패",
        description: error.message || "API 설정이 유효하지 않습니다.",
        variant: "destructive"
      });
    },
    onSettled: () => {
      setTestingConfigId(null);
    }
  });

  const handleCreate = (formData: FormData) => {
    const data = {
      title: formData.get('title') as string,
      type,
      clientId: formData.get('clientId') as string,
      clientSecret: formData.get('clientSecret') as string,
      projectId: formData.get('projectId') as string || undefined,
      apiKey: formData.get('apiKey') as string || undefined,
      scopes: type === 'drive' 
        ? ['https://www.googleapis.com/auth/drive.metadata.readonly']
        : ['https://www.googleapis.com/auth/spreadsheets.readonly']
    };

    createMutation.mutate(data);
  };

  const handleTest = (configId: string) => {
    setTestingConfigId(configId);
    testMutation.mutate(configId);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          {type === 'drive' ? 'Drive API 선택' : 'Sheets API 선택'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {type === 'drive' ? 'Google Drive API 설정' : 'Google Sheets API 설정'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Existing Configs */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">기존 API 설정</h3>
              <div className="flex gap-2">
                <GoogleApiSetupGuide 
                  trigger={
                    <Button variant="outline" size="sm">
                      <HelpCircle className="w-4 h-4 mr-2" />
                      설정 가이드
                    </Button>
                  }
                />
                <Button 
                  onClick={() => setIsCreating(true)} 
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  신규 등록
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-4">API 설정을 불러오는 중...</div>
            ) : configs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                등록된 {type === 'drive' ? 'Drive' : 'Sheets'} API 설정이 없습니다.
              </div>
            ) : (
              <div className="grid gap-4">
                {configs.map((config: GoogleApiConfig) => (
                  <Card 
                    key={config.id} 
                    className={`cursor-pointer transition-colors ${
                      selectedConfigId === config.id 
                        ? 'ring-2 ring-blue-500 bg-blue-50' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => onSelect(config)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">{config.title}</CardTitle>
                          <CardDescription className="text-sm">
                            Client ID: {config.clientId.slice(0, 20)}...
                            {config.projectId && ` • Project: ${config.projectId}`}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={config.status === 'active' ? 'default' : 'secondary'}>
                            {config.status === 'active' ? 'Active' : 'Inactive'}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTest(config.id);
                            }}
                            disabled={testingConfigId === config.id}
                            data-testid={`button-test-${config.id}`}
                          >
                            {testingConfigId === config.id ? (
                              <div className="w-4 h-4 animate-spin border-2 border-current border-t-transparent rounded-full" />
                            ) : (
                              <TestTube className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteMutation.mutate(config.id);
                            }}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-${config.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Create New Config Form */}
          {isCreating && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>새 {type === 'drive' ? 'Drive' : 'Sheets'} API 설정 추가</CardTitle>
                    <CardDescription>
                      Google Cloud Console에서 생성한 OAuth 2.0 클라이언트 정보를 입력하세요.
                    </CardDescription>
                  </div>
                  <GoogleApiSetupGuide 
                    trigger={
                      <Button variant="outline" size="sm">
                        <HelpCircle className="w-4 h-4 mr-2" />
                        도움말
                      </Button>
                    }
                  />
                </div>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    handleCreate(formData);
                  }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title">API 설정 이름</Label>
                      <Input
                        id="title"
                        name="title"
                        placeholder={`예: 메인 ${type === 'drive' ? 'Drive' : 'Sheets'} API`}
                        required
                        data-testid="input-title"
                      />
                    </div>
                    <div>
                      <Label htmlFor="projectId">Project ID (선택사항)</Label>
                      <Input
                        id="projectId"
                        name="projectId"
                        placeholder="Google Cloud Project ID"
                        data-testid="input-project-id"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="clientId">Client ID *</Label>
                    <Input
                      id="clientId"
                      name="clientId"
                      placeholder="123456789-abcdef.apps.googleusercontent.com"
                      required
                      data-testid="input-client-id"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Google Cloud Console → API 및 서비스 → 사용자 인증 정보에서 확인 가능
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="clientSecret">Client Secret *</Label>
                    <Input
                      id="clientSecret"
                      name="clientSecret"
                      type="password"
                      placeholder="GOCSPX-..."
                      required
                      data-testid="input-client-secret"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      OAuth 2.0 클라이언트 ID 생성 시 다운로드한 JSON 파일에서 확인
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="apiKey">API Key (선택사항)</Label>
                    <Input
                      id="apiKey"
                      name="apiKey"
                      placeholder="AIza..."
                      data-testid="input-api-key"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      추가 보안을 위한 API 키 (선택사항)
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={createMutation.isPending}
                      data-testid="button-create-config"
                    >
                      {createMutation.isPending ? "생성 중..." : "API 설정 생성"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreating(false)}
                      data-testid="button-cancel-create"
                    >
                      취소
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}