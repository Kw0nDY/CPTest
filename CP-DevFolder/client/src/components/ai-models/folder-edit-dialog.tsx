import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface AiModelFolder {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
}

interface FolderEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  folder: AiModelFolder | null;
}

export function FolderEditDialog({ isOpen, onClose, folder }: FolderEditDialogProps) {
  const [folderName, setFolderName] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (folder) {
      setFolderName(folder.name);
    } else {
      setFolderName('');
    }
  }, [folder]);

  const updateFolderMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      if (!folder) throw new Error('No folder selected');
      
      const response = await fetch(`/api/ai-model-folders/${folder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.name })
      });
      
      if (!response.ok) throw new Error('Failed to update folder');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-model-folders'] });
      toast({ 
        title: 'Folder Updated Successfully', 
        description: 'Folder name has been updated.' 
      });
      onClose();
    },
    onError: () => {
      toast({ 
        title: 'Error', 
        description: 'Failed to update folder', 
        variant: 'destructive' 
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) {
      toast({ 
        title: 'Error', 
        description: 'Folder name is required', 
        variant: 'destructive' 
      });
      return;
    }

    updateFolderMutation.mutate({ name: folderName.trim() });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Folder</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="folder-name" className="text-right">
                Name
              </Label>
              <Input
                id="folder-name"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                className="col-span-3"
                placeholder="Enter folder name"
                data-testid="input-folder-name"
              />
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
              type="submit" 
              disabled={updateFolderMutation.isPending}
              data-testid="button-save"
            >
              {updateFolderMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}