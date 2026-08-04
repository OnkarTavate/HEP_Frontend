"use client";

import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis,
} from "recharts";
import {
  RefreshCw, CheckCircle, XCircle, RotateCcw, Activity, Building2,
  FileText, Shield, Truck, User, AlertTriangle, ChevronRight, Clock,
  TrendingUp, Eye, ExternalLink, AlertCircle, Package, Minus, Zap,
  CircleDollarSign, Timer, BadgeAlert, ClipboardList, UserCheck,
  ShieldCheck, TrendingDown, Info, Hourglass, ArrowUpRight,
  Users, Wifi, WifiOff, BarChart3, Layers, Target, Flame,
  ShieldOff, CheckCheck, Bell, Star, Hash,
} from "lucide-react";

const AGENT_API = process.env.NEXT_PUBLIC_AGENT_API || "http://localhost:5001/api";
const ADMIN_API = process.env.NEXT_PUBLIC_ADMIN_API || "http://localhost:5005/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const safeNum = (v) => { const n = Number(v); return (v == null || !isFinite(n)) ? null : n; };
const dn = (v, fb = "N/A") => { const n = safeNum(v); return n === null ? fb : n.toLocaleString("en-IN"); };
const dm = (v) => { const n = safeNum(v); if (n === null) return "N/A"; if (n >= 1e7) return `₹${(n/1e7).toFixed(1)}Cr`; if (n >= 1e5) return `₹${(n/1e5).toFixed(1)}L`; if (n >= 1000) return `₹${(n/1000).toFixed(1)}K`; return "₹" + n.toLocaleString("en-IN"); };
const pct = (a, b) => { const na = safeNum(a), nb = safeNum(b); return (na === null || nb === null || nb === 0) ? null : Math.min(100, Math.round((na / nb) * 100)); };
const fmtFull = (iso) => { if (!iso) return "N/A"; const d = new Date(iso); return isNaN(d) ? "N/A" : d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }); };
const fmtShort = (iso) => { if (!iso) return "N/A"; const d = new Date(iso); return isNaN(d) ? "N/A" : d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true }); };
const timeAgo = (iso) => { if (!iso) return ""; const s = (Date.now() - new Date(iso)) / 1000; if (isNaN(s)||s<0) return ""; if (s<60) return `${Math.round(s)}s ago`; if (s<3600) return `${Math.round(s/60)}m ago`; if (s<86400) return `${Math.round(s/3600)}h ago`; return `${Math.round(s/86400)}d ago`; };

// ─── Design tokens ─────────────────────────────────────────────────────────────
const BG     = "#07101f";
const CARD   = "rgba(255,255,255,0.04)";
const BORDER = "rgba(255,255,255,0.08)";
const ACCENT = { indigo:"#6366f1", violet:"#8b5cf6", cyan:"#06b6d4", emerald:"#10b981", amber:"#f59e0b", red:"#ef4444", rose:"#f43f5e", blue:"#3b82f6", sky:"#0ea5e9", orange:"#f97316", slate:"#64748b" };

const GLOW = {
  indigo: "0 0 24px rgba(99,102,241,0.4)",
  violet: "0 0 24px rgba(139,92,246,0.4)",
  cyan:   "0 0 24px rgba(6,182,212,0.4)",
  emerald:"0 0 24px rgba(16,185,129,0.4)",
  amber:  "0 0 24px rgba(245,158,11,0.4)",
  red:    "0 0 24px rgba(239,68,68,0.4)",
};

// ─── Shared style helpers ──────────────────────────────────────────────────────
const glass = (extra = {}) => ({
  background: CARD,
  border: `1px solid ${BORDER}`,
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  borderRadius: "20px",
  ...extra,
});

const glowBorder = (color = "indigo") => ({
  background: CARD,
  border: `1px solid ${ACCENT[color]}40`,
  boxShadow: `inset 0 0 0 1px ${ACCENT[color]}20, ${GLOW[color] || ""}`,
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  borderRadius: "20px",
});

// ─── Skeletons ─────────────────────────────────────────────────────────────────
const Sk = ({ w = "100%", h = "16px", r = "8px" }) => (
  <div style={{ width: w, height: h, borderRadius: r, background: "rgba(255,255,255,0.08)", animation: "pulse 1.5s ease-in-out infinite" }} />
);

// ─── Pie tooltip ───────────────────────────────────────────────────────────────
const PieTip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "8px 14px" }}>
      <p style={{ color: "#fff", fontWeight: 800, fontSize: 12, margin: 0 }}>{d.name}</p>
      <p style={{ color: "#94a3b8", fontSize: 11, margin: "2px 0 0" }}>{dn(d.value)} <span style={{ color: "#475569" }}>({d.payload?.pct}%)</span></p>
    </div>
  );
};

// ─── BL status map ─────────────────────────────────────────────────────────────
const BL_MAP = {
  BLACKLISTED:           { label: "Blacklisted",     bg: "rgba(239,68,68,0.15)",   color: "#ef4444" },
  PENDING_BLACKLIST:     { label: "Pending Approval", bg: "rgba(245,158,11,0.15)",  color: "#f59e0b" },
  UNBLACKLIST_REQUESTED: { label: "Unblock Req.",     bg: "rgba(59,130,246,0.15)",  color: "#3b82f6" },
  UNBLACKLISTED:         { label: "Unblocked",        bg: "rgba(16,185,129,0.15)",  color: "#10b981" },
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function PassSectionDashboard() {
  const router = useRouter();
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ts, setTs]           = useState(new Date());
  const [online, setOnline]   = useState({});

  const [S, setS] = useState({
    totalPasses: null, processed: null, pending: null,
    approvedByMe: null, pendingWithMe: null,
    companyActive: null, companyPending: null, companyRejected: null, companyReverted: null, profilePending: null,
    blCompany: null, blPerson: null, blDriver: null, blVehicle: null,
    blPendingApproval: null, blUnblockPending: null, blActiveTotal: null,
    vendorPending: null, bulkPending: null,
    overstayPending: null, overstayPaid: null, overstayAmount: null, overstayExceptions: null, overstayTotal: null,
  });

  const [pieData, setPieData]       = useState([]);
  const [activities, setActivities] = useState([]);
  const [blPending, setBlPending]   = useState([]);
  const [overstayRows, setOvRows]   = useState([]);

  useEffect(() => {
    const s = localStorage.getItem("user");
    if (s) { try { setUser(JSON.parse(s)); } catch { router.push("/"); } } else router.push("/");
  }, [router]);

  const fetchAll = useCallback(async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) { setLoading(false); return; }
    const H = { Authorization: `Bearer ${token}` };
    const get = (url, p) => axios.get(url, { headers: H, params: p, validateStatus: s => s < 500 });
    try {
      const [passAll, passPend, passMine, company, profile, blStats, blPendR, vendor, bulk, ovR, ovExc] = await Promise.allSettled([
        get(`${AGENT_API}/pass-request/get-agent-pass-requests`, { page:1, limit:1 }),
        get(`${AGENT_API}/pass-request/get-agent-pass-requests`, { page:1, limit:1, status:"pending" }),
        get(`${AGENT_API}/pass-request/get-agent-pass-requests`, { page:1, limit:1, processedByMe:"true" }),
        get(`${ADMIN_API}/user/agent-users`, { page:1, limit:1 }),
        get(`${ADMIN_API}/user/profile-update-requests`, { status:"pending", page:1, limit:1 }),
        get(`${ADMIN_API}/blacklist/stats`),
        get(`${ADMIN_API}/blacklist/list`, { status:"PENDING_BLACKLIST", page:1, limit:8 }),
        get(`${AGENT_API}/vendor-pass/list`, { page:1, limit:200 }),
        get(`${AGENT_API}/bulk-pass/list`, { page:1, limit:200 }),
        get(`${ADMIN_API}/overstay/charges`, { page:1, limit:100 }),
        get(`${ADMIN_API}/overstay/exception-requests`, { page:1, limit:1 }),
      ]);

      const ok = r => r.status === "fulfilled" && r.value?.data && r.value.status < 400;
      const v  = (r, fb) => ok(r) ? r.value.data : fb;

      setOnline({ pass: ok(passAll), company: ok(company), blacklist: ok(blStats), vendor: ok(vendor), bulk: ok(bulk), overstay: ok(ovR) });

      const pc = v(passAll,{}).counts || {}; const mc = v(passMine,{}).counts || {}; const ppC = v(passPend,{}).counts || {};
      const cc = v(company,{}).counts || {};
      const blRaw = v(blStats,{}); const bl = blRaw?.data || blRaw || {}; const byt = bl.by_type || bl.byType || {};

      let vendorPending = null, bulkPending = null, vActs = [], bActs = [];
      if (ok(vendor)) {
        const vd = v(vendor,{}).data || [];
        vendorPending = vd.filter(x => ["VENDOR_SUBMITTED","LINK_SENT","UNDER_REVIEW"].includes((x.status||"").toUpperCase())).length;
        vActs = vd.sort((a,b)=>new Date(b.updatedAt||b.createdAt||0)-new Date(a.updatedAt||a.createdAt||0)).slice(0,4).map((x,i)=>({ id:x.id||i, action:x.status==="COMPLETED"?"Vendor Pass Approved":x.status==="REJECTED"?"Vendor Pass Rejected":"Vendor Pass Submitted", ref:x.referenceNumber||x.id||"—", company:x.agentName||x.companyName||"—", by:x.approvedBy||x.submittedBy||"—", ago:timeAgo(x.updatedAt||x.createdAt), color:x.status==="COMPLETED"?"emerald":x.status==="REJECTED"?"red":"indigo" }));
      }
      if (ok(bulk)) {
        const bd = v(bulk,{}).data || [];
        bulkPending = bd.filter(x=>["UNDER_REVIEW","DRAFT"].includes((x.status||"").toUpperCase())).length;
        bActs = bd.sort((a,b)=>new Date(b.updatedAt||b.createdAt||0)-new Date(a.updatedAt||a.createdAt||0)).slice(0,4).map((x,i)=>({ id:x.id||i, action:x.status==="COMPLETED"?"Bulk Pass Approved":x.status==="REJECTED"?"Bulk Pass Rejected":x.status==="RETURNED_TO_APPLICANT"?"Returned to Applicant":"Bulk Pass Submitted", ref:x.referenceNumber||x.batchId||x.id||"—", company:x.agentName||x.companyName||"—", by:x.approvedBy||x.createdBy||"—", ago:timeAgo(x.updatedAt||x.createdAt), color:x.status==="COMPLETED"?"emerald":x.status==="REJECTED"?"red":x.status==="RETURNED_TO_APPLICANT"?"amber":"cyan" }));
      }
      setActivities([...vActs,...bActs].slice(0,8));
      setBlPending(v(blPendR,{}).data||[]);

      let ovPend=null,ovPaid=null,ovAmt=null,ovTot=null,ovExceptions=null;
      if(ok(ovR)){const od=v(ovR,{}).data||[];const op=od.filter(c=>(c.status||"").toUpperCase()==="PENDING");const opd=od.filter(c=>(c.status||"").toUpperCase()==="PAID");ovPend=op.length;ovPaid=opd.length;ovTot=od.length;ovAmt=op.reduce((s,c)=>s+(safeNum(c.total_amount)??safeNum(c.amount)??0),0);setOvRows(od.sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0)).slice(0,5));}
      if(ok(ovExc)){const e=v(ovExc,{});ovExceptions=safeNum(e.count??e.pagination?.totalRecords??(e.data||[]).length);}

      const pend = ok(passPend) ? safeNum(ppC.pending??ppC.total) : safeNum(pc.pending);
      const other = pend!=null ? Math.max(0,pend-(vendorPending??0)-(bulkPending??0)) : 0;
      const pie = [
        {name:"Vendor Pass",  value:vendorPending??0, color:ACCENT.indigo},
        {name:"Bulk Pass",    value:bulkPending??0,   color:ACCENT.violet},
        {name:"Individual",   value:other,            color:ACCENT.cyan},
      ].filter(d=>d.value>0);
      const pt = pie.reduce((s,r)=>s+r.value,0);
      setPieData(pie.map(d=>({...d,pct:pt>0?Math.round(d.value/pt*100):0})));

      setS({
        totalPasses:safeNum(pc.total), processed:safeNum(pc.processed), pending:pend,
        approvedByMe:safeNum(mc.processed), pendingWithMe:safeNum(mc.pending),
        companyActive:safeNum(cc.approved), companyPending:safeNum(cc.pending), companyRejected:safeNum(cc.rejected), companyReverted:safeNum(cc.reverted),
        profilePending: ok(profile) ? safeNum(v(profile,{}).pagination?.totalRecords) : null,
        blCompany:safeNum(byt.COMPANY), blPerson:safeNum(byt.PERSON), blDriver:safeNum(byt.DRIVER), blVehicle:safeNum(byt.VEHICLE),
        blPendingApproval:safeNum(bl.pending_blacklist), blUnblockPending:safeNum(bl.pending_unblacklist), blActiveTotal:safeNum(bl.active_blacklisted),
        vendorPending, bulkPending,
        overstayPending:ovPend, overstayPaid:ovPaid, overstayAmount:ovAmt, overstayExceptions:ovExceptions, overstayTotal:ovTot,
      });
      setTs(new Date());
      const off = Object.values({pass:ok(passAll),company:ok(company),blacklist:ok(blStats),vendor:ok(vendor),bulk:ok(bulk),overstay:ok(ovR)}).filter(x=>!x).length;
      if(off>0) toast.warning(`${off} service(s) offline — partial data shown`);
    } catch(e){ console.error(e); toast.error("Dashboard failed to load."); }
    finally { setLoading(false); setRefreshing(false); }
  }, [user]);

  useEffect(() => { if(user){ fetchAll(); const id=setInterval(fetchAll,5*60*1000); return()=>clearInterval(id); }}, [user,fetchAll]);

  const doRefresh = () => { if(!refreshing){setRefreshing(true);fetchAll();} };

  const alerts = useMemo(() => {
    const a = [];
    if(safeNum(S.pending)>=50) a.push({lvl:"critical",icon:Flame,msg:`${dn(S.pending)} pass requests pending`,sub:"Queue critically high"});
    if(safeNum(S.blPendingApproval)>0) a.push({lvl:"high",icon:BadgeAlert,msg:`${dn(S.blPendingApproval)} blacklist approval(s) required`,sub:"Navigate to Blacklist Management"});
    if(safeNum(S.blUnblockPending)>0) a.push({lvl:"medium",icon:ShieldCheck,msg:`${dn(S.blUnblockPending)} unblock request(s) pending`,sub:"Entities applied for reinstatement"});
    if(safeNum(S.overstayAmount)>0) a.push({lvl:"medium",icon:CircleDollarSign,msg:`${dm(S.overstayAmount)} overstay dues uncollected`,sub:`${dn(S.overstayPending)} vehicle(s) pending`});
    if(safeNum(S.profilePending)>0) a.push({lvl:"info",icon:UserCheck,msg:`${dn(S.profilePending)} profile update(s) awaiting review`,sub:"Companies requesting changes"});
    return a;
  },[S]);

  const pieTotal = pieData.reduce((s,d)=>s+d.value,0);

  // ─── Mini sparkline (fake trend) ───────────────────────────────────────────
  const spark = (peak=100) => Array.from({length:7},(_,i)=>({v:Math.max(10,Math.round(peak*[0.5,0.7,0.4,0.85,0.6,0.9,1][i]))}));

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ background: `linear-gradient(135deg, ${BG} 0%, #0a1628 40%, #0d0b1e 100%)`, minHeight:"100vh", borderRadius:24, padding:"24px", fontFamily:"'Inter',sans-serif" }}>
      <style>{`
        @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse-dot{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes glow-pulse{0%,100%{box-shadow:0 0 12px rgba(99,102,241,.4)}50%{box-shadow:0 0 28px rgba(99,102,241,.8)}}
        .dash-card{animation:fadeUp .4s ease both;}
        .dash-card:nth-child(1){animation-delay:.05s}
        .dash-card:nth-child(2){animation-delay:.1s}
        .dash-card:nth-child(3){animation-delay:.15s}
        .dash-card:nth-child(4){animation-delay:.2s}
        .dash-card:nth-child(5){animation-delay:.25s}
        .dash-card:nth-child(6){animation-delay:.3s}
        .kpi-number{background:linear-gradient(135deg,#fff 0%,#94a3b8 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .gradient-text{background:linear-gradient(135deg,#6366f1,#8b5cf6,#06b6d4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .hover-lift{transition:transform .2s ease,box-shadow .2s ease}
        .hover-lift:hover{transform:translateY(-3px)}
        .action-btn{transition:all .15s ease}
        .action-btn:hover{transform:translateY(-2px);filter:brightness(1.15)}
        .action-btn:active{transform:scale(0.96)}
        .shimmer-text{background:linear-gradient(90deg,#fff 0%,#6366f1 40%,#06b6d4 60%,#fff 100%);background-size:200%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:shimmer 3s ease infinite}
        .row-hover{transition:background .15s ease}
        .row-hover:hover{background:rgba(255,255,255,0.04)!important;border-radius:12px}
        .progress-bar{transition:width 1s cubic-bezier(0.4,0,0.2,1)}
      `}</style>

      {/* ████████ HERO HEADER ██████████████████████████████████████████████ */}
      <div style={{ ...glowBorder("indigo"), marginBottom:24, padding:"28px 32px", position:"relative", overflow:"hidden" }}>
        {/* Bg glow blobs */}
        <div style={{ position:"absolute", top:-60, right:-60, width:300, height:300, borderRadius:"50%", background:"radial-gradient(circle,rgba(99,102,241,.15) 0%,transparent 70%)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:-40, left:40, width:200, height:200, borderRadius:"50%", background:"radial-gradient(circle,rgba(6,182,212,.1) 0%,transparent 70%)", pointerEvents:"none" }} />
        {/* Dot grid */}
        <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(circle,rgba(255,255,255,0.04) 1px,transparent 1px)", backgroundSize:"28px 28px", pointerEvents:"none", borderRadius:20 }} />

        <div style={{ position:"relative", display:"flex", flexWrap:"wrap", alignItems:"center", justifyContent:"space-between", gap:16 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 10px", borderRadius:20, background:"rgba(16,185,129,.15)", border:"1px solid rgba(16,185,129,.3)" }}>
                <span style={{ width:7, height:7, borderRadius:"50%", background:"#10b981", animation:"pulse-dot 2s ease infinite" }} />
                <span style={{ color:"#10b981", fontSize:10, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.1em" }}>Live</span>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 10px", borderRadius:20, background:"rgba(99,102,241,.15)", border:"1px solid rgba(99,102,241,.3)" }}>
                <BarChart3 size={11} color={ACCENT.indigo} />
                <span style={{ color:ACCENT.indigo, fontSize:10, fontWeight:800, letterSpacing:"0.05em" }}>Pass Section</span>
              </div>
            </div>
            <h1 className="shimmer-text" style={{ fontSize:"clamp(24px,4vw,36px)", fontWeight:900, margin:0, letterSpacing:"-0.03em", lineHeight:1.1 }}>
              Management Dashboard
            </h1>
            <p style={{ color:"#475569", fontSize:13, marginTop:8, fontWeight:500 }}>
              Real-time approvals, registrations &amp; escalations
              {user && <span style={{ color:"#64748b" }}> · {user.name || user.username}</span>}
            </p>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ textAlign:"right" }}>
              <p style={{ color:"#334155", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", margin:0 }}>Last Refreshed</p>
              <p style={{ color:"#94a3b8", fontSize:12, fontWeight:600, margin:"2px 0 0" }}>{fmtFull(ts)}</p>
            </div>
            <button
              onClick={doRefresh}
              disabled={refreshing}
              style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 18px", background:"rgba(99,102,241,0.2)", border:"1px solid rgba(99,102,241,0.4)", borderRadius:12, color:"#c7d2fe", fontSize:12, fontWeight:700, cursor:"pointer", transition:"all .15s ease" }}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(99,102,241,0.35)"}
              onMouseLeave={e=>e.currentTarget.style.background="rgba(99,102,241,0.2)"}
            >
              <RefreshCw size={14} style={{ animation:refreshing?"spin 1s linear infinite":"none" }} />
              Refresh
            </button>
          </div>
        </div>

        {/* ── 6-tile mini KPI strip ─────────────────────────────────────────── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:12, marginTop:24 }}>
          {[
            { label:"Total Passes",   val:S.totalPasses,   sub:`${dn(S.pending)} pending`, icon:FileText,          c:"indigo" },
            { label:"Processed",      val:S.processed,     sub:"this session",             icon:CheckCircle,       c:"emerald" },
            { label:"Pending Queue",  val:S.pending,       sub:"awaiting review",          icon:Clock,             c: safeNum(S.pending)>30?"red":"amber" },
            { label:"My Approvals",   val:S.approvedByMe,  sub:"processed by me",          icon:UserCheck,         c:"violet" },
            { label:"Blacklisted",    val:S.blActiveTotal, sub:"active restrictions",      icon:ShieldOff,         c:"rose" },
            { label:"Overstay Dues",  val:null,            sub:dm(S.overstayAmount),       icon:CircleDollarSign,  c:"orange", money:true, rawVal:S.overstayAmount },
          ].map((card,i) => (
            <div key={i} style={{ background:"rgba(255,255,255,0.04)", border:`1px solid rgba(255,255,255,0.07)`, borderRadius:14, padding:"14px 16px", position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", inset:0, background:`radial-gradient(circle at top right,${ACCENT[card.c]}18 0%,transparent 60%)`, borderRadius:14 }} />
              <div style={{ position:"relative" }}>
                <card.icon size={14} color={ACCENT[card.c]} style={{ marginBottom:8 }} />
                <p style={{ color:"#475569", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", margin:"0 0 4px" }}>{card.label}</p>
                {loading ? <Sk h="26px" w="60px" r="6px" /> : (
                  <p style={{ color:"#fff", fontSize:22, fontWeight:900, margin:0, letterSpacing:"-0.03em" }}>
                    {card.money ? dm(card.rawVal) : dn(card.val)}
                  </p>
                )}
                <p style={{ color:`${ACCENT[card.c]}99`, fontSize:10, fontWeight:600, margin:"4px 0 0" }}>{card.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ████████ ALERT BANNERS ████████████████████████████████████████████ */}
      {!loading && alerts.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:10, marginBottom:20 }}>
          {alerts.map((a,i) => {
            const colors = { critical:["rgba(239,68,68,.15)","rgba(239,68,68,.4)","#fca5a5","#ef4444"], high:["rgba(245,158,11,.12)","rgba(245,158,11,.35)","#fcd34d","#f59e0b"], medium:["rgba(249,115,22,.1)","rgba(249,115,22,.3)","#fdba74","#f97316"], info:["rgba(99,102,241,.12)","rgba(99,102,241,.3)","#a5b4fc","#6366f1"] }[a.lvl]||["rgba(100,116,139,.1)","rgba(100,116,139,.3)","#94a3b8","#64748b"];
            return (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderRadius:14, background:colors[0], border:`1px solid ${colors[1]}` }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", width:32, height:32, borderRadius:10, background:colors[1], flexShrink:0 }}>
                  <a.icon size={15} color={colors[2]} />
                </div>
                <div>
                  <p style={{ color:colors[2], fontSize:12, fontWeight:700, margin:0 }}>{a.msg}</p>
                  <p style={{ color:colors[3], fontSize:10, margin:"2px 0 0", opacity:.7 }}>{a.sub}</p>
                </div>
                {a.lvl==="critical"&&<span style={{ marginLeft:"auto", width:8, height:8, borderRadius:"50%", background:"#ef4444", animation:"pulse-dot 1s ease infinite", flexShrink:0 }} />}
              </div>
            );
          })}
        </div>
      )}

      {/* ████████ BENTO GRID ROW 1 — Company + Pass Approval ██████████████ */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))", gap:16, marginBottom:16 }}>

        {/* ── A: Company Registration ───────────────────────────────────────── */}
        <GlassPanel letter="A" title="Company Registration" color="cyan" badge={safeNum(S.companyPending)||0} onViewAll={()=>{}}>
          {loading ? <LoadSkeletons n={3}/> : (
            <div>
              {/* Main tiles */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:16 }}>
                {[
                  {l:"Active",     v:S.companyActive,   c:"emerald", g:"from-emerald"},
                  {l:"Pending",    v:S.companyPending,  c:"amber",   g:"from-amber"},
                  {l:"Rejected",   v:S.companyRejected, c:"red",     g:"from-red"},
                  {l:"Reverted",   v:S.companyReverted, c:"orange",  g:"from-orange"},
                  {l:"Blacklisted",v:S.blCompany,       c:"rose",    g:"from-rose"},
                  {l:"Profile Upd.",v:S.profilePending, c:"sky",     g:"from-sky", alert:safeNum(S.profilePending)>0},
                ].map(({l,v,c,alert})=>(
                  <div key={l} style={{ padding:"12px 10px", borderRadius:14, background:`${ACCENT[c]}15`, border:`1px solid ${ACCENT[c]}30`, textAlign:"center", boxShadow:alert?`0 0 14px ${ACCENT[c]}30`:undefined }}>
                    <p style={{ color:ACCENT[c], fontSize:20, fontWeight:900, margin:"0 0 4px", letterSpacing:"-0.03em" }}>{dn(v)}</p>
                    <p style={{ color:"#64748b", fontSize:10, fontWeight:600 }}>{l}</p>
                  </div>
                ))}
              </div>
              {/* Approval rate */}
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ color:"#475569", fontSize:11, fontWeight:700 }}>Approval Rate</span>
                  <span style={{ color:ACCENT.emerald, fontSize:12, fontWeight:900 }}>{pct(S.companyActive,(safeNum(S.companyActive)||0)+(safeNum(S.companyPending)||0)+(safeNum(S.companyRejected)||0))??0}%</span>
                </div>
                <div style={{ height:6, background:"rgba(255,255,255,0.08)", borderRadius:6, overflow:"hidden" }}>
                  <div className="progress-bar" style={{ height:"100%", background:`linear-gradient(90deg,${ACCENT.emerald},${ACCENT.cyan})`, borderRadius:6, width:`${pct(S.companyActive,(safeNum(S.companyActive)||0)+(safeNum(S.companyPending)||0)+(safeNum(S.companyRejected)||0))??0}%` }} />
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:5 }}>
                  <span style={{ color:"#334155", fontSize:10 }}>Approved: {dn(S.companyActive)}</span>
                  <span style={{ color:"#334155", fontSize:10 }}>Pending: {dn(S.companyPending)}</span>
                </div>
              </div>
              {/* Profile updates chip */}
              {safeNum(S.profilePending)>0&&(
                <div style={{ marginTop:12, display:"flex", alignItems:"center", gap:8, padding:"8px 12px", borderRadius:10, background:"rgba(14,165,233,0.12)", border:"1px solid rgba(14,165,233,0.25)" }}>
                  <UserCheck size={13} color={ACCENT.sky} />
                  <span style={{ color:"#7dd3fc", fontSize:11, fontWeight:600 }}>{dn(S.profilePending)} profile update request(s) awaiting approval</span>
                </div>
              )}
            </div>
          )}
        </GlassPanel>

        {/* ── B: Pass Approval ──────────────────────────────────────────────── */}
        <GlassPanel letter="B" title="Pass Approval Summary" color="indigo" badge={safeNum(S.pending)||0} onViewAll={()=>{}}>
          {loading ? <LoadSkeletons n={4}/> : (
            <div>
              {/* 4-tile grid */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
                {[
                  {l:"Total Pending",  v:S.pending,                                                                                  c:"amber",   sub:"all pass types"},
                  {l:"Vendor Pending", v:S.vendorPending,                                                                            c:"indigo",  sub:`${pct(S.vendorPending,S.pending)??0}% of queue`},
                  {l:"Bulk Pending",   v:S.bulkPending,                                                                              c:"violet",  sub:`${pct(S.bulkPending,S.pending)??0}% of queue`},
                  {l:"Individual",     v:safeNum(S.pending)!==null?Math.max(0,(safeNum(S.pending)||0)-(safeNum(S.vendorPending)||0)-(safeNum(S.bulkPending)||0)):null, c:"cyan", sub:"direct passes"},
                ].map(({l,v,c,sub})=>(
                  <div key={l} style={{ padding:"14px", borderRadius:14, background:`${ACCENT[c]}12`, border:`1px solid ${ACCENT[c]}25` }}>
                    <p style={{ color:ACCENT[c], fontSize:24, fontWeight:900, margin:"0 0 4px", letterSpacing:"-0.04em" }}>{dn(v)}</p>
                    <p style={{ color:"#f1f5f9", fontSize:11, fontWeight:700, margin:"0 0 2px" }}>{l}</p>
                    <p style={{ color:`${ACCENT[c]}90`, fontSize:10 }}>{sub}</p>
                  </div>
                ))}
              </div>

              {/* Queue status bar */}
              <div style={{ padding:"12px 14px", borderRadius:14, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)", marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <span style={{ color:"#94a3b8", fontSize:11, fontWeight:700 }}>Queue Fill Level</span>
                  <span style={{ padding:"3px 10px", borderRadius:20, fontSize:10, fontWeight:800, background:safeNum(S.pending)>50?"rgba(239,68,68,.2)":safeNum(S.pending)>20?"rgba(245,158,11,.2)":"rgba(16,185,129,.2)", color:safeNum(S.pending)>50?"#fca5a5":safeNum(S.pending)>20?"#fcd34d":"#6ee7b7" }}>
                    {safeNum(S.pending)>50?"⚠ CRITICAL":safeNum(S.pending)>20?"MODERATE":"NORMAL"}
                  </span>
                </div>
                <div style={{ height:8, background:"rgba(255,255,255,0.08)", borderRadius:8, overflow:"hidden" }}>
                  <div className="progress-bar" style={{ height:"100%", borderRadius:8, background:safeNum(S.pending)>50?`linear-gradient(90deg,${ACCENT.red},${ACCENT.rose})`:safeNum(S.pending)>20?`linear-gradient(90deg,${ACCENT.amber},${ACCENT.orange})`:`linear-gradient(90deg,${ACCENT.emerald},${ACCENT.cyan})`, width:`${Math.min(100,pct(S.pending,S.totalPasses)??0)}%` }} />
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:6, color:"#475569", fontSize:10 }}>
                  <span>Pending: <b style={{ color:"#94a3b8" }}>{dn(S.pending)}</b></span>
                  <span>Processed: <b style={{ color:"#94a3b8" }}>{dn(S.processed)}</b></span>
                  <span>Total: <b style={{ color:"#94a3b8" }}>{dn(S.totalPasses)}</b></span>
                </div>
              </div>

              {/* Processed stats row */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                {[
                  {l:"Total Processed",   v:S.processed,    c:"emerald", icon:CheckCheck},
                  {l:"Processed by Me",   v:S.approvedByMe, c:"violet",  icon:UserCheck},
                  {l:"Pending with Me",   v:S.pendingWithMe,c:"amber",   icon:Hourglass},
                  {l:"My Contribution",   v:pct(S.approvedByMe,S.processed), c:"indigo", icon:Target, isPercent:true},
                ].map(({l,v,c,icon:Icon,isPercent})=>(
                  <div key={l} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:12, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ width:30, height:30, borderRadius:9, background:`${ACCENT[c]}20`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <Icon size={14} color={ACCENT[c]} />
                    </div>
                    <div>
                      <p style={{ color:ACCENT[c], fontSize:16, fontWeight:900, margin:0 }}>{v===null?"N/A":isPercent?`${v}%`:dn(v)}</p>
                      <p style={{ color:"#475569", fontSize:10, fontWeight:600, margin:"1px 0 0" }}>{l}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </GlassPanel>
      </div>

      {/* ████████ BENTO ROW 2 — Blacklist + Overstay + Pie ████████████████ */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:16, marginBottom:16 }}>

        {/* ── C: Blacklist ──────────────────────────────────────────────────── */}
        <GlassPanel letter="C" title="Blacklist &amp; Restrictions" color="red" badge={(safeNum(S.blPendingApproval)||0)+(safeNum(S.blUnblockPending)||0)} onViewAll={()=>{}}>
          {loading ? <LoadSkeletons n={5}/> : (
            <div>
              {[
                {l:"Blacklisted Companies", v:S.blCompany, c:"red",    icon:Building2},
                {l:"Blacklisted Persons",   v:S.blPerson,  c:"rose",   icon:User},
                {l:"Blacklisted Drivers",   v:S.blDriver,  c:"orange", icon:Users},
                {l:"Blacklisted Vehicles",  v:S.blVehicle, c:"amber",  icon:Truck},
              ].map(({l,v,c,icon:Icon})=>(
                <div key={l} className="row-hover" style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 8px", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ width:32, height:32, borderRadius:10, background:`${ACCENT[c]}20`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <Icon size={14} color={ACCENT[c]} />
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ color:"#cbd5e1", fontSize:12, fontWeight:600, margin:0 }}>{l}</p>
                    {safeNum(S.blActiveTotal)>0&&safeNum(v)!==null&&(
                      <div style={{ height:3, background:"rgba(255,255,255,0.08)", borderRadius:3, overflow:"hidden", marginTop:4, maxWidth:100 }}>
                        <div style={{ height:"100%", background:ACCENT[c], borderRadius:3, width:`${pct(v,S.blActiveTotal)??0}%` }} />
                      </div>
                    )}
                  </div>
                  <span style={{ color:ACCENT[c], fontSize:18, fontWeight:900, letterSpacing:"-0.04em" }}>{dn(v)}</span>
                </div>
              ))}
              <div style={{ marginTop:12, display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <ActionPill icon={BadgeAlert} label={`${dn(S.blPendingApproval)} BL Approvals`} color="amber" alert={safeNum(S.blPendingApproval)>0} />
                <ActionPill icon={ShieldCheck} label={`${dn(S.blUnblockPending)} Unblock Req.`} color="blue" alert={safeNum(S.blUnblockPending)>0} />
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:12, padding:"10px 12px", borderRadius:12, background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)" }}>
                <span style={{ color:"#94a3b8", fontSize:11, fontWeight:600 }}>Total actively blacklisted</span>
                <span style={{ color:ACCENT.red, fontSize:14, fontWeight:900 }}>{dn(S.blActiveTotal)}</span>
              </div>
            </div>
          )}
        </GlassPanel>

        {/* ── D: Overstay ───────────────────────────────────────────────────── */}
        <GlassPanel letter="D" title="Overstay Snapshot" color="orange" badge={safeNum(S.overstayPending)||0} onViewAll={()=>{}}>
          {loading ? <LoadSkeletons n={5}/> : !online.overstay ? <OffCard label="Overstay service offline" /> : (
            <div>
              {/* Hero amount */}
              <div style={{ padding:"16px", borderRadius:16, background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", marginBottom:14, textAlign:"center", boxShadow:"0 0 32px rgba(239,68,68,0.15)" }}>
                <CircleDollarSign size={20} color="#fca5a5" style={{ marginBottom:6 }} />
                <p style={{ color:"#fff", fontSize:28, fontWeight:900, margin:0, letterSpacing:"-0.04em" }}>{dm(S.overstayAmount)}</p>
                <p style={{ color:"#fca5a5", fontSize:11, marginTop:4, fontWeight:600 }}>Uncollected Overstay Dues</p>
                <p style={{ color:"#ef444490", fontSize:10, marginTop:2 }}>{dn(S.overstayPending)} pending charge(s)</p>
              </div>
              {[
                {l:"Pending Charges",      v:S.overstayPending,    c:"red",     icon:Clock,          alert:true},
                {l:"Exception Requests",   v:S.overstayExceptions, c:"amber",   icon:AlertCircle,    alert:safeNum(S.overstayExceptions)>0},
                {l:"Settled / Paid",       v:S.overstayPaid,       c:"emerald", icon:CheckCircle},
                {l:"Total Records",        v:S.overstayTotal,      c:"slate",   icon:ClipboardList},
              ].map(({l,v,c,icon:Icon,alert})=>(
                <div key={l} className="row-hover" style={{ display:"flex", alignItems:"center", gap:12, padding:"9px 8px", borderBottom:"1px solid rgba(255,255,255,0.05)", background:alert&&safeNum(v)>0?"rgba(245,158,11,0.04)":undefined }}>
                  <div style={{ width:28, height:28, borderRadius:8, background:`${ACCENT[c]}18`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <Icon size={13} color={ACCENT[c]} />
                  </div>
                  <span style={{ flex:1, color:"#94a3b8", fontSize:12, fontWeight:500 }}>{l}</span>
                  <span style={{ color:ACCENT[c], fontSize:16, fontWeight:900 }}>{dn(v)}</span>
                </div>
              ))}
              {safeNum(S.overstayTotal)>0&&(
                <div style={{ marginTop:14 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                    <span style={{ color:"#475569", fontSize:11, fontWeight:700 }}>Collection Rate</span>
                    <span style={{ color:ACCENT.emerald, fontSize:12, fontWeight:900 }}>{pct(S.overstayPaid,S.overstayTotal)??0}%</span>
                  </div>
                  <div style={{ height:6, background:"rgba(255,255,255,0.08)", borderRadius:6, overflow:"hidden" }}>
                    <div className="progress-bar" style={{ height:"100%", background:`linear-gradient(90deg,${ACCENT.emerald},${ACCENT.cyan})`, borderRadius:6, width:`${pct(S.overstayPaid,S.overstayTotal)??0}%` }} />
                  </div>
                </div>
              )}
            </div>
          )}
        </GlassPanel>

        {/* ── E: Pass Type Pie ──────────────────────────────────────────────── */}
        <GlassPanel letter="E" title="Pass Type Distribution" color="violet" right={<span style={{ color:"#475569", fontSize:11, fontWeight:700 }}>Pending: {dn(S.pending)}</span>}>
          {loading ? <Sk w="100%" h="200px" r="12px" /> : pieData.length===0 ? <OffCard label={S.pending===null?"N/A":"No pending passes"} /> : (
            <div>
              <div style={{ position:"relative" }}>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={76} paddingAngle={4} cornerRadius={6} dataKey="value" stroke="none" startAngle={90} endAngle={-270}>
                      {pieData.map(e=><Cell key={e.name} fill={e.color} />)}
                    </Pie>
                    <Tooltip content={<PieTip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
                  <p style={{ color:"#475569", fontSize:9, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.12em", margin:0 }}>PENDING</p>
                  <p style={{ color:"#fff", fontSize:26, fontWeight:900, margin:"2px 0 0", letterSpacing:"-0.04em" }}>{pieTotal.toLocaleString("en-IN")}</p>
                  <p style={{ color:"#475569", fontSize:10, margin:0 }}>passes</p>
                </div>
              </div>
              <div style={{ marginTop:12 }}>
                {pieData.map(item=>(
                  <div key={item.name} style={{ marginBottom:8 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ width:10, height:10, borderRadius:"50%", background:item.color, flexShrink:0 }} />
                        <span style={{ color:"#94a3b8", fontSize:12, fontWeight:600 }}>{item.name}</span>
                      </div>
                      <span style={{ color:"#fff", fontSize:12, fontWeight:800 }}>{dn(item.value)} <span style={{ color:"#475569", fontWeight:400 }}>({item.pct}%)</span></span>
                    </div>
                    <div style={{ height:4, background:"rgba(255,255,255,0.07)", borderRadius:4, overflow:"hidden" }}>
                      <div style={{ height:"100%", background:item.color, borderRadius:4, width:`${item.pct}%`, transition:"width 1s ease" }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:14, padding:"10px 12px", borderRadius:12, background:"rgba(99,102,241,0.08)", border:"1px solid rgba(99,102,241,0.15)", display:"flex", gap:8, alignItems:"flex-start" }}>
                <Info size={13} color={ACCENT.indigo} style={{ flexShrink:0, marginTop:1 }} />
                <p style={{ color:"#818cf8", fontSize:10, margin:0, lineHeight:1.6 }}>
                  <b>Tip:</b> Vendor &amp; Bulk passes affect multiple persons per action. Prioritise these to clear queue faster.
                </p>
              </div>
            </div>
          )}
        </GlassPanel>
      </div>

      {/* ████████ BENTO ROW 3 — Activities + BL Pending + My Work █████████ */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:16, marginBottom:16 }}>

        {/* ── F: Recent Activities ──────────────────────────────────────────── */}
        <GlassPanel letter="F" title="Recent Activity Feed" color="cyan" onViewAll={()=>{}}>
          {loading ? <LoadSkeletons n={5}/> : activities.length===0 ? <OffCard label="No recent activities" /> : (
            <div style={{ position:"relative", paddingLeft:16 }}>
              {/* Timeline line */}
              <div style={{ position:"absolute", left:16, top:8, bottom:8, width:1, background:"rgba(255,255,255,0.08)" }} />
              {activities.map((act,i)=>{
                const dotC = act.color==="emerald"?ACCENT.emerald:act.color==="red"?ACCENT.red:act.color==="amber"?ACCENT.amber:ACCENT.indigo;
                return(
                  <div key={act.id||i} className="row-hover" style={{ display:"flex", gap:12, padding:"8px 8px 8px 16px", borderRadius:10, marginBottom:4, position:"relative" }}>
                    {/* Timeline dot */}
                    <div style={{ position:"absolute", left:-4, top:"50%", transform:"translateY(-50%)", width:9, height:9, borderRadius:"50%", background:dotC, boxShadow:`0 0 8px ${dotC}80`, flexShrink:0 }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", gap:8 }}>
                        <p style={{ color:dotC, fontSize:12, fontWeight:700, margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{act.action}</p>
                        <span style={{ color:"#334155", fontSize:10, fontWeight:600, flexShrink:0 }}>{act.ago}</span>
                      </div>
                      <p style={{ color:"#475569", fontSize:10, margin:"2px 0 0" }}>
                        Ref: <span style={{ fontFamily:"monospace", color:"#64748b", fontWeight:700 }}>{act.ref}</span>
                        {act.company&&act.company!=="—"&&<span style={{ color:"#334155" }}> · {act.company}</span>}
                      </p>
                      {act.by&&act.by!=="—"&&<p style={{ color:"#1e293b", fontSize:10, margin:"1px 0 0" }}>By: {act.by}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GlassPanel>

        {/* ── G: Pending Blacklist Requests ─────────────────────────────────── */}
        <GlassPanel letter="G" title="Pending BL Requests" color="amber" badge={blPending.length} onViewAll={()=>{}}>
          {loading ? <LoadSkeletons n={4}/> : !online.blacklist ? <OffCard label="Blacklist service offline" /> : blPending.length===0 ? (
            <div style={{ textAlign:"center", padding:"32px 0", color:"#334155" }}>
              <Shield size={32} style={{ opacity:.2, margin:"0 auto 8px", display:"block" }} />
              <p style={{ fontSize:12, fontWeight:600, margin:0 }}>No pending blacklist requests</p>
              <p style={{ fontSize:10, margin:"4px 0 0", color:"#1e293b" }}>All actions up to date</p>
            </div>
          ) : (
            <div>
              {blPending.map((e,i)=>{
                const s = BL_MAP[e.status] || {label:e.status||"—",bg:"rgba(100,116,139,.15)",color:"#64748b"};
                return(
                  <div key={e.id||i} className="row-hover" style={{ display:"flex", gap:12, padding:"10px 8px", borderBottom:"1px solid rgba(255,255,255,0.05)", borderRadius:10, cursor:"pointer", marginBottom:2 }}>
                    <div style={{ width:32, height:32, borderRadius:10, background:"rgba(245,158,11,0.15)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2 }}>
                      <BadgeAlert size={14} color={ACCENT.amber} />
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", gap:8, alignItems:"flex-start" }}>
                        <p style={{ color:"#e2e8f0", fontSize:12, fontWeight:800, margin:0, fontFamily:"monospace", textTransform:"uppercase", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{e.identifier||"—"}</p>
                        <span style={{ padding:"2px 8px", borderRadius:20, background:s.bg, color:s.color, fontSize:9, fontWeight:800, flexShrink:0, border:`1px solid ${s.color}40` }}>{s.label}</span>
                      </div>
                      <div style={{ display:"flex", gap:8, marginTop:3, flexWrap:"wrap" }}>
                        <span style={{ color:"#475569", fontSize:10, fontWeight:600 }}>{e.entity_type||"—"}</span>
                        {e.entity_name&&e.entity_name!==e.identifier&&<span style={{ color:"#334155", fontSize:10 }}>· {e.entity_name}</span>}
                      </div>
                      <p style={{ color:"#1e293b", fontSize:10, margin:"2px 0 0" }}>📅 {fmtShort(e.createdAt)}{e.reason?` · ${e.reason}`:""}</p>
                    </div>
                  </div>
                );
              })}
              {blPending.length>=6&&<p style={{ textAlign:"center", color:ACCENT.amber, fontSize:11, fontWeight:700, marginTop:10, cursor:"pointer" }}>View all pending →</p>}
            </div>
          )}
        </GlassPanel>

        {/* ── H: My Work ────────────────────────────────────────────────────── */}
        <GlassPanel letter="H" title="My Work Today" color="violet" onViewAll={()=>{}}>
          {loading ? <LoadSkeletons n={4}/> : (
            <div>
              {[
                {l:"Processed by Me",  v:S.approvedByMe,  c:"emerald", icon:CheckCircle, sub:`${pct(S.approvedByMe,S.processed)??0}% of team total`},
                {l:"Pending with Me",  v:S.pendingWithMe, c:"amber",   icon:Hourglass,   sub:"Assigned, awaiting action", alert:safeNum(S.pendingWithMe)>3},
                {l:"Rejected by Me",   v:null,            c:"red",     icon:XCircle,     sub:"Not returned by API"},
                {l:"Reverted by Me",   v:null,            c:"orange",  icon:RotateCcw,   sub:"Not returned by API"},
              ].map(({l,v,c,icon:Icon,sub,alert})=>(
                <div key={l} className="row-hover" style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 8px", borderBottom:"1px solid rgba(255,255,255,0.05)", borderRadius:10, background:alert&&safeNum(v)>0?"rgba(245,158,11,0.05)":undefined }}>
                  <div style={{ width:32, height:32, borderRadius:10, background:`${ACCENT[c]}18`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <Icon size={14} color={ACCENT[c]} />
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ color:"#cbd5e1", fontSize:12, fontWeight:600, margin:0 }}>{l}</p>
                    <p style={{ color:"#334155", fontSize:10, margin:"1px 0 0" }}>{sub}</p>
                  </div>
                  <span style={{ color:v!==null?ACCENT[c]:"#1e293b", fontSize:18, fontWeight:900 }}>{v!==null?dn(v):"—"}</span>
                </div>
              ))}

              {/* Contribution meter */}
              <div style={{ marginTop:14, padding:"12px 14px", borderRadius:14, background:"rgba(139,92,246,0.1)", border:"1px solid rgba(139,92,246,0.2)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                  <span style={{ color:"#a78bfa", fontSize:11, fontWeight:700 }}>My Contribution</span>
                  <span style={{ color:"#fff", fontSize:14, fontWeight:900 }}>{pct(S.approvedByMe,S.processed)!==null?`${pct(S.approvedByMe,S.processed)}%`:"N/A"}</span>
                </div>
                <div style={{ height:6, background:"rgba(255,255,255,0.08)", borderRadius:6, overflow:"hidden" }}>
                  <div className="progress-bar" style={{ height:"100%", background:`linear-gradient(90deg,${ACCENT.violet},${ACCENT.indigo})`, borderRadius:6, width:`${pct(S.approvedByMe,S.processed)??0}%` }} />
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
                  <span style={{ color:"#475569", fontSize:10 }}>Me: {dn(S.approvedByMe)}</span>
                  <span style={{ color:"#475569", fontSize:10 }}>Team: {dn(S.processed)}</span>
                </div>
              </div>

              {safeNum(S.profilePending)>0&&(
                <div style={{ marginTop:12, display:"flex", gap:8, alignItems:"center", padding:"8px 12px", borderRadius:10, background:"rgba(14,165,233,0.1)", border:"1px solid rgba(14,165,233,0.2)" }}>
                  <UserCheck size={13} color={ACCENT.sky} />
                  <span style={{ color:"#7dd3fc", fontSize:11, fontWeight:600 }}>{dn(S.profilePending)} profile update(s) need review</span>
                </div>
              )}
            </div>
          )}
        </GlassPanel>
      </div>

      {/* ████████ BENTO ROW 4 — Overstay Table + Quick Actions ████████████ */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:16, marginBottom:16 }}>

        {/* ── I: Overstay Table ─────────────────────────────────────────────── */}
        <GlassPanel letter="I" title="Recent Overstay Charges" color="rose" onViewAll={()=>{}}>
          {loading ? <LoadSkeletons n={4}/> : !online.overstay ? <OffCard label="Overstay service offline" /> : overstayRows.length===0 ? <OffCard label="No overstay charges recorded" /> : (
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12, minWidth:480 }}>
                <thead>
                  <tr style={{ borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
                    {["#","Entity / Vehicle","Type","Amount","Status","Levied On"].map(h=>(
                      <th key={h} style={{ textAlign:"left", color:"#334155", fontSize:10, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.08em", paddingBottom:10, paddingRight:16 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {overstayRows.map((c,i)=>{
                    const s=(c.status||"").toUpperCase();
                    const sc=s==="PAID"?{bg:"rgba(16,185,129,.15)",color:"#34d399"}:s==="WAIVED"?{bg:"rgba(59,130,246,.15)",color:"#60a5fa"}:{bg:"rgba(239,68,68,.15)",color:"#f87171"};
                    return(
                      <tr key={c.id||i} className="row-hover" style={{ borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                        <td style={{ padding:"10px 16px 10px 0", color:"#334155", fontFamily:"monospace" }}>{i+1}</td>
                        <td style={{ padding:"10px 16px 10px 0" }}>
                          <p style={{ color:"#e2e8f0", fontFamily:"monospace", fontWeight:700, margin:0, fontSize:12 }}>{c.vehicle_id||c.entity_id||c.identifier||"—"}</p>
                          {(c.company_name||c.agent_name)&&<p style={{ color:"#334155", fontSize:10, margin:"2px 0 0" }}>{c.company_name||c.agent_name}</p>}
                        </td>
                        <td style={{ padding:"10px 16px 10px 0", color:"#475569" }}>{c.entity_type||c.pass_type||"—"}</td>
                        <td style={{ padding:"10px 16px 10px 0", color:"#fff", fontWeight:900 }}>{dm(c.total_amount||c.amount)}</td>
                        <td style={{ padding:"10px 16px 10px 0" }}>
                          <span style={{ padding:"3px 10px", borderRadius:20, background:sc.bg, color:sc.color, fontSize:10, fontWeight:800 }}>{s}</span>
                        </td>
                        <td style={{ padding:"10px 0", color:"#334155", whiteSpace:"nowrap" }}>{fmtShort(c.createdAt||c.levied_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </GlassPanel>

        {/* ── J: Quick Actions ──────────────────────────────────────────────── */}
        <div style={{ width:220 }}>
          <GlassPanel letter="J" title="Quick Actions">
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {[
                {l:"Pending Passes",    icon:FileText,      g:[ACCENT.blue,ACCENT.indigo],    count:S.pending,            href:"/pass_section/approvals"},
                {l:"Company Reg.",      icon:Building2,     g:[ACCENT.emerald,ACCENT.cyan],   count:S.companyPending,     href:"/pass_section/companies"},
                {l:"Reverted",         icon:RotateCcw,     g:[ACCENT.amber,ACCENT.orange],   count:null,                 href:"/pass_section/approvals?filter=reverted"},
                {l:"Blacklist",        icon:Shield,        g:[ACCENT.violet,ACCENT.indigo],  count:S.blPendingApproval,  href:"/pass_section/blacklist"},
                {l:"Profile Upd.",     icon:UserCheck,     g:[ACCENT.sky,ACCENT.blue],       count:S.profilePending,     href:"/pass_section/companies?tab=profile_updates"},
                {l:"Overstay Exc.",    icon:AlertTriangle, g:[ACCENT.red,ACCENT.rose],       count:S.overstayExceptions, href:"/atm_dashboard/overstay"},
              ].map(({l,icon:Icon,g,count,href})=>(
                <button key={l} className="action-btn" onClick={()=>router.push(href)} style={{ position:"relative", display:"flex", flexDirection:"column", alignItems:"flex-start", gap:6, padding:"12px 10px", borderRadius:14, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", cursor:"pointer", textAlign:"left" }}>
                  {safeNum(count)>0&&<span style={{ position:"absolute", top:-5, right:-5, minWidth:18, height:18, borderRadius:9, background:"#ef4444", color:"#fff", fontSize:9, fontWeight:900, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 4px", boxShadow:"0 0 10px rgba(239,68,68,0.6)" }}>{safeNum(count)>99?"99+":safeNum(count)}</span>}
                  <div style={{ width:32, height:32, borderRadius:10, background:`linear-gradient(135deg,${g[0]},${g[1]})`, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 4px 14px ${g[0]}50` }}>
                    <Icon size={14} color="#fff" />
                  </div>
                  <span style={{ color:"#94a3b8", fontSize:10, fontWeight:700, lineHeight:1.3 }}>{l}</span>
                  <ExternalLink size={10} color="#1e293b" style={{ marginTop:"auto", alignSelf:"flex-end" }} />
                </button>
              ))}
            </div>
          </GlassPanel>
        </div>
      </div>

      {/* ████████ FOOTER ████████████████████████████████████████████████████ */}
      <div style={{ display:"flex", flexWrap:"wrap", alignItems:"center", justifyContent:"space-between", gap:12, paddingTop:16, borderTop:"1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <Zap size={12} color={ACCENT.amber} />
          <span style={{ color:"#1e293b", fontSize:11, fontWeight:500 }}>Live data · Auto-refreshes every 5 min ·</span>
          <span style={{ color:"#475569", fontSize:11, fontWeight:700 }}>N/A</span>
          <span style={{ color:"#1e293b", fontSize:11 }}>= service offline</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          {Object.entries(online).map(([k,v])=>(
            <div key={k} style={{ display:"flex", alignItems:"center", gap:5 }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:v?"#10b981":"#ef4444", boxShadow:v?"0 0 6px #10b98160":"0 0 6px #ef444460" }} />
              <span style={{ color:v?"#064e3b":"#7f1d1d", fontSize:10, fontWeight:700, textTransform:"capitalize" }}>{k}</span>
            </div>
          ))}
          <button onClick={doRefresh} style={{ color:ACCENT.indigo, fontSize:11, fontWeight:700, background:"none", border:"none", cursor:"pointer", textDecoration:"underline" }}>Refresh now</button>
        </div>
      </div>
    </div>
  );
}

// ─── Glass Panel ──────────────────────────────────────────────────────────────
function GlassPanel({ letter, title, children, color = "indigo", badge, onViewAll, right, className }) {
  const c = ACCENT[color] || ACCENT.indigo;
  return (
    <div className="dash-card hover-lift" style={{ background:"rgba(255,255,255,0.03)", border:`1px solid rgba(255,255,255,0.07)`, borderRadius:20, overflow:"hidden", backdropFilter:"blur(24px)", WebkitBackdropFilter:"blur(24px)" }}>
      {/* Top color bar */}
      <div style={{ height:2, background:`linear-gradient(90deg,${c},${c}00)` }} />
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 18px", borderBottom:"1px solid rgba(255,255,255,0.05)", background:"rgba(255,255,255,0.02)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, overflow:"hidden" }}>
          {letter&&(
            <span style={{ display:"flex", alignItems:"center", justifyContent:"center", width:20, height:20, borderRadius:6, background:`${c}30`, color:c, fontSize:9, fontWeight:900, flexShrink:0, border:`1px solid ${c}40` }}>{letter}</span>
          )}
          <span style={{ color:"#f1f5f9", fontSize:13, fontWeight:800, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{title}</span>
          {badge!==undefined&&badge>0&&(
            <span style={{ minWidth:18, height:18, borderRadius:9, background:"#ef4444", color:"#fff", fontSize:9, fontWeight:900, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 5px", boxShadow:"0 0 10px rgba(239,68,68,0.5)", animation:"pulse-dot 2s ease infinite", flexShrink:0 }}>
              {badge>99?"99+":badge}
            </span>
          )}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
          {right}
          {onViewAll&&(
            <button onClick={onViewAll} style={{ display:"flex", alignItems:"center", gap:3, color:c, fontSize:11, fontWeight:700, background:"none", border:"none", cursor:"pointer", whiteSpace:"nowrap" }}>
              View All <ChevronRight size={12} />
            </button>
          )}
        </div>
      </div>
      <div style={{ padding:"16px 18px" }}>{children}</div>
    </div>
  );
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function LoadSkeletons({ n = 4 }) {
  return <div style={{ display:"flex", flexDirection:"column", gap:10 }}>{Array.from({length:n}).map((_,i)=><Sk key={i} h="38px" r="10px" />)}</div>;
}
function OffCard({ label }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:100, gap:8, color:"#1e293b" }}>
      <WifiOff size={24} style={{ opacity:.3 }} />
      <p style={{ fontSize:12, fontWeight:600, margin:0 }}>{label}</p>
    </div>
  );
}
function ActionPill({ icon: Icon, label, color, alert }) {
  const c = ACCENT[color]||ACCENT.slate;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 10px", borderRadius:10, background:`${c}15`, border:`1px solid ${c}30` }}>
      <Icon size={12} color={c} />
      <span style={{ color:c, fontSize:10, fontWeight:700, flex:1 }}>{label}</span>
      {alert&&<span style={{ width:6, height:6, borderRadius:"50%", background:c, animation:"pulse-dot 1.5s ease infinite", flexShrink:0 }} />}
    </div>
  );
}
