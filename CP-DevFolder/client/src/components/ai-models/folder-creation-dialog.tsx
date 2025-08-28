import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FolderOpen, Brain, Zap, Target, TrendingUp, Cog } from 'lucide-react';

interface FolderCreationDialogProps {
  onClose: () => void;
  onCreate: (folderData: { name: string; description: string; color: string; icon: string }) => void;
}

const folderIcons = [
  { value: 'FolderOpen', label: 'General Folder', icon: FolderOpen, color: '#3B82F6' },
  { value: 'Brain', label: 'AI Models', icon: Brain, color: '#8B5CF6' },
  { value: 'Zap', label: 'Quick Access', icon: Zap, color: '#F59E0B' },
  { value: 'Target', label: 'Quality Control', icon: Target, color: '#EF4444' },
  { value: 'TrendingUp', label: 'Analytics', icon: TrendingUp, color: '#10B981' },
  { value: 'Cog', label: 'Maintenance', icon: Cog, color: '#6B7280' },
];

const folderColors = [
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#10B981', // Emerald
  '#6B7280', // Gray
  '#EC4899', // Pink
  '#14B8A6', // Teal
];

export function FolderCreationDialog({ onClose, onCreate }: FolderCreationDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('FolderOpen');
  const [selectedColor, setSelectedColor] = useState('#3B82F6');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onCreate({
        name: name.trim(),
        description: description.trim(),
        color: selectedColor,
        icon: selectedIcon,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getIconComponent = (iconName: string) => {
    const iconData = folderIcons.find(icon => icon.value === iconName);
    return iconData?.icon || FolderOpen;
  };

  const IconComponent = getIconComponent(selectedIcon);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Folder</DialogTitle>
          <DialogDescription>
            Create a new folder to organize your AI models. Choose a name, description, and customize the appearance.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Folder Preview */}
          <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <IconComponent className="w-6 h-6" style={{ color: selectedColor }} />
              <div>
                <h3 className="font-medium">{name || 'Folder Name'}</h3>
                <p className="text-sm text-gray-500">{description || 'Folder description'}</p>
              </div>
            </div>
          </div>

          {/* Folder Name */}
          <div className="grid gap-2">
            <Label htmlFor="folder-name">Folder Name</Label>
            <Input
              id="folder-name"
              placeholder="Enter folder name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="input-folder-name"
            />
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="folder-description">Description (Optional)</Label>
            <Textarea
              id="folder-description"
              placeholder="Describe what this folder will contain"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              data-testid="textarea-folder-description"
            />
          </div>

          {/* Icon Selection */}
          <div className="grid gap-2">
            <Label>Icon</Label>
            <Select value={selectedIcon} onValueChange={setSelectedIcon}>
              <SelectTrigger data-testid="select-folder-icon">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {folderIcons.map((icon) => {
                  const IconComp = icon.icon;
                  return (
                    <SelectItem key={icon.value} value={icon.value}>
                      <div className="flex items-center gap-2">
                        <IconComp className="w-4 h-4" style={{ color: icon.color }} />
                        <span>{icon.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Color Selection */}
          <div className="grid gap-2">
            <Label>Color</Label>
            <div className="flex gap-2">
              {folderColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 ${
                    selectedColor === color ? 'border-gray-900' : 'border-gray-200'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor(color)}
                  data-testid={`color-${color}`}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleSubmit}
            disabled={!name.trim() || isSubmitting}
            data-testid="button-create-folder"
          >
            {isSubmitting ? 'Creating...' : 'Create Folder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}