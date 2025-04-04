export interface Budget {
  id: string;
  amount: number;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  walletId: string;
  categoryId: string;
} 