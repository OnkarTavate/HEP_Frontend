// "use client";

// import React, { useState, useEffect } from "react";
// import { useRouter } from "next/navigation";
// import axios from "axios";

// import {
//   CheckCircle,
//   Clock,
//   XCircle,
//   Users,
//   Search,
//   Building2,
//   Eye,
//   CheckCircle2,
//   ShieldAlert,
//   UserPlus,
//   X,
// } from "lucide-react";

// import { Card, CardContent, CardHeader } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";

// // ✅ Use the correct env variable (Admin API)
// const BASE_URL = process.env.NEXT_PUBLIC_ADMIN_API;

// export default function ApprovalAdminDashboard() {
//   const router = useRouter();
//   const [user, setUser] = useState(null);

//   const [requests, setRequests] = useState([]);
//   const [loading, setLoading] = useState(true);

//   const [activeTab, setActiveTab] = useState("pending");
//   const [searchQuery, setSearchQuery] = useState("");
//   const [selectedRequest, setSelectedRequest] = useState(null);
//   const [remarks, setRemarks] = useState("");

//   const [showCreateAdmin, setShowCreateAdmin] = useState(false);
//   const [formOptions, setFormOptions] = useState({
//     roles: [],
//     departments: [],
//   });

//   const [newAdmin, setNewAdmin] = useState({
//     userName: "",
//     email: "",
//     phoneNumber: "",
//     roleId: "",
//     departmentId: "",
//     password: "APPROVAL",
//     confirmPassword: "APPROVAL",
//   });
//   const [createMessage, setCreateMessage] = useState({ type: "", text: "" });

//   // Debug log to check BASE_URL
//   useEffect(() => {
//     console.log("🔥 Using Admin API Base URL:", BASE_URL);
//   }, []);

//   useEffect(() => {
//     const storedUser = localStorage.getItem("user");
//     if (storedUser) {
//       const parsedUser = JSON.parse(storedUser);
//       setUser(parsedUser);
//       fetchDashboardData(parsedUser);

//       if (parsedUser.role === "Super Admin" || parsedUser.role === "Admin") {
//         fetchFormOptions();
//       }
//     } else {
//       router.push("/");
//     }
//   }, [router]);

//   const isSuperAdmin = user?.role === "Super Admin" || user?.role === "Admin";

//   // ====================== AXIOS FUNCTIONS ======================

//   const fetchDashboardData = async (currentUser) => {
//     try {
//       const response = await axios.get(`${BASE_URL}/user/agent-users`);
//       console.log("✅ Agent Users Response:", response.data);

//       const result = response.data;
//       let filteredData = result.data || result;

//       if (currentUser.department === "Traffic") {
//         filteredData = result.data || result;
//       } else if (!isSuperAdmin) {
//         filteredData = [];
//       }

//       setRequests(filteredData);
//     } catch (error) {
//       console.error(
//         "❌ Failed to fetch requests:",
//         error.response?.data || error.message,
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchFormOptions = async () => {
//     try {
//       const [rolesRes, deptsRes] = await Promise.all([
//         axios.get(`${BASE_URL}/user/roles`),
//         axios.get(`${BASE_URL}/user/departments`),
//       ]);

//       setFormOptions({
//         roles: rolesRes.data.data || [],
//         departments: deptsRes.data.data || [],
//       });
//     } catch (error) {
//       console.error(
//         "❌ Failed to fetch form options:",
//         error.response?.data || error.message,
//       );
//     }
//   };

//   const handleDecision = async (decision) => {
//     if (decision === "rejected" && !remarks.trim()) {
//       alert("Please provide a rejection reason.");
//       return;
//     }
//     if (!window.confirm(`Are you sure you want to ${decision} this company?`))
//       return;

//     try {
//       await axios.put(`${BASE_URL}/user/agent-request`, {
//         agentId: selectedRequest.id,
//         decision,
//         rejectedReason: remarks,
//         email: selectedRequest.email,
//         entityName: selectedRequest.entityName,
//         referenceNumber: selectedRequest.referenceNumber,
//       });

//       alert(`Company successfully ${decision}.`);
//       setRequests((prev) =>
//         prev.map((req) =>
//           req.id === selectedRequest.id ? { ...req, status: decision } : req,
//         ),
//       );
//       setSelectedRequest(null);
//       setRemarks("");
//     } catch (error) {
//       alert(
//         "Action failed: " + (error.response?.data?.message || error.message),
//       );
//     }
//   };

//   const handleCreateAdmin = async (e) => {
//     e.preventDefault();
//     if (newAdmin.password !== newAdmin.confirmPassword) {
//       return setCreateMessage({
//         type: "error",
//         text: "Passwords do not match",
//       });
//     }

//     try {
//       const response = await axios.post(
//         `${BASE_URL}/user/create-user`,
//         newAdmin,
//       );
//       setCreateMessage({
//         type: "success",
//         text: "Account successfully created!",
//       });

//       setNewAdmin({
//         userName: "",
//         email: "",
//         phoneNumber: "",
//         roleId: "",
//         departmentId: "",
//         password: "APPROVAL",
//         confirmPassword: "APPROVAL",
//       });
//       setTimeout(() => setShowCreateAdmin(false), 2000);
//     } catch (error) {
//       setCreateMessage({
//         type: "error",
//         text: error.response?.data?.message || "Error creating user.",
//       });
//     }
//   };

//   // Rest of your component (no changes needed below)
//   const pendingRequests = requests.filter(
//     (r) => r.status === "pending" || !r.status,
//   );
//   const processedRequests = requests.filter(
//     (r) => r.status === "approved" || r.status === "rejected",
//   );
//   const displayData =
//     activeTab === "pending" ? pendingRequests : processedRequests;

//   if (loading || !user)
//     return (
//       <div className="p-12 text-center text-slate-500">Loading DB Data...</div>
//     );

//   return (
//     // Removed the hardcoded min-h-screen backgrounds so layout.js handles the UI frame
//     <div className="w-full">
//       {/* HEADER SECTION */}
//       <div className="mb-8 flex flex-col md:flex-row justify-between md:items-center gap-4">
//         <div>
//           <h1 className="text-3xl font-bold text-slate-900">
//             {isSuperAdmin
//               ? "Super Admin Console"
//               : `${user.department} Approval Hub`}
//           </h1>
//           <p className="text-slate-600 mt-2">
//             {isSuperAdmin
//               ? "Global management and admin creation."
//               : "Review and approve company registrations."}
//           </p>
//         </div>

//         {isSuperAdmin && (
//           <Button
//             onClick={() => setShowCreateAdmin(true)}
//             className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl h-11 px-6 shadow-md transition-all"
//           >
//             <UserPlus className="mr-2 h-5 w-5" /> Create New Account
//           </Button>
//         )}
//       </div>

//       {/* CREATE USER MODAL (Matched to your screenshot) */}
//       {isSuperAdmin && showCreateAdmin && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-800/50 backdrop-blur-sm">
//           <div className="bg-white rounded-lg shadow-xl w-full max-w-[420px] relative">
//             {/* CLOSE BUTTON */}
//             <button
//               onClick={() => setShowCreateAdmin(false)}
//               className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
//             >
//               <X className="h-6 w-6" />
//             </button>

//             <div className="p-8">
//               <h2 className="text-2xl font-serif font-bold text-slate-800 mb-6 border-b border-slate-200 pb-4">
//                 Create a new account.
//               </h2>

//               {createMessage.text && (
//                 <div
//                   className={`p-3 mb-6 rounded text-sm ${createMessage.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}
//                 >
//                   {createMessage.text}
//                 </div>
//               )}

//               <form onSubmit={handleCreateAdmin} className="space-y-4">
//                 <div>
//                   <label className="block text-sm text-slate-600 mb-1">
//                     User name
//                   </label>
//                   <input
//                     type="text"
//                     required
//                     value={newAdmin.userName}
//                     onChange={(e) =>
//                       setNewAdmin({ ...newAdmin, userName: e.target.value })
//                     }
//                     className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all text-sm"
//                   />
//                 </div>

//                 <div>
//                   <label className="block text-sm text-slate-600 mb-1">
//                     Email Id
//                   </label>
//                   <input
//                     type="email"
//                     required
//                     value={newAdmin.email}
//                     onChange={(e) =>
//                       setNewAdmin({ ...newAdmin, email: e.target.value })
//                     }
//                     className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all text-sm"
//                   />
//                 </div>

//                 <div>
//                   <label className="block text-sm text-slate-600 mb-1">
//                     Phone Number
//                   </label>
//                   <input
//                     type="text"
//                     required
//                     value={newAdmin.phoneNumber}
//                     onChange={(e) =>
//                       setNewAdmin({ ...newAdmin, phoneNumber: e.target.value })
//                     }
//                     className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all text-sm"
//                   />
//                 </div>

//                 <div>
//                   <label className="block text-sm text-slate-600 mb-1">
//                     Roles
//                   </label>
//                   <select
//                     required
//                     value={newAdmin.roleId}
//                     onChange={(e) =>
//                       setNewAdmin({ ...newAdmin, roleId: e.target.value })
//                     }
//                     className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all text-sm bg-white"
//                   >
//                     <option value="">-- Select --</option>
//                     {formOptions.roles.map((r) => (
//                       <option key={r.id} value={r.id}>
//                         {r.roleName}
//                       </option>
//                     ))}
//                   </select>
//                 </div>

//                 <div>
//                   <label className="block text-sm text-slate-600 mb-1">
//                     Department
//                   </label>
//                   <select
//                     required
//                     value={newAdmin.departmentId}
//                     onChange={(e) =>
//                       setNewAdmin({ ...newAdmin, departmentId: e.target.value })
//                     }
//                     className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all text-sm bg-white"
//                   >
//                     <option value="">-- Select --</option>
//                     {formOptions.departments.map((d) => (
//                       <option key={d.id} value={d.id}>
//                         {d.departmentName}
//                       </option>
//                     ))}
//                   </select>
//                 </div>

//                 <div>
//                   <label className="block text-sm text-slate-600 mb-1">
//                     Password
//                   </label>
//                   <input
//                     type="password"
//                     value={newAdmin.password}
//                     readOnly
//                     className="w-full px-3 py-2 border border-slate-300 rounded bg-slate-50 text-slate-500 cursor-not-allowed text-sm"
//                   />
//                 </div>

//                 <div>
//                   <label className="block text-sm text-slate-600 mb-1">
//                     Confirm password
//                   </label>
//                   <input
//                     type="password"
//                     value={newAdmin.confirmPassword}
//                     readOnly
//                     className="w-full px-3 py-2 border border-slate-300 rounded bg-slate-50 text-slate-500 cursor-not-allowed text-sm"
//                   />
//                 </div>

//                 <div className="pt-2">
//                   <button
//                     type="submit"
//                     className="bg-[#2b17ff] hover:bg-[#1a0ecc] text-white rounded px-6 py-2 text-sm font-medium transition-colors"
//                   >
//                     Register
//                   </button>
//                 </div>
//               </form>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* DYNAMIC STATS CARDS */}
//       <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
//         <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
//           <CardHeader className="pb-3">
//             <Users className="h-8 w-8 text-blue-600" />
//           </CardHeader>
//           <CardContent>
//             <p className="text-sm font-medium text-slate-500">
//               Total Companies
//             </p>
//             <p className="text-4xl font-bold text-slate-800 mt-1">
//               {requests.length}
//             </p>
//           </CardContent>
//         </Card>
//         <Card className="border-0 shadow-sm bg-amber-50 hover:shadow-md transition-shadow">
//           <CardHeader className="pb-3">
//             <Clock className="h-8 w-8 text-amber-600" />
//           </CardHeader>
//           <CardContent>
//             <p className="text-sm text-amber-800 font-semibold">
//               Pending Approval
//             </p>
//             <p className="text-4xl font-bold text-amber-600 mt-1">
//               {pendingRequests.length}
//             </p>
//           </CardContent>
//         </Card>
//         <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
//           <CardHeader className="pb-3">
//             <CheckCircle className="h-8 w-8 text-emerald-600" />
//           </CardHeader>
//           <CardContent>
//             <p className="text-sm font-medium text-slate-500">Approved</p>
//             <p className="text-4xl font-bold text-emerald-600 mt-1">
//               {requests.filter((r) => r.status === "approved").length}
//             </p>
//           </CardContent>
//         </Card>
//         <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
//           <CardHeader className="pb-3">
//             <XCircle className="h-8 w-8 text-red-500" />
//           </CardHeader>
//           <CardContent>
//             <p className="text-sm font-medium text-slate-500">Rejected</p>
//             <p className="text-4xl font-bold text-red-600 mt-1">
//               {requests.filter((r) => r.status === "rejected").length}
//             </p>
//           </CardContent>
//         </Card>
//       </div>

//       {/* DATA TABLE SECTION */}
//       <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
//         <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
//           <div className="flex bg-slate-200 p-1 rounded-lg w-full md:w-auto">
//             <button
//               onClick={() => setActiveTab("pending")}
//               className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === "pending" ? "bg-white text-orange-600 shadow-sm" : "text-slate-500"}`}
//             >
//               <Clock className="h-4 w-4" /> Pending ({pendingRequests.length})
//             </button>
//             <button
//               onClick={() => setActiveTab("processed")}
//               className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === "processed" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500"}`}
//             >
//               <CheckCircle2 className="h-4 w-4" /> Processed (
//               {processedRequests.length})
//             </button>
//           </div>
//           <div className="relative w-full md:w-72">
//             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
//             <input
//               type="text"
//               placeholder="Search records..."
//               value={searchQuery}
//               onChange={(e) => setSearchQuery(e.target.value)}
//               className="w-full pl-9 pr-4 py-2 border border-slate-200 bg-white rounded-xl text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
//             />
//           </div>
//         </div>

//         <div className="overflow-x-auto">
//           <table className="w-full text-left">
//             <thead className="bg-slate-50 border-b border-slate-200">
//               <tr>
//                 <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">
//                   Ref No
//                 </th>
//                 <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">
//                   Company Details
//                 </th>
//                 <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">
//                   Category
//                 </th>
//                 <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">
//                   {activeTab === "pending" ? "Applied On" : "Status"}
//                 </th>
//                 <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">
//                   Action
//                 </th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-100">
//               {displayData.map((req) => (
//                 <tr
//                   key={req.id}
//                   className="hover:bg-slate-50 transition-colors"
//                 >
//                   <td className="px-6 py-4 font-mono text-sm font-bold text-slate-800">
//                     {req.referenceNumber}
//                   </td>
//                   <td className="px-6 py-4">
//                     <div className="text-sm font-bold text-slate-800">
//                       {req.entityName}
//                     </div>
//                     <div className="text-xs text-slate-500 mt-0.5">
//                       {req.email} • {req.mobileNo}
//                     </div>
//                   </td>
//                   <td className="px-6 py-4">
//                     <span className="bg-orange-50 text-orange-700 px-2.5 py-1 rounded-md text-xs font-bold border border-orange-200">
//                       {req.userTypeName || "Agent"}
//                     </span>
//                   </td>
//                   <td className="px-6 py-4 text-sm text-slate-600">
//                     {activeTab === "pending" ? (
//                       new Date(req.createdAt).toLocaleDateString()
//                     ) : (
//                       <span
//                         className={`px-3 py-1 rounded-md text-xs font-bold border ${req.status === "approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}
//                       >
//                         {req.status.toUpperCase()}
//                       </span>
//                     )}
//                   </td>
//                   <td className="px-6 py-4 text-center">
//                     <button
//                       onClick={() => setSelectedRequest(req)}
//                       className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:border-orange-500 hover:text-orange-600 transition-all flex items-center gap-2 mx-auto"
//                     >
//                       <Eye className="h-4 w-4" /> Review
//                     </button>
//                   </td>
//                 </tr>
//               ))}
//               {displayData.length === 0 && (
//                 <tr>
//                   <td colSpan="5" className="py-12 text-center text-slate-500">
//                     <ShieldAlert className="h-12 w-12 mx-auto text-slate-300 mb-3" />
//                     <p className="text-lg font-medium text-slate-600">
//                       No records found
//                     </p>
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {/* COMPANY REVIEW MODAL */}
//       {selectedRequest && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
//           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
//             <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-50">
//               <h2 className="text-xl font-bold text-[#0a1e4d] flex items-center gap-2">
//                 <Building2 className="text-orange-600" /> Company Verification
//               </h2>
//               <button
//                 onClick={() => {
//                   setSelectedRequest(null);
//                   setRemarks("");
//                 }}
//                 className="text-slate-400 hover:text-red-500"
//               >
//                 <XCircle className="h-6 w-6" />
//               </button>
//             </div>
//             {/* The rest of the review modal remains untouched */}
//             <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50 space-y-6">
//               {/* ... Review Modal Content ... */}
//             </div>
//             <div className="flex justify-end gap-3 p-4 border-t border-slate-200 bg-white">
//               <button
//                 onClick={() => {
//                   setSelectedRequest(null);
//                   setRemarks("");
//                 }}
//                 className="bg-slate-800 text-white px-6 py-2.5 rounded-lg font-bold"
//               >
//                 Close
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import {
  Shield,
  History,
  Search,
  X,
  FileCheck,
  CheckCircle2,
  XCircle,
  FileText,
  Contact2,
  Globe2,
  FileBadge,
  Truck,
  Ship,
  Briefcase,
  Building2,
  Users,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const BASE_URL = process.env.NEXT_PUBLIC_ADMIN_API;

export default function ApprovalAdminDashboard() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-slate-500 font-medium">
          Loading Module...
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get("view") || "passes";

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]); // Filtered data for this specific view

  const [activeTab, setActiveTab] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      fetchDashboardData(parsedUser, view);
    } else {
      router.push("/");
    }
  }, [view]);

  // 🚀 FOOLPROOF DATA FILTERING SO DEPARTMENTS DONT SEE EACH OTHER'S DATA
  const fetchDashboardData = async (currentUser, currentView) => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/user/agent-users`);
      const allData = response.data.data || response.data;

      let filteredData = [];

      if (currentUser.department === "Traffic") {
        if (currentView === "companies") {
          // Traffic: Company Registration View
          filteredData = allData.filter(
            (req) =>
              !req.userTypeName || req.userTypeName === "Company Registration",
          );
        } else {
          // Traffic: Pass Verification View (Exclude Seafarers/Vendors)
          filteredData = allData.filter(
            (req) =>
              req.userTypeName &&
              !req.userTypeName.toLowerCase().includes("seafarer") &&
              !req.userTypeName.toLowerCase().includes("vendor"),
          );
        }
      } else if (currentUser.department === "Marine") {
        // Marine: Seafarer Passes Only
        filteredData = allData.filter(
          (req) =>
            req.userTypeName &&
            req.userTypeName.toLowerCase().includes("seafarer"),
        );
      } else if (
        currentUser.department === "EDP" ||
        currentUser.department === "Vendor Pass"
      ) {
        // EDP: Vendor Passes Only
        filteredData = allData.filter(
          (req) =>
            req.userTypeName &&
            req.userTypeName.toLowerCase().includes("vendor"),
        );
      }

      setRequests(filteredData);
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (decision) => {
    if (decision === "rejected" && !remarks.trim())
      return alert("Please provide a rejection reason.");
    if (!window.confirm(`Are you sure you want to ${decision} this request?`))
      return;

    try {
      await axios.put(`${BASE_URL}/user/agent-request`, {
        agentId: selectedRequest.id,
        decision,
        rejectedReason: remarks,
      });
      alert(`Successfully ${decision}.`);
      setRequests((prev) =>
        prev.map((req) =>
          req.id === selectedRequest.id ? { ...req, status: decision } : req,
        ),
      );
      setSelectedRequest(null);
      setRemarks("");
    } catch (error) {
      alert("Action failed. Please try again.");
    }
  };

  if (loading || !user)
    return (
      <div className="p-12 text-center text-slate-500 font-bold">
        Loading Queue...
      </div>
    );

  // ROUTE TO THE CORRECT DASHBOARD COMPONENT
  if (user.department === "Traffic" || user.role === "Traffic Admin") {
    if (view === "companies") {
      return (
        <TrafficCompanyView
          requests={requests}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedRequest={selectedRequest}
          setSelectedRequest={setSelectedRequest}
          remarks={remarks}
          setRemarks={setRemarks}
          handleDecision={handleDecision}
        />
      );
    } else {
      return (
        <TrafficPassView
          requests={requests}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedRequest={selectedRequest}
          setSelectedRequest={setSelectedRequest}
          remarks={remarks}
          setRemarks={setRemarks}
          handleDecision={handleDecision}
        />
      );
    }
  } else if (user.department === "Marine" || user.role === "Marine Admin") {
    return (
      <MarinePassView
        requests={requests}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedRequest={selectedRequest}
        setSelectedRequest={setSelectedRequest}
        remarks={remarks}
        setRemarks={setRemarks}
        handleDecision={handleDecision}
      />
    );
  } else if (user.department === "EDP" || user.department === "Vendor Pass") {
    return (
      <VendorPassView
        requests={requests}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedRequest={selectedRequest}
        setSelectedRequest={setSelectedRequest}
        remarks={remarks}
        setRemarks={setRemarks}
        handleDecision={handleDecision}
      />
    );
  }

  return (
    <div className="p-12 text-center text-red-500 font-bold">
      Unauthorized Access.
    </div>
  );
}

// ==========================================
// 1. TRAFFIC: COMPANY APPROVALS (With Cards)
// ==========================================
function TrafficCompanyView({
  requests,
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  selectedRequest,
  setSelectedRequest,
  remarks,
  setRemarks,
  handleDecision,
}) {
  const pendingReqs = requests.filter(
    (r) => r.status === "pending" || !r.status,
  );
  const processedReqs = requests.filter(
    (r) => r.status === "approved" || r.status === "rejected",
  );
  const filteredData = (
    activeTab === "pending" ? pendingReqs : processedReqs
  ).filter(
    (req) =>
      req.referenceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.entityName?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 font-sans">
      <header className="bg-white/80 backdrop-blur-lg rounded-xl p-4 flex items-center justify-between shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="bg-orange-50 p-2 rounded-xl">
            <Building2 className="h-6 w-6 text-[#ff6b00]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#0a1e4d]">
              Company Registrations
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Verify New Company Sign-Ups
            </p>
          </div>
        </div>
      </header>

      {/* STATS CARDS FOR COMPANY VIEW ONLY */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <Users className="h-8 w-8 text-blue-600" />
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium text-slate-500">
              Total Companies
            </p>
            <p className="text-4xl font-bold text-slate-800 mt-1">
              {requests.length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-orange-50">
          <CardHeader className="pb-3">
            <Clock className="h-8 w-8 text-[#ff6b00]" />
          </CardHeader>
          <CardContent>
            <p className="text-sm font-semibold text-orange-800">
              Pending Approval
            </p>
            <p className="text-4xl font-bold text-[#ff6b00] mt-1">
              {pendingReqs.length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium text-slate-500">Approved</p>
            <p className="text-4xl font-bold text-emerald-600 mt-1">
              {requests.filter((r) => r.status === "approved").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <XCircle className="h-8 w-8 text-red-500" />
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium text-slate-500">Rejected</p>
            <p className="text-4xl font-bold text-red-600 mt-1">
              {requests.filter((r) => r.status === "rejected").length}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex bg-white p-1 rounded-lg shadow-sm border border-slate-200">
          <button
            onClick={() => setActiveTab("pending")}
            className={`flex items-center gap-2 px-6 py-2 text-sm font-bold rounded-md ${activeTab === "pending" ? "bg-orange-50 text-[#ff6b00]" : "text-slate-500"}`}
          >
            <Shield className="h-4 w-4" /> Pending ({pendingReqs.length})
          </button>
          <button
            onClick={() => setActiveTab("processed")}
            className={`flex items-center gap-2 px-6 py-2 text-sm font-bold rounded-md ${activeTab === "processed" ? "bg-orange-50 text-[#ff6b00]" : "text-slate-500"}`}
          >
            <History className="h-4 w-4" /> Processed
          </button>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search Company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#ff6b00]"
          />
        </div>
      </div>

      <div className="bg-white/80 border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">
                  Req ID
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">
                  Company Details
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">
                  Type
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase text-center">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50">
              {filteredData.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 text-sm font-bold text-[#0a1e4d]">
                    {req.referenceNumber}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-slate-700">
                      {req.entityName}
                    </div>
                    <div className="text-xs text-slate-500">{req.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[11px] font-bold">
                      Company Reg.
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {activeTab === "pending" ? (
                      <button
                        onClick={() => setSelectedRequest(req)}
                        className="bg-[#0a1e4d] text-white px-5 py-2 rounded-lg text-xs font-bold"
                      >
                        Review Details
                      </button>
                    ) : (
                      <span
                        className={`px-3 py-1 rounded text-xs font-bold border ${req.status === "approved" ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200"}`}
                      >
                        {req.status.toUpperCase()}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRequest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h2 className="text-xl font-bold text-[#0a1e4d] flex items-center gap-2">
                <Building2 className="text-[#ff6b00]" /> Company Verification
              </h2>
              <button
                onClick={() => {
                  setSelectedRequest(null);
                  setRemarks("");
                }}
                className="text-slate-400 hover:text-red-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6 bg-slate-50/50">
              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                <h3 className="font-bold text-[#ff6b00] mb-4 border-b border-slate-100 pb-2 text-sm uppercase tracking-wider">
                  Company Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Request ID
                    </label>
                    <div className="bg-slate-50 border border-slate-200 rounded p-2 text-sm font-bold text-[#0a1e4d]">
                      {selectedRequest.referenceNumber}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Company
                    </label>
                    <div className="bg-slate-50 border border-slate-200 rounded p-2 text-sm font-medium">
                      {selectedRequest.entityName}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Applicant
                    </label>
                    <div className="bg-slate-50 border border-slate-200 rounded p-2 text-sm font-medium">
                      {selectedRequest.firstName} {selectedRequest.lastName}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      GSTIN
                    </label>
                    <div className="bg-slate-50 border border-slate-200 rounded p-2 text-sm font-medium">
                      {selectedRequest.gstinNumber || "N/A"}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                <h3 className="font-bold text-[#ff6b00] text-sm border-b border-slate-100 pb-2 mb-4 uppercase tracking-wider">
                  Registration Documents
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: "Entity_Proof", icon: FileText },
                    { label: "GST_Certificate", icon: Contact2 },
                    { label: "PAN_Card", icon: Globe2 },
                  ].map((doc, idx) => (
                    <a
                      key={idx}
                      href={`http://localhost:5001/${selectedRequest.entityFile}`}
                      target="_blank"
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-orange-50 group"
                    >
                      <div className="flex items-center gap-2">
                        <doc.icon className="h-4 w-4 text-slate-400 group-hover:text-[#ff6b00]" />
                        <span className="text-[11px] font-bold text-[#0a1e4d]">
                          {doc.label}.pdf
                        </span>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </a>
                  ))}
                </div>
              </div>
              {(selectedRequest.status === "pending" ||
                !selectedRequest.status) && (
                <div className="bg-orange-50 p-5 rounded-lg border border-orange-200 shadow-sm">
                  <label className="block text-xs font-bold uppercase tracking-wider mb-3 text-orange-900">
                    Remarks
                  </label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full border-none rounded-lg p-3 text-sm outline-none shadow-inner"
                    rows="2"
                    placeholder="Required if rejecting..."
                  ></textarea>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-slate-200 bg-white">
              {selectedRequest.status === "pending" ||
              !selectedRequest.status ? (
                <>
                  <button
                    onClick={() => handleDecision("rejected")}
                    className="bg-white border border-red-200 text-red-600 px-6 py-2.5 rounded-lg font-bold flex items-center gap-2"
                  >
                    <XCircle className="h-[18px] w-[18px]" /> Reject
                  </button>
                  <button
                    onClick={() => handleDecision("approved")}
                    className="bg-[#10b981] text-white px-8 py-2.5 rounded-lg font-bold flex items-center gap-2"
                  >
                    <CheckCircle2 className="h-[18px] w-[18px]" /> Approve
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setSelectedRequest(null);
                    setRemarks("");
                  }}
                  className="bg-slate-800 text-white px-6 py-2.5 rounded-lg font-bold"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 2. TRAFFIC: PASS APPROVALS (Pure Wireframe)
// ==========================================
function TrafficPassView({
  requests,
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  selectedRequest,
  setSelectedRequest,
  remarks,
  setRemarks,
  handleDecision,
}) {
  const pendingReqs = requests.filter(
    (r) => r.status === "pending" || !r.status,
  );
  const processedReqs = requests.filter(
    (r) => r.status === "approved" || r.status === "rejected",
  );
  const filteredData = (
    activeTab === "pending" ? pendingReqs : processedReqs
  ).filter(
    (req) =>
      req.referenceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.entityName?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 font-sans">
      <header className="bg-white/80 backdrop-blur-lg rounded-xl p-4 flex items-center justify-between shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="bg-orange-50 p-2 rounded-xl">
            <Truck className="h-6 w-6 text-[#ff6b00]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#0a1e4d]">
              Traffic Requests Queue
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Review and approve Traffic Department passes
            </p>
          </div>
        </div>
      </header>

      {/* NO STATS CARDS FOR PASS VIEW - EXACTLY AS WIREFRAME */}

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mt-2">
        <div className="flex bg-white p-1 rounded-lg shadow-sm border border-slate-200">
          <button
            onClick={() => setActiveTab("pending")}
            className={`flex items-center gap-2 px-6 py-2 text-sm font-bold rounded-md transition-all ${activeTab === "pending" ? "bg-orange-50 text-[#ff6b00]" : "text-slate-500"}`}
          >
            <Shield className="h-4 w-4" /> Pending ({pendingReqs.length})
          </button>
          <button
            onClick={() => setActiveTab("processed")}
            className={`flex items-center gap-2 px-6 py-2 text-sm font-bold rounded-md transition-all ${activeTab === "processed" ? "bg-orange-50 text-[#ff6b00]" : "text-slate-500"}`}
          >
            <History className="h-4 w-4" /> Processed
          </button>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search Request..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#ff6b00]"
          />
        </div>
      </div>

      <div className="bg-white/80 border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200/50 bg-white/50">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 text-xs tracking-widest uppercase">
            {activeTab === "pending" ? (
              <>
                <Shield className="h-5 w-5 text-[#ff6b00]" /> Awaiting Traffic
                Approval
              </>
            ) : (
              <>
                <History className="h-5 w-5 text-[#ff6b00]" /> Processed Traffic
                Passes
              </>
            )}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">
                  Req ID
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">
                  Company
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">
                  Pass Type
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase text-center">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50">
              {filteredData.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 text-sm font-bold text-[#0a1e4d]">
                    {req.referenceNumber}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                    {req.entityName}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[11px] font-bold">
                      {req.userTypeName || "Pass"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {activeTab === "pending" ? (
                      <button
                        onClick={() => setSelectedRequest(req)}
                        className="bg-[#0a1e4d] text-white px-5 py-2 rounded-lg text-xs font-bold"
                      >
                        Review Details
                      </button>
                    ) : (
                      <span
                        className={`px-3 py-1 rounded text-xs font-bold border ${req.status === "approved" ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200"}`}
                      >
                        {req.status.toUpperCase()}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRequest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h2 className="text-xl font-bold text-[#0a1e4d] flex items-center gap-2">
                <FileCheck className="text-[#ff6b00]" /> Application
                Verification
              </h2>
              <button
                onClick={() => {
                  setSelectedRequest(null);
                  setRemarks("");
                }}
                className="text-slate-400 hover:text-red-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6 bg-slate-50/50">
              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                <h3 className="font-bold text-[#ff6b00] mb-4 border-b border-slate-100 pb-2 text-sm uppercase tracking-wider">
                  General Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Request ID
                    </label>
                    <div className="bg-slate-50 border border-slate-200 rounded p-2 text-sm font-bold text-[#0a1e4d]">
                      {selectedRequest.referenceNumber}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Company
                    </label>
                    <div className="bg-slate-50 border border-slate-200 rounded p-2 text-sm font-medium">
                      {selectedRequest.entityName}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Applicant Name
                    </label>
                    <div className="bg-slate-50 border border-slate-200 rounded p-2 text-sm font-medium">
                      {selectedRequest.firstName} {selectedRequest.lastName}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Pass Type
                    </label>
                    <div className="bg-slate-50 border border-slate-200 rounded p-2 text-sm font-bold text-blue-700">
                      {selectedRequest.userTypeName || "Pass"}
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
                  <h3 className="font-bold text-[#0a1e4d] mb-3 border-b border-slate-100 pb-2 text-sm uppercase tracking-wider">
                    Detail of Persons
                  </h3>
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="p-2 text-[10px] font-bold text-slate-500 uppercase">
                          Name
                        </th>
                        <th className="p-2 text-[10px] font-bold text-slate-500 uppercase">
                          Proof Type
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="p-2 text-sm font-bold text-slate-800">
                          {selectedRequest.firstName} {selectedRequest.lastName}
                        </td>
                        <td className="p-2 text-sm text-slate-600">
                          Aadhar Card
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
                  <h3 className="font-bold text-[#0a1e4d] mb-3 border-b border-slate-100 pb-2 text-sm uppercase tracking-wider">
                    Detail of Vehicles
                  </h3>
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="p-2 text-[10px] font-bold text-slate-500 uppercase">
                          Reg No
                        </th>
                        <th className="p-2 text-[10px] font-bold text-slate-500 uppercase">
                          Type
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="p-2 text-sm font-bold text-slate-800 uppercase">
                          TN-01-AB-1234
                        </td>
                        <td className="p-2 text-sm text-slate-600">
                          Heavy Truck
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                <h3 className="font-bold text-[#ff6b00] text-sm border-b border-slate-100 pb-2 mb-4 uppercase tracking-wider">
                  Verification Documents
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: "Auth_Letter", icon: Contact2 },
                    { label: "RC_Books", icon: Globe2 },
                    { label: "Police_Verif", icon: FileBadge },
                  ].map((doc, idx) => (
                    <a
                      key={idx}
                      href={`http://localhost:5001/${selectedRequest.entityFile}`}
                      target="_blank"
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-orange-50 group"
                    >
                      <div className="flex items-center gap-2">
                        <doc.icon className="h-4 w-4 text-slate-400 group-hover:text-[#ff6b00]" />
                        <span className="text-[11px] font-bold text-[#0a1e4d]">
                          {doc.label}.pdf
                        </span>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </a>
                  ))}
                </div>
              </div>
              {(selectedRequest.status === "pending" ||
                !selectedRequest.status) && (
                <div className="bg-orange-50 p-5 rounded-lg border border-orange-200 shadow-sm">
                  <label className="block text-xs font-bold uppercase tracking-wider mb-3 text-orange-900">
                    Authority Remarks
                  </label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full border-none rounded-lg p-3 text-sm outline-none shadow-inner"
                    rows="2"
                    placeholder="Required if rejecting..."
                  ></textarea>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-slate-200 bg-white">
              {selectedRequest.status === "pending" ||
              !selectedRequest.status ? (
                <>
                  <button
                    onClick={() => handleDecision("rejected")}
                    className="bg-white border border-red-200 text-red-600 px-6 py-2.5 rounded-lg font-bold flex items-center gap-2"
                  >
                    <XCircle className="h-[18px] w-[18px]" /> Reject
                  </button>
                  <button
                    onClick={() => handleDecision("approved")}
                    className="bg-[#10b981] text-white px-8 py-2.5 rounded-lg font-bold flex items-center gap-2"
                  >
                    <CheckCircle2 className="h-[18px] w-[18px]" /> Approve
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setSelectedRequest(null);
                    setRemarks("");
                  }}
                  className="bg-slate-800 text-white px-6 py-2.5 rounded-lg font-bold"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 3. MARINE VIEW (Pure Wireframe)
// ==========================================
function MarineView({
  requests,
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  selectedRequest,
  setSelectedRequest,
  remarks,
  setRemarks,
  handleDecision,
}) {
  const pendingReqs = requests.filter(
    (r) => r.status === "pending" || !r.status,
  );
  const processedReqs = requests.filter(
    (r) => r.status === "approved" || r.status === "rejected",
  );
  const filteredData = (
    activeTab === "pending" ? pendingReqs : processedReqs
  ).filter(
    (req) =>
      req.referenceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.entityName?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 font-sans">
      <header className="bg-white/80 backdrop-blur-lg rounded-xl p-4 flex items-center justify-between shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="bg-teal-50 p-2 rounded-xl">
            <Ship className="h-6 w-6 text-[#0ab5c3]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#0a1e4d]">
              Seafarer Requests Queue
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Verify Marine Passes
            </p>
          </div>
        </div>
      </header>

      {/* NO STATS CARDS FOR MARINE - EXACTLY AS WIREFRAME */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mt-2">
        <div className="flex bg-white p-1 rounded-lg shadow-sm border border-slate-200">
          <button
            onClick={() => setActiveTab("pending")}
            className={`flex items-center gap-2 px-6 py-2 text-sm font-bold rounded-md transition-all ${activeTab === "pending" ? "bg-teal-50 text-[#0ab5c3]" : "text-slate-500"}`}
          >
            <Shield className="h-4 w-4" /> Pending ({pendingReqs.length})
          </button>
          <button
            onClick={() => setActiveTab("processed")}
            className={`flex items-center gap-2 px-6 py-2 text-sm font-bold rounded-md transition-all ${activeTab === "processed" ? "bg-teal-50 text-[#0ab5c3]" : "text-slate-500"}`}
          >
            <History className="h-4 w-4" /> Processed
          </button>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search Seafarer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0ab5c3]"
          />
        </div>
      </div>

      <div className="bg-white/80 border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200/50 bg-white/50">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 text-xs tracking-widest uppercase">
            {activeTab === "pending" ? (
              <>
                <Shield className="h-5 w-5 text-[#0ab5c3]" /> Awaiting Marine
                Approval
              </>
            ) : (
              <>
                <History className="h-5 w-5 text-[#0ab5c3]" /> Processed Marine
                Passes
              </>
            )}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">
                  Req ID
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">
                  Applicant / Vessel
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">
                  Pass Type
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase text-center">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50">
              {filteredData.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 text-sm font-bold text-[#0a1e4d]">
                    {req.referenceNumber}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-slate-700">
                      {req.firstName} {req.lastName}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      MV Oceanic
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-teal-50 text-teal-700 border border-teal-200 rounded text-[11px] font-bold">
                      {req.userTypeName || "Seafarer"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {activeTab === "pending" ? (
                      <button
                        onClick={() => setSelectedRequest(req)}
                        className="bg-[#0a1e4d] text-white px-5 py-2 rounded-lg text-xs font-bold"
                      >
                        Review Details
                      </button>
                    ) : (
                      <span
                        className={`px-3 py-1 rounded text-xs font-bold border ${req.status === "approved" ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200"}`}
                      >
                        {req.status.toUpperCase()}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRequest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h2 className="text-xl font-bold text-[#0a1e4d] flex items-center gap-2">
                <FileCheck className="text-[#0ab5c3]" /> Seafarer Verification
              </h2>
              <button
                onClick={() => {
                  setSelectedRequest(null);
                  setRemarks("");
                }}
                className="text-slate-400 hover:text-red-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6 bg-slate-50/50">
              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                <h3 className="font-bold text-[#0ab5c3] mb-4 border-b border-slate-100 pb-2 text-sm uppercase tracking-wider">
                  General Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Request ID
                    </label>
                    <div className="bg-slate-50 border border-slate-200 rounded p-2 text-sm font-bold text-[#0a1e4d]">
                      {selectedRequest.referenceNumber}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Vessel
                    </label>
                    <div className="bg-slate-50 border border-slate-200 rounded p-2 text-sm font-medium">
                      MV Oceanic
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Applicant Name
                    </label>
                    <div className="bg-slate-50 border border-slate-200 rounded p-2 text-sm font-medium">
                      {selectedRequest.firstName} {selectedRequest.lastName}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Pass Type
                    </label>
                    <div className="bg-slate-50 border border-slate-200 rounded p-2 text-sm font-bold text-teal-700">
                      {selectedRequest.userTypeName || "Seafarer"}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
                <h3 className="font-bold text-[#0a1e4d] mb-3 border-b border-slate-100 pb-2 text-sm uppercase tracking-wider">
                  Seafarer Details
                </h3>
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="p-2 text-[10px] font-bold text-slate-500 uppercase">
                        Name
                      </th>
                      <th className="p-2 text-[10px] font-bold text-slate-500 uppercase">
                        CDC Details
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="p-2 text-sm font-bold text-slate-800">
                        {selectedRequest.firstName} {selectedRequest.lastName}
                      </td>
                      <td className="p-2 text-sm text-slate-600">
                        CDC: IND-987654
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                <h3 className="font-bold text-[#0ab5c3] text-sm border-b border-slate-100 pb-2 mb-4 uppercase tracking-wider">
                  Verification Documents
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: "CDC_Document", icon: Contact2 },
                    { label: "Passport", icon: Globe2 },
                    { label: "Agent_Letter", icon: FileBadge },
                  ].map((doc, idx) => (
                    <a
                      key={idx}
                      href={`http://localhost:5001/${selectedRequest.entityFile}`}
                      target="_blank"
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-teal-50 group"
                    >
                      <div className="flex items-center gap-2">
                        <doc.icon className="h-4 w-4 text-slate-400 group-hover:text-[#0ab5c3]" />
                        <span className="text-[11px] font-bold text-[#0a1e4d]">
                          {doc.label}.pdf
                        </span>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </a>
                  ))}
                </div>
              </div>
              {(selectedRequest.status === "pending" ||
                !selectedRequest.status) && (
                <div className="bg-teal-50 p-5 rounded-lg border border-teal-200 shadow-sm">
                  <label className="block text-xs font-bold uppercase tracking-wider mb-3 text-teal-900">
                    Authority Remarks
                  </label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full border-none rounded-lg p-3 text-sm outline-none shadow-inner"
                    rows="2"
                  ></textarea>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-slate-200 bg-white">
              {selectedRequest.status === "pending" ||
              !selectedRequest.status ? (
                <>
                  <button
                    onClick={() => handleDecision("rejected")}
                    className="bg-white border border-red-200 text-red-600 px-6 py-2.5 rounded-lg font-bold flex items-center gap-2"
                  >
                    <XCircle className="h-[18px] w-[18px]" /> Reject
                  </button>
                  <button
                    onClick={() => handleDecision("approved")}
                    className="bg-[#10b981] text-white px-8 py-2.5 rounded-lg font-bold flex items-center gap-2"
                  >
                    <CheckCircle2 className="h-[18px] w-[18px]" /> Approve
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setSelectedRequest(null);
                    setRemarks("");
                  }}
                  className="bg-slate-800 text-white px-6 py-2.5 rounded-lg font-bold"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 4. VENDOR VIEW (Pure Wireframe - Purple)
// ==========================================
function VendorView({
  requests,
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  selectedRequest,
  setSelectedRequest,
  remarks,
  setRemarks,
  handleDecision,
}) {
  const pendingReqs = requests.filter(
    (r) => r.status === "pending" || !r.status,
  );
  const processedReqs = requests.filter(
    (r) => r.status === "approved" || r.status === "rejected",
  );
  const filteredData = (
    activeTab === "pending" ? pendingReqs : processedReqs
  ).filter(
    (req) =>
      req.referenceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.entityName?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 font-sans">
      <header className="bg-white/80 backdrop-blur-lg rounded-xl p-4 flex items-center justify-between shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="bg-purple-50 p-2 rounded-xl">
            <Briefcase className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#0a1e4d]">
              Vendor Pass Queue
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Verify Vendor/Contractor Passes
            </p>
          </div>
        </div>
      </header>

      {/* NO STATS CARDS FOR VENDOR - EXACTLY AS WIREFRAME */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mt-2">
        <div className="flex bg-white p-1 rounded-lg shadow-sm border border-slate-200">
          <button
            onClick={() => setActiveTab("pending")}
            className={`flex items-center gap-2 px-6 py-2 text-sm font-bold rounded-md transition-all ${activeTab === "pending" ? "bg-purple-50 text-purple-600" : "text-slate-500"}`}
          >
            <Shield className="h-4 w-4" /> Pending ({pendingReqs.length})
          </button>
          <button
            onClick={() => setActiveTab("processed")}
            className={`flex items-center gap-2 px-6 py-2 text-sm font-bold rounded-md transition-all ${activeTab === "processed" ? "bg-purple-50 text-purple-600" : "text-slate-500"}`}
          >
            <History className="h-4 w-4" /> Processed
          </button>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search Vendor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-purple-600"
          />
        </div>
      </div>

      <div className="bg-white/80 border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200/50 bg-white/50">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 text-xs tracking-widest uppercase">
            {activeTab === "pending" ? (
              <>
                <Shield className="h-5 w-5 text-purple-600" /> Awaiting Vendor
                Approval
              </>
            ) : (
              <>
                <History className="h-5 w-5 text-purple-600" /> Processed Passes
              </>
            )}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">
                  Req ID
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">
                  Vendor Company
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">
                  Pass Type
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase text-center">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50">
              {filteredData.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 text-sm font-bold text-[#0a1e4d]">
                    {req.referenceNumber}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                    {req.entityName}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 border border-purple-200 rounded text-[11px] font-bold">
                      {req.userTypeName || "Vendor"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {activeTab === "pending" ? (
                      <button
                        onClick={() => setSelectedRequest(req)}
                        className="bg-[#0a1e4d] text-white px-5 py-2 rounded-lg text-xs font-bold"
                      >
                        Review Details
                      </button>
                    ) : (
                      <span
                        className={`px-3 py-1 rounded text-xs font-bold border ${req.status === "approved" ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200"}`}
                      >
                        {req.status.toUpperCase()}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRequest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h2 className="text-xl font-bold text-[#0a1e4d] flex items-center gap-2">
                <FileCheck className="text-purple-600" /> Vendor Pass
                Verification
              </h2>
              <button
                onClick={() => {
                  setSelectedRequest(null);
                  setRemarks("");
                }}
                className="text-slate-400 hover:text-red-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6 bg-slate-50/50">
              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                <h3 className="font-bold text-purple-600 mb-4 border-b border-slate-100 pb-2 text-sm uppercase tracking-wider">
                  General Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Request ID
                    </label>
                    <div className="bg-slate-50 border border-slate-200 rounded p-2 text-sm font-bold text-[#0a1e4d]">
                      {selectedRequest.referenceNumber}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Vendor Company
                    </label>
                    <div className="bg-slate-50 border border-slate-200 rounded p-2 text-sm font-medium">
                      {selectedRequest.entityName}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Applicant Name
                    </label>
                    <div className="bg-slate-50 border border-slate-200 rounded p-2 text-sm font-medium">
                      {selectedRequest.firstName} {selectedRequest.lastName}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Pass Type
                    </label>
                    <div className="bg-slate-50 border border-slate-200 rounded p-2 text-sm font-bold text-purple-700">
                      {selectedRequest.userTypeName || "Vendor"}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
                <h3 className="font-bold text-[#0a1e4d] mb-3 border-b border-slate-100 pb-2 text-sm uppercase tracking-wider">
                  Vendor Personnel Details
                </h3>
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="p-2 text-[10px] font-bold text-slate-500 uppercase">
                        Name
                      </th>
                      <th className="p-2 text-[10px] font-bold text-slate-500 uppercase">
                        Work Order Ref
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="p-2 text-sm font-bold text-slate-800">
                        {selectedRequest.firstName} {selectedRequest.lastName}
                      </td>
                      <td className="p-2 text-sm text-slate-600">
                        WO-2026-9901
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                <h3 className="font-bold text-purple-600 text-sm border-b border-slate-100 pb-2 mb-4 uppercase tracking-wider">
                  Verification Documents
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: "Work_Order", icon: FileText },
                    { label: "Vendor_ID", icon: Contact2 },
                    { label: "Authorization", icon: FileBadge },
                  ].map((doc, idx) => (
                    <a
                      key={idx}
                      href={`http://localhost:5001/${selectedRequest.entityFile}`}
                      target="_blank"
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-purple-50 group"
                    >
                      <div className="flex items-center gap-2">
                        <doc.icon className="h-4 w-4 text-slate-400 group-hover:text-purple-600" />
                        <span className="text-[11px] font-bold text-[#0a1e4d]">
                          {doc.label}.pdf
                        </span>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </a>
                  ))}
                </div>
              </div>
              {(selectedRequest.status === "pending" ||
                !selectedRequest.status) && (
                <div className="bg-purple-50 p-5 rounded-lg border border-purple-200 shadow-sm">
                  <label className="block text-xs font-bold uppercase tracking-wider mb-3 text-purple-900">
                    Authority Remarks
                  </label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full border-none rounded-lg p-3 text-sm outline-none shadow-inner"
                    rows="2"
                  ></textarea>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-slate-200 bg-white">
              {selectedRequest.status === "pending" ||
              !selectedRequest.status ? (
                <>
                  <button
                    onClick={() => handleDecision("rejected")}
                    className="bg-white border border-red-200 text-red-600 px-6 py-2.5 rounded-lg font-bold flex items-center gap-2"
                  >
                    <XCircle className="h-[18px] w-[18px]" /> Reject
                  </button>
                  <button
                    onClick={() => handleDecision("approved")}
                    className="bg-[#10b981] text-white px-8 py-2.5 rounded-lg font-bold flex items-center gap-2"
                  >
                    <CheckCircle2 className="h-[18px] w-[18px]" /> Approve
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setSelectedRequest(null);
                    setRemarks("");
                  }}
                  className="bg-slate-800 text-white px-6 py-2.5 rounded-lg font-bold"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
