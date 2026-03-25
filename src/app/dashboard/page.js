"use client";

import { useState, useEffect } from "react";
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
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Wallet,
  TrendingUp,
  Users,
  Truck,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Ship,
  Activity,
  ChevronRight,
  Sparkles,
  BarChart3,
  Bell,
} from "lucide-react";

// Mock data for dashboard
const mockStats = {
  totalPasses: 156,
  activePasses: 89,
  pendingApprovals: 23,
  expiringSoon: 12,
  walletBalance: 45250.0,
  monthlySpend: 12500.0,
};

const recentTransactions = [
  {
    id: 1,
    type: "credit",
    amount: 10000,
    description: "Wallet Top-up",
    date: "2024-03-15",
    status: "completed",
  },
  {
    id: 2,
    type: "debit",
    amount: 1500,
    description: "Vehicle Pass - MH04AB1234",
    date: "2024-03-14",
    status: "completed",
  },
  {
    id: 3,
    type: "debit",
    amount: 750,
    description: "Personnel Pass - Raj Kumar",
    date: "2024-03-13",
    status: "completed",
  },
  {
    id: 4,
    type: "debit",
    amount: 2000,
    description: "Monthly Pass Renewal",
    date: "2024-03-12",
    status: "completed",
  },
];

const recentPasses = [
  {
    id: "PASS-2024-001",
    type: "Vehicle",
    name: "MH04AB1234",
    status: "active",
    validUntil: "2024-04-15",
  },
  {
    id: "PASS-2024-002",
    type: "Personnel",
    name: "Raj Kumar",
    status: "pending",
    validUntil: "2024-03-20",
  },
  {
    id: "PASS-2024-003",
    type: "Personnel",
    name: "Amit Shah",
    status: "active",
    validUntil: "2024-05-01",
  },
  {
    id: "PASS-2024-004",
    type: "Vehicle",
    name: "GJ05CD5678",
    status: "expired",
    validUntil: "2024-03-01",
  },
  {
    id: "PASS-2024-005",
    type: "Driver",
    name: "Mohammed Ali",
    status: "active",
    validUntil: "2024-04-30",
  },
];

const getStatusColor = (status) => {
  switch (status) {
    case "active":
    case "completed":
      return "bg-emerald-50 text-emerald-600 border-emerald-200";
    case "pending":
      return "bg-amber-50 text-amber-600 border-amber-200";
    case "expired":
    case "rejected":
      return "bg-red-50 text-red-600 border-red-200";
    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
};

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setMounted(true);
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (!mounted) return null;

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-amber-500/5 to-orange-50 border border-primary/20 p-6 lg:p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-medium">
                <Sparkles className="h-3 w-3" />
                Good Morning
              </span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-slate-800">
              Welcome back,{" "}
              <span className="text-gradient-saffron">
                {user?.username?.split("@")[0] || "User"}
              </span>
            </h1>
            <p className="text-slate-600 text-lg">
              Here's what's happening with your port passes today.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-200 bg-white/80 hover:border-primary/50 text-slate-700"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Last 30 Days
            </Button>
            <Button className="gradient-saffron text-white shadow-lg shadow-primary/25">
              <FileText className="h-4 w-4 mr-2" />
              Apply New Pass
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <Card className="group relative overflow-hidden border-slate-200 bg-white hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="relative p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/15 to-amber-500/10 shadow-sm">
                <Wallet className="h-7 w-7 text-primary" />
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-medium">
                <TrendingUp className="h-3 w-3" />
                +12%
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">
              Wallet Balance
            </p>
            <p className="text-3xl font-bold text-slate-800">
              {formatCurrency(mockStats.walletBalance)}
            </p>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-30 group-hover:opacity-60 transition-opacity" />
        </Card>

        <Card className="group relative overflow-hidden border-slate-200 bg-white hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-100 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="relative p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 shadow-sm">
                <CheckCircle className="h-7 w-7 text-emerald-600" />
              </div>
              <span className="text-xs text-slate-500">57% of total</span>
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">
              Active Passes
            </p>
            <div className="flex items-end gap-3">
              <p className="text-3xl font-bold text-slate-800">
                {mockStats.activePasses}
              </p>
              <Progress value={57} className="h-2 w-20 mb-2" />
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-30 group-hover:opacity-60 transition-opacity" />
        </Card>

        <Card className="group relative overflow-hidden border-slate-200 bg-white hover:border-amber-300 hover:shadow-lg hover:shadow-amber-100 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="relative p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50 shadow-sm">
                <Clock className="h-7 w-7 text-amber-600" />
              </div>
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">
              Pending Approvals
            </p>
            <p className="text-3xl font-bold text-slate-800">
              {mockStats.pendingApprovals}
            </p>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-30 group-hover:opacity-60 transition-opacity" />
        </Card>

        <Card className="group relative overflow-hidden border-slate-200 bg-white hover:border-red-300 hover:shadow-lg hover:shadow-red-100 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-red-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="relative p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-red-100 to-red-50 shadow-sm">
                <XCircle className="h-7 w-7 text-red-500" />
              </div>
              <span className="text-xs text-red-500 font-medium">
                Within 7 days
              </span>
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">
              Expiring Soon
            </p>
            <p className="text-3xl font-bold text-slate-800">
              {mockStats.expiringSoon}
            </p>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-30 group-hover:opacity-60 transition-opacity" />
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-slate-200 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Recent Pass Applications
              </CardTitle>
              <CardDescription className="mt-1 text-slate-500">
                Your latest pass requests and their status
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary hover:text-primary hover:bg-primary/10"
            >
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentPasses.map((pass, index) => (
                <div
                  key={pass.id}
                  className="group flex items-center justify-between p-4 rounded-xl bg-slate-50/80 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all duration-200"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-primary/10 to-amber-500/10 group-hover:from-primary/20 group-hover:to-amber-500/15 transition-colors">
                      {pass.type === "Vehicle" ? (
                        <Truck className="h-5 w-5 text-primary" />
                      ) : pass.type === "Personnel" ? (
                        <Users className="h-5 w-5 text-primary" />
                      ) : (
                        <CreditCard className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 group-hover:text-primary transition-colors">
                        {pass.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-400 font-mono">
                          {pass.id}
                        </span>
                        <span className="text-slate-300">|</span>
                        <span className="text-xs text-slate-500">
                          {pass.type} Pass
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-slate-400">Valid Until</p>
                      <p className="text-sm font-medium text-slate-700">
                        {pass.validUntil}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={getStatusColor(pass.status)}
                    >
                      {pass.status.charAt(0).toUpperCase() +
                        pass.status.slice(1)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Transactions
            </CardTitle>
            <CardDescription className="text-slate-500">
              Your recent wallet activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTransactions.map((transaction, index) => (
                <div
                  key={transaction.id}
                  className="group flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-xl ${
                      transaction.type === "credit"
                        ? "bg-gradient-to-br from-emerald-100 to-emerald-50"
                        : "bg-gradient-to-br from-red-100 to-red-50"
                    }`}
                  >
                    {transaction.type === "credit" ? (
                      <ArrowDownRight className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <ArrowUpRight className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">
                      {transaction.description}
                    </p>
                    <p className="text-xs text-slate-400">{transaction.date}</p>
                  </div>
                  <p
                    className={`text-sm font-semibold ${
                      transaction.type === "credit"
                        ? "text-emerald-600"
                        : "text-red-500"
                    }`}
                  >
                    {transaction.type === "credit" ? "+" : "-"}
                    {formatCurrency(transaction.amount)}
                  </p>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              className="w-full mt-4 border-slate-200 hover:border-primary/50 hover:bg-primary/5 text-slate-700"
            >
              View All Transactions
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Quick Actions
          </CardTitle>
          <CardDescription className="text-slate-500">
            Common tasks for port gate management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                icon: FileText,
                label: "Apply Pass",
                desc: "New application",
                color: "from-primary/15 to-amber-500/10",
                iconColor: "text-primary",
              },
              {
                icon: Wallet,
                label: "Top-up Wallet",
                desc: "Add funds",
                color: "from-emerald-100 to-emerald-50",
                iconColor: "text-emerald-600",
              },
              {
                icon: Users,
                label: "Manage Personnel",
                desc: "Team access",
                color: "from-blue-100 to-blue-50",
                iconColor: "text-blue-600",
              },
              {
                icon: Activity,
                label: "View Reports",
                desc: "Analytics",
                color: "from-violet-100 to-violet-50",
                iconColor: "text-violet-600",
              },
            ].map((action, i) => (
              <button
                key={i}
                className="group relative flex flex-col items-center justify-center p-6 rounded-2xl border border-slate-200 hover:border-primary/40 bg-white hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity from-primary/5 to-transparent" />
                <div
                  className={`relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${action.color} mb-4 group-hover:scale-110 transition-transform shadow-sm`}
                >
                  <action.icon className={`h-6 w-6 ${action.iconColor}`} />
                </div>
                <span className="relative text-sm font-semibold text-slate-800">
                  {action.label}
                </span>
                <span className="relative text-xs text-slate-500 mt-1">
                  {action.desc}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Port Activity */}
      <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <CardHeader className="relative flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
              <Ship className="h-5 w-5 text-primary" />
              Port Activity Today
            </CardTitle>
            <CardDescription className="text-slate-500">
              Real-time gate activity summary
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary hover:text-primary hover:bg-primary/10"
          >
            <Bell className="h-4 w-4 mr-2" />
            Live Updates
          </Button>
        </CardHeader>
        <CardContent className="relative">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: "Vehicles In",
                value: "234",
                change: "+12%",
                trend: "up",
              },
              {
                label: "Vehicles Out",
                value: "198",
                change: "+8%",
                trend: "up",
              },
              {
                label: "Personnel Entries",
                value: "567",
                change: "+15%",
                trend: "up",
              },
              {
                label: "Active Gates",
                value: "8/10",
                change: "",
                trend: "neutral",
              },
            ].map((stat, i) => (
              <div
                key={i}
                className="relative text-center p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-white border border-slate-100 hover:border-primary/30 hover:shadow-md transition-all overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <p className="relative text-3xl font-bold text-slate-800">
                  {stat.value}
                </p>
                <p className="relative text-sm text-slate-500 mt-1">
                  {stat.label}
                </p>
                {stat.change && (
                  <p
                    className={`relative text-xs mt-2 font-medium ${
                      stat.trend === "up"
                        ? "text-emerald-600"
                        : "text-slate-500"
                    }`}
                  >
                    {stat.change}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
