"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ReactElement } from "react";

type Tab = "dashboard" | "generate";

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
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${months[Number(m)-1]} ${Number(d)}, ${y}`;
}

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
            const res = await fetch(`${API_URL}/send-email/released-checks`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
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

    if (loading) return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
            <div className="flex flex-col items-center gap-4">
                <div className="h-10 w-10 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
                <p className="text-slate-400 text-sm tracking-wider animate-pulse">Loading AS400 Portal...</p>
            </div>
        </div>
    );

    return (
        <div className="flex min-h-screen bg-slate-100 text-slate-800">

            {/* ── Sidebar ─────────────────────────────────────────── */}
            <aside className="w-64 bg-slate-950 text-slate-300 flex flex-col justify-between border-r border-slate-800/60 shadow-2xl">
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
                        ] as { id: Tab; label: string; Icon: () => ReactElement }[]).map(({ id, label, Icon }) => (
                            <button key={id} onClick={() => setActiveTab(id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${activeTab === id
                                    ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
                                    : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}>
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
                        {activeTab === "generate" && <><span>/</span><span className="text-blue-600 font-semibold">Generate</span></>}
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
