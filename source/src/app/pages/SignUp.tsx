import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { UserPlus, Eye, EyeOff, Mail, Lock, Globe, Sun, Moon, Sparkles, User, Phone, ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "../lib/toast";
import { useTheme } from "../lib/ThemeContext";
import { UserDB } from "../lib/userDatabase";
import { clearServerPanic } from "../lib/panicMode";

export function SignUp() {
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode, isUrdu, fontClass, t, toggleLanguage, language } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const dc = darkMode;

  useEffect(() => {
    clearServerPanic();
  }, []);

  const handleSignUp = async () => {
    if (!fullName.trim()) {
      toast.error(isUrdu ? "پورا نام درج کریں" : "Please enter your full name");
      return;
    }
    if (!email.trim()) {
      toast.error(isUrdu ? "ای میل درج کریں" : "Please enter your email");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error(isUrdu ? "غلط ای میل فارمیٹ" : "Invalid email format");
      return;
    }
    if (!phone.trim()) {
      toast.error(isUrdu ? "فون نمبر درج کریں" : "Please enter your phone number");
      return;
    }
    if (!password.trim()) {
      toast.error(isUrdu ? "پاس ورڈ درج کریں" : "Please enter a password");
      return;
    }
    if (password.length < 6) {
      toast.error(isUrdu ? "پاس ورڈ کم از کم 6 حروف کا ہونا چاہیے" : "Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error(isUrdu ? "پاس ورڈ مماثل نہیں" : "Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      const existing = await UserDB.getUserByEmail(email.trim());
      if (existing) {
        toast.error(isUrdu ? "یہ ای میل پہلے سے موجود ہے" : "This email is already registered");
        setIsLoading(false);
        return;
      }

      // createUser registers Firebase Auth user AND creates Firestore profile with UID
      await UserDB.createUser({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
        role: "customer",
        status: "active",
        tenantId: "default",
      });

      toast.success(isUrdu ? "اکاؤنٹ کامیابی سے بن گیا!" : "Account created successfully!");
      setTimeout(() => navigate("/customer/login"), 600);
    } catch (err: any) {
      toast.error(err?.message || (isUrdu ? "سائن اپ ناکام" : "Sign up failed"));
    }
    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSignUp();
  };

  const inputCls = `w-full px-4 py-3.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base ${
    dc ? "bg-gray-700/50 border-gray-600 text-white placeholder-gray-500" : "bg-white border-gray-300 text-gray-900"
  }`;

  const labelCls = `block text-sm font-medium mb-1.5 ${dc ? "text-gray-300" : "text-gray-700"}`;

  return (
    <div
      className={`${isUrdu ? fontClass : ""} min-h-screen flex items-center justify-center transition-colors duration-500 relative overflow-hidden px-4 ${
        dc ? "bg-gray-950" : "bg-gradient-to-br from-emerald-50 via-white to-blue-50"
      }`}
    >
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className={`absolute top-20 left-10 w-72 h-72 rounded-full blur-3xl ${
            dc ? "bg-emerald-900/20" : "bg-emerald-200/40"
          }`}
        />
        <motion.div
          animate={{ y: [0, 15, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className={`absolute bottom-20 right-10 w-96 h-96 rounded-full blur-3xl ${
            dc ? "bg-blue-900/20" : "bg-blue-200/30"
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
          className={`p-2.5 rounded-xl backdrop-blur-md shadow-lg transition-all ${
            dc ? "bg-gray-800/80 hover:bg-gray-700/80 border border-gray-700/50" : "bg-white/90 hover:bg-white border border-gray-200/50"
          }`}
        >
          <Globe className={`w-4 h-4 ${dc ? "text-gray-300" : "text-gray-700"}`} />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            toggleDarkMode();
            toast.info(!darkMode ? t("darkEnabled") : t("lightEnabled"));
          }}
          className={`p-2.5 rounded-xl backdrop-blur-md shadow-lg transition-all ${
            dc ? "bg-gray-800/80 hover:bg-gray-700/80 border border-gray-700/50" : "bg-white/90 hover:bg-white border border-gray-200/50"
          }`}
        >
          {dc ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-gray-700" />}
        </motion.button>
      </motion.div>

      {/* Sign Up Card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className={`relative w-full max-w-md rounded-2xl shadow-2xl p-6 sm:p-8 border backdrop-blur-xl ${
          dc ? "bg-gray-800/90 border-gray-700/60" : "bg-white/95 border-gray-200/50"
        }`}
      >
        {/* Back button */}
        <button
          onClick={() => navigate("/")}
          className={`absolute top-4 ${isUrdu ? "right-4" : "left-4"} flex items-center gap-1 text-sm ${dc ? "text-gray-400 hover:text-gray-300" : "text-gray-500 hover:text-gray-700"}`}
        >
          {isUrdu ? null : <ArrowLeft className="w-4 h-4" />}
          {isUrdu ? "واپس" : "Back"}
          {isUrdu ? <ArrowLeft className="w-4 h-4 rotate-180" /> : null}
        </button>

        {/* Logo */}
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="inline-block mb-4"
          >
            <div className="relative">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-emerald-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-emerald-500/30">
                <UserPlus className="w-10 h-10 text-white" />
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
            {isUrdu ? "نیا اکاؤنٹ بنائیں" : "Create Account"}
          </h1>
          <p className={`text-sm ${dc ? "text-gray-400" : "text-gray-500"}`}>
            {isUrdu ? "یونیورسل CRM میں شامل ہوں" : "Join Universal CRM"}
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className={labelCls}>{isUrdu ? "پورا نام" : "Full Name"}</label>
            <div className="relative">
              <User className={`absolute ${isUrdu ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 ${dc ? "text-gray-500" : "text-gray-400"}`} />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isUrdu ? "اپنا پورا نام درج کریں" : "Enter your full name"}
                className={`${inputCls} ${isUrdu ? "pr-10 pl-4" : "pl-10 pr-4"}`}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>{isUrdu ? "ای میل" : "Email"}</label>
            <div className="relative">
              <Mail className={`absolute ${isUrdu ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 ${dc ? "text-gray-500" : "text-gray-400"}`} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="user@example.com"
                dir="ltr"
                className={`${inputCls} ${isUrdu ? "pr-10 pl-4" : "pl-10 pr-4"}`}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>{isUrdu ? "فون نمبر" : "Phone Number"}</label>
            <div className="relative">
              <Phone className={`absolute ${isUrdu ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 ${dc ? "text-gray-500" : "text-gray-400"}`} />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="+92 300 0000000"
                dir="ltr"
                className={`${inputCls} ${isUrdu ? "pr-10 pl-4" : "pl-10 pr-4"}`}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>{isUrdu ? "پاس ورڈ" : "Password"}</label>
            <div className="relative">
              <Lock className={`absolute ${isUrdu ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 ${dc ? "text-gray-500" : "text-gray-400"}`} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="••••••••"
                dir="ltr"
                className={`${inputCls} ${isUrdu ? "pr-10 pl-10" : "pl-10 pr-10"}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute ${isUrdu ? "left-3" : "right-3"} top-1/2 -translate-y-1/2 ${dc ? "text-gray-400 hover:text-gray-200" : "text-gray-400 hover:text-gray-600"}`}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className={labelCls}>{isUrdu ? "پاس ورڈ تصدیق کریں" : "Confirm Password"}</label>
            <div className="relative">
              <Lock className={`absolute ${isUrdu ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 ${dc ? "text-gray-500" : "text-gray-400"}`} />
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="••••••••"
                dir="ltr"
                className={`${inputCls} ${isUrdu ? "pr-10 pl-10" : "pl-10 pr-10"}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className={`absolute ${isUrdu ? "left-3" : "right-3"} top-1/2 -translate-y-1/2 ${dc ? "text-gray-400 hover:text-gray-200" : "text-gray-400 hover:text-gray-600"}`}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Sign Up Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSignUp}
            disabled={isLoading}
            className="w-full mt-2 bg-gradient-to-r from-emerald-500 to-blue-600 text-white py-3.5 rounded-xl font-semibold hover:from-emerald-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 min-h-[48px] active:shadow-md text-base"
          >
            {isLoading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
              />
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                {isUrdu ? "سائن اپ کریں" : "Sign Up"}
              </>
            )}
          </motion.button>

          {/* Login link */}
          <div className="text-center mt-3">
            <button
              onClick={() => navigate("/customer/login")}
              className={`text-sm font-medium ${dc ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"} transition-colors`}
            >
              {isUrdu ? "پہلے سے اکاؤنٹ ہے؟ لاگ ان کریں" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
