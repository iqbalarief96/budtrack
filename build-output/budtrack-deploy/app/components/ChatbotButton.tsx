'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bot } from 'lucide-react';
import FinanceChatbot from './FinanceChatbot';
import { Dialog, DialogContent } from '@/components/ui/dialog';

const ChatbotButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg bg-blue-600 hover:bg-blue-700"
        onClick={() => setIsOpen(true)}
      >
        <Bot className="h-6 w-6 text-white" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] p-0">
          <FinanceChatbot />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ChatbotButton; 