import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ProgressIndicator } from "@/components/ui/progress-indicator";
import { 
  Play, Settings, HelpCircle, Mail, MessageSquare, Database, Bot,
  Clock, Webhook, Filter
} from "lucide-react";
import { WorkflowNode, WorkflowConnection } from "@/types/integration";

interface AutomationTabProps {
  onNext: () => void;
  onPrev: () => void;
}

const actionTypes = [
  { id: 'email', name: 'Send Email', icon: Mail, color: 'purple' },
  { id: 'slack', name: 'Slack Message', icon: MessageSquare, color: 'purple' },
  { id: 'database', name: 'Save to Database', icon: Database, color: 'orange' },
  { id: 'ai_model', name: 'Run AI Model', icon: Bot, color: 'red' },
];

const triggerTypes = [
  { id: 'schedule', name: 'Schedule', icon: Clock, color: 'blue' },
  { id: 'webhook', name: 'Webhook', icon: Webhook, color: 'green' },
];

const conditionTypes = [
  { id: 'if_else', name: 'IF/ELSE', icon: HelpCircle, color: 'yellow' },
  { id: 'filter', name: 'Filter', icon: Filter, color: 'blue' },
];

export default function AutomationTab({ onNext, onPrev }: AutomationTabProps) {
  const [workflowConfig, setWorkflowConfig] = useState({
    name: 'Automated Customer Data Analysis',
    schedule: 'daily',
    notifyOnSuccess: true,
    notifyOnError: true,
  });

  const workflowNodes: WorkflowNode[] = [
    {
      id: 'start',
      type: 'trigger',
      name: '데이터 수집 시작',
      icon: 'Play',
      position: { x: 50, y: 50 },
    },
    {
      id: 'transform',
      type: 'action',
      name: '데이터 변환',
      icon: 'Settings',
      position: { x: 300, y: 50 },
    },
    {
      id: 'condition',
      type: 'condition',
      name: '조건 확인',
      icon: 'HelpCircle',
      position: { x: 175, y: 150 },
    },
    {
      id: 'email',
      type: 'action',
      name: '이메일 발송',
      icon: 'Mail',
      position: { x: 50, y: 250 },
    },
    {
      id: 'save',
      type: 'action',
      name: '데이터 저장',
      icon: 'Database',
      position: { x: 300, y: 250 },
    },
  ];

  const getIcon = (iconName: string) => {
    const icons = { Play, Settings, HelpCircle, Mail, Database };
    const Icon = icons[iconName as keyof typeof icons] || Play;
    return <Icon className="w-4 h-4" />;
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'trigger': return 'bg-green-100 border-green-300 text-green-700';
      case 'action': return 'bg-blue-100 border-blue-300 text-blue-700';
      case 'condition': return 'bg-yellow-100 border-yellow-300 text-yellow-700';
      default: return 'bg-gray-100 border-gray-300 text-gray-700';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <ProgressIndicator 
        title="자동화 워크플로우 설정" 
        currentStep={3} 
        totalSteps={5}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workflow Builder */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>워크플로우 빌더</CardTitle>
              <p className="text-sm text-gray-600">드래그 앤 드롭으로 자동화 프로세스를 구성하세요</p>
            </CardHeader>
            <CardContent>
              <div 
                className="relative bg-gray-50 rounded-lg p-6"
                style={{ 
                  minHeight: '400px',
                  backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
                  backgroundSize: '20px 20px'
                }}
              >
                {/* Workflow Nodes */}
                {workflowNodes.map((node) => (
                  <div
                    key={node.id}
                    className={`absolute border-2 rounded-lg p-4 w-48 ${getNodeColor(node.type)}`}
                    style={{ left: node.position.x, top: node.position.y }}
                  >
                    <div className="flex items-center space-x-2">
                      {getIcon(node.icon)}
                      <span className="text-sm font-medium">{node.name}</span>
                    </div>
                    <p className="text-xs mt-1">
                      {node.id === 'start' && 'Salesforce에서 데이터를 가져옵니다'}
                      {node.id === 'transform' && '설정된 규칙에 따라 데이터를 변환합니다'}
                      {node.id === 'condition' && '매출액 > 10억원'}
                      {node.id === 'email' && '영업팀에 알림 발송'}
                      {node.id === 'save' && '고객 DB에 저장'}
                    </p>
                  </div>
                ))}

                {/* Connection Lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  <defs>
                    <marker 
                      id="arrowhead" 
                      markerWidth="10" 
                      markerHeight="7" 
                      refX="10" 
                      refY="3.5" 
                      orient="auto"
                    >
                      <polygon points="0 0, 10 3.5, 0 7" fill="#6B7280" />
                    </marker>
                  </defs>
                  
                  {/* Start to Transform */}
                  <path 
                    d="M 242 66 L 300 66" 
                    stroke="#6B7280" 
                    strokeWidth="2" 
                    fill="none" 
                    markerEnd="url(#arrowhead)"
                  />
                  
                  {/* Transform to Condition */}
                  <path 
                    d="M 374 98 L 374 130 L 223 130 L 223 150" 
                    stroke="#6B7280" 
                    strokeWidth="2" 
                    fill="none" 
                    markerEnd="url(#arrowhead)"
                  />
                  
                  {/* Condition to Email */}
                  <path 
                    d="M 175 182 L 175 210 L 142 210 L 142 250" 
                    stroke="#6B7280" 
                    strokeWidth="2" 
                    fill="none" 
                    markerEnd="url(#arrowhead)"
                  />
                  
                  {/* Condition to Save */}
                  <path 
                    d="M 223 182 L 223 210 L 374 210 L 374 250" 
                    stroke="#6B7280" 
                    strokeWidth="2" 
                    fill="none" 
                    markerEnd="url(#arrowhead)"
                  />
                </svg>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Panel */}
        <Card>
          <CardHeader>
            <CardTitle>사용 가능한 액션</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Triggers */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">트리거</h4>
              <div className="space-y-2">
                {triggerTypes.map((trigger) => (
                  <div key={trigger.id} className="border border-gray-200 rounded p-3 cursor-pointer hover:bg-gray-50">
                    <div className="flex items-center space-x-2">
                      <trigger.icon className={`w-4 h-4 text-${trigger.color}-500`} />
                      <span className="text-sm">{trigger.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">액션</h4>
              <div className="space-y-2">
                {actionTypes.map((action) => (
                  <div key={action.id} className="border border-gray-200 rounded p-3 cursor-pointer hover:bg-gray-50">
                    <div className="flex items-center space-x-2">
                      <action.icon className={`w-4 h-4 text-${action.color}-500`} />
                      <span className="text-sm">{action.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Conditions */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">조건</h4>
              <div className="space-y-2">
                {conditionTypes.map((condition) => (
                  <div key={condition.id} className="border border-gray-200 rounded p-3 cursor-pointer hover:bg-gray-50">
                    <div className="flex items-center space-x-2">
                      <condition.icon className={`w-4 h-4 text-${condition.color}-500`} />
                      <span className="text-sm">{condition.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workflow Settings */}
      <Card>
        <CardHeader>
          <CardTitle>워크플로우 설정</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label htmlFor="workflow-name">워크플로우 이름</Label>
              <Input
                id="workflow-name"
                value={workflowConfig.name}
                onChange={(e) => setWorkflowConfig(prev => ({ ...prev, name: e.target.value }))}
                placeholder="예: 고객사 데이터 자동 분석"
              />
            </div>
            
            <div>
              <Label htmlFor="schedule">실행 주기</Label>
              <Select
                value={workflowConfig.schedule}
                onValueChange={(value) => setWorkflowConfig(prev => ({ ...prev, schedule: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">매일</SelectItem>
                  <SelectItem value="weekly">매주</SelectItem>
                  <SelectItem value="monthly">매월</SelectItem>
                  <SelectItem value="realtime">실시간</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>알림 설정</Label>
              <div className="flex items-center space-x-4 mt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notify-success"
                    checked={workflowConfig.notifyOnSuccess}
                    onCheckedChange={(checked) => 
                      setWorkflowConfig(prev => ({ ...prev, notifyOnSuccess: !!checked }))
                    }
                  />
                  <Label htmlFor="notify-success" className="text-sm">성공시</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notify-error"
                    checked={workflowConfig.notifyOnError}
                    onCheckedChange={(checked) => 
                      setWorkflowConfig(prev => ({ ...prev, notifyOnError: !!checked }))
                    }
                  />
                  <Label htmlFor="notify-error" className="text-sm">실패시</Label>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          이전
        </Button>
        <Button onClick={onNext}>
          AI 모델 연동으로 계속
        </Button>
      </div>
    </div>
  );
}
