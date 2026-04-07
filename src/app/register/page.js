"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import Link from "next/link";
import {
  Ship,
  ArrowLeft,
  UploadCloud,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  Building2,
  MapPin,
  Contact2,
  FileText,
  Loader2, // Added a loader icon
} from "lucide-react";

// Map the identification fields cleanly to match the backend schema exactly
const identificationTypes = [
  {
    label: "GST",
    numName: "gstinNumber",
    fileName: "gstinDoc",
    fileId: "gstFileInput",
    req: true,
  },
  {
    label: "PAN",
    numName: "panNumber",
    fileName: "panDoc",
    fileId: "panFileInput",
    req: true,
  },
  {
    label: "TAN",
    numName: "tanNumber",
    fileName: "tanDoc",
    fileId: "tanFileInput",
    req: false,
  },
];

export default function RegisterPage() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // NEW: Prevents double-clicks
  const [referenceNo, setReferenceNo] = useState("");
  const [entityFileName, setEntityFileName] = useState("");

  // Dynamic User Types State
  const [userTypes, setUserTypes] = useState([]);
  const [selectedUserTypeId, setSelectedUserTypeId] = useState("");

  // Captcha State
  const [captchaSvg, setCaptchaSvg] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");

  const handleMouseMove = (e) => {
    const x = (e.clientX - window.innerWidth / 2) / 50;
    const y = (e.clientY - window.innerHeight / 2) / 50;
    setMousePos({ x, y });
  };

  // Fetch User Types and Captcha from API
  const fetchInitialData = async () => {
    try {
      const url = `${process.env.NEXT_PUBLIC_AGENT_API}/user-types/getUserTypes`;
      const response = await axios.get(url, { withCredentials: true });
      const data = response.data;

      if (data.success) {
        setUserTypes(data.userTypes);
        setCaptchaSvg(data.captchaSvg);
        setCaptchaToken(data.captchaToken);
        setCaptchaInput(""); // Clear input when refreshing captcha
      }
    } catch (error) {
      console.error("Error fetching initial data:", error);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const validateFile = (file, setFileName, inputRef) => {
    const maxSize = 1 * 1024 * 1024; // 1MB

    if (!file) return false;

    if (file.size > maxSize) {
      alert("File must be less than 1MB");
      inputRef.value = "";
      setFileName("");
      return false;
    }

    if (file.type !== "application/pdf") {
      alert("Only PDF files are allowed");
      inputRef.value = "";
      setFileName("");
      return false;
    }

    setFileName(file.name);
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prevent double submissions
    if (isSubmitting) return;
    setIsSubmitting(true);

    const formData = new FormData();
    const formElements = e.target.elements;

    // FIND THE ACTUAL NAME FOR THE SELECTED USER TYPE
    const selectedTypeObj = userTypes.find(
      (type) => type.id.toString() === selectedUserTypeId.toString(),
    );
    const userTypeName = selectedTypeObj
      ? selectedTypeObj.name
      : selectedUserTypeId;

    // 1. Append Text Fields FIRST
    formData.append("userTypeName", userTypeName || "");
    formData.append("userTypeId", selectedUserTypeId || "");
    formData.append("mobileNo", formElements.mobileNo.value || "");
    formData.append("entityName", formElements.entityName.value || "");
    formData.append("email", formElements.email.value || "");

    formData.append("addressLine", formElements.addressLine.value || "");
    formData.append("city", formElements.city.value || "");
    formData.append("state", formElements.state.value || "");
    formData.append("pincode", formElements.pincode.value || "");
    formData.append("country", formElements.country.value || "");

    formData.append("gstinNumber", formElements.gstinNumber.value || "");
    formData.append("panNumber", formElements.panNumber.value || "");
    formData.append("tanNumber", formElements.tanNumber.value || "");

    formData.append("remark", formElements.remark?.value || "");

    formData.append("title", formElements.title.value || "");
    formData.append("firstName", formElements.firstName.value || "");
    formData.append("lastName", formElements.lastName.value || "");
    formData.append("contactMobile", formElements.contactMobile.value || "");
    formData.append("contactEmail", formElements.contactEmail.value || "");

    formData.append(
      "termsAccepted",
      formElements.termsAccepted.checked ? "true" : "false",
    );

    // Captcha validation fields
    formData.append("captchaValue", captchaInput || "");
    formData.append("captchaToken", captchaToken || "");

    // 2. Append File Fields Safely
    const entityFile = document.getElementById("entityFileInput")?.files[0];
    const gstFile = document.getElementById("gstFileInput")?.files[0];
    const panFile = document.getElementById("panFileInput")?.files[0];
    const tanFile = document.getElementById("tanFileInput")?.files[0];

    if (entityFile) formData.append("entityFile", entityFile);
    if (gstFile) formData.append("gstinDoc", gstFile);
    if (panFile) formData.append("panDoc", panFile);
    if (tanFile) formData.append("tanDoc", tanFile);

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_AGENT_API}/agents/registerAgent`,
        formData,
        { withCredentials: true },
      );

      const data = response.data;

      // Success Logic
      setReferenceNo(data.referenceNumber || "CHPT103152");
      window.scrollTo({ top: 0, behavior: "smooth" });
      setIsSubmitted(true);
    } catch (error) {
      console.error("Error submitting form:", error);

      if (error.response && error.response.data) {
        console.error("Backend Rejection Reason:", error.response.data.message);
        alert(`Registration Failed: ${error.response.data.message}`);
        fetchInitialData();
      } else {
        alert("Network error occurred. Ensure your backend server is running.");
      }
    } finally {
      // Re-enable the button if it failed
      setIsSubmitting(false);
    }
  };

  const SectionHeader = ({ icon: Icon, title }) => (
    <div className="flex items-center gap-3 mb-6 pb-3 border-b border-orange-100">
      <div className="p-2 bg-orange-100 rounded-lg">
        <Icon className="h-5 w-5 text-orange-600" />
      </div>
      <h3 className="text-xl font-bold text-slate-800">{title}</h3>
    </div>
  );

  const selectedTypeObj = userTypes.find(
    (type) => type.id.toString() === selectedUserTypeId.toString(),
  );
  const documentUploadLabel = selectedTypeObj
    ? selectedTypeObj.document_instruction
    : "Upload Required Document";

  return (
    <div
      onMouseMove={handleMouseMove}
      className="min-h-screen relative bg-zinc-950 overflow-hidden flex flex-col"
    >
      <div
        className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-500 ease-out pointer-events-none fixed"
        style={{
          backgroundImage: "url('/port-bg.jpg')",
          transform: `scale(1.1) translate(${-mousePos.x}px, ${-mousePos.y}px)`,
          filter: "brightness(0.4)",
        }}
      />

      <div className="relative z-10 flex-1 overflow-y-auto w-full">
        <nav className="w-full max-w-6xl mx-auto px-6 py-6 flex justify-between items-center animate-in fade-in duration-700">
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20">
            <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg">
              <Ship className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white leading-none">
                Chennai Port
              </h1>
              <p className="text-[10px] font-medium text-orange-400 uppercase tracking-widest mt-1">
                Authority
              </p>
            </div>
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 text-white hover:text-orange-400 transition-colors font-medium bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md border border-white/20"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </Link>
        </nav>

        <main className="max-w-5xl mx-auto px-4 pb-20 pt-4 animate-in slide-in-from-bottom-8 duration-700">
          <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/40 overflow-hidden">
            {!isSubmitted ? (
              <div className="p-8 md:p-12">
                <div className="mb-10 text-center max-w-2xl mx-auto">
                  <h2 className="text-4xl font-bold text-slate-900 mb-3">
                    User Registration
                  </h2>
                  <p className="text-slate-500">
                    Register your organization to access the Harbor Entry Permit
                    System.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-10">
                  {/* General Information */}
                  <div className="bg-orange-50/30 p-8 rounded-3xl border border-orange-100/50">
                    <SectionHeader
                      icon={Building2}
                      title="General Information"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider ml-1">
                          User Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="userType"
                          value={selectedUserTypeId}
                          onChange={(e) =>
                            setSelectedUserTypeId(e.target.value)
                          }
                          className="w-full h-12 px-4 bg-white border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 rounded-xl transition-all appearance-none"
                          required
                        >
                          <option value="">-- Select User Type --</option>
                          {userTypes.map((type) => (
                            <option key={type.id} value={type.id}>
                              {type.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider ml-1">
                          Mobile No. <span className="text-red-500">*</span>
                        </label>
                        <input
                          name="mobileNo"
                          type="text"
                          pattern="[0-9]{10}"
                          maxLength={10}
                          title="Enter 10 digit mobile number"
                          className="w-full h-12 px-4 bg-white border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 rounded-xl transition-all"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider ml-1">
                          Name of the Entity{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          name="entityName"
                          type="text"
                          className="w-full h-12 px-4 bg-white border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 rounded-xl transition-all"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider ml-1">
                          Entity Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          name="email"
                          type="email"
                          pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
                          className="w-full h-12 px-4 bg-white border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 rounded-xl transition-all"
                          required
                        />
                      </div>

                      <div className="md:col-span-2 space-y-1.5 mt-2">
                        <label className="text-xs font-semibold text-orange-700 uppercase tracking-wider ml-1 bg-orange-100 px-3 py-1 rounded-full">
                          {documentUploadLabel}{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <div className="flex items-center justify-center w-full mt-2">
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-orange-200 border-dashed rounded-2xl cursor-pointer bg-orange-50/50 hover:bg-orange-50 transition-colors">
                            {entityFileName ? (
                              <p className="text-green-600 font-semibold">
                                {entityFileName}
                              </p>
                            ) : (
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <UploadCloud className="w-8 h-8 text-orange-500 mb-2" />
                                <p className="text-sm text-slate-500">
                                  <span className="font-semibold text-orange-600">
                                    Click to upload
                                  </span>{" "}
                                  or drag and drop
                                </p>
                              </div>
                            )}
                            <input
                              id="entityFileInput"
                              name="entityFile"
                              type="file"
                              className="hidden"
                              required
                              onChange={(e) => {
                                const file = e.target.files[0];
                                validateFile(file, setEntityFileName, e.target);
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Address Information */}
                  <div className="bg-orange-50/30 p-8 rounded-3xl border border-orange-100/50">
                    <SectionHeader icon={MapPin} title="Address Information" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2 space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider ml-1">
                          Full Address <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          name="addressLine"
                          rows="2"
                          className="w-full p-4 bg-white border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 rounded-xl transition-all"
                          required
                        ></textarea>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider ml-1">
                          City <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="city"
                          className="w-full h-12 px-4 bg-white border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 rounded-xl transition-all appearance-none"
                          required
                        >
                          <option value="">-- Select --</option>
                          <option value="Chennai">Chennai</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider ml-1">
                          State <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="state"
                          className="w-full h-12 px-4 bg-white border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 rounded-xl transition-all appearance-none"
                          required
                        >
                          <option value="">-- Select --</option>
                          <option value="Tamil Nadu">Tamil Nadu</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider ml-1">
                          Pin Code <span className="text-red-500">*</span>
                        </label>
                        <input
                          name="pincode"
                          type="text"
                          pattern="[0-9]{6}"
                          maxLength={6}
                          title="Enter 6 digit PIN code"
                          className="w-full h-12 px-4 bg-white border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 rounded-xl transition-all"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider ml-1">
                          Country <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="country"
                          className="w-full h-12 px-4 bg-white border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 rounded-xl transition-all appearance-none"
                          required
                        >
                          <option value="India">India</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Identification Information */}
                  <div className="bg-orange-50/30 p-8 rounded-3xl border border-orange-100/50 overflow-x-auto">
                    <SectionHeader
                      icon={FileText}
                      title="Identification Information"
                    />
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="border-b-2 border-orange-100">
                          <th className="py-3 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider w-24">
                            Type
                          </th>
                          <th className="py-3 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Identification No.
                          </th>
                          <th className="py-3 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider w-1/3">
                            ID Copy (PDF)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {identificationTypes.map((idType) => (
                          <tr
                            key={idType.label}
                            className="hover:bg-white/50 transition-colors"
                          >
                            <td className="py-4 px-2 text-sm font-bold text-slate-800">
                              {idType.label}{" "}
                              {idType.req && (
                                <span className="text-red-500">*</span>
                              )}
                            </td>
                            <td className="py-4 px-2">
                              <input
                                name={idType.numName}
                                type="text"
                                pattern={
                                  idType.label === "PAN"
                                    ? "[A-Z]{5}[0-9]{4}[A-Z]{1}"
                                    : idType.label === "GST"
                                      ? "^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$"
                                      : undefined
                                }
                                title={
                                  idType.label === "PAN"
                                    ? "Enter valid PAN (ABCDE1234F)"
                                    : idType.label === "GST"
                                      ? "Enter valid GST number"
                                      : ""
                                }
                                className="w-full h-10 px-3 bg-white border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 rounded-lg"
                                required={idType.req}
                              />
                            </td>
                            <td className="py-4 px-2">
                              <input
                                id={idType.fileId}
                                name={idType.fileName}
                                type="file"
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  validateFile(file, () => {}, e.target);
                                }}
                                className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-orange-100 file:text-orange-700 hover:file:bg-orange-200 cursor-pointer"
                                required={idType.req}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-6 pt-4 border-t border-orange-100">
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider ml-1">
                        General Remark (Optional)
                      </label>
                      <input
                        name="remark"
                        type="text"
                        className="mt-1 w-full h-10 px-3 bg-white border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 rounded-lg"
                        placeholder="Notes about your documentation"
                      />
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="bg-orange-50/30 p-8 rounded-3xl border border-orange-100/50">
                    <SectionHeader
                      icon={Contact2}
                      title="Contact Information"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider ml-1">
                          Title <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="title"
                          className="w-full h-12 px-4 bg-white border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 rounded-xl transition-all appearance-none"
                          required
                        >
                          <option value="Mr.">Mr.</option>
                          <option value="Ms.">Ms.</option>
                          <option value="Mrs.">Mrs.</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider ml-1">
                          Mobile Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          name="contactMobile"
                          type="text"
                          pattern="[0-9]{10}"
                          maxLength={10}
                          className="w-full h-12 px-4 bg-white border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 rounded-xl transition-all"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider ml-1">
                          First Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          name="firstName"
                          type="text"
                          className="w-full h-12 px-4 bg-white border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 rounded-xl transition-all"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider ml-1">
                          Last Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          name="lastName"
                          type="text"
                          className="w-full h-12 px-4 bg-white border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 rounded-xl transition-all"
                          required
                        />
                      </div>
                      <div className="md:col-span-2 space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider ml-1">
                          Contact Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          name="contactEmail"
                          type="email"
                          placeholder="official@example.com"
                          className="w-full h-12 px-4 bg-white border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 rounded-xl transition-all"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Terms and Submit */}
                  <div className="space-y-8 pt-4">
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                      <div className="flex items-start gap-4">
                        <div className="pt-1">
                          <input
                            name="termsAccepted"
                            type="checkbox"
                            id="terms"
                            className="w-5 h-5 text-orange-600 border-slate-300 rounded focus:ring-orange-500 cursor-pointer"
                            required
                          />
                        </div>
                        <label
                          htmlFor="terms"
                          className="text-sm text-slate-600 cursor-pointer leading-relaxed"
                        >
                          <span className="font-bold text-slate-900">
                            I Read and Accept Terms & Conditions.
                          </span>{" "}
                          I/We hereby certify that the above permits are
                          required only for our official purpose. We hold
                          responsibility for all activities of the mentioned
                          persons/vehicles inside the port. I/We declare that
                          Chennai Port Authority will not be held responsible
                          for any untoward incidents.
                        </label>
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-6">
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex gap-2">
                          <div
                            className="flex items-center justify-center bg-white border border-slate-300 rounded-xl h-14 overflow-hidden w-40 shadow-sm"
                            dangerouslySetInnerHTML={{ __html: captchaSvg }}
                          />
                          <button
                            type="button"
                            onClick={fetchInitialData}
                            className="p-4 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                          >
                            <RefreshCw className="h-5 w-5 text-slate-500" />
                          </button>
                        </div>
                        <input
                          name="captchaInput"
                          type="text"
                          value={captchaInput}
                          onChange={(e) => setCaptchaInput(e.target.value)}
                          placeholder="Enter Security Code"
                          className="w-full text-center h-12 bg-white border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 rounded-xl tracking-widest font-bold shadow-sm"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting} // DISBLES BUTTON ON CLICK
                        className={`gradient-orange hover:opacity-90 text-white font-bold py-4 px-16 rounded-2xl shadow-lg shadow-orange-600/25 transition-all text-lg flex items-center gap-2 w-full md:w-auto justify-center ${isSubmitting ? "opacity-70 cursor-not-allowed" : ""}`}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-6 w-6 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="h-6 w-6" />
                            Submit Registration
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            ) : (
              <div className="p-12 md:p-24 text-center animate-in zoom-in-95 duration-500">
                <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner border-4 border-emerald-50">
                  <CheckCircle2 className="h-12 w-12 text-emerald-600" />
                </div>
                <h2 className="text-4xl font-extrabold text-slate-900 mb-4">
                  Registration Submitted!
                </h2>

                <div className="bg-gradient-to-br from-orange-50 to-white border border-orange-100 rounded-2xl p-8 my-10 inline-block shadow-sm">
                  <p className="text-sm text-orange-600 font-bold mb-2 uppercase tracking-widest">
                    Your Request Reference Number
                  </p>
                  <p className="text-5xl font-black text-slate-800 tracking-widest font-mono">
                    {referenceNo}
                  </p>
                </div>

                <div className="space-y-4 text-slate-600 max-w-lg mx-auto text-lg mb-12">
                  <p>
                    Your registration request has been submitted for competent
                    authority approval.
                  </p>
                  <p>
                    Upon approval, your{" "}
                    <strong className="text-slate-900">
                      Login ID & Password
                    </strong>{" "}
                    will be generated and sent to your registered email address.
                  </p>
                </div>

                <Link
                  href="/"
                  className="inline-flex items-center gap-2 bg-slate-900 hover:bg-orange-600 text-white font-bold py-4 px-10 rounded-xl shadow-lg transition-colors"
                >
                  Return to Login
                </Link>
              </div>
            )}
          </div>
        </main>

        <footer className="text-center py-6 text-zinc-500 text-xs font-bold uppercase tracking-widest">
          © 2026 - Chennai Port Authority
        </footer>
      </div>
    </div>
  );
}
