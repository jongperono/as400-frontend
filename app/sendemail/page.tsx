"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ReactElement } from "react";
import { apiFetch } from "@/lib/apiFetch";

type Tab = "dashboard" | "generate" | "headers" | "details" | "notify";

interface Application { id: number; name: string; url: string; }

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function parseToken(token: string) {
    try {
        const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        return JSON.parse(decodeURIComponent(window.atob(b64).split("").map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")));
    } catch { return null; }
}

function formatForAPI(dateInput: string): string {
    const [y, m, d] = dateInput.split("-");
    return `${Number(m)}/${Number(d)}/${y}`;
}

function formatDisplay(dateInput: string): string {
    if (!dateInput) return "";
    const [y, m, d] = dateInput.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[Number(m) - 1]} ${Number(d)}, ${y}`;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(value);
};

const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
    } catch {
        return dateStr;
    }
};

// ─── Icons ───────────────────────────────────────────────────────────────────
const IconDashboard = () => (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
);
const IconMail = () => (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
);
const IconHeaders = () => (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);
const IconDetails = () => (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
);
const IconCheck = () => (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
);
const IconSpinner = () => (
    <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
);
const IconSearch = () => (
    <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

// ─── Step indicator inside dialog ────────────────────────────────────────────
const steps = [
    { label: "Connect to AS400", pct: 20 },
    { label: "Fetch released checks", pct: 45 },
    { label: "Save payment headers", pct: 70 },
    { label: "Save payment details", pct: 90 },
    { label: "Complete", pct: 100 },
];

export default function SendEmailPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [username, setUsername] = useState("USER");
    const [activeTab, setActiveTab] = useState<Tab>("dashboard");

    const [releaseDate, setReleaseDate] = useState("");
    const [showDialog, setShowDialog] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusMsg, setStatusMsg] = useState("");
    const [done, setDone] = useState(false);
    const [lastResult, setLastResult] = useState<{ headersProcessed: number; detailsProcessed: number } | null>(null);
    const [error, setError] = useState("");

    // Headers pagination & search
    const [headers, setHeaders] = useState<any[]>([]);
    const [headersSearch, setHeadersSearch] = useState("");
    const [headersLoading, setHeadersLoading] = useState(false);
    const [headersPage, setHeadersPage] = useState(1);
    const [headersTotal, setHeadersTotal] = useState(0);
    const headersLimit = 10;

    // Resend state: tracks which check numbers are currently being resent
    // Using composite key: "checkNumber-vendorNumber"
    const [resendingChecks, setResendingChecks] = useState<Record<string, boolean>>({});
    const [resendResults, setResendResults] = useState<Record<string, { ok: boolean; msg: string }>>({});

    // Details pagination & search
    const [details, setDetails] = useState<any[]>([]);
    const [detailsSearch, setDetailsSearch] = useState("");
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [detailsPage, setDetailsPage] = useState(1);
    const [detailsTotal, setDetailsTotal] = useState(0);
    const detailsLimit = 10;

    // Email notifications state
    const [notifyDate, setNotifyDate] = useState("");
    const [notifyLoading, setNotifyLoading] = useState(false);
    const [notifyResult, setNotifyResult] = useState<{ total: number; sent: number; skipped: number; failed: number; logs: string[] } | null>(null);
    const [notifyError, setNotifyError] = useState("");

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) { router.push("/"); return; }
        const payload = parseToken(token);
        if (payload?.username) setUsername(payload.username);
        setLoading(false);
    }, [router]);

    const handleLogout = () => { localStorage.removeItem("token"); router.push("/"); };

    const openDialog = () => {
        setDone(false);
        setError("");
        setProgress(0);
        setStatusMsg("");
        setShowDialog(true);
    };

    const closeDialog = () => {
        if (processing) return;
        setShowDialog(false);
    };

    const handleSubmit = async () => {
        if (!releaseDate) { setError("Please select a release date."); return; }
        setError("");
        setProcessing(true);

        const tick = (p: number, msg: string) => { setProgress(p); setStatusMsg(msg); };

        try {
            tick(20, "Connecting to AS400...");
            const res = await apiFetch(`${API_URL}/send-email/released-checks`, {
                method: "POST",
                body: JSON.stringify({ date: formatForAPI(releaseDate) }),
            });
            tick(70, "Saving records to database...");
            if (!res.ok) {
                const e = await res.json();
                throw new Error(e.error || "Request failed");
            }
            const result = await res.json();
            tick(100, `Done! ${result.headersProcessed} checks, ${result.detailsProcessed} detail lines saved.`);
            setLastResult(result);
            setDone(true);
        } catch (err: any) {
            setError(err.message || "An error occurred");
            setProgress(0);
            setStatusMsg("");
        } finally {
            setProcessing(false);
        }
    };

    // ─── Send notifications ───────────────────────────────────────────────────
    const handleSendNotifications = async () => {
        if (!notifyDate) { setNotifyError("Please select a release date."); return; }
        setNotifyError("");
        setNotifyResult(null);
        setNotifyLoading(true);
        try {
            const res = await apiFetch(`${API_URL}/send-email/send-notifications`, {
                method: "POST",
                body: JSON.stringify({ date: notifyDate }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Request failed");
            setNotifyResult(data);
        } catch (err: any) {
            setNotifyError(err.message || "An error occurred");
        } finally {
            setNotifyLoading(false);
        }
    };

    // ─── Resend single check for specific vendor ─────────────────────────────
    const handleResend = async (checkNumber: string, vendorNumber: string) => {
        const key = `${checkNumber}-${vendorNumber}`;
        setResendingChecks(prev => ({ ...prev, [key]: true }));
        setResendResults(prev => { const n = { ...prev }; delete n[key]; return n; });
        try {
            const res = await apiFetch(
                `${API_URL}/send-email/resend/${encodeURIComponent(checkNumber)}/${encodeURIComponent(vendorNumber)}`, 
                { method: "POST" }
            );
            const data = await res.json();
            if (!res.ok) throw new Error((data as { error?: string }).error || "Resend failed");
            setResendResults(prev => ({ ...prev, [key]: { ok: true, msg: "Sent" } }));
            fetchHeadersList(headersPage, headersSearch);
        } catch (err: any) {
            setResendResults(prev => ({ ...prev, [key]: { ok: false, msg: err.message || "Error" } }));
        } finally {
            setResendingChecks(prev => ({ ...prev, [key]: false }));
        }
    };

    // ─── Fetch functions ─────────────────────────────────────────────────────
    const fetchHeadersList = async (page = 1, query = "") => {
        setHeadersLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(page),
                limit: String(headersLimit),
                search: query,
            });
            const res = await apiFetch(`${API_URL}/send-email/payment-headers?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to load headers");
            const data = await res.json();
            setHeaders(data.rows || []);
            setHeadersTotal(data.total || 0);
            setHeadersPage(page);
        } catch (err) {
            console.error(err);
        } finally {
            setHeadersLoading(false);
        }
    };

    const fetchDetailsList = async (page = 1, query = "") => {
        setDetailsLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(page),
                limit: String(detailsLimit),
                search: query,
            });
            const res = await apiFetch(`${API_URL}/send-email/payment-details?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to load details");
            const data = await res.json();
            setDetails(data.rows || []);
            setDetailsTotal(data.total || 0);
            setDetailsPage(page);
        } catch (err) {
            console.error(err);
        } finally {
            setDetailsLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === "headers") {
            fetchHeadersList(1, headersSearch);
        } else if (activeTab === "details") {
            fetchDetailsList(1, detailsSearch);
        }
    }, [activeTab]);

    const viewDetailsForCheck = (checkNo: string) => {
        setDetailsSearch(checkNo);
        setActiveTab("details");
        fetchDetailsList(1, checkNo);
    };

    if (loading) return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
            <div className="flex flex-col items-center gap-4">
                <div className="h-10 w-10 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
                <p className="text-slate-400 text-sm tracking-wider animate-pulse">Loading AS400 Portal...</p>
            </div>
        </div>
    );

    return (
        <div className="flex min-h-screen bg-slate-100 text-slate-800" style={{ fontFamily: "'Inter', sans-serif" }}>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

            {/* ── Sidebar ─────────────────────────────────────────── */}
            <aside className="w-64 bg-slate-950 text-slate-300 flex flex-col justify-between border-r border-slate-800/60 shadow-2xl shrink-0">
                <div>
                    {/* Logo */}
                    <div className="p-6 border-b border-slate-800 flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center font-black text-white text-sm shadow-lg shadow-blue-900/40">AS</div>
                        <div>
                            <Link href="/dashboard">
                                <p className="text-sm font-bold text-white tracking-wide leading-tight">AS400 Portal</p>
                                <span className="text-xs text-emerald-400 font-mono flex items-center gap-1.5 mt-0.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                                    ONLINE
                                </span>
                            </Link>
                        </div>
                    </div>

                    {/* Module label */}
                    <div className="px-4 pt-5 pb-2">
                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-600">Send Email Module</p>
                    </div>

                    {/* Nav */}
                    <nav className="px-3 space-y-1">
                        {([
                            { id: "dashboard", label: "Dashboard", Icon: IconDashboard },
                            { id: "generate", label: "Generate Email List", Icon: IconMail },
                            { id: "headers", label: "Payment Headers", Icon: IconHeaders },
                            { id: "details", label: "Payment Details", Icon: IconDetails },
                            { id: "notify", label: "Email Notifications", Icon: IconMail },
                        ] as { id: Tab; label: string; Icon: () => ReactElement }[]).map(({ id, label, Icon }) => (
                            <button key={id} onClick={() => setActiveTab(id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 ${activeTab === id
                                    ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
                                    : "text-slate-400 hover:bg-slate-900 hover:text-white"}`}>
                                <Icon />
                                {label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* User + logout */}
                <div className="p-4 border-t border-slate-800 space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xs font-mono uppercase">
                            {username.slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{username}</p>
                            <p className="text-xs text-slate-500 font-mono">AS400 USER</p>
                        </div>
                    </div>
                    <button onClick={handleLogout}
                        className="w-full rounded-lg bg-slate-800 hover:bg-red-900/60 border border-slate-700 hover:border-red-800 py-2 text-xs font-semibold text-slate-400 hover:text-red-300 transition-all flex items-center justify-center gap-2">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* ── Main area ────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-h-screen overflow-hidden">

                {/* Top bar */}
                <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm shrink-0">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Link href="/dashboard" className="hover:text-blue-600 transition-colors">Portal</Link>
                        <span>/</span>
                        <span className="font-semibold text-slate-800">Send Email</span>
                        {activeTab !== "dashboard" && (
                            <>
                                <span>/</span>
                                <span className="text-blue-600 font-semibold uppercase text-xs tracking-wider">
                                    {activeTab}
                                </span>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        {process.env.NEXT_PUBLIC_ODBC_SYSTEM || "10.30.0.200"}
                    </div>
                </header>

                <main className="flex-1 overflow-auto p-8 bg-slate-50">

                    {/* ── DASHBOARD TAB ── */}
                    {activeTab === "dashboard" && (
                        <div className="space-y-8 max-w-5xl mx-auto">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">Send Email Dashboard</h1>
                                <p className="text-slate-500 text-sm mt-1">Synchronize released checks from AS400 and manage vendor email notifications.</p>
                            </div>

                            {/* Stat cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                                {[
                                    { label: "AS400 Connection", value: "Active", sub: process.env.NEXT_PUBLIC_ODBC_SYSTEM || "10.30.0.200", color: "emerald" },
                                    { label: "Last Sync", value: lastResult ? `${lastResult.headersProcessed} checks` : "—", sub: lastResult ? `${lastResult.detailsProcessed} detail lines` : "No sync yet", color: "blue" },
                                    { label: "Module Status", value: "Ready", sub: "Awaiting release date", color: "violet" },
                                ].map((card) => (
                                    <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col gap-2">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{card.label}</p>
                                        <p className={`text-2xl font-bold ${card.color === "emerald" ? "text-emerald-600" : card.color === "blue" ? "text-blue-600" : "text-violet-600"}`}>{card.value}</p>
                                        <p className="text-xs text-slate-500 font-mono">{card.sub}</p>
                                    </div>
                                ))}
                            </div>

                            {/* How it works */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                                <h2 className="text-base font-bold text-slate-800 mb-4">How the sync works</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                                    {[
                                        { n: 1, title: "Select Date", desc: "Choose a release date to pull checks from AS400." },
                                        { n: 2, title: "Fetch Checks", desc: "Queries APHIST + TBL_CHECK_PRINT_CONTROL on AS400." },
                                        { n: 3, title: "Upsert Headers", desc: "Bulk upserts payment headers into MySQL." },
                                        { n: 4, title: "Fetch Details", desc: "Pulls invoice lines per check from AS400." },
                                        { n: 5, title: "Save & Commit", desc: "Bulk inserts details and commits the transaction." },
                                    ].map(step => (
                                        <div key={step.n} className="flex flex-col items-center text-center gap-2">
                                            <div className="h-9 w-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shadow">{step.n}</div>
                                            <p className="text-xs font-semibold text-slate-700">{step.title}</p>
                                            <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Quick action */}
                            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 flex items-center justify-between shadow-lg shadow-blue-900/20">
                                <div>
                                    <p className="text-white font-bold text-lg">Ready to sync?</p>
                                    <p className="text-blue-100 text-sm mt-1">Select a release date and process payment records.</p>
                                </div>
                                <button onClick={() => setActiveTab("generate")}
                                    className="bg-white text-blue-700 font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-50 transition-colors shadow text-sm shrink-0">
                                    Go to Generate →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── GENERATE TAB ── */}
                    {activeTab === "generate" && (
                        <div className="max-w-lg mx-auto space-y-6">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">Generate Email List</h1>
                                <p className="text-slate-500 text-sm mt-1">Select a release date to pull and sync released checks from AS400.</p>
                            </div>

                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Release Date</label>
                                    <input
                                        id="release-date-input"
                                        type="date"
                                        value={releaseDate}
                                        onChange={e => setReleaseDate(e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                    />
                                    {releaseDate && (
                                        <p className="mt-1.5 text-xs text-slate-500">Selected: <span className="font-semibold text-blue-600">{formatDisplay(releaseDate)}</span></p>
                                    )}
                                </div>

                                <button
                                    id="generate-email-btn"
                                    disabled={!releaseDate}
                                    onClick={openDialog}
                                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-all shadow-md shadow-blue-900/20 text-sm">
                                    <IconMail />
                                    Generate Email List
                                </button>
                            </div>

                            {lastResult && (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex items-start gap-3">
                                    <div className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                                        <IconCheck />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-emerald-800 text-sm">Last sync successful</p>
                                        <p className="text-emerald-700 text-xs mt-0.5">{lastResult.headersProcessed} payment headers · {lastResult.detailsProcessed} detail lines</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── PAYMENT HEADERS TAB ── */}
                    {activeTab === "headers" && (
                        <div className="space-y-6 max-w-6xl mx-auto">
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

                                {/* Search Header */}
                                <div className="p-6 border-b border-slate-100 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900">Payment Headers</h2>
                                        <p className="text-slate-500 text-xs mt-0.5">Check batches synchronized from AS400</p>
                                    </div>
                                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                                        <div className="relative w-full sm:w-64">
                                            <input
                                                type="text"
                                                placeholder="Search Check / Vendor / Company..."
                                                className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                                value={headersSearch}
                                                onChange={e => setHeadersSearch(e.target.value)}
                                                onKeyDown={e => { if (e.key === "Enter") fetchHeadersList(1, headersSearch); }}
                                            />
                                            <div className="absolute left-3 top-2.5"><IconSearch /></div>
                                        </div>
                                        <button
                                            onClick={() => fetchHeadersList(1, headersSearch)}
                                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors shrink-0"
                                        >
                                            Search
                                        </button>
                                    </div>
                                </div>

                                {/* Table content */}
                                {headersLoading ? (
                                    <div className="py-20 text-center text-slate-500">
                                        <div className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin mx-auto mb-3" />
                                        <p className="text-xs text-slate-400">Loading headers from MySQL database...</p>
                                    </div>
                                ) : headers.length === 0 ? (
                                    <div className="py-16 text-center text-slate-400">
                                        <div className="h-12 w-12 rounded-full bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center mx-auto mb-3">
                                            <IconSearch />
                                        </div>
                                        <p className="text-xs">No payment batch headers found.</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-100">
                                                        <th className="p-4">Check Number</th>
                                                        <th className="p-4">Vendor</th>
                                                        <th className="p-4">Company</th>
                                                        <th className="p-4">Email Address</th>
                                                        <th className="p-4 text-right">Total Net</th>
                                                        <th className="p-4">Release Date</th>
                                                        <th className="p-4 text-center">Email Status</th>
                                                        <th className="p-4 text-center">Invoice Lines</th>
                                                        <th className="p-4 text-center">Resend</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {headers.map((h, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-50/60 border-b border-slate-100 transition-colors">
                                                            <td className="p-4 font-mono font-bold text-blue-600 text-sm">{h.check_number}</td>
                                                            <td className="p-4">
                                                                <p className="text-sm font-semibold text-slate-800">{h.vendor_name}</p>
                                                                <p className="text-[10px] text-slate-400 font-mono">ID: {h.vendor_number}</p>
                                                            </td>
                                                            <td className="p-4">
                                                                <p className="text-sm font-semibold text-slate-800">{h.company_name}</p>
                                                                <p className="text-[10px] text-slate-400 font-mono">Code: {h.company_number}</p>
                                                            </td>
                                                            <td className="p-4 text-slate-600 text-sm truncate max-w-xs">{h.email_address || "—"}</td>
                                                            <td className="p-4 text-right font-mono font-bold text-slate-900 text-sm">{formatCurrency(h.total_amount)}</td>
                                                            <td className="p-4 text-slate-500 text-xs font-mono">{formatDate(h.release_date)}</td>
                                                            <td className="p-4 text-center">
                                                                {(() => {
                                                                    const s = h.status || "pending";
                                                                    const badge: Record<string, { bg: string; text: string; dot: string; label: string }> = {
                                                                        sent: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Sent" },
                                                                        failed: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500", label: "Failed" },
                                                                        skipped: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400", label: "Skipped" },
                                                                        pending: { bg: "bg-slate-100", text: "text-slate-500", dot: "bg-slate-400", label: "Pending" },
                                                                    };
                                                                    const b = badge[s] ?? badge.pending;
                                                                    return (
                                                                        <div className="flex flex-col items-center gap-1">
                                                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${b.bg} ${b.text}`}>
                                                                                <span className={`h-1.5 w-1.5 rounded-full ${b.dot}`} />
                                                                                {b.label}
                                                                            </span>
                                                                            {h.sent_at && (
                                                                                <span className="text-[10px] text-slate-400 font-mono">{formatDate(h.sent_at)}</span>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </td>
                                                            <td className="p-4 text-center">
                                                                <button
                                                                    onClick={() => viewDetailsForCheck(h.check_number)}
                                                                    className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline px-3 py-1 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                                                >
                                                                    View Details →
                                                                </button>
                                                            </td>
                                                            <td className="p-4 text-center">
                                                                <div className="flex flex-col items-center gap-1">
                                                                    <button
                                                                        onClick={() => handleResend(h.check_number, h.vendor_number)}
                                                                        disabled={resendingChecks[`${h.check_number}-${h.vendor_number}`]}
                                                                        title={`Resend email to ${h.vendor_name} (${h.vendor_number})`}
                                                                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-700 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                                    >
                                                                        {resendingChecks[`${h.check_number}-${h.vendor_number}`] ? (
                                                                            <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                                                            </svg>
                                                                        ) : (
                                                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                                            </svg>
                                                                        )}
                                                                        {resendingChecks[`${h.check_number}-${h.vendor_number}`] ? "Sending…" : "Resend"}
                                                                    </button>
                                                                    {resendResults[`${h.check_number}-${h.vendor_number}`] && (
                                                                        <span className={`text-[10px] font-semibold ${resendResults[`${h.check_number}-${h.vendor_number}`].ok ? "text-emerald-600" : "text-red-500"}`}>
                                                                            {resendResults[`${h.check_number}-${h.vendor_number}`].ok ? "✓ Sent" : `✗ ${resendResults[`${h.check_number}-${h.vendor_number}`].msg}`}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Pagination Footer */}
                                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                                            <p className="text-xs text-slate-500">
                                                Showing page <span className="font-semibold text-slate-700">{headersPage}</span> of <span className="font-semibold text-slate-700">{Math.ceil(headersTotal / headersLimit) || 1}</span> ({headersTotal} items)
                                            </p>
                                            <div className="flex gap-1.5">
                                                <button
                                                    disabled={headersPage === 1}
                                                    onClick={() => fetchHeadersList(headersPage - 1, headersSearch)}
                                                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    Previous
                                                </button>
                                                <button
                                                    disabled={headersPage >= Math.ceil(headersTotal / headersLimit)}
                                                    onClick={() => fetchHeadersList(headersPage + 1, headersSearch)}
                                                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    Next
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── PAYMENT DETAILS TAB ── */}
                    {activeTab === "details" && (
                        <div className="space-y-6 max-w-6xl mx-auto">
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

                                {/* Search Header */}
                                <div className="p-6 border-b border-slate-100 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900">Payment Details</h2>
                                        <p className="text-slate-500 text-xs mt-0.5">Individual invoice lines synchronized from AS400</p>
                                    </div>
                                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                                        <div className="relative w-full sm:w-64">
                                            <input
                                                type="text"
                                                placeholder="Search Check / Invoice / Store..."
                                                className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                                value={detailsSearch}
                                                onChange={e => setDetailsSearch(e.target.value)}
                                                onKeyDown={e => { if (e.key === "Enter") fetchDetailsList(1, detailsSearch); }}
                                            />
                                            <div className="absolute left-3 top-2.5"><IconSearch /></div>
                                        </div>
                                        <button
                                            onClick={() => fetchDetailsList(1, detailsSearch)}
                                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors shrink-0"
                                        >
                                            Search
                                        </button>
                                        {detailsSearch && (
                                            <button
                                                onClick={() => {
                                                    setDetailsSearch("");
                                                    fetchDetailsList(1, "");
                                                }}
                                                className="border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg px-3 py-2 text-sm font-semibold transition-colors shrink-0"
                                            >
                                                Clear
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Table content */}
                                {detailsLoading ? (
                                    <div className="py-20 text-center text-slate-500">
                                        <div className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin mx-auto mb-3" />
                                        <p className="text-xs text-slate-400">Loading invoice details from MySQL database...</p>
                                    </div>
                                ) : details.length === 0 ? (
                                    <div className="py-16 text-center text-slate-400">
                                        <div className="h-12 w-12 rounded-full bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center mx-auto mb-3">
                                            <IconSearch />
                                        </div>
                                        <p className="text-xs">No invoice detail lines found.</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-100">
                                                        <th className="p-4">Invoice Number</th>
                                                        <th className="p-4">Check Number</th>
                                                        <th className="p-4">Store Name</th>
                                                        <th className="p-4 text-right">Net Amount</th>
                                                        <th className="p-4">Invoice Date</th>
                                                        <th className="p-4">PO Number</th>
                                                        <th className="p-4">Rebate Type</th>
                                                        <th className="p-4">Company</th>
                                                        <th className="p-4">Vendor</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {details.map((d, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-50/60 border-b border-slate-100 transition-colors">
                                                            <td className="p-4 font-mono font-bold text-slate-900 text-sm">{d.invoice_number}</td>
                                                            <td className="p-4 font-mono text-blue-600 text-sm">{d.check_number}</td>
                                                            <td className="p-4 text-slate-700 text-sm font-semibold">{d.store_name}</td>
                                                            <td className="p-4 text-right font-mono font-bold text-slate-900 text-sm">{formatCurrency(d.total_net)}</td>
                                                            <td className="p-4 text-slate-500 text-xs font-mono">{formatDate(d.invoice_date)}</td>
                                                            <td className="p-4 font-mono text-slate-600 text-xs">{d.po_number || "—"}</td>
                                                            <td className="p-4 text-xs">
                                                                {d.rebate_type
                                                                    ? <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 text-[11px] font-semibold border border-violet-100">{d.rebate_type}</span>
                                                                    : <span className="text-slate-300">—</span>
                                                                }
                                                            </td>
                                                            <td className="p-4 text-slate-600 font-mono text-xs">Code: {d.company_number}</td>
                                                            <td className="p-4 text-slate-600 font-mono text-xs">ID: {d.vendor_number}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Pagination Footer */}
                                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                                            <p className="text-xs text-slate-500">
                                                Showing page <span className="font-semibold text-slate-700">{detailsPage}</span> of <span className="font-semibold text-slate-700">{Math.ceil(detailsTotal / detailsLimit) || 1}</span> ({detailsTotal} items)
                                            </p>
                                            <div className="flex gap-1.5">
                                                <button
                                                    disabled={detailsPage === 1}
                                                    onClick={() => fetchDetailsList(detailsPage - 1, detailsSearch)}
                                                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    Previous
                                                </button>
                                                <button
                                                    disabled={detailsPage >= Math.ceil(detailsTotal / detailsLimit)}
                                                    onClick={() => fetchDetailsList(detailsPage + 1, detailsSearch)}
                                                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    Next
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                    {/* ── EMAIL NOTIFICATIONS TAB ── */}
                    {activeTab === "notify" && (
                        <div className="max-w-2xl mx-auto space-y-6">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">Email Notifications</h1>
                                <p className="text-slate-500 text-sm mt-1">Send payment notification emails to vendors for a selected release date.</p>
                            </div>

                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Release Date</label>
                                    <input
                                        type="date"
                                        value={notifyDate}
                                        onChange={e => { setNotifyDate(e.target.value); setNotifyError(""); setNotifyResult(null); }}
                                        className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                    />
                                    {notifyDate && (
                                        <p className="mt-1.5 text-xs text-slate-500">Selected: <span className="font-semibold text-blue-600">{formatDisplay(notifyDate)}</span></p>
                                    )}
                                </div>

                                {notifyError && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{notifyError}</div>
                                )}

                                <button
                                    disabled={!notifyDate || notifyLoading}
                                    onClick={handleSendNotifications}
                                    className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-all shadow-md text-sm">
                                    {notifyLoading ? <><IconSpinner /> Sending Emails...</> : <><IconMail /> Send Notifications</>}
                                </button>
                            </div>

                            {/* Results card */}
                            {notifyResult && (
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="p-5 border-b border-slate-100">
                                        <p className="font-bold text-slate-800 text-sm">Notification Results — {formatDisplay(notifyDate)}</p>
                                    </div>
                                    <div className="grid grid-cols-4 divide-x divide-slate-100">
                                        {[
                                            { label: "Total", value: notifyResult.total, color: "text-slate-800" },
                                            { label: "Sent", value: notifyResult.sent, color: "text-emerald-600" },
                                            { label: "Skipped", value: notifyResult.skipped, color: "text-amber-600" },
                                            { label: "Failed", value: notifyResult.failed, color: "text-red-600" },
                                        ].map(stat => (
                                            <div key={stat.label} className="py-5 flex flex-col items-center gap-1">
                                                <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                                                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">{stat.label}</p>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Log viewer */}
                                    <div className="border-t border-slate-100 p-4">
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Activity Log</p>
                                        <div className="bg-slate-950 rounded-lg p-4 max-h-64 overflow-y-auto font-mono text-xs space-y-1">
                                            {notifyResult.logs.map((line, i) => {
                                                const color = line.startsWith("[SENT]") ? "text-emerald-400"
                                                    : line.startsWith("[FAIL]") ? "text-red-400"
                                                        : line.startsWith("[SKIP]") ? "text-amber-400"
                                                            : "text-slate-400";
                                                return <p key={i} className={color}>{line}</p>;
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>

            {/* ── Confirm / Progress Dialog ─────────────────────── */}
            {showDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">

                        {/* Header */}
                        <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-5">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                                    <IconMail />
                                </div>
                                <div>
                                    <p className="text-white font-bold text-sm">Process Released Checks</p>
                                    <p className="text-slate-400 text-xs font-mono mt-0.5">{formatDisplay(releaseDate)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-5">
                            {!done && !processing && !error && (
                                <div className="space-y-3">
                                    <p className="text-sm text-slate-600">This will perform the following steps:</p>
                                    <div className="space-y-2">
                                        {steps.slice(0, -1).map(s => (
                                            <div key={s.label} className="flex items-center gap-2.5 text-sm text-slate-600">
                                                <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                                                {s.label}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {processing && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                                        <IconSpinner />
                                        {statusMsg}
                                    </div>
                                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                        <div className="h-full bg-blue-600 transition-all duration-500 rounded-full" style={{ width: `${progress}%` }} />
                                    </div>
                                    <p className="text-xs text-slate-400 text-right">{progress}%</p>
                                </div>
                            )}

                            {done && lastResult && (
                                <div className="flex flex-col items-center gap-3 py-2">
                                    <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                                        <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <div className="text-center">
                                        <p className="font-bold text-slate-800">Sync Complete</p>
                                        <p className="text-sm text-slate-500 mt-1">{lastResult.headersProcessed} checks · {lastResult.detailsProcessed} detail lines saved</p>
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
                                    <p className="font-semibold mb-1">Error</p>
                                    <p>{error}</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 pb-6 flex gap-3 justify-end">
                            <button
                                id="dialog-cancel-btn"
                                disabled={processing}
                                onClick={closeDialog}
                                className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors">
                                {done ? "Close" : "Cancel"}
                            </button>
                            {!done && (
                                <button
                                    id="dialog-process-btn"
                                    disabled={processing || !releaseDate}
                                    onClick={handleSubmit}
                                    className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold transition-colors flex items-center gap-2">
                                    {processing ? <><IconSpinner /> Processing...</> : "Process"}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
