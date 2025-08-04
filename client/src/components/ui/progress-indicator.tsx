interface ProgressIndicatorProps {
  title: string;
  currentStep: number;
  totalSteps: number;
  stepLabel?: string;
}

export function ProgressIndicator({ title, currentStep, totalSteps, stepLabel }: ProgressIndicatorProps) {
  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <span className="text-sm text-gray-500">
          {stepLabel || `${currentStep}/${totalSteps} 단계`}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="progress-bar h-2 rounded-full transition-all duration-300"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </div>
  );
}
