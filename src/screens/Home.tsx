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
  MdQrCode,
  MdQrCodeScanner,
  MdRefresh,
  MdSave,
  MdShare,
  MdVideoCall
} from "react-icons/md";
import {
  clearUserData,
  getProfileImage,
  getString,
  getUserData,
  setProfileImage,
  setString,
  setUserData,
  storageKeys
} from "../utils/storage";

type FieldConfig = {
  icon: React.ComponentType<{ className?: string }>;
  hint: string;
  required?: boolean;
};

type CategoryConfig = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  fields: FieldConfig[];
};

const fieldCategories: CategoryConfig[] = [
  {
    title: "Personal Information",
    icon: MdPerson,
    color: "#3b82f6",
    fields: [
      { icon: MdPerson, hint: "First Name", required: true },
      { icon: MdPerson, hint: "Last Name", required: true },
      { icon: MdPersonOutline, hint: "Father name" },
      { icon: MdPersonOutline, hint: "Mother name" }
    ]
  },
  {
    title: "Contact Details",
    icon: MdPhone,
    color: "#22c55e",
    fields: [
      { icon: MdEmail, hint: "Email", required: true },
      { icon: MdPhone, hint: "Phone Number", required: true },
      { icon: MdHome, hint: "Address" },
      { icon: MdLocationCity, hint: "Permanent Address" },
      { icon: MdLanguage, hint: "Website" }
    ]
  },
  {
    title: "Official Documents",
    icon: MdAccountBalance,
    color: "#f97316",
    fields: [
      { icon: MdAccountBalance, hint: "Passport Number" },
      { icon: MdCreditCard, hint: "Aadhaar" },
      { icon: MdDirectionsCar, hint: "DL Number" },
      { icon: MdAccountBalance, hint: "PAN Card Number" }
    ]
  },
  {
    title: "Digital Payments",
    icon: MdPayment,
    color: "#a855f7",
    fields: [{ icon: MdAccountBalanceWallet, hint: "UPI Address (Paytm)" }]
  },
  {
    title: "Social Media",
    icon: MdShare,
    color: "#4f46e5",
    fields: [
      { icon: MdLink, hint: "LinkedIn URL" },
      { icon: MdFacebook, hint: "Facebook" },
      { icon: MdVideoCall, hint: "Skype ID" },
      { icon: MdChat, hint: "WhatsApp link to chat" },
      { icon: MdCameraAlt, hint: "Instagram" }
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
  const [authState, setAuthState] = useState<{
    status: "checking" | "needsSetup" | "needsVerify" | "verified" | "unsupported";
    error?: string;
  }>({ status: "checking" });
  const [unlockedCategories, setUnlockedCategories] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<{ text: string; tone: "ok" | "warn" | "error" } | null>(
    null
  );

  useEffect(() => {
    const data = getUserData();
    setLocalUserData(data);
    setIsViewMode(Object.values(data).some((value) => value.trim().length > 0));
    setLocalProfileImage(getProfileImage());
  }, []);

  useEffect(() => {
    const isSupported =
      window.isSecureContext && "PublicKeyCredential" in window && typeof PublicKeyCredential === "function";
    if (!isSupported) {
      setAuthState({ status: "unsupported" });
      return;
    }
    const credentialId = getString(storageKeys.faceIdCredentialId);
    if (!credentialId) {
      setAuthState({ status: "needsSetup" });
    } else {
      setAuthState({ status: "needsVerify" });
    }
  }, []);

  const userName = useMemo(
    () => userData["First Name"] || userData["first_name"] || "User",
    [userData]
  );

  const userEmail = useMemo(
    () => userData["Email"] || userData["email"] || "",
    [userData]
  );

  const showMessage = (text: string, tone: "ok" | "warn" | "error") => {
    setMessage({ text, tone });
    window.setTimeout(() => setMessage(null), 2000);
  };

  const bufferToBase64Url = (buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };

  const base64UrlToBuffer = (base64Url: string) => {
    const padding = "====".slice((base64Url.length % 4) || 4);
    const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  };

  const createChallenge = (length = 32) => {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return bytes;
  };

  const createCredentialId = async (displayName: string) => {
    const publicKey: PublicKeyCredentialCreationOptions = {
      challenge: createChallenge(),
      rp: { name: "Info Card" },
      user: {
        id: createChallenge(),
        name: "local-user",
        displayName
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 }
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required"
      },
      timeout: 60000,
      attestation: "none"
    };
    const credential = (await navigator.credentials.create({
      publicKey
    })) as PublicKeyCredential | null;
    if (!credential) return "";
    return bufferToBase64Url(credential.rawId);
  };

  const requestAssertion = async (credentialId: string) => {
    const publicKey: PublicKeyCredentialRequestOptions = {
      challenge: createChallenge(),
      allowCredentials: [
        {
          id: base64UrlToBuffer(credentialId),
          type: "public-key"
        }
      ],
      userVerification: "required",
      timeout: 60000
    };
    const assertion = (await navigator.credentials.get({
      publicKey
    })) as PublicKeyCredential | null;
    return Boolean(assertion);
  };

  const setupFaceId = async () => {
    try {
      setAuthState({ status: "needsSetup" });
      const credentialId = await createCredentialId(userName || "User");
      if (!credentialId) {
        setAuthState({ status: "needsSetup", error: "Face ID setup was cancelled." });
        return;
      }
      setString(storageKeys.faceIdCredentialId, credentialId);
      setAuthState({ status: "verified" });
    } catch (error) {
      setAuthState({
        status: "needsSetup",
        error: error instanceof Error ? error.message : "Face ID setup failed."
      });
    }
  };

  const verifyFaceId = async () => {
    try {
      setAuthState({ status: "needsVerify" });
      const credentialId = getString(storageKeys.faceIdCredentialId);
      if (!credentialId) {
        setAuthState({ status: "needsSetup" });
        return;
      }
      const verified = await requestAssertion(credentialId);
      if (!verified) {
        setAuthState({ status: "needsVerify", error: "Face ID verification was cancelled." });
        return;
      }
      setAuthState({ status: "verified" });
    } catch (error) {
      setAuthState({
        status: "needsVerify",
        error: error instanceof Error ? error.message : "Face ID verification failed."
      });
    }
  };

  const unlockCategory = async (categoryTitle: string) => {
    try {
      let credentialId = getString(storageKeys.faceIdCredentialId);
      if (!credentialId) {
        credentialId = await createCredentialId(userName || "User");
        if (!credentialId) {
          showMessage("Face ID setup failed", "error");
          return;
        }
        setString(storageKeys.faceIdCredentialId, credentialId);
      }
      const verified = await requestAssertion(credentialId);
      if (!verified) {
        showMessage("Face ID verification failed", "error");
        return;
      }
      setUnlockedCategories((prev) => ({ ...prev, [categoryTitle]: true }));
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Face ID verification failed", "error");
    }
  };

  const unlockAllCategories = async () => {
    try {
      let credentialId = getString(storageKeys.faceIdCredentialId);
      if (!credentialId) {
        credentialId = await createCredentialId(userName || "User");
        if (!credentialId) {
          showMessage("Face ID setup failed", "error");
          return;
        }
        setString(storageKeys.faceIdCredentialId, credentialId);
      }
      const verified = await requestAssertion(credentialId);
      if (!verified) {
        showMessage("Face ID verification failed", "error");
        return;
      }
      setUnlockedCategories(
        fieldCategories.reduce<Record<string, boolean>>((acc, category) => {
          acc[category.title] = true;
          return acc;
        }, {})
      );
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Face ID verification failed", "error");
    }
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
    };
    reader.readAsDataURL(file);
  };

  const updateField = (hint: string, value: string) => {
    setLocalUserData((prev) => ({ ...prev, [hint]: value }));
  };

  const saveUserInfo = () => {
    const missingFields: string[] = [];
    fieldCategories.forEach((category) => {
      category.fields.forEach((field) => {
        if (field.required && !userData[field.hint]?.trim()) {
          missingFields.push(field.hint);
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

  const refreshData = () => {
    const data = getUserData();
    setLocalUserData(data);
    setIsViewMode(Object.values(data).some((value) => value.trim().length > 0));
    showMessage("Profile refreshed", "ok");
  };

  const copyAll = () => {
    const lines = Object.entries(userData)
      .filter(([, value]) => value.trim())
      .map(([key, value]) => `${key}: ${value}`)
      .join("\n");
    if (!lines) return;
    navigator.clipboard.writeText(lines);
    showMessage("All profile data copied!", "ok");
  };

  const completionPercentage = () => {
    const totalFields = fieldCategories.reduce((sum, category) => sum + category.fields.length, 0);
    const filledFields = fieldCategories.reduce((sum, category) => {
      return (
        sum +
        category.fields.filter((field) => userData[field.hint]?.trim().length).length
      );
    }, 0);
    return totalFields ? filledFields / totalFields : 0;
  };

  const categoryCompletion = (category: CategoryConfig) =>
    category.fields.filter((field) => userData[field.hint]?.trim().length).length;

  const hasAnyData = Object.values(userData).some((value) => value.trim().length > 0);

  const handleExport = () => {
    const data = getUserData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
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
      const data = JSON.parse(text) as Record<string, string>;
      setUserData(data);
      setLocalUserData(data);
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
    setProfileImage("");
    setLocalUserData({});
    setIsViewMode(false);
    showMessage("Profile cleared", "ok");
  };

  if (authState.status !== "verified") {
    return (
      <div className="min-h-screen bg-[#F3EFEF] text-black">
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-lg shadow-black/10">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-purple-600 p-3 text-white">
                <MdPersonOutline className="text-xl" />
              </div>
              <div>
                <p className="text-lg font-semibold">Face ID required</p>
                <p className="text-sm text-black/50">Verify before viewing your profile</p>
              </div>
            </div>
            {authState.status === "unsupported" ? (
              <p className="mt-4 text-sm text-black/60">
                Face ID is not available in this browser.
              </p>
            ) : null}
            {authState.error ? <p className="mt-4 text-sm text-red-600">{authState.error}</p> : null}
            <div className="mt-6 flex flex-col gap-3">
              {authState.status === "checking" ? (
                <button
                  className="w-full rounded-2xl bg-purple-200 px-4 py-3 text-sm font-semibold text-purple-800"
                  disabled
                >
                  Checking device security...
                </button>
              ) : null}
              {authState.status === "needsSetup" ? (
                <button
                  className="w-full rounded-2xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white"
                  onClick={setupFaceId}
                >
                  Set up Face ID
                </button>
              ) : null}
              {authState.status === "needsVerify" ? (
                <button
                  className="w-full rounded-2xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white"
                  onClick={verifyFaceId}
                >
                  Verify with Face ID
                </button>
              ) : null}
              {authState.status === "unsupported" ? (
                <button
                  className="w-full rounded-2xl bg-black/80 px-4 py-3 text-sm font-semibold text-white"
                  onClick={() => setAuthState({ status: "verified" })}
                >
                  Continue
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  }

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
          <button
            className="flex w-full items-center gap-3 py-2 text-left text-sm"
            onClick={() => {
              setIsDrawerOpen(false);
              if (!hasAnyData) {
                showMessage("Please save your information first", "warn");
                return;
              }
              navigate("/qr");
            }}
          >
            <MdQrCode className="text-lg text-green-600" />
            QR Code
          </button>
          <button
            className="flex w-full items-center gap-3 py-2 text-left text-sm"
            onClick={() => {
              setIsDrawerOpen(false);
              navigate("/scan");
            }}
          >
            <MdQrCodeScanner className="text-lg text-purple-600" />
            Scan QR
          </button>
          <div className="my-4 border-t border-black/10" />
          <button className="flex w-full items-center gap-3 py-2 text-left text-sm" onClick={handleExport}>
            <MdFileUpload className="text-lg text-blue-600" />
            Export Profile
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
              className="flex w-full items-center gap-3 py-2 text-left text-sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <MdFileDownload className="text-lg text-purple-600" />
              Import Profile
            </button>
          </div>
          <button className="flex w-full items-center gap-3 py-2 text-left text-sm" onClick={handleClear}>
            <MdDeleteForever className="text-lg text-red-600" />
            Clear All Data
          </button>
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
          unlockedCategories={unlockedCategories}
          onUnlockCategory={unlockCategory}
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
          onCopyAll={copyAll}
          onRefresh={refreshData}
          completionPercentage={completionPercentage()}
          categoryCompletion={categoryCompletion}
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
        <button
          className="fixed bottom-28 right-6 z-20 rounded-xl bg-purple-600 p-3 text-white shadow-lg shadow-black/20"
          onClick={unlockAllCategories}
          aria-label="Unlock all cards"
        >
          <MdPersonOutline className="text-2xl" />
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
  unlockedCategories: Record<string, boolean>;
  onUnlockCategory: (categoryTitle: string) => void;
  onUpdateField: (hint: string, value: string) => void;
  onSave: () => void;
  onSwitchToEdit: () => void;
  onShareQR: () => void;
  onCopyAll: () => void;
  onRefresh: () => void;
  completionPercentage: number;
  categoryCompletion: (category: CategoryConfig) => number;
};

function UserInfoForm({
  isViewMode,
  userData,
  unlockedCategories,
  onUnlockCategory,
  onUpdateField,
  onSave,
  onSwitchToEdit,
  onShareQR,
  onCopyAll,
  onRefresh,
  completionPercentage,
  categoryCompletion
}: UserInfoFormProps) {
  const buildQuickInfo = (
    icon: React.ComponentType<{ className?: string }>,
    label: string,
    value: string,
    color: string
  ) => {
    const Icon = icon;
    return (
      <div
        className="rounded-xl border px-3 py-3 text-left"
        style={{ borderColor: `${color}33`, backgroundColor: `${color}1A` }}
      >
        <div className="flex items-center gap-2 text-xs font-semibold" style={{ color }}>
          <Icon className="text-sm" />
          {label}
        </div>
        <p className="mt-2 text-sm font-medium text-black/80">
          {value.length > 20 ? `${value.slice(0, 20)}...` : value}
        </p>
      </div>
    );
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
    return category.fields.some((field) => userData[field.hint]?.trim().length);
  };

  const shouldShowField = (hint: string) => {
    if (!isViewMode) return true;
    return Boolean(userData[hint]?.trim().length);
  };

  return (
    <div className="px-4 pb-16 pt-20">
      <div className="rounded-3xl border border-purple-200/70 bg-white p-6 shadow-lg shadow-black/10">
        {isViewMode ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-gradient-to-br from-purple-700 to-purple-400 p-4 text-white shadow-lg shadow-purple-700/30">
                <MdPerson className="text-3xl" />
              </div>
              <div className="flex-1">
                <p className="text-2xl font-bold text-black/90">
                  {userData["First Name"] || "User"}
                </p>
                <p className="text-sm font-medium text-black/50">
                  {userData["Email"] || "Digital Identity Profile"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-black/5 bg-white p-4">
              <div className="flex items-center gap-2 text-black/60">
                <MdInfoOutline />
                <p className="text-base font-semibold">Quick Info</p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {buildQuickInfo(MdPhone, "Phone", userData["Phone Number"] || "Not provided", "#22c55e")}
                {buildQuickInfo(MdHome, "Location", userData["Address"] || "Not provided", "#3b82f6")}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {buildQuickAction(MdQrCode, "Share QR", "#22c55e", onShareQR)}
              {buildQuickAction(MdContentCopy, "Copy All", "#3b82f6", onCopyAll)}
              {buildQuickAction(MdRefresh, "Refresh", "#f59e0b", onRefresh)}
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
              isUnlocked={Boolean(unlockedCategories[category.title])}
              userData={userData}
              onUpdateField={onUpdateField}
              categoryCompletion={categoryCompletion(category)}
              shouldShowField={shouldShowField}
              onUnlock={() => onUnlockCategory(category.title)}
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
    </div>
  );
}

type CategorySectionProps = {
  category: CategoryConfig;
  isViewMode: boolean;
  isUnlocked: boolean;
  userData: Record<string, string>;
  onUpdateField: (hint: string, value: string) => void;
  categoryCompletion: number;
  shouldShowField: (hint: string) => boolean;
  onUnlock: () => void;
};

function CategorySection({
  category,
  isViewMode,
  isUnlocked,
  userData,
  onUpdateField,
  categoryCompletion,
  shouldShowField,
  onUnlock
}: CategorySectionProps) {
  const Icon = category.icon;
  const isLocked = isViewMode && !isUnlocked;
  return (
    <div
      className="overflow-hidden rounded-3xl border bg-white shadow-lg"
      style={{ borderColor: `${category.color}33` }}
    >
      <button
        type="button"
        className="flex items-center justify-between px-5 py-4"
        style={{
          background: isViewMode
            ? `linear-gradient(135deg, ${category.color}26, ${category.color}0D)`
            : `${category.color}1A`
        }}
        onClick={() => {
          if (isViewMode && !isUnlocked) onUnlock();
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
      </button>
      {isLocked ? (
        <div className="px-5 pb-5 text-sm text-black/50">Tap to unlock with Face ID</div>
      ) : (
        <div className="space-y-3 px-5 py-5">
          {category.fields.map((field) =>
            shouldShowField(field.hint) ? (
              <FieldRow
                key={field.hint}
                field={field}
                isViewMode={isViewMode}
                value={userData[field.hint] ?? ""}
                onChange={(value) => onUpdateField(field.hint, value)}
              />
            ) : null
          )}
        </div>
      )}
    </div>
  );
}

type FieldRowProps = {
  field: FieldConfig;
  isViewMode: boolean;
  value: string;
  onChange: (value: string) => void;
};

function FieldRow({ field, isViewMode, value, onChange }: FieldRowProps) {
  const Icon = field.icon;

  if (isViewMode) {
    return (
      <div className="flex items-center gap-4 rounded-2xl border border-black/5 bg-gradient-to-br from-white to-gray-50 p-4 shadow-md shadow-black/10">
        <div className="rounded-xl bg-gradient-to-br from-purple-700 to-purple-400 p-3 text-white shadow-sm">
          <Icon className="text-lg" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-black/40">{field.hint}</p>
          <p className="text-base font-semibold text-black/80">{value}</p>
        </div>
        <button
          className="rounded-lg bg-black/5 p-2 text-black/50"
          onClick={() => {
            if (!value) return;
            navigator.clipboard.writeText(value);
          }}
          aria-label={`Copy ${field.hint}`}
        >
          <MdContentCopy />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={`${field.hint}${field.required ? " *" : ""}`}
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
            aria-label={`Copy ${field.hint}`}
          >
            <MdContentCopy />
          </button>
        ) : null}
        {value ? (
          <button
            className="rounded-md p-1 text-black/40"
            onClick={() => onChange("")}
            aria-label={`Clear ${field.hint}`}
          >
            <MdClear />
          </button>
        ) : null}
      </div>
    </div>
  );
}
