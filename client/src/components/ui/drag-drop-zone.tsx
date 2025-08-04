import { useState } from "react";
import { cn } from "@/lib/utils";

interface DragDropZoneProps {
  children: React.ReactNode;
  onDrop?: (data: any) => void;
  className?: string;
  placeholder?: string;
}

export function DragDropZone({ children, onDrop, className, placeholder }: DragDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      onDrop?.(data);
    } catch (error) {
      console.error("Error parsing dropped data:", error);
    }
  };

  return (
    <div
      className={cn(
        "border-2 border-dashed border-gray-300 rounded-lg p-4 min-h-16 transition-all duration-200",
        isDragOver && "border-primary bg-primary/5",
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children || (
        <p className="text-sm text-gray-500 text-center">
          {placeholder || "필드를 여기로 드래그하세요"}
        </p>
      )}
    </div>
  );
}
