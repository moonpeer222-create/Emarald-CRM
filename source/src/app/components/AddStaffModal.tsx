/**
 * AddStaffModal — Create new Agent accounts with auto-generated access codes.
 * Used in Admin and Master portals for staff management.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X, UserPlus, User, Mail, Phone, Shield, Key, Copy, Check, Loader2, Eye, EyeOff, Briefcase,
} from "lucide-react";
import { UserDB, UserRole } from "../lib/userDatabase";
import { AccessCodeService } from "../lib/accessCode";
import { NotificationService } from "../lib/notifications";
import { toast } from "../lib/toast";
import { copyToClipboard } from "../lib/clipboard";
import { AuditLogService } from "../lib/auditLog";
import { modalVariants } from "../lib/animations";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  isUrdu: boolean;
  createdBy: string;
  createdByRole: "admin" | "master_admin";
  onCreated?: () => void;
}

export function AddStaffModal({
  isOpen, onClose, darkMode: dc, isUrdu, createdBy, createdByRole, onCreated,
}: Props) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("agent");
  const [specialization, setSpecialization] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createdAgent, setCreatedAgent] = useState<{ name: string; code: string; agentId: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const txt = dc ? "text-white" : "text-gray-900";
  const sub = dc ? "text-gray-400" : "text-gray-500";
  const inputCls = `w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all ${
    dc ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" : "bg-white border-gray-300 text-gray-900"
  }`;
  const labelCls = `block text-xs font-semibold mb-1.5 ${dc ? "text-gray-300" : "text-gray-600"}`;

  const availableRoles: { value: UserRole; label: string; labelUrdu: string }[] = [
    { value: "agent", label: "Agent", labelUrdu: "ایجنٹ" },
    ...(createdByRole === "master_admin" ? [
      { value: "admin" as UserRole, label: "Admin", labelUrdu: "ایڈمن" },
      { value: "operator" as UserRole, label: "Operator", labelUrdu: "آپریٹر" },
    ] : []),
  ];

  const handleCreate = async () => {
    if (!fullName.trim()) { toast.error(isUrdu ? "نام درج کریں" : "Name is required"); return; }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error(isUrdu ? "درست ای میل درج کریں" : "Valid email required"); return;
    }
    if (!phone.trim()) { toast.error(isUrdu ? "فون نمبر درج کریں" : "Phone is required"); return; }
    if (!password || password.length < 8) {
      toast.error(isUrdu ? "پاس ورڈ کم از کم 8 حروف" : "Password minimum 8 characters"); return;
    }
    if (UserDB.getUserByEmail(email)) {
      toast.error(isUrdu ? "یہ ای میل پہلے سے موجود ہے" : "Email already exists"); return;
    }

    setSaving(true);
    try {
      await UserDB.initialize();
      const agentId = role === "agent" ? UserDB.getNextAgentId() : undefined;

      await UserDB.createUser({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        role,
        status: "active",
        agentId,
      });

      let agentCode = "";
      if (role === "agent" && agentId) {
        const codeObj = AccessCodeService.registerAgent(agentId, fullName.trim());
        agentCode = codeObj.code;
        setCreatedAgent({ name: fullName.trim(), code: agentCode, agentId });
      }

      // Push changes to server via sync
      try {
        const { pushCases } = await import("../lib/syncService");
        await pushCases();
      } catch { /* offline-first */ }

      // Audit log
      AuditLogService.log({
        userId: createdBy,
        userName: createdBy,
        role: createdByRole,
        action: "user_created",
        category: "user",
        description: `Created ${role} account: ${fullName} (${email})${agentId ? ` — Agent ID: ${agentId}` : ""}`,
        metadata: { role, email, agentId },
      });

      NotificationService.notifyUserCreated(fullName, role);

      if (role !== "agent") {
        toast.success(isUrdu ? `${fullName} اکاؤنٹ بن گیا` : `${fullName} account created!`);
        resetAndClose();
      } else {
        toast.success(isUrdu ? `ایجنٹ ${fullName} بن گیا!` : `Agent ${fullName} created!`);
      }

      onCreated?.();
    } catch (err) {
      toast.error(`Error: ${err}`);
    } finally {
      setSaving(false);
    }
  };

  const resetAndClose = () => {
    setFullName(""); setEmail(""); setPhone(""); setPassword("");
    setRole("agent"); setSpecialization(""); setCreatedAgent(null);
    onClose();
  };

  const handleCopyCode = async () => {
    if (!createdAgent) return;
    await copyToClipboard(`Agent: ${createdAgent.name}\nID: ${createdAgent.agentId}\nAccess Code: ${createdAgent.code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={resetAndClose}
      >
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-md rounded-2xl overflow-hidden shadow-2xl ${dc ? "bg-gray-800" : "bg-white"}`}
        >
          {/* Header */}
          <div className={`p-5 border-b ${dc ? "border-gray-700" : "border-gray-200"} flex items-center justify-between`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className={`text-lg font-bold ${txt}`}>{isUrdu ? "نیا اسٹاف شامل کریں" : "Add New Staff"}</h3>
                <p className={`text-xs ${sub}`}>{isUrdu ? "ایجنٹ / ایڈمن اکاؤنٹ بنائیں" : "Create agent or admin account"}</p>
              </div>
            </div>
            <button onClick={resetAndClose} className={`p-2 rounded-lg ${dc ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
            {createdAgent ? (
              /* Success state — show credentials */
              <div className="space-y-4">
                <div className={`p-5 rounded-xl text-center ${dc ? "bg-emerald-950/30 border border-emerald-800" : "bg-emerald-50 border border-emerald-200"}`}>
                  <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto mb-3">
                    <Check className="w-7 h-7" />
                  </div>
                  <h4 className={`text-lg font-bold ${txt}`}>{isUrdu ? "ایجنٹ بن گیا!" : "Agent Created!"}</h4>
                  <p className={`text-sm mt-1 ${sub}`}>{createdAgent.name}</p>
                </div>

                <div className={`p-4 rounded-xl space-y-3 ${dc ? "bg-gray-700/50" : "bg-gray-50"}`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-medium ${sub}`}>{isUrdu ? "ایجنٹ آئی ڈی" : "Agent ID"}</span>
                    <span className={`text-sm font-mono font-bold ${txt}`}>{createdAgent.agentId}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-medium ${sub}`}>{isUrdu ? "رسائی کوڈ" : "Access Code"}</span>
                    <span className="text-sm font-mono font-bold text-emerald-500">{createdAgent.code}</span>
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCopyCode}
                  className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                    copied
                      ? "bg-emerald-500 text-white"
                      : dc ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? (isUrdu ? "کاپی ہو گیا" : "Copied!") : (isUrdu ? "کاپی کریں" : "Copy Credentials")}
                </motion.button>

                <button onClick={resetAndClose} className={`w-full py-2.5 rounded-xl text-sm font-medium ${dc ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-800"}`}>
                  {isUrdu ? "بند کریں" : "Close"}
                </button>
              </div>
            ) : (
              /* Form */
              <>
                <div>
                  <label className={labelCls}><User className="w-3 h-3 inline mr-1" />{isUrdu ? "پورا نام" : "Full Name"} *</label>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={isUrdu ? "مکمل نام" : "Full name"} className={inputCls} />
                </div>

                <div>
                  <label className={labelCls}><Mail className="w-3 h-3 inline mr-1" />{isUrdu ? "ای میل" : "Email"} *</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@universalcrm.com" className={inputCls} />
                </div>

                <div>
                  <label className={labelCls}><Phone className="w-3 h-3 inline mr-1" />{isUrdu ? "فون" : "Phone"} *</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+92 3XX XXXXXXX" className={inputCls} />
                </div>

                <div>
                  <label className={labelCls}><Key className="w-3 h-3 inline mr-1" />{isUrdu ? "پاس ورڈ" : "Password"} *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={isUrdu ? "کم از کم 8 حروف" : "Minimum 8 characters"}
                      className={inputCls}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {showPassword ? <EyeOff className={`w-4 h-4 ${sub}`} /> : <Eye className={`w-4 h-4 ${sub}`} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className={labelCls}><Shield className="w-3 h-3 inline mr-1" />{isUrdu ? "کردار" : "Role"} *</label>
                  <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className={inputCls}>
                    {availableRoles.map(r => (
                      <option key={r.value} value={r.value}>{isUrdu ? r.labelUrdu : r.label}</option>
                    ))}
                  </select>
                </div>

                {role === "agent" && (
                  <div>
                    <label className={labelCls}><Briefcase className="w-3 h-3 inline mr-1" />{isUrdu ? "تخصص" : "Specialization"}</label>
                    <input type="text" value={specialization} onChange={(e) => setSpecialization(e.target.value)}
                      placeholder={isUrdu ? "مثلاً خلیجی ممالک" : "e.g. Gulf Countries"} className={inputCls} />
                  </div>
                )}

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCreate}
                  disabled={saving}
                  className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                    saving ? "bg-emerald-500/50 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20"
                  } text-white`}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  {saving ? (isUrdu ? "بنایا جا رہا ہے..." : "Creating...") : (isUrdu ? "اکاؤنٹ بنائیں" : "Create Account")}
                </motion.button>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
