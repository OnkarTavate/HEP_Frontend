"use client";

import Link from "next/link";
import { ArrowLeft, Ship, ShieldCheck, Database, QrCode, Target, Users, Lock, Clock, UserCheck, RefreshCw, Phone } from "lucide-react";

const sections = [
  {
    icon: Database,
    title: "Information We Collect",
    color: "blue",
    body: "APACS may collect personal and related information required for registration, verification and issuance of access passes, including name, contact details, identification details, photograph, employment/authorisation details, driver details, vehicle details and supporting documents.",
  },
  {
    icon: UserCheck,
    title: "Face Verification",
    color: "violet",
    body: "APACS may use facial information for identity and access verification of authorised persons at designated Port entry points.",
  },
  {
    icon: QrCode,
    title: "QR Code Verification",
    color: "indigo",
    body: "APACS may generate and use QR codes associated with approved passes for verification and access-control purposes.",
  },
  {
    icon: Target,
    title: "Purpose of Collection",
    color: "blue",
    body: "Information collected through APACS is used for user registration, processing and verification of pass applications, Port security, access control, prevention of unauthorised access and related administrative purposes.",
  },
  {
    icon: Users,
    title: "Use and Disclosure",
    color: "cyan",
    body: "Personal information will be accessed only by authorised personnel and service providers as necessary for operating APACS, Port security, administration and compliance with applicable law. Information may also be disclosed to competent authorities where required by law.",
  },
  {
    icon: Lock,
    title: "Data Security",
    color: "emerald",
    body: "Reasonable technical and organisational measures are implemented to protect personal information against unauthorised access, misuse, alteration, disclosure or loss.",
  },
  {
    icon: Clock,
    title: "Data Retention",
    color: "blue",
    body: "Personal information will be retained only for as long as necessary for the purposes for which it was collected, or as required under applicable law, Port rules and security requirements.",
  },
  {
    icon: UserCheck,
    title: "User Responsibility",
    color: "amber",
    body: "Users are responsible for providing accurate information and for keeping their APACS account credentials secure.",
  },
  {
    icon: RefreshCw,
    title: "Changes to this Policy",
    color: "slate",
    body: "Chennai Port Authority may update this Privacy Policy from time to time to reflect changes in APACS, applicable law or Port requirements.",
  },
  {
    icon: Phone,
    title: "Contact",
    color: "blue",
    body: "For privacy-related queries or grievances, users may contact the designated Chennai Port Authority/APACS support authority through the official contact details provided on the portal.",
  },
];

const colorMap = {
  blue:    { bg: "bg-blue-50",    border: "border-blue-200",   icon: "bg-blue-600",    text: "text-blue-700"   },
  violet:  { bg: "bg-violet-50",  border: "border-violet-200", icon: "bg-violet-600",  text: "text-violet-700" },
  indigo:  { bg: "bg-indigo-50",  border: "border-indigo-200", icon: "bg-indigo-600",  text: "text-indigo-700" },
  cyan:    { bg: "bg-cyan-50",    border: "border-cyan-200",   icon: "bg-cyan-600",    text: "text-cyan-700"   },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-200",icon: "bg-emerald-600", text: "text-emerald-700"},
  amber:   { bg: "bg-amber-50",   border: "border-amber-200",  icon: "bg-amber-500",   text: "text-amber-700"  },
  slate:   { bg: "bg-slate-50",   border: "border-slate-200",  icon: "bg-slate-600",   text: "text-slate-700"  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#0c0e13] flex flex-col font-sans">
      {/* BG Layer */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center pointer-events-none"
        style={{ backgroundImage: "url('/port-bg.jpg')", filter: "brightness(0.18) saturate(0.6)" }}
      />
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 flex-grow w-full">
        {/* ── NAV ── */}
        <nav className="w-full max-w-6xl mx-auto px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-3 bg-white/[0.07] backdrop-blur-xl px-4 py-2.5 rounded-2xl border border-white/10">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-700 rounded-xl flex items-center justify-center shadow-lg shadow-orange-900/40">
              <Ship className="h-5 w-5 text-white" />
            </div>
            <span className="text-base font-extrabold text-white tracking-wide">APACS</span>
          </div>
          <Link
            href="/register"
            className="flex items-center gap-2 text-sm text-white/70 hover:text-white font-semibold bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 px-4 py-2.5 rounded-xl backdrop-blur-md transition-all duration-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Registration
          </Link>
        </nav>

        {/* ── HERO HEADER ── */}
        <div className="max-w-6xl mx-auto px-6 pt-6 pb-12">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-600 p-10 sm:p-14 shadow-2xl shadow-blue-900/60">
            <div className="absolute -top-10 -right-10 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-8 w-48 h-48 bg-indigo-400/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute top-1/2 right-32 w-24 h-24 bg-blue-300/10 rounded-full blur-xl pointer-events-none" />

            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="flex-shrink-0 w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center border border-white/30 shadow-inner">
                <ShieldCheck className="h-8 w-8 text-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-blue-200 uppercase tracking-[0.25em] mb-2">
                  Automated Port Access and Control System
                </p>
                <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight tracking-tight">
                  Privacy Policy
                </h1>
                <p className="mt-2 text-blue-100/80 text-sm font-medium">
                  How we collect, use and protect your personal information.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── MAIN CONTENT ── */}
        <main className="max-w-6xl mx-auto px-6 pb-20">
          <div className="bg-white rounded-3xl shadow-[0_20px_80px_rgba(0,0,0,0.4)] overflow-hidden">
            <div className="p-8 sm:p-12">

              {/* Intro strip */}
              <div className="flex items-start gap-4 p-6 bg-blue-50 border border-blue-200 rounded-2xl mb-10">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                  <ShieldCheck className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold text-blue-800 uppercase tracking-widest mb-1">Our Commitment</p>
                  <p className="text-sm text-blue-700 leading-relaxed font-medium">
                    Chennai Port Authority respects the privacy of users of the Automated Port Access and Control System (APACS). This policy explains how we handle your personal data responsibly and transparently.
                  </p>
                </div>
              </div>

              {/* Sections Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {sections.map((section, index) => {
                  const c = colorMap[section.color] || colorMap.blue;
                  const Icon = section.icon;
                  return (
                    <div
                      key={index}
                      className={`group relative flex flex-col gap-3 p-6 ${c.bg} border ${c.border} rounded-2xl hover:shadow-md transition-all duration-200 cursor-default`}
                    >
                      {/* Top Row */}
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 ${c.icon} rounded-xl flex items-center justify-center shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform duration-200`}>
                          <Icon className="h-4.5 w-4.5 text-white h-[18px] w-[18px]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${c.text} opacity-70`}>
                            Section {String(index + 1).padStart(2, "0")}
                          </span>
                          <h3 className="text-sm font-extrabold text-slate-900 leading-tight">
                            {section.title}
                          </h3>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className={`h-px w-full bg-gradient-to-r from-current to-transparent ${c.text} opacity-20`} />

                      {/* Body */}
                      <p className="text-[13px] text-slate-600 leading-relaxed">
                        {section.body}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Acknowledgement Banner */}
              <div className="mt-12 relative overflow-hidden rounded-2xl bg-slate-900 p-8 text-center">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-900/30 via-transparent to-indigo-900/20 pointer-events-none" />
                <div className="relative z-10">
                  <p className="text-xs font-bold text-blue-400 uppercase tracking-[0.2em] mb-3">
                    Acknowledgement
                  </p>
                  <p className="text-white/90 text-base font-medium leading-relaxed max-w-2xl mx-auto">
                    By using APACS or submitting an application, the user{" "}
                    <span className="text-blue-400 font-bold">acknowledges and agrees</span>{" "}
                    to this Privacy Policy.
                  </p>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-3.5 px-8 rounded-2xl shadow-lg shadow-blue-600/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Return to Registration
                </Link>
                <Link
                  href="/terms-and-conditions"
                  className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold py-3.5 px-8 rounded-2xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 border border-slate-200"
                >
                  View Terms &amp; Conditions →
                </Link>
              </div>
            </div>
          </div>
        </main>

        <footer className="text-center py-6 text-zinc-600 text-xs font-semibold uppercase tracking-widest">
          © 2026 Chennai Port Authority · All Rights Reserved
        </footer>
      </div>
    </div>
  );
}
