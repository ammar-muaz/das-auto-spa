"use client";

import { useState } from "react";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";
import supabase from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error" | null; text: string }>({ type: null, text: "" });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }
    setMessage({ type: "success", text: "Password reset link has been sent to your email. Please check your inbox." });
    setIsSubmitted(true);
  };

  const handleTryAgain = () => {
    setEmail("");
    setMessage({ type: null, text: "" });
    setIsSubmitted(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src="/logo.png" alt="Das Auto Spa" className="h-10 w-10 object-contain rounded-lg" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <h1 className="text-gray-900 text-xl font-bold">Das Auto Spa</h1>
          </div>
          <p className="text-gray-600">Door-to-Door Car Wash Service</p>
        </div>

        {!isSubmitted ? (
          <>
            <div className="mb-6">
              <h2 className="text-gray-800 text-lg font-semibold mb-2">Forgot Password?</h2>
              <p className="text-sm text-gray-600">
                No worries! Enter your email address and we&apos;ll send you a link to reset your password.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm mb-2 text-gray-700 font-medium">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                  />
                </div>
              </div>

              {message.type === "error" && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">{message.text}</div>
              )}

              <button type="submit" className="w-full bg-gray-900 text-white py-3 rounded-lg hover:bg-gray-800 transition-colors font-medium">
                Send Reset Link
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>

            <h2 className="text-gray-800 text-lg font-semibold mb-2">Check Your Email</h2>

            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-6">
              {message.text}
            </div>

            <p className="text-sm text-gray-600 mb-6">
              We&apos;ve sent a password reset link to <span className="font-medium text-gray-800">{email}</span>
            </p>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800 mb-2">📧 Didn&apos;t receive the email?</p>
              <ul className="text-xs text-gray-600 space-y-1 text-left">
                <li>• Check your spam or junk folder</li>
                <li>• Make sure the email address is correct</li>
                <li>• Wait a few minutes for the email to arrive</li>
              </ul>
            </div>

            <button onClick={handleTryAgain} className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-colors mb-3 font-medium">
              Try Another Email
            </button>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link href="/login" className="flex items-center gap-2 text-gray-900 hover:text-gray-700 text-sm mx-auto transition-colors justify-center">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
