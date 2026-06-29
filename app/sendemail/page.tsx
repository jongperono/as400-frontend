"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Define the modules/apps available in the sidebar
type Tab = "overview" | "users" | "jobs" | "spool" | "settings";

interface Application {
    id: number;
    name: string;
    url: string;
}

interface UserProfile {
    UPUPRF?: string;
    UPTEXT?: string;
    [key: string]: any;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function SendEmailPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [username, setUsername] = useState("USER");
    const [applications, setApplications] = useState<Application[]>([]);
    const [activeTab, setActiveTab] = useState<Tab>("overview");

    // State for Users view
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [userQuery, setUserQuery] = useState("");
    const [usersLoading, setUsersLoading] = useState(false);
    const [usersError, setUsersError] = useState("");

    const [releaseDate, setReleaseDate] = useState("");
    const [showDialog, setShowDialog] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState("");

    const formatReleaseDate = (releaseDate: string): string => {
        const [year, month, day] = releaseDate.split("-");

        return `${Number(month)}/${Number(day)}/${year}`;
    };
    // Simulated AS400 Active Jobs
    const formattedDate = formatReleaseDate(releaseDate);

    const handleSubmit = async () => {
        if (!releaseDate) {
            alert("Please select a release date.");
            return;
        }

        try {
            setProcessing(true);
            setProgress(20);
            setStatus("Connecting to AS400...");

            const postRes = await fetch(
                `${API_URL}/send-email/released-checks`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ date: formattedDate }),
                }
            );

            if (!postRes.ok) {
                const err = await postRes.json();
                throw new Error(err.error || "Failed to process released checks");
            }

            setProgress(80);
            setStatus("Saving to database...");

            const result = await postRes.json();

            setProgress(100);
            setStatus(
                `Done. ${result.headersProcessed} checks, ${result.detailsProcessed} detail lines saved.`
            );

            setTimeout(() => {
                setShowDialog(false);
                setProcessing(false);
                setProgress(0);
                setStatus("");
            }, 2000);

        } catch (err: any) {
            alert(err.message);
            setProcessing(false);
            setProgress(0);
            setStatus("");
        }
    };
    const [releasedChecks, setReleasedChecks] = useState([
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

    // Helper function to decode JWT client-side
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
            console.log(savedApps, 'apps');

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
            const url = query
                ? `${API_URL}/users?useraccount=${encodeURIComponent(query)}`
                : `${API_URL}/users`;
            const res = await fetch(url);
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to fetch users");
            }
            setUsers(Array.isArray(data) ? data : []);
        } catch (err: any) {
            setUsersError(err.message || "An error occurred while fetching users");
        } finally {
            setUsersLoading(false);
        }
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

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
                <div className="text-xl font-semibold tracking-wider animate-pulse">Loading AS400 Portal...</div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-slate-100 text-slate-800">

            {/* Sidebar Navigation */}
            <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between border-r border-slate-800 shadow-lg">
                <div>
                    {/* Logo / Header */}
                    <div className="p-6 border-b border-slate-800 flex items-center gap-3 bg-slate-950">
                        <div className="h-8 w-8 rounded bg-blue-600 flex items-center justify-center font-bold text-white tracking-widest text-lg">
                            AS
                        </div>
                        <div>
                            <Link href="/dashboard">
                                <h1 className="text-md font-bold text-white tracking-wide">AS400 Portal</h1>
                                <span className="text-xs text-green-500 font-mono flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-green-500 animate-ping inline-block"></span>
                                    SYSTEM ONLINE
                                </span>
                            </Link>
                        </div>
                    </div>

                    {/* Navigation Links */}
                    <nav className="p-4 space-y-1">
                        <button
                            onClick={() => setActiveTab("overview")}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-150 ${activeTab === "overview"
                                ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
                                : "hover:bg-slate-800 hover:text-white"
                                }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                            Dashboard
                        </button>

                        <button
                            onClick={() => setActiveTab("users")}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-150 ${activeTab === "users"
                                ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
                                : "hover:bg-slate-800 hover:text-white"
                                }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                            Generate Release Date
                        </button>

                        {/* <button
                            onClick={() => setActiveTab("jobs")}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-150 ${activeTab === "jobs"
                                ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
                                : "hover:bg-slate-800 hover:text-white"
                                }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                            </svg>
                            Active Jobs
                        </button> */}

                        {/* <button
                            onClick={() => setActiveTab("spool")}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-150 ${activeTab === "spool"
                                ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
                                : "hover:bg-slate-800 hover:text-white"
                                }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Spooled Files
                        </button> */}

                        {/* <button
                            onClick={() => setActiveTab("settings")}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-150 ${activeTab === "settings"
                                ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
                                : "hover:bg-slate-800 hover:text-white"
                                }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Settings
                        </button> */}
                    </nav>
                </div>

                {/* User profile & Logout */}
                <div className="p-4 border-t border-slate-800 bg-slate-950">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-mono font-bold text-xs uppercase">
                                {username.slice(0, 2)}
                            </div>
                            <div className="truncate w-32">
                                <p className="text-sm font-semibold text-white truncate">{username}</p>
                                <p className="text-xs text-slate-500 font-mono">AS400 USER</p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full rounded bg-red-950/40 hover:bg-red-900 border border-red-900/30 py-2 text-xs font-semibold text-red-400 hover:text-white transition-all flex items-center justify-center gap-1"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Workspace */}
            <div className="flex-1 flex flex-col min-h-screen">

                {/* Top Header */}
                <header className="h-16 bg-white border-b border-slate-200 flex justify-between items-center px-8 shadow-sm">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Send Email</span>
                        {/* <span className="bg-blue-50 text-blue-700 text-xs px-2.5 py-0.5 rounded-full border border-blue-100 font-bold font-mono">
                            PRODUCTION (QGPL)
                        </span> */}
                    </div>
                    <div className="text-sm text-slate-500 font-medium">
                        Active Connection: <span className="font-mono text-slate-900 font-semibold">{process.env.NEXT_PUBLIC_ODBC_SYSTEM || "10.30.0.200"}</span>
                    </div>
                </header>

                {/* Content Pane */}
                <main className="flex-1 p-8">

                    {/* TAB 1: OVERVIEW */}
                    {activeTab === "overview" && (
                        <div className="space-y-6">
                            <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm">
                                <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome to your Send Email Dashboard</h2>
                                <p className="text-slate-600 mb-6 text-sm">
                                    You are securely logged into the AS400 Portal. Select a system application or browse module options below.
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                    Apps here
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: USER PROFILES */}
                    {activeTab === "users" && (
                        <div className="space-y-6">
                            <div className="min-h-screen bg-slate-100 p-6">
                                <div className="mx-auto max-w-lg rounded-xl bg-white p-6 shadow">
                                    <h1 className="mb-6 text-2xl font-bold text-slate-800">
                                        Select Release Date
                                    </h1>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                                Released Date
                                            </label>

                                            <input
                                                type="date"
                                                value={releaseDate}
                                                onChange={(e) =>
                                                    setReleaseDate(e.target.value)
                                                }
                                                className="w-full rounded-lg border border-slate-300 p-3 focus:border-blue-500 focus:outline-none"
                                            />
                                        </div>

                                        <button
                                            onClick={() => setShowDialog(true)}
                                            className="rounded-lg bg-blue-600 px-5 py-2 text-white hover:bg-blue-700"
                                        >
                                            Generate Email List
                                        </button>

                                        {/* <button
                                            onClick={handleSubmit}
                                            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700"
                                        >
                                            Generate Report
                                        </button> */}
                                    </div>

                                    {showDialog && (
                                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                                            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                                                <h2 className="mb-4 text-xl font-semibold">
                                                    Released Checks
                                                </h2>

                                                <label className="mb-2 block text-sm font-medium">
                                                    Release Date
                                                </label>

                                                <input
                                                    type="date"
                                                    value={releaseDate}
                                                    onChange={(e) => setReleaseDate(e.target.value)}
                                                    className="w-full rounded border p-2"
                                                />

                                                {processing && (
                                                    <>
                                                        <div className="mt-6 h-4 overflow-hidden rounded-full bg-gray-200">
                                                            <div
                                                                className="h-full bg-blue-600 transition-all duration-300"
                                                                style={{ width: `${progress}%` }}
                                                            />
                                                        </div>

                                                        <p className="mt-2 text-sm text-gray-600">
                                                            {status}
                                                        </p>
                                                    </>
                                                )}

                                                <div className="mt-6 flex justify-end gap-3">
                                                    <button
                                                        disabled={processing}
                                                        onClick={() => setShowDialog(false)}
                                                        className="rounded border px-4 py-2"
                                                    >
                                                        Cancel
                                                    </button>

                                                    <button
                                                        disabled={processing || !releaseDate}
                                                        onClick={handleSubmit}
                                                        className="rounded bg-blue-600 px-4 py-2 text-white"
                                                    >
                                                        {processing ? "Processing..." : "Process"}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: ACTIVE JOBS */}
                    {activeTab === "jobs" && (
                        <div className="space-y-6">
                            <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-900">Work with Active Jobs (WRKACTJOB)</h2>
                                        <p className="text-slate-500 text-sm">Monitor active server subsystems and interactive processes</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            // Simulate a refresh by changing cpu slightly
                                            setReleasedChecks(jobs => jobs.map(j => ({
                                                ...j,
                                                cpu: (Math.random() * 2).toFixed(1)
                                            })));
                                        }}
                                        className="border border-slate-300 hover:bg-slate-50 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
                                    >
                                        Refresh
                                    </button>
                                </div>

                                <div className="overflow-x-auto bg-slate-950 text-green-400 font-mono p-6 rounded-lg border border-slate-800 shadow-inner">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="text-slate-500 border-b border-slate-800 pb-2">
                                                <th className="pb-3 pr-4 font-bold">Subsystem/Job</th>
                                                <th className="pb-3 pr-4 font-bold">User</th>
                                                <th className="pb-3 pr-4 font-bold">Type</th>
                                                <th className="pb-3 pr-4 font-bold">Status</th>
                                                <th className="pb-3 pr-4 font-bold">CPU %</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {activeJobs.map((j, idx) => (
                                                <tr key={idx} className="hover:bg-slate-900 border-b border-slate-900">
                                                    <td className="py-2.5 text-white">{j.job}</td>
                                                    <td className="py-2.5 text-yellow-500">{j.user}</td>
                                                    <td className="py-2.5 text-sky-400">{j.type}</td>
                                                    <td className={`py-2.5 font-bold ${j.status === "RUN" ? "text-green-500" : "text-amber-500"}`}>{j.status}</td>
                                                    <td className="py-2.5 text-emerald-400">{j.cpu}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 4: SPOOLED FILES */}
                    {activeTab === "spool" && (
                        <div className="space-y-6">
                            <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Work with Spooled Files (WRKSPLF)</h2>
                                    <p className="text-slate-500 text-sm mb-6">Manage system reports, printer files, and spool logs</p>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wider border-b">
                                                <th className="p-3">Spool File</th>
                                                <th className="p-3">File Number</th>
                                                <th className="p-3">Job Name</th>
                                                <th className="p-3">User</th>
                                                <th className="p-3">Creation Date</th>
                                                <th className="p-3">Pages</th>
                                                <th className="p-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {spoolFiles.map((f, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50 border-b">
                                                    <td className="p-3 font-mono font-bold text-slate-800">{f.name}</td>
                                                    <td className="p-3 text-slate-600 font-mono">{f.file}</td>
                                                    <td className="p-3 text-slate-600 font-mono">{f.job}</td>
                                                    <td className="p-3 text-slate-600">{f.user}</td>
                                                    <td className="p-3 text-slate-600 font-mono">{f.date}</td>
                                                    <td className="p-3 text-slate-600 font-mono">{f.pages}</td>
                                                    <td className="p-3 text-right">
                                                        <button
                                                            onClick={() => alert(`Opening Spool ${f.name} (${f.file}) in viewer`)}
                                                            className="text-blue-600 hover:text-blue-800 text-sm font-semibold hover:underline"
                                                        >
                                                            View PDF
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 5: SETTINGS */}
                    {/* {activeTab === "settings" && (
                        <div className="space-y-6">
                            <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm max-w-2xl">
                                <h2 className="text-2xl font-bold text-slate-900 mb-6">System Settings</h2>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center py-3 border-b">
                                        <span className="font-semibold text-slate-700">Default Library</span>
                                        <span className="font-mono text-slate-500">QGPL</span>
                                    </div>
                                    <div className="flex justify-between items-center py-3 border-b">
                                        <span className="font-semibold text-slate-700">ODBC Driver</span>
                                        <span className="font-mono text-slate-500">iSeries Access ODBC Driver</span>
                                    </div>
                                    <div className="flex justify-between items-center py-3 border-b">
                                        <span className="font-semibold text-slate-700">System IP / Host</span>
                                        <span className="font-mono text-slate-500">10.30.0.200</span>
                                    </div>
                                    <div className="flex justify-between items-center py-3 border-b">
                                        <span className="font-semibold text-slate-700">Session Expiration</span>
                                        <span className="font-mono text-slate-500">1 Hour</span>
                                    </div>
                                    <div className="flex justify-between items-center py-3 border-b">
                                        <span className="font-semibold text-slate-700">SSL Connection</span>
                                        <span className="bg-green-150 text-green-700 font-bold border border-green-200 px-2 py-0.5 rounded text-xs font-mono">
                                            ENABLED
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )} */}

                </main>
            </div>

        </div>
    );
}
