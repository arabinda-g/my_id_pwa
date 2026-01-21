import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MdAccountBalance,
  MdAccountBalanceWallet,
  MdCameraAlt,
  MdChat,
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
  MdLink,
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
  MdShare,
  MdVideoCall
} from "react-icons/md";
import {
  clearPinnedFields,
  clearUserData,
  getPinnedFields,
  getProfileImage,
  getUserData,
  setProfileImage,
  setPinnedFields as setPinnedFieldsStorage,
  setUserData
} from "../utils/storage";
import { Modal } from "../components/Modal";

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
      { icon: MdLink, key: "linkedInUrl", label: "LinkedIn URL" },
      { icon: MdFacebook, key: "facebook", label: "Facebook" },
      { icon: MdVideoCall, key: "skypeId", label: "Skype ID" },
      { icon: MdChat, key: "whatsappLink", label: "WhatsApp link to chat" },
      { icon: MdCameraAlt, key: "instagram", label: "Instagram" }
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
  const [pinnedFields, setPinnedFields] = useState<string[]>([]);
  const [message, setMessage] = useState<{ text: string; tone: "ok" | "warn" | "error" } | null>(
    null
  );

  useEffect(() => {
    const data = getUserData();
    setLocalUserData(data);
    setIsViewMode(Object.values(data).some((value) => value.trim().length > 0));
    setLocalProfileImage(getProfileImage());
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

  const handleExport = () => {
    const data = getUserData();
    const exportPayload = {
      userData: data,
      profileImage: getProfileImage(),
      pinnedFields: getPinnedFields()
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "profile.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      if (!parsed || typeof parsed !== "object") {
        throw new Error("Invalid profile data");
      }
      const parsedObject = parsed as {
        userData?: Record<string, string>;
        profileImage?: string;
        pinnedFields?: string[];
      };
      const hasUserData = Object.prototype.hasOwnProperty.call(parsedObject, "userData");
      const data = hasUserData ? parsedObject.userData ?? {} : (parsed as Record<string, string>);
      const image = hasUserData ? parsedObject.profileImage ?? "" : "";
      const pinned = hasUserData ? parsedObject.pinnedFields ?? [] : [];
      setUserData(data);
      setPinnedFieldsStorage(pinned);
      setLocalUserData(data);
      setProfileImage(image);
      setLocalProfileImage(image);
      setPinnedFields(pinned);
      setIsViewMode(Object.values(data).some((value) => value.trim().length > 0));
      showMessage("Profile imported", "ok");
    } catch {
      showMessage("Import failed", "error");
    } finally {
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
                  navigate("/qr");
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
                onClick={handleExport}
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
                onClick={handleClear}
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
          onSave={saveUserInfo}
          onSwitchToEdit={() => setIsViewMode(false)}
          onShareQR={() => {
            if (!hasAnyData) {
              showMessage("Please save your information first", "warn");
              return;
            }
            navigate("/qr");
          }}
          completionPercentage={completionPercentage()}
          categoryCompletion={categoryCompletion}
          onPickImage={handleImagePick}
          onClearImage={() => {
            setProfileImage("");
            setLocalProfileImage("");
          }}
        />

        <button
          className="fixed bottom-16 right-6 z-20 rounded-xl bg-green-500 p-3 text-white shadow-lg shadow-black/20"
          onClick={() => {
            if (!hasAnyData) {
              showMessage("Please save your information first", "warn");
              return;
            }
            navigate("/qr");
          }}
        >
          <MdQrCode className="text-2xl" />
        </button>
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
    </div>
  );
}

type UserInfoFormProps = {
  isViewMode: boolean;
  userData: Record<string, string>;
  profileImage: string;
  pinnedFields: string[];
  onTogglePin: (key: string) => void;
  onReorderPinned: (fields: string[]) => void;
  onUpdateField: (key: string, value: string) => void;
  onSave: () => void;
  onSwitchToEdit: () => void;
  onShareQR: () => void;
  completionPercentage: number;
  categoryCompletion: (category: CategoryConfig) => number;
  onPickImage: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearImage: () => void;
};

function UserInfoForm({
  isViewMode,
  userData,
  profileImage,
  pinnedFields,
  onTogglePin,
  onReorderPinned,
  onUpdateField,
  onSave,
  onSwitchToEdit,
  onShareQR,
  completionPercentage,
  categoryCompletion,
  onPickImage,
  onClearImage
}: UserInfoFormProps) {
  const profileInputRef = useRef<HTMLInputElement | null>(null);
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
    return category.fields.some((field) => userData[field.key]?.trim().length);
  };

  const shouldShowField = (key: string) => {
    if (!isViewMode) return true;
    return Boolean(userData[key]?.trim().length);
  };

  return (
    <div className="px-4 pb-16 pt-20">
      <div className="rounded-3xl border border-purple-200/70 bg-white p-6 shadow-lg shadow-black/10">
        {isViewMode ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Profile"
                  className="h-16 w-16 rounded-2xl object-cover shadow-lg shadow-purple-700/30"
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
                    className="flex h-12 w-12 items-center justify-center rounded-2xl border border-black/5 bg-gradient-to-br from-white to-gray-50 text-purple-700 shadow-sm"
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
                  Pin fields in view mode to add Quick Info items.
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
            />
          ) : null
        )}
      </div>

      <div className="mt-6">
        <button
          className="flex w-full items-center justify-center gap-3 rounded-2xl px-5 py-4 text-lg font-semibold text-white shadow-lg"
          style={{
            background: isViewMode
              ? "linear-gradient(135deg, #f97316, #fdba74)"
              : "linear-gradient(135deg, #7c3aed, #a855f7)"
          }}
          onClick={isViewMode ? onSwitchToEdit : onSave}
        >
          <span className="rounded-lg bg-white/20 p-2">
            {isViewMode ? <MdEdit className="text-xl" /> : <MdSave className="text-xl" />}
          </span>
          {isViewMode ? "Edit Profile" : "Save Profile"}
        </button>
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
              {quickInfoOpen.key === "phoneNumber"
                ? formatPhoneNumber(quickInfoOpen.value)
                : quickInfoOpen.key === "aadhaar"
                  ? formatAadhaarNumber(quickInfoOpen.value)
                  : quickInfoOpen.value}
            </p>
          </div>
        ) : null}
      </Modal>
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
  fullNameValue
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
};

function FieldRow({
  field,
  isViewMode,
  value,
  onChange,
  isPinned,
  onTogglePin,
  fullNameValue
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
  const modalValue = isName ? fullNameValue : displayValue;
  const canOpenModal = isName ? Boolean(fullNameValue) : Boolean(value);

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
            <p className="text-base font-semibold text-black/80">{displayValue}</p>
          </div>
          <button
            className={`rounded-lg p-2 ${isPinned ? "bg-purple-100 text-purple-700" : "bg-black/5 text-black/50"}`}
            onClick={(event) => {
              event.stopPropagation();
              if (!value) return;
              onTogglePin();
            }}
            aria-label={`${isPinned ? "Unpin" : "Pin"} ${field.label}`}
            aria-pressed={isPinned}
          >
            {isPinned ? <MdPushPin /> : <MdOutlinePushPin />}
          </button>
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
            <p className="break-words text-2xl font-semibold text-black/90">
              {field.key === "aadhaar" ? formatAadhaarNumber(modalValue) : modalValue}
            </p>
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
        {value ? (
          <button
            className="rounded-md p-1 text-purple-700"
            onClick={() => navigator.clipboard.writeText(value)}
            aria-label={`Copy ${field.label}`}
          >
            <MdContentCopy />
          </button>
        ) : null}
        {value ? (
          <button
            className="rounded-md p-1 text-black/40"
            onClick={() => onChange("")}
            aria-label={`Clear ${field.label}`}
          >
            <MdClear />
          </button>
        ) : null}
      </div>
    </div>
  );
}
