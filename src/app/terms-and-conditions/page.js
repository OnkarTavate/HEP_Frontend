"use client";

import Link from "next/link";
import { ArrowLeft, Ship, ScrollText, CheckCircle } from "lucide-react";

const terms = [
  {
    title: "Accuracy of Information",
    body: "I/We certify that the information and documents submitted through APACS are true, accurate and valid. I/We shall be responsible for any incorrect, misleading or false information provided.",
  },
  {
    title: "Authorised Purpose",
    body: "I/We certify that the persons/officials/workers/drivers and vehicles for whom access is requested are required for authorised official purposes within the Chennai Port premises.",
  },
  {
    title: "Responsibility for Personnel & Vehicles",
    body: "I/We shall be responsible for the identification and conduct of the persons and vehicles included in the application and shall ensure that they comply with all applicable Chennai Port Authority rules, regulations, safety and security requirements.",
  },
  {
    title: "Statutory Compliance",
    body: "I/We shall ensure that the required statutory requirements applicable to employees, contract workers, drivers and other personnel, including applicable labour, insurance, compensation, provident fund, ESI and minimum-wage requirements, are complied with.",
  },
  {
    title: "Pass Usage Restrictions",
    body: "The access/pass issued through APACS is valid only for the approved person/driver/vehicle and for the period and purpose specified. It shall not be transferred, shared, copied or misused.",
  },
  {
    title: "Security Verification",
    body: "Entry into the Port premises is subject to verification and security clearance. QR-code verification and face verification may be carried out at designated access points.",
  },
  {
    title: "Non-Interference with Verification",
    body: "I/We shall not attempt to bypass, manipulate or interfere with the QR-code or face-verification process or allow any unauthorised person to use an approved pass.",
  },
  {
    title: "Authority's Right to Reject or Cancel",
    body: "Chennai Port Authority reserves the right to reject, suspend or cancel an application/pass in case of incorrect information, document discrepancies, misuse, security concerns, violation of Port rules or other applicable requirements.",
  },
  {
    title: "Liability Disclaimer",
    body: "I/We acknowledge that the Chennai Port Authority shall not be responsible for any accident, injury or untoward incident involving the persons/vehicles brought into the Port premises, except to the extent of liability imposed under applicable law.",
  },
  {
    title: "Agreement to Comply",
    body: "I/We agree to comply with these Terms & Conditions and all applicable rules and directions of the Chennai Port Authority while using APACS.",
  },
];

export default function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen bg-[#0c0e13] flex flex-col font-sans">
      {/* BG Layer */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center pointer-events-none"
        style={{ backgroundImage: "url('/port-bg.jpg')", filter: "brightness(0.18) saturate(0.6)" }}
      />
      {/* Subtle grid overlay */}
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
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500 p-10 sm:p-14 shadow-2xl shadow-orange-900/50">
            {/* Decorative circles */}
            <div className="absolute -top-10 -right-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-10 w-40 h-40 bg-amber-300/20 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="flex-shrink-0 w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center border border-white/30 shadow-inner">
                <ScrollText className="h-8 w-8 text-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-orange-100 uppercase tracking-[0.25em] mb-2">
                  Automated Port Access and Control System
                </p>
                <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight tracking-tight">
                  Terms &amp; Conditions
                </h1>
                <p className="mt-2 text-orange-100/80 text-sm font-medium">
                  Please read all terms carefully before submitting your registration.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── MAIN CONTENT ── */}
        <main className="max-w-6xl mx-auto px-6 pb-20">
          <div className="bg-white rounded-3xl shadow-[0_20px_80px_rgba(0,0,0,0.4)] overflow-hidden">
            <div className="p-8 sm:p-12">

              {/* Effective badge */}
              <div className="flex flex-wrap items-center gap-3 mb-10 pb-8 border-b border-slate-100">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Effective: 2026
                </span>
                <span className="text-xs text-slate-400 font-medium">Chennai Port Authority · APACS Platform</span>
              </div>

              {/* Terms List */}
              <div className="space-y-6">
                {terms.map((term, index) => (
                  <div key={index} className="group flex gap-5 sm:gap-6">
                    {/* Index Column */}
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-black text-sm shadow-md shadow-orange-200 group-hover:scale-105 transition-transform duration-200">
                        {String(index + 1).padStart(2, "0")}
                      </div>
                      {index < terms.length - 1 && (
                        <div className="w-px flex-1 mt-3 bg-gradient-to-b from-orange-200 to-transparent min-h-[24px]" />
                      )}
                    </div>

                    {/* Card */}
                    <div className="flex-1 pb-6">
                      <div className="bg-slate-50 hover:bg-orange-50/60 border border-slate-200 hover:border-orange-200 rounded-2xl p-5 sm:p-6 transition-all duration-200 cursor-default">
                        <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-2">
                          {term.title}
                        </h3>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {term.body}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Confirmation Banner */}
              <div className="mt-12 relative overflow-hidden rounded-2xl bg-slate-900 p-8 text-center">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-900/30 via-transparent to-amber-900/20 pointer-events-none" />
                <div className="relative z-10">
                  <p className="text-xs font-bold text-orange-400 uppercase tracking-[0.2em] mb-3">
                    Declaration
                  </p>
                  <p className="text-white/90 text-base font-medium leading-relaxed max-w-2xl mx-auto">
                    By submitting the application, I/We confirm that I/We have{" "}
                    <span className="text-orange-400 font-bold">read, understood and agreed</span>{" "}
                    to the above Terms &amp; Conditions.
                  </p>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold py-3.5 px-8 rounded-2xl shadow-lg shadow-orange-600/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Return to Registration
                </Link>
                <Link
                  href="/privacy-policy"
                  className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold py-3.5 px-8 rounded-2xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 border border-slate-200"
                >
                  View Privacy Policy →
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
