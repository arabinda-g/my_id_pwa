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

export type EncryptedPayload = {
  iv: string;
  ciphertext: string;
};

export type QueueItem = {
  id: string;
  type: QueueActionType;
  payload: User | { id: string };
  encryptedPayload?: EncryptedPayload;
  createdAt: number;
  attempts: number;
};
