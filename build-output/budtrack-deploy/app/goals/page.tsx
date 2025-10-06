import { Metadata } from 'next';
import { GoalsContent } from './GoalsContent';

export const metadata: Metadata = {
  title: 'Goals | BudTrack',
  description: 'Track and manage your financial goals',
};

export default function GoalsPage() {
  return (
    <div className="flex-1 p-6">
      <GoalsContent />
    </div>
  );
} 