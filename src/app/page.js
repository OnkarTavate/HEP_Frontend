// import Image from "next/image";

// export default function Home() {
//   return (
//     <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
//       <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
//         <Image
//           className="dark:invert"
//           src="/next.svg"
//           alt="Next.js logo"
//           width={100}
//           height={20}
//           priority
//         />
//         <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
//           <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
//             To get started, edit the page.js file.
//           </h1>
//           <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
//             Looking for a starting point or more instructions? Head over to{" "}
//             <a
//               href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//               className="font-medium text-zinc-950 dark:text-zinc-50"
//             >
//               Templates
//             </a>{" "}
//             or the{" "}
//             <a
//               href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//               className="font-medium text-zinc-950 dark:text-zinc-50"
//             >
//               Learning
//             </a>{" "}
//             center.
//           </p>
//         </div>
//         <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
//           <a
//             className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
//             href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//             target="_blank"
//             rel="noopener noreferrer"
//           >
//             <Image
//               className="dark:invert"
//               src="/vercel.svg"
//               alt="Vercel logomark"
//               width={16}
//               height={16}
//             />
//             Deploy Now
//           </a>
//           <a
//             className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"
//             href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//             target="_blank"
//             rel="noopener noreferrer"
//           >
//             Documentation
//           </a>
//         </div>
//       </main>
//     </div>
//   );
// }

"use client"; // Required in Next.js for hooks like useState

import React, { useState } from "react";
import { useRouter } from "next/navigation"; // Changed from react-router-dom
// import { useAuth } from '../context/AuthContext'; // Ensure this path exists or comment out for now
import {
  Ship,
  Lock,
  User,
  RefreshCw,
  Sparkles,
  Shield,
  TrendingUp,
  Clock,
} from "lucide-react";

/** * NOTE: If you don't have these UI components yet,
 * I have replaced them with standard HTML tags to ensure the code runs.
 */

const LoginPage = () => {
  const router = useRouter();
  // const { login } = useAuth(); // Uncomment when your AuthContext is ready

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    captcha: "",
  });
  const [error, setError] = useState("");
  const [captchaCode] = useState("X9B2R");

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (formData.captcha !== captchaCode) {
      setError("Invalid security code");
      return;
    }

    // Temporary logic since we don't have AuthContext yet
    if (formData.username && formData.password) {
      console.log("Login successful!");
      router.push("/dashboard");
    } else {
      setError("Please enter valid credentials");
    }
  };

  const quickFillDemo = (role) => {
    const demoUsers = {
      applicant: { username: "applicant@gmt.com", password: "demo123" },
      pass_officer: { username: "pass.officer", password: "demo123" },
      traffic_officer: { username: "traffic.officer", password: "demo123" },
      admin: { username: "admin", password: "admin123" },
    };
    setFormData({ ...formData, ...demoUsers[role] });
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-zinc-50 font-sans">
      {/* Animated Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-white"></div>

      {/* Floating Orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl"></div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-7xl grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Section - Branding */}
          <div className="hidden lg:block space-y-8 animate-in fade-in duration-700">
            <div className="inline-flex items-center gap-4 bg-white/60 backdrop-blur-md p-6 rounded-3xl shadow-lg border border-white/40">
              <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Ship className="h-9 w-9 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 leading-none">
                  Chennai Port
                </h1>
                <p className="text-sm font-medium text-orange-600 mt-1">
                  Authority
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-5xl font-bold leading-tight text-gray-900">
                Welcome to the
                <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-600 to-orange-400">
                  Gate Automation System
                </span>
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed max-w-xl">
                A centralized digital platform for seamless personnel, vehicle,
                and cargo movement control.
              </p>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  icon: Shield,
                  title: "Secure Access",
                  desc: "Security protocols",
                },
                {
                  icon: TrendingUp,
                  title: "Real-Time",
                  desc: "Instant processing",
                },
                {
                  icon: Clock,
                  title: "24/7 Support",
                  desc: "Always available",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="bg-white/60 backdrop-blur-md p-5 rounded-2xl border border-white/40 hover:scale-105 transition-transform cursor-default"
                >
                  <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center mb-3">
                    <item.icon className="h-6 w-6 text-white" />
                  </div>
                  <p className="font-semibold text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-600 mt-1">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Section - Login Form */}
          <div className="animate-in slide-in-from-bottom duration-700">
            <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/40">
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-600 rounded-2xl shadow-lg mb-4">
                    <Sparkles className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900">Sign In</h3>
                  <p className="text-gray-600">Access your secure portal</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="p-3 text-sm bg-red-50 border border-red-200 text-red-800 rounded-lg">
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Username / Employee ID
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Enter your credentials"
                        value={formData.username}
                        onChange={(e) =>
                          setFormData({ ...formData, username: e.target.value })
                        }
                        className="w-full pl-12 pr-4 h-14 bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 rounded-xl transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">
                        Password
                      </label>
                      <button
                        type="button"
                        className="text-xs text-orange-600 hover:underline font-medium"
                      >
                        Forgot?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="password"
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        className="w-full pl-12 pr-4 h-14 bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 rounded-xl transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Security Check
                    </label>
                    <div className="flex gap-3">
                      <input
                        placeholder="Enter code"
                        value={formData.captcha}
                        onChange={(e) =>
                          setFormData({ ...formData, captcha: e.target.value })
                        }
                        className="flex-1 px-4 h-14 bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 rounded-xl"
                        required
                      />
                      <div className="flex items-center gap-3 bg-orange-100 px-6 rounded-xl border border-orange-200">
                        <span className="font-mono font-bold text-xl tracking-wider text-orange-700">
                          {captchaCode}
                        </span>
                        <RefreshCw className="h-5 w-5 text-orange-600 cursor-pointer hover:rotate-180 transition-transform duration-500" />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full h-14 bg-orange-600 text-white text-lg font-semibold rounded-xl hover:bg-orange-700 shadow-lg shadow-orange-600/20 transition-all"
                  >
                    Login to Portal
                  </button>
                </form>
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="grid grid-cols-3 gap-4">
                    {/* Register */}
                    <button
                      type="button"
                      onClick={() => router.push("/register")}
                      className="flex flex-col items-center gap-2 group"
                    >
                      <div className="p-3.5 rounded-xl bg-gray-50 group-hover:bg-orange-50 transition-all border border-transparent group-hover:border-orange-200">
                        <User className="h-7 w-7 text-gray-700 group-hover:text-orange-600 transition-colors" />
                      </div>
                      <span className="text-[11px] font-bold text-gray-800 uppercase tracking-wide text-center">
                        Register
                      </span>
                    </button>

                    {/* Track Pass */}
                    <button
                      type="button"
                      onClick={() => router.push("/track-pass")}
                      className="flex flex-col items-center gap-2 group"
                    >
                      <div className="p-3.5 rounded-xl bg-gray-50 group-hover:bg-orange-50 transition-all border border-transparent group-hover:border-orange-200">
                        <TrendingUp className="h-7 w-7 text-gray-700 group-hover:text-orange-600 transition-colors" />
                      </div>
                      <span className="text-[11px] font-bold text-gray-800 uppercase tracking-wide text-center">
                        Track Pass
                      </span>
                    </button>

                    {/* Manual */}
                    <button
                      type="button"
                      onClick={() => router.push("/manual")}
                      className="flex flex-col items-center gap-2 group"
                    >
                      <div className="p-3.5 rounded-xl bg-gray-50 group-hover:bg-orange-50 transition-all border border-transparent group-hover:border-orange-200">
                        <Sparkles className="h-7 w-7 text-gray-700 group-hover:text-orange-600 transition-colors" />
                      </div>
                      <span className="text-[11px] font-bold text-gray-800 uppercase tracking-wide text-center">
                        Manual
                      </span>
                    </button>
                  </div>
                </div>
                <div className="pt-6 border-t border-gray-200 text-center">
                  <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wider">
                    Quick Demo Access
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      "applicant",
                      "pass_officer",
                      "traffic_officer",
                      "admin",
                    ].map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => quickFillDemo(role)}
                        className="py-2 text-xs font-medium border border-orange-200 rounded-lg text-gray-600 hover:bg-orange-50 transition-colors capitalize"
                      >
                        {role.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
