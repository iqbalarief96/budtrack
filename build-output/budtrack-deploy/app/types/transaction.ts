type Transaction = {
  id: string;
  amount: number;
  description: string | null;
  date: Date;
  type: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  walletId: string;
  categoryId: string | null;
  goalId: string | null;
}; 