import { AccessCodeService } from "../../lib/accessCode";
import { NotificationService } from "../../lib/notifications";
import { AuditLogService } from "../../lib/auditLog";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { Briefcase, MessageCircle, Globe, Sun, Moon, Sparkles, ShieldCheck, Timer } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "../../lib/toast";
import { useTheme } from "../../lib/ThemeContext";
import { clearServerPanic } from "../../lib/panicMode";

// Agent Login Page
export function AgentLogin() {
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode, isUrdu, fontClass, t, toggleLanguage, language } = useTheme();

  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [shake, setShake] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState("");
  const [countdown, setCountdown] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const dc = darkMode;

  useEffect(() => {
    clearServerPanic();
    // Focus first input
    setTimeout(() => inputRefs.current[0]?.focus(), 200);

    // Live countdown
    const updateCountdown = () => {
      const remaining = AccessCodeService.getTOTPTimeRemaining();
      setCountdown(AccessCodeService.formatTimeRemaining(remaining));
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    // Debug: log current TOTP codes for dev verification
    console.log("[AgentLogin] ─── TOTP Debug ───");
    const allCodes = AccessCodeService.getAllTOTPCodes();
    allCodes.forEach(ac => {
      console.log(`[AgentLogin] ${ac.agentId} (${ac.agentName}): code=${ac.code}`);
    });
    console.log("[AgentLogin] Expires at:", AccessCodeService.getTOTPExpiryTime());

    return () => clearInterval(interval);
  }, []);

  // ── Digit Handlers ────────────────────────────────────────
  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);
    setLastError("");

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newDigits.every((d) => d !== "") && value) {
      setTimeout(() => handleVerify(newDigits.join("")), 200);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "Enter") {
      const code = digits.join("");
      if (code.length === 6) handleVerify(code);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(""));
      inputRefs.current[5]?.focus();
      setTimeout(() => handleVerify(pasted), 200);
    }
  };

  const handleVerify = async (code: string) => {
    if (isLoading) return;
    setIsLoading(true);
    setLastError("");

    console.log("[AgentLogin] Verifying code:", code);
    await new Promise((r) => setTimeout(r, 800));

    const result = AccessCodeService.validateCode(code);
    console.log("[AgentLogin] Result:", JSON.stringify(result));

    if (result.valid && result.agentId && result.agentName) {
      AccessCodeService.createAgentSession(code, result.agentId, result.agentName);
      NotificationService.notifyAgentLogin(result.agentName);
      AuditLogService.logAuth(result.agentName, "agent", "login");
      toast.success(
        isUrdu
          ? `خوش آمدید ${result.agentName}!`
          : `Welcome ${result.agentName}!`
      );
      setTimeout(() => navigate("/agent"), 400);
    } else {
      const errorMsg = result.error || (isUrdu ? "غلط ایکسیس کوڈ" : "Invalid access code");
      setLastError(errorMsg);
      toast.error(errorMsg);
      setShake(true);
      setTimeout(() => {
        setShake(false);
        setDigits(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }, 600);
    }
    setIsLoading(false);
  };

  const handleWhatsApp = () => {
    const msg = encodeURIComponent(
      "Assalamualaikum, I need my access code for the Universal CRM Agent Portal."
    );
    window.open(`https://wa.me/923000000000?text=${msg}`, "_blank");
    toast.info(isUrdu ? "واٹس ایپ کھل رہا ہے" : "Opening WhatsApp...");
  };

  const Spinner = () => (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
    />
  );

  return (
    <div
      className={`${isUrdu ? fontClass : ""} min-h-screen flex items-center justify-center transition-colors duration-500 relative overflow-hidden px-4 ${
        dc ? "bg-gray-950" : "bg-gradient-to-br from-blue-50 via-white to-indigo-50"
      }`}
    >
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className={`absolute top-20 left-10 w-72 h-72 rounded-full blur-3xl ${
            dc ? "bg-blue-900/20" : "bg-blue-200/40"
          }`}
        />
        <motion.div
          animate={{ y: [0, 15, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className={`absolute bottom-20 right-10 w-96 h-96 rounded-full blur-3xl ${
            dc ? "bg-indigo-900/20" : "bg-indigo-200/30"
          }`}
        />
      </div>

      {/* Top controls */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`absolute top-4 ${isUrdu ? "left-4" : "right-4"} flex gap-2 z-20`}
      >
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            toggleLanguage();
            toast.info(`${t("lang.changed")} ${language === "en" ? "اردو" : "English"}`);
          }}
          className={`p-3 sm:p-2.5 rounded-xl backdrop-blur-md shadow-lg transition-all min-w-[44px] min-h-[44px] flex items-center justify-center ${
            dc ? "bg-gray-800/80 hover:bg-gray-700/80 border border-gray-700/50" : "bg-white/90 hover:bg-white border border-gray-200/50"
          }`}
        >
          <Globe className={`w-5 h-5 sm:w-4 sm:h-4 ${dc ? "text-gray-300" : "text-gray-700"}`} />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            toggleDarkMode();
            toast.info(!darkMode ? t("darkEnabled") : t("lightEnabled"));
          }}
          className={`p-3 sm:p-2.5 rounded-xl backdrop-blur-md shadow-lg transition-all min-w-[44px] min-h-[44px] flex items-center justify-center ${
            dc ? "bg-gray-800/80 hover:bg-gray-700/80 border border-gray-700/50" : "bg-white/90 hover:bg-white border border-gray-200/50"
          }`}
        >
          {dc ? <Sun className="w-5 h-5 sm:w-4 sm:h-4 text-yellow-400" /> : <Moon className="w-5 h-5 sm:w-4 sm:h-4 text-gray-700" />}
        </motion.button>
      </motion.div>

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className={`relative w-full max-w-md mx-4 sm:mx-4 rounded-2xl shadow-2xl p-6 sm:p-8 border backdrop-blur-xl ${
          dc ? "bg-gray-800/90 border-gray-700/60" : "bg-white/95 border-gray-200/50"
        }`}
      >
        {/* Logo */}
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="inline-block mb-4"
          >
            <div className="relative">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/30">
                <Briefcase className="w-10 h-10 text-white" />
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -top-1 -right-1"
                >
                  <Sparkles className="w-4 h-4 text-yellow-300" />
                </motion.div>
              </div>
            </div>
          </motion.div>
          <h1 className={`text-2xl font-bold mb-1 ${dc ? "text-white" : "text-gray-900"}`}>
            {t("auth.agentLogin")}
          </h1>
          <p className={`text-sm ${dc ? "text-gray-400" : "text-gray-500"}`}>
            {isUrdu
              ? "ایڈمن سے حاصل کردہ 6 ہندسوں کا کوڈ درج کریں"
              : "Enter the 6-digit code provided by your admin"}
          </p>
        </div>

        {/* Countdown Badge */}
        <div className="flex justify-center mb-5">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-mono font-semibold ${
            dc ? "bg-gray-700/60 text-gray-300 border border-gray-600/50" : "bg-gray-100 text-gray-600 border border-gray-200"
          }`}>
            <Timer className="w-3.5 h-3.5 text-blue-500" />
            <span>{isUrdu ? "کوڈ کی میعاد:" : "Code valid for:"}</span>
            <span className="text-blue-500">{countdown}</span>
          </div>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {lastError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className={`mb-4 p-3 rounded-xl text-sm font-medium border ${
                dc
                  ? "bg-red-900/30 border-red-800/50 text-red-300"
                  : "bg-red-50 border-red-200 text-red-700"
              }`}
            >
              {lastError}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── 6-Digit Code Input ─────────────────────────── */}
        <div className="mb-6">
          <label className={`block text-sm font-medium mb-3 text-center ${dc ? "text-gray-300" : "text-gray-700"}`}>
            {t("auth.enterAccessCode")}
          </label>
          <motion.div
            animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
            transition={{ duration: 0.5 }}
            className="flex gap-2.5 justify-center"
            dir="ltr"
          >
            {digits.map((digit, i) => (
              <motion.input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={i === 0 ? handlePaste : undefined}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className={`w-12 h-14 sm:w-12 sm:h-14 text-center text-2xl font-bold rounded-xl border-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                  digit
                    ? dc
                      ? "border-blue-500 bg-blue-900/30 text-blue-400"
                      : "border-blue-500 bg-blue-50 text-blue-700"
                    : dc
                    ? "border-gray-600 bg-gray-700/50 text-white"
                    : "border-gray-300 bg-white text-gray-900"
                }`}
              />
            ))}
          </motion.div>
        </div>

        {/* Verify Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleVerify(digits.join(""))}
          disabled={isLoading || digits.some((d) => !d)}
          className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-4 sm:py-3.5 rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 text-base sm:text-sm min-h-[48px]"
        >
          {isLoading ? <Spinner /> : (
            <>
              <ShieldCheck className="w-4 h-4" />
              {t("auth.verifyAccess")}
            </>
          )}
        </motion.button>

        {/* WhatsApp — request code from admin */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleWhatsApp}
          className={`w-full mt-4 py-3.5 sm:py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all border min-h-[48px] ${
            dc
              ? "border-green-700 text-green-400 hover:bg-green-900/30"
              : "border-green-200 text-green-700 hover:bg-green-50"
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          {isUrdu ? "ایڈمن سے کوڈ حاصل کریں" : "Request Code from Admin"}
        </motion.button>

        {/* Back link */}
        <div className="mt-5 text-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={() => navigate("/")}
            className="text-sm text-blue-500 hover:text-blue-400 font-medium min-h-[44px] flex items-center justify-center"
          >
            {isUrdu ? "\u2192" : "\u2190"} {t("login.back")}
          </motion.button>
        </div>

        {/* Info note */}
        <div className={`mt-5 p-4 rounded-xl text-xs space-y-2.5 ${dc ? "bg-gray-700/50 border border-gray-700" : "bg-gray-50 border border-gray-100"}`}>
          <div className={`flex items-start gap-2 ${dc ? "text-gray-300" : "text-gray-600"}`}>
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
            <p>
              {isUrdu
                ? "یہ کوڈ کسی بھی ڈیوائس، کسی بھی براؤزر پر کام کرتا ہے — انٹرنیٹ کی ضرورت نہیں۔ ایڈمن سے اپنا 6 ہندسوں کا کوڈ واٹس ایپ یا کال پر حاصل کریں۔"
                : "This code works on any device, any browser — no internet required. Get your 6-digit code from admin via WhatsApp or call."}
            </p>
          </div>
          <div className={`flex items-start gap-2 ${dc ? "text-gray-400" : "text-gray-500"}`}>
            <Timer className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              {isUrdu
                ? "ہر کوڈ 6 گھنٹے کے لیے درست ہے۔ میعاد ختم ہونے کے بعد ایڈمن سے نیا کوڈ حاصل کریں۔"
                : "Each code is valid for 6 hours. After expiry, request a new code from your admin."}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}