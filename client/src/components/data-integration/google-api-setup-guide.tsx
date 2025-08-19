import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  HelpCircle, 
  ExternalLink, 
  Copy, 
  CheckCircle, 
  AlertCircle, 
  Info,
  ArrowRight,
  Settings,
  Key,
  Shield,
  FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GoogleApiSetupGuideProps {
  trigger?: React.ReactNode;
}

export function GoogleApiSetupGuide({ trigger }: GoogleApiSetupGuideProps) {
  const [open, setOpen] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const { toast } = useToast();

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      toast({
        title: "복사 완료",
        description: `${label}이(가) 클립보드에 복사되었습니다.`
      });
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {
      toast({
        title: "복사 실패",
        description: "클립보드 복사에 실패했습니다.",
        variant: "destructive"
      });
    }
  };

  const redirectUri = `${window.location.origin}/api/google-sheets/oauth/callback`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <HelpCircle className="w-4 h-4 mr-2" />
            설정 가이드
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Google API 설정 가이드
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">개요</TabsTrigger>
            <TabsTrigger value="console">콘솔 설정</TabsTrigger>
            <TabsTrigger value="credentials">인증 정보</TabsTrigger>
            <TabsTrigger value="troubleshooting">문제 해결</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Google API 설정이란?</h3>
              <p className="text-muted-foreground">
                Google Sheets와 Drive에 안전하게 접근하기 위해서는 Google Cloud Console에서 
                API 프로젝트를 생성하고 OAuth 2.0 인증 정보를 설정해야 합니다.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Key className="w-4 h-4" />
                      Drive API
                    </CardTitle>
                    <CardDescription>
                      Google Drive의 파일 목록과 메타데이터에 접근
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• 스프레드시트 파일 목록 조회</li>
                      <li>• 파일 권한 및 공유 정보</li>
                      <li>• 파일 생성/수정 날짜</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileText className="w-4 h-4" />
                      Sheets API
                    </CardTitle>
                    <CardDescription>
                      Google Sheets의 데이터를 읽고 분석
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• 시트 데이터 읽기</li>
                      <li>• 셀 범위 지정 조회</li>
                      <li>• 워크시트 구조 분석</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>중요:</strong> 각 API마다 별도의 설정이 필요하며, 동일한 Google Cloud 프로젝트에서 
                  두 API를 모두 활성화할 수 있습니다.
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>

          {/* Console Setup Tab */}
          <TabsContent value="console" className="space-y-6">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Google Cloud Console 설정</h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="min-w-fit">1</Badge>
                  <div className="space-y-2">
                    <h4 className="font-medium">Google Cloud Console 접속</h4>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open('https://console.cloud.google.com', '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Google Cloud Console 열기
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="min-w-fit">2</Badge>
                  <div className="space-y-2">
                    <h4 className="font-medium">새 프로젝트 생성 또는 기존 프로젝트 선택</h4>
                    <p className="text-sm text-muted-foreground">
                      상단의 프로젝트 선택 드롭다운에서 새 프로젝트를 클릭하거나 기존 프로젝트를 선택하세요.
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="min-w-fit">3</Badge>
                  <div className="space-y-2">
                    <h4 className="font-medium">API 및 서비스 라이브러리</h4>
                    <p className="text-sm text-muted-foreground">
                      좌측 메뉴에서 API 및 서비스 → 라이브러리로 이동하세요.
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="min-w-fit">4</Badge>
                  <div className="space-y-3">
                    <h4 className="font-medium">필요한 API 활성화</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Card className="p-4">
                        <h5 className="font-medium text-sm mb-2">Google Drive API</h5>
                        <p className="text-xs text-muted-foreground mb-2">
                          Google Drive API를 검색하고 사용을 클릭하세요
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open('https://console.cloud.google.com/apis/library/drive.googleapis.com', '_blank')}
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Drive API 페이지
                        </Button>
                      </Card>
                      <Card className="p-4">
                        <h5 className="font-medium text-sm mb-2">Google Sheets API</h5>
                        <p className="text-xs text-muted-foreground mb-2">
                          Google Sheets API를 검색하고 사용을 클릭하세요
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open('https://console.cloud.google.com/apis/library/sheets.googleapis.com', '_blank')}
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Sheets API 페이지
                        </Button>
                      </Card>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="min-w-fit">5</Badge>
                  <div className="space-y-2">
                    <h4 className="font-medium">OAuth 동의 화면 설정</h4>
                    <p className="text-sm text-muted-foreground">
                      "API 및 서비스" → "OAuth 동의 화면"에서 앱 정보를 설정하세요.
                    </p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      <li>User Type: 외부 선택</li>
                      <li>앱 이름: 원하는 앱 이름 입력</li>
                      <li>사용자 지원 이메일: 본인 이메일</li>
                      <li>승인된 도메인: 현재 웹사이트 도메인</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Credentials Tab */}
          <TabsContent value="credentials" className="space-y-6">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">OAuth 2.0 인증 정보 생성</h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="min-w-fit">1</Badge>
                  <div className="space-y-2">
                    <h4 className="font-medium">사용자 인증 정보 만들기</h4>
                    <p className="text-sm text-muted-foreground">
                      "API 및 서비스" → "사용자 인증 정보"에서 "+ 사용자 인증 정보 만들기" → "OAuth 클라이언트 ID"를 선택하세요.
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="min-w-fit">2</Badge>
                  <div className="space-y-3">
                    <h4 className="font-medium">애플리케이션 유형 설정</h4>
                    <Card className="p-4 bg-blue-50 border-blue-200">
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium">애플리케이션 유형:</p>
                          <Badge>웹 애플리케이션</Badge>
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-2">승인된 리디렉션 URI:</p>
                          <div className="flex items-center gap-2 p-2 bg-white rounded border">
                            <code className="text-sm flex-1 font-mono">{redirectUri}</code>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(redirectUri, 'Redirect URI')}
                            >
                              {copiedText === 'Redirect URI' ? (
                                <CheckCircle className="w-4 h-4" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            이 URI를 정확히 복사해서 Google Console에 입력하세요.
                          </p>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="min-w-fit">3</Badge>
                  <div className="space-y-2">
                    <h4 className="font-medium">인증 정보 다운로드</h4>
                    <p className="text-sm text-muted-foreground">
                      생성 완료 후 다음 정보를 기록해두세요:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Card className="p-4">
                        <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                          <Key className="w-4 h-4" />
                          Client ID
                        </h5>
                        <p className="text-xs text-muted-foreground">
                          예: 123456789-abcdefghijk.apps.googleusercontent.com
                        </p>
                      </Card>
                      <Card className="p-4">
                        <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          Client Secret
                        </h5>
                        <p className="text-xs text-muted-foreground">
                          예: GOCSPX-abcdefghijklmnop
                        </p>
                      </Card>
                    </div>
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>보안 주의사항:</strong> Client Secret는 절대 공개하지 마세요. 
                    이 정보가 노출되면 타인이 귀하의 Google 계정에 무단 접근할 수 있습니다.
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          </TabsContent>

          {/* Troubleshooting Tab */}
          <TabsContent value="troubleshooting" className="space-y-6">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">문제 해결</h3>
              
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">일반적인 오류와 해결 방법</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h5 className="font-medium text-sm mb-2">❌ "Invalid client: no application name"</h5>
                      <p className="text-sm text-muted-foreground">
                        OAuth 동의 화면에서 애플리케이션 이름을 설정하지 않았습니다. 
                        Google Cloud Console에서 OAuth 동의 화면을 완성하세요.
                      </p>
                    </div>

                    <Separator />

                    <div>
                      <h5 className="font-medium text-sm mb-2">❌ "redirect_uri_mismatch"</h5>
                      <p className="text-sm text-muted-foreground">
                        리디렉션 URI가 일치하지 않습니다. 위의 정확한 URI를 Google Console에 등록했는지 확인하세요.
                      </p>
                    </div>

                    <Separator />

                    <div>
                      <h5 className="font-medium text-sm mb-2">❌ "invalid_client"</h5>
                      <p className="text-sm text-muted-foreground">
                        Client ID 또는 Client Secret가 잘못되었습니다. 
                        Google Console에서 생성한 정보를 정확히 복사했는지 확인하세요.
                      </p>
                    </div>

                    <Separator />

                    <div>
                      <h5 className="font-medium text-sm mb-2">❌ API 접근 거부</h5>
                      <p className="text-sm text-muted-foreground">
                        Drive API와 Sheets API가 활성화되지 않았습니다. 
                        Google Cloud Console에서 두 API를 모두 활성화하세요.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">테스트 방법</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Badge variant="outline" className="min-w-fit">1</Badge>
                      <p className="text-sm">API 설정을 저장한 후 "테스트" 버튼을 클릭하세요.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge variant="outline" className="min-w-fit">2</Badge>
                      <p className="text-sm">Google 로그인 페이지가 정상적으로 열리는지 확인하세요.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge variant="outline" className="min-w-fit">3</Badge>
                      <p className="text-sm">권한 승인 후 성공 메시지가 표시되는지 확인하세요.</p>
                    </div>
                  </CardContent>
                </Card>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    여전히 문제가 해결되지 않는다면, Google Cloud Console의 로그를 확인하거나 
                    Google API 문서를 참조하시기 바랍니다.
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={() => setOpen(false)}>
            닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}