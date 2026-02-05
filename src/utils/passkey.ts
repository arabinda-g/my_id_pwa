import {
  clearPinnedFields,
  clearProfileConfig,
  clearUserData,
  getPinnedFields,
  getProfileConfig,
  getUpiQrImage,
  getUserData,
  setPinnedFields,
  setProfileConfig,
  setUpiQrImage,
  setUserData
} from "./storage";

export const passkeyStorageKeys = {
  credentialId: "my_id_passkey_credential_id",
  startupRequired: "my_id_passkey_on_startup",
  dataKey: "my_id_passkey_data_key",
  encryptedUserData: "user_data_enc",
  encryptedPinnedFields: "pinned_fields_enc",
  encryptedUpiQrImage: "upi_qr_image_enc",
  encryptedProfileConfig: "profile_config_enc",
  sectionLocks: "section_locks",
  fieldLocks: "field_locks"
};

type EncryptedPayload = { iv: string; ciphertext: string };

type CategoryShape = {
  id: string;
  fields: { key: string }[];
};

const bufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const base64ToBuffer = (value: string) => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

const bufferToBase64Url = (buffer: ArrayBuffer) =>
  bufferToBase64(buffer).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

const base64UrlToBuffer = (value: string) => {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return base64ToBuffer(padded);
};

const getRawDataKey = () => localStorage.getItem(passkeyStorageKeys.dataKey);

const importDataKey = async (rawBase64: string) =>
  crypto.subtle.importKey("raw", base64ToBuffer(rawBase64), "AES-GCM", false, ["encrypt", "decrypt"]);

const ensureDataKey = async () => {
  const existing = getRawDataKey();
  if (existing) {
    return importDataKey(existing);
  }
  const raw = crypto.getRandomValues(new Uint8Array(32));
  const encoded = bufferToBase64(raw.buffer);
  localStorage.setItem(passkeyStorageKeys.dataKey, encoded);
  return importDataKey(encoded);
};

const getDataKey = async () => {
  const raw = getRawDataKey();
  if (!raw) return null;
  return importDataKey(raw);
};

const encryptString = async (value: string, key: CryptoKey): Promise<EncryptedPayload> => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(value);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return {
    iv: bufferToBase64(iv.buffer),
    ciphertext: bufferToBase64(ciphertext)
  };
};

const decryptString = async (payload: EncryptedPayload, key: CryptoKey) => {
  const iv = new Uint8Array(base64ToBuffer(payload.iv));
  const ciphertext = base64ToBuffer(payload.ciphertext);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(plaintext);
};

const getEncryptedValue = (key: string): EncryptedPayload | null => {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as EncryptedPayload;
    if (!parsed || typeof parsed.iv !== "string" || typeof parsed.ciphertext !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
};

const setEncryptedValue = (key: string, value: EncryptedPayload | null) => {
  if (!value) {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(key, JSON.stringify(value));
};

const getEncryptedMap = (key: string): Record<string, EncryptedPayload> => {
  const raw = localStorage.getItem(key);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, EncryptedPayload>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const setEncryptedMap = (key: string, value: Record<string, EncryptedPayload>) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const isPasskeyRegistered = () => Boolean(localStorage.getItem(passkeyStorageKeys.credentialId));

export const getPasskeyStartupRequired = () =>
  localStorage.getItem(passkeyStorageKeys.startupRequired) === "true";

export const verifyPasskey = async (signal?: AbortSignal) => {
  const credentialId = localStorage.getItem(passkeyStorageKeys.credentialId);
  if (!credentialId) {
    return { ok: false, error: "No passkey registered." };
  }
  if (!("PublicKeyCredential" in window)) {
    return { ok: false, error: "Passkeys are not supported in this browser." };
  }
  try {
    const publicKey: PublicKeyCredentialRequestOptions = {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [
        {
          type: "public-key",
          id: base64UrlToBuffer(credentialId)
        }
      ],
      userVerification: "preferred",
      timeout: 60000
    };
    const requestOptions: CredentialRequestOptions = { publicKey };
    if (signal) {
      (requestOptions as { signal?: AbortSignal }).signal = signal;
    }
    const assertion = (await navigator.credentials.get(requestOptions)) as PublicKeyCredential | null;
    if (!assertion) {
      return { ok: false, error: "Passkey verification was cancelled." };
    }
    return { ok: true };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { ok: false, error: "Passkey verification was cancelled." };
    }
    const message = err instanceof Error && err.message ? err.message : "Passkey verification failed.";
    return { ok: false, error: message };
  }
};

export const getSectionLocks = () => {
  const raw = localStorage.getItem(passkeyStorageKeys.sectionLocks);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
};

export const setSectionLocks = (locks: string[]) => {
  localStorage.setItem(passkeyStorageKeys.sectionLocks, JSON.stringify(locks));
};

export const getFieldLocks = () => {
  const raw = localStorage.getItem(passkeyStorageKeys.fieldLocks);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed.filter((key) => typeof key === "string") : [];
  } catch {
    return [];
  }
};

export const setFieldLocks = (locks: string[]) => {
  localStorage.setItem(passkeyStorageKeys.fieldLocks, JSON.stringify(locks));
};

export const encryptExistingData = async () => {
  const key = await ensureDataKey();
  const userData = getUserData();
  const existingEncrypted = getEncryptedMap(passkeyStorageKeys.encryptedUserData);
  const encryptedUserData: Record<string, EncryptedPayload> = { ...existingEncrypted };
  if (Object.keys(userData).length) {
    await Promise.all(
      Object.entries(userData).map(async ([fieldKey, value]) => {
        encryptedUserData[fieldKey] = await encryptString(value, key);
      })
    );
    setEncryptedMap(passkeyStorageKeys.encryptedUserData, encryptedUserData);
  } else if (!Object.keys(existingEncrypted).length) {
    setEncryptedMap(passkeyStorageKeys.encryptedUserData, encryptedUserData);
  }

  const pinned = getPinnedFields();
  const upi = getUpiQrImage();
  const profileConfig = getProfileConfig();

  if (pinned.length) {
    setEncryptedValue(
      passkeyStorageKeys.encryptedPinnedFields,
      await encryptString(JSON.stringify(pinned), key)
    );
  }
  if (upi) {
    setEncryptedValue(passkeyStorageKeys.encryptedUpiQrImage, await encryptString(upi ?? "", key));
  }
  if (profileConfig !== null && profileConfig !== undefined) {
    setEncryptedValue(
      passkeyStorageKeys.encryptedProfileConfig,
      await encryptString(JSON.stringify(profileConfig ?? null), key)
    );
  }

  if (Object.keys(userData).length) {
    clearUserData();
  }
  if (pinned.length) {
    clearPinnedFields();
  }
  if (profileConfig !== null && profileConfig !== undefined) {
    clearProfileConfig();
  }
  if (upi) {
    setUpiQrImage("");
  }
};

export const decryptExistingData = async () => {
  const key = await getDataKey();
  if (!key) return;

  // Decrypt all data into memory first before any storage operations
  // to minimize the window where both encrypted and decrypted data exist
  const encryptedUserData = getEncryptedMap(passkeyStorageKeys.encryptedUserData);
  const decryptedUserData: Record<string, string> = {};
  for (const [fieldKey, payload] of Object.entries(encryptedUserData)) {
    try {
      decryptedUserData[fieldKey] = await decryptString(payload, key);
    } catch {
      // ignore corrupt field
    }
  }

  let decryptedPinned: string[] | null = null;
  const pinnedPayload = getEncryptedValue(passkeyStorageKeys.encryptedPinnedFields);
  if (pinnedPayload) {
    try {
      const pinned = JSON.parse(await decryptString(pinnedPayload, key)) as string[];
      if (Array.isArray(pinned)) {
        decryptedPinned = pinned;
      }
    } catch {
      // ignore
    }
  }

  let decryptedUpi: string | null = null;
  const upiPayload = getEncryptedValue(passkeyStorageKeys.encryptedUpiQrImage);
  if (upiPayload) {
    try {
      decryptedUpi = await decryptString(upiPayload, key);
    } catch {
      // ignore
    }
  }

  let decryptedConfig: unknown = null;
  const configPayload = getEncryptedValue(passkeyStorageKeys.encryptedProfileConfig);
  if (configPayload) {
    try {
      decryptedConfig = JSON.parse(await decryptString(configPayload, key));
    } catch {
      // ignore
    }
  }

  // Remove encrypted data first to prevent both versions existing simultaneously
  localStorage.removeItem(passkeyStorageKeys.encryptedUserData);
  localStorage.removeItem(passkeyStorageKeys.encryptedPinnedFields);
  localStorage.removeItem(passkeyStorageKeys.encryptedUpiQrImage);
  localStorage.removeItem(passkeyStorageKeys.encryptedProfileConfig);
  localStorage.removeItem(passkeyStorageKeys.dataKey);

  // Now write the decrypted data
  setUserData(decryptedUserData);
  if (decryptedPinned) {
    setPinnedFields(decryptedPinned);
  }
  if (decryptedUpi) {
    setUpiQrImage(decryptedUpi);
  }
  if (decryptedConfig !== null) {
    setProfileConfig(decryptedConfig);
  }

  // Clear memory references to decrypted data
  Object.keys(decryptedUserData).forEach((key) => {
    decryptedUserData[key] = "";
  });
};

export const saveUserDataProtected = async (data: Record<string, string>) => {
  if (!isPasskeyRegistered()) {
    setUserData(data);
    return;
  }
  const key = await ensureDataKey();
  const encrypted: Record<string, EncryptedPayload> = {};
  await Promise.all(
    Object.entries(data).map(async ([fieldKey, value]) => {
      encrypted[fieldKey] = await encryptString(value, key);
    })
  );
  setEncryptedMap(passkeyStorageKeys.encryptedUserData, encrypted);
  clearUserData();
};

export const loadUserDataProtected = async (
  categories: CategoryShape[],
  lockedSections: Set<string>,
  lockedFields: Set<string>,
  includeLocked = false
) => {
  if (!isPasskeyRegistered()) {
    return getUserData();
  }
  const key = await getDataKey();
  if (!key) return {};
  const encrypted = getEncryptedMap(passkeyStorageKeys.encryptedUserData);
  const lockedBySection = new Set<string>();
  categories.forEach((category) => {
    if (!lockedSections.has(category.id)) return;
    category.fields.forEach((field) => lockedBySection.add(field.key));
  });
  const data: Record<string, string> = {};
  for (const [fieldKey, payload] of Object.entries(encrypted)) {
    const locked = lockedFields.has(fieldKey) || lockedBySection.has(fieldKey);
    if (locked && !includeLocked) continue;
    try {
      data[fieldKey] = await decryptString(payload, key);
    } catch {
      // ignore corrupt field
    }
  }
  return data;
};

export const loadFieldValueProtected = async (fieldKey: string) => {
  if (!isPasskeyRegistered()) {
    return getUserData()[fieldKey] ?? "";
  }
  const key = await getDataKey();
  if (!key) return "";
  const encrypted = getEncryptedMap(passkeyStorageKeys.encryptedUserData);
  const payload = encrypted[fieldKey];
  if (!payload) return "";
  try {
    return await decryptString(payload, key);
  } catch {
    return "";
  }
};

export const hasStoredUserData = () => {
  if (!isPasskeyRegistered()) {
    return Object.keys(getUserData()).length > 0;
  }
  return Object.keys(getEncryptedMap(passkeyStorageKeys.encryptedUserData)).length > 0;
};

export const savePinnedFieldsProtected = async (fields: string[]) => {
  if (!isPasskeyRegistered()) {
    setPinnedFields(fields);
    return;
  }
  const key = await ensureDataKey();
  setEncryptedValue(passkeyStorageKeys.encryptedPinnedFields, await encryptString(JSON.stringify(fields), key));
  clearPinnedFields();
};

export const loadPinnedFieldsProtected = async () => {
  if (!isPasskeyRegistered()) return getPinnedFields();
  const key = await getDataKey();
  if (!key) return [];
  const payload = getEncryptedValue(passkeyStorageKeys.encryptedPinnedFields);
  if (!payload) return [];
  try {
    const decoded = JSON.parse(await decryptString(payload, key)) as string[];
    return Array.isArray(decoded) ? decoded : [];
  } catch {
    return [];
  }
};

export const saveUpiQrImageProtected = async (value: string) => {
  if (!isPasskeyRegistered()) {
    setUpiQrImage(value);
    return;
  }
  if (!value) {
    setEncryptedValue(passkeyStorageKeys.encryptedUpiQrImage, null);
    setUpiQrImage("");
    return;
  }
  const key = await ensureDataKey();
  setEncryptedValue(passkeyStorageKeys.encryptedUpiQrImage, await encryptString(value, key));
  setUpiQrImage("");
};

export const loadUpiQrImageProtected = async () => {
  if (!isPasskeyRegistered()) return getUpiQrImage();
  const key = await getDataKey();
  if (!key) return "";
  const payload = getEncryptedValue(passkeyStorageKeys.encryptedUpiQrImage);
  if (!payload) return "";
  try {
    return await decryptString(payload, key);
  } catch {
    return "";
  }
};

export const saveProfileConfigProtected = async (config: unknown) => {
  if (!isPasskeyRegistered()) {
    setProfileConfig(config);
    return;
  }
  const key = await ensureDataKey();
  setEncryptedValue(passkeyStorageKeys.encryptedProfileConfig, await encryptString(JSON.stringify(config), key));
  clearProfileConfig();
};

export const loadProfileConfigProtected = async () => {
  if (!isPasskeyRegistered()) return getProfileConfig();
  const key = await getDataKey();
  if (!key) return null;
  const payload = getEncryptedValue(passkeyStorageKeys.encryptedProfileConfig);
  if (!payload) return null;
  try {
    return JSON.parse(await decryptString(payload, key)) as unknown;
  } catch {
    return null;
  }
};

export const storeCredentialId = (rawId: ArrayBuffer) => {
  localStorage.setItem(passkeyStorageKeys.credentialId, bufferToBase64Url(rawId));
};

export const clearProtectedData = () => {
  localStorage.removeItem(passkeyStorageKeys.encryptedUserData);
  localStorage.removeItem(passkeyStorageKeys.encryptedPinnedFields);
  localStorage.removeItem(passkeyStorageKeys.encryptedUpiQrImage);
  localStorage.removeItem(passkeyStorageKeys.encryptedProfileConfig);
  clearUserData();
  clearPinnedFields();
  clearProfileConfig();
  setUpiQrImage("");
};
