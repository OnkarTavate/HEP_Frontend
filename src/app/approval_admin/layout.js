// "use client";

// import { useState, useEffect } from "react";
// import { useRouter, usePathname } from "next/navigation";
// import Link from "next/link";
// import { Button } from "@/components/ui/button";
// import { Avatar, AvatarFallback } from "@/components/ui/avatar";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuLabel,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
// import {
//   Ship,
//   LayoutDashboard,
//   FileText,
//   CheckSquare,
//   Truck,
//   CreditCard,
//   Users,
//   LogOut,
//   Menu,
//   Bell,
//   Wallet,
//   Search,
//   HelpCircle,
//   Lock,
// } from "lucide-react";
// import { cn } from "@/lib/utils";

// import axios from "axios";
// const AUTH_API = process.env.NEXT_PUBLIC_AUTH_API;

// const getNavigationItems = (role) => {
//   const baseItems = [
//     { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
//   ];

//   const roleItems = {
//     Applicant: [
//       ...baseItems,
//       { name: "Apply Pass", href: "/dashboard/apply-pass", icon: FileText },
//       { name: "My Passes", href: "/dashboard/my-passes", icon: CreditCard },
//       { name: "Wallet", href: "/dashboard/wallet", icon: Wallet },
//     ],
//     "Pass Officer": [
//       {
//         name: "Dashboard",
//         href: "/dashboard/pass-approval",
//         icon: LayoutDashboard,
//       },
//       { name: "All Passes", href: "/dashboard/all-passes", icon: FileText },
//     ],
//     "Traffic Officer": [
//       { name: "Dashboard", href: "/approval_admin", icon: LayoutDashboard },
//       { name: "Gate Log", href: "/dashboard/gate-log", icon: FileText },
//     ],
//     "Marine Officer": [
//       { name: "Dashboard", href: "/approval_admin", icon: LayoutDashboard },
//     ],
//     Admin: [
//       { name: "Dashboard", href: "/approval_admin", icon: LayoutDashboard },
//       { name: "All Passes", href: "/dashboard/all-passes", icon: FileText },
//     ],
//     "Super Admin": [
//       { name: "Dashboard", href: "/approval_admin", icon: LayoutDashboard },
//       { name: "All Passes", href: "/dashboard/all-passes", icon: FileText },
//     ],
//   };

//   return roleItems[role] || baseItems;
// };

// export default function AdminLayout({ children }) {
//   const router = useRouter();
//   const pathname = usePathname();
//   const [user, setUser] = useState(null);
//   const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

//   useEffect(() => {
//     const storedUser = localStorage.getItem("user");
//     if (storedUser) {
//       setUser(JSON.parse(storedUser));
//     } else {
//       router.push("/");
//     }
//   }, [router]);

//   const handleLogout = async () => {
//     try {
//       const token = localStorage.getItem("accessToken");

//       if (token) {
//         await axios.post(
//           `${AUTH_API}/auth/logout`,
//           {},
//           {
//             headers: {
//               Authorization: `Bearer ${token}`,
//             },
//           },
//         );
//       }
//     } catch (err) {
//       console.error("Logout error:", err);
//     } finally {
//       // ✅ Always clear frontend state
//       localStorage.removeItem("accessToken");
//       localStorage.removeItem("refreshToken");
//       localStorage.removeItem("user");

//       router.push("/");
//     }
//   };
//   if (!user) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-orange-50/30 to-amber-50/50">
//         <div className="text-center">
//           <Ship className="h-14 w-14 text-orange-600 animate-pulse mx-auto" />
//           <p className="text-slate-500 mt-6">Loading...</p>
//         </div>
//       </div>
//     );
//   }

//   const navigationItems = getNavigationItems(user.role);

//   const SidebarContent = () => (
//     <div className="flex flex-col h-full bg-white">
//       <div className="p-6 border-b border-orange-100">
//         <Link href="/dashboard" className="flex items-center gap-3 group">
//           <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-600/20">
//             <Ship className="h-6 w-6 text-white" />
//           </div>
//           <div>
//             <h1 className="font-bold text-slate-800 text-lg leading-tight">
//               Port Gate
//             </h1>
//             <p className="text-xs text-orange-600 font-medium">
//               Automation System
//             </p>
//           </div>
//         </Link>
//       </div>

//       <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
//         <p className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
//           Menu
//         </p>
//         {navigationItems.map((item) => {
//           const isActive = pathname === item.href;
//           return (
//             <Link
//               key={item.name}
//               href={item.href}
//               className={cn(
//                 "group relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
//                 isActive
//                   ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-600/20"
//                   : "text-slate-600 hover:text-orange-600 hover:bg-orange-50",
//               )}
//             >
//               <item.icon
//                 className={cn(
//                   "h-5 w-5",
//                   isActive
//                     ? "text-white"
//                     : "text-slate-400 group-hover:text-orange-600",
//                 )}
//               />
//               <span className="flex-1">{item.name}</span>
//             </Link>
//           );
//         })}
//       </nav>

//       <div className="p-4 border-t border-slate-100">
//         <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-100 via-amber-50 to-transparent border border-orange-200 p-4">
//           <div className="flex items-center gap-2 mb-2">
//             <HelpCircle className="h-4 w-4 text-orange-600" />
//             <span className="text-xs font-semibold text-orange-600">
//               Need Help?
//             </span>
//           </div>
//           <p className="text-xs text-slate-500 mb-3">
//             Contact support for assistance
//           </p>
//           <Button
//             size="sm"
//             variant="outline"
//             className="w-full h-8 text-xs border-orange-200 text-orange-600 hover:bg-orange-600 hover:text-white"
//           >
//             Get Support
//           </Button>
//         </div>
//       </div>
//     </div>
//   );

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/20 to-amber-50/30">
//       <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-72 lg:border-r lg:border-slate-200/80 lg:bg-white lg:shadow-xl lg:shadow-slate-200/30">
//         <SidebarContent />
//       </aside>

//       <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
//         <SheetContent
//           side="left"
//           className="w-72 p-0 bg-white border-slate-200"
//         >
//           <SidebarContent />
//         </SheetContent>
//       </Sheet>

//       <div className="lg:pl-72">
//         <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 shadow-sm">
//           <div className="flex items-center justify-between h-16 px-4 lg:px-8">
//             <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
//               <SheetTrigger asChild className="lg:hidden">
//                 <Button
//                   variant="ghost"
//                   size="icon"
//                   className="hover:bg-orange-50"
//                 >
//                   <Menu className="h-5 w-5 text-slate-600" />
//                 </Button>
//               </SheetTrigger>
//             </Sheet>

//             <div className="hidden lg:flex items-center gap-3">
//               <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-orange-100">
//                 <LayoutDashboard className="h-5 w-5 text-orange-600" />
//               </div>
//               <div>
//                 <h2 className="text-lg font-semibold text-slate-800">
//                   Approval Console
//                 </h2>
//                 <p className="text-xs text-slate-500">
//                   Port Gate Automation System
//                 </p>
//               </div>
//             </div>

//             <div className="flex items-center gap-2">
//               <DropdownMenu>
//                 <DropdownMenuTrigger asChild>
//                   <Button
//                     variant="ghost"
//                     className="flex items-center gap-2 px-2 hover:bg-orange-50"
//                   >
//                     <Avatar className="h-9 w-9 border-2 border-orange-200">
//                       <AvatarFallback className="bg-orange-100 text-orange-600 text-sm font-bold">
//                         {user?.username?.charAt(0)?.toUpperCase() || "A"}
//                       </AvatarFallback>
//                     </Avatar>
//                     <div className="hidden md:block text-left">
//                       <p className="text-sm font-medium text-slate-800 leading-tight">
//                         {user?.username ? user.username.split("@")[0] : "User"}
//                       </p>
//                       <p className="text-xs text-slate-500">{user.role}</p>
//                     </div>
//                   </Button>
//                 </DropdownMenuTrigger>
//                 <DropdownMenuContent align="end" className="w-56">
//                   <DropdownMenuLabel>
//                     <div>
//                       <p className="font-semibold text-slate-800">
//                         {user?.username || "User"}
//                       </p>
//                       <p className="text-xs text-slate-500 font-normal">
//                         {user.role}
//                       </p>
//                     </div>
//                   </DropdownMenuLabel>
//                   <DropdownMenuSeparator />
//                   <DropdownMenuItem
//                     className="cursor-pointer"
//                     onClick={() => router.push("/forgot-password")}
//                   >
//                     <Lock className="h-4 w-4 mr-2 text-slate-500" />
//                     Forgot Password
//                   </DropdownMenuItem>
//                   <DropdownMenuSeparator />
//                   <DropdownMenuItem
//                     onClick={handleLogout}
//                     className="text-red-600 focus:text-red-600 cursor-pointer"
//                   >
//                     <LogOut className="h-4 w-4 mr-2" />
//                     Sign Out
//                   </DropdownMenuItem>
//                 </DropdownMenuContent>
//               </DropdownMenu>
//             </div>
//           </div>
//         </header>

//         {/* THIS is where your page.js gets rendered */}
//         <main className="p-4 lg:p-8 min-h-[calc(100vh-4rem)]">{children}</main>
//       </div>
//     </div>
//   );
// }

"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Ship,
  Truck,
  Briefcase,
  LogOut,
  Menu,
  HelpCircle,
  Lock,
  Building2,
  Ticket,
  ShieldCheck,
  Search,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";

const AUTH_API = process.env.NEXT_PUBLIC_AUTH_API;

export default function ApprovalAdminLayout({ children }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-slate-500 font-medium">
          Loading Layout...
        </div>
      }
    >
      <LayoutContent>{children}</LayoutContent>
    </Suspense>
  );
}

function LayoutContent({ children }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentView = searchParams.get("view") || "passes";
  const [user, setUser] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      router.push("/");
    }
  }, [router]);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (token)
        await axios.post(
          `${AUTH_API}/auth/logout`,
          {},
          { headers: { Authorization: `Bearer ${token}` } },
        );
    } finally {
      localStorage.clear();
      router.push("/");
    }
  };

  if (!user)
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 font-medium">
        Loading Layout...
      </div>
    );

  // 🚀 DYNAMIC SIDEBAR MENU BASED ON DEPARTMENT
  let navigationItems = [];
  let themeColor = "from-slate-600 to-slate-800";
  let AppIcon = ShieldCheck;

  if (user.department === "Traffic" || user.role === "Traffic Admin") {
    themeColor = "from-orange-500 to-orange-600 shadow-orange-600/20";
    AppIcon = Truck;
    navigationItems = [
      {
        name: "Pass Approvals",
        href: "/approval_admin?view=passes",
        viewMatch: "passes",
        icon: Ticket,
      },
      {
        name: "Company Approvals",
        href: "/approval_admin?view=companies",
        viewMatch: "companies",
        icon: Building2,
      },
    ];
  } else if (user.department === "Marine" || user.role === "Marine Admin") {
    themeColor = "from-teal-500 to-teal-600 shadow-teal-600/20";
    AppIcon = Ship;
    navigationItems = [
      {
        name: "Seafarer Approvals",
        href: "/approval_admin?view=passes",
        viewMatch: "passes",
        icon: Ship,
      },
    ];
  } else if (user.department === "EDP" || user.department === "Vendor Pass") {
    themeColor = "from-purple-500 to-purple-600 shadow-purple-600/20";
    AppIcon = Briefcase;
    navigationItems = [
      {
        name: "Vendor Approvals",
        href: "/approval_admin?view=passes",
        viewMatch: "passes",
        icon: Briefcase,
      },
    ];
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#0a1e4d] text-white">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div
            className={`relative flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br ${themeColor} shadow-lg`}
          >
            <AppIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white text-sm leading-tight uppercase tracking-wider">
              {user.department} Dept
            </h1>
            <p className="text-[10px] text-slate-400">Chennai Port Authority</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navigationItems.map((item) => {
          const isActive = currentView === item.viewMatch;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200",
                isActive
                  ? `bg-white/20 text-white shadow-lg`
                  : `text-slate-300 hover:text-white hover:bg-white/10`,
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5",
                  isActive
                    ? "text-white"
                    : "text-slate-400 group-hover:text-white",
                )}
              />
              <span className="flex-1">{item.name}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-white/10">
        <div className="bg-white/10 rounded-xl p-4 border border-white/5 text-center">
          <HelpCircle className="h-5 w-5 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-300 mb-3 font-medium">
            Need System Support?
          </p>
          <Button
            size="sm"
            variant="outline"
            className="w-full h-8 text-xs font-bold bg-transparent text-white border-white/20 hover:bg-white/20"
          >
            Contact IT
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-64 lg:shadow-2xl">
        <SidebarContent />
      </aside>
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="left" className="w-64 p-0 bg-[#0a1e4d] border-none">
          <SidebarContent />
        </SheetContent>
      </Sheet>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-sm h-16 flex items-center justify-between px-4 lg:px-8">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5 text-slate-600" />
              </Button>
            </SheetTrigger>
          </Sheet>

          <div className="hidden lg:flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-800">
              {user.department} Operations Hub
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search system..."
                className="w-64 pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="relative hover:bg-slate-100"
            >
              <Bell className="h-5 w-5 text-slate-600" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 px-2 hover:bg-slate-50"
                >
                  <div className="hidden md:block text-right">
                    <p className="text-sm font-bold text-slate-800">
                      {user.username.split("@")[0]}
                    </p>
                    <p className="text-[10px] uppercase font-bold text-slate-500">
                      Approver
                    </p>
                  </div>
                  <Avatar className="h-9 w-9 border-2 border-slate-200">
                    <AvatarFallback className="bg-[#0a1e4d] text-white font-bold">
                      {user.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl">
                <DropdownMenuItem
                  onClick={() => router.push("/forgot-password")}
                  className="font-medium text-slate-600"
                >
                  <Lock className="h-4 w-4 mr-2" /> Change Password
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600 font-bold focus:bg-red-50"
                >
                  <LogOut className="h-4 w-4 mr-2" /> Secure Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
