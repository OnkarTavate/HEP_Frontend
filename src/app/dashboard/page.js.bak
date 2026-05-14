"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Wallet,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
  Users,
  Truck,
  Calendar,
  Ship,
  ChevronRight,
  Sparkles,
  Plus,
  Bell,
  LogOut,
  AlertTriangle,
  ShieldAlert,
  Ban,
  DollarSign,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Mock Data
const mockStats = {
  walletBalance: 45250,
  activePasses: 89,
  pendingApprovals: 23,
  expiringSoon: 12,
};

// Mock User Status Data (In production, fetch from API)
const mockUserStatus = {
  isBlacklisted: true, // Set to true to show blacklist card
  blacklistReason: "Multiple violations of port security protocols",
  blacklistDate: "2024-03-10",
  hasPenalties: true, // Set to true to show penalty card
  totalPenalties: 3,
  totalPenaltyAmount: 15000,
  penalties: [
    { reason: "Unauthorized parking in restricted zone", amount: 5000, date: "2024-03-05" },
    { reason: "Late pass renewal", amount: 2000, date: "2024-02-28" },
    { reason: "Vehicle speed violation", amount: 8000, date: "2024-02-15" },
  ],
};

const recentPasses = [
  {
    id: "MH04AB1234",
    passId: "PASS-2024-001",
    type: "Vehicle",
    name: "MH04AB1234",
    validUntil: "2024-04-15",
    status: "active",
  },
  {
    id: "Raj Kumar",
    passId: "PASS-2024-002",
    type: "Personnel",
    name: "Raj Kumar",
    validUntil: "2024-03-20",
    status: "pending",
  },
  {
    id: "Amit Shah",
    passId: "PASS-2024-003",
    type: "Personnel",
    name: "Amit Shah",
    validUntil: "2024-05-01",
    status: "active",
  },
];

const recentTransactions = [
  {
    type: "credit",
    amount: 10000,
    description: "Wallet Top-up",
    date: "2024-03-15",
  },
  {
    type: "debit",
    amount: 1500,
    description: "Vehicle Pass - MH04AB1234",
    date: "2024-03-14",
  },
  {
    type: "debit",
    amount: 750,
    description: "Personnel Pass - Raj Kumar",
    date: "2024-03-13",
  },
  {
    type: "debit",
    amount: 2000,
    description: "Monthly Pass Renewal",
    date: "2024-03-12",
  },
];

const passActivityData = [
  { month: "Jan", passes: 45 },
  { month: "Feb", passes: 52 },
  { month: "Mar", passes: 48 },
  { month: "Apr", passes: 61 },
  { month: "May", passes: 55 },
  { month: "Jun", passes: 67 },
];

const passTypeData = [
  { name: "Vehicle", value: 45, color: "#ff7300" },
  { name: "Personnel", value: 35, color: "#3b82f6" },
  { name: "Driver", value: 20, color: "#8b5cf6" },
];

const getStatusColor = (status) => {
  if (status === "active")
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (status === "pending")
    return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-red-100 text-red-700 border-red-200";
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      router.push("/");
    }
  }, [router]);

  const username = user?.username?.split("@")[0] || "Applicant";

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30 p-4 md:p-6 lg:p-8" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Welcome Section */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-white px-5 py-2 rounded-full text-base font-medium text-orange-600 mb-3 shadow-sm border border-orange-100">
              <Sparkles className="h-5 w-5" />
              Good Morning
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 mb-2">
              Welcome back, <span className="text-orange-600">{username}</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl">
              Here's what's happening with your port passes today.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="rounded-xl h-12 px-5 text-base font-medium border-2">
              <Calendar className="mr-2 h-5 w-5" />
              Last 30 Days
            </Button>
            <Button
              onClick={() => router.push("/dashboard/pass_request")}
              className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl h-12 px-6 text-base font-semibold shadow-lg"
            >
              <Plus className="mr-2 h-5 w-5" />
              Apply New Pass
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        {/* Wallet Balance */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-600 to-orange-500 text-white overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Wallet className="h-10 w-10" />
              <Badge className="bg-white/20 text-white border-0 text-sm font-semibold px-3 py-1">
                +12%
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-orange-100 text-base md:text-lg font-medium mb-1">Wallet Balance</p>
            <p className="text-3xl md:text-4xl font-bold">
              {formatCurrency(mockStats.walletBalance)}
            </p>
          </CardContent>
        </Card>

        {/* Active Passes */}
        <Card className="border-0 shadow-lg bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CheckCircle className="h-10 w-10 text-emerald-600" />
              <Badge variant="secondary" className="text-sm font-semibold px-3 py-1">57%</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-base md:text-lg text-gray-600 font-medium mb-1">Active Passes</p>
            <p className="text-3xl md:text-4xl font-bold text-gray-900">{mockStats.activePasses}</p>
            <Progress value={57} className="mt-4 h-2.5" />
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card className="border-0 shadow-lg bg-white">
          <CardHeader className="pb-3">
            <Clock className="h-10 w-10 text-amber-600" />
          </CardHeader>
          <CardContent>
            <p className="text-base md:text-lg text-gray-600 font-medium mb-1">Pending Approvals</p>
            <p className="text-3xl md:text-4xl font-bold text-gray-900">
              {mockStats.pendingApprovals}
            </p>
            <p className="text-sm md:text-base text-amber-600 font-medium mt-2">Requires attention</p>
          </CardContent>
        </Card>

        {/* Expiring Soon */}
        <Card className="border-0 shadow-lg bg-white">
          <CardHeader className="pb-3">
            <XCircle className="h-10 w-10 text-red-500" />
          </CardHeader>
          <CardContent>
            <p className="text-base md:text-lg text-gray-600 font-medium mb-1">Expiring Soon</p>
            <p className="text-3xl md:text-4xl font-bold text-red-600">
              {mockStats.expiringSoon}
            </p>
            <p className="text-sm md:text-base text-red-500 font-medium mt-2">Within 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Alert Cards - Blacklist & Penalties (Compact) */}
      {(mockUserStatus.isBlacklisted || mockUserStatus.hasPenalties) && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          {/* Blacklist Alert Card - Compact */}
          {mockUserStatus.isBlacklisted && (
            <Card className="border-2 border-red-400 shadow-lg bg-white overflow-hidden lg:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                    <Ban className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg md:text-xl text-red-900 font-bold truncate">
                        Account Blacklisted
                      </CardTitle>
                      <Badge className="bg-red-600 text-white border-0 text-xs font-bold px-2 py-0.5 flex-shrink-0">
                        RESTRICTED
                      </Badge>
                    </div>
                    <CardDescription className="text-red-700 text-sm md:text-base font-medium">
                      Security violation detected
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                  <p className="text-red-800 text-sm md:text-base leading-relaxed line-clamp-2">
                    {mockUserStatus.blacklistReason}
                  </p>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-red-700 font-medium text-sm">
                    Date: {mockUserStatus.blacklistDate}
                  </span>
                  <Button 
                    size="sm"
                    variant="outline" 
                    className="border-2 border-red-500 text-red-700 hover:bg-red-500 hover:text-white text-sm font-semibold h-9 px-4"
                  >
                    Contact Support
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Penalty Alert Card - Compact */}
          {mockUserStatus.hasPenalties && (
            <Card className="border-2 border-amber-400 shadow-lg bg-white overflow-hidden lg:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-amber-500 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                    <ShieldAlert className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg md:text-xl text-amber-900 font-bold truncate">
                        Pending Penalties
                      </CardTitle>
                      <Badge className="bg-amber-600 text-white border-0 text-xs font-bold px-2 py-0.5 flex-shrink-0">
                        {mockUserStatus.totalPenalties} VIOLATIONS
                      </Badge>
                    </div>
                    <CardDescription className="text-amber-700 text-sm md:text-base font-medium">
                      Outstanding payments required
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-amber-900 font-bold text-sm">Total Due:</span>
                    <span className="text-2xl font-bold text-amber-600">
                      {formatCurrency(mockUserStatus.totalPenaltyAmount)}
                    </span>
                  </div>
                  <p className="text-amber-700 text-sm line-clamp-1">
                    {mockUserStatus.penalties[0].reason}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm"
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold h-9"
                  >
                    <DollarSign className="mr-1 h-4 w-4" />
                    Pay Now
                  </Button>
                  <Button 
                    size="sm"
                    variant="outline" 
                    className="flex-1 border-2 border-amber-500 text-amber-700 hover:bg-amber-50 text-sm font-semibold h-9"
                  >
                    Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Pass Activity Trend */}
        <Card className="shadow-lg border-0 bg-white">
          <CardHeader>
            <CardTitle className="text-xl md:text-2xl font-bold">Pass Activity Trend</CardTitle>
            <CardDescription className="text-base md:text-lg">
              Monthly pass applications over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={passActivityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#64748b" style={{ fontSize: '14px', fontFamily: 'Arial, sans-serif' }} />
                <YAxis stroke="#64748b" style={{ fontSize: '14px', fontFamily: 'Arial, sans-serif' }} />
                <Tooltip contentStyle={{ fontFamily: 'Arial, sans-serif', fontSize: '14px' }} />
                <Area
                  type="monotone"
                  dataKey="passes"
                  stroke="#ff7300"
                  fill="#ff7300"
                  fillOpacity={0.25}
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pass Type Distribution */}
        <Card className="shadow-lg border-0 bg-white">
          <CardHeader>
            <CardTitle className="text-xl md:text-2xl font-bold">Pass Type Distribution</CardTitle>
            <CardDescription className="text-base md:text-lg">Breakdown by category</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={passTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={75}
                  outerRadius={110}
                  paddingAngle={6}
                  dataKey="value"
                >
                  {passTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontFamily: 'Arial, sans-serif', fontSize: '14px' }} />
              </PieChart>
            </ResponsiveContainer>

            <div className="grid grid-cols-3 gap-6 mt-6 w-full">
              {passTypeData.map((item, i) => (
                <div key={i} className="text-center">
                  <div className="flex justify-center mb-2">
                    <div
                      className="w-5 h-5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                  </div>
                  <p className="font-bold text-xl md:text-2xl">{item.value}</p>
                  <p className="text-base md:text-lg text-gray-600 font-medium">{item.name}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Passes & Transactions */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Pass Applications */}
        <Card className="shadow-lg border-0 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-xl md:text-2xl font-bold">Recent Pass Applications</CardTitle>
              <CardDescription className="text-base md:text-lg">
                Your latest pass requests and their status
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 text-base font-semibold"
            >
              View All <ChevronRight className="ml-1 h-5 w-5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentPasses.map((pass, i) => (
              <div
                key={i}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-gray-50 border-2 border-gray-100 rounded-xl hover:border-orange-200 hover:bg-orange-50/30 transition-all gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-200">
                    {pass.type === "Vehicle" ? (
                      <Truck className="h-7 w-7 text-orange-600" />
                    ) : (
                      <Users className="h-7 w-7 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-base md:text-lg">{pass.name}</p>
                    <p className="text-base text-gray-600 font-medium">
                      {pass.passId} • {pass.type} Pass
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right w-full sm:w-auto">
                  <Badge className={`${getStatusColor(pass.status)} border text-sm font-bold px-3 py-1`}>
                    {pass.status.toUpperCase()}
                  </Badge>
                  <p className="text-sm md:text-base text-gray-600 font-medium mt-2">
                    Valid until {pass.validUntil}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Transactions */}
        <Card className="shadow-lg border-0 bg-white">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl md:text-2xl font-bold">Transactions</CardTitle>
            <CardDescription className="text-base md:text-lg">Your recent wallet activity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentTransactions.map((tx, i) => (
              <div
                key={i}
                className="flex justify-between items-center p-5 bg-gray-50 border-2 border-gray-100 rounded-xl hover:bg-gray-100/50 transition-all"
              >
                <div>
                  <p className="font-bold text-base md:text-lg text-gray-900">{tx.description}</p>
                  <p className="text-base text-gray-600 font-medium mt-1">{tx.date}</p>
                </div>
                <p
                  className={`font-bold text-xl md:text-2xl ${
                    tx.type === "credit" ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {tx.type === "credit" ? "+" : "-"}
                  {formatCurrency(tx.amount)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
