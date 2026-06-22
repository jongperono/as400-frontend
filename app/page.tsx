"use client";

import LoginForm from "@/components/auth/LoginForm";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-md">
        {/* Render the Login Form directly */}
        <LoginForm />

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-4 tracking-wide">
          Secure authentication system
        </p>
      </div>
    </div>
  );
}