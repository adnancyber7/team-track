import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, LogOut, Users, Settings, FileSpreadsheet, Eye, X, ChevronDown, ChevronUp, RefreshCw, Filter, Plus, Trash2, Save, AlertCircle, CheckCircle2, Clock, Zap, Upload, Coffee, UtensilsCrossed, Droplet, Moon, Play, Pause } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import { FixedSizeGrid as Grid } from 'react-window';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const STORAGE_KEY = "DHL_LOGIN_DEMO_V1";
const APP_STORE_KEY = "DHL_APP_STORE_V4";
const CS_SHEET_KEY = "DHL_CS_SHEET_V1";

const CS_COLUMNS = [
  "STATUS", "LINE", "TIME", "LOT", "REMARKS", "AGENTS", "AWB'S", "REASON", "REGION", 
  "CONFIRMATION", "AGENT2", "2ND REJECTION", "2ND CONFIRMATION", "3RD REJECTION", 
  "3RD CONFIRMATION", "4TH REJECTION", "4TH CONFIRMATION", "5TH REJECTION", 
  "5TH CONFIRMATION", "6th CONFIRMATION"
];

const AGENT_COLUMNS = [
  "STATUS", "LINE", "TIME", "LOT", "REMARKS", "AGENTS", "AWB'S", "REASON", "REGION",
  "CONFIRMATION", "AGENT2", "2ND REJECTION", "2ND CONFIRMATION", "3RD REJECTION",
  "3RD CONFIRMATION", "4TH REJECTION", "4TH CONFIRMATION", "5TH REJECTION",
  "5TH CONFIRMATION", "6th CONFIRMATION"
];

const COL_STATUS = 0;
const COL_LINE = 1;
const COL_TIME = 2;
const COL_LOT = 3;
const COL_REMARKS = 4;
const COL_AGENTS = 5;
const COL_AWB = 6;
const COL_REASON = 7;
const COL_REGION = 8;
const COL_CONF1 = 9;
const COL_AGENT2 = 10;
const COL_REJ2 = 11;
const COL_CONF2 = 12;
const COL_REJ3 = 13;
const COL_CONF3 = 14;
const COL_REJ4 = 15;
const COL_CONF4 = 16;
const COL_REJ5 = 17;
const COL_CONF5 = 18;
const COL_CONF6 = 19;

const ROWS_COUNT = 600;

const BREAK_TYPES = [
  { id: 'prayer', label: 'Prayer Break', icon: Moon, color: 'bg-purple-100 text-purple-800 border-purple-300' },
  { id: 'lunch', label: 'Lunch Break', icon: UtensilsCrossed, color: 'bg-orange-100 text-orange-800 border-orange-300' },
  { id: 'tea', label: 'Tea Break', icon: Coffee, color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { id: 'washroom', label: 'Washroom Break', icon: Droplet, color: 'bg-blue-100 text-blue-800 border-blue-300' }
];

const ADMIN_EDITABLE_IN_CS = new Set([
  COL_STATUS, COL_LINE, COL_TIME, COL_LOT, COL_REMARKS, COL_AGENTS, COL_AWB, 
  COL_REASON, COL_REGION, COL_CONF1, COL_AGENT2, COL_CONF2, COL_CONF3, 
  COL_CONF4, COL_CONF5, COL_CONF6
]);

const AGENT_EDITABLE = new Set([
  COL_LINE, COL_LOT, COL_REMARKS, COL_REASON, COL_REJ2, COL_REJ3, COL_REJ4, COL_REJ5
]);

const DEFAULT_STATE = {
  admin: { username: "admin", password: "admin123" },
  agents: [],
  session: { role: null, username: null }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const deepCopy = (obj) => JSON.parse(JSON.stringify(obj));

const formatMs = (ms) => {
  ms = Math.max(0, Math.floor(ms));
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (x) => String(x).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

const isValidAwb = (v) => /^\d{10}$/.test(String(v || "").trim());

const parseLineSum = (lineVal) => {
  const str = String(lineVal || "").trim();
  if (!str) return 0;
  const nums = str.split(/[+\s]+/).map(s => parseFloat(s)).filter(n => !isNaN(n));
  return nums.reduce((a, b) => a + b, 0);
};

const loadState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_STATE));
      return deepCopy(DEFAULT_STATE);
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") throw new Error("Bad");
    if (!parsed.admin) throw new Error("Bad");
    if (!Array.isArray(parsed.agents)) parsed.agents = [];
    if (!parsed.session) parsed.session = { role: null, username: null };
    return parsed;
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_STATE));
    return deepCopy(DEFAULT_STATE);
  }
};

const saveState = (s) => localStorage.setItem(STORAGE_KEY, JSON.stringify(s));

const loadCSSheet = () => {
  try {
    const data = JSON.parse(localStorage.getItem(CS_SHEET_KEY) || "null");
    if (!data || !Array.isArray(data.raw)) {
      return {
        raw: Array.from({ length: ROWS_COUNT }, () => Array(CS_COLUMNS.length).fill('')),
        timers: Array.from({ length: ROWS_COUNT }, () => ({ elapsed: 0, start: null, doneClicks: 0, rejClicks: 0, state: "" })),
        colWidths: CS_COLUMNS.map(() => 140),
        blinkRows: {},
        agentBreaks: {}
      };
    }
    if (!data.agentBreaks) data.agentBreaks = {};
    return data;
  } catch {
    return {
      raw: Array.from({ length: ROWS_COUNT }, () => Array(CS_COLUMNS.length).fill('')),
      timers: Array.from({ length: ROWS_COUNT }, () => ({ elapsed: 0, start: null, doneClicks: 0, rejClicks: 0, state: "" })),
      colWidths: CS_COLUMNS.map(() => 140),
      blinkRows: {},
      agentBreaks: {}
    };
  }
};

const saveCSSheet = (data) => {
  localStorage.setItem(CS_SHEET_KEY, JSON.stringify(data));
};

const loadAgentSheets = () => {
  try {
    const data = JSON.parse(localStorage.getItem(APP_STORE_KEY) || "null");
    if (!data || typeof data !== "object") {
      return { agents: {}, agentFilters: {} };
    }
    return data;
  } catch {
    return { agents: {}, agentFilters: {} };
  }
};

const saveAgentSheets = (data) => {
  localStorage.setItem(APP_STORE_KEY, JSON.stringify(data));
};

const downloadCSV = (data, filename) => {
  const csvContent = data.map(row => 
    row.map(cell => {
      const cellStr = String(cell || '');
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(',')
  ).join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const parseUploadedFile = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

const colToName = (c) => {
  let n = c + 1, s = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

const evaluateFormula = (formula, data, currentRow, currentCol) => {
  try {
    if (!formula.startsWith('=')) return formula;
    
    let expr = formula.slice(1).toUpperCase();
    
    // Handle SUM function
    const sumMatch = expr.match(/SUM\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)/);
    if (sumMatch) {
      const [, startCol, startRow, endCol, endRow] = sumMatch;
      let sum = 0;
      const sc = startCol.charCodeAt(0) - 65;
      const ec = endCol.charCodeAt(0) - 65;
      const sr = parseInt(startRow) - 1;
      const er = parseInt(endRow) - 1;
      
      for (let r = sr; r <= er && r < data.length; r++) {
        for (let c = sc; c <= ec && c < (data[r]?.length || 0); c++) {
          const val = parseFloat(data[r][c]);
          if (!isNaN(val)) sum += val;
        }
      }
      return sum.toString();
    }
    
    // Handle AVERAGE function
    const avgMatch = expr.match(/AVERAGE\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)/);
    if (avgMatch) {
      const [, startCol, startRow, endCol, endRow] = avgMatch;
      let sum = 0, count = 0;
      const sc = startCol.charCodeAt(0) - 65;
      const ec = endCol.charCodeAt(0) - 65;
      const sr = parseInt(startRow) - 1;
      const er = parseInt(endRow) - 1;
      
      for (let r = sr; r <= er && r < data.length; r++) {
        for (let c = sc; c <= ec && c < (data[r]?.length || 0); c++) {
          const val = parseFloat(data[r][c]);
          if (!isNaN(val)) {
            sum += val;
            count++;
          }
        }
      }
      return count > 0 ? (sum / count).toString() : '0';
    }
    
    // Handle cell references like A1, B2, etc.
    expr = expr.replace(/([A-Z]+)(\d+)/g, (match, col, row) => {
      const c = col.charCodeAt(0) - 65;
      const r = parseInt(row) - 1;
      if (r >= 0 && r < data.length && c >= 0 && c < (data[r]?.length || 0)) {
        const val = data[r][c];
        return isNaN(parseFloat(val)) ? `"${val}"` : val;
      }
      return '0';
    });
    
    // Evaluate simple arithmetic
    const result = Function(`"use strict"; return (${expr})`)();
    return isNaN(result) ? formula : result.toString();
  } catch {
    return formula;
  }
};

// ============================================================================
// BROADCAST CHANNEL FOR REALTIME SYNC
// ============================================================================

const CHANNEL = new BroadcastChannel("DHL_SHEET_SYNC_V2");

// ============================================================================
// LOGIN SCREEN COMPONENT
// ============================================================================

const LoginScreen = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState("admin");
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [agentUser, setAgentUser] = useState("");
  const [agentPass, setAgentPass] = useState("");
  const [error, setError] = useState("");

  const handleAdminLogin = () => {
    const state = loadState();
    if (!adminUser.trim() || !adminPass) {
      setError("Please enter admin username and password.");
      return;
    }
    if (adminUser === state.admin.username && adminPass === state.admin.password) {
      state.session = { role: "admin", username: adminUser };
      saveState(state);
      onLogin("admin", adminUser);
    } else {
      setError("Invalid admin credentials.");
    }
  };

  const handleAgentLogin = () => {
    const state = loadState();
    if (!agentUser.trim() || !agentPass) {
      setError("Please enter agent username and password.");
      return;
    }
    const found = state.agents.find(a => a.username === agentUser && a.password === agentPass);
    if (found) {
      state.session = { role: "agent", username: agentUser };
      saveState(state);
      onLogin("agent", agentUser);
    } else {
      setError("Invalid agent credentials.");
    }
  };

  const fillDefault = () => {
    setAdminUser("admin");
    setAdminPass("admin123");
    setError("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{
      background: `
        radial-gradient(900px 500px at 15% 10%, rgba(255,204,0,.55), transparent 60%),
        radial-gradient(700px 400px at 85% 20%, rgba(255,204,0,.35), transparent 55%),
        linear-gradient(180deg, #fff 0%, #fff7d1 100%)
      `
    }}>
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-6">
        {/* Brand Section */}
        <Card className="bg-gradient-to-b from-yellow-100/50 to-yellow-50/30 border-black/10 shadow-2xl overflow-hidden">
          <CardContent className="p-8">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-black/10 bg-white/70 mb-6">
              <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_0_4px_rgba(255,204,0,.25)]" />
              <span className="font-black text-sm tracking-wide">DHL Yellow Sheet Access</span>
            </div>
            
            <h1 className="text-4xl font-black text-black mb-4">Admin & Agent Login</h1>
            <p className="text-black/70 text-sm leading-relaxed mb-6">
              Complete sheet management system with CS Sheet for admin control and agent-specific views. 
              Real-time synchronization with rejection workflow and timer tracking.
            </p>
            
            <Separator className="my-6 bg-black/20" style={{ borderStyle: 'dashed' }} />
            
            <div className="space-y-4">
              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-lg bg-yellow-400/50 border border-black/10 flex items-center justify-center text-xs font-black flex-shrink-0">1</div>
                <div className="text-sm"><b>Admin:</b> <code className="px-2 py-0.5 bg-white/70 rounded border text-xs">admin</code> / <code className="px-2 py-0.5 bg-white/70 rounded border text-xs">admin123</code></div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-lg bg-yellow-400/50 border border-black/10 flex items-center justify-center text-xs font-black flex-shrink-0">2</div>
                <div className="text-sm"><b>CS Sheet:</b> Admin controls all data, assigns to agents via AGENTS column.</div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-lg bg-yellow-400/50 border border-black/10 flex items-center justify-center text-xs font-black flex-shrink-0">3</div>
                <div className="text-sm"><b>Rejection Flow:</b> Agent must fill rejection reason before rejecting.</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Login Panel */}
        <Card className="bg-white/90 border-black/10 shadow-2xl overflow-hidden">
          <div className="flex gap-3 p-4 bg-yellow-400/25 border-b border-black/10">
            <Button
              variant={activeTab === "admin" ? "default" : "outline"}
              onClick={() => { setActiveTab("admin"); setError(""); }}
              className={`flex-1 font-black ${activeTab === "admin" ? "bg-yellow-400/60 hover:bg-yellow-400/70 text-black border-black/15" : "bg-white/70 text-black border-black/10"}`}
            >
              Admin Login
            </Button>
            <Button
              variant={activeTab === "agent" ? "default" : "outline"}
              onClick={() => { setActiveTab("agent"); setError(""); }}
              className={`flex-1 font-black ${activeTab === "agent" ? "bg-yellow-400/60 hover:bg-yellow-400/70 text-black border-black/15" : "bg-white/70 text-black border-black/10"}`}
            >
              Agent Login
            </Button>
          </div>

          <CardContent className="p-6">
            <AnimatePresence mode="wait">
              {activeTab === "admin" ? (
                <motion.div
                  key="admin"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4"
                >
                  <div>
                    <h2 className="text-xl font-bold mb-1">Admin Login</h2>
                    <p className="text-sm text-black/60">Default: <b>admin</b> / <b>admin123</b></p>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-black/60">Admin Username</Label>
                      <Input
                        value={adminUser}
                        onChange={(e) => setAdminUser(e.target.value)}
                        placeholder="Enter admin username"
                        className="mt-1"
                        onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-black/60">Admin Password</Label>
                      <Input
                        type="password"
                        value={adminPass}
                        onChange={(e) => setAdminPass(e.target.value)}
                        placeholder="Enter admin password"
                        className="mt-1"
                        onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={handleAdminLogin} className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black font-black">
                      Login
                    </Button>
                    <Button onClick={fillDefault} variant="outline" className="flex-1 font-bold">
                      Fill Default
                    </Button>
                  </div>

                  {error && (
                    <div className="p-3 rounded-xl bg-red-100 border border-red-200 text-red-800 text-sm">
                      {error}
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="agent"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div>
                    <h2 className="text-xl font-bold mb-1">Agent Login</h2>
                    <p className="text-sm text-black/60">Only agents created by Admin can login.</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-black/60">Agent Username</Label>
                      <Input
                        value={agentUser}
                        onChange={(e) => setAgentUser(e.target.value)}
                        placeholder="Enter agent username"
                        className="mt-1"
                        onKeyDown={(e) => e.key === 'Enter' && handleAgentLogin()}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-black/60">Agent Password</Label>
                      <Input
                        type="password"
                        value={agentPass}
                        onChange={(e) => setAgentPass(e.target.value)}
                        placeholder="Enter agent password"
                        className="mt-1"
                        onKeyDown={(e) => e.key === 'Enter' && handleAgentLogin()}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={handleAgentLogin} className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black font-black">
                      Login
                    </Button>
                    <Button onClick={() => setActiveTab("admin")} variant="outline" className="flex-1 font-bold">
                      Go Admin
                    </Button>
                  </div>

                  {error && (
                    <div className="p-3 rounded-xl bg-red-100 border border-red-200 text-red-800 text-sm">
                      {error}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// ============================================================================
// EXCEL-LIKE SHEET COMPONENT (Virtualized for Performance)
// ============================================================================

const ExcelSheet = ({ 
  columns, 
  data, 
  timers,
  onCellChange, 
  onStatusClick,
  isAdmin,
  agentUsername,
  editableCols,
  blinkRows,
  regionFilter,
  csSheetData,
  onSort,
  onFilter
}) => {
  const [activeCell, setActiveCell] = useState({ r: 0, c: 0 });
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [selection, setSelection] = useState({ r1: 0, c1: 0, r2: 0, c2: 0 });
  const [selecting, setSelecting] = useState(false);
  const [dragSelecting, setDragSelecting] = useState(false);
  const [copiedData, setCopiedData] = useState(null);
  const [colWidths, setColWidths] = useState(columns.map(() => 130));
  const [resizing, setResizing] = useState(null);
  const [sortConfig, setSortConfig] = useState({ column: null, direction: 'asc' });
  const [filterText, setFilterText] = useState('');
  const gridRef = useRef(null);
  const editorRef = useRef(null);
  const containerRef = useRef(null);

  const getRunningMs = useCallback((r) => {
    const t = timers[r];
    if (!t) return 0;
    if (t.start == null) return t.elapsed || 0;
    return (t.elapsed || 0) + (Date.now() - t.start);
  }, [timers]);

  const isRowVisible = useCallback((r) => {
    if (isAdmin) return true;
    if (!agentUsername) return false;
    const agentCell = String(data[r]?.[COL_AGENTS] || '').trim().toLowerCase();
    return agentCell === agentUsername.toLowerCase();
  }, [isAdmin, agentUsername, data]);

  const shouldBlink = useCallback((r) => {
    return blinkRows && blinkRows[r] === true;
  }, [blinkRows]);

  const canEdit = useCallback((r, c) => {
    if (isAdmin) {
      return ADMIN_EDITABLE_IN_CS.has(c);
    }
    if (!isRowVisible(r)) return false;
    return editableCols.has(c);
  }, [isAdmin, editableCols, isRowVisible]);

  const handleCellClick = (r, c) => {
    if (!isRowVisible(r) && !isAdmin) return;
    setActiveCell({ r, c });
    setSelection({ r1: r, c1: c, r2: r, c2: c });
  };

  const handleCellDoubleClick = (r, c) => {
    if (!canEdit(r, c)) return;
    if (c === COL_STATUS) return;
    setEditingCell({ r, c });
    setEditValue(data[r]?.[c] || '');
    setTimeout(() => editorRef.current?.focus(), 0);
  };

  const commitEdit = () => {
    if (editingCell) {
      onCellChange(editingCell.r, editingCell.c, editValue);
      setEditingCell(null);
      setEditValue("");
    }
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const handleKeyDown = (e) => {
    if (editingCell) {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitEdit();
        setActiveCell(prev => ({ r: Math.min(prev.r + 1, ROWS_COUNT - 1), c: prev.c }));
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelEdit();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        commitEdit();
        setActiveCell(prev => ({ r: prev.r, c: Math.min(prev.c + 1, columns.length - 1) }));
      }
      return;
    }

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        setActiveCell(prev => ({ r: Math.max(0, prev.r - 1), c: prev.c }));
        break;
      case 'ArrowDown':
        e.preventDefault();
        setActiveCell(prev => ({ r: Math.min(ROWS_COUNT - 1, prev.r + 1), c: prev.c }));
        break;
      case 'ArrowLeft':
        e.preventDefault();
        setActiveCell(prev => ({ r: prev.r, c: Math.max(0, prev.c - 1) }));
        break;
      case 'ArrowRight':
        e.preventDefault();
        setActiveCell(prev => ({ r: prev.r, c: Math.min(columns.length - 1, prev.c + 1) }));
        break;
      case 'Enter':
      case 'F2':
        e.preventDefault();
        if (canEdit(activeCell.r, activeCell.c) && activeCell.c !== COL_STATUS) {
          handleCellDoubleClick(activeCell.r, activeCell.c);
        }
        break;
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        if (canEdit(activeCell.r, activeCell.c) && activeCell.c !== COL_STATUS) {
          onCellChange(activeCell.r, activeCell.c, '');
        }
        break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          if (canEdit(activeCell.r, activeCell.c) && activeCell.c !== COL_STATUS) {
            setEditingCell(activeCell);
            setEditValue(e.key);
            setTimeout(() => editorRef.current?.focus(), 0);
          }
        }
    }
  };

  const handleMouseDown = (e) => {
    const resizer = e.target.closest('.col-resizer');
    if (resizer) {
      const c = parseInt(resizer.dataset.c);
      setResizing({ c, startX: e.clientX, startWidth: colWidths[c] });
      e.preventDefault();
      return;
    }
  };

  const handleMouseMove = useCallback((e) => {
    if (resizing) {
      const dx = e.clientX - resizing.startX;
      const newWidths = [...colWidths];
      newWidths[resizing.c] = Math.max(60, resizing.startWidth + dx);
      setColWidths(newWidths);
    }
  }, [resizing, colWidths]);

  const handleMouseUp = useCallback(() => {
    setResizing(null);
    setSelecting(false);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const getCellClass = (r, c) => {
    const classes = ['cell'];
    if (activeCell.r === r && activeCell.c === c) classes.push('active');
    if (r >= selection.r1 && r <= selection.r2 && c >= selection.c1 && c <= selection.c2) {
      classes.push('selected');
    }
    
    const state = timers[r]?.state?.toUpperCase() || '';
    if (state === 'DONE') classes.push('row-done');
    if (state === 'REJECTED') classes.push('row-rejected');
    
    if (shouldBlink(r)) classes.push('blink-row');
    
    if (!isRowVisible(r) && !isAdmin) classes.push('hidden-row');
    
    return classes.join(' ');
  };

  const renderStatusCell = (r) => {
    const timer = timers[r] || { doneClicks: 0, rejClicks: 0, state: '' };
    const visible = isRowVisible(r) || isAdmin;
    
    if (!visible) return null;

    const handleDone = (e) => {
      e.stopPropagation();
      onStatusClick(r, 'done');
    };

    const handleReject = (e) => {
      e.stopPropagation();
      // Check if rejection reason is filled for the current rejection level
      const rej2 = data[r]?.[COL_REJ2] || '';
      const rej3 = data[r]?.[COL_REJ3] || '';
      const rej4 = data[r]?.[COL_REJ4] || '';
      const rej5 = data[r]?.[COL_REJ5] || '';
      
      const rejCount = timer.rejClicks || 0;
      let canReject = false;
      
      if (rejCount === 0 && rej2.trim()) canReject = true;
      else if (rejCount === 1 && rej3.trim()) canReject = true;
      else if (rejCount === 2 && rej4.trim()) canReject = true;
      else if (rejCount === 3 && rej5.trim()) canReject = true;
      else if (rejCount >= 4) canReject = false;
      else if (rejCount === 0 && !rej2.trim()) {
        toast.error("Please fill 2ND REJECTION reason first");
        return;
      } else if (rejCount === 1 && !rej3.trim()) {
        toast.error("Please fill 3RD REJECTION reason first");
        return;
      } else if (rejCount === 2 && !rej4.trim()) {
        toast.error("Please fill 4TH REJECTION reason first");
        return;
      } else if (rejCount === 3 && !rej5.trim()) {
        toast.error("Please fill 5TH REJECTION reason first");
        return;
      }
      
      if (!canReject && rejCount === 0 && !rej2.trim()) {
        toast.error("Please fill 2ND REJECTION reason first");
        return;
      }
      
      onStatusClick(r, 'reject');
    };

    const timeStr = formatMs(getRunningMs(r));

    return (
      <div className="status-wrap">
        {!isAdmin && (
          <>
            <button 
              className="status-btn done" 
              onClick={handleDone}
              type="button"
            >
              DONE
            </button>
            <button 
              className="status-btn reject" 
              onClick={handleReject}
              type="button"
            >
              REJ
            </button>
          </>
        )}
        <span className="status-label">
          D:{timer.doneClicks || 0} R:{timer.rejClicks || 0} T:{timeStr}
        </span>
      </div>
    );
  };

  const renderCellContent = (r, c) => {
    if (c === COL_STATUS) {
      return renderStatusCell(r);
    }
    
    if (c === COL_TIME) {
      return formatMs(getRunningMs(r));
    }
    
    const visible = isRowVisible(r) || isAdmin;
    if (!visible) return '';
    
    return data[r]?.[c] || '';
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `48px ${colWidths.map(w => `${w}px`).join(' ')}`,
    gridTemplateRows: `30px repeat(${ROWS_COUNT}, 30px)`,
  };

  return (
    <div 
      className="excel-sheet-container"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseDown={handleMouseDown}
    >
      <style>{`
        .excel-sheet-container {
          outline: none;
          position: relative;
          background: rgba(255,255,255,0.95);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 18px 50px rgba(17,17,17,0.12);
        }
        .sheet-scroll {
          overflow: auto;
          max-height: 70vh;
          position: relative;
        }
        .sheet-grid {
          user-select: none;
          background: rgba(255,255,255,0.9);
        }
        .corner, .col-header, .row-header {
          position: sticky;
          z-index: 3;
          background: rgba(255,204,0,0.55);
          border-right: 1px solid rgba(17,17,17,0.1);
          border-bottom: 1px solid rgba(17,17,17,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 900;
          color: #111;
          text-align: center;
          padding: 0 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .corner { left: 0; top: 0; z-index: 7; }
        .col-header { 
          top: 0; 
          z-index: 6; 
          position: sticky;
          cursor: default;
        }
        .col-header:hover { background: rgba(255,204,0,0.7); }
        .row-header { 
          left: 0; 
          z-index: 5; 
          position: sticky;
          background: rgba(255,255,255,0.95);
        }
        .cell {
          border-right: 1px solid rgba(17,17,17,0.08);
          border-bottom: 1px solid rgba(17,17,17,0.08);
          padding: 2px 6px;
          display: flex;
          align-items: center;
          background: rgba(255,255,255,0.98);
          font-size: 12px;
          color: #111;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          cursor: cell;
          transition: background 0.1s;
        }
        .cell:hover { background: rgba(255,204,0,0.15); }
        .cell.selected { background: rgba(255,204,0,0.25); }
        .cell.active { 
          box-shadow: inset 0 0 0 2px #111;
          background: rgba(255,204,0,0.3);
          z-index: 2;
        }
        .cell.row-done { background: rgba(22,163,74,0.15) !important; }
        .cell.row-rejected { background: rgba(220,38,38,0.15) !important; }
        .cell.hidden-row { 
          color: transparent;
          pointer-events: none;
        }
        .cell.blink-row {
          animation: blink-anim 0.5s ease-in-out infinite alternate;
        }
        @keyframes blink-anim {
          0% { background: rgba(255,204,0,0.3); }
          100% { background: rgba(255,204,0,0.7); }
        }
        .col-resizer {
          position: absolute;
          right: -2px;
          top: 0;
          width: 6px;
          height: 100%;
          cursor: col-resize;
          background: transparent;
          z-index: 10;
        }
        .col-resizer:hover { background: rgba(0,0,0,0.1); }
        .cell-editor {
          position: fixed;
          z-index: 9999;
          box-sizing: border-box;
          height: 30px;
          padding: 0 6px;
          border-radius: 4px;
          border: 2px solid #111;
          background: #fff;
          color: #111;
          font-size: 12px;
          outline: none;
          box-shadow: 0 8px 20px rgba(0,0,0,0.2);
        }
        .status-wrap {
          display: flex;
          align-items: center;
          gap: 4px;
          width: 100%;
        }
        .status-btn {
          border: 1px solid rgba(0,0,0,0.12);
          background: rgba(255,255,255,0.9);
          color: #111;
          padding: 3px 6px;
          border-radius: 4px;
          font-weight: 900;
          font-size: 10px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .status-btn:hover { transform: scale(1.05); }
        .status-btn.done { background: rgba(22,163,74,0.15); border-color: rgba(22,163,74,0.3); }
        .status-btn.reject { background: rgba(220,38,38,0.15); border-color: rgba(220,38,38,0.3); }
        .status-label {
          margin-left: auto;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 4px;
          border-radius: 4px;
          background: rgba(255,255,255,0.8);
          border: 1px solid rgba(0,0,0,0.08);
        }
      `}</style>
      
      <div className="sheet-scroll" ref={gridRef}>
        <div className="sheet-grid" style={gridStyle}>
          {/* Corner */}
          <div className="corner" style={{ gridRow: 1, gridColumn: 1 }}></div>
          
          {/* Column Headers */}
          {columns.map((col, c) => (
            <div 
              key={`col-${c}`} 
              className="col-header" 
              style={{ gridRow: 1, gridColumn: c + 2, position: 'relative' }}
            >
              {col}
              <div className="col-resizer" data-c={c} />
            </div>
          ))}
          
          {/* Row Headers & Cells */}
          {Array.from({ length: ROWS_COUNT }).map((_, r) => (
            <React.Fragment key={`row-${r}`}>
              <div 
                className="row-header" 
                style={{ gridRow: r + 2, gridColumn: 1 }}
              >
                {r + 1}
              </div>
              {columns.map((_, c) => (
                <div
                  key={`cell-${r}-${c}`}
                  className={getCellClass(r, c)}
                  style={{ gridRow: r + 2, gridColumn: c + 2 }}
                  onClick={() => handleCellClick(r, c)}
                  onDoubleClick={() => handleCellDoubleClick(r, c)}
                >
                  {renderCellContent(r, c)}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
      
      {/* Cell Editor */}
      {editingCell && (
        <input
          ref={editorRef}
          className="cell-editor"
          style={{
            left: 48 + colWidths.slice(0, editingCell.c).reduce((a, b) => a + b, 0),
            top: 30 + editingCell.r * 30,
            width: colWidths[editingCell.c],
          }}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
            if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
            if (e.key === 'Tab') { e.preventDefault(); commitEdit(); }
          }}
        />
      )}
    </div>
  );
};

// ============================================================================
// ADMIN DASHBOARD COMPONENT
// ============================================================================

const AdminDashboard = ({ username, onLogout }) => {
  const [activeTab, setActiveTab] = useState("cs-sheet");
  const [csSheet, setCSSheet] = useState(loadCSSheet);
  const [agentSheets, setAgentSheets] = useState(loadAgentSheets);
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [newAgentUser, setNewAgentUser] = useState("");
  const [newAgentPass, setNewAgentPass] = useState("");
  const [newAdminUser, setNewAdminUser] = useState("");
  const [newAdminPass, setNewAdminPass] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const state = loadState();
    setAgents(state.agents || []);
    setNewAdminUser(state.admin.username);
    
    const interval = setInterval(() => {
      setRefreshKey(k => k + 1);
    }, 500);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleSync = (ev) => {
      if (ev?.data?.type === "app:sync") {
        setCSSheet(loadCSSheet());
        setAgentSheets(loadAgentSheets());
        const state = loadState();
        setAgents(state.agents || []);
      }
    };
    CHANNEL.addEventListener('message', handleSync);
    return () => CHANNEL.removeEventListener('message', handleSync);
  }, []);

  const handleCSCellChange = (r, c, value) => {
    const newSheet = deepCopy(csSheet);
    newSheet.raw[r][c] = value;
    
    // If admin enters AWB, start timer
    if (c === COL_AWB && isValidAwb(value)) {
      newSheet.timers[r] = {
        elapsed: 0,
        start: Date.now(),
        doneClicks: 0,
        rejClicks: 0,
        state: ""
      };
    }
    
    // If admin puts value in any confirmation column, set blink for agent
    if ([COL_CONF1, COL_CONF2, COL_CONF3, COL_CONF4, COL_CONF5, COL_CONF6].includes(c) && value.trim()) {
      if (!newSheet.blinkRows) newSheet.blinkRows = {};
      newSheet.blinkRows[r] = true;
      setTimeout(() => {
        const updated = loadCSSheet();
        if (updated.blinkRows) {
          updated.blinkRows[r] = false;
          saveCSSheet(updated);
          CHANNEL.postMessage({ type: "app:sync" });
        }
      }, 5000);
    }
    
    setCSSheet(newSheet);
    saveCSSheet(newSheet);
    CHANNEL.postMessage({ type: "app:sync" });
  };

  const handleCSStatusClick = (r, action) => {
    // Admin doesn't use status buttons in CS sheet
  };

  const createAgent = () => {
    if (!newAgentUser.trim() || !newAgentPass.trim()) {
      toast.error("Please enter agent username and password");
      return;
    }
    if (newAgentPass.length < 4) {
      toast.error("Password must be at least 4 characters");
      return;
    }
    
    const state = loadState();
    if (newAgentUser === state.admin.username) {
      toast.error("Agent username cannot be same as admin");
      return;
    }
    if (state.agents.some(a => a.username === newAgentUser)) {
      toast.error("Agent already exists");
      return;
    }
    
    state.agents.push({ username: newAgentUser, password: newAgentPass });
    saveState(state);
    setAgents(state.agents);
    setNewAgentUser("");
    setNewAgentPass("");
    toast.success(`Agent "${newAgentUser}" created`);
  };

  const deleteAgent = (username) => {
    const state = loadState();
    state.agents = state.agents.filter(a => a.username !== username);
    saveState(state);
    setAgents(state.agents);
    toast.success(`Agent "${username}" deleted`);
  };

  const saveAdminCreds = () => {
    if (!newAdminUser.trim()) {
      toast.error("Admin username cannot be empty");
      return;
    }
    const state = loadState();
    state.admin.username = newAdminUser;
    if (newAdminPass.trim() && newAdminPass.length >= 4) {
      state.admin.password = newAdminPass;
    }
    saveState(state);
    setNewAdminPass("");
    toast.success("Admin credentials updated");
  };

  const getAgentMetrics = (agentUser) => {
    const sheet = csSheet;
    let awb = 0, lineSum = 0, done = 0, rej = 0;
    
    for (let r = 0; r < ROWS_COUNT; r++) {
      const agent = String(sheet.raw[r]?.[COL_AGENTS] || '').trim().toLowerCase();
      if (agent !== agentUser.toLowerCase()) continue;
      
      if (sheet.raw[r]?.[COL_AWB]?.trim()) awb++;
      lineSum += parseLineSum(sheet.raw[r]?.[COL_LINE]);
      
      const state = sheet.timers[r]?.state?.toUpperCase() || '';
      if (state === 'DONE') done++;
      if (state === 'REJECTED') rej++;
    }
    
    return { awb, lineSum, done, rej };
  };

  const getUniqueRegions = () => {
    const regions = new Set();
    for (let r = 0; r < ROWS_COUNT; r++) {
      const region = String(csSheet.raw[r]?.[COL_REGION] || '').trim();
      if (region) {
        region.split(/[\s,;|]+/).forEach(s => {
          if (s.trim()) regions.add(s.trim());
        });
      }
    }
    return Array.from(regions).sort();
  };

  const applyRegionFilter = (agent, region) => {
    const sheets = loadAgentSheets();
    if (!sheets.agentFilters) sheets.agentFilters = {};
    if (!sheets.agentFilters[agent]) sheets.agentFilters[agent] = {};
    sheets.agentFilters[agent].region = region;
    saveAgentSheets(sheets);
    setAgentSheets(sheets);
    CHANNEL.postMessage({ type: "app:sync" });
    toast.success(`Region filter "${region || 'ALL'}" applied to ${agent}`);
  };

  const downloadAgentData = (agentUser) => {
    const headers = CS_COLUMNS;
    const rows = [headers];
    
    for (let r = 0; r < ROWS_COUNT; r++) {
      const agent = String(csSheet.raw[r]?.[COL_AGENTS] || '').trim().toLowerCase();
      if (agent === agentUser.toLowerCase()) {
        rows.push(csSheet.raw[r]);
      }
    }
    
    downloadCSV(rows, `agent_${agentUser}_data.csv`);
    toast.success(`Downloaded data for ${agentUser}`);
  };

  const downloadAllCSData = () => {
    const headers = CS_COLUMNS;
    const rows = [headers, ...csSheet.raw.filter(row => row.some(cell => cell.trim()))];
    downloadCSV(rows, 'cs_sheet_data.csv');
    toast.success("Downloaded CS Sheet data");
  };

  const getCSMetrics = () => {
    let awb = 0, lineSum = 0, done = 0, rej = 0;
    
    for (let r = 0; r < ROWS_COUNT; r++) {
      if (csSheet.raw[r]?.[COL_AWB]?.trim()) awb++;
      lineSum += parseLineSum(csSheet.raw[r]?.[COL_LINE]);
      
      const state = csSheet.timers[r]?.state?.toUpperCase() || '';
      if (state === 'DONE') done++;
      if (state === 'REJECTED') rej++;
    }
    
    return { awb, lineSum, done, rej };
  };

  const csMetrics = getCSMetrics();

  return (
    <div className="min-h-screen p-4" style={{
      background: `
        radial-gradient(900px 500px at 15% 10%, rgba(255,204,0,.55), transparent 60%),
        radial-gradient(700px 400px at 85% 20%, rgba(255,204,0,.35), transparent 55%),
        linear-gradient(180deg, #fff 0%, #fff7d1 100%)
      `
    }}>
      <div className="max-w-[1600px] mx-auto space-y-4">
        {/* Top Bar */}
        <Card className="bg-white/95 border-black/10 shadow-xl">
          <CardContent className="p-4 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Badge className="bg-yellow-400 text-black font-black border-black/10">ADMIN</Badge>
              <span className="font-bold">Welcome, {username}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={onLogout} variant="outline" className="font-bold bg-yellow-400/50 hover:bg-yellow-400/70 border-black/10">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white/80 border border-black/10 p-1">
            <TabsTrigger value="cs-sheet" className="font-bold data-[state=active]:bg-yellow-400/60">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              CS Sheet
            </TabsTrigger>
            <TabsTrigger value="agents" className="font-bold data-[state=active]:bg-yellow-400/60">
              <Users className="w-4 h-4 mr-2" />
              Agents ({agents.length})
            </TabsTrigger>
            <TabsTrigger value="settings" className="font-bold data-[state=active]:bg-yellow-400/60">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* CS Sheet Tab */}
          <TabsContent value="cs-sheet" className="mt-4 space-y-4">
            {/* Analytics */}
            <Card className="bg-white/95 border-black/10 shadow-lg">
              <CardContent className="p-4 flex items-center gap-4 flex-wrap">
                <Badge className="bg-yellow-400 text-black font-black px-3 py-1">CS SHEET VIEW</Badge>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-black/10">
                  <span className="text-sm font-medium">AWB:</span>
                  <span className="font-mono font-bold">{csMetrics.awb}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-black/10">
                  <span className="text-sm font-medium">LINE SUM:</span>
                  <span className="font-mono font-bold">{csMetrics.lineSum}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200">
                  <span className="text-sm font-medium text-green-800">DONE:</span>
                  <span className="font-mono font-bold text-green-800">{csMetrics.done}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200">
                  <span className="text-sm font-medium text-red-800">REJECTED:</span>
                  <span className="font-mono font-bold text-red-800">{csMetrics.rej}</span>
                </div>
                <div className="ml-auto">
                  <Button onClick={downloadAllCSData} variant="outline" size="sm" className="font-bold">
                    <Download className="w-4 h-4 mr-2" />
                    Download CSV
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* CS Sheet */}
            <ExcelSheet
              columns={CS_COLUMNS}
              data={csSheet.raw}
              timers={csSheet.timers}
              onCellChange={handleCSCellChange}
              onStatusClick={handleCSStatusClick}
              isAdmin={true}
              agentUsername=""
              editableCols={ADMIN_EDITABLE_IN_CS}
              blinkRows={csSheet.blinkRows}
            />
          </TabsContent>

          {/* Agents Tab */}
          <TabsContent value="agents" className="mt-4 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Create Agent */}
              <Card className="bg-white/95 border-black/10 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Create Agent
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-black/60">Agent Username</Label>
                    <Input
                      value={newAgentUser}
                      onChange={(e) => setNewAgentUser(e.target.value)}
                      placeholder="e.g. agent01"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-black/60">Agent Password</Label>
                    <Input
                      type="password"
                      value={newAgentPass}
                      onChange={(e) => setNewAgentPass(e.target.value)}
                      placeholder="Min 4 characters"
                      className="mt-1"
                    />
                  </div>
                  <Button onClick={createAgent} className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold">
                    Create Agent
                  </Button>
                </CardContent>
              </Card>

              {/* Agents List */}
              <Card className="bg-white/95 border-black/10 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Agents List
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    {agents.length === 0 ? (
                      <p className="text-sm text-black/50 text-center py-8">No agents created yet</p>
                    ) : (
                      <div className="space-y-2">
                        {agents.map(agent => {
                          const metrics = getAgentMetrics(agent.username);
                          return (
                            <div key={agent.username} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border">
                              <div>
                                <div className="font-bold">{agent.username}</div>
                                <div className="text-xs text-black/50">
                                  AWB: {metrics.awb} | LINE: {metrics.lineSum} | D: {metrics.done} | R: {metrics.rej}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => setSelectedAgent(agent.username)}
                                  className="font-bold bg-yellow-400/30 hover:bg-yellow-400/50"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => downloadAgentData(agent.username)}
                                  className="font-bold"
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => deleteAgent(agent.username)}
                                  className="font-bold text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Agent Profile View */}
            {selectedAgent && (
              <Card className="bg-white/95 border-black/10 shadow-lg">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-yellow-400 text-black font-black">AGENT PROFILE</Badge>
                      <span className="font-bold text-lg">{selectedAgent}</span>
                      {(() => {
                        const m = getAgentMetrics(selectedAgent);
                        return (
                          <span className="text-sm text-black/50">
                            AWB: {m.awb} | LINE SUM: {m.lineSum} | DONE: {m.done} | REJ: {m.rej}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="flex items-center gap-2">
                      <Select 
                        value={agentSheets.agentFilters?.[selectedAgent]?.region || ""} 
                        onValueChange={(v) => applyRegionFilter(selectedAgent, v)}
                      >
                        <SelectTrigger className="w-[150px]">
                          <SelectValue placeholder="Region Filter" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={null}>ALL</SelectItem>
                          {getUniqueRegions().map(r => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button onClick={() => downloadAgentData(selectedAgent)} variant="outline" size="sm" className="font-bold">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                      <Button onClick={() => setSelectedAgent(null)} variant="outline" size="sm" className="font-bold">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <ExcelSheet
                    columns={AGENT_COLUMNS}
                    data={csSheet.raw}
                    timers={csSheet.timers}
                    onCellChange={handleCSCellChange}
                    onStatusClick={() => {}}
                    isAdmin={true}
                    agentUsername={selectedAgent}
                    editableCols={ADMIN_EDITABLE_IN_CS}
                    blinkRows={csSheet.blinkRows}
                    regionFilter={agentSheets.agentFilters?.[selectedAgent]?.region}
                  />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-4">
            <Card className="bg-white/95 border-black/10 shadow-lg max-w-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Admin Credentials
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs text-black/60">Admin Username</Label>
                  <Input
                    value={newAdminUser}
                    onChange={(e) => setNewAdminUser(e.target.value)}
                    placeholder="Enter new username"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-black/60">New Password (optional)</Label>
                  <Input
                    type="password"
                    value={newAdminPass}
                    onChange={(e) => setNewAdminPass(e.target.value)}
                    placeholder="Leave empty to keep current"
                    className="mt-1"
                  />
                </div>
                <Button onClick={saveAdminCreds} className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold">
                  <Save className="w-4 h-4 mr-2" />
                  Save Credentials
                </Button>
                <Separator className="my-4" />
                <p className="text-xs text-center text-black/40 font-medium">Made by Adnan</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// ============================================================================
// AGENT DASHBOARD COMPONENT
// ============================================================================

const AgentDashboard = ({ username, onLogout }) => {
  const [csSheet, setCSSheet] = useState(loadCSSheet);
  const [agentSheets, setAgentSheets] = useState(loadAgentSheets);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(k => k + 1);
      setCSSheet(loadCSSheet());
    }, 500);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleSync = (ev) => {
      if (ev?.data?.type === "app:sync") {
        setCSSheet(loadCSSheet());
        setAgentSheets(loadAgentSheets());
      }
    };
    CHANNEL.addEventListener('message', handleSync);
    return () => CHANNEL.removeEventListener('message', handleSync);
  }, []);

  const handleCellChange = (r, c, value) => {
    // Agent can only edit their assigned rows
    const agent = String(csSheet.raw[r]?.[COL_AGENTS] || '').trim().toLowerCase();
    if (agent !== username.toLowerCase()) return;
    
    if (!AGENT_EDITABLE.has(c)) return;
    
    const newSheet = deepCopy(csSheet);
    newSheet.raw[r][c] = value;
    setCSSheet(newSheet);
    saveCSSheet(newSheet);
    CHANNEL.postMessage({ type: "app:sync" });
  };

  const handleStatusClick = (r, action) => {
    const agent = String(csSheet.raw[r]?.[COL_AGENTS] || '').trim().toLowerCase();
    if (agent !== username.toLowerCase()) return;
    
    const newSheet = deepCopy(csSheet);
    const timer = newSheet.timers[r] || { elapsed: 0, start: null, doneClicks: 0, rejClicks: 0, state: "" };
    
    if (action === 'done') {
      timer.doneClicks = (timer.doneClicks || 0) + 1;
      timer.state = "DONE";
      if (timer.start != null) {
        timer.elapsed = (timer.elapsed || 0) + (Date.now() - timer.start);
        timer.start = null;
      }
    } else if (action === 'reject') {
      // Validate rejection reason is filled
      const rejCount = timer.rejClicks || 0;
      const rej2 = newSheet.raw[r]?.[COL_REJ2] || '';
      const rej3 = newSheet.raw[r]?.[COL_REJ3] || '';
      const rej4 = newSheet.raw[r]?.[COL_REJ4] || '';
      const rej5 = newSheet.raw[r]?.[COL_REJ5] || '';
      
      if (rejCount === 0 && !rej2.trim()) {
        toast.error("Please fill 2ND REJECTION reason first");
        return;
      }
      if (rejCount === 1 && !rej3.trim()) {
        toast.error("Please fill 3RD REJECTION reason first");
        return;
      }
      if (rejCount === 2 && !rej4.trim()) {
        toast.error("Please fill 4TH REJECTION reason first");
        return;
      }
      if (rejCount === 3 && !rej5.trim()) {
        toast.error("Please fill 5TH REJECTION reason first");
        return;
      }
      
      timer.rejClicks = (timer.rejClicks || 0) + 1;
      timer.state = "REJECTED";
      
      // Set blink for CS sheet when agent rejects
      if (!newSheet.blinkRows) newSheet.blinkRows = {};
      newSheet.blinkRows[r] = true;
      
      // Resume timer
      if (timer.start == null) {
        timer.start = Date.now();
      }
      
      setTimeout(() => {
        const updated = loadCSSheet();
        if (updated.blinkRows) {
          updated.blinkRows[r] = false;
          saveCSSheet(updated);
          CHANNEL.postMessage({ type: "app:sync" });
        }
      }, 5000);
    }
    
    newSheet.timers[r] = timer;
    setCSSheet(newSheet);
    saveCSSheet(newSheet);
    CHANNEL.postMessage({ type: "app:sync" });
  };

  const getAgentMetrics = () => {
    let awb = 0, lineSum = 0, done = 0, rej = 0;
    
    for (let r = 0; r < ROWS_COUNT; r++) {
      const agent = String(csSheet.raw[r]?.[COL_AGENTS] || '').trim().toLowerCase();
      if (agent !== username.toLowerCase()) continue;
      
      if (csSheet.raw[r]?.[COL_AWB]?.trim()) awb++;
      lineSum += parseLineSum(csSheet.raw[r]?.[COL_LINE]);
      
      const state = csSheet.timers[r]?.state?.toUpperCase() || '';
      if (state === 'DONE') done++;
      if (state === 'REJECTED') rej++;
    }
    
    return { awb, lineSum, done, rej };
  };

  const metrics = getAgentMetrics();

  return (
    <div className="min-h-screen p-4" style={{
      background: `
        radial-gradient(900px 500px at 15% 10%, rgba(255,204,0,.55), transparent 60%),
        radial-gradient(700px 400px at 85% 20%, rgba(255,204,0,.35), transparent 55%),
        linear-gradient(180deg, #fff 0%, #fff7d1 100%)
      `
    }}>
      <div className="max-w-[1600px] mx-auto space-y-4">
        {/* Top Bar */}
        <Card className="bg-white/95 border-black/10 shadow-xl">
          <CardContent className="p-4 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Badge className="bg-yellow-400 text-black font-black border-black/10">AGENT</Badge>
              <span className="font-bold">Welcome, {username}</span>
            </div>
            <Button onClick={onLogout} variant="outline" className="font-bold bg-yellow-400/50 hover:bg-yellow-400/70 border-black/10">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </CardContent>
        </Card>

        {/* Analytics */}
        <Card className="bg-white/95 border-black/10 shadow-lg">
          <CardContent className="p-4 flex items-center gap-4 flex-wrap">
            <Badge className="bg-yellow-400 text-black font-black px-3 py-1">AGENT VIEW ({username})</Badge>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-black/10">
              <span className="text-sm font-medium">AWB:</span>
              <span className="font-mono font-bold">{metrics.awb}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-black/10">
              <span className="text-sm font-medium">LINE SUM:</span>
              <span className="font-mono font-bold">{metrics.lineSum}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200">
              <span className="text-sm font-medium text-green-800">DONE:</span>
              <span className="font-mono font-bold text-green-800">{metrics.done}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200">
              <span className="text-sm font-medium text-red-800">REJECTED:</span>
              <span className="font-mono font-bold text-red-800">{metrics.rej}</span>
            </div>
            <div className="ml-auto text-xs text-black/50">
              Agent sees only assigned rows. Fill rejection reason before rejecting.
            </div>
          </CardContent>
        </Card>

        {/* Agent Sheet */}
        <ExcelSheet
          columns={AGENT_COLUMNS}
          data={csSheet.raw}
          timers={csSheet.timers}
          onCellChange={handleCellChange}
          onStatusClick={handleStatusClick}
          isAdmin={false}
          agentUsername={username}
          editableCols={AGENT_EDITABLE}
          blinkRows={csSheet.blinkRows}
        />
      </div>
    </div>
  );
};

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

export default function DHLSheet() {
  const [session, setSession] = useState({ role: null, username: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const state = loadState();
    if (state.session?.role) {
      setSession(state.session);
    }
    setLoading(false);
  }, []);

  const handleLogin = (role, username) => {
    setSession({ role, username });
  };

  const handleLogout = () => {
    const state = loadState();
    state.session = { role: null, username: null };
    saveState(state);
    setSession({ role: null, username: null });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        background: `linear-gradient(180deg, #fff 0%, #fff7d1 100%)`
      }}>
        <div className="flex items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-yellow-500" />
          <span className="font-bold text-lg">Loading...</span>
        </div>
      </div>
    );
  }

  if (!session.role) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (session.role === "admin") {
    return <AdminDashboard username={session.username} onLogout={handleLogout} />;
  }

  return <AgentDashboard username={session.username} onLogout={handleLogout} />;
}