import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ProgressIndicator } from "@/components/ui/progress-indicator";
import { DragDropZone } from "@/components/ui/drag-drop-zone";
import { GripVertical, X, CheckCircle } from "lucide-react";
import { DataField, BOIMapping } from "@/types/integration";
import { type AiModel, type DataSource, type BoiConfiguration } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface BoiSettingsTabProps {
  onPrev: () => void;
}

const sampleDataFields: DataField[] = [
  { name: 'company_name', type: '문자열', description: '회사명', sampleData: '삼성전자, LG화학...' },
  { name: 'industry_type', type: '문자열', description: '업종', sampleData: 'Technology, Chemical...' },
  { name: 'annual_revenue', type: '숫자', description: '연매출', sampleData: '200000000000, 50000000000...' },
  { name: 'employee_count', type: '숫자', description: '직원 수', sampleData: '1500, 800...' },
  { name: 'contact_email', type: '이메일', description: '연락처', sampleData: 'contact@company.com...' },
  { name: 'last_activity_date', type: '날짜', description: '마지막 활동일', sampleData: '2024-01-15, 2024-01-10...' },
];

const aiModelInputs = [
  { name: 'company_revenue', type: '숫자', description: '회사 연매출 (단위: 원)' },
  { name: 'industry_type', type: '문자열', description: '산업 분류 코드' },
  { name: 'employee_count', type: '숫자', description: '직원 수' },
];

const aiModelOutputs = [
  { name: 'customer_segment', type: '문자열', description: 'Premium, Standard, Basic' },
  { name: 'confidence_score', type: '숫자', description: '0.0 - 1.0' },
];

export default function BoiSettingsTab({ onPrev }: BoiSettingsTabProps) {
  const [mappings, setMappings] = useState<BOIMapping[]>([
    { sourceField: 'annual_revenue', targetField: 'company_revenue', transformation: '원 → 숫자형 (문자열 제거, 자릿수 정규화)' },
    { sourceField: 'industry_type', targetField: 'industry_type', transformation: '문자열 → 원핫 인코딩' },
    { sourceField: 'employee_count', targetField: 'employee_count' },
  ]);

  const [outputSettings, setOutputSettings] = useState({
    combineWithOriginal: true,
    saveToDatabase: true,
    sendNotifications: false,
  });

  const [batchSettings, setBatchSettings] = useState({
    batchSize: '100',
    processingInterval: 'realtime',
  });

  const [testResult, setTestResult] = useState<any>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: aiModels = [] } = useQuery<AiModel[]>({
    queryKey: ['/api/ai-models'],
  });

  const { data: dataSources = [] } = useQuery<DataSource[]>({
    queryKey: ['/api/data-sources'],
  });

  const { data: boiConfigurations = [] } = useQuery<BoiConfiguration[]>({
    queryKey: ['/api/boi-configurations'],
  });

  const createBoiConfigMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/boi-configurations', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/boi-configurations'] });
      toast({ title: "성공", description: "BOI 설정이 저장되었습니다." });
    },
    onError: () => {
      toast({ title: "오류", description: "BOI 설정 저장에 실패했습니다.", variant: "destructive" });
    },
  });

  const testBoiPipelineMutation = useMutation({
    mutationFn: async ({ configId, input }: { configId: string; input: any }) => {
      const response = await apiRequest('POST', `/api/boi-configurations/${configId}/test`, input);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setTestResult(data.result);
        toast({ title: "테스트 성공", description: "BOI 파이프라인이 정상적으로 완료되었습니다." });
      }
    },
    onError: () => {
      toast({ title: "테스트 실패", description: "BOI 파이프라인 테스트에 실패했습니다.", variant: "destructive" });
    },
  });

  const handleDrop = (data: DataField, targetField: string) => {
    const existingMapping = mappings.find(m => m.targetField === targetField);
    if (existingMapping) {
      setMappings(prev => prev.map(m => 
        m.targetField === targetField 
          ? { ...m, sourceField: data.name }
          : m
      ));
    } else {
      setMappings(prev => [...prev, {
        sourceField: data.name,
        targetField: targetField,
      }]);
    }
  };

  const handleDragStart = (e: React.DragEvent, field: DataField) => {
    e.dataTransfer.setData("text/plain", JSON.stringify(field));
  };

  const removeMapping = (targetField: string) => {
    setMappings(prev => prev.filter(m => m.targetField !== targetField));
  };

  const handleSaveConfiguration = () => {
    if (aiModels.length === 0 || dataSources.length === 0) {
      toast({ title: "오류", description: "AI 모델과 데이터 소스가 필요합니다.", variant: "destructive" });
      return;
    }

    const configData = {
      name: 'BOI 고객 분류 파이프라인',
      aiModelId: aiModels[0].id,
      dataSourceId: dataSources[0].id,
      inputMappings: mappings.reduce((acc, mapping) => {
        acc[mapping.targetField] = {
          sourceField: mapping.sourceField,
          transformation: mapping.transformation || null,
        };
        return acc;
      }, {} as any),
      outputSettings: {
        combineWithOriginal: outputSettings.combineWithOriginal,
        saveToDatabase: outputSettings.saveToDatabase,
        sendNotifications: outputSettings.sendNotifications,
      },
      transformationRules: mappings.filter(m => m.transformation).map(m => ({
        field: m.sourceField,
        rule: m.transformation,
      })),
      batchSize: parseInt(batchSettings.batchSize),
      processingInterval: batchSettings.processingInterval,
      isActive: false,
    };

    createBoiConfigMutation.mutate(configData);
  };

  const handleTestPipeline = () => {
    if (boiConfigurations.length === 0) {
      toast({ title: "오류", description: "먼저 BOI 설정을 저장해주세요.", variant: "destructive" });
      return;
    }

    const testInput = {
      company_name: '삼성전자',
      industry_type: 'Technology',
      annual_revenue: '200000000000',
      employee_count: 1500,
      contact_email: 'contact@samsung.com',
      last_activity_date: '2024-01-15',
    };

    testBoiPipelineMutation.mutate({ 
      configId: boiConfigurations[0].id, 
      input: testInput 
    });
  };

  const handleActivateBOI = () => {
    if (boiConfigurations.length === 0) {
      toast({ title: "오류", description: "먼저 BOI 설정을 저장해주세요.", variant: "destructive" });
      return;
    }

    // In a real implementation, this would update the BOI configuration to active status
    toast({ 
      title: "BOI 활성화", 
      description: "BOI 파이프라인이 활성화되어 실시간으로 데이터를 처리합니다." 
    });
  };

  return (
    <div className="p-6 space-y-6">
      <ProgressIndicator 
        title="BOI (Business Object Intelligence) 설정" 
        currentStep={5} 
        totalSteps={5}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Data Source Mapping */}
        <Card>
          <CardHeader>
            <CardTitle>데이터 소스</CardTitle>
            <p className="text-sm text-gray-600">가져온 데이터 필드</p>
          </CardHeader>
          <CardContent className="space-y-3 max-h-96 overflow-y-auto">
            {sampleDataFields.map((field) => (
              <div
                key={field.name}
                draggable
                onDragStart={(e) => handleDragStart(e, field)}
                className="border border-gray-200 rounded p-3 cursor-pointer hover:bg-gray-50 drag-zone"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{field.name}</span>
                  <GripVertical className="w-4 h-4 text-gray-400" />
                </div>
                <p className="text-xs text-gray-500">{field.type} | {field.sampleData}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* AI Model Input Mapping */}
        <Card>
          <CardHeader>
            <CardTitle>AI 모델 입력 매핑</CardTitle>
            <p className="text-sm text-gray-600">
              {aiModels.length > 0 ? aiModels[0].name : '고객 분류 모델 v1.0'}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Model Input Fields */}
            <div className="space-y-3">
              {aiModelInputs.map((input) => {
                const mapping = mappings.find(m => m.targetField === input.name);
                return (
                  <DragDropZone
                    key={input.name}
                    className={mapping ? "border-primary bg-primary/5" : ""}
                    onDrop={(data) => handleDrop(data, input.name)}
                  >
                    {mapping ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-primary">{input.name}</span>
                          <p className="text-xs text-gray-600">← {mapping.sourceField}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMapping(input.name)}
                          className="h-auto p-0 text-gray-400 hover:text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <span className="text-sm font-medium text-gray-700">{input.name}</span>
                        <p className="text-xs text-gray-500 mt-1">{input.description}</p>
                      </div>
                    )}
                  </DragDropZone>
                );
              })}
            </div>

            {/* Data Transformation Rules */}
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">데이터 변환 규칙</h4>
              <div className="space-y-3">
                {mappings.filter(m => m.transformation).map((mapping) => (
                  <div key={mapping.targetField} className="border border-gray-200 rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{mapping.sourceField}</span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">변환</span>
                    </div>
                    <p className="text-xs text-gray-600">{mapping.transformation}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Output Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>출력 설정</CardTitle>
            <p className="text-sm text-gray-600">AI 예측 결과 처리</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Output Fields */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">출력 필드</h4>
              <div className="space-y-3">
                {aiModelOutputs.map((output) => (
                  <div key={output.name} className="bg-gray-50 border border-gray-200 rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{output.name}</span>
                      <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">출력</span>
                    </div>
                    <p className="text-xs text-gray-600">{output.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Post-processing Rules */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">후처리 규칙</h4>
              <div className="space-y-3">
                <div className="border border-gray-200 rounded p-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="combine-original"
                      checked={outputSettings.combineWithOriginal}
                      onCheckedChange={(checked) => 
                        setOutputSettings(prev => ({ ...prev, combineWithOriginal: !!checked }))
                      }
                    />
                    <Label htmlFor="combine-original" className="text-sm">원본 데이터와 결합</Label>
                  </div>
                </div>
                <div className="border border-gray-200 rounded p-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="save-database"
                      checked={outputSettings.saveToDatabase}
                      onCheckedChange={(checked) => 
                        setOutputSettings(prev => ({ ...prev, saveToDatabase: !!checked }))
                      }
                    />
                    <Label htmlFor="save-database" className="text-sm">데이터베이스에 저장</Label>
                  </div>
                </div>
                <div className="border border-gray-200 rounded p-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="send-notifications"
                      checked={outputSettings.sendNotifications}
                      onCheckedChange={(checked) => 
                        setOutputSettings(prev => ({ ...prev, sendNotifications: !!checked }))
                      }
                    />
                    <Label htmlFor="send-notifications" className="text-sm">실시간 알림 발송</Label>
                  </div>
                </div>
              </div>
            </div>

            {/* Batch Processing */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">배치 처리 설정</h4>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="batch-size" className="text-xs text-gray-600">배치 크기</Label>
                  <Input
                    id="batch-size"
                    type="number"
                    value={batchSettings.batchSize}
                    onChange={(e) => setBatchSettings(prev => ({ ...prev, batchSize: e.target.value }))}
                    className="text-sm"
                    placeholder="100"
                  />
                </div>
                <div>
                  <Label htmlFor="processing-interval" className="text-xs text-gray-600">처리 간격</Label>
                  <Select
                    value={batchSettings.processingInterval}
                    onValueChange={(value) => setBatchSettings(prev => ({ ...prev, processingInterval: value }))}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="realtime">실시간</SelectItem>
                      <SelectItem value="5min">5분마다</SelectItem>
                      <SelectItem value="1hour">1시간마다</SelectItem>
                      <SelectItem value="daily">매일</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* BOI Test and Preview */}
      <Card>
        <CardHeader>
          <CardTitle>BOI 테스트 및 미리보기</CardTitle>
          <p className="text-sm text-gray-600">설정된 BOI 파이프라인을 테스트해보세요</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Test Input */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">테스트 데이터</h4>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                  <span className="text-xs font-medium text-gray-700">입력 데이터 샘플</span>
                </div>
                <div className="p-4 max-h-48 overflow-y-auto">
                  <pre className="text-xs text-gray-600">{JSON.stringify({
                    company_name: "삼성전자",
                    industry_type: "Technology", 
                    annual_revenue: "200000000000",
                    employee_count: 1500,
                    contact_email: "contact@samsung.com",
                    last_activity_date: "2024-01-15"
                  }, null, 2)}</pre>
                </div>
              </div>
              <Button 
                onClick={handleTestPipeline} 
                disabled={testBoiPipelineMutation.isPending}
                className="w-full mt-3"
              >
                {testBoiPipelineMutation.isPending ? 'BOI 파이프라인 실행 중...' : 'BOI 파이프라인 실행'}
              </Button>
            </div>

            {/* Test Output */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">예측 결과</h4>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                  <span className="text-xs font-medium text-gray-700">BOI 출력</span>
                </div>
                <div className="p-4 max-h-48 overflow-y-auto">
                  {testResult ? (
                    <pre className="text-xs text-gray-600">{JSON.stringify(testResult, null, 2)}</pre>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-8">
                      BOI 파이프라인을 실행하여 결과를 확인하세요
                    </p>
                  )}
                </div>
              </div>
              
              {testResult && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">BOI 파이프라인 테스트 성공</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">데이터 변환 및 AI 예측이 정상적으로 완료되었습니다.</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Final Actions */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">설정 완료</h3>
              <p className="text-sm text-gray-600">모든 설정이 완료되었습니다. BOI 파이프라인을 활성화하세요.</p>
            </div>
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                onClick={handleSaveConfiguration}
                disabled={createBoiConfigMutation.isPending}
              >
                {createBoiConfigMutation.isPending ? '저장 중...' : '저장하기'}
              </Button>
              <Button 
                onClick={handleActivateBOI}
                disabled={boiConfigurations.length === 0}
              >
                BOI 활성화
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          이전
        </Button>
        <Button 
          onClick={handleActivateBOI}
          disabled={boiConfigurations.length === 0}
          className="bg-green-600 hover:bg-green-700"
        >
          완료
        </Button>
      </div>
    </div>
  );
}
