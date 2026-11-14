export type ExpenseRecord = {
  id: number;
  user_id: string;
  name: string;
  amount: number | string;
  category: string;
  date: string;
  description?: string | null;
  category_id?: number | null;
  recurring_expense_id?: number | null;
};
