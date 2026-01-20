export const storageKeys = {
  hasSeenGetStarted: "has_seen_get_started",
  userData: "user_data",
  profileImage: "profile_image",
  pinnedFields: "pinned_fields"
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
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed ?? {};
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

