export type User = {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  notes: string;
  updatedAt: number;
};

export type QueueActionType = "UPSERT_USER" | "DELETE_USER";

export type QueueItem = {
  id: string;
  type: QueueActionType;
  payload: User | { id: string };
  createdAt: number;
  attempts: number;
};
