"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  CheckCircle2,
  Clock,
  XCircle,
  Users,
  Search,
  ShieldAlert,
  UserPlus,
  X,
  Shield,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const BASE_URL = process.env.NEXT_PUBLIC_ADMIN_API;

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [formOptions, setFormOptions] = useState({
    roles: [],
    departments: [],
  });
  const [newAdmin, setNewAdmin] = useState({
    userName: "",
    email: "",
    phoneNumber: "",
    roleId: "",
    departmentId: "",
    password: "APPROVAL",
    confirmPassword: "APPROVAL",
  });
  const [createMessage, setCreateMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      // Ensure only Admins can access this page
      const userRole = (parsedUser.role || "").toLowerCase();
      if (userRole !== "admin" && userRole !== "administrator") {
        router.push("/");
        return;
      }
      setUser(parsedUser);
      fetchDashboardData();
      fetchFormOptions();
    } else {
      router.push("/");
    }
  }, [router]);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/user/agent-users`);
      setRequests(response.data.data || response.data);
    } catch (error) {
      console.error("Failed to fetch requests", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFormOptions = async () => {
    try {
      const [rolesRes, deptsRes] = await Promise.all([
        axios.get(`${BASE_URL}/user/roles`),
        axios.get(`${BASE_URL}/user/departments`),
      ]);
      setFormOptions({
        roles: rolesRes.data.data || [],
        departments: deptsRes.data.data || [],
      });
    } catch (error) {
      console.error("Failed to fetch form options", error);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (newAdmin.password !== newAdmin.confirmPassword) {
      return setCreateMessage({
        type: "error",
        text: "Passwords do not match",
      });
    }

    try {
      await axios.post(`${BASE_URL}/user/create-user`, newAdmin);
      setCreateMessage({
        type: "success",
        text: "Account successfully created!",
      });

      // Reset form
      setNewAdmin({
        userName: "",
        email: "",
        phoneNumber: "",
        roleId: "",
        departmentId: "",
        password: "APPROVAL",
        confirmPassword: "APPROVAL",
      });

      // Refresh the table to show new changes
      fetchDashboardData();

      // Close modal after 2 seconds
      setTimeout(() => setShowCreateAdmin(false), 2000);
    } catch (error) {
      setCreateMessage({
        type: "error",
        text: error.response?.data?.message || "Error creating user.",
      });
    }
  };

  if (loading || !user)
    return (
      <div className="p-12 text-center text-slate-500 font-medium">
        Loading Admin Console...
      </div>
    );

  const pendingCount = requests.filter(
    (r) => r.status === "pending" || !r.status,
  ).length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const rejectedCount = requests.filter((r) => r.status === "rejected").length;

  const filteredData = requests.filter(
    (req) =>
      req.referenceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.entityName?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 font-sans">
      {/* HEADER & CREATE BUTTON */}
      <header className="bg-white/80 backdrop-blur-lg rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between shadow-sm border border-slate-200 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#0a1e4d]">
            Global Admin Console
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage system configurations and personnel.
          </p>
        </div>
        <Button
          onClick={() => setShowCreateAdmin(true)}
          className="bg-[#2b17ff] hover:bg-[#1a0ecc] text-white rounded-lg h-11 px-6 shadow-md transition-all"
        >
          <UserPlus className="mr-2 h-4 w-4" /> Create New Account
        </Button>
      </header>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">
                Total Companies
              </p>
              <h3 className="text-3xl font-bold text-[#0a1e4d]">
                {requests.length}
              </h3>
            </div>
            <div className="h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">
                Pending Passes
              </p>
              <h3 className="text-3xl font-bold text-amber-600">
                {pendingCount}
              </h3>
            </div>
            <div className="h-12 w-12 bg-amber-50 rounded-full flex items-center justify-center">
              <Clock className="h-6 w-6 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">
                Approved
              </p>
              <h3 className="text-3xl font-bold text-emerald-600">
                {approvedCount}
              </h3>
            </div>
            <div className="h-12 w-12 bg-emerald-50 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">
                Rejected
              </p>
              <h3 className="text-3xl font-bold text-red-600">
                {rejectedCount}
              </h3>
            </div>
            <div className="h-12 w-12 bg-red-50 rounded-full flex items-center justify-center">
              <XCircle className="h-6 w-6 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* OVERVIEW TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="flex flex-col md:flex-row items-center justify-between border-b border-slate-100 bg-slate-50/50 p-4 gap-4">
          <h3 className="font-bold text-slate-900 uppercase text-xs tracking-widest pl-2 flex items-center gap-2">
            <Shield className="h-4 w-4" /> System Pass Overview
          </h3>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search Global Data..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#2b17ff] focus:ring-1 focus:ring-[#2b17ff]"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Ref No
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Company / Agent
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredData.map((req) => (
                <tr
                  key={req.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm font-bold text-[#0a1e4d]">
                    {req.referenceNumber}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-slate-800">
                      {req.entityName}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {req.email}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[11px] font-bold border border-blue-200">
                      {req.userTypeName || "Agent"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <span
                      className={`px-3 py-1 rounded-full text-[11px] font-bold border ${req.status === "approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : req.status === "rejected" ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}
                    >
                      {(req.status || "pending").toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan="4" className="py-16 text-center text-slate-500">
                    <ShieldAlert className="h-10 w-10 mx-auto text-slate-200 mb-3" />
                    <p className="text-sm font-medium">No records found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE NEW ACCOUNT MODAL */}
      {showCreateAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-[420px] relative overflow-hidden">
            <button
              onClick={() => setShowCreateAdmin(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="p-8">
              <h2 className="text-2xl font-serif font-bold text-slate-800 mb-6 border-b border-slate-200 pb-4">
                Create a new account.
              </h2>

              {createMessage.text && (
                <div
                  className={`p-3 mb-4 rounded-lg text-sm font-medium ${createMessage.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}
                >
                  {createMessage.text}
                </div>
              )}

              <form onSubmit={handleCreateAdmin} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-600 mb-1 font-medium">
                    User name
                  </label>
                  <input
                    type="text"
                    required
                    value={newAdmin.userName}
                    onChange={(e) =>
                      setNewAdmin({ ...newAdmin, userName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#2b17ff] focus:border-[#2b17ff] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1 font-medium">
                    Email Id
                  </label>
                  <input
                    type="email"
                    required
                    value={newAdmin.email}
                    onChange={(e) =>
                      setNewAdmin({ ...newAdmin, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#2b17ff] focus:border-[#2b17ff] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1 font-medium">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    required
                    value={newAdmin.phoneNumber}
                    onChange={(e) =>
                      setNewAdmin({ ...newAdmin, phoneNumber: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#2b17ff] focus:border-[#2b17ff] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1 font-medium">
                    Roles
                  </label>
                  <select
                    required
                    value={newAdmin.roleId}
                    onChange={(e) =>
                      setNewAdmin({ ...newAdmin, roleId: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#2b17ff] focus:border-[#2b17ff] text-sm bg-white"
                  >
                    <option value="">-- Select --</option>
                    {formOptions.roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.roleName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1 font-medium">
                    Department
                  </label>
                  <select
                    required
                    value={newAdmin.departmentId}
                    onChange={(e) =>
                      setNewAdmin({ ...newAdmin, departmentId: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#2b17ff] focus:border-[#2b17ff] text-sm bg-white"
                  >
                    <option value="">-- Select --</option>
                    {formOptions.departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.departmentName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1 font-medium">
                    Password
                  </label>
                  <input
                    type="password"
                    value={newAdmin.password}
                    readOnly
                    className="w-full px-3 py-2 border border-slate-300 rounded bg-slate-50 text-slate-500 text-sm cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1 font-medium">
                    Confirm password
                  </label>
                  <input
                    type="password"
                    value={newAdmin.confirmPassword}
                    readOnly
                    className="w-full px-3 py-2 border border-slate-300 rounded bg-slate-50 text-slate-500 text-sm cursor-not-allowed"
                  />
                </div>
                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full bg-[#2b17ff] hover:bg-[#1a0ecc] text-white rounded-lg px-6 py-2.5 text-sm font-bold shadow-md transition-all"
                  >
                    Register User
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
