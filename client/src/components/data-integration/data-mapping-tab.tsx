import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ProgressIndicator } from "@/components/ui/progress-indicator";
import { DragDropZone } from "@/components/ui/drag-drop-zone";
import { GripVertical, X } from "lucide-react";
import { DataField } from "@/types/integration";

interface DataMappingTabProps {
  onNext: () => void;
  onPrev: () => void;
}

const sampleSourceFields: DataField[] = [
  { name: 'Account.Name', type: 'string', description: 'Company Name' },
  { name: 'Account.Industry', type: 'string', description: 'Industry' },
  { name: 'Account.Revenue', type: 'number', description: 'Annual Revenue' },
  { name: 'Contact.Email', type: 'email', description: 'Contact Email' },
  { name: 'Opportunity.Amount', type: 'currency', description: 'Opportunity Amount' },
];

interface MappedField {
  id: string;
  sourceField: string;
  targetField: string;
  type: string;
}

export default function DataMappingTab({ onNext, onPrev }: DataMappingTabProps) {
  const [mappedFields, setMappedFields] = useState<MappedField[]>([
    { id: '1', sourceField: 'Account.Name', targetField: 'company_name', type: 'string' },
    { id: '2', sourceField: 'Account.Industry', targetField: 'industry_type', type: 'string' },
  ]);

  const [transformationRules, setTransformationRules] = useState({
    filterField: 'Account.Industry',
    filterOperator: 'equals',
    filterValue: '',
    groupByField: '',
    sortField: 'Account.Revenue',
    sortOrder: 'desc',
  });

  const { data: dataSources = [] } = useQuery({
    queryKey: ['/api/data-sources'],
  });

  const handleDrop = (data: any) => {
    const newField: MappedField = {
      id: Date.now().toString(),
      sourceField: data.name,
      targetField: data.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      type: data.type,
    };
    setMappedFields(prev => [...prev, newField]);
  };

  const handleDragStart = (e: React.DragEvent, field: DataField) => {
    e.dataTransfer.setData("text/plain", JSON.stringify(field));
  };

  const removeMapping = (id: string) => {
    setMappedFields(prev => prev.filter(f => f.id !== id));
  };

  const sampleData = [
    { company_name: 'Samsung Electronics', industry_type: 'Technology', annual_revenue: '$200,000,000,000', contact_email: 'contact@samsung.com' },
    { company_name: 'LG Chem', industry_type: 'Chemical', annual_revenue: '$50,000,000,000', contact_email: 'info@lgchem.com' },
  ];

  return (
    <div className="p-6 space-y-6">
      <ProgressIndicator 
        title="데이터 매핑 설정" 
        currentStep={2} 
        totalSteps={5}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Source Data */}
        <Card>
          <CardHeader>
            <CardTitle>소스 데이터</CardTitle>
            <p className="text-sm text-gray-600">연결된 데이터 소스에서 가져온 필드</p>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto">
            <div className="space-y-2">
              {sampleSourceFields.map((field) => (
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
                  <p className="text-xs text-gray-500">{field.type}</p>
                  {field.description && (
                    <p className="text-xs text-gray-600 mt-1">{field.description}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Transformation Rules */}
        <Card>
          <CardHeader>
            <CardTitle>변환 규칙</CardTitle>
            <p className="text-sm text-gray-600">데이터 처리 규칙 설정</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">필터</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Select
                    value={transformationRules.filterField}
                    onValueChange={(value) => setTransformationRules(prev => ({ ...prev, filterField: value }))}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sampleSourceFields.map(field => (
                        <SelectItem key={field.name} value={field.name}>{field.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={transformationRules.filterOperator}
                    onValueChange={(value) => setTransformationRules(prev => ({ ...prev, filterOperator: value }))}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equals">equals</SelectItem>
                      <SelectItem value="contains">contains</SelectItem>
                      <SelectItem value="greater_than">greater than</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  placeholder="값 입력"
                  value={transformationRules.filterValue}
                  onChange={(e) => setTransformationRules(prev => ({ ...prev, filterValue: e.target.value }))}
                />
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">그룹화</h4>
              <Select
                value={transformationRules.groupByField}
                onValueChange={(value) => setTransformationRules(prev => ({ ...prev, groupByField: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="필드 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">선택 안함</SelectItem>
                  <SelectItem value="Account.Industry">Account.Industry</SelectItem>
                  <SelectItem value="Account.Type">Account.Type</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">정렬</h4>
              <div className="flex space-x-2">
                <Select
                  value={transformationRules.sortField}
                  onValueChange={(value) => setTransformationRules(prev => ({ ...prev, sortField: value }))}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sampleSourceFields.map(field => (
                      <SelectItem key={field.name} value={field.name}>{field.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={transformationRules.sortOrder}
                  onValueChange={(value) => setTransformationRules(prev => ({ ...prev, sortOrder: value }))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">내림차순</SelectItem>
                    <SelectItem value="asc">오름차순</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Target Schema */}
        <Card>
          <CardHeader>
            <CardTitle>대상 스키마</CardTitle>
            <p className="text-sm text-gray-600">생성될 오브젝트 구조</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <DragDropZone 
              onDrop={handleDrop}
              placeholder="Drag fields here"
            >
              <div></div>
            </DragDropZone>
            
            {/* Mapped Fields */}
            <div className="space-y-2">
              {mappedFields.map((field) => (
                <div key={field.id} className="bg-primary/10 border border-primary rounded p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-primary">{field.targetField}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMapping(field.id)}
                      className="h-auto p-0 text-gray-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-600">← {field.sourceField}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Preview */}
      <Card>
        <CardHeader>
          <CardTitle>데이터 미리보기</CardTitle>
          <p className="text-sm text-gray-600">변환된 데이터 샘플</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {mappedFields.map((field) => (
                    <th key={field.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {field.targetField}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sampleData.map((row, index) => (
                  <tr key={index}>
                    {mappedFields.map((field) => (
                      <td key={field.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(row as any)[field.targetField] || 'N/A'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          이전
        </Button>
        <Button onClick={onNext} disabled={mappedFields.length === 0}>
          자동화 설정으로 계속
        </Button>
      </div>
    </div>
  );
}
