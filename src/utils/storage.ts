export const storageKeys = {
  hasSeenGetStarted: "has_seen_get_started",
  userData: "user_data",
  profileImage: "profile_image",
  pinnedFields: "pinned_fields",
  upiQrImage: "upi_qr_image",
  profileConfig: "profile_config"
};

export function getBoolean(key: string, fallback = false) {
  const value = localStorage.getItem(key);
  if (value === null) return fallback;
  return value === "true";
}

export function setBoolean(key: string, value: boolean) {
  localStorage.setItem(key, value ? "true" : "false");
}

export function getString(key: string) {
  return localStorage.getItem(key) ?? "";
}

export function setString(key: string, value: string) {
  localStorage.setItem(key, value);
}

export function getUserData(): Record<string, string> {
  const raw = localStorage.getItem(storageKeys.userData);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return {};
    const cleaned: Record<string, string> = {};
    Object.entries(parsed).forEach(([key, value]) => {
      if (typeof value === "string") {
        cleaned[key] = value;
        return;
      }
      if (value !== null && value !== undefined) {
        cleaned[key] = String(value);
      }
    });
    return cleaned;
  } catch {
    return {};
  }
}

export function setUserData(data: Record<string, string>) {
  localStorage.setItem(storageKeys.userData, JSON.stringify(data));
}

export function clearUserData() {
  localStorage.removeItem(storageKeys.userData);
}

export function getPinnedFields(): string[] {
  const raw = localStorage.getItem(storageKeys.pinnedFields);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setPinnedFields(fields: string[]) {
  localStorage.setItem(storageKeys.pinnedFields, JSON.stringify(fields));
}

export function clearPinnedFields() {
  localStorage.removeItem(storageKeys.pinnedFields);
}

export function getProfileImage() {
  return localStorage.getItem(storageKeys.profileImage) ?? "";
}

export function setProfileImage(base64: string) {
  if (base64) {
    localStorage.setItem(storageKeys.profileImage, base64);
  } else {
    localStorage.removeItem(storageKeys.profileImage);
  }
}

export function getUpiQrImage() {
  return localStorage.getItem(storageKeys.upiQrImage) ?? "";
}

export function setUpiQrImage(base64: string) {
  if (base64) {
    localStorage.setItem(storageKeys.upiQrImage, base64);
  } else {
    localStorage.removeItem(storageKeys.upiQrImage);
  }
}

export function getProfileConfig(): unknown {
  const raw = localStorage.getItem(storageKeys.profileConfig);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setProfileConfig(config: unknown) {
  localStorage.setItem(storageKeys.profileConfig, JSON.stringify(config));
}

export function clearProfileConfig() {
  localStorage.removeItem(storageKeys.profileConfig);
}

