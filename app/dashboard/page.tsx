"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ReactElement } from "react";

type Tab = "overview" | "users" | "jobs" | "spool" | "settings";

interface Application {
  id: number;
  name: string;
  url: string;
  description?: string;
  slug?: string;
}

interface UserProfile {
  UPUPRF?: string;
  UPTEXT?: string;
  UPSTAT?: string;
  [key: string]: any;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// ─── SVG Icons ───────────────────────────────────────────────────────────────
const IconOverview = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);
const IconUsers = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);
const IconJobs = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
  </svg>
);
const IconSpool = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);
const IconSettings = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const IconSearch = () => (
  <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("USER");
  const [applications, setApplications] = useState<Application[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // State for Users view
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);

  // Search filters for simulated lists
  const [jobSearchQuery, setJobSearchQuery] = useState("");
  const [spoolSearchQuery, setSpoolSearchQuery] = useState("");

  // Simulated AS400 Active Jobs
  const [activeJobs, setActiveJobs] = useState([
    { job: "QZDASOINIT", user: "QUSER", type: "PJ", status: "RUN", cpu: "0.2" },
    { job: "QPADEV0001", user: "JONG", type: "INT", status: "DSPW", cpu: "1.4" },
    { job: "QINTER", user: "QSYS", type: "SBS", status: "DEQW", cpu: "0.0" },
    { job: "QBATCH", user: "QSYS", type: "SBS", status: "DEQW", cpu: "0.0" },
    { job: "QZDASOINIT", user: "QUSER", type: "PJ", status: "DEQW", cpu: "0.1" },
    { job: "QSYSOPR", user: "QSYS", type: "BCH", status: "EVTW", cpu: "0.0" },
  ]);

  // Simulated Spool Files
  const spoolFiles = [
    { name: "QPJOBLOG", file: "1", job: "QPADEV0001", user: "JONG", date: "2026-06-22", pages: "4" },
    { name: "QPPGMDMP", file: "3", job: "QBATCH", user: "QSYS", date: "2026-06-21", pages: "12" },
    { name: "QPRINT", file: "1", job: "QZDASOINIT", user: "QUSER", date: "2026-06-22", pages: "1" },
    { name: "QPDSPAJB", file: "2", job: "QPADEV0002", user: "ADMIN", date: "2026-06-20", pages: "7" },
  ];

  const parseToken = (token: string) => {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        window
          .atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
    } else {
      const payload = parseToken(token);
      if (payload?.username) {
        setUsername(payload.username);
      }

      const savedApps = localStorage.getItem("applications");
      if (savedApps) {
        setApplications(JSON.parse(savedApps));
      }
      setLoading(false);
    }
  }, [router]);

  // Handle live users fetching
  const fetchUsersList = async (query = "") => {
    setUsersLoading(true);
    setUsersError("");

    try {
      const params = new URLSearchParams();
      if (query) params.append("useraccount", query);

      const res = await fetch(`${API_URL}/users?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to fetch users");

      const list: UserProfile[] = Array.isArray(data) ? data : (data.data || []);

      setAllUsers(list);
      setTotalPages(Math.ceil(list.length / usersPerPage));
      setCurrentPage(1);
      setUsers(list.slice(0, usersPerPage));
    } catch (err: any) {
      setUsersError(err.message || "An error occurred while fetching users");
    } finally {
      setUsersLoading(false);
    }
  };

  // Change page handler
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    const start = (newPage - 1) * usersPerPage;
    setUsers(allUsers.slice(start, start + usersPerPage));
  };

  // Fetch users when the Users tab becomes active
  useEffect(() => {
    if (activeTab === "users") {
      fetchUsersList();
    }
  }, [activeTab]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/");
  };

  // Filter lists based on search states
  const filteredJobs = activeJobs.filter(j => 
    j.job.toLowerCase().includes(jobSearchQuery.toLowerCase()) || 
    j.user.toLowerCase().includes(jobSearchQuery.toLowerCase()) ||
    j.status.toLowerCase().includes(jobSearchQuery.toLowerCase())
  );

  const filteredSpool = spoolFiles.filter(f => 
    f.name.toLowerCase().includes(spoolSearchQuery.toLowerCase()) || 
    f.job.toLowerCase().includes(spoolSearchQuery.toLowerCase()) ||
    f.user.toLowerCase().includes(spoolSearchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
          <p className="text-slate-400 text-sm tracking-wider animate-pulse">Loading AS400 Portal...</p>
        </div>
      </div>
    );
  }

  // Modern UI colors & icons for applications list
  const getAppMeta = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("email") || n.includes("mail") || n.includes("maildesk")) {
      return {
        bg: "from-blue-500 to-indigo-600 hover:shadow-blue-500/20",
        iconBg: "bg-blue-50/20 text-white",
        desc: "Automated invoice release & check printing synchronization.",
        linkText: "Launch MailDesk",
        tag: "Core Tool"
      };
    }
    if (n.includes("clearance")) {
      return {
        bg: "from-purple-500 to-pink-600 hover:shadow-purple-500/20",
        iconBg: "bg-purple-50/20 text-white",
        desc: "Online clearance, department approvals & processing.",
        linkText: "Clearance Portal",
        tag: "HR"
      };
    }
    if (n.includes("warehouse") || n.includes("inventory")) {
      return {
        bg: "from-amber-500 to-orange-600 hover:shadow-amber-500/20",
        iconBg: "bg-amber-50/20 text-white",
        desc: "Track raw inventories, warehouse dispatches & logs.",
        linkText: "Manage Inventory",
        tag: "Logistics"
      };
    }
    return {
      bg: "from-slate-600 to-slate-800 hover:shadow-slate-600/20",
      iconBg: "bg-slate-50/20 text-white",
      desc: "Legacy internal portal application.",
      linkText: "Open App",
      tag: "System"
    };
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800" style={{ fontFamily: "'Inter', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="w-64 bg-slate-950 text-slate-300 flex flex-col justify-between border-r border-slate-800/60 shadow-2xl shrink-0">
        <div>
          {/* Logo */}
          <div className="p-6 border-b border-slate-800/60 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center font-black text-white text-sm shadow-lg shadow-blue-900/40">AS</div>
            <div>
              <p className="text-sm font-bold text-white tracking-wide leading-tight">AS400 Portal</p>
              <span className="text-xs text-emerald-400 font-mono flex items-center gap-1.5 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                ONLINE
              </span>
            </div>
          </div>

          {/* Nav */}
          <nav className="p-4 space-y-1">
            {([
              { id: "overview", label: "Overview & Apps", Icon: IconOverview },
              { id: "users", label: "User Profiles", Icon: IconUsers },
              { id: "jobs", label: "Active Jobs", Icon: IconJobs },
              { id: "spool", label: "Spooled Files", Icon: IconSpool },
              { id: "settings", label: "System Settings", Icon: IconSettings }
            ] as { id: Tab; label: string; Icon: () => ReactElement }[]).map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg text-sm font-semibold transition-all duration-150 ${activeTab === id
                  ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
                  : "text-slate-400 hover:bg-slate-900 hover:text-white"
                  }`}
              >
                <Icon />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* User profile & Sign Out */}
        <div className="p-4 border-t border-slate-800/60 bg-slate-950 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xs font-mono uppercase">
              {username.slice(0, 2)}
            </div>
            <div className="truncate w-32">
              <p className="text-sm font-semibold text-white truncate leading-snug">{username}</p>
              <p className="text-[10px] text-slate-500 font-mono tracking-wider">AS400 USER</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full rounded-lg bg-slate-900 hover:bg-red-950/60 border border-slate-800 hover:border-red-900/60 py-2.5 text-xs font-semibold text-slate-400 hover:text-red-300 transition-all flex items-center justify-center gap-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main Workspace ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">

        {/* Top Header */}
        <header className="h-14 bg-white border-b border-slate-200 flex justify-between items-center px-8 shadow-sm shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Library Mode</span>
            <span className="bg-blue-50 text-blue-600 text-[10px] px-2 py-0.5 rounded-full border border-blue-100 font-bold tracking-wider">
              QGPL (PRODUCTION)
            </span>
          </div>
          <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
            System Host: <span className="font-mono text-slate-900 font-bold bg-slate-100 px-2 py-0.5 rounded">{process.env.NEXT_PUBLIC_ODBC_SYSTEM || "10.30.0.200"}</span>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-8">

          {/* ── TAB 1: OVERVIEW ── */}
          {activeTab === "overview" && (
            <div className="space-y-8 max-w-6xl mx-auto">
              <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden">
                <div className="relative z-10">
                  <h2 className="text-2xl font-bold text-slate-900 mb-1">Welcome back, {username}</h2>
                  <p className="text-slate-500 text-sm">
                    Select a module card below to begin system transactions or monitor background ODBC services.
                  </p>
                </div>
                <div className="shrink-0 relative z-10">
                  <Link
                    href="/sendemail"
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/20 transition-all text-sm"
                  >
                    Released Checks Sync →
                  </Link>
                </div>
                {/* Subtle graphic background */}
                <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-blue-50/40 to-transparent pointer-events-none" />
              </div>

              {/* Main Apps Grid */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Available Services</h3>
                
                {applications.length === 0 ? (
                  <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                    No active application clearances granted to your group. Please contact the system administrator.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {applications.map((app) => {
                      const meta = getAppMeta(app.name);
                      const isLocalMail = app.name.toLowerCase().includes("mail") || app.name.toLowerCase().includes("email");
                      // Map the MailDesk URL to the local React route if applicable
                      const appUrl = isLocalMail ? "/sendemail" : app.url;

                      return (
                        <div
                          key={app.id}
                          className="group relative flex flex-col justify-between rounded-2xl bg-white border border-slate-200 p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                        >
                          <div className="space-y-4">
                            <div className="flex justify-between items-start">
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                {meta.tag}
                              </span>
                              <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-white ring-1 ring-emerald-300 shadow-sm" />
                            </div>
                            
                            <div>
                              <h4 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                {app.name}
                              </h4>
                              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                {meta.desc}
                              </p>
                            </div>
                          </div>

                          <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
                            <span className="text-[10px] font-mono text-slate-400 truncate w-32">
                              {app.url}
                            </span>
                            <a
                              href={appUrl}
                              className="text-xs font-bold text-blue-600 group-hover:text-blue-800 flex items-center gap-1 hover:underline"
                            >
                              {meta.linkText}
                              <span>→</span>
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB 2: USER PROFILES ── */}
          {activeTab === "users" && (
            <div className="space-y-6 max-w-5xl mx-auto">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                
                {/* Tab Header */}
                <div className="p-6 border-b border-slate-100 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">User Profiles (USRDTA)</h2>
                    <p className="text-slate-500 text-xs mt-0.5">Query account indexes registered under system library QGPL</p>
                  </div>
                  <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
                    <div className="relative w-full sm:w-64">
                      <input
                        type="text"
                        placeholder="Search Profile ID..."
                        className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                        value={userQuery}
                        onChange={(e) => setUserQuery(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") fetchUsersList(userQuery);
                        }}
                      />
                      <div className="absolute left-3 top-2.5">
                        <IconSearch />
                      </div>
                    </div>
                    <button
                      onClick={() => fetchUsersList(userQuery)}
                      disabled={usersLoading}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4.5 py-2 text-sm font-semibold transition-colors disabled:bg-blue-400 shrink-0"
                    >
                      {usersLoading ? "Querying..." : "Search"}
                    </button>
                  </div>
                </div>

                {usersError && (
                  <div className="mx-6 mt-6 bg-red-50 text-red-700 border border-red-200 px-4 py-3 rounded-xl text-xs">
                    {usersError}
                  </div>
                )}

                {/* Table Content */}
                {usersLoading ? (
                  <div className="py-20 text-center text-slate-500">
                    <div className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin mx-auto mb-3" />
                    <p className="text-xs text-slate-400">Querying system tables over ODBC connection...</p>
                  </div>
                ) : users.length === 0 ? (
                  <div className="py-16 text-center text-slate-400">
                    <div className="h-12 w-12 rounded-full bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center mx-auto mb-3">
                      <IconSearch />
                    </div>
                    <p className="text-xs">No active profiles matching the search criteria.</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-100">
                            <th className="p-4">Profile Code (UPUPRF)</th>
                            <th className="p-4">Description Text (UPTEXT)</th>
                            <th className="p-4">Status Flag</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((u, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/60 border-b border-slate-100 transition-colors">
                              <td className="p-4 font-mono font-bold text-blue-600 text-sm">{u.UPUPRF || "N/A"}</td>
                              <td className="p-4 text-slate-700 font-medium text-sm">{u.UPTEXT || u.TEXT || "N/A"}</td>
                              <td className="p-4">
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  u.UPSTAT === "ENABLED" || u.UPSTAT === "*ENABLED" 
                                    ? "bg-emerald-50 text-emerald-700" 
                                    : "bg-slate-100 text-slate-600"
                                }`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${
                                    u.UPSTAT === "ENABLED" || u.UPSTAT === "*ENABLED" 
                                      ? "bg-emerald-500" 
                                      : "bg-slate-400"
                                  }`} />
                                  {u.UPSTAT || "UNKNOWN"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Footer */}
                    {totalPages > 1 && (
                      <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                        <p className="text-xs text-slate-500">
                          Page <span className="font-semibold text-slate-700">{currentPage}</span> of <span className="font-semibold text-slate-700">{totalPages}</span>
                        </p>
                        <div className="flex gap-1.5">
                          <button
                            disabled={currentPage === 1}
                            onClick={() => handlePageChange(currentPage - 1)}
                            className="px-3 py-1 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            Prev
                          </button>
                          <button
                            disabled={currentPage === totalPages}
                            onClick={() => handlePageChange(currentPage + 1)}
                            className="px-3 py-1 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── TAB 3: ACTIVE JOBS ── */}
          {activeTab === "jobs" && (
            <div className="space-y-6 max-w-5xl mx-auto">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                
                {/* Header block */}
                <div className="p-6 border-b border-slate-100 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Work with Active Jobs (WRKACTJOB)</h2>
                    <p className="text-slate-500 text-xs mt-0.5">Real-time status of interactive pools and subsystems</p>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
                    <div className="relative w-full sm:w-56">
                      <input
                        type="text"
                        placeholder="Search Active Jobs..."
                        className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                        value={jobSearchQuery}
                        onChange={(e) => setJobSearchQuery(e.target.value)}
                      />
                      <div className="absolute left-3 top-2 flex items-center">
                        <IconSearch />
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setActiveJobs(jobs => jobs.map(j => ({
                          ...j,
                          cpu: (Math.random() * 2).toFixed(1)
                        })));
                      }}
                      className="border border-slate-300 hover:bg-slate-50 rounded-lg px-4 py-2 text-xs font-semibold transition-colors shrink-0"
                    >
                      Refresh List
                    </button>
                  </div>
                </div>

                {/* Table / grid container */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-100">
                        <th className="p-4">Subsystem / Job</th>
                        <th className="p-4">System User</th>
                        <th className="p-4">Job Type</th>
                        <th className="p-4">Status Flag</th>
                        <th className="p-4">CPU Utilization</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredJobs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-16 text-center text-slate-400 text-xs">
                            No active jobs matching filter criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredJobs.map((j, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60 border-b border-slate-100 transition-colors">
                            <td className="p-4 font-mono font-bold text-slate-900 text-sm">{j.job}</td>
                            <td className="p-4 text-slate-600 font-mono text-xs">{j.user}</td>
                            <td className="p-4 text-slate-500 font-mono text-xs">{j.type}</td>
                            <td className="p-4">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                j.status === "RUN" 
                                  ? "bg-emerald-50 text-emerald-700" 
                                  : "bg-amber-50 text-amber-700"
                              }`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${
                                  j.status === "RUN" ? "bg-emerald-500" : "bg-amber-400"
                                }`} />
                                {j.status}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden shrink-0">
                                  <div 
                                    className="bg-blue-600 h-full rounded-full transition-all duration-300"
                                    style={{ width: `${Math.min(Number(j.cpu) * 50, 100)}%` }}
                                  />
                                </div>
                                <span className="font-mono text-xs text-slate-600 font-semibold">{j.cpu}%</span>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 4: SPOOLED FILES ── */}
          {activeTab === "spool" && (
            <div className="space-y-6 max-w-5xl mx-auto">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                
                {/* Header block */}
                <div className="p-6 border-b border-slate-100 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Work with Spooled Files (WRKSPLF)</h2>
                    <p className="text-slate-500 text-xs mt-0.5">Access printer documents, logs, and compiled logs</p>
                  </div>
                  <div className="relative w-full sm:w-60 shrink-0">
                    <input
                      type="text"
                      placeholder="Search Spool Logs..."
                      className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                      value={spoolSearchQuery}
                      onChange={(e) => setSpoolSearchQuery(e.target.value)}
                    />
                    <div className="absolute left-3 top-2 flex items-center">
                      <IconSearch />
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-100">
                        <th className="p-4">Spool Name</th>
                        <th className="p-4">File ID</th>
                        <th className="p-4">Linked Job</th>
                        <th className="p-4">Owner User</th>
                        <th className="p-4">Created Date</th>
                        <th className="p-4">Pages</th>
                        <th className="p-4 text-right">Download</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSpool.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-16 text-center text-slate-400 text-xs">
                            No spooled logs matching query criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredSpool.map((f, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60 border-b border-slate-100 transition-colors">
                            <td className="p-4 font-mono font-bold text-slate-800 text-sm flex items-center gap-2">
                              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              {f.name}
                            </td>
                            <td className="p-4 text-slate-500 font-mono text-xs">{f.file}</td>
                            <td className="p-4 text-slate-600 font-mono text-xs">{f.job}</td>
                            <td className="p-4 text-slate-600 text-sm">{f.user}</td>
                            <td className="p-4 text-slate-500 font-mono text-xs">{f.date}</td>
                            <td className="p-4 text-slate-500 font-mono text-xs">{f.pages}</td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => alert(`Opening Spool ${f.name} in PDF format`)}
                                className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                View PDF
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 5: SYSTEM SETTINGS ── */}
          {activeTab === "settings" && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">System Information</h2>
                  <p className="text-slate-500 text-xs mt-0.5">ODBC communication and default settings</p>
                </div>

                <div className="divide-y divide-slate-100">
                  {[
                    { label: "Default System Library", val: "QGPL", type: "mono" },
                    { label: "ODBC System Target", val: process.env.NEXT_PUBLIC_ODBC_SYSTEM || "10.30.0.200", type: "mono" },
                    { label: "ODBC Driver Installed", val: "iSeries Access ODBC Driver", type: "text" },
                    { label: "Portal Connection Port", val: "3008", type: "mono" },
                    { label: "Session Expiration Mode", val: "1 Hour (JWT Tokens)", type: "text" },
                    { label: "SSL Validation", val: "ENABLED", type: "badge" },
                  ].map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center py-3.5">
                      <span className="font-semibold text-slate-700 text-sm">{item.label}</span>
                      {item.type === "mono" && (
                        <span className="font-mono text-slate-500 text-xs bg-slate-150 px-2 py-0.5 rounded">{item.val}</span>
                      )}
                      {item.type === "text" && (
                        <span className="text-slate-600 text-sm font-medium">{item.val}</span>
                      )}
                      {item.type === "badge" && (
                        <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100 px-2.5 py-0.5 rounded-full">
                          {item.val}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

    </div>
  );
}
