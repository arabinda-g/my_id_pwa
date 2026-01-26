import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MdAccountBalance,
  MdAccountBalanceWallet,
  MdAdd,
  MdClear,
  MdContentCopy,
  MdCreditCard,
  MdDeleteForever,
  MdDirectionsCar,
  MdEdit,
  MdEmail,
  MdFacebook,
  MdFileDownload,
  MdFileUpload,
  MdHome,
  MdInfoOutline,
  MdLanguage,
  MdLock,
  MdLockOpen,
  MdLocationCity,
  MdMenu,
  MdPayment,
  MdPerson,
  MdPersonOutline,
  MdPhone,
  MdPushPin,
  MdOutlinePushPin,
  MdQrCode,
  MdQrCodeScanner,
  MdSave,
  MdSettings,
  MdShare
} from "react-icons/md";
import { FaInstagram, FaLinkedinIn, FaSkype, FaWhatsapp } from "react-icons/fa";
import {
  clearPinnedFields,
  clearProfileConfig,
  clearUserData,
  getProfileImage,
  setProfileImage
} from "../utils/storage";
import { Modal } from "../components/Modal";
import { PasskeyPromptModal } from "../components/PasskeyPromptModal";
import { QrModal } from "../components/QrModal";
import Settings from "./Settings";
import {
  clearProtectedData,
  getFieldLocks,
  getSectionLocks,
  hasStoredUserData,
  isPasskeyRegistered,
  loadFieldValueProtected,
  loadPinnedFieldsProtected,
  loadProfileConfigProtected,
  loadUpiQrImageProtected,
  loadUserDataProtected,
  savePinnedFieldsProtected,
  saveProfileConfigProtected,
  saveUpiQrImageProtected,
  saveUserDataProtected,
  setFieldLocks,
  setSectionLocks,
  verifyPasskey
} from "../utils/passkey";

const iconRegistry = {
  person: MdPerson,
  personOutline: MdPersonOutline,
  email: MdEmail,
  phone: MdPhone,
  home: MdHome,
  locationCity: MdLocationCity,
  language: MdLanguage,
  accountBalance: MdAccountBalance,
  creditCard: MdCreditCard,
  directionsCar: MdDirectionsCar,
  payment: MdPayment,
  wallet: MdAccountBalanceWallet,
  share: MdShare,
  facebook: MdFacebook,
  linkedin: FaLinkedinIn,
  skype: FaSkype,
  whatsapp: FaWhatsapp,
  instagram: FaInstagram,
  info: MdInfoOutline
};

type IconKey = keyof typeof iconRegistry;

type FieldConfig = {
  key: string;
  label: string;
  iconKey: IconKey;
  required?: boolean;
};

type CategoryConfig = {
  id: string;
  title: string;
  iconKey: IconKey;
  color: string;
  fields: FieldConfig[];
};

const NAME_PIN_KEY = "fullName";

const isNameField = (key: string) => key === "firstName" || key === "lastName";

const normalizePinnedFields = (fields: string[]) => {
  let hasName = false;
  const normalized: string[] = [];
  fields.forEach((key) => {
    if (isNameField(key) || key === NAME_PIN_KEY) {
      if (!hasName) {
        normalized.push(NAME_PIN_KEY);
        hasName = true;
      }
      return;
    }
    if (!normalized.includes(key)) {
      normalized.push(key);
    }
  });
  return normalized;
};

const iconOptions: { key: IconKey; label: string }[] = [
  { key: "person", label: "Person" },
  { key: "personOutline", label: "Person Outline" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "home", label: "Home" },
  { key: "locationCity", label: "City" },
  { key: "language", label: "Website" },
  { key: "accountBalance", label: "Bank" },
  { key: "creditCard", label: "Card" },
  { key: "directionsCar", label: "License" },
  { key: "payment", label: "Payment" },
  { key: "wallet", label: "Wallet" },
  { key: "share", label: "Share" },
  { key: "facebook", label: "Facebook" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "skype", label: "Skype" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "instagram", label: "Instagram" },
  { key: "info", label: "Info" }
];

const colorOptions = ["#3b82f6", "#22c55e", "#f97316", "#a855f7", "#4f46e5", "#14b8a6", "#ef4444"];

const createId = () =>
  `section_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

const resolveIcon = (iconKey?: IconKey) => iconRegistry[iconKey ?? "info"] ?? MdInfoOutline;

const buildFieldKey = (label: string, categories: CategoryConfig[]) => {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const base = slug || "custom_field";
  const existing = new Set(categories.flatMap((category) => category.fields.map((field) => field.key)));
  if (!existing.has(base)) return base;
  let index = 2;
  while (existing.has(`${base}_${index}`)) index += 1;
  return `${base}_${index}`;
};

const parseStoredCategories = (raw: unknown): CategoryConfig[] | null => {
  if (!Array.isArray(raw)) return null;
  const parsed = raw
    .map((category) => {
      if (!category || typeof category !== "object") return null;
      const entry = category as Record<string, unknown>;
      const title = typeof entry.title === "string" ? entry.title : null;
      const color = typeof entry.color === "string" ? entry.color : null;
      const iconKeyValue = typeof entry.iconKey === "string" ? entry.iconKey : null;
      const iconKey = iconKeyValue && iconKeyValue in iconRegistry ? (iconKeyValue as IconKey) : null;
      const fieldsRaw = Array.isArray(entry.fields) ? entry.fields : null;
      if (!title || !color || !iconKey || !fieldsRaw) return null;
      const fields = fieldsRaw
        .map((field) => {
          if (!field || typeof field !== "object") return null;
          const fieldEntry = field as Record<string, unknown>;
          const key = typeof fieldEntry.key === "string" ? fieldEntry.key : null;
          const label = typeof fieldEntry.label === "string" ? fieldEntry.label : null;
          const fieldIconKeyValue =
            typeof fieldEntry.iconKey === "string" ? fieldEntry.iconKey : null;
          const fieldIconKey =
            fieldIconKeyValue && fieldIconKeyValue in iconRegistry
              ? (fieldIconKeyValue as IconKey)
              : null;
          const required =
            typeof fieldEntry.required === "boolean" ? fieldEntry.required : undefined;
          if (!key || !label || !fieldIconKey) return null;
          return { key, label, iconKey: fieldIconKey, required };
        })
        .filter(Boolean) as FieldConfig[];
      const id = typeof entry.id === "string" ? entry.id : createId();
      return { id, title, iconKey, color, fields };
    })
    .filter(Boolean) as CategoryConfig[];
  return parsed.length ? parsed : null;
};

const formatPhoneNumber = (input: string) => {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return trimmed;

  if (trimmed.startsWith("+")) {
    if (digits.startsWith("91") && digits.length >= 12) {
      const national = digits.slice(2);
      const formattedNational =
        national.length > 5 ? `${national.slice(0, 5)} ${national.slice(5)}` : national;
      return `+91 ${formattedNational}`;
    }
    const ccLen = [1, 2, 3].find((len) => digits.length - len >= 4) ?? 1;
    const countryCode = digits.slice(0, ccLen);
    const rest = digits.slice(ccLen);
    return rest ? `+${countryCode} ${rest}` : `+${countryCode}`;
  }

  if (digits.startsWith("91") && digits.length >= 12) {
    const national = digits.slice(2);
    const formattedNational =
      national.length > 5 ? `${national.slice(0, 5)} ${national.slice(5)}` : national;
    return `+91 ${formattedNational}`;
  }

  if (digits.length === 10) {
    return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  }

  return trimmed;
};

const formatAadhaarNumber = (input: string) => {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return trimmed;
  const groups = digits.match(/.{1,4}/g);
  return groups ? groups.join(" ") : digits;
};

const splitUrlPrefix = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withProtocol = trimmed.match(/^(https?:\/\/)(www\.)?/i);
  if (withProtocol) {
    const prefix = withProtocol[0];
    return { prefix, rest: trimmed.slice(prefix.length) };
  }
  const withWww = trimmed.match(/^(www\.)/i);
  if (withWww) {
    const prefix = withWww[0];
    return { prefix, rest: trimmed.slice(prefix.length) };
  }
  return null;
};

const renderUrlValue = (value: string, prefixClass: string, restClass: string) => {
  const parts = splitUrlPrefix(value);
  if (!parts) return value;
  return (
    <>
      <span className={prefixClass}>{parts.prefix}</span>
      <span className={`${restClass} break-all`}>{parts.rest}</span>
    </>
  );
};

const isUrlValue = (value: string) => Boolean(splitUrlPrefix(value));

const stripUrlPrefix = (value: string) => {
  const parts = splitUrlPrefix(value);
  return parts ? parts.rest : value;
};

const getUrlHref = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^www\./i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
};

const buildVCard = (userData: Record<string, string>) => {
  const firstName = userData["firstName"] || "";
  const lastName = userData["lastName"] || "";
  const email = userData["email"] || "";
  const phone = userData["phoneNumber"] || "";
  const address = userData["address"] || "";
  const website = userData["website"] || "";
  const linkedIn = userData["linkedInUrl"] || "";
  const facebook = userData["facebook"] || "";
  const instagram = userData["instagram"] || "";
  const whatsapp = userData["whatsappLink"] || "";
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${[firstName, lastName].filter(Boolean).join(" ")}`.trim(),
    email ? `EMAIL:${email}` : "",
    phone ? `TEL:${phone}` : "",
    address ? `ADR:;;${address};;;;` : "",
    website ? `URL:${website}` : "",
    linkedIn ? `X-SOCIALPROFILE;TYPE=linkedin:${linkedIn}` : "",
    facebook ? `X-SOCIALPROFILE;TYPE=facebook:${facebook}` : "",
    instagram ? `X-SOCIALPROFILE;TYPE=instagram:${instagram}` : "",
    whatsapp ? `X-SOCIALPROFILE;TYPE=whatsapp:${whatsapp}` : "",
    "END:VCARD"
  ]
    .filter(Boolean)
    .join("\n");

  return lines;
};

const defaultCategories: CategoryConfig[] = [
  {
    id: "personal",
    title: "Personal Information",
    iconKey: "person",
    color: "#3b82f6",
    fields: [
      { iconKey: "person", key: "firstName", label: "First Name", required: true },
      { iconKey: "person", key: "lastName", label: "Last Name", required: true }
    ]
  },
  {
    id: "contact",
    title: "Contact Details",
    iconKey: "phone",
    color: "#22c55e",
    fields: [
      { iconKey: "email", key: "email", label: "Email", required: true },
      { iconKey: "phone", key: "phoneNumber", label: "Phone Number", required: true },
      { iconKey: "home", key: "address", label: "Address" },
      { iconKey: "locationCity", key: "permanentAddress", label: "Permanent Address" },
      { iconKey: "language", key: "website", label: "Website" }
    ]
  },
  {
    id: "documents",
    title: "Official Documents",
    iconKey: "accountBalance",
    color: "#f97316",
    fields: [
      { iconKey: "accountBalance", key: "passportNumber", label: "Passport Number" },
      { iconKey: "creditCard", key: "aadhaar", label: "Aadhaar" },
      { iconKey: "directionsCar", key: "dlNumber", label: "DL Number" },
      { iconKey: "accountBalance", key: "panCardNumber", label: "PAN Card Number" }
    ]
  },
  {
    id: "payments",
    title: "Digital Payments",
    iconKey: "payment",
    color: "#a855f7",
    fields: [{ iconKey: "wallet", key: "upiAddress", label: "UPI Address (Paytm)" }]
  },
  {
    id: "social",
    title: "Social Media",
    iconKey: "share",
    color: "#4f46e5",
    fields: [
      { iconKey: "linkedin", key: "linkedInUrl", label: "LinkedIn URL" },
      { iconKey: "facebook", key: "facebook", label: "Facebook" },
      { iconKey: "skype", key: "skypeId", label: "Skype ID" },
      { iconKey: "whatsapp", key: "whatsappLink", label: "WhatsApp link to chat" },
      { iconKey: "instagram", key: "instagram", label: "Instagram" }
    ]
  },
  {
    id: "family",
    title: "Family",
    iconKey: "personOutline",
    color: "#14b8a6",
    fields: [
      { iconKey: "personOutline", key: "fatherName", label: "Father name" },
      { iconKey: "personOutline", key: "motherName", label: "Mother name" }
    ]
  }
];

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [categories, setCategories] = useState<CategoryConfig[]>(defaultCategories);
  const [userData, setLocalUserData] = useState<Record<string, string>>({});
  const [profileImage, setLocalProfileImage] = useState("");
  const [upiQrImage, setLocalUpiQrImage] = useState("");
  const [pinnedFields, setPinnedFields] = useState<string[]>([]);
  const [lockedSections, setLockedSections] = useState<string[]>([]);
  const [lockedFields, setLockedFields] = useState<string[]>([]);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [exportPassword, setExportPassword] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importPassword, setImportPassword] = useState("");
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [passkeyEnabled, setPasskeyEnabled] = useState(isPasskeyRegistered());
  const [message, setMessage] = useState<{ text: string; tone: "ok" | "warn" | "error" } | null>(
    null
  );
  const [isPasskeyPromptOpen, setIsPasskeyPromptOpen] = useState(false);
  const [passkeyPromptStatus, setPasskeyPromptStatus] = useState<"verifying" | "success">("verifying");
  const passkeyAbortRef = useRef<AbortController | null>(null);

  const loadFromStorage = useCallback(async () => {
    const storedConfig = parseStoredCategories(await loadProfileConfigProtected());
    const nextCategories = storedConfig ?? defaultCategories;
    const sectionLocks = getSectionLocks();
    const fieldLocks = getFieldLocks();
    const data = await loadUserDataProtected(
      nextCategories,
      new Set(sectionLocks),
      new Set(fieldLocks),
      false
    );
    const hasData = isPasskeyRegistered()
      ? hasStoredUserData()
      : Object.values(data).some((value) => value.trim().length > 0);
    const storedPinned = await loadPinnedFieldsProtected();
    const normalizedPinned = normalizePinnedFields(storedPinned);
    const upiImage = await loadUpiQrImageProtected();
    const upiLocked =
      fieldLocks.includes("upiAddress") ||
      nextCategories.some(
        (category) =>
          sectionLocks.includes(category.id) &&
          category.fields.some((field) => field.key === "upiAddress")
      );
    setPasskeyEnabled(isPasskeyRegistered());
    setCategories(nextCategories);
    setLockedSections(sectionLocks);
    setLockedFields(fieldLocks);
    setLocalUserData(data);
    setIsViewMode(hasData);
    setLocalProfileImage(getProfileImage());
    setLocalUpiQrImage(upiLocked ? "" : upiImage);
    setPinnedFields(normalizedPinned);
    if (storedPinned.join("|") !== normalizedPinned.join("|")) {
      await savePinnedFieldsProtected(normalizedPinned);
    }
  }, []);

  useEffect(() => {
    void loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    const handlePasskeyChange = () => {
      void loadFromStorage();
    };
    window.addEventListener("passkey-change", handlePasskeyChange);
    return () => window.removeEventListener("passkey-change", handlePasskeyChange);
  }, [loadFromStorage]);

  useEffect(() => {
    void saveProfileConfigProtected(categories);
  }, [categories]);

  const userName = useMemo(() => userData["firstName"] || "User", [userData]);

  const userEmail = useMemo(() => userData["email"] || "", [userData]);

  const showMessage = (text: string, tone: "ok" | "warn" | "error") => {
    setMessage({ text, tone });
    window.setTimeout(() => setMessage(null), 2000);
  };

  const requirePasskey = async () => {
    if (!passkeyEnabled) return true;
    const controller = new AbortController();
    passkeyAbortRef.current?.abort();
    passkeyAbortRef.current = controller;
    setIsPasskeyPromptOpen(true);
    setPasskeyPromptStatus("verifying");
    const result = await verifyPasskey(controller.signal);
    if (result.ok) {
      setPasskeyPromptStatus("success");
      window.setTimeout(() => setIsPasskeyPromptOpen(false), 450);
    } else {
      setIsPasskeyPromptOpen(false);
    }
    if (!result.ok) {
      showMessage(result.error ?? "Passkey verification failed.", "error");
      return false;
    }
    return true;
  };

  const isFieldLocked = (fieldKey: string) => {
    if (!passkeyEnabled) return false;
    if (lockedFields.includes(fieldKey)) return true;
    const section = categories.find((category) =>
      category.fields.some((field) => field.key === fieldKey)
    );
    return section ? lockedSections.includes(section.id) : false;
  };

  const refreshViewData = async () => {
    const data = await loadUserDataProtected(
      categories,
      new Set(lockedSections),
      new Set(lockedFields),
      false
    );
    setLocalUserData(data);
    const upiLocked = isFieldLocked("upiAddress");
    setLocalUpiQrImage(upiLocked ? "" : await loadUpiQrImageProtected());
  };

  const enterEditMode = async () => {
    const verified = await requirePasskey();
    if (!verified) return;
    const data = await loadUserDataProtected(categories, new Set(), new Set(), true);
    setLocalUserData(data);
    setLocalUpiQrImage(await loadUpiQrImageProtected());
    setIsViewMode(false);
  };

  const lockSection = (sectionId: string) => {
    if (!passkeyEnabled) return;
    const updated = Array.from(new Set([...lockedSections, sectionId]));
    setLockedSections(updated);
    setSectionLocks(updated);
    const section = categories.find((category) => category.id === sectionId);
    if (!section) return;
    if (isViewMode) {
      setLocalUserData((prev) => {
        const next = { ...prev };
        section.fields.forEach((field) => {
          delete next[field.key];
        });
        return next;
      });
      if (section.fields.some((field) => field.key === "upiAddress")) {
        setLocalUpiQrImage("");
      }
    }
  };

  const unlockSection = async (sectionId: string, persist = true) => {
    const verified = await requirePasskey();
    if (!verified) return;
    const updated = lockedSections.filter((id) => id !== sectionId);
    setLockedSections(updated);
    if (persist) {
      setSectionLocks(updated);
    }
    const data = await loadUserDataProtected(categories, new Set(updated), new Set(lockedFields), false);
    setLocalUserData(data);
    const upiLocked =
      lockedFields.includes("upiAddress") ||
      categories.some(
        (category) =>
          category.id !== sectionId &&
          updated.includes(category.id) &&
          category.fields.some((field) => field.key === "upiAddress")
      );
    setLocalUpiQrImage(upiLocked ? "" : await loadUpiQrImageProtected());
  };

  const lockField = (fieldKey: string) => {
    if (!passkeyEnabled) return;
    const updated = Array.from(new Set([...lockedFields, fieldKey]));
    setLockedFields(updated);
    setFieldLocks(updated);
    if (isViewMode) {
      setLocalUserData((prev) => {
        const next = { ...prev };
        delete next[fieldKey];
        return next;
      });
      if (fieldKey === "upiAddress") {
        setLocalUpiQrImage("");
      }
    }
  };

  const unlockField = async (fieldKey: string) => {
    const verified = await requirePasskey();
    if (!verified) return;
    const updated = lockedFields.filter((key) => key !== fieldKey);
    setLockedFields(updated);
    setFieldLocks(updated);
    const section = categories.find((category) => category.fields.some((field) => field.key === fieldKey));
    if (section && lockedSections.includes(section.id)) {
      return;
    }
    const value = await loadFieldValueProtected(fieldKey);
    setLocalUserData((prev) => ({ ...prev, [fieldKey]: value }));
    if (fieldKey === "upiAddress") {
      setLocalUpiQrImage(await loadUpiQrImageProtected());
    }
  };

  const revealLockedFieldValue = async (fieldKey: string) => {
    const verified = await requirePasskey();
    if (!verified) return "";
    if (isNameField(fieldKey)) {
      const [first, last] = await Promise.all([
        loadFieldValueProtected("firstName"),
        loadFieldValueProtected("lastName")
      ]);
      return [first, last].filter(Boolean).join(" ").trim();
    }
    return loadFieldValueProtected(fieldKey);
  };

  const toggleSectionLock = (sectionId: string) => {
    if (!passkeyEnabled) return;
    if (lockedSections.includes(sectionId)) {
      void unlockSection(sectionId, !isViewMode);
    } else {
      lockSection(sectionId);
    }
  };

  const toggleFieldLock = (fieldKey: string) => {
    if (!passkeyEnabled) return;
    if (lockedFields.includes(fieldKey)) {
      void unlockField(fieldKey);
    } else {
      lockField(fieldKey);
    }
  };

  const revealPinnedValue = async (fieldKey: string) => {
    const verified = await requirePasskey();
    if (!verified) return "";
    if (fieldKey === NAME_PIN_KEY) {
      const first = await loadFieldValueProtected("firstName");
      const last = await loadFieldValueProtected("lastName");
      return [first, last].filter(Boolean).join(" ").trim();
    }
    return loadFieldValueProtected(fieldKey);
  };

  const getExportFilename = () => {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, "0");
    const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
      now.getDate()
    )}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    return `profile-${timestamp}.enc.json`;
  };

  const handleImagePick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setProfileImage(result);
        setLocalProfileImage(result);
      }
      event.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  const readClipboardImage = async () => {
    if (!navigator.clipboard?.read) {
      showMessage("Clipboard images not supported", "warn");
      return "";
    }
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((type) => type.startsWith("image/"));
        if (!imageType) continue;
        const blob = await item.getType(imageType);
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result;
            if (typeof result === "string") {
              resolve(result);
            } else {
              reject(new Error("Invalid image data"));
            }
          };
          reader.onerror = () => reject(new Error("Failed to read image"));
          reader.readAsDataURL(blob);
        });
        return dataUrl;
      }
      showMessage("No image found in clipboard", "warn");
      return "";
    } catch {
      showMessage("Unable to read clipboard image", "error");
      return "";
    }
  };

  const updateField = (key: string, value: string) => {
    setLocalUserData((prev) => ({ ...prev, [key]: value }));
  };

  const saveUserInfo = async () => {
    const missingFields: string[] = [];
    categories.forEach((category) => {
      category.fields.forEach((field) => {
        if (field.required && !userData[field.key]?.trim()) {
          missingFields.push(field.label);
        }
      });
    });

    if (missingFields.length) {
      showMessage(`Please fill in required fields: ${missingFields.join(", ")}`, "error");
      return;
    }

    const cleaned: Record<string, string> = {};
    Object.entries(userData).forEach(([key, value]) => {
      if (value.trim()) cleaned[key] = value.trim();
    });

    if (!Object.keys(cleaned).length) {
      showMessage("Please fill in some information first", "warn");
      return;
    }

    await saveUserDataProtected(cleaned);
    setIsViewMode(true);
    if (passkeyEnabled) {
      await refreshViewData();
    } else {
      setLocalUserData(cleaned);
    }
    showMessage("Data saved successfully!", "ok");
  };

  const completionPercentage = () => {
    const totalFields = categories.reduce((sum, category) => sum + category.fields.length, 0);
    const filledFields = categories.reduce((sum, category) => {
      return (
        sum +
        category.fields.filter((field) => userData[field.key]?.trim().length).length
      );
    }, 0);
    return totalFields ? filledFields / totalFields : 0;
  };

  const categoryCompletion = (category: CategoryConfig) =>
    category.fields.filter((field) => userData[field.key]?.trim().length).length;

  const hasAnyData = passkeyEnabled
    ? hasStoredUserData()
    : Object.values(userData).some((value) => value.trim().length > 0);
  const qrData = useMemo(() => buildVCard(userData), [userData]);

  const toBase64 = (buffer: ArrayBuffer) => {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const fromBase64 = (value: string) => {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  };

  const encryptPayload = async (payload: unknown, password: string) => {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const iterations = 100000;
    const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, [
      "deriveKey"
    ]);
    const key = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt"]
    );
    const plaintext = encoder.encode(JSON.stringify(payload));
    const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
    return {
      version: 1,
      algorithm: "AES-GCM",
      kdf: "PBKDF2",
      hash: "SHA-256",
      iterations,
      salt: toBase64(salt.buffer),
      iv: toBase64(iv.buffer),
      ciphertext: toBase64(ciphertext)
    };
  };

  const decryptPayload = async (payload: {
    salt: string;
    iv: string;
    ciphertext: string;
    iterations?: number;
  }, password: string) => {
    const encoder = new TextEncoder();
    const salt = new Uint8Array(fromBase64(payload.salt));
    const iv = new Uint8Array(fromBase64(payload.iv));
    const iterations = payload.iterations ?? 100000;
    const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, [
      "deriveKey"
    ]);
    const key = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      fromBase64(payload.ciphertext)
    );
    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(plaintext)) as unknown;
  };

  const handleExport = async () => {
    const trimmedPassword = exportPassword.trim();
    if (!trimmedPassword) {
      showMessage("Please enter a password", "warn");
      return;
    }
    if (passkeyEnabled) {
      const verified = await requirePasskey();
      if (!verified) return;
    }
    setIsExporting(true);
    const data = await loadUserDataProtected(categories, new Set(), new Set(), true);
    const pinned = await loadPinnedFieldsProtected();
    const upiImage = await loadUpiQrImageProtected();
    const exportPayload = {
      version: 1,
      profile: {
        userData: data,
        profileImage: getProfileImage(),
        pinnedFields: pinned,
        upiQrImage: upiImage,
        categories
      }
    };
    try {
      const encryptedPayload = await encryptPayload(exportPayload, trimmedPassword);
      const blob = new Blob([JSON.stringify(encryptedPayload, null, 2)], {
        type: "application/json"
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = getExportFilename();
      anchor.click();
      URL.revokeObjectURL(url);
      setIsExportOpen(false);
      setExportPassword("");
    } catch {
      showMessage("Export failed", "error");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPendingImportFile(file);
    setIsImportOpen(true);
  };

  const handleImportConfirm = async () => {
    if (passkeyEnabled) {
      const verified = await requirePasskey();
      if (!verified) return;
    }
    if (!pendingImportFile) return;
    const trimmedPassword = importPassword.trim();
    if (!trimmedPassword) {
      showMessage("Please enter a password", "warn");
      return;
    }
    setIsImporting(true);
    try {
      const text = await pendingImportFile.text();
      const parsed = JSON.parse(text) as unknown;
      if (!parsed || typeof parsed !== "object") {
        throw new Error("Invalid profile data");
      }
      const parsedObject = parsed as Record<string, unknown>;
      const isEncrypted =
        typeof parsedObject["ciphertext"] === "string" &&
        typeof parsedObject["salt"] === "string" &&
        typeof parsedObject["iv"] === "string";
      const decrypted = isEncrypted
        ? await decryptPayload(
            parsedObject as {
              salt: string;
              iv: string;
              ciphertext: string;
              iterations?: number;
            },
            trimmedPassword
          )
        : parsedObject;
      if (!decrypted || typeof decrypted !== "object") {
        throw new Error("Invalid profile data");
      }
      const decryptedObject = decrypted as Record<string, unknown>;
      const profile = decryptedObject.profile;
      if (!profile || typeof profile !== "object") {
        throw new Error("Invalid profile data");
      }
      const profileObject = profile as Record<string, unknown>;
      const dataRaw = profileObject.userData;
      const data: Record<string, string> = {};
      if (dataRaw && typeof dataRaw === "object") {
        Object.entries(dataRaw as Record<string, unknown>).forEach(([key, value]) => {
          if (typeof value === "string") {
            data[key] = value;
          }
        });
      }
      const image = typeof profileObject.profileImage === "string" ? profileObject.profileImage : "";
      const pinned = Array.isArray(profileObject.pinnedFields)
        ? profileObject.pinnedFields.filter((item): item is string => typeof item === "string")
        : [];
      const upiImage = typeof profileObject.upiQrImage === "string" ? profileObject.upiQrImage : "";
      const importedCategories = parseStoredCategories(profileObject.categories);
      if (!importedCategories) {
        throw new Error("Invalid profile config");
      }
      const normalizedPinned = normalizePinnedFields(pinned);
      await saveUserDataProtected(data);
      await savePinnedFieldsProtected(normalizedPinned);
      setProfileImage(image);
      setLocalProfileImage(image);
      await saveUpiQrImageProtected(upiImage);
      setPinnedFields(normalizedPinned);
      setCategories(importedCategories);
      setLockedSections([]);
      setLockedFields([]);
      setSectionLocks([]);
      setFieldLocks([]);
      setIsViewMode(
        passkeyEnabled
          ? hasStoredUserData()
          : Object.values(data).some((value) => value.trim().length > 0)
      );
      await refreshViewData();
      showMessage("Profile imported", "ok");
    } catch {
      showMessage("Import failed", "error");
    } finally {
      setIsImporting(false);
      setIsImportOpen(false);
      setImportPassword("");
      setPendingImportFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleClear = () => {
    if (isPasskeyRegistered()) {
      clearProtectedData();
    } else {
      clearUserData();
      clearPinnedFields();
      clearProfileConfig();
    }
    setProfileImage("");
    setLocalUserData({});
    setIsViewMode(false);
    setPinnedFields([]);
    void saveUpiQrImageProtected("");
    setLocalUpiQrImage("");
    setCategories(defaultCategories);
    setLockedSections([]);
    setLockedFields([]);
    setSectionLocks([]);
    setFieldLocks([]);
    showMessage("Profile cleared", "ok");
  };

  return (
    <div className="min-h-screen bg-[#F3EFEF] text-black">
      {isDrawerOpen ? (
        <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setIsDrawerOpen(false)} />
      ) : null}
      <div
        className={`fixed left-0 top-0 z-50 h-full w-72 bg-white shadow-2xl transition-transform duration-300 ${
          isDrawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6">
          <div className="flex flex-col items-center gap-3">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImagePick}
              />
              <div className="rounded-full bg-gradient-to-br from-purple-700 to-black p-1 shadow-lg shadow-purple-900/20">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white">
                  {profileImage ? (
                    <img src={profileImage} alt="Profile" className="h-20 w-20 rounded-full object-cover" />
                  ) : (
                    <MdPerson className="text-5xl text-purple-700" />
                  )}
                </div>
              </div>
            </label>
            <div className="text-center">
              <p className="text-lg font-semibold">{userName}</p>
              {userEmail ? <p className="text-sm text-black/50">{userEmail}</p> : null}
            </div>
          </div>
        </div>
        <div className="border-t border-black/10 px-6 py-4">
          <div className="text-xs font-semibold uppercase tracking-widest text-black/50">
            Quick actions
          </div>
          {isViewMode ? (
            <div className="mt-4">
              <button
                className="flex w-full items-center justify-center gap-3 rounded-2xl px-5 py-4 text-base font-semibold text-white shadow-lg"
                style={{ background: "linear-gradient(135deg, #f97316, #fdba74)" }}
                onClick={() => {
                  setIsDrawerOpen(false);
                  void enterEditMode();
                }}
              >
                <span className="rounded-lg bg-white/20 p-2">
                  <MdEdit className="text-lg" />
                </span>
                Edit Profile
              </button>
            </div>
          ) : null}
          <div className="mt-3 space-y-4">
            <div className="rounded-2xl bg-black/[0.03] p-2 shadow-sm">
              <button
                className="group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium hover:bg-white"
                onClick={() => {
                  setIsDrawerOpen(false);
                  if (!hasAnyData) {
                    showMessage("Please save your information first", "warn");
                    return;
                  }
                  setIsQrOpen(true);
                }}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 text-green-700 shadow-sm">
                  <MdQrCode className="text-lg" />
                </span>
                <span className="flex-1">QR Code</span>
              </button>
            </div>

            <div className="rounded-2xl bg-black/[0.03] p-2 shadow-sm">
              <button
                className="group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium hover:bg-white"
                onClick={() => {
                  setIsDrawerOpen(false);
                  void (async () => {
                    const verified = await requirePasskey();
                    if (!verified) return;
                    setIsSettingsOpen(true);
                  })();
                }}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 text-purple-700 shadow-sm">
                  <MdSettings className="text-lg" />
                </span>
                <span className="flex-1">Settings</span>
              </button>
            </div>

            <div className="rounded-2xl bg-black/[0.03] p-2 shadow-sm">
              <button
                className="group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium hover:bg-white"
                onClick={() => {
                  if (!hasAnyData) {
                    showMessage("Please save your information first", "warn");
                    return;
                  }
                  setIsExportOpen(true);
                }}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700 shadow-sm">
                  <MdFileUpload className="text-lg" />
                </span>
                <span className="flex-1">Export Profile</span>
              </button>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json"
                  onChange={handleImport}
                  className="hidden"
                  aria-label="Import profile"
                />
                <button
                  className="group mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium hover:bg-white"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 shadow-sm">
                    <MdFileDownload className="text-lg" />
                  </span>
                  <span className="flex-1">Import Profile</span>
                </button>
              </div>
              <button
                className="group mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-red-700 hover:bg-white"
                onClick={() => setIsClearConfirmOpen(true)}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 text-red-700 shadow-sm">
                  <MdDeleteForever className="text-lg" />
                </span>
                <span className="flex-1">Clear All Data</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="relative">
        <button
          type="button"
          aria-label="Open menu"
          className={`fixed left-4 top-4 rounded-xl bg-white/90 p-3 shadow-md ${
            isDrawerOpen ? "hidden" : "z-30"
          }`}
          onClick={() => setIsDrawerOpen(true)}
        >
          <MdMenu className="text-2xl text-black/70" />
        </button>
        <UserInfoForm
          isViewMode={isViewMode}
          categories={categories}
          userData={userData}
          profileImage={profileImage}
          upiQrImage={upiQrImage}
          pinnedFields={pinnedFields}
          passkeyEnabled={passkeyEnabled}
          lockedSections={lockedSections}
          lockedFields={lockedFields}
          onToggleSectionLock={toggleSectionLock}
          onToggleFieldLock={toggleFieldLock}
          onRevealPinnedValue={revealPinnedValue}
          onRevealLockedValue={revealLockedFieldValue}
          onTogglePin={(key) => {
            setPinnedFields((prev) => {
              const normalized = normalizePinnedFields(prev);
              let updated: string[] = [];
              if (isNameField(key)) {
                updated = normalized.includes(NAME_PIN_KEY)
                  ? normalized.filter((item) => item !== NAME_PIN_KEY)
                  : [...normalized, NAME_PIN_KEY];
              } else {
                updated = normalized.includes(key)
                  ? normalized.filter((item) => item !== key)
                  : [...normalized, key];
              }
              void savePinnedFieldsProtected(updated);
              return updated;
            });
          }}
          onReorderPinned={(fields) => {
            const normalized = normalizePinnedFields(fields);
            void savePinnedFieldsProtected(normalized);
            setPinnedFields(normalized);
          }}
          onChangeCategories={setCategories}
          onUpdateField={updateField}
          onSave={saveUserInfo}
          onShareQR={() => {
            if (!hasAnyData) {
              showMessage("Please save your information first", "warn");
              return;
            }
            setIsQrOpen(true);
          }}
          completionPercentage={completionPercentage()}
          categoryCompletion={categoryCompletion}
          onPickImage={handleImagePick}
          onClearImage={() => {
            setProfileImage("");
            setLocalProfileImage("");
          }}
          onPasteUpiImage={async () => {
            const dataUrl = await readClipboardImage();
            if (!dataUrl) return;
            await saveUpiQrImageProtected(dataUrl);
            setLocalUpiQrImage(dataUrl);
            showMessage("UPI QR image pasted", "ok");
          }}
          onClearUpiImage={() => {
            void saveUpiQrImageProtected("");
            setLocalUpiQrImage("");
          }}
        />

      </div>

      {message ? (
        <div
          className={`fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-sm text-white shadow-lg ${
            message.tone === "ok"
              ? "bg-green-600"
              : message.tone === "warn"
                ? "bg-orange-500"
                : "bg-red-600"
          }`}
          role="status"
        >
          {message.text}
        </div>
      ) : null}
      <QrModal isOpen={isQrOpen} onClose={() => setIsQrOpen(false)} qrData={qrData} />
      <Modal
        isOpen={isImportOpen}
        onClose={() => {
          if (isImporting) return;
          setIsImportOpen(false);
          setImportPassword("");
          setPendingImportFile(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }}
      >
        <div className="flex flex-col gap-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
            <MdFileDownload className="text-2xl" />
          </div>
          <div>
            <p className="text-lg font-semibold text-black/90">Decrypt import</p>
            <p className="mt-1 text-sm text-black/60">Enter the password used to encrypt this file.</p>
          </div>
          <input
            type="password"
            className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none focus:ring-2 focus:ring-purple-700"
            placeholder="Password"
            value={importPassword}
            onChange={(event) => setImportPassword(event.target.value)}
            autoFocus
          />
          <div className="flex gap-3">
            <button
              type="button"
              className="flex-1 rounded-xl border border-black/10 px-4 py-2 text-sm font-semibold text-black/70"
              onClick={() => {
                if (isImporting) return;
                setIsImportOpen(false);
                setImportPassword("");
                setPendingImportFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="flex-1 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              onClick={handleImportConfirm}
              disabled={isImporting}
            >
              {isImporting ? "Decrypting..." : "Import"}
            </button>
          </div>
        </div>
      </Modal>
      <Modal
        isOpen={isExportOpen}
        onClose={() => {
          if (isExporting) return;
          setIsExportOpen(false);
          setExportPassword("");
        }}
      >
        <div className="flex flex-col gap-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
            <MdFileUpload className="text-2xl" />
          </div>
          <div>
            <p className="text-lg font-semibold text-black/90">Encrypt export</p>
            <p className="mt-1 text-sm text-black/60">Enter a password to encrypt your profile data.</p>
          </div>
          <input
            type="password"
            className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none focus:ring-2 focus:ring-purple-700"
            placeholder="Password"
            value={exportPassword}
            onChange={(event) => setExportPassword(event.target.value)}
            autoFocus
          />
          <div className="flex gap-3">
            <button
              type="button"
              className="flex-1 rounded-xl border border-black/10 px-4 py-2 text-sm font-semibold text-black/70"
              onClick={() => {
                if (isExporting) return;
                setIsExportOpen(false);
                setExportPassword("");
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="flex-1 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? "Encrypting..." : "Export"}
            </button>
          </div>
        </div>
      </Modal>
      <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)}>
        <div className="max-h-[70vh] overflow-y-auto pr-1 text-left">
          <Settings />
        </div>
      </Modal>
      <Modal isOpen={isClearConfirmOpen} onClose={() => setIsClearConfirmOpen(false)}>
        <div className="flex flex-col gap-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-700">
            <MdDeleteForever className="text-2xl" />
          </div>
          <div>
            <p className="text-lg font-semibold text-black/90">Clear all data?</p>
            <p className="mt-1 text-sm text-black/60">
              This will permanently remove your saved profile, image, and pins.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              className="flex-1 rounded-xl border border-black/10 px-4 py-2 text-sm font-semibold text-black/70"
              onClick={() => setIsClearConfirmOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"
              onClick={() => {
                setIsClearConfirmOpen(false);
                void (async () => {
                  if (passkeyEnabled) {
                    const verified = await requirePasskey();
                    if (!verified) return;
                  }
                  setIsDrawerOpen(false);
                  handleClear();
                })();
              }}
            >
              Clear data
            </button>
          </div>
        </div>
      </Modal>
      <PasskeyPromptModal
        isOpen={isPasskeyPromptOpen}
        onCancel={() => {
          passkeyAbortRef.current?.abort();
          setIsPasskeyPromptOpen(false);
        }}
        status={passkeyPromptStatus}
      />
    </div>
  );
}

type UserInfoFormProps = {
  isViewMode: boolean;
  categories: CategoryConfig[];
  userData: Record<string, string>;
  profileImage: string;
  upiQrImage: string;
  pinnedFields: string[];
  passkeyEnabled: boolean;
  lockedSections: string[];
  lockedFields: string[];
  onTogglePin: (key: string) => void;
  onReorderPinned: (fields: string[]) => void;
  onChangeCategories: React.Dispatch<React.SetStateAction<CategoryConfig[]>>;
  onUpdateField: (key: string, value: string) => void;
  onSave: () => void;
  onShareQR: () => void;
  completionPercentage: number;
  categoryCompletion: (category: CategoryConfig) => number;
  onPickImage: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearImage: () => void;
  onPasteUpiImage: () => void;
  onClearUpiImage: () => void;
  onToggleSectionLock: (sectionId: string) => void;
  onToggleFieldLock: (fieldKey: string) => void;
  onRevealPinnedValue: (fieldKey: string) => Promise<string>;
  onRevealLockedValue: (fieldKey: string) => Promise<string>;
};

function UserInfoForm({
  isViewMode,
  categories,
  userData,
  profileImage,
  upiQrImage,
  pinnedFields,
  passkeyEnabled,
  lockedSections,
  lockedFields,
  onTogglePin,
  onReorderPinned,
  onChangeCategories,
  onUpdateField,
  onSave,
  onShareQR,
  completionPercentage,
  categoryCompletion,
  onPickImage,
  onClearImage,
  onPasteUpiImage,
  onClearUpiImage,
  onToggleSectionLock,
  onToggleFieldLock,
  onRevealPinnedValue,
  onRevealLockedValue
}: UserInfoFormProps) {
  const profileInputRef = useRef<HTMLInputElement | null>(null);
  const [isProfileImageOpen, setIsProfileImageOpen] = useState(false);
  const [quickInfoOpen, setQuickInfoOpen] = useState<{
    key: string;
    label: string;
    value: string;
    Icon: React.ComponentType<{ className?: string }>;
  } | null>(null);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [draggingSectionId, setDraggingSectionId] = useState<string | null>(null);
  const [draggingField, setDraggingField] = useState<{
    fieldKey: string;
    fromCategoryId: string;
  } | null>(null);
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newSectionIconKey, setNewSectionIconKey] = useState<IconKey>("person");
  const [newSectionColor, setNewSectionColor] = useState(colorOptions[0]);
  const [isAddFieldOpen, setIsAddFieldOpen] = useState(false);
  const [activeFieldCategoryId, setActiveFieldCategoryId] = useState<string | null>(null);
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldIconKey, setNewFieldIconKey] = useState<IconKey>("info");
  const [newFieldRequired, setNewFieldRequired] = useState(false);

  const fullNameValue = useMemo(() => {
    const first = userData["firstName"]?.trim() ?? "";
    const last = userData["lastName"]?.trim() ?? "";
    return [first, last].filter(Boolean).join(" ").trim();
  }, [userData]);

  const fieldConfigMap = useMemo(() => {
    const entries = categories.flatMap((category) =>
      category.fields.map((field) => [field.key, field] as const)
    );
    return new Map(entries);
  }, [categories]);

  const isFieldLockedForView = (fieldKey: string) => {
    if (!passkeyEnabled) return false;
    if (lockedFields.includes(fieldKey)) return true;
    const section = categories.find((category) =>
      category.fields.some((field) => field.key === fieldKey)
    );
    return section ? lockedSections.includes(section.id) : false;
  };

  const pinnedQuickInfo = useMemo<
    {
      key: string;
      label: string;
      value: string;
      Icon: React.ComponentType<{ className?: string }>;
      isLocked: boolean;
    }[]
  >(() => {
    const items: {
      key: string;
      label: string;
      value: string;
      Icon: React.ComponentType<{ className?: string }>;
      isLocked: boolean;
    }[] = [];

    const isFieldLockedBySection = (fieldKey: string) => {
      const section = categories.find((category) =>
        category.fields.some((field) => field.key === fieldKey)
      );
      return section ? lockedSections.includes(section.id) : false;
    };

    pinnedFields.forEach((key) => {
      if (key === NAME_PIN_KEY) {
        const isLocked =
          lockedFields.includes("firstName") ||
          lockedFields.includes("lastName") ||
          isFieldLockedBySection("firstName") ||
          isFieldLockedBySection("lastName");
        if (!fullNameValue && !isLocked) return;
        items.push({
          key: NAME_PIN_KEY,
          label: "Name",
          value: isLocked ? "" : fullNameValue,
          Icon: MdPerson,
          isLocked
        });
        return;
      }
      const isLocked = lockedFields.includes(key) || isFieldLockedBySection(key);
      const value = isLocked ? "" : userData[key]?.trim() ?? "";
      if (!value && !isLocked) return;
      const field = fieldConfigMap.get(key);
      const Icon = resolveIcon(field?.iconKey);
      items.push({
        key,
        label: field?.label ?? key,
        value,
        Icon,
        isLocked
      });
    });

    return items;
  }, [categories, fieldConfigMap, fullNameValue, lockedFields, lockedSections, pinnedFields, userData]);

  const pinnedQuickInfoEditable = useMemo(() => {
    return pinnedFields.map((key) => {
      if (key === NAME_PIN_KEY) {
        return { key, label: "Name", Icon: MdPerson };
      }
      const field = fieldConfigMap.get(key);
      return { key, label: field?.label ?? key, Icon: resolveIcon(field?.iconKey) };
    });
  }, [fieldConfigMap, pinnedFields]);

  const reorderPinnedFields = (fromKey: string, toKey: string) => {
    if (fromKey === toKey) return;
    const fromIndex = pinnedFields.indexOf(fromKey);
    const toIndex = pinnedFields.indexOf(toKey);
    if (fromIndex < 0 || toIndex < 0) return;
    const updated = [...pinnedFields];
    updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, fromKey);
    onReorderPinned(updated);
  };

  const reorderSections = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    onChangeCategories((prev) => {
      const fromIndex = prev.findIndex((category) => category.id === fromId);
      const toIndex = prev.findIndex((category) => category.id === toId);
      if (fromIndex < 0 || toIndex < 0) return prev;
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
  };

  const moveField = (
    fromCategoryId: string,
    toCategoryId: string,
    fieldKey: string,
    targetFieldKey?: string
  ) => {
    onChangeCategories((prev) => {
      const next = prev.map((category) => ({
        ...category,
        fields: [...category.fields]
      }));
      const source = next.find((category) => category.id === fromCategoryId);
      const target = next.find((category) => category.id === toCategoryId);
      if (!source || !target) return prev;
      const sourceIndex = source.fields.findIndex((field) => field.key === fieldKey);
      if (sourceIndex < 0) return prev;
      const [movedField] = source.fields.splice(sourceIndex, 1);
      const targetIndex = targetFieldKey
        ? target.fields.findIndex((field) => field.key === targetFieldKey)
        : -1;
      const insertIndex = targetIndex >= 0 ? targetIndex : target.fields.length;
      target.fields.splice(insertIndex, 0, movedField);
      return next;
    });
  };

  const updateCategoryTitle = (categoryId: string, title: string) => {
    onChangeCategories((prev) =>
      prev.map((category) => (category.id === categoryId ? { ...category, title } : category))
    );
  };

  const updateCategoryIcon = (categoryId: string, iconKey: IconKey) => {
    onChangeCategories((prev) =>
      prev.map((category) => (category.id === categoryId ? { ...category, iconKey } : category))
    );
  };

  const handleAddSection = () => {
    const trimmed = newSectionTitle.trim();
    if (!trimmed) return;
    const nextCategory: CategoryConfig = {
      id: createId(),
      title: trimmed,
      iconKey: newSectionIconKey,
      color: newSectionColor,
      fields: []
    };
    onChangeCategories((prev) => [...prev, nextCategory]);
    setIsAddSectionOpen(false);
    setNewSectionTitle("");
    setNewSectionIconKey("person");
    setNewSectionColor(colorOptions[0]);
  };

  const handleAddField = () => {
    const trimmed = newFieldLabel.trim();
    if (!trimmed || !activeFieldCategoryId) return;
    onChangeCategories((prev) =>
      prev.map((category) => {
        if (category.id !== activeFieldCategoryId) return category;
        const key = buildFieldKey(trimmed, prev);
        return {
          ...category,
          fields: [
            ...category.fields,
            {
              key,
              label: trimmed,
              iconKey: newFieldIconKey,
              required: newFieldRequired || undefined
            }
          ]
        };
      })
    );
    setIsAddFieldOpen(false);
    setActiveFieldCategoryId(null);
    setNewFieldLabel("");
    setNewFieldIconKey("info");
    setNewFieldRequired(false);
  };

  const shouldShowCategory = (category: CategoryConfig) => {
    if (!isViewMode) return true;
    if (lockedSections.includes(category.id)) return true;
    return category.fields.some((field) =>
      field.key === "upiAddress"
        ? Boolean(userData[field.key]?.trim().length || upiQrImage)
        : userData[field.key]?.trim().length
    );
  };

  const shouldShowField = (key: string) => {
    if (!isViewMode) return true;
    if (isFieldLockedForView(key)) return true;
    if (key === "upiAddress") {
      return Boolean(userData[key]?.trim().length || upiQrImage);
    }
    return Boolean(userData[key]?.trim().length);
  };

  return (
    <div className="px-4 pb-16 pt-20">
      <div className="relative rounded-3xl border border-purple-200/70 bg-white p-6 shadow-lg shadow-black/10">
        <button
          type="button"
          aria-label="Share QR code"
          className="absolute right-4 top-4 rounded-xl bg-green-500 p-3 text-white shadow-lg shadow-black/20"
          onClick={onShareQR}
        >
          <MdQrCode className="text-2xl" />
        </button>
        {isViewMode ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Profile"
                  className="h-16 w-16 cursor-pointer rounded-2xl object-cover shadow-lg shadow-purple-700/30"
                  role="button"
                  tabIndex={0}
                  onClick={() => setIsProfileImageOpen(true)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setIsProfileImageOpen(true);
                    }
                  }}
                />
              ) : (
                <div className="rounded-2xl bg-gradient-to-br from-purple-700 to-purple-400 p-4 text-white shadow-lg shadow-purple-700/30">
                  <MdPerson className="text-3xl" />
                </div>
              )}
              <div className="flex-1">
                <p className="text-2xl font-bold text-black/90">
                  {userData["firstName"] || "User"}
                </p>
                <p className="text-sm font-medium text-black/50">
                  {userData["email"] || "Digital Identity Profile"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-black/5 bg-white p-4">
              <div className="flex items-center gap-2 text-black/60">
                <MdInfoOutline />
                <p className="text-base font-semibold">Quick Info</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-3">
                {pinnedQuickInfo.map((item) => (
                  <button
                    key={item.key}
                    className="relative flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-purple-200/80 bg-gradient-to-br from-white to-gray-50 text-purple-700 shadow-sm"
                    onClick={async () => {
                      if (item.isLocked) {
                        const revealed = await onRevealPinnedValue(item.key);
                        if (!revealed) return;
                        setQuickInfoOpen({ ...item, value: revealed });
                        return;
                      }
                      setQuickInfoOpen(item);
                    }}
                    aria-label={`Open ${item.label}`}
                  >
                    <item.Icon className="text-xl" />
                    {item.isLocked ? (
                      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black text-white">
                        <MdLock className="text-xs" />
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>

          </div>
        ) : (
          <div>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-black/90">Edit Profile</h2>
                <p className="text-sm text-black/50">Update your details</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-4 rounded-2xl border border-black/10 bg-white p-4">
              {profileImage ? (
                <img src={profileImage} alt="Profile" className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-700/10">
                  <MdPerson className="text-2xl text-purple-700" />
                </div>
              )}
              <div className="flex-1">
                <p className="text-sm font-semibold text-black/80">Profile photo (optional)</p>
                <p className="text-xs text-black/50">Upload a square image for best results</p>
              </div>
              <input
                ref={profileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPickImage}
                aria-label="Upload profile photo"
              />
              <div className="flex items-center gap-2">
                <button
                  className="rounded-lg border border-purple-700/20 px-3 py-2 text-xs font-semibold text-purple-700"
                  onClick={() => profileInputRef.current?.click()}
                >
                  Upload
                </button>
                {profileImage ? (
                  <button
                    className="rounded-lg border border-black/10 px-3 py-2 text-xs font-semibold text-black/60"
                    onClick={onClearImage}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
            <div className="mt-4">
              <div className="h-2 w-full rounded-full bg-black/10">
                <div
                  className="h-2 rounded-full bg-green-500"
                  style={{ width: `${Math.round(completionPercentage * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-xs font-medium text-black/50">
                {Math.round(completionPercentage * 100)}% Complete
              </p>
            </div>
            <div className="mt-4 rounded-2xl border border-black/5 bg-white p-4">
              <div className="flex items-center gap-2 text-black/60">
                <MdInfoOutline />
                <p className="text-base font-semibold">Quick Info</p>
                <span className="text-xs text-black/40">Drag to reorder pinned items</span>
              </div>
              {pinnedQuickInfoEditable.length ? (
                <div className="mt-3 flex flex-wrap gap-3">
                  {pinnedQuickInfoEditable.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      draggable
                      onDragStart={(event) => {
                        setDraggingKey(item.key);
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", item.key);
                      }}
                      onDragOver={(event) => {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        const sourceKey = event.dataTransfer.getData("text/plain") || draggingKey;
                        if (sourceKey) {
                          reorderPinnedFields(sourceKey, item.key);
                        }
                        setDraggingKey(null);
                      }}
                      onDragEnd={() => setDraggingKey(null)}
                      className="flex items-center gap-2 rounded-2xl border border-black/5 bg-gradient-to-br from-white to-gray-50 px-3 py-2 text-sm font-semibold text-purple-700 shadow-sm"
                      aria-label={`Reorder ${item.label}`}
                    >
                      <MdMenu className="text-base text-black/40" />
                      <item.Icon className="text-base" />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-black/40">
                  Pin fields to add Quick Info items.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 space-y-4">
        {!isViewMode ? (
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-black/20 bg-white px-4 py-3 text-sm font-semibold text-black/70"
            onClick={() => setIsAddSectionOpen(true)}
          >
            <MdAdd className="text-lg" />
            Add section
          </button>
        ) : null}
      </div>
      <div className="mt-4 space-y-6">
        {categories.map((category) =>
          shouldShowCategory(category) ? (
            <CategorySection
              key={category.id}
              category={category}
              isViewMode={isViewMode}
              passkeyEnabled={passkeyEnabled}
              userData={userData}
              onUpdateField={onUpdateField}
              pinnedFields={pinnedFields}
              onTogglePin={onTogglePin}
              lockedSections={lockedSections}
              lockedFields={lockedFields}
              onToggleSectionLock={onToggleSectionLock}
              onToggleFieldLock={onToggleFieldLock}
              onRevealLockedValue={onRevealLockedValue}
              categoryCompletion={categoryCompletion(category)}
              shouldShowField={shouldShowField}
              fullNameValue={fullNameValue}
              upiQrImage={upiQrImage}
              onPasteUpiImage={onPasteUpiImage}
              onClearUpiImage={onClearUpiImage}
              onUpdateCategoryTitle={updateCategoryTitle}
              onUpdateCategoryIcon={updateCategoryIcon}
              onDragSectionStart={(categoryId) => setDraggingSectionId(categoryId)}
              onDropSection={(categoryId) => {
                if (draggingSectionId) reorderSections(draggingSectionId, categoryId);
                setDraggingSectionId(null);
              }}
              onSectionDragEnd={() => setDraggingSectionId(null)}
              onFieldDragStart={(categoryId, fieldKey) =>
                setDraggingField({ fromCategoryId: categoryId, fieldKey })
              }
              onFieldDropOnField={(categoryId, targetFieldKey) => {
                if (!draggingField) return;
                moveField(draggingField.fromCategoryId, categoryId, draggingField.fieldKey, targetFieldKey);
                setDraggingField(null);
              }}
              onFieldDropOnCategory={(categoryId) => {
                if (!draggingField) return;
                moveField(draggingField.fromCategoryId, categoryId, draggingField.fieldKey);
                setDraggingField(null);
              }}
              onFieldDragEnd={() => setDraggingField(null)}
              onAddField={(categoryId) => {
                setActiveFieldCategoryId(categoryId);
                setIsAddFieldOpen(true);
              }}
            />
          ) : null
        )}
      </div>
      {!isViewMode ? (
        <div className="mt-6">
          <button
            className="flex w-full items-center justify-center gap-3 rounded-2xl px-5 py-4 text-lg font-semibold text-white shadow-lg"
            style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}
            onClick={onSave}
          >
            <span className="rounded-lg bg-white/20 p-2">
              <MdSave className="text-xl" />
            </span>
            Save Profile
          </button>
        </div>
      ) : null}

      <Modal isOpen={Boolean(quickInfoOpen)} onClose={() => setQuickInfoOpen(null)}>
        {quickInfoOpen ? (
          <div className="relative flex flex-col items-center gap-4 text-center">
            <div className="rounded-2xl bg-gradient-to-br from-purple-700 to-purple-400 p-4 text-white shadow-sm">
              <quickInfoOpen.Icon className="text-3xl" />
            </div>
            <p className="text-sm font-semibold uppercase tracking-wide text-black/40">
              {quickInfoOpen.label}
            </p>
            <p className="break-words text-2xl font-semibold text-black/90">
              {(() => {
                const formattedValue =
                  quickInfoOpen.key === "phoneNumber"
                    ? formatPhoneNumber(quickInfoOpen.value)
                    : quickInfoOpen.key === "aadhaar"
                      ? formatAadhaarNumber(quickInfoOpen.value)
                      : quickInfoOpen.value;
                const displayValue = stripUrlPrefix(formattedValue);
                return isUrlValue(formattedValue) ? (
                  <a
                    className="hover:shadow-none hover:translate-y-0"
                    href={getUrlHref(formattedValue)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {displayValue}
                  </a>
                ) : (
                  displayValue
                );
              })()}
            </p>
          </div>
        ) : null}
      </Modal>
      <Modal
        isOpen={isProfileImageOpen}
        onClose={() => setIsProfileImageOpen(false)}
        chromeless
      >
        {profileImage ? (
          <img
            src={profileImage}
            alt="Profile"
            className="max-h-[70vh] w-full rounded-2xl object-contain"
          />
        ) : null}
      </Modal>
      <Modal
        isOpen={isAddSectionOpen}
        onClose={() => {
          setIsAddSectionOpen(false);
          setNewSectionTitle("");
          setNewSectionIconKey("person");
          setNewSectionColor(colorOptions[0]);
        }}
      >
        <div className="flex flex-col gap-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-700">
            <MdAdd className="text-2xl" />
          </div>
          <div>
            <p className="text-lg font-semibold text-black/90">Add section</p>
            <p className="mt-1 text-sm text-black/60">Create a new section and choose its icon.</p>
          </div>
          <input
            type="text"
            className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none focus:ring-2 focus:ring-purple-700"
            placeholder="Section title"
            value={newSectionTitle}
            onChange={(event) => setNewSectionTitle(event.target.value)}
            autoFocus
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-left text-xs font-semibold text-black/60">
              Icon
              <select
                className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none"
                value={newSectionIconKey}
                onChange={(event) => setNewSectionIconKey(event.target.value as IconKey)}
              >
                {iconOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-left text-xs font-semibold text-black/60">
              Color
              <select
                className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none"
                value={newSectionColor}
                onChange={(event) => setNewSectionColor(event.target.value)}
              >
                {colorOptions.map((color) => (
                  <option key={color} value={color}>
                    {color}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              className="flex-1 rounded-xl border border-black/10 px-4 py-2 text-sm font-semibold text-black/70"
              onClick={() => {
                setIsAddSectionOpen(false);
                setNewSectionTitle("");
                setNewSectionIconKey("person");
                setNewSectionColor(colorOptions[0]);
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="flex-1 rounded-xl bg-purple-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              onClick={handleAddSection}
              disabled={!newSectionTitle.trim()}
            >
              Add
            </button>
          </div>
        </div>
      </Modal>
      <Modal
        isOpen={isAddFieldOpen}
        onClose={() => {
          setIsAddFieldOpen(false);
          setActiveFieldCategoryId(null);
          setNewFieldLabel("");
          setNewFieldIconKey("info");
          setNewFieldRequired(false);
        }}
      >
        <div className="flex flex-col gap-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
            <MdAdd className="text-2xl" />
          </div>
          <div>
            <p className="text-lg font-semibold text-black/90">Add field</p>
            <p className="mt-1 text-sm text-black/60">Create a custom field inside this section.</p>
          </div>
          <input
            type="text"
            className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none focus:ring-2 focus:ring-purple-700"
            placeholder="Field label"
            value={newFieldLabel}
            onChange={(event) => setNewFieldLabel(event.target.value)}
            autoFocus
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-left text-xs font-semibold text-black/60">
              Icon
              <select
                className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none"
                value={newFieldIconKey}
                onChange={(event) => setNewFieldIconKey(event.target.value as IconKey)}
              >
                {iconOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-black/60">
              <input
                type="checkbox"
                checked={newFieldRequired}
                onChange={(event) => setNewFieldRequired(event.target.checked)}
              />
              Required
            </label>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              className="flex-1 rounded-xl border border-black/10 px-4 py-2 text-sm font-semibold text-black/70"
              onClick={() => {
                setIsAddFieldOpen(false);
                setActiveFieldCategoryId(null);
                setNewFieldLabel("");
                setNewFieldIconKey("info");
                setNewFieldRequired(false);
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="flex-1 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              onClick={handleAddField}
              disabled={!newFieldLabel.trim()}
            >
              Add
            </button>
          </div>
        </div>
      </Modal>
      {isViewMode && pinnedQuickInfo.length ? (
        <div className="fixed bottom-6 right-4 z-40 flex flex-col gap-3">
          {pinnedQuickInfo.map((item, index) => (
            <button
              key={`floating-${item.key}`}
              className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-xl transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-2xl"
              onClick={async () => {
                if (item.isLocked) {
                  const revealed = await onRevealPinnedValue(item.key);
                  if (!revealed) return;
                  setQuickInfoOpen({ ...item, value: revealed });
                  return;
                }
                setQuickInfoOpen(item);
              }}
              aria-label={`Open ${item.label}`}
              style={{
                background: `linear-gradient(135deg, hsl(${(index * 47) % 360} 80% 55%), hsl(${(index * 47) % 360} 80% 40%))`
              }}
            >
              <item.Icon className="text-xl" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type CategorySectionProps = {
  category: CategoryConfig;
  isViewMode: boolean;
  passkeyEnabled: boolean;
  userData: Record<string, string>;
  onUpdateField: (key: string, value: string) => void;
  pinnedFields: string[];
  onTogglePin: (key: string) => void;
  lockedSections: string[];
  lockedFields: string[];
  onToggleSectionLock: (categoryId: string) => void;
  onToggleFieldLock: (fieldKey: string) => void;
  onRevealLockedValue: (fieldKey: string) => Promise<string>;
  categoryCompletion: number;
  shouldShowField: (key: string) => boolean;
  fullNameValue: string;
  upiQrImage: string;
  onPasteUpiImage: () => void;
  onClearUpiImage: () => void;
  onUpdateCategoryTitle: (categoryId: string, title: string) => void;
  onUpdateCategoryIcon: (categoryId: string, iconKey: IconKey) => void;
  onDragSectionStart: (categoryId: string) => void;
  onDropSection: (categoryId: string) => void;
  onSectionDragEnd: () => void;
  onFieldDragStart: (categoryId: string, fieldKey: string) => void;
  onFieldDropOnField: (categoryId: string, targetFieldKey: string) => void;
  onFieldDropOnCategory: (categoryId: string) => void;
  onFieldDragEnd: () => void;
  onAddField: (categoryId: string) => void;
};

function CategorySection({
  category,
  isViewMode,
  passkeyEnabled,
  userData,
  onUpdateField,
  pinnedFields,
  onTogglePin,
  lockedSections,
  lockedFields,
  onToggleSectionLock,
  onToggleFieldLock,
  onRevealLockedValue,
  categoryCompletion,
  shouldShowField,
  fullNameValue,
  upiQrImage,
  onPasteUpiImage,
  onClearUpiImage,
  onUpdateCategoryTitle,
  onUpdateCategoryIcon,
  onDragSectionStart,
  onDropSection,
  onSectionDragEnd,
  onFieldDragStart,
  onFieldDropOnField,
  onFieldDropOnCategory,
  onFieldDragEnd,
  onAddField
}: CategorySectionProps) {
  const Icon = resolveIcon(category.iconKey);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const isPinnedField = (key: string) =>
    isNameField(key) ? pinnedFields.includes(NAME_PIN_KEY) : pinnedFields.includes(key);
  const isSectionLocked = passkeyEnabled && lockedSections.includes(category.id);
  const isFieldLocked = (fieldKey: string) =>
    passkeyEnabled && (lockedFields.includes(fieldKey) || (isViewMode && isSectionLocked));
  return (
    <div
      className="overflow-hidden rounded-3xl border bg-white shadow-lg"
      style={{ borderColor: `${category.color}33` }}
      onDragOver={(event) => {
        if (isViewMode) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
      onDrop={(event) => {
        if (isViewMode) return;
        event.preventDefault();
        const types = event.dataTransfer.types;
        if (types.includes("text/section")) {
          onDropSection(category.id);
        } else if (types.includes("text/field")) {
          onFieldDropOnCategory(category.id);
        }
      }}
    >
      <div
        className="flex items-center justify-between gap-4 px-5 py-4"
        style={{
          background: isViewMode
            ? `linear-gradient(135deg, ${category.color}26, ${category.color}0D)`
            : `${category.color}1A`
        }}
      >
        <div className="flex flex-1 items-center gap-3">
          {!isViewMode ? (
            <button
              type="button"
              draggable
              className="rounded-lg bg-black/10 p-2 text-black/50"
              onDragStart={(event) => {
                onDragSectionStart(category.id);
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/section", category.id);
              }}
              onDragEnd={onSectionDragEnd}
              aria-label={`Reorder ${category.title}`}
            >
              <MdMenu />
            </button>
          ) : null}
          <button
            type="button"
            className="rounded-xl p-2 text-white shadow-md"
            style={{
              background: isViewMode
                ? `linear-gradient(135deg, ${category.color}, ${category.color}B3)`
                : category.color
            }}
            onClick={() => {
              if (!isViewMode) setIsIconPickerOpen(true);
            }}
            aria-label={isViewMode ? `${category.title} icon` : "Choose section icon"}
          >
            <Icon className={isViewMode ? "text-xl" : "text-lg"} />
          </button>
          {isViewMode ? (
            <p
              className={`font-bold ${isViewMode ? "text-lg" : "text-base"}`}
              style={{ color: isViewMode ? "rgba(0,0,0,0.85)" : category.color }}
            >
              {category.title}
            </p>
          ) : (
            <input
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-black/80 outline-none focus:ring-2 focus:ring-purple-600"
              value={category.title}
              onChange={(event) => onUpdateCategoryTitle(category.id, event.target.value)}
              aria-label="Section title"
            />
          )}
        </div>
        {!isViewMode ? (
          <div className="flex items-center gap-2">
            <span
              className="rounded-full px-3 py-1 text-xs font-semibold"
              style={{ backgroundColor: `${category.color}33`, color: category.color }}
            >
              {categoryCompletion}/{category.fields.length}
            </span>
            {passkeyEnabled ? (
              <button
                type="button"
                className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                  isSectionLocked ? "bg-black/10 text-black/60" : "bg-green-100 text-green-700"
                }`}
                onClick={() => onToggleSectionLock(category.id)}
              >
                {isSectionLocked ? <MdLock className="text-sm" /> : <MdLockOpen className="text-sm" />}
                {isSectionLocked ? "Locked" : "Unlocked"}
              </button>
            ) : null}
          </div>
        ) : passkeyEnabled && isSectionLocked ? (
          <button
            type="button"
            className="flex items-center gap-2 rounded-full bg-black/10 px-3 py-1 text-xs font-semibold text-black/60"
            onClick={() => onToggleSectionLock(category.id)}
          >
            <MdLock className="text-sm" />
            Unlock
          </button>
        ) : null}
      </div>
      <div className="space-y-3 px-5 py-5">
        {isViewMode && isSectionLocked ? (
          <div className="rounded-2xl border border-dashed border-black/10 bg-black/[0.02] px-4 py-3 text-sm text-black/60">
            Unlock this section to view details.
          </div>
        ) : null}
        {category.fields.map((field) =>
          shouldShowField(field.key) ? (
            <div
              key={field.key}
              className="flex items-start gap-3"
              onDragOver={(event) => {
                if (isViewMode) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              }}
              onDrop={(event) => {
                if (isViewMode) return;
                event.preventDefault();
                event.stopPropagation();
                if (event.dataTransfer.types.includes("text/field")) {
                  onFieldDropOnField(category.id, field.key);
                }
              }}
            >
              {!isViewMode ? (
                <button
                  type="button"
                  draggable
                  className="mt-2 rounded-lg bg-black/10 p-2 text-black/50"
                  onDragStart={(event) => {
                    onFieldDragStart(category.id, field.key);
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/field", field.key);
                  }}
                  onDragEnd={onFieldDragEnd}
                  aria-label={`Move ${field.label}`}
                >
                  <MdMenu />
                </button>
              ) : null}
              <div className="flex-1">
                <FieldRow
                  field={field}
                  isViewMode={isViewMode}
                  value={userData[field.key] ?? ""}
                  isLocked={isFieldLocked(field.key)}
                  showLockToggle={passkeyEnabled && !isViewMode}
                  onChange={(value) => onUpdateField(field.key, value)}
                  isPinned={isPinnedField(field.key)}
                  onTogglePin={() => onTogglePin(field.key)}
                  onToggleLock={() => onToggleFieldLock(field.key)}
                  onRevealLockedValue={onRevealLockedValue}
                  fullNameValue={fullNameValue}
                  upiQrImage={upiQrImage}
                  onPasteUpiImage={onPasteUpiImage}
                  onClearUpiImage={onClearUpiImage}
                />
              </div>
            </div>
          ) : null
        )}
        {!isViewMode ? (
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-black/20 bg-white px-4 py-3 text-sm font-semibold text-black/60"
            onClick={() => onAddField(category.id)}
          >
            <MdAdd className="text-base" />
            Add field
          </button>
        ) : null}
      </div>
      <Modal isOpen={isIconPickerOpen} onClose={() => setIsIconPickerOpen(false)}>
        <div className="flex flex-col gap-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-black/5 text-black/70">
            <Icon className="text-2xl" />
          </div>
          <div>
            <p className="text-lg font-semibold text-black/90">Choose section icon</p>
            <p className="mt-1 text-sm text-black/60">Pick an icon for this section.</p>
          </div>
          <div className="grid max-h-64 grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3">
            {iconOptions.map((option) => {
              const OptionIcon = resolveIcon(option.key);
              const isActive = option.key === category.iconKey;
              return (
                <button
                  key={option.key}
                  type="button"
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold ${
                    isActive
                      ? "border-purple-600 bg-purple-50 text-purple-700"
                      : "border-black/10 bg-white text-black/70"
                  }`}
                  onClick={() => {
                    onUpdateCategoryIcon(category.id, option.key);
                    setIsIconPickerOpen(false);
                  }}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/5 text-base">
                    <OptionIcon />
                  </span>
                  <span className="flex-1">{option.label}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="rounded-xl border border-black/10 px-4 py-2 text-sm font-semibold text-black/70"
            onClick={() => setIsIconPickerOpen(false)}
          >
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
}

type FieldRowProps = {
  field: FieldConfig;
  isViewMode: boolean;
  value: string;
  isLocked: boolean;
  showLockToggle: boolean;
  onChange: (value: string) => void;
  isPinned: boolean;
  onTogglePin: () => void;
  onToggleLock: () => void;
  onRevealLockedValue: (fieldKey: string) => Promise<string>;
  fullNameValue: string;
  upiQrImage: string;
  onPasteUpiImage: () => void;
  onClearUpiImage: () => void;
};

function FieldRow({
  field,
  isViewMode,
  value,
  isLocked,
  showLockToggle,
  onChange,
  isPinned,
  onTogglePin,
  onToggleLock,
  onRevealLockedValue,
  fullNameValue,
  upiQrImage,
  onPasteUpiImage,
  onClearUpiImage
}: FieldRowProps) {
  const Icon = resolveIcon(field.iconKey);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [revealedValue, setRevealedValue] = useState("");
  const displayValue =
    field.key === "phoneNumber"
      ? formatPhoneNumber(value)
      : field.key === "aadhaar"
        ? formatAadhaarNumber(value)
        : value;
  const isName = isNameField(field.key);
  const isUpi = field.key === "upiAddress";
  const modalValue = isName ? fullNameValue : displayValue;
  const canOpenModal = isLocked
    ? true
    : isName
      ? Boolean(fullNameValue)
      : isUpi
        ? Boolean(value || upiQrImage)
        : Boolean(value);
  const displayText = isLocked
    ? "Locked"
    : isUpi && !displayValue && upiQrImage
      ? "QR image added"
      : displayValue;
  const displayNode = isUrlValue(displayText)
    ? renderUrlValue(displayText, "text-black/40", "text-black/80")
    : displayText;
  const modalLabel = isLocked && isName ? "Name" : isName ? "Name" : field.label;
  const modalValueToShow = isLocked ? revealedValue : modalValue;
  const modalDisplayValue = stripUrlPrefix(modalValueToShow);

  if (isViewMode) {
    return (
      <>
        <div
          className="flex items-center gap-4 rounded-2xl border border-black/5 bg-gradient-to-br from-white to-gray-50 p-4 shadow-md shadow-black/10"
          role={canOpenModal ? "button" : undefined}
          tabIndex={canOpenModal ? 0 : -1}
          onClick={() => {
            if (!canOpenModal) return;
            if (isLocked) {
              void (async () => {
                const revealed = await onRevealLockedValue(field.key);
                if (!revealed) return;
                setRevealedValue(revealed);
                setIsZoomOpen(true);
              })();
              return;
            }
            setIsZoomOpen(true);
          }}
          onKeyDown={(event) => {
            if (!canOpenModal) return;
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              if (isLocked) {
                void (async () => {
                  const revealed = await onRevealLockedValue(field.key);
                  if (!revealed) return;
                  setRevealedValue(revealed);
                  setIsZoomOpen(true);
                })();
                return;
              }
              setIsZoomOpen(true);
            }
          }}
        >
          <div className="rounded-xl bg-gradient-to-br from-purple-700 to-purple-400 p-3 text-white shadow-sm">
            <Icon className="text-lg" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-black/40">
              {field.label}
            </p>
            <p className="break-words text-base font-semibold text-black/80">{displayNode}</p>
          </div>
          <button
            className="rounded-lg bg-black/5 p-2 text-black/50 disabled:opacity-40"
            onClick={(event) => {
              event.stopPropagation();
              if (!value || isLocked) return;
              navigator.clipboard.writeText(value);
            }}
            aria-label={`Copy ${field.label}`}
            disabled={!value || isLocked}
          >
            <MdContentCopy />
          </button>
          {showLockToggle ? (
            <button
              className={`ml-2 rounded-lg p-2 ${
                isLocked ? "bg-black/10 text-black/60" : "bg-green-100 text-green-700"
              }`}
              onClick={(event) => {
                event.stopPropagation();
                onToggleLock();
              }}
              aria-label={isLocked ? `Unlock ${field.label}` : `Lock ${field.label}`}
            >
              {isLocked ? <MdLock /> : <MdLockOpen />}
            </button>
          ) : null}
        </div>
        <Modal
          isOpen={isZoomOpen}
          onClose={() => {
            setIsZoomOpen(false);
            setRevealedValue("");
          }}
        >
          <div className="relative flex flex-col items-center gap-4 text-center">
            <div className="rounded-2xl bg-gradient-to-br from-purple-700 to-purple-400 p-4 text-white shadow-sm">
              <Icon className="text-3xl" />
            </div>
            <p className="text-sm font-semibold uppercase tracking-wide text-black/40">
              {modalLabel}
            </p>
            {modalDisplayValue ? (
              <p className="break-words text-2xl font-semibold text-black/90">
                {field.key === "aadhaar" ? (
                  formatAadhaarNumber(modalValueToShow)
                ) : isUrlValue(modalValueToShow) ? (
                  <a
                    className="hover:shadow-none hover:translate-y-0"
                    href={getUrlHref(modalValueToShow)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {modalDisplayValue}
                  </a>
                ) : (
                  modalDisplayValue
                )}
              </p>
            ) : null}
            {isUpi && upiQrImage ? (
              <img src={upiQrImage} alt="UPI QR" className="max-h-64 w-full rounded-2xl object-contain" />
            ) : null}
          </div>
        </Modal>
      </>
    );
  }

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={`${field.label}${field.required ? " *" : ""}`}
        className="w-full rounded-xl bg-[#F3EFEF] pl-12 pr-32 py-3 text-sm text-black placeholder-black/40 truncate outline-none focus:ring-2 focus:ring-purple-700"
      />
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-700">
        <Icon />
      </span>
      <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1">
        {showLockToggle ? (
          <button
            className={`rounded-md p-1 ${
              isLocked ? "bg-black/10 text-black/60" : "bg-green-100 text-green-700"
            }`}
            onClick={onToggleLock}
            aria-label={isLocked ? `Unlock ${field.label}` : `Lock ${field.label}`}
            type="button"
          >
            {isLocked ? <MdLock /> : <MdLockOpen />}
          </button>
        ) : null}
        <button
          className={`rounded-md p-1 ${
            isPinned ? "bg-purple-100 text-purple-700" : "bg-black/5 text-black/50"
          }`}
          onClick={() => onTogglePin()}
          aria-label={`${isPinned ? "Unpin" : "Pin"} ${field.label}`}
          aria-pressed={isPinned}
          type="button"
        >
          {isPinned ? <MdPushPin /> : <MdOutlinePushPin />}
        </button>
        {isUpi ? (
          <button
            className="rounded-md p-1 text-purple-700"
            onClick={onPasteUpiImage}
            aria-label="Paste UPI QR image"
            type="button"
          >
            <MdQrCodeScanner />
          </button>
        ) : null}
        {isUpi && upiQrImage ? (
          <button
            className="rounded-md p-1 text-black/40"
            onClick={onClearUpiImage}
            aria-label="Remove UPI QR image"
            type="button"
          >
            <MdDeleteForever />
          </button>
        ) : null}
        {value ? (
          <button
            className="rounded-md p-1 text-purple-700"
            onClick={() => navigator.clipboard.writeText(value)}
            aria-label={`Copy ${field.label}`}
            type="button"
          >
            <MdContentCopy />
          </button>
        ) : null}
        {value ? (
          <button
            className="rounded-md p-1 text-black/40"
            onClick={() => onChange("")}
            aria-label={`Clear ${field.label}`}
            type="button"
          >
            <MdClear />
          </button>
        ) : null}
      </div>
    </div>
  );
}
