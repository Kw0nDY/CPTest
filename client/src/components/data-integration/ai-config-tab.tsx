import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressIndicator } from "@/components/ui/progress-indicator";
import { CloudUpload, CheckCircle } from "lucide-react";
import { type AiModel } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ModelTestInput, ModelTestOutput } from "@/types/integration";

interface AiConfigTabProps {
  onNext: () => void;
  onPrev: () => void;
}

export default function AiConfigTab({ onNext, onPrev }: AiConfigTabProps) {
  const [modelForm, setModelForm] = useState({
    name: '고객 분류 모델 v1.0',
    type: 'classification',
    description: '고객사 데이터를 기반으로 고객 등급을 분류하는 모델',
    filePath: '/models/customer_classifier_v1.pkl',
  });

  const [testInput, setTestInput] = useState<ModelTestInput>({
    company_revenue: '50000000000',
    industry_type: 'Technology',
    employee_count: '1500',
  });

  const [testResult, setTestResult] = useState<ModelTestOutput | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: aiModels = [] } = useQuery<AiModel[]>({
    queryKey: ['/api/ai-models'],
  });

  const createModelMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/ai-models', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-models'] });
      toast({ title: "성공", description: "AI 모델이 저장되었습니다." });
    },
    onError: () => {
      toast({ title: "오류", description: "AI 모델 저장에 실패했습니다.", variant: "destructive" });
    },
  });

  const testModelMutation = useMutation({
    mutationFn: async ({ modelId, input }: { modelId: string; input: ModelTestInput }) => {
      const response = await apiRequest('POST', `/api/ai-models/${modelId}/test`, input);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setTestResult(data.prediction);
        toast({ title: "테스트 성공", description: "모델이 정상적으로 작동합니다." });
      }
    },
    onError: () => {
      toast({ title: "테스트 실패", description: "모델 테스트에 실패했습니다.", variant: "destructive" });
    },
  });

  const handleSaveModel = () => {
    const modelData = {
      ...modelForm,
      inputSchema: {
        company_revenue: { type: 'number', description: '회사 연매출 (단위: 원)' },
        industry_type: { type: 'string', description: '산업 분류 코드' },
        employee_count: { type: 'number', description: '직원 수' },
      },
      outputSchema: {
        customer_segment: { type: 'string', description: '고객 세그먼트: Premium, Standard, Basic' },
        confidence_score: { type: 'number', description: '예측 신뢰도 (0-1)' },
      },
      performanceMetrics: {
        accuracy: 0.942,
        f1_score: 0.918,
        log_loss: 0.045,
        inference_time: 2.3,
      },
      isActive: true,
    };

    createModelMutation.mutate(modelData);
  };

  const handleTestModel = () => {
    if (aiModels.length > 0) {
      const model = aiModels[0];
      testModelMutation.mutate({ modelId: model.id, input: testInput });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <ProgressIndicator 
        title="AI Model Configuration" 
        currentStep={4} 
        totalSteps={5}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Model Upload */}
        <Card>
          <CardHeader>
            <CardTitle>AI Model Upload</CardTitle>
            <p className="text-sm text-gray-600">Upload your trained model file</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File Upload Zone */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer">
              <CloudUpload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">Upload Model File</h4>
              <p className="text-sm text-gray-600 mb-4">Drag and drop or click to select file</p>
              <p className="text-xs text-gray-500">Supported formats: .pkl, .h5, .onnx, .pt (Max 500MB)</p>
            </div>

            {/* Model Information */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="model-name">Model Name</Label>
                <Input
                  id="model-name"
                  value={modelForm.name}
                  onChange={(e) => setModelForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Customer Classification Model v1.0"
                />
              </div>
              
              <div>
                <Label htmlFor="model-type">Model Type</Label>
                <Select
                  value={modelForm.type}
                  onValueChange={(value) => setModelForm(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="classification">Classification</SelectItem>
                    <SelectItem value="regression">Regression</SelectItem>
                    <SelectItem value="clustering">Clustering</SelectItem>
                    <SelectItem value="nlp">Natural Language Processing (NLP)</SelectItem>
                    <SelectItem value="computer_vision">Computer Vision</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="model-description">Description</Label>
                <Textarea
                  id="model-description"
                  value={modelForm.description}
                  onChange={(e) => setModelForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  placeholder="Describe the model's purpose and usage"
                />
              </div>
            </div>

            {/* Upload Progress */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">customer_classifier_v1.pkl</span>
              </div>
              <div className="w-full bg-green-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full w-full transition-all duration-500" />
              </div>
              <p className="text-xs text-green-700 mt-1">Upload Complete (2.3 MB)</p>
            </div>

            <Button onClick={handleSaveModel} disabled={createModelMutation.isPending} className="w-full">
              {createModelMutation.isPending ? 'Saving...' : 'Save Model'}
            </Button>
          </CardContent>
        </Card>

        {/* Model Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Model Configuration</CardTitle>
            <p className="text-sm text-gray-600">Define input/output schema</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Input Schema */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Input Schema</h4>
              <div className="space-y-3">
                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">company_revenue</span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">number</span>
                  </div>
                  <p className="text-xs text-gray-600">Company annual revenue (in currency)</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">industry_type</span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">string</span>
                  </div>
                  <p className="text-xs text-gray-600">Industry classification code</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">employee_count</span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">number</span>
                  </div>
                  <p className="text-xs text-gray-600">Number of employees</p>
                </div>
              </div>
            </div>

            {/* Output Schema */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Output Schema</h4>
              <div className="space-y-3">
                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">customer_segment</span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">string</span>
                  </div>
                  <p className="text-xs text-gray-600">Customer segment: Premium, Standard, Basic</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">confidence_score</span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">number</span>
                  </div>
                  <p className="text-xs text-gray-600">Prediction confidence (0-1)</p>
                </div>
              </div>
            </div>

            {/* Model Performance */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Model Performance Metrics</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded p-3 text-center">
                  <div className="text-lg font-semibold text-gray-900">94.2%</div>
                  <div className="text-xs text-gray-600">Accuracy</div>
                </div>
                <div className="bg-gray-50 rounded p-3 text-center">
                  <div className="text-lg font-semibold text-gray-900">91.8%</div>
                  <div className="text-xs text-gray-600">F1 Score</div>
                </div>
                <div className="bg-gray-50 rounded p-3 text-center">
                  <div className="text-lg font-semibold text-gray-900">0.045</div>
                  <div className="text-xs text-gray-600">Log Loss</div>
                </div>
                <div className="bg-gray-50 rounded p-3 text-center">
                  <div className="text-lg font-semibold text-gray-900">2.3ms</div>
                  <div className="text-xs text-gray-600">Inference Time</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Model Testing */}
      <Card>
        <CardHeader>
          <CardTitle>Model Testing</CardTitle>
          <p className="text-sm text-gray-600">Test the model with sample data</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Input Data */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Test Input</h4>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="test-revenue" className="text-xs text-gray-600">company_revenue</Label>
                  <Input
                    id="test-revenue"
                    type="number"
                    value={testInput.company_revenue}
                    onChange={(e) => setTestInput(prev => ({ ...prev, company_revenue: e.target.value }))}
                    placeholder="50000000000"
                  />
                </div>
                <div>
                  <Label htmlFor="test-industry" className="text-xs text-gray-600">industry_type</Label>
                  <Input
                    id="test-industry"
                    value={testInput.industry_type}
                    onChange={(e) => setTestInput(prev => ({ ...prev, industry_type: e.target.value }))}
                    placeholder="Technology"
                  />
                </div>
                <div>
                  <Label htmlFor="test-employees" className="text-xs text-gray-600">employee_count</Label>
                  <Input
                    id="test-employees"
                    type="number"
                    value={testInput.employee_count}
                    onChange={(e) => setTestInput(prev => ({ ...prev, employee_count: e.target.value }))}
                    placeholder="1500"
                  />
                </div>
              </div>
              <Button 
                onClick={handleTestModel} 
                disabled={testModelMutation.isPending || aiModels.length === 0}
                className="w-full mt-4"
              >
                {testModelMutation.isPending ? 'Running Model...' : 'Run Model'}
              </Button>
            </div>

            {/* Output Result */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Prediction Result</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                {testResult ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">customer_segment</span>
                      <span className="text-sm font-medium text-primary">{testResult.customer_segment}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">confidence_score</span>
                      <span className="text-sm font-medium text-green-600">{testResult.confidence_score}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center">Run the model to see results</p>
                )}
              </div>
              
              {testResult && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Test Successful</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">Model is working correctly.</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
Previous
        </Button>
        <Button onClick={onNext} disabled={aiModels.length === 0}>
Continue to BOI Settings
        </Button>
      </div>
    </div>
  );
}
