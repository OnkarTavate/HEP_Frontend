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
    <div className="min-h-screen bg-[#fffaf5] p-6 lg:p-8">
      {/* Welcome Section */}
      <div className="mb-10">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-white px-4 py-1.5 rounded-full text-sm text-orange-600 mb-4">
              <Sparkles className="h-4 w-4" />
              Good Morning
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-gray-900">
              Welcome back, <span className="text-orange-600">{username}</span>
            </h1>
            <p className="text-lg text-gray-600 mt-3 max-w-md">
              Here's what's happening with your port passes today.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="rounded-2xl h-11">
              <Calendar className="mr-2 h-4 w-4" />
              Last 30 Days
            </Button>
            <Button
              onClick={() => router.push("/dashboard/pass_request")} // <-- UPDATED PATH
              className="bg-orange-600 hover:bg-orange-700 text-white rounded-2xl h-11 shadow-md"
            >
              <Plus className="mr-2 h-4 w-4" />
              Apply New Pass
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {/* Wallet Balance */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-600 to-orange-500 text-white overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Wallet className="h-9 w-9" />
              <Badge className="bg-white/20 text-white border-0">
                +12% this month
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-orange-100 text-sm">Wallet Balance</p>
            <p className="text-4xl font-bold mt-2">
              {formatCurrency(mockStats.walletBalance)}
            </p>
          </CardContent>
        </Card>

        {/* Active Passes */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CheckCircle className="h-9 w-9 text-emerald-600" />
              <Badge variant="secondary">57% of total</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Active Passes</p>
            <p className="text-4xl font-bold mt-1">{mockStats.activePasses}</p>
            <Progress value={57} className="mt-4 h-2" />
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <Clock className="h-9 w-9 text-amber-600" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Pending Approvals</p>
            <p className="text-4xl font-bold mt-1">
              {mockStats.pendingApprovals}
            </p>
            <p className="text-xs text-amber-600 mt-2">Requires attention</p>
          </CardContent>
        </Card>

        {/* Expiring Soon */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <XCircle className="h-9 w-9 text-red-500" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Expiring Soon</p>
            <p className="text-4xl font-bold text-red-600 mt-1">
              {mockStats.expiringSoon}
            </p>
            <p className="text-xs text-red-500 mt-1">Within 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6 mb-10">
        {/* Pass Activity Trend */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Pass Activity Trend</CardTitle>
            <CardDescription>
              Monthly pass applications over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={passActivityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
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
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Pass Type Distribution</CardTitle>
            <CardDescription>Breakdown by category</CardDescription>
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
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>

            <div className="grid grid-cols-3 gap-8 mt-6 w-full">
              {passTypeData.map((item, i) => (
                <div key={i} className="text-center">
                  <div className="flex justify-center mb-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                  </div>
                  <p className="font-semibold text-lg">{item.value}</p>
                  <p className="text-sm text-gray-500">{item.name}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Passes & Transactions */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Pass Applications */}
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Pass Applications</CardTitle>
              <CardDescription>
                Your latest pass requests and their status
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              className="text-orange-600 hover:text-orange-700"
            >
              View All <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentPasses.map((pass, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-5 bg-white border border-gray-100 rounded-2xl hover:border-orange-200 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center">
                    {pass.type === "Vehicle" ? (
                      <Truck className="h-6 w-6 text-orange-600" />
                    ) : (
                      <Users className="h-6 w-6 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{pass.name}</p>
                    <p className="text-sm text-gray-500">
                      {pass.passId} • {pass.type} Pass
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <Badge className={`${getStatusColor(pass.status)} border`}>
                    {pass.status.toUpperCase()}
                  </Badge>
                  <p className="text-xs text-gray-500 mt-2">
                    Valid until {pass.validUntil}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Transactions */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>Your recent wallet activity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentTransactions.map((tx, i) => (
              <div
                key={i}
                className="flex justify-between items-center p-5 bg-white border border-gray-100 rounded-2xl"
              >
                <div>
                  <p className="font-medium">{tx.description}</p>
                  <p className="text-sm text-gray-500">{tx.date}</p>
                </div>
                <p
                  className={`font-bold text-lg ${
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
