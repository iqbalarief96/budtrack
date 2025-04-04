export interface Category {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE' | 'BOTH';
  createdAt: Date;
  updatedAt: Date;
  userId: string;
} 