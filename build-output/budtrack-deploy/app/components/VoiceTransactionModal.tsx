import { useState } from 'react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MicrophoneIcon } from '@heroicons/react/24/solid';
import { VoiceTransactionRecorder } from './VoiceTransactionRecorder';

type VoiceTransactionModalProps = {
  onSuccess?: () => void;
  buttonText?: string;
  buttonSize?: 'default' | 'sm' | 'lg' | 'icon';
  buttonVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  className?: string;
};

export function VoiceTransactionModal({
  onSuccess,
  buttonText = 'Rekam Transaksi',
  buttonSize = 'default',
  buttonVariant = 'outline',
  className = ''
}: VoiceTransactionModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleSuccess = () => {
    if (onSuccess) onSuccess();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={buttonVariant} 
          size={buttonSize}
          className={`${className} flex items-center gap-2`}
        >
          <MicrophoneIcon className="h-4 w-4" />
          {buttonSize !== 'icon' && buttonText}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md p-0">
        <VoiceTransactionRecorder 
          onClose={handleClose}
          onSuccess={handleSuccess}
        />
      </DialogContent>
    </Dialog>
  );
} 