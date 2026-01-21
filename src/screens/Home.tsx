import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MdAccountBalance,
  MdAccountBalanceWallet,
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
  MdShare
} from "react-icons/md";
import { FaInstagram, FaLinkedinIn, FaSkype, FaWhatsapp } from "react-icons/fa";
import {
  clearPinnedFields,
  clearUserData,
  getPinnedFields,
  getProfileImage,
  getUpiQrImage,
  getUserData,
  setProfileImage,
  setPinnedFields as setPinnedFieldsStorage,
  setUpiQrImage as setUpiQrImageStorage,
  setUserData
} from "../utils/storage";
import { Modal } from "../components/Modal";
import { QrModal } from "../components/QrModal";

type FieldConfig = {
  icon: React.ComponentType<{ className?: string }>;
  key: string;
  label: string;
  required?: boolean;
};

type CategoryConfig = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
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
      <span className={restClass}>{parts.rest}</span>
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

const fieldCategories: CategoryConfig[] = [
  {
    title: "Personal Information",
    icon: MdPerson,
    color: "#3b82f6",
    fields: [
      { icon: MdPerson, key: "firstName", label: "First Name", required: true },
      { icon: MdPerson, key: "lastName", label: "Last Name", required: true },
      { icon: MdPersonOutline, key: "fatherName", label: "Father name" },
      { icon: MdPersonOutline, key: "motherName", label: "Mother name" }
    ]
  },
  {
    title: "Contact Details",
    icon: MdPhone,
    color: "#22c55e",
    fields: [
      { icon: MdEmail, key: "email", label: "Email", required: true },
      { icon: MdPhone, key: "phoneNumber", label: "Phone Number", required: true },
      { icon: MdHome, key: "address", label: "Address" },
      { icon: MdLocationCity, key: "permanentAddress", label: "Permanent Address" },
      { icon: MdLanguage, key: "website", label: "Website" }
    ]
  },
  {
    title: "Official Documents",
    icon: MdAccountBalance,
    color: "#f97316",
    fields: [
      { icon: MdAccountBalance, key: "passportNumber", label: "Passport Number" },
      { icon: MdCreditCard, key: "aadhaar", label: "Aadhaar" },
      { icon: MdDirectionsCar, key: "dlNumber", label: "DL Number" },
      { icon: MdAccountBalance, key: "panCardNumber", label: "PAN Card Number" }
    ]
  },
  {
    title: "Digital Payments",
    icon: MdPayment,
    color: "#a855f7",
    fields: [{ icon: MdAccountBalanceWallet, key: "upiAddress", label: "UPI Address (Paytm)" }]
  },
  {
    title: "Social Media",
    icon: MdShare,
    color: "#4f46e5",
    fields: [
      { icon: FaLinkedinIn, key: "linkedInUrl", label: "LinkedIn URL" },
      { icon: MdFacebook, key: "facebook", label: "Facebook" },
      { icon: FaSkype, key: "skypeId", label: "Skype ID" },
      { icon: FaWhatsapp, key: "whatsappLink", label: "WhatsApp link to chat" },
      { icon: FaInstagram, key: "instagram", label: "Instagram" }
    ]
  }
];

export default function Home() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [userData, setLocalUserData] = useState<Record<string, string>>({});
  const [profileImage, setLocalProfileImage] = useState("");
  const [upiQrImage, setLocalUpiQrImage] = useState("");
  const [pinnedFields, setPinnedFields] = useState<string[]>([]);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportPassword, setExportPassword] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importPassword, setImportPassword] = useState("");
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "ok" | "warn" | "error" } | null>(
    null
  );

  useEffect(() => {
    const data = getUserData();
    setLocalUserData(data);
    setIsViewMode(Object.values(data).some((value) => value.trim().length > 0));
    setLocalProfileImage(getProfileImage());
    setLocalUpiQrImage(getUpiQrImage());
    const storedPinned = getPinnedFields();
    const normalizedPinned = normalizePinnedFields(storedPinned);
    setPinnedFields(normalizedPinned);
    if (storedPinned.join("|") !== normalizedPinned.join("|")) {
      setPinnedFieldsStorage(normalizedPinned);
    }
  }, []);

  const userName = useMemo(() => userData["firstName"] || "User", [userData]);

  const userEmail = useMemo(() => userData["email"] || "", [userData]);

  const showMessage = (text: string, tone: "ok" | "warn" | "error") => {
    setMessage({ text, tone });
    window.setTimeout(() => setMessage(null), 2000);
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

  const saveUserInfo = () => {
    const missingFields: string[] = [];
    fieldCategories.forEach((category) => {
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

    setUserData(cleaned);
    setLocalUserData(cleaned);
    setIsViewMode(true);
    showMessage("Data saved successfully!", "ok");
  };

  const completionPercentage = () => {
    const totalFields = fieldCategories.reduce((sum, category) => sum + category.fields.length, 0);
    const filledFields = fieldCategories.reduce((sum, category) => {
      return (
        sum +
        category.fields.filter((field) => userData[field.key]?.trim().length).length
      );
    }, 0);
    return totalFields ? filledFields / totalFields : 0;
  };

  const categoryCompletion = (category: CategoryConfig) =>
    category.fields.filter((field) => userData[field.key]?.trim().length).length;

  const hasAnyData = Object.values(userData).some((value) => value.trim().length > 0);
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
    setIsExporting(true);
    const data = getUserData();
    const exportPayload = {
      userData: data,
      profileImage: getProfileImage(),
      pinnedFields: getPinnedFields(),
      upiQrImage: getUpiQrImage()
    };
    try {
      const encryptedPayload = await encryptPayload(exportPayload, trimmedPassword);
      const blob = new Blob([JSON.stringify(encryptedPayload, null, 2)], {
        type: "application/json"
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "profile.enc.json";
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
        : parsed;
      if (!decrypted || typeof decrypted !== "object") {
        throw new Error("Invalid profile data");
      }
      const decryptedObject = decrypted as {
        userData?: Record<string, string>;
        profileImage?: string;
        pinnedFields?: string[];
        upiQrImage?: string;
      };
      const hasUserData = Object.prototype.hasOwnProperty.call(decryptedObject, "userData");
      const data = hasUserData ? decryptedObject.userData ?? {} : (decrypted as Record<string, string>);
      const image = hasUserData ? decryptedObject.profileImage ?? "" : "";
      const pinned = hasUserData ? decryptedObject.pinnedFields ?? [] : [];
      const upiImage = hasUserData ? decryptedObject.upiQrImage ?? "" : "";
      setUserData(data);
      setPinnedFieldsStorage(pinned);
      setLocalUserData(data);
      setProfileImage(image);
      setLocalProfileImage(image);
      setUpiQrImageStorage(upiImage);
      setLocalUpiQrImage(upiImage);
      setPinnedFields(pinned);
      setIsViewMode(Object.values(data).some((value) => value.trim().length > 0));
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
    clearUserData();
    clearPinnedFields();
    setProfileImage("");
    setLocalUserData({});
    setIsViewMode(false);
    setPinnedFields([]);
    setUpiQrImageStorage("");
    setLocalUpiQrImage("");
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
          <div className="mt-4">
            <button
              className="flex w-full items-center justify-center gap-3 rounded-2xl px-5 py-4 text-base font-semibold text-white shadow-lg"
              style={{
                background: isViewMode
                  ? "linear-gradient(135deg, #f97316, #fdba74)"
                  : "linear-gradient(135deg, #7c3aed, #a855f7)"
              }}
              onClick={() => {
                setIsDrawerOpen(false);
                if (isViewMode) {
                  setIsViewMode(false);
                } else {
                  saveUserInfo();
                }
              }}
            >
              <span className="rounded-lg bg-white/20 p-2">
                {isViewMode ? <MdEdit className="text-lg" /> : <MdSave className="text-lg" />}
              </span>
              {isViewMode ? "Edit Profile" : "Save Profile"}
            </button>
          </div>
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
              <button
                className="group mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium hover:bg-white"
                onClick={() => {
                  setIsDrawerOpen(false);
                  navigate("/scan");
                }}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 text-purple-700 shadow-sm">
                  <MdQrCodeScanner className="text-lg" />
                </span>
                <span className="flex-1">Scan QR</span>
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
          userData={userData}
          profileImage={profileImage}
          upiQrImage={upiQrImage}
          pinnedFields={pinnedFields}
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
              setPinnedFieldsStorage(updated);
              return updated;
            });
          }}
          onReorderPinned={(fields) => {
            const normalized = normalizePinnedFields(fields);
            setPinnedFieldsStorage(normalized);
            setPinnedFields(normalized);
          }}
          onUpdateField={updateField}
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
            setUpiQrImageStorage(dataUrl);
            setLocalUpiQrImage(dataUrl);
            showMessage("UPI QR image pasted", "ok");
          }}
          onClearUpiImage={() => {
            setUpiQrImageStorage("");
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
                setIsDrawerOpen(false);
                handleClear();
              }}
            >
              Clear data
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

type UserInfoFormProps = {
  isViewMode: boolean;
  userData: Record<string, string>;
  profileImage: string;
  upiQrImage: string;
  pinnedFields: string[];
  onTogglePin: (key: string) => void;
  onReorderPinned: (fields: string[]) => void;
  onUpdateField: (key: string, value: string) => void;
  onShareQR: () => void;
  completionPercentage: number;
  categoryCompletion: (category: CategoryConfig) => number;
  onPickImage: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearImage: () => void;
  onPasteUpiImage: () => void;
  onClearUpiImage: () => void;
};

function UserInfoForm({
  isViewMode,
  userData,
  profileImage,
  upiQrImage,
  pinnedFields,
  onTogglePin,
  onReorderPinned,
  onUpdateField,
  onShareQR,
  completionPercentage,
  categoryCompletion,
  onPickImage,
  onClearImage,
  onPasteUpiImage,
  onClearUpiImage
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

  const fullNameValue = useMemo(() => {
    const first = userData["firstName"]?.trim() ?? "";
    const last = userData["lastName"]?.trim() ?? "";
    return [first, last].filter(Boolean).join(" ").trim();
  }, [userData]);

  const fieldConfigMap = useMemo(() => {
    const entries = fieldCategories.flatMap((category) =>
      category.fields.map((field) => [field.key, field] as const)
    );
    return new Map(entries);
  }, []);

  const pinnedQuickInfo = useMemo<
    {
      key: string;
      label: string;
      value: string;
      Icon: React.ComponentType<{ className?: string }>;
    }[]
  >(() => {
    const items: {
      key: string;
      label: string;
      value: string;
      Icon: React.ComponentType<{ className?: string }>;
    }[] = [];

    pinnedFields.forEach((key) => {
      if (key === NAME_PIN_KEY) {
        if (!fullNameValue) return;
        items.push({
          key: NAME_PIN_KEY,
          label: "Name",
          value: fullNameValue,
          Icon: MdPerson
        });
        return;
      }
      const value = userData[key]?.trim() ?? "";
      if (!value) return;
      const field = fieldConfigMap.get(key);
      items.push({
        key,
        label: field?.label ?? key,
        value,
        Icon: field?.icon ?? MdInfoOutline
      });
    });

    return items;
  }, [fieldConfigMap, fullNameValue, pinnedFields, userData]);

  const pinnedQuickInfoEditable = useMemo(() => {
    return pinnedFields.map((key) => {
      if (key === NAME_PIN_KEY) {
        return { key, label: "Name", Icon: MdPerson };
      }
      const field = fieldConfigMap.get(key);
      return { key, label: field?.label ?? key, Icon: field?.icon ?? MdInfoOutline };
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

  const buildQuickAction = (
    icon: React.ComponentType<{ className?: string }>,
    label: string,
    color: string,
    onTap: () => void
  ) => {
    const Icon = icon;
    return (
      <button
        className="flex w-full flex-col items-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold"
        onClick={onTap}
        style={{ borderColor: `${color}33`, background: `linear-gradient(135deg, ${color}1A, ${color}0D)` }}
      >
        <span
          className="rounded-lg p-2"
          style={{ backgroundColor: `${color}33`, color }}
        >
          <Icon className="text-lg" />
        </span>
        <span style={{ color }}>{label}</span>
      </button>
    );
  };

  const shouldShowCategory = (category: CategoryConfig) => {
    if (!isViewMode) return true;
    return category.fields.some((field) =>
      field.key === "upiAddress"
        ? Boolean(userData[field.key]?.trim().length || upiQrImage)
        : userData[field.key]?.trim().length
    );
  };

  const shouldShowField = (key: string) => {
    if (!isViewMode) return true;
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
                    className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-purple-200/80 bg-gradient-to-br from-white to-gray-50 text-purple-700 shadow-sm"
                    onClick={() => setQuickInfoOpen(item)}
                    aria-label={`Open ${item.label}`}
                  >
                    <item.Icon className="text-xl" />
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

      <div className="mt-6 space-y-6">
        {fieldCategories.map((category) =>
          shouldShowCategory(category) ? (
            <CategorySection
              key={category.title}
              category={category}
              isViewMode={isViewMode}
              userData={userData}
              onUpdateField={onUpdateField}
              pinnedFields={pinnedFields}
              onTogglePin={onTogglePin}
              categoryCompletion={categoryCompletion(category)}
              shouldShowField={shouldShowField}
              fullNameValue={fullNameValue}
              upiQrImage={upiQrImage}
              onPasteUpiImage={onPasteUpiImage}
              onClearUpiImage={onClearUpiImage}
            />
          ) : null
        )}
      </div>

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
      {isViewMode && pinnedQuickInfo.length ? (
        <div className="fixed bottom-6 right-4 z-40 flex flex-col gap-3">
          {pinnedQuickInfo.map((item, index) => (
            <button
              key={`floating-${item.key}`}
              className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-xl transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-2xl"
              onClick={() => setQuickInfoOpen(item)}
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
  userData: Record<string, string>;
  onUpdateField: (key: string, value: string) => void;
  pinnedFields: string[];
  onTogglePin: (key: string) => void;
  categoryCompletion: number;
  shouldShowField: (key: string) => boolean;
  fullNameValue: string;
  upiQrImage: string;
  onPasteUpiImage: () => void;
  onClearUpiImage: () => void;
};

function CategorySection({
  category,
  isViewMode,
  userData,
  onUpdateField,
  pinnedFields,
  onTogglePin,
  categoryCompletion,
  shouldShowField,
  fullNameValue,
  upiQrImage,
  onPasteUpiImage,
  onClearUpiImage
}: CategorySectionProps) {
  const Icon = category.icon;
  const isPinnedField = (key: string) =>
    isNameField(key) ? pinnedFields.includes(NAME_PIN_KEY) : pinnedFields.includes(key);
  return (
    <div
      className="overflow-hidden rounded-3xl border bg-white shadow-lg"
      style={{ borderColor: `${category.color}33` }}
    >
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{
          background: isViewMode
            ? `linear-gradient(135deg, ${category.color}26, ${category.color}0D)`
            : `${category.color}1A`
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="rounded-xl p-2 text-white shadow-md"
            style={{
              background: isViewMode
                ? `linear-gradient(135deg, ${category.color}, ${category.color}B3)`
                : category.color
            }}
          >
            <Icon className={isViewMode ? "text-xl" : "text-lg"} />
          </div>
          <p
            className={`font-bold ${isViewMode ? "text-lg" : "text-base"}`}
            style={{ color: isViewMode ? "rgba(0,0,0,0.85)" : category.color }}
          >
            {category.title}
          </p>
        </div>
        {!isViewMode ? (
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={{ backgroundColor: `${category.color}33`, color: category.color }}
          >
            {categoryCompletion}/{category.fields.length}
          </span>
        ) : null}
      </div>
      <div className="space-y-3 px-5 py-5">
        {category.fields.map((field) =>
          shouldShowField(field.key) ? (
            <FieldRow
              key={field.key}
              field={field}
              isViewMode={isViewMode}
              value={userData[field.key] ?? ""}
              onChange={(value) => onUpdateField(field.key, value)}
              isPinned={isPinnedField(field.key)}
              onTogglePin={() => onTogglePin(field.key)}
              fullNameValue={fullNameValue}
              upiQrImage={upiQrImage}
              onPasteUpiImage={onPasteUpiImage}
              onClearUpiImage={onClearUpiImage}
            />
          ) : null
        )}
      </div>
    </div>
  );
}

type FieldRowProps = {
  field: FieldConfig;
  isViewMode: boolean;
  value: string;
  onChange: (value: string) => void;
  isPinned: boolean;
  onTogglePin: () => void;
  fullNameValue: string;
  upiQrImage: string;
  onPasteUpiImage: () => void;
  onClearUpiImage: () => void;
};

function FieldRow({
  field,
  isViewMode,
  value,
  onChange,
  isPinned,
  onTogglePin,
  fullNameValue,
  upiQrImage,
  onPasteUpiImage,
  onClearUpiImage
}: FieldRowProps) {
  const Icon = field.icon;
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const displayValue =
    field.key === "phoneNumber"
      ? formatPhoneNumber(value)
      : field.key === "aadhaar"
        ? formatAadhaarNumber(value)
        : value;
  const isName = isNameField(field.key);
  const isUpi = field.key === "upiAddress";
  const modalValue = isName ? fullNameValue : displayValue;
  const canOpenModal = isName
    ? Boolean(fullNameValue)
    : isUpi
      ? Boolean(value || upiQrImage)
      : Boolean(value);
  const displayText = isUpi && !displayValue && upiQrImage ? "QR image added" : displayValue;
  const displayNode = isUrlValue(displayText)
    ? renderUrlValue(displayText, "text-black/40", "text-black/80")
    : displayText;
  const modalDisplayValue = stripUrlPrefix(modalValue);

  if (isViewMode) {
    return (
      <>
        <div
          className="flex items-center gap-4 rounded-2xl border border-black/5 bg-gradient-to-br from-white to-gray-50 p-4 shadow-md shadow-black/10"
          role={canOpenModal ? "button" : undefined}
          tabIndex={canOpenModal ? 0 : -1}
          onClick={() => {
            if (!canOpenModal) return;
            setIsZoomOpen(true);
          }}
          onKeyDown={(event) => {
            if (!canOpenModal) return;
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setIsZoomOpen(true);
            }
          }}
        >
          <div className="rounded-xl bg-gradient-to-br from-purple-700 to-purple-400 p-3 text-white shadow-sm">
            <Icon className="text-lg" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-black/40">
              {field.label}
            </p>
            <p className="text-base font-semibold text-black/80">{displayNode}</p>
          </div>
          <button
            className="rounded-lg bg-black/5 p-2 text-black/50"
            onClick={(event) => {
              event.stopPropagation();
              if (!value) return;
              navigator.clipboard.writeText(value);
            }}
            aria-label={`Copy ${field.label}`}
          >
            <MdContentCopy />
          </button>
        </div>
        <Modal isOpen={isZoomOpen} onClose={() => setIsZoomOpen(false)}>
          <div className="relative flex flex-col items-center gap-4 text-center">
            <div className="rounded-2xl bg-gradient-to-br from-purple-700 to-purple-400 p-4 text-white shadow-sm">
              <Icon className="text-3xl" />
            </div>
            <p className="text-sm font-semibold uppercase tracking-wide text-black/40">
              {isName ? "Name" : field.label}
            </p>
            {modalDisplayValue ? (
              <p className="break-words text-2xl font-semibold text-black/90">
                {field.key === "aadhaar" ? (
                  formatAadhaarNumber(modalValue)
                ) : isUrlValue(modalValue) ? (
                  <a
                    className="hover:shadow-none hover:translate-y-0"
                    href={getUrlHref(modalValue)}
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
        className="w-full rounded-xl bg-[#F3EFEF] px-12 py-3 text-sm text-black placeholder-black/40 outline-none focus:ring-2 focus:ring-purple-700"
      />
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-700">
        <Icon />
      </span>
      <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1">
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
