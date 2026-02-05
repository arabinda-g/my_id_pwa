import type { EncryptedPayload, QueueItem, User } from "./types";
import {
  bumpQueuedAttempts,
  enqueueAction,
  getQueuedActions,
  removeQueuedAction
} from "./db";
import { isPasskeyRegistered, passkeyStorageKeys } from "../utils/passkey";

const MAX_ATTEMPTS = 5;

const bufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const isValidBase64 = (value: string): boolean => {
  if (!value || typeof value !== "string") return false;
  // Standard base64 pattern (allows padding)
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  // Length must be divisible by 4 (with padding)
  return base64Regex.test(value) && value.length % 4 === 0;
};

const base64ToBuffer = (value: string) => {
  if (!isValidBase64(value)) {
    throw new Error("Invalid base64 string");
  }
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

const getDataKey = async (): Promise<CryptoKey | null> => {
  const raw = localStorage.getItem(passkeyStorageKeys.dataKey);
  if (!raw) return null;
  return crypto.subtle.importKey("raw", base64ToBuffer(raw), "AES-GCM", false, ["encrypt", "decrypt"]);
};

const encryptPayload = async (payload: unknown, key: CryptoKey): Promise<EncryptedPayload> => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return {
    iv: bufferToBase64(iv.buffer),
    ciphertext: bufferToBase64(ciphertext)
  };
};

const decryptPayload = async <T>(encrypted: EncryptedPayload, key: CryptoKey): Promise<T> => {
  const iv = new Uint8Array(base64ToBuffer(encrypted.iv));
  const ciphertext = base64ToBuffer(encrypted.ciphertext);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(plaintext)) as T;
};

export async function queueUpsert(user: User) {
  const shouldEncrypt = isPasskeyRegistered();
  const dataKey = shouldEncrypt ? await getDataKey() : null;

  const item: QueueItem = {
    id: `queue-${user.id}-${Date.now()}`,
    type: "UPSERT_USER",
    payload: shouldEncrypt && dataKey ? { id: user.id } : user,
    encryptedPayload: shouldEncrypt && dataKey ? await encryptPayload(user, dataKey) : undefined,
    createdAt: Date.now(),
    attempts: 0
  };
  await enqueueAction(item);
}

export async function queueDelete(id: string) {
  const item: QueueItem = {
    id: `queue-delete-${id}-${Date.now()}`,
    type: "DELETE_USER",
    payload: { id },
    createdAt: Date.now(),
    attempts: 0
  };
  await enqueueAction(item);
}

export async function getDecryptedQueueItem(item: QueueItem): Promise<QueueItem> {
  if (!item.encryptedPayload) return item;
  const dataKey = await getDataKey();
  if (!dataKey) return item;
  try {
    const decryptedPayload = await decryptPayload<User>(item.encryptedPayload, dataKey);
    return { ...item, payload: decryptedPayload };
  } catch {
    return item;
  }
}

async function defaultRemoteSync(_item: QueueItem) {
  // Replace with a real API call when a backend is available.
  await new Promise((resolve) => setTimeout(resolve, 200));
}

export async function processQueue(
  syncFn: (item: QueueItem) => Promise<void> = defaultRemoteSync
) {
  if (!navigator.onLine) return;
  const items = await getQueuedActions();
  for (const item of items) {
    if (item.attempts >= MAX_ATTEMPTS) continue;
    try {
      // Decrypt the item before syncing to the remote server
      const decryptedItem = await getDecryptedQueueItem(item);
      await syncFn(decryptedItem);
      await removeQueuedAction(item.id);
    } catch {
      await bumpQueuedAttempts(item.id);
    }
  }
}

export function startQueueProcessor() {
  const handle = () => {
    void processQueue();
  };

  window.addEventListener("online", handle);
  void processQueue();

  return () => {
    window.removeEventListener("online", handle);
  };
}