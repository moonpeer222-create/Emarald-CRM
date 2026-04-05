import { useState, useEffect } from "react";
import { UserDB, User, UserRole, UserStatus } from "../../lib/userDatabase";
import { AccessCodeService } from "../../lib/accessCode";
import { toast } from "../../lib/toast";
import { useTheme } from "../../lib/ThemeContext";
import { copyToClipboard } from "../../lib/clipboard";
import { motion, AnimatePresence } from "motion/react";
import { staggerContainer, staggerItem, modalVariants } from "../../lib/animations";
import { NotificationService } from "../../lib/notifications";
import {
  Users, ShieldCheck, Shield, User as UserIcon, Check, Search, UserPlus, RefreshCw,
  Crown, Mail, Phone, Calendar, Edit, EyeOff, Eye, Trash2, X, Key,
  Copy, Lock, FileText, AlertTriangle
} from "lucide-react";

export function AdminUserManagement() {
  const { darkMode, isUrdu, fontClass, t } = useTheme();
  const dc = darkMode;
  const card = dc ? "bg-gray-800" : "bg-white";
  const txt = dc ? "text-white" : "text-gray-900";
  const sub = dc ? "text-gray-400" : "text-gray-600";
  const inputCls = `w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${dc ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" : "border-gray-300"}`;
  const labelCls = `block text-sm font-medium mb-1.5 ${dc ? "text-gray-300" : "text-gray-700"}`;

  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetPwModal, setShowResetPwModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [newUser, setNewUser] = useState({
    fullName: "", email: "", phone: "", password: "",
    role: "customer" as UserRole, caseId: "",
  });
  const [editData, setEditData] = useState<Partial<User>>({});
  const [newPassword, setNewPassword] = useState("");
  const [isMasterAdmin, setIsMasterAdmin] = useState(false);

  useEffect(() => {
    const session = UserDB.getAdminSession();
    setIsMasterAdmin(session?.role === "master_admin");
    loadUsers();
  }, []);
  useEffect(() => { applyFilters(); }, [searchTerm, roleFilter, statusFilter, users]);

  const loadUsers = async () => {
    await UserDB.initialize();
    const all = await UserDB.getAllUsers();
    setUsers(all);
  };

  const applyFilters = () => {
    let filtered = [...users];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(u =>
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.includes(searchTerm) ||
        (u.caseId && u.caseId.toLowerCase().includes(q)) ||
        (u.agentId && u.agentId.toLowerCase().includes(q))
      );
    }
    if (roleFilter !== "all") filtered = filtered.filter(u => u.role === roleFilter);
    if (statusFilter !== "all") filtered = filtered.filter(u => u.status === statusFilter);
    setFilteredUsers(filtered);
  };

  const handleCreateUser = async () => {
    if (!newUser.fullName || !newUser.email || !newUser.phone || !newUser.password) {
      toast.error("Please fill all required fields"); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUser.email)) {
      toast.error("Invalid email format"); return;
    }
    if (newUser.password.length < 6) {
      toast.error("Password must be at least 6 characters"); return;
    }
    const existing = await UserDB.getUserByEmail(newUser.email);
    if (existing) {
      toast.error("Email already exists"); return;
    }

    const lt = toast.loading("Creating user...");
    setTimeout(async () => {
      const agentId = newUser.role === "agent" ? await UserDB.getNextAgentId() : undefined;
      const created = await UserDB.createUser({
        fullName: newUser.fullName,
        email: newUser.email,
        phone: newUser.phone,
        password: newUser.password,
        role: newUser.role,
        status: "active",
        agentId,
        caseId: newUser.role === "customer" ? newUser.caseId : undefined,
      });

      // Auto-register agent in access code system
      if (newUser.role === "agent" && agentId) {
        const agentCode = AccessCodeService.registerAgent(agentId, newUser.fullName);
        toast.dismiss(lt);
        toast.success(`Agent ${newUser.fullName} created! Access code: ${agentCode.code}`);
        NotificationService.notifyUserCreated(newUser.fullName, "Agent");
      } else if (newUser.role === "customer") {
        toast.dismiss(lt);
        toast.success(`Customer ${newUser.fullName} created! Login: ${newUser.email} / ${newUser.password}`);
        NotificationService.notifyUserCreated(newUser.fullName, "Customer");
      } else {
        toast.dismiss(lt);
        toast.success(`User ${newUser.fullName} created successfully!`);
        NotificationService.notifyUserCreated(newUser.fullName, newUser.role);
      }

      const all = await UserDB.getAllUsers();
      setUsers(all);
      setShowCreateModal(false);
      setNewUser({ fullName: "", email: "", phone: "", password: "", role: "customer", caseId: "" });
    }, 800);
  };

  const handleUpdateUser = () => {
    if (!selectedUser) return;
    const lt = toast.loading("Updating user...");
    setTimeout(async () => {
      await UserDB.updateUser(selectedUser.id, editData);
      const all = await UserDB.getAllUsers();
      setUsers(all);
      toast.dismiss(lt);
      toast.success("User updated successfully!");
      setShowEditModal(false);
      setSelectedUser(null);
    }, 600);
  };

  const handleResetPassword = () => {
    if (!selectedUser) return;
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    const lt = toast.loading("Resetting password...");
    setTimeout(async () => {
      await UserDB.changePassword(selectedUser.id, newPassword);
      toast.dismiss(lt);
      toast.success(`Password reset for ${selectedUser.fullName}`);
      setShowResetPwModal(false);
      setNewPassword("");
      setSelectedUser(null);
    }, 600);
  };

  const handleDeleteUser = (user: User) => {
    if (user.role === "master_admin") { toast.error("Cannot delete master admin"); return; }
    if (!confirm(`Delete ${user.fullName}? This action cannot be undone.`)) return;
    const lt = toast.loading("Deleting user...");
    setTimeout(async () => {
      await UserDB.deleteUser(user.id);
      // Remove agent from access codes if applicable
      if (user.agentId) {
        AccessCodeService.removeAgent(user.agentId);
      }
      const all = await UserDB.getAllUsers();
      setUsers(all);
      toast.dismiss(lt);
      toast.success("User deleted!");
    }, 600);
  };

  const handleToggleStatus = async (user: User) => {
    const newStatus: UserStatus = user.status === "active" ? "inactive" : "active";
    await UserDB.updateUser(user.id, { status: newStatus });
    // Toggle agent access code too
    if (user.agentId) {
      AccessCodeService.toggleAgentActive(user.agentId);
    }
    const all = await UserDB.getAllUsers();
    setUsers(all);
    toast.success(`${user.fullName} is now ${newStatus}`);
  };

  const getAgentCode = (agentId: string): string => {
    const code = AccessCodeService.getAgentCode(agentId);
    return code?.code || "N/A";
  };

  const handleCopyCode = (code: string) => {
    copyToClipboard(code);
    setCopiedCode(code);
    toast.success("Access code copied!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleRefreshAgentCode = (user: User) => {
    if (!user.agentId) return;
    const updated = AccessCodeService.generateAgentCode(user.agentId);
    if (updated) {
      toast.success(`New code for ${user.fullName}: ${updated.code}`);
    }
  };

  const getRoleIcon = (role: UserRole) => {
    const map: Record<string, any> = { master_admin: Crown, admin: ShieldCheck, agent: Shield, customer: UserIcon, operator: Shield };
    return map[role] || UserIcon;
  };

  const getRoleColor = (role: UserRole) => {
    const colors: Record<string, string> = {
      master_admin: dc ? "bg-purple-900/30 text-purple-400 border-purple-600" : "bg-purple-100 text-purple-700 border-purple-200",
      admin: dc ? "bg-indigo-900/30 text-indigo-400 border-indigo-600" : "bg-indigo-100 text-indigo-700 border-indigo-200",
      agent: dc ? "bg-blue-900/30 text-blue-400 border-blue-600" : "bg-blue-100 text-blue-700 border-blue-200",
      customer: dc ? "bg-gray-700 text-gray-300 border-gray-500" : "bg-gray-100 text-gray-700 border-gray-200",
      operator: dc ? "bg-teal-900/30 text-teal-400 border-teal-600" : "bg-teal-100 text-teal-700 border-teal-200",
    };
    return colors[role] || colors.customer;
  };

  const getStatusColor = (status: UserStatus) => {
    const colors: Record<string, string> = {
      active: dc ? "bg-green-900/30 text-green-400" : "bg-green-100 text-green-700",
      inactive: dc ? "bg-gray-700 text-gray-400" : "bg-gray-100 text-gray-700",
      suspended: dc ? "bg-red-900/30 text-red-400" : "bg-red-100 text-red-700",
    };
    return colors[status] || colors.inactive;
  };

  const stats = UserDB.getStats();

  return (
    <div className={`${isUrdu ? fontClass : ""} transition-colors duration-300 ${dc ? "bg-gray-950" : "bg-gradient-to-br from-gray-50 to-gray-100"}`}>
      <div className="p-3 sm:p-4 md:p-6">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
            <div>
              <h1 className={`text-xl md:text-2xl font-bold mb-1 ${txt}`}>{isUrdu ? "صارف انتظام" : "User Management"}</h1>
              <p className={sub}>{isUrdu ? "ایڈمنز، ایجنٹس اور صارفین کا انتظام" : "Manage admins, agents, and customers"}</p>
            </div>
            <div className="flex gap-3">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={loadUsers} className={`flex items-center gap-2 px-4 py-2 border rounded-xl shadow-sm transition-all ${dc ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-white"}`}>
                <RefreshCw className="w-4 h-4" /> {isUrdu ? "تازہ کریں" : "Refresh"}
              </motion.button>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg">
                <UserPlus className="w-4 h-4" /> {isUrdu ? "نیا صارف بنائیں" : "Create User"}
              </motion.button>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {[
              { label: isUrdu ? "کل صارفین" : "Total Users", value: stats.total, icon: Users, color: "text-blue-600" },
              { label: isUrdu ? "ایڈمنز" : "Admins", value: stats.admins, icon: ShieldCheck, color: "text-indigo-600" },
              { label: isUrdu ? "ایجنٹس" : "Agents", value: stats.agents, icon: Shield, color: "text-purple-600" },
              { label: isUrdu ? "صارفین" : "Customers", value: stats.customers, icon: UserIcon, color: "text-orange-600" },
              { label: isUrdu ? "فعال" : "Active", value: stats.active, icon: Check, color: "text-green-600" },
            ].map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <motion.div key={idx} variants={staggerItem} whileHover={{ y: -4 }} className={`${card} rounded-xl shadow-lg p-4 border ${dc ? "border-gray-700" : "border-gray-100"}`}>
                  <Icon className={`w-7 h-7 ${stat.color} mb-2`} />
                  <h3 className={`text-2xl font-bold ${txt}`}>{stat.value}</h3>
                  <p className={`text-xs ${sub}`}>{stat.label}</p>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Filters */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`${card} rounded-2xl shadow-lg p-4 md:p-6 mb-6`}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={isUrdu ? "نام، ای میل، فون سے تلاش..." : "Search by name, email, phone, case ID..."} className={`${inputCls} pl-12`} />
              </div>
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={inputCls}>
                <option value="all">{isUrdu ? "تمام کردار" : "All Roles"}</option>
                {isMasterAdmin && <option value="master_admin">{isUrdu ? "ماسٹر ایڈمن" : "Master Admin"}</option>}
                <option value="admin">{isUrdu ? "ایڈمن" : "Admin"}</option>
                <option value="agent">{isUrdu ? "ایجنٹ" : "Agent"}</option>
                <option value="customer">{isUrdu ? "صارف" : "Customer"}</option>
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputCls}>
                <option value="all">{isUrdu ? "تمام حیثیت" : "All Statuses"}</option>
                <option value="active">{isUrdu ? "فعال" : "Active"}</option>
                <option value="inactive">{isUrdu ? "غیر فعال" : "Inactive"}</option>
                <option value="suspended">{isUrdu ? "معطل" : "Suspended"}</option>
              </select>
            </div>
          </motion.div>

          {/* Users Table */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`${card} rounded-2xl shadow-lg overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`${dc ? "bg-gray-700" : "bg-gray-50"} border-b ${dc ? "border-gray-600" : "border-gray-200"}`}>
                  <tr>
                    {[isUrdu ? "صارف" : "User", isUrdu ? "رابطہ" : "Contact", isUrdu ? "کردار" : "Role", isUrdu ? "لاگ ان معلومات" : "Login Info", isUrdu ? "حیثیت" : "Status", isUrdu ? "اعمال" : "Actions"].map((h) => (
                      <th key={h} className={`text-left py-4 px-4 md:px-6 text-xs font-semibold uppercase tracking-wider ${dc ? "text-gray-400" : "text-gray-500"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user, idx) => {
                    const RoleIcon = getRoleIcon(user.role);
                    const agentCode = user.agentId ? getAgentCode(user.agentId) : null;
                    return (
                      <motion.tr key={user.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.03 }} className={`border-b transition-colors ${dc ? "border-gray-700/50 hover:bg-gray-700/30" : "border-gray-100 hover:bg-gray-50"}`}>
                        <td className="py-4 px-4 md:px-6">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                              user.role === "master_admin" ? "bg-gradient-to-br from-purple-500 to-purple-600" :
                              user.role === "admin" ? "bg-gradient-to-br from-amber-500 to-amber-600" :
                              user.role === "agent" ? "bg-gradient-to-br from-blue-400 to-blue-600" :
                              "bg-gradient-to-br from-cyan-400 to-cyan-600"
                            }`}>
                              {user.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className={`font-semibold text-sm ${txt}`}>{user.fullName}</p>
                              <p className={`text-xs ${sub}`}>{user.id}{user.agentId ? ` • ${user.agentId}` : ""}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 md:px-6">
                          <div className="space-y-1">
                            <div className={`flex items-center gap-2 text-sm ${sub}`}><Mail className="w-3.5 h-3.5 shrink-0" /> <span className="truncate max-w-[180px]">{user.email}</span></div>
                            <div className={`flex items-center gap-2 text-sm ${sub}`}><Phone className="w-3.5 h-3.5 shrink-0" /> {user.phone}</div>
                          </div>
                        </td>
                        <td className="py-4 px-4 md:px-6">
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border ${getRoleColor(user.role)}`}>
                            <RoleIcon className="w-3.5 h-3.5" />
                            <span className="text-xs font-semibold capitalize">{user.role.replace("_", " ")}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 md:px-6">
                          {user.role === "agent" && agentCode ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className={`font-mono text-sm font-bold tracking-widest ${dc ? "text-blue-400" : "text-blue-600"}`}>{agentCode}</span>
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => handleCopyCode(agentCode)}
                                  className={`p-1 rounded ${dc ? "hover:bg-gray-600" : "hover:bg-gray-100"}`}
                                >
                                  {copiedCode === agentCode ? <Check className="w-3.5 h-3.5 text-blue-500" /> : <Copy className="w-3.5 h-3.5" />}
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => handleRefreshAgentCode(user)}
                                  className={`p-1 rounded ${dc ? "hover:bg-gray-600" : "hover:bg-gray-100"}`}
                                  title="Generate new code"
                                >
                                  <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
                                </motion.button>
                              </div>
                              <p className={`text-[10px] ${sub}`}>{isUrdu ? "6 ہندسوں کا ایکسیس کوڈ" : "6-digit access code"}</p>
                            </div>
                          ) : user.role === "customer" ? (
                            <div className="space-y-1">
                              <div className={`flex items-center gap-1.5 text-xs ${sub}`}>
                                <FileText className="w-3 h-3" />
                                {user.caseId || (isUrdu ? "کوئی کیس نہیں" : "No case linked")}
                              </div>
                              <p className={`text-[10px] ${sub}`}>{isUrdu ? "ای میل + پاس ورڈ لاگ ان" : "Email + password login"}</p>
                            </div>
                          ) : (
                            <div className={`text-xs ${sub}`}>
                              <p>{isUrdu ? "ای میل + پاس ورڈ" : "Email + password"}</p>
                              {user.lastLogin && (
                                <p className="text-[10px] mt-0.5">{isUrdu ? "آخری لاگ ان: " : "Last: "}{new Date(user.lastLogin).toLocaleDateString()}</p>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4 md:px-6">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(user.status)}`}>{user.status}</span>
                        </td>
                        <td className="py-4 px-4 md:px-6">
                          <div className="flex gap-1">
                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => { setSelectedUser(user); setShowViewModal(true); }} className={`p-2 text-gray-500 rounded-lg ${dc ? "hover:bg-gray-700" : "hover:bg-gray-100"}`} title="View details"><Eye className="w-4 h-4" /></motion.button>
                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => { setSelectedUser(user); setEditData({ fullName: user.fullName, phone: user.phone, role: user.role, status: user.status, email: user.email, caseId: user.caseId }); setShowEditModal(true); }} className={`p-2 text-blue-600 rounded-lg ${dc ? "hover:bg-blue-900/20" : "hover:bg-blue-50"}`} title="Edit"><Edit className="w-4 h-4" /></motion.button>
                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => { setSelectedUser(user); setNewPassword(""); setShowResetPwModal(true); }} className={`p-2 text-amber-600 rounded-lg ${dc ? "hover:bg-amber-900/20" : "hover:bg-amber-50"}`} title="Reset password"><Key className="w-4 h-4" /></motion.button>
                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleToggleStatus(user)} className={`p-2 rounded-lg ${user.status === "active" ? "text-orange-600" : "text-green-600"} ${user.status === "active" ? (dc ? "hover:bg-orange-900/20" : "hover:bg-orange-50") : (dc ? "hover:bg-green-900/20" : "hover:bg-green-50")}`} title={user.status === "active" ? "Deactivate" : "Activate"}>
                              {user.status === "active" ? <EyeOff className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                            </motion.button>
                            {user.role !== "master_admin" && (
                              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleDeleteUser(user)} className={`p-2 text-red-600 rounded-lg ${dc ? "hover:bg-red-900/20" : "hover:bg-red-50"}`} title="Delete"><Trash2 className="w-4 h-4" /></motion.button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <Users className={`w-12 h-12 mx-auto mb-4 ${sub}`} />
                <p className={sub}>{isUrdu ? "کوئی صارف نہیں ملا" : "No users found"}</p>
              </div>
            )}
          </motion.div>
        </div>

      {/* ───────── Create User Modal ───────── */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
            <motion.div variants={modalVariants} initial="hidden" animate="visible" exit="exit" onClick={(e) => e.stopPropagation()} className={`${dc ? "bg-gray-800" : "bg-white"} rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto`}>
              <div className={`flex items-center justify-between p-6 border-b ${dc ? "border-gray-700" : "border-gray-200"}`}>
                <h2 className={`text-lg font-bold ${txt}`}>{isUrdu ? "نیا صارف بنائیں" : "Create New User"}</h2>
                <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={() => setShowCreateModal(false)} className={`p-2 rounded-full ${dc ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}><X className="w-5 h-5" /></motion.button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className={labelCls}>{isUrdu ? "کردار *" : "Role *"}</label>
                  <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })} className={inputCls}>
                    <option value="customer">{isUrdu ? "صارف" : "Customer"}</option>
                    <option value="agent">{isUrdu ? "ایجنٹ" : "Agent"}</option>
                    <option value="admin">{isUrdu ? "ایڈمن" : "Admin"}</option>
                    {isMasterAdmin && <option value="master_admin">{isUrdu ? "ماسٹر ایڈمن" : "Master Admin"}</option>}
                  </select>
                  {newUser.role === "agent" && (
                    <p className={`text-xs mt-1 ${dc ? "text-blue-400" : "text-blue-600"}`}>
                      <Key className="w-3 h-3 inline mr-1" />
                      {isUrdu ? "ایک 6 ہندسوں کا ایکسیس کوڈ خود بخود بنایا جائے گا" : "A 6-digit access code will be auto-generated"}
                    </p>
                  )}
                </div>
                <div>
                  <label className={labelCls}>{isUrdu ? "پورا نام *" : "Full Name *"}</label>
                  <input type="text" value={newUser.fullName} onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })} className={inputCls} placeholder={isUrdu ? "پورا نام درج کریں" : "Enter full name"} />
                </div>
                <div>
                  <label className={labelCls}>{isUrdu ? "ای میل *" : "Email *"}</label>
                  <input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className={inputCls} placeholder="email@example.com" dir="ltr" />
                </div>
                <div>
                  <label className={labelCls}>{isUrdu ? "فون *" : "Phone *"}</label>
                  <input type="tel" value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} className={inputCls} placeholder="+92 3XX XXXXXXX" dir="ltr" />
                </div>
                <div>
                  <label className={labelCls}>{isUrdu ? "پاس ورڈ *" : "Password *"}</label>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className={inputCls} placeholder={isUrdu ? "کم از کم 6 حروف" : "Min 6 characters"} dir="ltr" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className={`absolute right-3 top-1/2 -translate-y-1/2 ${sub}`}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {newUser.role === "customer" && (
                  <div>
                    <label className={labelCls}>{isUrdu ? "کیس آئی ڈی (اختیاری)" : "Case ID (optional)"}</label>
                    <input type="text" value={newUser.caseId} onChange={(e) => setNewUser({ ...newUser, caseId: e.target.value.toUpperCase() })} className={inputCls} placeholder="EMR-2024-XXXX" dir="ltr" />
                    <p className={`text-xs mt-1 ${sub}`}>{isUrdu ? "صارف کیس آئی ڈی + فون سے بھی لاگ ان کر سکتا ہے" : "Customer can also login via Case ID + phone"}</p>
                  </div>
                )}
              </div>
              <div className={`flex gap-3 p-6 border-t ${dc ? "border-gray-700" : "border-gray-200"}`}>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowCreateModal(false)} className={`flex-1 py-3 rounded-xl border ${dc ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}>{isUrdu ? "منسوخ" : "Cancel"}</motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleCreateUser} className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold flex items-center justify-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  {isUrdu ? "صارف بنائیں" : "Create User"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ───────── Edit User Modal ───────── */}
      <AnimatePresence>
        {showEditModal && selectedUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowEditModal(false)}>
            <motion.div variants={modalVariants} initial="hidden" animate="visible" exit="exit" onClick={(e) => e.stopPropagation()} className={`${dc ? "bg-gray-800" : "bg-white"} rounded-2xl shadow-2xl w-full max-w-md`}>
              <div className={`flex items-center justify-between p-6 border-b ${dc ? "border-gray-700" : "border-gray-200"}`}>
                <h2 className={`text-lg font-bold ${txt}`}>{isUrdu ? "صارف میں ترمیم" : "Edit User"}</h2>
                <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={() => setShowEditModal(false)} className={`p-2 rounded-full ${dc ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}><X className="w-5 h-5" /></motion.button>
              </div>
              <div className="p-6 space-y-4">
                <div><label className={labelCls}>{isUrdu ? "پورا نام" : "Full Name"}</label><input type="text" value={editData.fullName || ""} onChange={(e) => setEditData({ ...editData, fullName: e.target.value })} className={inputCls} /></div>
                <div><label className={labelCls}>{isUrdu ? "ای میل" : "Email"}</label><input type="email" value={editData.email || ""} onChange={(e) => setEditData({ ...editData, email: e.target.value })} className={inputCls} dir="ltr" /></div>
                <div><label className={labelCls}>{isUrdu ? "فون" : "Phone"}</label><input type="tel" value={editData.phone || ""} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} className={inputCls} dir="ltr" /></div>
                {(selectedUser.role === "customer" || editData.role === "customer") && (
                  <div><label className={labelCls}>{isUrdu ? "کیس آئی ڈی" : "Case ID"}</label><input type="text" value={editData.caseId || ""} onChange={(e) => setEditData({ ...editData, caseId: e.target.value.toUpperCase() })} className={inputCls} dir="ltr" /></div>
                )}
                <div><label className={labelCls}>{isUrdu ? "کردار" : "Role"}</label>
                  <select value={editData.role || ""} onChange={(e) => setEditData({ ...editData, role: e.target.value as UserRole })} className={inputCls} disabled={selectedUser.role === "master_admin"}>
                    <option value="customer">{isUrdu ? "صارف" : "Customer"}</option>
                    <option value="agent">{isUrdu ? "ایجنٹ" : "Agent"}</option>
                    <option value="admin">{isUrdu ? "ایڈمن" : "Admin"}</option>
                    {isMasterAdmin && <option value="master_admin">{isUrdu ? "ماسٹر ایڈمن" : "Master Admin"}</option>}
                  </select>
                </div>
                <div><label className={labelCls}>{isUrdu ? "حیثیت" : "Status"}</label>
                  <select value={editData.status || ""} onChange={(e) => setEditData({ ...editData, status: e.target.value as UserStatus })} className={inputCls}>
                    <option value="active">{isUrdu ? "فعال" : "Active"}</option>
                    <option value="inactive">{isUrdu ? "غیر فعال" : "Inactive"}</option>
                    <option value="suspended">{isUrdu ? "معطل" : "Suspended"}</option>
                  </select>
                </div>
              </div>
              <div className={`flex gap-3 p-6 border-t ${dc ? "border-gray-700" : "border-gray-200"}`}>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowEditModal(false)} className={`flex-1 py-3 rounded-xl border ${dc ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}>{isUrdu ? "منسوخ" : "Cancel"}</motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleUpdateUser} className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold">{isUrdu ? "تبدیلیاں محفوظ کریں" : "Save Changes"}</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ───────── Reset Password Modal ───────── */}
      <AnimatePresence>
        {showResetPwModal && selectedUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowResetPwModal(false)}>
            <motion.div variants={modalVariants} initial="hidden" animate="visible" exit="exit" onClick={(e) => e.stopPropagation()} className={`${dc ? "bg-gray-800" : "bg-white"} rounded-2xl shadow-2xl w-full max-w-sm`}>
              <div className={`flex items-center justify-between p-6 border-b ${dc ? "border-gray-700" : "border-gray-200"}`}>
                <h2 className={`text-lg font-bold ${txt}`}>{isUrdu ? "پاس ورڈ ری سیٹ" : "Reset Password"}</h2>
                <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={() => setShowResetPwModal(false)} className={`p-2 rounded-full ${dc ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}><X className="w-5 h-5" /></motion.button>
              </div>
              <div className="p-6 space-y-4">
                <div className={`flex items-center gap-3 p-3 rounded-lg ${dc ? "bg-gray-700/50" : "bg-gray-50"}`}>
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {selectedUser.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className={`font-semibold text-sm ${txt}`}>{selectedUser.fullName}</p>
                    <p className={`text-xs ${sub}`}>{selectedUser.email}</p>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>{isUrdu ? "نیا پاس ورڈ" : "New Password"}</label>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputCls} placeholder={isUrdu ? "کم از کم 6 حروف" : "Min 6 characters"} dir="ltr" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className={`absolute right-3 top-1/2 -translate-y-1/2 ${sub}`}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className={`flex items-start gap-2 p-3 rounded-lg text-xs ${dc ? "bg-amber-900/20 text-amber-300" : "bg-amber-50 text-amber-700"}`}>
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{isUrdu ? "یہ صارف کا فوری طور پر پاس ورڈ تبدیل کر دے گا" : "This will immediately change the user's password"}</span>
                </div>
              </div>
              <div className={`flex gap-3 p-6 border-t ${dc ? "border-gray-700" : "border-gray-200"}`}>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowResetPwModal(false)} className={`flex-1 py-3 rounded-xl border ${dc ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}>{isUrdu ? "منسوخ" : "Cancel"}</motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleResetPassword} className="flex-1 py-3 bg-amber-600 text-white rounded-xl hover:bg-amber-700 font-semibold flex items-center justify-center gap-2">
                  <Lock className="w-4 h-4" />
                  {isUrdu ? "پاس ورڈ ری سیٹ" : "Reset Password"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ───────── View User Modal ───────── */}
      <AnimatePresence>
        {showViewModal && selectedUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowViewModal(false)}>
            <motion.div variants={modalVariants} initial="hidden" animate="visible" exit="exit" onClick={(e) => e.stopPropagation()} className={`${dc ? "bg-gray-800" : "bg-white"} rounded-2xl shadow-2xl w-full max-w-md`}>
              <div className={`flex items-center justify-between p-6 border-b ${dc ? "border-gray-700" : "border-gray-200"}`}>
                <h2 className={`text-lg font-bold ${txt}`}>{isUrdu ? "صارف کی تفصیلات" : "User Details"}</h2>
                <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={() => setShowViewModal(false)} className={`p-2 rounded-full ${dc ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}><X className="w-5 h-5" /></motion.button>
              </div>
              <div className="p-6 space-y-4">
                {/* User card */}
                <div className="text-center">
                  <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center text-white font-bold text-xl mb-3 ${
                    selectedUser.role === "master_admin" ? "bg-gradient-to-br from-purple-500 to-purple-600" :
                    selectedUser.role === "admin" ? "bg-gradient-to-br from-amber-500 to-amber-600" :
                    selectedUser.role === "agent" ? "bg-gradient-to-br from-blue-400 to-blue-600" :
                    "bg-gradient-to-br from-cyan-400 to-cyan-600"
                  }`}>
                    {selectedUser.fullName.charAt(0).toUpperCase()}
                  </div>
                  <h3 className={`text-lg font-bold ${txt}`}>{selectedUser.fullName}</h3>
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border mt-1 ${getRoleColor(selectedUser.role)}`}>
                    {(() => { const Icon = getRoleIcon(selectedUser.role); return <Icon className="w-3.5 h-3.5" />; })()}
                    <span className="text-xs font-semibold capitalize">{selectedUser.role.replace("_", " ")}</span>
                  </div>
                </div>
                <div className={`space-y-3 text-sm ${dc ? "text-gray-300" : "text-gray-700"}`}>
                  {[
                    { label: "ID", value: selectedUser.id },
                    { label: isUrdu ? "ای میل" : "Email", value: selectedUser.email },
                    { label: isUrdu ? "فون" : "Phone", value: selectedUser.phone },
                    { label: isUrdu ? "حیثیت" : "Status", value: selectedUser.status },
                    ...(selectedUser.agentId ? [{ label: isUrdu ? "ایجنٹ آئی ڈی" : "Agent ID", value: selectedUser.agentId }] : []),
                    ...(selectedUser.caseId ? [{ label: isUrdu ? "کیس آئی ڈی" : "Case ID", value: selectedUser.caseId }] : []),
                    { label: isUrdu ? "بنایا گیا" : "Created", value: new Date(selectedUser.createdAt).toLocaleDateString() },
                    { label: isUrdu ? "آخری لاگ ان" : "Last Login", value: selectedUser.lastLogin ? new Date(selectedUser.lastLogin).toLocaleString() : (isUrdu ? "کبھی نہیں" : "Never") },
                  ].map((item, i) => (
                    <div key={i} className={`flex justify-between py-2 border-b ${dc ? "border-gray-700/50" : "border-gray-100"}`}>
                      <span className={sub}>{item.label}</span>
                      <span className="font-medium">{item.value}</span>
                    </div>
                  ))}
                  {selectedUser.agentId && (
                    <div className={`flex justify-between items-center py-2 border-b ${dc ? "border-gray-700/50" : "border-gray-100"}`}>
                      <span className={sub}>{isUrdu ? "ایکسیس کوڈ" : "Access Code"}</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-mono font-bold tracking-widest ${dc ? "text-blue-400" : "text-blue-600"}`}>{getAgentCode(selectedUser.agentId)}</span>
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleCopyCode(getAgentCode(selectedUser.agentId!))} className="p-1">
                          <Copy className="w-3.5 h-3.5 text-blue-500" />
                        </motion.button>
                      </div>
                    </div>
                  )}
                  <div className={`flex justify-between py-2`}>
                    <span className={sub}>{isUrdu ? "پاس ورڈ" : "Password"}</span>
                    <span className="font-medium font-mono">{selectedUser.password}</span>
                  </div>
                </div>
              </div>
              <div className={`p-6 border-t ${dc ? "border-gray-700" : "border-gray-200"}`}>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowViewModal(false)} className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold">{isUrdu ? "بند کریں" : "Close"}</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}