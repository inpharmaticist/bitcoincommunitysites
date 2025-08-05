import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EditProfileForm } from '@/components/EditProfileForm';

interface EditProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EditProfileDialog: React.FC<EditProfileDialogProps> = ({
  isOpen,
  onClose,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your profile information and settings
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          <EditProfileForm />
        </div>
      </DialogContent>
    </Dialog>
  );
};