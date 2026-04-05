import { AdminSidebar } from "../../components/AdminSidebar";
import { AdminHeader } from "../../components/AdminHeader";
import { Key, Copy, Check, Shield, Download, Search, Clock, Send, Timer, Wifi, WifiOff } from "lucide-react";
import { useState, useEffect } from "react";
import { AccessCodeService, AgentAccessCode } from "../../lib/accessCode";
import { CRMDataStore } from "../../lib/mockData";
import { toast } from "../../lib/toast";
import { motion } from "motion/react";
import { useTheme } from "../../lib/ThemeContext";
import { copyToClipboard } from "../../lib/clipboard";
import { useUnifiedLayout } from "../../components/UnifiedLayout";

export function AdminAgentCodes() {
  const { darkMode, t, isUrdu } = useTheme();
  const { insideUnifiedLayout } = useUnifiedLayout();
  const [agentCodes, setAgentCodes] = useState<AgentAccessCode[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");
  const [countdown, setCountdown] = useState("");
  const [countdownMs, setCountdownMs] = useState(0);

  useEffect(() => {
    // Load CRM data to ensure agents are available
    CRMDataStore.getCases();
    syncAgentsFromCRM();
    loadCodes();

    // Update codes + countdown every second
    const interval = setInterval(() => {
      loadCodes();
      updateCountdown();
    }, 1000);

    updateCountdown();
    return () => clearInterval(interval);
  }, []);

  const syncAgentsFromCRM = () => {
    const cases = CRMDataStore.getCases();
    const agentMap = new Map<string, string>();
    cases.forEach((c: any) => {
      if (c.agentId && c.agentName) agentMap.set(c.agentId, c.agentName);
    });
    agentMap.forEach((name, id) => AccessCodeService.registerAgent(id, name));
  };

  const loadCodes = () => {
    setAgentCodes(AccessCodeService.getAllTOTPCodes());
  };

  const updateCountdown = () => {
    const remaining = AccessCodeService.getTOTPTimeRemaining();
    setCountdownMs(remaining);
    setCountdown(AccessCodeService.formatTimeRemaining(remaining));
  };

  const handleToggleActive = (agentId: string) => {
    const updated = AccessCodeService.toggleAgentActive(agentId);
    if (updated) {
      loadCodes();
      toast.success(
        updated.active
          ? (isUrdu ? "ایجنٹ کو رسائی دے دی گئی" : "Agent access granted")
          : (isUrdu ? "ایجنٹ کی رسائی منسوخ کر دی گئی" : "Agent access revoked")
      );
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await copyToClipboard(code);
      setCopiedCode(code);
      toast.success(isUrdu ? "کوڈ کلپ بورڈ پر کپی ہو گیا" : "Code copied!");
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      toast.error(isUrdu ? "کاپی نہیں ہوا" : "Failed to copy");
    }
  };

  const handleShareViaWhatsApp = (ac: AgentAccessCode) => {
    const expiresAt = AccessCodeService.getTOTPExpiryTime();
    const msg = encodeURIComponent(
      `🔐 Universal CRM - Agent Access Code\n\n` +
      `Agent: ${ac.agentName}\n` +
      `Code: ${ac.code}\n` +
      `Valid until: ${expiresAt}\n\n` +
      `Open the Agent Portal on any device/browser and enter this code to login.`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
    toast.success(isUrdu ? "واٹس ایپ کھل گیا" : `WhatsApp opened for ${ac.agentName}`);
  };

  const handleDownloadCodes = () => {
    const expiresAt = AccessCodeService.getTOTPExpiryTime();
    const csv = [
      "Agent Name,Agent ID,Access Code,Status,Valid Until",
      ...filteredCodes.map(ac =>
        `${ac.agentName},${ac.agentId},${ac.code},${ac.active ? "Active" : "Revoked"},${expiresAt}`
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agent-codes-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(isUrdu ? "کوڈز ڈاؤنلوڈ ہو گئے" : "Agent codes exported!");
  };

  const filteredCodes = agentCodes.filter(ac => {
    const matchesSearch =
      ac.agentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ac.agentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ac.code.includes(searchTerm);
    const matchesFilter =
      filterActive === "all" ||
      (filterActive === "active" && ac.active) ||
      (filterActive === "inactive" && !ac.active);
    return matchesSearch && matchesFilter;
  });

  // Countdown urgency color
  const countdownColor =
    countdownMs < 30 * 60 * 1000
      ? "text-red-500"
      : countdownMs < 60 * 60 * 1000
      ? "text-amber-500"
      : "text-blue-400";

  return (
    <div className={`${insideUnifiedLayout ? "" : "flex min-h-screen"} transition-colors duration-300 ${darkMode ? "bg-gray-950" : "bg-gradient-to-br from-gray-50 to-gray-100"}`}>
      {!insideUnifiedLayout && <AdminSidebar />}
      <div className={`flex-1 min-w-0 ${insideUnifiedLayout ? "" : "pt-14 lg:pt-0"}`}>
        {!insideUnifiedLayout && <AdminHeader />}
        <main className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Key className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className={`text-3xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
                  {isUrdu ? "ایجنٹ ایکسیس کوڈز" : "Agent Access Codes"}
                </h1>
                <p className={`text-sm mt-1 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                  {isUrdu
                    ? "ٹائم سنکڈ کوڈز — ہر 6 گھنٹے خود بخود تبدیل ہوتے ہیں"
                    : "Time-synced codes — auto-rotate every 6 hours"}
                </p>
              </div>
            </div>
          </motion.div>

          {/* ── How It Works Banner ─────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`rounded-xl p-5 mb-6 border-2 ${
              darkMode ? "bg-blue-950/20 border-blue-800/60" : "bg-blue-50 border-blue-200"
            }`}
          >
            <div className="flex items-start gap-3">
              <WifiOff className={`w-5 h-5 mt-0.5 shrink-0 ${darkMode ? "text-blue-400" : "text-blue-600"}`} />
              <div className="space-y-1">
                <p className={`text-sm font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
                  {isUrdu ? "🔐 مکمل آف لائن — مختلف ڈیوائسز پر کام کرتا ہے" : "🔐 Fully Offline — Works Across Different Devices"}
                </p>
                <p className={`text-xs leading-relaxed ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                  {isUrdu
                    ? "یہ کوڈز وقت کی بنیاد پر تیار ہوتے ہیں (TOTP)۔ ایڈمن اور ایجنٹ دونوں ڈیوائسز ایک ہی کوڈ خود بخود حساب کرتی ہیں — کوئی نیٹ ورک ضرورت نہیں۔ بس کوڈ واٹس ایپ پر شیئر کریں اور ایجنٹ اپنی ڈیوائس پر داخل کرے۔"
                    : "These codes are time-based (TOTP). Both admin and agent devices independently compute the same code using the clock — no network needed. Share the code via WhatsApp and the agent enters it on their own device."}
                </p>
              </div>
            </div>
          </motion.div>

          {/* ── Stats Cards + Countdown ─────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6"
          >
            {/* Countdown Timer */}
            <div className={`rounded-xl p-5 col-span-1 md:col-span-2 ${
              darkMode ? "bg-gray-800/50 border border-gray-700" : "bg-white shadow-sm"
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                    {isUrdu ? "موجودہ کوڈز کی میعاد" : "Current Codes Expire In"}
                  </p>
                  <p className={`text-4xl font-bold font-mono mt-1 ${countdownColor}`}>
                    {countdown}
                  </p>
                  <p className={`text-xs mt-1 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                    {isUrdu ? "اس کے بعد نئے کوڈز خود بخود بنیں گے" : `Next rotation at ${AccessCodeService.getTOTPExpiryTime()}`}
                  </p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl flex items-center justify-center">
                  <Timer className={`w-7 h-7 ${countdownColor}`} />
                </div>
              </div>
            </div>

            {/* Active */}
            <div className={`rounded-xl p-5 ${darkMode ? "bg-gray-800/50 border border-gray-700" : "bg-white shadow-sm"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                    {isUrdu ? "فعال ایجنٹس" : "Active Agents"}
                  </p>
                  <p className={`text-3xl font-bold mt-1 ${darkMode ? "text-white" : "text-gray-900"}`}>
                    {agentCodes.filter(ac => ac.active).length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            {/* Revoked */}
            <div className={`rounded-xl p-5 ${darkMode ? "bg-gray-800/50 border border-gray-700" : "bg-white shadow-sm"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                    {isUrdu ? "منسوخ شدہ" : "Revoked"}
                  </p>
                  <p className={`text-3xl font-bold mt-1 ${darkMode ? "text-white" : "text-gray-900"}`}>
                    {agentCodes.filter(ac => !ac.active).length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── Actions Bar ─────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`rounded-xl p-4 mb-6 ${darkMode ? "bg-gray-800/50 border border-gray-700" : "bg-white shadow-sm"}`}
          >
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              {/* Search */}
              <div className="relative flex-1 max-w-md w-full">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? "text-gray-500" : "text-gray-400"}`} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={isUrdu ? "نام، آئی ڈی، یا کوڈ سے تلاش کریں..." : "Search by name, ID, or code..."}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-lg border transition-all ${
                    darkMode
                      ? "bg-gray-700/50 border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                      : "bg-white border-gray-300 focus:ring-2 focus:ring-blue-500"
                  }`}
                />
              </div>

              {/* Filter */}
              <div className="flex gap-2">
                {(["all", "active", "inactive"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilterActive(f)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      filterActive === f
                        ? "bg-blue-600 text-white"
                        : darkMode ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {f === "all" ? (isUrdu ? "سب" : "All") : f === "active" ? (isUrdu ? "فعال" : "Active") : (isUrdu ? "منسوخ" : "Revoked")}
                  </button>
                ))}
              </div>

              {/* Export */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleDownloadCodes}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  darkMode
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600"
                    : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                }`}
              >
                <Download className="w-4 h-4" />
                {isUrdu ? "ڈاؤنلوڈ" : "Export"}
              </motion.button>
            </div>
          </motion.div>

          {/* ── Codes Table ─────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`rounded-xl overflow-hidden ${darkMode ? "bg-gray-800/50 border border-gray-700" : "bg-white shadow-sm"}`}
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${darkMode ? "border-gray-700 bg-gray-900/50" : "border-gray-200 bg-gray-50"}`}>
                    <th className={`text-left py-4 px-6 text-sm font-bold ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                      {isUrdu ? "ایجنٹ" : "Agent"}
                    </th>
                    <th className={`text-left py-4 px-6 text-sm font-bold ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                      {isUrdu ? "آئی ڈی" : "Agent ID"}
                    </th>
                    <th className={`text-left py-4 px-6 text-sm font-bold ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                      {isUrdu ? "ایکسیس کوڈ" : "Access Code"}
                    </th>
                    <th className={`text-left py-4 px-6 text-sm font-bold ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                      {isUrdu ? "رسائی" : "Access"}
                    </th>
                    <th className={`text-left py-4 px-6 text-sm font-bold ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                      {isUrdu ? "میعاد" : "Expires"}
                    </th>
                    <th className={`text-left py-4 px-6 text-sm font-bold ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                      {isUrdu ? "کارروائیاں" : "Actions"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCodes.map((ac, index) => (
                    <motion.tr
                      key={ac.agentId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * index }}
                      className={`border-b ${darkMode ? "border-gray-700 hover:bg-gray-700/30" : "border-gray-100 hover:bg-gray-50"} transition-colors ${
                        !ac.active ? "opacity-60" : ""
                      }`}
                    >
                      {/* Agent Name */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md ${
                            ac.active
                              ? "bg-gradient-to-br from-blue-400 to-indigo-600"
                              : "bg-gradient-to-br from-gray-400 to-gray-500"
                          }`}>
                            {ac.agentName.charAt(0)}
                          </div>
                          <span className={`text-sm font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
                            {ac.agentName}
                          </span>
                        </div>
                      </td>

                      {/* Agent ID */}
                      <td className="py-4 px-6">
                        <span className={`text-xs font-mono px-2 py-1 rounded ${darkMode ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"}`}>
                          {ac.agentId}
                        </span>
                      </td>

                      {/* Code */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <div className={`px-3 py-2 rounded-lg border ${
                            ac.active
                              ? darkMode ? "bg-blue-950/30 border-blue-800" : "bg-blue-50 border-blue-200"
                              : darkMode ? "bg-gray-800 border-gray-700" : "bg-gray-100 border-gray-200"
                          }`}>
                            <span className={`font-mono text-lg font-bold tracking-[0.25em] ${
                              ac.active
                                ? darkMode ? "text-blue-400" : "text-blue-700"
                                : darkMode ? "text-gray-500 line-through" : "text-gray-400 line-through"
                            }`}>
                              {ac.code}
                            </span>
                          </div>
                          {ac.active && (
                            <motion.button
                              whileHover={{ scale: 1.15 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleCopyCode(ac.code)}
                              className={`p-2 rounded-lg transition-colors ${darkMode ? "hover:bg-blue-900/30" : "hover:bg-blue-100"}`}
                              title="Copy code"
                            >
                              {copiedCode === ac.code ? (
                                <Check className={`w-5 h-5 ${darkMode ? "text-blue-400" : "text-blue-600"}`} />
                              ) : (
                                <Copy className={`w-5 h-5 ${darkMode ? "text-gray-400 hover:text-blue-400" : "text-gray-400 hover:text-blue-600"}`} />
                              )}
                            </motion.button>
                          )}
                        </div>
                      </td>

                      {/* Active/Revoked Toggle */}
                      <td className="py-4 px-6">
                        <button
                          onClick={() => handleToggleActive(ac.agentId)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm transition-all cursor-pointer ${
                            ac.active
                              ? "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border border-blue-200 hover:shadow-md dark:from-blue-900/40 dark:to-indigo-900/40 dark:text-blue-400 dark:border-blue-700"
                              : "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${ac.active ? "bg-blue-500 animate-pulse" : "bg-red-500"}`} />
                          {ac.active ? (isUrdu ? "فعال" : "Granted") : (isUrdu ? "منسوخ" : "Revoked")}
                        </button>
                      </td>

                      {/* Expires */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5">
                          <Clock className={`w-3.5 h-3.5 ${countdownColor}`} />
                          <span className={`text-xs font-mono font-medium ${countdownColor}`}>
                            {countdown}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          {ac.active && (
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleShareViaWhatsApp(ac)}
                              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors shadow-sm bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/40"
                            >
                              <Send className="w-3.5 h-3.5" />
                              {isUrdu ? "شیئر" : "Share"}
                            </motion.button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredCodes.length === 0 && (
              <div className="text-center py-16">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${darkMode ? "bg-blue-950/30" : "bg-blue-100"}`}>
                  <Shield className={`w-8 h-8 ${darkMode ? "text-blue-400" : "text-blue-600"}`} />
                </div>
                <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  {searchTerm
                    ? (isUrdu ? "تلاش سے کوئی کوڈ نہیں ملا" : "No codes match your search")
                    : (isUrdu ? "ابھی کوئی ایجنٹ کوڈ نہیں۔ ایجنٹ کیسز سے سنک ہوں گے۔" : "No agent codes yet.")}
                </p>
              </div>
            )}
          </motion.div>

          {/* ── How It Works (bottom explainer) ─────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className={`mt-6 rounded-xl p-5 ${darkMode ? "bg-gray-800/30 border border-gray-700/50" : "bg-gray-50 border border-gray-200"}`}
          >
            <h3 className={`text-sm font-bold mb-3 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
              {isUrdu ? "📋 یہ کیسے کام کرتا ہے" : "📋 How This Works"}
            </h3>
            <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
              <div className="flex gap-2">
                <span className="font-bold text-blue-500 shrink-0">1.</span>
                <span>{isUrdu ? "کوڈز ہر 6 گھنٹے خود بخود بدلتے ہیں — دونوں ڈیوائسز ایک ہی کوڈ حساب کرتی ہیں" : "Codes auto-rotate every 6 hours — both devices independently compute the same code"}</span>
              </div>
              <div className="flex gap-2">
                <span className="font-bold text-blue-500 shrink-0">2.</span>
                <span>{isUrdu ? "ایجنٹ کو کوڈ واٹس ایپ/کال سے بھیجیں — وہ اپنی ڈیوائس پر لاگ ان ہوں گے" : "Share the code via WhatsApp/call — agent enters it on their own device"}</span>
              </div>
              <div className="flex gap-2">
                <span className="font-bold text-blue-500 shrink-0">3.</span>
                <span>{isUrdu ? "کسی ایجنٹ کو رسائی نہ دینا ہو تو کوڈ شیئر نہ کریں — بس اتنا ہی!" : "To deny access, simply don't share the code — the agent can't guess it!"}</span>
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}