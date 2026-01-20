import { useEffect, useMemo, useState } from "react";
import QRCode from "react-qr-code";
import { MdArrowBack, MdShare } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { getProfileImage, getUserData } from "../utils/storage";

const labelByKey: Record<string, string> = {
  firstName: "First Name",
  lastName: "Last Name",
  fatherName: "Father name",
  motherName: "Mother name",
  email: "Email",
  phoneNumber: "Phone Number",
  address: "Address",
  permanentAddress: "Permanent Address",
  website: "Website",
  passportNumber: "Passport Number",
  aadhaar: "Aadhaar",
  dlNumber: "DL Number",
  panCardNumber: "PAN Card Number",
  upiAddress: "UPI Address (Paytm)",
  linkedInUrl: "LinkedIn URL",
  facebook: "Facebook",
  skypeId: "Skype ID",
  whatsappLink: "WhatsApp link to chat",
  instagram: "Instagram"
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
  const father = userData["fatherName"] || "";
  const mother = userData["motherName"] || "";
  const passport = userData["passportNumber"] || "";
  const aadhaar = userData["aadhaar"] || "";
  const dl = userData["dlNumber"] || "";
  const pan = userData["panCardNumber"] || "";
  const upi = userData["upiAddress"] || "";

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
    father ? `X-FATHER:${father}` : "",
    mother ? `X-MOTHER:${mother}` : "",
    passport ? `X-PASSPORT:${passport}` : "",
    aadhaar ? `X-AADHAAR:${aadhaar}` : "",
    dl ? `X-DL:${dl}` : "",
    pan ? `X-PAN:${pan}` : "",
    upi ? `X-UPI:${upi}` : "",
    "END:VCARD"
  ]
    .filter(Boolean)
    .join("\n");

  return lines;
};

const iconForField = (field: string) => {
  switch (field) {
    case "firstName":
    case "lastName":
      return "👤";
    case "email":
      return "✉️";
    case "phoneNumber":
      return "📞";
    case "address":
      return "🏠";
    case "website":
      return "🌐";
    case "linkedInUrl":
      return "🔗";
    case "facebook":
      return "📘";
    case "instagram":
      return "📷";
    case "whatsappLink":
      return "💬";
    default:
      return "ℹ️";
  }
};

export default function QRDisplay() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(true);
  const [profileImage, setProfileImage] = useState("");

  useEffect(() => {
    const data = getUserData();
    setUserData(data);
    setProfileImage(getProfileImage());
    setIsGenerating(false);
  }, []);

  const qrData = useMemo(() => buildVCard(userData), [userData]);
  const summary = Object.entries(userData).filter(([, value]) => value?.trim());

  return (
    <div className="min-h-screen bg-[#F3EFEF] text-black">
      <header className="flex items-center justify-between bg-[#2B2322] px-6 py-4 text-white">
        <div className="flex items-center gap-3">
          <button
            className="rounded-full p-1"
            onClick={() => navigate("/")}
            aria-label="Back"
          >
            <MdArrowBack className="text-xl" />
          </button>
          <h1 className="text-lg font-semibold">My QR Code</h1>
        </div>
        <button
          className="rounded-full p-2"
          onClick={() => navigator.clipboard.writeText(qrData)}
          aria-label="Share QR Code"
        >
          <MdShare className="text-xl" />
        </button>
      </header>

      <main className="mx-auto max-w-xl space-y-6 px-6 py-6">
        <div className="rounded-3xl bg-white p-6 shadow-lg shadow-black/10">
          <div className="flex flex-col items-center gap-2">
            {profileImage ? (
              <img src={profileImage} alt="Profile" className="h-20 w-20 rounded-full object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-purple-700 text-3xl text-white">
                👤
              </div>
            )}
            <p className="text-2xl font-bold text-black/90">
              {`${userData["firstName"] || ""} ${userData["lastName"] || ""}`.trim()}
            </p>
            {userData["email"] ? (
              <p className="text-sm text-black/50">{userData["email"]}</p>
            ) : null}
          </div>
        </div>

        <div className="rounded-3xl bg-white p-8 text-center shadow-lg shadow-black/10">
          {isGenerating ? (
            <div className="space-y-3">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
              <p className="text-sm text-black/60">Generating QR Code...</p>
            </div>
          ) : qrData ? (
            <div className="space-y-4">
              <div className="mx-auto inline-block rounded-2xl bg-white p-4 shadow-md">
                <QRCode value={qrData} size={240} />
              </div>
              <p className="text-sm text-black/50">
                Scan this QR code to share your information
              </p>
            </div>
          ) : (
            <div className="space-y-3 text-red-600">
              <p className="text-5xl">⚠️</p>
              <p>Failed to generate QR code</p>
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-lg shadow-black/10">
          <h2 className="text-lg font-bold text-black/90">Information Summary</h2>
          <div className="mt-4 space-y-3">
            {summary.slice(0, 5).map(([key, value]) => (
              <div key={key} className="flex items-center gap-3 text-sm text-black/80">
                <span>{iconForField(key)}</span>
                <span className="font-medium">{labelByKey[key] ?? key}:</span>
                <span className="truncate">{value}</span>
              </div>
            ))}
            {summary.length > 5 ? (
              <p className="text-sm italic text-black/40">
                ... and {summary.length - 5} more fields
              </p>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
