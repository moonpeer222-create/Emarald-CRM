import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mail, ArrowLeft, KeyRound, Lock, Eye, EyeOff, CheckCircle, X, ShieldCheck } from "lucide-react";
import { toast } from "../lib/toast";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { UserDB } from "../lib/userDatabase";
import { validatePasswordStrength } from "../lib/security";

interface ForgotPasswordModalProps {
  open: boolean;
  onClose: () => void;
  darkMode: boolean;
  isUrdu?: boolean;
  portalType?: "admin" | "master" | "operator" | "customer";
}

type Step = "email" | "code" | "newPassword" | "success";

const SERVER_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-5cdc87b7`;

export function ForgotPasswordModal({ open, onClose, darkMode, isUrdu = false, portalType = "admin" }: ForgotPasswordModalProps) {
  const dc = darkMode;
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const u = (en: string, ur: string) => isUrdu ? ur : en;

  const resetState = () => {
    setStep("email");
    setEmail("");
    setCode("");
    setNewPw("");
    setConfirmPw("");
    setShowPw(false);
    setLoading(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Step 1: Request OTP via email
  const handleRequestCode = async () => {
    if (!email.trim()) { toast.error(u("Enter your email", "ای میل درج کریں")); return; }
    setLoading(true);
    try {
      const res = await fetch(`${SERVER_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({ email: email.trim(), portalType }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(u("Verification code sent to your email!", "تصدیقی کوڈ آپ کی ای میل پر بھیج دیا گیا!"));
        setStep("code");
      } else {
        toast.error(data.error || u("Failed to send code", "کوڈ بھیجنے میں ناکامی"));
      }
    } catch (err: any) {
      console.error("Forgot password request error:", err);
      toast.error(u("Network error. Try again.", "نیٹ ورک خرابی۔ دوبارہ کوشش کریں۔"));
    }
    setLoading(false);
  };

  // Step 2: Verify code
  const handleVerifyCode = async () => {
    if (code.length !== 6) { toast.error(u("Enter the 6-digit code", "6 ہندسوں کا کوڈ درج کریں")); return; }
    setLoading(true);
    try {
      const res = await fetch(`${SERVER_BASE}/auth/verify-reset-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({ email: email.trim(), code }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(u("Code verified!", "کوڈ کی تصدیق ہو گئی!"));
        setStep("newPassword");
      } else {
        toast.error(data.error || u("Invalid or expired code", "غلط یا ختم شدہ کوڈ"));
      }
    } catch {
      toast.error(u("Network error. Try again.", "نیٹ ورک خرابی۔"));
    }
    setLoading(false);
  };

  // Step 3: Set new password
  const handleResetPassword = async () => {
    if (!newPw || !confirmPw) { toast.error(u("Fill all fields", "تمام فیلڈز بھریں")); return; }
    if (newPw !== confirmPw) { toast.error(u("Passwords don't match", "پاس ورڈ مطابقت نہیں رکھتے")); return; }

    const strength = validatePasswordStrength(newPw);
    if (!strength.valid) {
      toast.error(strength.errors[0]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${SERVER_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({ email: email.trim(), code, newPassword: newPw }),
      });
      const data = await res.json();
      if (data.success) {
        // Also update local UserDB
        const user = UserDB.getUserByEmail(email.trim());
        if (user) {
          await UserDB.changePassword(user.id, newPw);
        }
        toast.success(u("Password reset successfully!", "پاس ورڈ کامیابی سے تبدیل ہو گیا!"));
        setStep("success");
      } else {
        toast.error(data.error || u("Failed to reset password", "پاس ورڈ ری سیٹ ناکام"));
      }
    } catch {
      toast.error(u("Network error. Try again.", "نیٹ ورک خرابی۔"));
    }
    setLoading(false);
  };

  const passwordStrength = validatePasswordStrength(newPw);
  const strengthColor = passwordStrength.score <= 2 ? "bg-red-500" : passwordStrength.score <= 4 ? "bg-yellow-500" : "bg-green-500";
  const strengthLabel = passwordStrength.score <= 2 ? u("Weak", "کمزور") : passwordStrength.score <= 4 ? u("Medium", "درمیانہ") : u("Strong", "مضبوط");

  if (!open) return null;

  const card = dc ? "bg-gray-800" : "bg-white";
  const txt = dc ? "text-white" : "text-gray-900";
  const sub = dc ? "text-gray-400" : "text-gray-500";
  const inputCls = `w-full px-4 py-3.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base ${dc ? "bg-gray-700/50 border-gray-600 text-white placeholder-gray-500" : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"}`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          onClick={e => e.stopPropagation()}
          className={`${card} w-full max-w-md rounded-2xl shadow-2xl overflow-hidden`}
        >
          {/* Header */}
          <div className={`flex items-center justify-between px-6 py-5 border-b ${dc ? "border-gray-700" : "border-gray-200"}`}>
            <div className="flex items-center gap-3">
              {step !== "email" && step !== "success" && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setStep(step === "newPassword" ? "code" : "email")}
                  className={`p-1.5 rounded-lg ${dc ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
                >
                  <ArrowLeft className="w-4 h-4" />
                </motion.button>
              )}
              <div>
                <h2 className={`font-bold ${txt}`}>
                  {step === "email" && u("Forgot Password", "پاس ورڈ بھول گئے")}
                  {step === "code" && u("Enter Verification Code", "تصدیقی کوڈ درج کریں")}
                  {step === "newPassword" && u("Set New Password", "نیا پاس ورڈ")}
                  {step === "success" && u("Password Reset", "پاس ورڈ ری سیٹ")}
                </h2>
                <p className={`text-xs ${sub}`}>
                  {step === "email" && u("We'll send a verification code to your email", "ہم آپ کی ای میل پر تصدیقی کوڈ بھیجیں گے")}
                  {step === "code" && u("Check your email for the 6-digit code", "اپنی ای میل میں 6 ہندسوں کا کوڈ دیکھیں")}
                  {step === "newPassword" && u("Create a strong new password", "ایک مضبوط نیا پاس ورڈ بنائیں")}
                  {step === "success" && u("Your password has been updated", "آپ کا پاس ورڈ اپ ڈیٹ ہو گیا")}
                </p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleClose}
              className={`p-2 rounded-full ${dc ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>

          {/* Content */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              {/* Step 1: Email */}
              {step === "email" && (
                <motion.div key="email" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
                  <div className="relative">
                    <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${dc ? "text-gray-500" : "text-gray-400"}`} />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleRequestCode()}
                      placeholder={u("Enter your registered email", "اپنی رجسٹرڈ ای میل درج کریں")}
                      dir="ltr"
                      className={`${inputCls} pl-10`}
                    />
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleRequestCode}
                    disabled={loading}
                    className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        {u("Send Verification Code", "تصدیقی کوڈ بھیجیں")}
                      </>
                    )}
                  </motion.button>
                </motion.div>
              )}

              {/* Step 2: Code verification */}
              {step === "code" && (
                <motion.div key="code" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
                  <p className={`text-sm text-center ${sub}`}>
                    {u("Code sent to", "کوڈ بھیجا گیا")} <span className="font-semibold text-blue-500">{email}</span>
                  </p>
                  <div className="relative">
                    <KeyRound className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${dc ? "text-gray-500" : "text-gray-400"}`} />
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={code}
                      onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      onKeyDown={e => e.key === "Enter" && handleVerifyCode()}
                      placeholder="000000"
                      dir="ltr"
                      className={`${inputCls} pl-10 text-center text-2xl tracking-[0.5em] font-mono`}
                    />
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleVerifyCode}
                    disabled={loading || code.length !== 6}
                    className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        {u("Verify Code", "کوڈ کی تصدیق کریں")}
                      </>
                    )}
                  </motion.button>
                  <button
                    onClick={handleRequestCode}
                    disabled={loading}
                    className={`w-full text-center text-sm ${dc ? "text-blue-400" : "text-blue-600"} hover:underline disabled:opacity-50`}
                  >
                    {u("Resend Code", "دوبارہ کوڈ بھیجیں")}
                  </button>
                </motion.div>
              )}

              {/* Step 3: New Password */}
              {step === "newPassword" && (
                <motion.div key="newpw" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${dc ? "text-gray-300" : "text-gray-700"}`}>
                      {u("New Password", "نیا پاس ورڈ")}
                    </label>
                    <div className="relative">
                      <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${dc ? "text-gray-500" : "text-gray-400"}`} />
                      <input
                        type={showPw ? "text" : "password"}
                        value={newPw}
                        onChange={e => setNewPw(e.target.value)}
                        dir="ltr"
                        className={`${inputCls} pl-10 pr-10`}
                        placeholder={u("Min 8 chars, uppercase, digit, special", "کم از کم 8 حروف")}
                      />
                      <button onClick={() => setShowPw(!showPw)} className={`absolute right-3 top-1/2 -translate-y-1/2 ${sub}`}>
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {/* Strength meter */}
                    {newPw && (
                      <div className="mt-2">
                        <div className={`h-1.5 rounded-full ${dc ? "bg-gray-700" : "bg-gray-200"}`}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                            className={`h-full rounded-full ${strengthColor}`}
                          />
                        </div>
                        <p className={`text-xs mt-1 ${sub}`}>{strengthLabel}</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${dc ? "text-gray-300" : "text-gray-700"}`}>
                      {u("Confirm Password", "پاس ورڈ کی تصدیق")}
                    </label>
                    <div className="relative">
                      <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${dc ? "text-gray-500" : "text-gray-400"}`} />
                      <input
                        type={showPw ? "text" : "password"}
                        value={confirmPw}
                        onChange={e => setConfirmPw(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleResetPassword()}
                        dir="ltr"
                        className={`${inputCls} pl-10`}
                        placeholder={u("Repeat password", "پاس ورڈ دوبارہ درج کریں")}
                      />
                    </div>
                    {confirmPw && newPw !== confirmPw && (
                      <p className="text-xs text-red-500 mt-1">{u("Passwords don't match", "پاس ورڈ مطابقت نہیں رکھتے")}</p>
                    )}
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleResetPassword}
                    disabled={loading || !passwordStrength.valid || newPw !== confirmPw}
                    className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        {u("Reset Password", "پاس ورڈ ری سیٹ کریں")}
                      </>
                    )}
                  </motion.button>
                </motion.div>
              )}

              {/* Step 4: Success */}
              {step === "success" && (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6 space-y-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                    className="w-20 h-20 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center"
                  >
                    <CheckCircle className="w-10 h-10 text-green-500" />
                  </motion.div>
                  <h3 className={`text-lg font-bold ${txt}`}>{u("Password Updated!", "پاس ورڈ اپ ڈیٹ ہو گیا!")}</h3>
                  <p className={`text-sm ${sub}`}>
                    {u("You can now log in with your new password.", "اب آپ اپنے نئے پاس ورڈ سے لاگ ان کر سکتے ہیں۔")}
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleClose}
                    className="px-8 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
                  >
                    {u("Back to Login", "لاگ ان پر واپس جائیں")}
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
