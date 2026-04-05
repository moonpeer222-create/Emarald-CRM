import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Search, Grid, List, Download, Phone, Mail, Eye, Edit, X, Key, Shield, UserCheck, UserX, RefreshCw } from "lucide-react";
import { AdminHeader } from "../../components/AdminHeader";
import { AdminSidebar } from "../../components/AdminSidebar";
import { AddStaffModal } from "../../components/AddStaffModal";
import { toast } from "../../lib/toast";
import { modalVariants, staggerContainer, staggerItem } from "../../lib/animations";
import { useTheme } from "../../lib/ThemeContext";
import { AttendanceService } from "../../lib/attendanceService";
import { UserDB, CRMUser } from "../../lib/userDatabase";
import { AccessCodeService } from "../../lib/accessCode";
import { CRMDataStore } from "../../lib/mockData";
import { AuditLogService } from "../../lib/auditLog";
import { useUnifiedLayout } from "../../components/UnifiedLayout";

interface AgentView {
  id: string;
  userId: string;
  agentId: string;
  name: string;
  phone: string;
  email: string;
  role: string;
  status: "active" | "inactive" | "suspended";
  cases: number;
  attendance: number;
  joinDate: string;
  photo: string;
  codeActive: boolean;
  currentCode: string;
  lastLogin: string | null;
}

export function AdminTeam() {
  const { darkMode, isUrdu, fontClass, t } = useTheme();
  const dc = darkMode;
  const card = dc ? "bg-gray-800" : "bg-white";
  const txt = dc ? "text-white" : "text-gray-900";
  const sub = dc ? "text-gray-400" : "text-gray-600";

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentView | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", email: "", role: "", status: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [agents, setAgents] = useState<AgentView[]>([]);

  const { insideUnifiedLayout } = useUnifiedLayout();

  // Deep-link
  const [deepLinked, setDeepLinked] = useState(false);
  const location = useLocation();

  const loadAgents = useCallback(() => {
    const users = UserDB.getAllUsersSync().filter(u => u.role === "agent");
    const allCases = CRMDataStore.getCases();
    const totpCodes = AccessCodeService.getAllTOTPCodes();

    const mapped: AgentView[] = users.map(u => {
      const agentId = u.agentId || "";
      const agentCases = allCases.filter(c => c.agentId === agentId || c.agentName === u.fullName);
      const codeInfo = totpCodes.find(c => c.agentId === agentId);
      const attendanceData = AttendanceService.getRecordsForAgent(agentId || u.fullName);
      const attendancePct = attendanceData && attendanceData.length > 0
        ? Math.round((attendanceData.filter((a: any) => a.status === "present" || a.status === "late").length / attendanceData.length) * 100)
        : 100;

      return {
        id: u.id,
        userId: u.id,
        agentId,
        name: u.fullName,
        phone: u.phone,
        email: u.email,
        role: u.meta?.title || "Agent",
        status: u.status,
        cases: agentCases.length,
        attendance: attendancePct,
        joinDate: new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        photo: u.fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2),
        codeActive: codeInfo?.active !== false,
        currentCode: codeInfo?.code || "------",
        lastLogin: u.lastLogin,
      };
    });
    setAgents(mapped);
  }, []);

  useEffect(() => {
    loadAgents();
    const interval = setInterval(loadAgents, 10000);
    return () => clearInterval(interval);
  }, [loadAgents]);

  // Deep-link from notifications
  useEffect(() => {
    const state = location.state as { highlightAgent?: string; fromNotification?: boolean } | null;
    if (state?.highlightAgent) {
      setSearchTerm(state.highlightAgent);
      const agent = agents.find(a => a.name === state.highlightAgent);
      if (agent) {
        setSelectedAgent(agent);
        setShowViewModal(true);
        if (state.fromNotification) {
          setDeepLinked(true);
          setTimeout(() => setDeepLinked(false), 3200);
          toast.success(isUrdu ? `${state.highlightAgent} کا پروفائل کھولا گیا` : `Opened profile for ${state.highlightAgent}`);
        }
      }
      window.history.replaceState({}, document.title);
    }
  }, [location.state, agents]);

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.phone.includes(searchTerm) ||
    agent.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.agentId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleStatus = (agentUserId: string) => {
    const agent = agents.find(a => a.userId === agentUserId);
    if (!agent) return;
    const newStatus = agent.status === "active" ? "inactive" : "active";
    UserDB.updateUser(agentUserId, { status: newStatus as any });

    // Sync TOTP active state
    if (agent.agentId) {
      AccessCodeService.toggleAgentActive(agent.agentId);
    }

    AuditLogService.log({
      userId: "admin", userName: "Admin", role: "admin",
      action: "user_status_changed",
      category: "user",
      description: `Agent ${agent.name} (${agent.agentId}) status → ${newStatus}`,
      metadata: { agentId: agent.agentId, newStatus },
    });

    toast.success(`${agent.name} marked as ${newStatus}`);
    loadAgents();
  };

  const handleEditAgent = (agent: AgentView) => {
    setSelectedAgent(agent);
    setEditForm({
      name: agent.name,
      phone: agent.phone,
      email: agent.email,
      role: agent.role,
      status: agent.status,
    });
    setShowEditModal(true);
  };

  const handleUpdateAgent = async () => {
    if (!selectedAgent) return;
    setIsLoading(true);
    try {
      UserDB.updateUser(selectedAgent.userId, {
        fullName: editForm.name,
        phone: editForm.phone,
        email: editForm.email,
        status: editForm.status as any,
        meta: { ...(UserDB.getUserById(selectedAgent.userId)?.meta || {}), title: editForm.role },
      });

      // Push sync
      try {
        const { pushUsers } = await import("../../lib/syncService");
        pushUsers();
      } catch { /* offline */ }

      AuditLogService.log({
        userId: "admin", userName: "Admin", role: "admin",
        action: "user_updated",
        category: "user",
        description: `Updated agent: ${editForm.name} (${selectedAgent.agentId})`,
        metadata: { agentId: selectedAgent.agentId },
      });

      toast.success(`Agent ${editForm.name} updated!`);
      setShowEditModal(false);
      loadAgents();
    } catch (err) {
      toast.error(`Update failed: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewAgent = (agent: AgentView) => {
    setSelectedAgent(agent);
    setShowViewModal(true);
    setDeepLinked(false);
  };

  const handleExportTeam = () => {
    const csv = [
      "Name,Agent ID,Email,Phone,Status,Cases,Attendance,Join Date",
      ...agents.map(a => `"${a.name}","${a.agentId}","${a.email}","${a.phone}","${a.status}",${a.cases},${a.attendance}%,"${a.joinDate}"`)
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `emerald-team-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Team data exported to CSV!");
  };

  const inputCls = `w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
    dc ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" : "bg-white border-gray-300 text-gray-900"
  }`;

  return (
    <div className={`${isUrdu ? fontClass : ""} ${insideUnifiedLayout ? "" : "flex min-h-screen"} transition-colors duration-300 ${dc ? "bg-gray-950" : "bg-gradient-to-br from-gray-50 to-gray-100"}`}>
      {!insideUnifiedLayout && <AdminSidebar />}
      <div className={`flex-1 min-w-0 ${insideUnifiedLayout ? "" : "pt-14 lg:pt-0"}`}>
        {!insideUnifiedLayout && <AdminHeader />}

        <main className="p-3 sm:p-4 md:p-6">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3"
          >
            <div>
              <h1 className={`text-xl md:text-2xl font-bold mb-1 ${txt}`}>{t("team.title")}</h1>
              <p className={`text-sm ${sub}`}>
                {agents.length} {isUrdu ? "ایجنٹ (لائیو ڈیٹا بیس سے)" : "agents (live from database)"}
              </p>
            </div>
            <div className="flex gap-2">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={loadAgents}
                className={`p-2.5 rounded-xl border ${dc ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}
              >
                <RefreshCw className="w-4 h-4" />
              </motion.button>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => setShowAddAgent(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl hover:from-emerald-700 hover:to-emerald-600 transition-all shadow-lg"
              >
                <Plus className="w-4 h-4" />
                {isUrdu ? "نیا ایجنٹ" : "Add Agent"}
              </motion.button>
            </div>
          </motion.div>

          {/* Search & View Toggle */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className={`${card} rounded-xl shadow-sm p-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-4`}
          >
            <div className="flex-1 w-full max-w-md relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={isUrdu ? "نام، ای میل، فون، ایجنٹ آئی ڈی..." : "Search name, email, phone, agent ID..."}
                className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all ${dc ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" : "border-gray-300"}`}
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? (dc ? "bg-emerald-900/50 text-emerald-400" : "bg-emerald-100 text-emerald-700") : (dc ? "text-gray-400 hover:bg-gray-700" : "text-gray-500 hover:bg-gray-100")}`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg transition-all ${viewMode === "list" ? (dc ? "bg-emerald-900/50 text-emerald-400" : "bg-emerald-100 text-emerald-700") : (dc ? "text-gray-400 hover:bg-gray-700" : "text-gray-500 hover:bg-gray-100")}`}
              >
                <List className="w-5 h-5" />
              </button>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={handleExportTeam}
                className={`flex items-center gap-2 px-4 py-2 border rounded-xl ml-2 text-sm ${dc ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
              >
                <Download className="w-4 h-4" />
                Export
              </motion.button>
            </div>
          </motion.div>

          {/* Grid View */}
          {viewMode === "grid" ? (
            <motion.div variants={staggerContainer} initial="hidden" animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {filteredAgents.map((agent) => (
                <motion.div key={agent.id} variants={staggerItem} whileHover={{ y: -4 }}
                  className={`${card} rounded-2xl shadow-sm hover:shadow-lg border ${dc ? "border-gray-700" : "border-gray-100"} p-5 transition-all`}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                      {agent.photo}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-semibold truncate ${txt}`}>{agent.name}</h3>
                      <p className={`text-xs ${sub}`}>{agent.agentId} · {agent.role}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      agent.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>
                      {agent.status.toUpperCase()}
                    </span>
                  </div>

                  {/* TOTP Code Banner */}
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-3 ${
                    agent.codeActive
                      ? (dc ? "bg-emerald-900/30 border border-emerald-700/30" : "bg-emerald-50 border border-emerald-200")
                      : (dc ? "bg-red-900/20 border border-red-700/30" : "bg-red-50 border border-red-200")
                  }`}>
                    <Key className={`w-3.5 h-3.5 ${agent.codeActive ? "text-emerald-500" : "text-red-500"}`} />
                    <span className={`font-mono text-sm font-bold tracking-wider ${
                      agent.codeActive ? (dc ? "text-emerald-400" : "text-emerald-700") : (dc ? "text-red-400" : "text-red-600")
                    }`}>
                      {agent.codeActive ? agent.currentCode : "REVOKED"}
                    </span>
                    <span className={`ml-auto text-[10px] ${sub}`}>
                      {agent.codeActive ? "TOTP" : "OFF"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className={`text-center p-2 rounded-lg ${dc ? "bg-gray-700/50" : "bg-blue-50"}`}>
                      <p className={`text-[10px] font-medium ${dc ? "text-blue-400" : "text-blue-600"}`}>Cases</p>
                      <p className={`text-lg font-bold ${dc ? "text-blue-300" : "text-blue-900"}`}>{agent.cases}</p>
                    </div>
                    <div className={`text-center p-2 rounded-lg ${dc ? "bg-gray-700/50" : "bg-green-50"}`}>
                      <p className={`text-[10px] font-medium ${dc ? "text-green-400" : "text-green-600"}`}>Attendance</p>
                      <p className={`text-lg font-bold ${dc ? "text-green-300" : "text-green-900"}`}>{agent.attendance}%</p>
                    </div>
                  </div>

                  <div className={`space-y-1.5 mb-4 text-xs ${sub}`}>
                    <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /><span>{agent.phone}</span></div>
                    <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /><span className="truncate">{agent.email}</span></div>
                  </div>

                  <div className="flex gap-2">
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleViewAgent(agent)}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border rounded-lg text-xs font-medium ${dc ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                    >
                      <Eye className="w-3.5 h-3.5" /> View
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleEditAgent(agent)}
                      className={`px-3 py-2 border rounded-lg text-xs ${dc ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleToggleStatus(agent.userId)}
                      className={`px-3 py-2 rounded-lg text-xs text-white ${agent.status === "active" ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"}`}
                    >
                      {agent.status === "active" ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            /* List View */
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className={`${card} rounded-2xl shadow-sm border ${dc ? "border-gray-700" : "border-gray-100"} overflow-hidden`}
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={dc ? "bg-gray-700/50" : "bg-gray-50"}>
                    <tr>
                      {["Agent", "Agent ID", "Code", "Contact", "Cases", "Attendance", "Status", "Actions"].map(h => (
                        <th key={h} className={`text-left py-3 px-4 text-xs font-semibold ${dc ? "text-gray-300" : "text-gray-600"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAgents.map((agent) => (
                      <tr key={agent.id} className={`border-b ${dc ? "border-gray-700 hover:bg-gray-700/30" : "border-gray-100 hover:bg-gray-50"} transition-colors`}>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                              {agent.photo}
                            </div>
                            <div>
                              <p className={`font-semibold text-sm ${txt}`}>{agent.name}</p>
                              <p className={`text-xs ${sub}`}>{agent.role}</p>
                            </div>
                          </div>
                        </td>
                        <td className={`py-3 px-4 text-xs font-mono ${sub}`}>{agent.agentId}</td>
                        <td className="py-3 px-4">
                          <span className={`font-mono text-xs font-bold ${agent.codeActive ? "text-emerald-600" : "text-red-500"}`}>
                            {agent.codeActive ? agent.currentCode : "OFF"}
                          </span>
                        </td>
                        <td className={`py-3 px-4 text-xs ${sub}`}>
                          <div>{agent.phone}</div>
                          <div className="truncate max-w-[150px]">{agent.email}</div>
                        </td>
                        <td className={`py-3 px-4 text-sm font-bold ${txt}`}>{agent.cases}</td>
                        <td className={`py-3 px-4 text-sm font-bold ${txt}`}>{agent.attendance}%</td>
                        <td className="py-3 px-4">
                          <button onClick={() => handleToggleStatus(agent.userId)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              agent.status === "active" ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-red-100 text-red-700 hover:bg-red-200"
                            }`}
                          >
                            {agent.status.toUpperCase()}
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-1.5">
                            <button onClick={() => handleViewAgent(agent)} className={`p-1.5 rounded-lg ${dc ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}>
                              <Eye className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleEditAgent(agent)} className={`p-1.5 rounded-lg ${dc ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}>
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {filteredAgents.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className={`text-center py-12 ${card} rounded-2xl shadow-sm`}
            >
              <p className={sub}>{isUrdu ? "کوئی ایجنٹ نہیں ملا" : "No agents found"}</p>
            </motion.div>
          )}
        </main>
      </div>

      {/* Add Agent Modal — uses the real AddStaffModal wired to UserDB */}
      <AddStaffModal
        isOpen={showAddAgent}
        onClose={() => setShowAddAgent(false)}
        darkMode={dc}
        isUrdu={isUrdu}
        createdBy="admin"
        createdByRole="admin"
        onCreated={() => {
          loadAgents();
          setShowAddAgent(false);
        }}
      />

      <AnimatePresence>
        {/* View Modal */}
        {showViewModal && selectedAgent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowViewModal(false)}
          >
            <motion.div variants={modalVariants} initial="hidden" animate="visible" exit="exit"
              onClick={(e) => e.stopPropagation()}
              className={`${dc ? "bg-gray-800" : "bg-white"} rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto ${deepLinked ? "ring-2 ring-blue-400 ring-offset-2" : ""}`}
            >
              {deepLinked && (
                <div className="bg-gradient-to-r from-blue-500/20 to-transparent px-5 py-2 border-b border-blue-500/30 rounded-t-2xl">
                  <span className="text-xs font-medium text-blue-400">{isUrdu ? "اطلاع سے کھولا گیا" : "Opened from notification"}</span>
                </div>
              )}
              <div className={`flex items-center justify-between p-5 border-b ${dc ? "border-gray-700" : "border-gray-200"}`}>
                <h2 className={`text-lg font-bold ${txt}`}>{isUrdu ? "ایجنٹ تفصیلات" : "Agent Details"}</h2>
                <button onClick={() => setShowViewModal(false)} className={`p-2 rounded-xl ${dc ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}>
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-5 mb-5">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                    {selectedAgent.photo}
                  </div>
                  <div>
                    <h3 className={`text-xl font-bold ${txt}`}>{selectedAgent.name}</h3>
                    <p className={`text-sm ${sub}`}>{selectedAgent.agentId} · {selectedAgent.role}</p>
                    <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      selectedAgent.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>
                      {selectedAgent.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* TOTP Code */}
                <div className={`flex items-center justify-between p-3 rounded-xl mb-4 ${
                  selectedAgent.codeActive
                    ? (dc ? "bg-emerald-900/20 border border-emerald-700/30" : "bg-emerald-50 border border-emerald-200")
                    : (dc ? "bg-red-900/20 border border-red-700/30" : "bg-red-50 border border-red-200")
                }`}>
                  <div className="flex items-center gap-2">
                    <Key className={`w-4 h-4 ${selectedAgent.codeActive ? "text-emerald-500" : "text-red-500"}`} />
                    <span className={`text-xs font-medium ${sub}`}>{isUrdu ? "رسائی کوڈ" : "Access Code"}</span>
                  </div>
                  <span className={`font-mono text-lg font-bold tracking-[.25em] ${
                    selectedAgent.codeActive ? "text-emerald-600" : "text-red-500"
                  }`}>
                    {selectedAgent.codeActive ? selectedAgent.currentCode : "REVOKED"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className={`p-3 rounded-xl text-center ${dc ? "bg-gray-700/50" : "bg-blue-50"}`}>
                    <p className={`text-[10px] ${dc ? "text-blue-400" : "text-blue-600"}`}>Cases</p>
                    <p className={`text-xl font-bold ${dc ? "text-blue-300" : "text-blue-900"}`}>{selectedAgent.cases}</p>
                  </div>
                  <div className={`p-3 rounded-xl text-center ${dc ? "bg-gray-700/50" : "bg-green-50"}`}>
                    <p className={`text-[10px] ${dc ? "text-green-400" : "text-green-600"}`}>Attendance</p>
                    <p className={`text-xl font-bold ${dc ? "text-green-300" : "text-green-900"}`}>{selectedAgent.attendance}%</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {[
                    { label: "Phone", value: selectedAgent.phone },
                    { label: "Email", value: selectedAgent.email },
                    { label: "Joined", value: selectedAgent.joinDate },
                    { label: "Last Login", value: selectedAgent.lastLogin ? new Date(selectedAgent.lastLogin).toLocaleString() : "Never" },
                  ].map(row => (
                    <div key={row.label} className={`flex items-center justify-between p-2.5 rounded-lg ${dc ? "bg-gray-700/30" : "bg-gray-50"}`}>
                      <span className={`text-xs font-medium ${sub}`}>{row.label}</span>
                      <span className={`text-xs font-medium ${txt}`}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className={`p-4 border-t ${dc ? "border-gray-700" : "border-gray-200"} flex gap-2`}>
                <a href={`tel:${selectedAgent.phone}`}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700"
                >
                  <Phone className="w-4 h-4" /> Call
                </a>
                <a href={`mailto:${selectedAgent.email}`}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 border rounded-xl text-sm font-medium ${dc ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
                >
                  <Mail className="w-4 h-4" /> Email
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Edit Modal */}
        {showEditModal && selectedAgent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div variants={modalVariants} initial="hidden" animate="visible" exit="exit"
              onClick={(e) => e.stopPropagation()}
              className={`${dc ? "bg-gray-800" : "bg-white"} rounded-2xl shadow-2xl w-full max-w-lg`}
            >
              <div className={`flex items-center justify-between p-5 border-b ${dc ? "border-gray-700" : "border-gray-200"}`}>
                <h2 className={`text-lg font-bold ${txt}`}>{isUrdu ? "ایجنٹ میں ترمیم" : "Edit Agent"}</h2>
                <button onClick={() => setShowEditModal(false)} className={`p-2 rounded-xl ${dc ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}>
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${dc ? "text-gray-300" : "text-gray-600"}`}>Full Name</label>
                  <input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${dc ? "text-gray-300" : "text-gray-600"}`}>Phone</label>
                    <input type="tel" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${dc ? "text-gray-300" : "text-gray-600"}`}>Email</label>
                    <input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className={inputCls} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${dc ? "text-gray-300" : "text-gray-600"}`}>Role</label>
                    <select value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })} className={inputCls}>
                      <option>Agent</option>
                      <option>Senior Agent</option>
                      <option>Team Lead</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${dc ? "text-gray-300" : "text-gray-600"}`}>Status</label>
                    <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })} className={inputCls}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                </div>
                <div className={`flex items-center gap-2 p-3 rounded-lg ${dc ? "bg-gray-700/30" : "bg-gray-50"}`}>
                  <Shield className="w-4 h-4 text-emerald-500" />
                  <span className={`text-xs ${sub}`}>Agent ID: <span className="font-mono font-bold">{selectedAgent.agentId}</span> — linked to TOTP code system</span>
                </div>
              </div>
              <div className={`p-5 border-t ${dc ? "border-gray-700" : "border-gray-200"} flex gap-3 justify-end`}>
                <button onClick={() => setShowEditModal(false)}
                  className={`px-5 py-2.5 border rounded-xl text-sm ${dc ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
                >
                  Cancel
                </button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleUpdateAgent} disabled={isLoading}
                  className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium"
                >
                  {isLoading ? "Saving..." : "Save Changes"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}