import React from 'react';

interface ConnectionLineProps {
  source: { x: number; y: number };
  target: { x: number; y: number };
  isSelected: boolean;
}

export function ConnectionLine({ source, target, isSelected }: ConnectionLineProps) {
  // 노드 중심점에서 시작하도록 조정
  const sourcePoint = {
    x: source.x + 96, // 노드 폭의 절반 (192px / 2)
    y: source.y + 40   // 노드 높이의 대략 절반
  };
  
  const targetPoint = {
    x: target.x + 96,
    y: target.y + 40
  };

  // 베지어 곡선을 위한 제어점 계산
  const controlPoint1 = {
    x: sourcePoint.x + (targetPoint.x - sourcePoint.x) * 0.5,
    y: sourcePoint.y
  };
  
  const controlPoint2 = {
    x: sourcePoint.x + (targetPoint.x - sourcePoint.x) * 0.5,
    y: targetPoint.y
  };

  const pathData = `
    M ${sourcePoint.x} ${sourcePoint.y}
    C ${controlPoint1.x} ${controlPoint1.y}
      ${controlPoint2.x} ${controlPoint2.y}
      ${targetPoint.x} ${targetPoint.y}
  `;

  return (
    <g>
      {/* 연결선 */}
      <path
        d={pathData}
        stroke={isSelected ? '#3b82f6' : '#6b7280'}
        strokeWidth={isSelected ? 3 : 2}
        fill="none"
        strokeDasharray={isSelected ? '0' : '5,5'}
        className="transition-all duration-200"
      />
      
      {/* 화살표 */}
      <defs>
        <marker
          id={`arrowhead-${isSelected ? 'selected' : 'default'}`}
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill={isSelected ? '#3b82f6' : '#6b7280'}
          />
        </marker>
      </defs>
      
      <path
        d={pathData}
        stroke="transparent"
        strokeWidth={8}
        fill="none"
        markerEnd={`url(#arrowhead-${isSelected ? 'selected' : 'default'})`}
        className="cursor-pointer hover:stroke-blue-300"
      />
    </g>
  );
}