import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, LogOut, Users, Settings, FileSpreadsheet, Eye, X, ChevronDown, ChevronUp, RefreshCw, Filter, Plus, Trash2, Save, AlertCircle, CheckCircle2, Clock, Zap, Upload, Coffee, UtensilsCrossed, Droplet, Moon, Play, Pause, Square, CheckSquare } from 'lucide-react';
import DailyReportDialog from '../components/DailyReportDialog';
import AdvancedFilterPanel from '../components/AdvancedFilterPanel';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
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
const AGENT_DEFAULT_ROWS = 50;

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
  COL_LINE, COL_LOT, COL_REMARKS, COL_REJ2, COL_REJ3, COL_REJ4, COL_REJ5
]);

const CS_ALLOCATOR_EDITABLE = new Set([
  COL_CONF2, COL_CONF3, COL_CONF4, COL_CONF5, COL_CONF6
]);

const CS_TEAM_EDITABLE = new Set([
  COL_STATUS, COL_LINE, COL_TIME, COL_LOT, COL_REMARKS, COL_AGENTS, COL_AWB, 
  COL_REASON, COL_REGION, COL_CONF1, COL_AGENT2, COL_CONF2, COL_CONF3, 
  COL_CONF4, COL_CONF5, COL_CONF6
]);

const DEFAULT_STATE = {
  admin: { username: "admin", password: "admin123" },
  agents: [],
  csAllocators: [{ username: "cs1", password: "cs123" }],
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
    if (!Array.isArray(parsed.csAllocators)) parsed.csAllocators = [];
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
        agentBreaks: {},
        savedFilters: []
      };
    }
    if (!data.agentBreaks) data.agentBreaks = {};
    if (!data.savedFilters) data.savedFilters = [];
    return data;
  } catch {
    return {
      raw: Array.from({ length: ROWS_COUNT }, () => Array(CS_COLUMNS.length).fill('')),
      timers: Array.from({ length: ROWS_COUNT }, () => ({ elapsed: 0, start: null, doneClicks: 0, rejClicks: 0, state: "" })),
      colWidths: CS_COLUMNS.map(() => 140),
      blinkRows: {},
      agentBreaks: {},
      savedFilters: []
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

const excelSerialToTime = (serial) => {
  // Check if it's already a time string
  if (typeof serial === 'string' && (serial.includes(':') || serial.includes('AM') || serial.includes('PM'))) {
    return serial;
  }
  
  // Convert Excel decimal to time
  const num = parseFloat(serial);
  if (isNaN(num) || num < 0 || num > 1) return String(serial);
  
  const totalMinutes = Math.round(num * 24 * 60);
  let hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  
  return `${hours}:${String(minutes).padStart(2, '0')} ${period}`;
};

const parseUploadedFile = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: false, cellNF: false, cellText: false });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '', raw: true });
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
  const [csUser, setCSUser] = useState("");
  const [csPass, setCSPass] = useState("");
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

  const handleCSLogin = () => {
    const state = loadState();
    if (!csUser.trim() || !csPass) {
      setError("Please enter CS Allocator username and password.");
      return;
    }
    const found = state.csAllocators.find(a => a.username === csUser && a.password === csPass);
    if (found) {
      state.session = { role: "cs_allocator", username: csUser };
      saveState(state);
      onLogin("cs_allocator", csUser);
    } else {
      setError("Invalid CS Allocator credentials.");
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
      <div className="w-full max-w-md">
        {/* Login Panel */}
        <Card className="bg-white/90 border-black/10 shadow-2xl overflow-hidden">
          <div className="flex gap-2 p-4 bg-yellow-400/25 border-b border-black/10">
            <Button
              variant={activeTab === "admin" ? "default" : "outline"}
              onClick={() => { setActiveTab("admin"); setError(""); }}
              className={`flex-1 font-black text-xs ${activeTab === "admin" ? "bg-yellow-400/60 hover:bg-yellow-400/70 text-black border-black/15" : "bg-white/70 text-black border-black/10"}`}
            >
              Admin
            </Button>
            <Button
              variant={activeTab === "agent" ? "default" : "outline"}
              onClick={() => { setActiveTab("agent"); setError(""); }}
              className={`flex-1 font-black text-xs ${activeTab === "agent" ? "bg-yellow-400/60 hover:bg-yellow-400/70 text-black border-black/15" : "bg-white/70 text-black border-black/10"}`}
            >
              Agent
            </Button>
            <Button
              variant={activeTab === "cs_allocator" ? "default" : "outline"}
              onClick={() => { setActiveTab("cs_allocator"); setError(""); }}
              className={`flex-1 font-black text-xs ${activeTab === "cs_allocator" ? "bg-yellow-400/60 hover:bg-yellow-400/70 text-black border-black/15" : "bg-white/70 text-black border-black/10"}`}
            >
              CS Allocator
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
              ) : activeTab === "agent" ? (
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
              ) : activeTab === "cs_allocator" ? (
                <motion.div
                  key="cs_allocator"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  <div>
                    <h2 className="text-xl font-bold mb-1">CS Allocator Login</h2>
                    <p className="text-sm text-black/60">Only CS Allocators created by Admin can login.</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-black/60">CS Allocator Username</Label>
                      <Input
                        value={csUser}
                        onChange={(e) => setCSUser(e.target.value)}
                        placeholder="Enter CS Allocator username"
                        className="mt-1"
                        onKeyDown={(e) => e.key === 'Enter' && handleCSLogin()}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-black/60">CS Allocator Password</Label>
                      <Input
                        type="password"
                        value={csPass}
                        onChange={(e) => setCSPass(e.target.value)}
                        placeholder="Enter CS Allocator password"
                        className="mt-1"
                        onKeyDown={(e) => e.key === 'Enter' && handleCSLogin()}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={handleCSLogin} className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black font-black">
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
              ) : null}
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
  onFilter,
  selectedRows,
  onRowSelect,
  fastEditMode,
  priorityList,
  zoomLevel = 100
}) => {
  const [activeCell, setActiveCell] = useState({ r: 0, c: 0 });
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [selection, setSelection] = useState({ r1: 0, c1: 0, r2: 0, c2: 0 });
  const [selecting, setSelecting] = useState(false);
  const [dragSelecting, setDragSelecting] = useState(false);
  const [copiedData, setCopiedData] = useState(null);
  const [colWidths, setColWidths] = useState(columns.map((_, idx) => idx === 0 ? 280 : 140));
  const [resizing, setResizing] = useState(null);
  const [sortConfig, setSortConfig] = useState({ column: null, direction: 'asc' });
  const [filterText, setFilterText] = useState('');
  const [typingCell, setTypingCell] = useState(null);
  const gridRef = useRef(null);
  const editorRef = useRef(null);
  const containerRef = useRef(null);
  const typingTimerRef = useRef(null);

  // Compact view for agents - removes gaps from done/rejected rows
  const getCompactedView = useCallback(() => {
    if (isAdmin) {
      return { data, timers, rowMapping: data.map((_, i) => i) };
    }
    
    const compactedData = [];
    const compactedTimers = [];
    const rowMapping = [];
    
    for (let r = 0; r < data.length; r++) {
      const agentCell = String(data[r]?.[COL_AGENTS] || '').trim().toLowerCase();
      const agentMatch = agentCell === agentUsername.toLowerCase();
      
      if (!agentMatch) continue;
      
      const state = timers[r]?.state?.toUpperCase() || '';
      if (state === 'DONE' || state === 'REJECTED') continue;
      
      // Apply priority filter
      if (priorityList && priorityList.length > 0) {
        const rowAwb = String(data[r]?.[COL_AWB] || '').trim();
        if (!priorityList.includes(rowAwb)) continue;
      }
      
      // Apply region filter
      if (regionFilter) {
        const regionCell = String(data[r]?.[COL_REGION] || '').trim().toUpperCase();
        const filterUpper = regionFilter.toUpperCase();
        if (!(regionCell === filterUpper || regionCell.includes(filterUpper))) continue;
      }
      
      compactedData.push(data[r]);
      compactedTimers.push(timers[r]);
      rowMapping.push(r);
    }
    
    // For agents, limit to default rows or actual data count, whichever is higher
    const targetRows = isAdmin ? ROWS_COUNT : Math.max(AGENT_DEFAULT_ROWS, compactedData.length);
    
    // Fill remaining with empty rows
    while (compactedData.length < targetRows) {
      compactedData.push(Array(columns.length).fill(''));
      compactedTimers.push({ elapsed: 0, start: null, doneClicks: 0, rejClicks: 0, state: "" });
      rowMapping.push(-1);
    }
    
    return { data: compactedData, timers: compactedTimers, rowMapping };
  }, [isAdmin, agentUsername, data, timers, priorityList, regionFilter, columns.length]);

  const compactedView = getCompactedView();
  const displayData = compactedView.data;
  const displayTimers = compactedView.timers;
  const rowMapping = compactedView.rowMapping;

  const getRunningMs = useCallback((r) => {
    const t = displayTimers[r];
    if (!t) return 0;
    if (t.start == null) return t.elapsed || 0;
    return (t.elapsed || 0) + (Date.now() - t.start);
  }, [displayTimers]);

  const isRowVisible = useCallback((displayRow) => {
    return rowMapping[displayRow] !== -1;
  }, [rowMapping]);



  const canEdit = useCallback((r, c) => {
    if (isAdmin) {
      return ADMIN_EDITABLE_IN_CS.has(c);
    }
    if (rowMapping[r] === -1) return false;
    return editableCols.has(c);
  }, [isAdmin, editableCols, rowMapping]);

  const handleCellClick = (r, c) => {
    if (rowMapping[r] === -1 && !isAdmin) return;
    setActiveCell({ r, c });
    setSelection({ r1: r, c1: c, r2: r, c2: c });
  };

  const handleCellDoubleClick = (r, c) => {
    if (c === COL_STATUS) return;
    
    // Allow viewing (and editing if permitted) for all cells except STATUS
    const isEditable = canEdit(r, c);
    const isViewOnly = [COL_REASON, COL_CONF1, COL_CONF2, COL_CONF3, COL_CONF4, COL_CONF5, COL_CONF6].includes(c);
    
    setEditingCell({ r, c, readOnly: !isEditable || isViewOnly });
    setEditValue(displayData[r]?.[c] || '');
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.focus();
        if (isEditable && !isViewOnly) {
          editorRef.current.select();
        } else {
          // Select all for copying
          editorRef.current.select();
        }
      }
    }, 0);
  };

  const commitEdit = () => {
    if (editingCell) {
      // Only save if not read-only
      if (!editingCell.readOnly) {
        const actualRow = rowMapping[editingCell.r];
        if (actualRow !== -1) {
          onCellChange(actualRow, editingCell.c, editValue);
        }
      }
      setEditingCell(null);
      setEditValue("");
      setTypingCell(null);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    }
  };

  const handleEditValueChange = (value) => {
    setEditValue(value);
    if (fastEditMode && editingCell) {
      setTypingCell({ r: editingCell.r, c: editingCell.c });
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        setTypingCell(null);
      }, 1000);
    }
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const handleCopy = useCallback(() => {
    const { r1, c1, r2, c2 } = selection;
    const copied = [];
    for (let r = r1; r <= r2; r++) {
      const row = [];
      for (let c = c1; c <= c2; c++) {
        row.push(displayData[r]?.[c] || '');
      }
      copied.push(row);
    }
    setCopiedData(copied);
    toast.success(`Copied ${(r2-r1+1) * (c2-c1+1)} cells`);
  }, [selection, displayData]);

  const handlePaste = useCallback(() => {
    if (!copiedData) return;
    const startR = activeCell.r;
    const startC = activeCell.c;
    
    copiedData.forEach((row, ri) => {
      row.forEach((cell, ci) => {
        const displayRow = startR + ri;
        const targetC = startC + ci;
        const actualRow = rowMapping[displayRow];
        if (actualRow !== -1 && targetC < columns.length && canEdit(displayRow, targetC)) {
          onCellChange(actualRow, targetC, cell);
        }
      });
    });
    toast.success('Pasted data');
  }, [copiedData, activeCell, canEdit, onCellChange, columns.length, rowMapping]);

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

    // Copy/Paste
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      e.preventDefault();
      handleCopy();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      e.preventDefault();
      handlePaste();
      return;
    }

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        setActiveCell(prev => ({ r: Math.max(0, prev.r - 1), c: prev.c }));
        if (e.shiftKey) {
          setSelection(prev => ({ ...prev, r2: Math.max(0, prev.r2 - 1) }));
        } else {
          setSelection(prev => ({ r1: activeCell.r - 1, c1: activeCell.c, r2: activeCell.r - 1, c2: activeCell.c }));
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        setActiveCell(prev => ({ r: Math.min(ROWS_COUNT - 1, prev.r + 1), c: prev.c }));
        if (e.shiftKey) {
          setSelection(prev => ({ ...prev, r2: Math.min(ROWS_COUNT - 1, prev.r2 + 1) }));
        } else {
          setSelection(prev => ({ r1: activeCell.r + 1, c1: activeCell.c, r2: activeCell.r + 1, c2: activeCell.c }));
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        setActiveCell(prev => ({ r: prev.r, c: Math.max(0, prev.c - 1) }));
        if (e.shiftKey) {
          setSelection(prev => ({ ...prev, c2: Math.max(0, prev.c2 - 1) }));
        } else {
          setSelection(prev => ({ r1: activeCell.r, c1: activeCell.c - 1, r2: activeCell.r, c2: activeCell.c - 1 }));
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        setActiveCell(prev => ({ r: prev.r, c: Math.min(columns.length - 1, prev.c + 1) }));
        if (e.shiftKey) {
          setSelection(prev => ({ ...prev, c2: Math.min(columns.length - 1, prev.c2 + 1) }));
        } else {
          setSelection(prev => ({ r1: activeCell.r, c1: activeCell.c + 1, r2: activeCell.r, c2: activeCell.c + 1 }));
        }
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
        const { r1, c1, r2, c2 } = selection;
        for (let r = r1; r <= r2; r++) {
          for (let c = c1; c <= c2; c++) {
            const actualRow = rowMapping[r];
            if (actualRow !== -1 && canEdit(r, c) && c !== COL_STATUS) {
              onCellChange(actualRow, c, '');
            }
          }
        }
        break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          if (canEdit(activeCell.r, activeCell.c) && activeCell.c !== COL_STATUS) {
            setEditingCell(activeCell);
            setEditValue(e.key);
            e.preventDefault();
            setTimeout(() => {
              if (editorRef.current) {
                editorRef.current.focus();
                editorRef.current.setSelectionRange(1, 1);
              }
            }, 0);
          }
        }
      }
      };

  const handleResizerMouseDown = (e) => {
    const resizer = e.target.closest('.col-resizer');
    if (resizer) {
      const c = parseInt(resizer.dataset.c);
      setResizing({ c, startX: e.clientX, startWidth: colWidths[c] });
      e.preventDefault();
      e.stopPropagation();
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
    
    const actualRow = rowMapping[r];
    const state = displayTimers[r]?.state?.toUpperCase() || '';
    if (state === 'DONE') classes.push('row-done');
    if (state === 'REJECTED') classes.push('row-rejected');
    
    if (actualRow !== -1 && blinkRows && blinkRows[actualRow]) classes.push('blink-row');
    
    if (rowMapping[r] === -1) classes.push('hidden-row');
    
    if (r % 2 === 0) classes.push('even-row');
    
    if (isAdmin && selectedRows && selectedRows.has(actualRow)) classes.push('row-selected');
    
    if (typingCell && typingCell.r === r && typingCell.c === c) classes.push('typing-indicator');
    
    return classes.join(' ');
  };

  const handleSort = (colIndex) => {
    if (!isAdmin) return;
    const direction = sortConfig.column === colIndex && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ column: colIndex, direction });
    if (onSort) onSort(colIndex, direction);
    toast.success(`Sorted by ${columns[colIndex]} (${direction})`);
  };

  const handleCellMouseDown = (r, c, e) => {
    if (e.target.closest('.status-btn')) return;
    
    setActiveCell({ r, c });
    if (e.shiftKey) {
      setSelection(prev => ({
        r1: Math.min(prev.r1, r),
        c1: Math.min(prev.c1, c),
        r2: Math.max(prev.r2, r),
        c2: Math.max(prev.c2, c)
      }));
    } else {
      setSelection({ r1: r, c1: c, r2: r, c2: c });
      setDragSelecting(true);
    }
  };

  const handleMouseEnter = (r, c) => {
    if (dragSelecting) {
      setSelection(prev => ({
        r1: Math.min(prev.r1, r),
        c1: Math.min(prev.c1, c),
        r2: Math.max(prev.r2, r),
        c2: Math.max(prev.c2, c)
      }));
      setActiveCell({ r, c });
    }
  };

  const handleCellMouseUp = () => {
    setDragSelecting(false);
  };

  const renderStatusCell = (displayRow) => {
    const actualRow = rowMapping[displayRow];
    const timer = displayTimers[displayRow] || { doneClicks: 0, rejClicks: 0, state: '', start: null };
    const visible = isRowVisible(displayRow);

    if (!visible) return null;

    const handleDone = (e) => {
      e.stopPropagation();
      if (actualRow !== -1) {
        onStatusClick(actualRow, 'done');
      }
    };

    const handleReject = (e) => {
      e.stopPropagation();
      const rej2 = displayData[displayRow]?.[COL_REJ2] || '';
      const rej3 = displayData[displayRow]?.[COL_REJ3] || '';
      const rej4 = displayData[displayRow]?.[COL_REJ4] || '';
      const rej5 = displayData[displayRow]?.[COL_REJ5] || '';

      const rejCount = timer.rejClicks || 0;

      // Check if data already exists in rejection columns (from admin)
      const hasRej2 = rej2.trim();
      const hasRej3 = rej3.trim();
      const hasRej4 = rej4.trim();
      const hasRej5 = rej5.trim();

      if (rejCount === 0 && !hasRej2) {
        toast.error("Please fill 2ND REJECTION reason first");
        return;
      }
      if (rejCount === 1 && hasRej3 && !rej4.trim()) {
        toast.error("Please fill 4TH REJECTION reason first (3rd already filled)");
        return;
      }
      if (rejCount === 1 && !hasRej3) {
        toast.error("Please fill 3RD REJECTION reason first");
        return;
      }
      if (rejCount === 2 && hasRej4 && !rej5.trim()) {
        toast.error("Please fill 5TH REJECTION reason first (4th already filled)");
        return;
      }
      if (rejCount === 2 && !hasRej4) {
        toast.error("Please fill 4TH REJECTION reason first");
        return;
      }
      if (rejCount === 3 && !hasRej5) {
        toast.error("Please fill 5TH REJECTION reason first");
        return;
      }
      if (rejCount >= 4) {
        toast.error("Maximum rejections reached");
        return;
      }

      if (actualRow !== -1) {
        onStatusClick(actualRow, 'reject');
      }
    };

    const handleStart = (e) => {
      e.stopPropagation();
      if (actualRow !== -1) {
        onStatusClick(actualRow, 'start');
      }
    };

    const timeStr = formatMs(getRunningMs(displayRow));
    const statusText = displayData[displayRow]?.[COL_STATUS] || '';

    return (
      <div className="status-wrap">
        {!isAdmin && actualRow !== -1 && (
          <>
            {!timer.start && (
              <button 
                className="status-btn start" 
                onClick={handleStart}
                type="button"
              >
                START
              </button>
            )}
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
        {isAdmin && statusText && (
          <span className="text-xs font-bold text-red-600">{statusText}</span>
        )}
        {actualRow !== -1 && (
          <span className="status-label">
            D:{timer.doneClicks || 0} R:{timer.rejClicks || 0} T:{timeStr}
          </span>
        )}
      </div>
    );
  };

  const renderCellContent = (r, c) => {
    if (c === COL_STATUS) {
      return renderStatusCell(r);
    }

    if (c === COL_TIME) {
      return displayData[r]?.[COL_TIME] || '';
    }
    
    const visible = isRowVisible(r);
    if (!visible) return '';
    
    // Hide rejection columns if no value
    if ([COL_REJ2, COL_REJ3, COL_REJ4, COL_REJ5].includes(c)) {
      const val = displayData[r]?.[c] || '';
      if (!val.trim() && !isAdmin) return '';
    }
    
    return displayData[r]?.[c] || '';
  };

  const visibleRows = isAdmin ? ROWS_COUNT : compactedView.data.length;
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `48px ${colWidths.map(w => `${w}px`).join(' ')}`,
    gridTemplateRows: `30px repeat(${visibleRows}, 30px)`,
    width: 'fit-content',
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setDragSelecting(false);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  return (
    <div 
      ref={containerRef}
      className="excel-sheet-container"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top left' }}
    >
      <style>{`
        :root {
          --bg: #070a12;
          --panel: #0b1220;
          --text: #fff7d1;
          --muted: rgba(255,247,209,.68);
          --accent: #ffd33a;
          --accent-2: #ffbf00;
          --accent-3: #fff1a6;
          --gridLine: rgba(255,210,0,0.20);
          --select: rgba(255,208,0,0.14);
          --selectBorder: rgba(255,208,0,0.96);
          --activeBorder: rgba(255,214,0,0.98);
          --shadow: 0 20px 70px rgba(0,0,0,0.55);
        }

        .excel-sheet-container {
          outline: none;
          position: relative;
          background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(0,0,0,0.04));
          border-radius: 14px;
          overflow: hidden;
          box-shadow: var(--shadow);
          border: 1px solid rgba(255,215,0,0.06);
        }

        .sheet-scroll {
          overflow: auto;
          max-height: 78vh;
          width: 100%;
          position: relative;
          padding: 12px;
          box-sizing: border-box;
          background: linear-gradient(180deg, rgba(0,0,0,0.02), rgba(0,0,0,0.01));
        }

        .sheet-scroll::-webkit-scrollbar {
          width: 12px;
          height: 12px;
        }

        .sheet-scroll::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.05);
          border-radius: 6px;
        }

        .sheet-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,204,0,0.6);
          border-radius: 6px;
        }

        .sheet-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255,204,0,0.8);
        }

        .sheet-grid {
          user-select: none;
          position: relative;
          background: transparent;
          contain: layout paint;
          min-width: max-content;
        }

        .corner, .col-header, .row-header {
          position: sticky;
          z-index: 6;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          user-select: none;
          color: #000000;
          background: linear-gradient(180deg, rgba(255,244,176,0.12), rgba(255,235,120,0.04));
          border-right: 1px solid rgba(0,0,0,0.3);
          border-bottom: 1px solid rgba(0,0,0,0.3);
          box-sizing: border-box;
        }

        .corner { left: 0; top: 0; z-index: 10; }

        .col-header { 
          top: 0; 
          z-index: 9; 
          position: sticky;
          cursor: pointer;
          transition: background 0.12s ease;
          padding: 4px;
        }
        .col-header:hover { background: rgba(255,244,176,0.22); }

        .row-header { 
          left: 0; 
          z-index: 9; 
          position: sticky;
          justify-content: center;
          padding: 4px;
        }

        .cell {
          border-right: 1px solid rgba(0,0,0,0.3);
          border-bottom: 1px solid rgba(0,0,0,0.3);
          padding: 6px 10px;
          display: flex;
          align-items: center;
          background: rgba(255,255,255,0.01);
          color: #000000;
          font-size: 13px;
          outline: none;
          overflow: visible;
          white-space: nowrap;
          text-overflow: ellipsis;
          height: 30px;
          box-sizing: border-box;
          transition: background 0.12s ease, box-shadow 0.12s ease;
          cursor: pointer;
        }

        .cell:hover { background: rgba(255,245,200,0.02); }

        .cell.selected { 
          background: var(--select) !important;
        }

        .cell.selected:not(.active) { 
          box-shadow: inset 0 0 0 1px var(--selectBorder);
        }

        .cell.active { 
          box-shadow: inset 0 0 0 2px var(--activeBorder) !important;
          background: rgba(255,246,200,0.06) !important;
          position: relative;
          z-index: 2;
        }

        .cell.row-done { background: rgba(22,163,74,0.12) !important; }
        .cell.row-rejected { background: rgba(220,38,38,0.12) !important; }
        .cell.hidden-row { 
          background: rgba(240,240,240,0.5) !important;
          color: transparent !important;
          pointer-events: none;
        }

        .cell.blink-row {
          animation: blink-anim 0.6s ease-in-out infinite alternate;
        }

        @keyframes blink-anim {
          0% { background: rgba(255,204,0,0.35) !important; }
          100% { background: rgba(255,204,0,0.75) !important; }
        }

        .cell.row-selected {
          background: rgba(255,208,0,0.08) !important;
          border-left: 3px solid var(--accent) !important;
        }

        .cell.typing-indicator {
          border: 2px solid #10b981 !important;
          box-shadow: 0 0 8px rgba(16,185,129,0.3);
        }

        .fillHandle {
          position: absolute;
          width: 10px;
          height: 10px;
          right: -2px;
          bottom: -2px;
          background: linear-gradient(180deg, var(--accent), var(--accent-2));
          border: 1px solid rgba(0,0,0,0.35);
          border-radius: 2px;
          cursor: crosshair;
          z-index: 20;
          display: none;
          box-shadow: 0 2px 6px rgba(0,0,0,0.25);
        }

        .cell.active .fillHandle { display: block; }

        .col-resizer {
          position: absolute;
          right: -4px;
          top: 0;
          width: 8px;
          height: 100%;
          cursor: col-resize;
          background: transparent;
          z-index: 20;
        }
        .col-resizer:hover { background: rgba(255,210,0,0.5); }
        .col-resizer:active { background: rgba(255,210,0,0.7); }



        .status-wrap {
          display: flex;
          align-items: center;
          gap: 4px;
          width: 100%;
          min-width: max-content;
          flex-wrap: nowrap;
          overflow: visible;
        }

        .status-btn {
          border: 1px solid rgba(255,210,0,0.3);
          background: rgba(255,244,176,0.1);
          color: #0b0a03;
          padding: 3px 6px;
          border-radius: 4px;
          font-weight: 900;
          font-size: 10px;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .status-btn:hover { 
          transform: scale(1.05);
          background: rgba(255,244,176,0.2);
        }

        .status-btn.done { 
          background: rgba(22,163,74,0.15); 
          border-color: rgba(22,163,74,0.3); 
        }

        .status-btn.reject { 
          background: rgba(220,38,38,0.15); 
          border-color: rgba(220,38,38,0.3); 
        }

        .status-btn.start { 
          background: rgba(59,130,246,0.15); 
          border-color: rgba(59,130,246,0.3); 
        }

        .status-label {
          margin-left: auto;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 4px;
          border-radius: 4px;
          background: rgba(255,244,176,0.15);
          border: 1px solid rgba(255,210,0,0.2);
          color: #0b0a03;
          display: flex;
          align-items: center;
          gap: 4px;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .upload-time-status {
          color: #0066cc;
          font-weight: 900;
          font-size: 11px;
          padding: 3px 6px;
          background: rgba(0,102,204,0.15);
          border-radius: 4px;
          border: 1px solid rgba(0,102,204,0.25);
          margin-right: 4px;
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
              onClick={() => handleSort(c)}
              title={`Click to sort by ${col}`}
            >
              <span>{colToName(c)}</span>
              <span style={{ fontSize: '9px', marginLeft: '2px', opacity: 0.7 }}>{col}</span>
              {sortConfig.column === c && (
                <span style={{ marginLeft: '4px' }}>
                  {sortConfig.direction === 'asc' ? '▲' : '▼'}
                </span>
              )}
              <div 
                className="col-resizer" 
                data-c={c}
                onMouseDown={handleResizerMouseDown}
              />
            </div>
          ))}
          
          {/* Row Headers & Cells */}
          {Array.from({ length: visibleRows }).map((_, r) => (
            <React.Fragment key={`row-${r}`}>
              <div 
                className="row-header" 
                style={{ gridRow: r + 2, gridColumn: 1, cursor: isAdmin && onRowSelect ? 'pointer' : 'default' }}
                onClick={() => {
                  const actualRow = rowMapping[r];
                  if (isAdmin && onRowSelect && actualRow !== -1) {
                    onRowSelect(actualRow);
                  }
                }}
              >
                {isAdmin && onRowSelect && selectedRows ? (
                  rowMapping[r] !== -1 && selectedRows.has(rowMapping[r]) ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />
                ) : (
                  r + 1
                )}
              </div>
              {columns.map((_, c) => (
                <div
                  key={`cell-${r}-${c}`}
                  className={getCellClass(r, c)}
                  style={{ gridRow: r + 2, gridColumn: c + 2, position: 'relative' }}
                  onMouseDown={(e) => handleCellMouseDown(r, c, e)}
                  onMouseEnter={() => handleMouseEnter(r, c)}
                  onMouseUp={handleCellMouseUp}
                  onClick={() => handleCellClick(r, c)}
                  onDoubleClick={() => handleCellDoubleClick(r, c)}
                >
                  {editingCell && editingCell.r === r && editingCell.c === c ? null : renderCellContent(r, c)}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
      
      {/* Inline Cell Editor */}
      {editingCell && (
        <div
          style={{
            gridRow: editingCell.r + 2,
            gridColumn: editingCell.c + 2,
            position: 'absolute',
            zIndex: 100,
            width: colWidths[editingCell.c] + 'px',
            height: '30px',
          }}
        >
          <textarea
            ref={editorRef}
            className="cell-editor"
            readOnly={editingCell.readOnly}
            style={{
              width: '100%',
              minHeight: '30px',
              maxHeight: '200px',
              height: 'auto',
              border: editingCell.readOnly ? '2px solid #3b82f6' : '2px solid var(--activeBorder)',
              background: editingCell.readOnly ? '#dbeafe' : '#ffffff',
              color: '#000000',
              fontSize: '13px',
              padding: '6px 10px',
              outline: 'none',
              boxShadow: editingCell.readOnly ? '0 0 0 3px rgba(59,130,246,0.3)' : '0 0 0 3px rgba(255,210,0,0.2)',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
              cursor: editingCell.readOnly ? 'text' : 'text',
              resize: 'vertical',
              overflow: 'auto',
            }}
            value={editValue}
            onChange={(e) => !editingCell.readOnly && handleEditValueChange(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (editingCell.readOnly) {
                if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); commitEdit(); }
                return;
              }
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit(); }
              if (e.key === 'Escape') { e.preventDefault(); commitEdit(); }
              if (e.key === 'Tab') { 
                e.preventDefault(); 
                commitEdit(); 
                setActiveCell(prev => ({ r: prev.r, c: Math.min(prev.c + 1, columns.length - 1) }));
              }
            }}
          />
        </div>
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
  const [uploading, setUploading] = useState(false);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [fastEditMode, setFastEditMode] = useState(false);
  const [activeFilters, setActiveFilters] = useState(null);
  const [filteredData, setFilteredData] = useState(null);
  const [csAllocators, setCSAllocators] = useState([]);
  const [newCSUser, setNewCSUser] = useState("");
  const [newCSPass, setNewCSPass] = useState("");
  const [priorityNumbers, setPriorityNumbers] = useState("");
  const [csUploads, setCSUploads] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const state = loadState();
    setAgents(state.agents || []);
    setCSAllocators(state.csAllocators || []);
    setNewAdminUser(state.admin.username);

    const sheets = loadAgentSheets();
    setCSUploads(sheets.csUploads || []);
    setPriorityNumbers(sheets.priorityNumbers || "");

    const interval = setInterval(() => {
      setRefreshKey(k => k + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleSync = (ev) => {
      if (ev?.data?.uploadNotification) {
        const notif = ev.data.uploadNotification;
        toast.success(`🔔 CS Upload: ${notif.csUser} uploaded ${notif.filename} with ${notif.rowCount} rows`, { duration: 8000 });
        const sheets = loadAgentSheets();
        setCSUploads(sheets.csUploads || []);
      }
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
    
    // If CS team adds value to confirmation columns, blink for agent and update state
    if ([COL_CONF2, COL_CONF3, COL_CONF4, COL_CONF5, COL_CONF6].includes(c) && value.trim()) {
      if (!newSheet.blinkRows) newSheet.blinkRows = {};
      newSheet.blinkRows[r] = true;
      
      // Clear rejected state if CS team confirms
      if (newSheet.timers[r]?.state === "REJECTED") {
        newSheet.timers[r].state = "";
        newSheet.raw[r][COL_STATUS] = "";
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

  const createCSAllocator = () => {
    if (!newCSUser.trim() || !newCSPass.trim()) {
      toast.error("Please enter CS Allocator username and password");
      return;
    }
    if (newCSPass.length < 4) {
      toast.error("Password must be at least 4 characters");
      return;
    }
    
    const state = loadState();
    if (state.csAllocators.some(a => a.username === newCSUser)) {
      toast.error("CS Allocator already exists");
      return;
    }
    
    state.csAllocators.push({ username: newCSUser, password: newCSPass });
    saveState(state);
    setCSAllocators(state.csAllocators);
    setNewCSUser("");
    setNewCSPass("");
    toast.success(`CS Allocator "${newCSUser}" created`);
  };

  const deleteCSAllocator = (username) => {
    const state = loadState();
    state.csAllocators = state.csAllocators.filter(a => a.username !== username);
    saveState(state);
    setCSAllocators(state.csAllocators);
    toast.success(`CS Allocator "${username}" deleted`);
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
    let awbPending = 0, lineSumPending = 0, done = 0, rej = 0, totalDoneLines = 0, totalRejectedLines = 0;
    
    for (let r = 0; r < ROWS_COUNT; r++) {
      const agent = String(sheet.raw[r]?.[COL_AGENTS] || '').trim().toLowerCase();
      if (agent !== agentUser.toLowerCase()) continue;
      
      const state = sheet.timers[r]?.state?.toUpperCase() || '';
      const lineSum = parseLineSum(sheet.raw[r]?.[COL_LINE]);
      
      if (state === 'DONE') {
        done++;
        totalDoneLines += lineSum;
      }
      if (state === 'REJECTED') {
        rej++;
        totalRejectedLines += lineSum;
      }
      
      // Count pending (not done/rejected)
      if (state !== 'DONE' && state !== 'REJECTED') {
        if (sheet.raw[r]?.[COL_AWB]?.trim()) awbPending++;
        lineSumPending += lineSum;
      }
    }
    
    return { 
      awb: awbPending, 
      lineSum: lineSumPending, 
      done, 
      rej,
      totalDoneLines,
      totalRejectedLines
    };
  };

  const getUniqueRegions = (agentUser = null) => {
    const regions = new Set();
    for (let r = 0; r < ROWS_COUNT; r++) {
      // If agent specified, only get regions for that agent's rows
      if (agentUser) {
        const rowAgent = String(csSheet.raw[r]?.[COL_AGENTS] || '').trim().toLowerCase();
        if (rowAgent !== agentUser.toLowerCase()) continue;
      }
      
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
    setRegionFilter(region);
    CHANNEL.postMessage({ type: "app:sync" });
    toast.success(`Region filter "${region || 'ALL'}" applied to ${agent}${region ? ' - Agent will only see rows with this region' : ' - Agent will see all their rows'}`);
  };

  const clearAllData = () => {
    if (confirm('Are you sure you want to clear all CS Sheet data? This cannot be undone.')) {
      const newSheet = {
        raw: Array.from({ length: ROWS_COUNT }, () => Array(CS_COLUMNS.length).fill('')),
        timers: Array.from({ length: ROWS_COUNT }, () => ({ elapsed: 0, start: null, doneClicks: 0, rejClicks: 0, state: "" })),
        colWidths: CS_COLUMNS.map(() => 140),
        blinkRows: {},
        agentBreaks: {}
      };
      setCSSheet(newSheet);
      saveCSSheet(newSheet);
      CHANNEL.postMessage({ type: "app:sync" });
      toast.success("All data cleared");
    }
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

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const parsedData = await parseUploadedFile(file);
      
      if (parsedData.length === 0) {
        toast.error("File is empty");
        setUploading(false);
        return;
      }
      
      // First row should be headers
      const headers = parsedData[0];
      const dataRows = parsedData.slice(1);
      
      // Map uploaded columns to CS sheet columns
      const colMapping = {};
      headers.forEach((header, idx) => {
        const headerUpper = String(header).toUpperCase().trim();
        const csIdx = CS_COLUMNS.findIndex(col => col.toUpperCase() === headerUpper);
        if (csIdx !== -1) {
          colMapping[idx] = csIdx;
        }
      });
      
      const newSheet = deepCopy(csSheet);
      let rowsAdded = 0;
      
      // Find first empty row in CS sheet (append at end)
      let startRow = 0;
      for (let r = 0; r < ROWS_COUNT; r++) {
        if (csSheet.raw[r].every(cell => !cell.trim())) {
          startRow = r;
          break;
        }
      }
      
      // Add data rows
      dataRows.forEach((row, idx) => {
        const targetRow = startRow + idx;
        if (targetRow >= ROWS_COUNT) return;

        row.forEach((cell, colIdx) => {
          const targetCol = colMapping[colIdx];
          if (targetCol !== undefined) {
            let cellValue = String(cell || '').trim();

            // Convert Excel serial time to readable format for TIME column
            if (targetCol === COL_TIME && cellValue) {
              cellValue = excelSerialToTime(cellValue);
            }

            newSheet.raw[targetRow][targetCol] = cellValue;
          }
        });

        // Check if this row has agent assigned and AWB
        const agentName = String(newSheet.raw[targetRow][COL_AGENTS] || '').trim().toLowerCase();
        const awb = newSheet.raw[targetRow][COL_AWB];

        // Initialize timer but don't start it (agent will start it)
        if (isValidAwb(awb)) {
          newSheet.timers[targetRow] = {
            elapsed: 0,
            start: null,
            doneClicks: 0,
            rejClicks: 0,
            state: ""
          };
        }

        rowsAdded++;
      });
      
      setCSSheet(newSheet);
      saveCSSheet(newSheet);
      CHANNEL.postMessage({ type: "app:sync" });
      toast.success(`Uploaded ${rowsAdded} rows successfully`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload file. Please check the format.");
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
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

  const handleRowSelect = (rowIndex) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(rowIndex)) {
      newSelected.delete(rowIndex);
    } else {
      newSelected.add(rowIndex);
    }
    setSelectedRows(newSelected);
  };

  const handleSelectAll = () => {
    const allRows = new Set();
    for (let r = 0; r < ROWS_COUNT; r++) {
      if (csSheet.raw[r].some(cell => cell.trim())) {
        allRows.add(r);
      }
    }
    setSelectedRows(allRows);
    toast.success(`Selected ${allRows.size} rows`);
  };

  const handleDeselectAll = () => {
    setSelectedRows(new Set());
    toast.success('Deselected all rows');
  };

  const handleClearSelected = () => {
    if (selectedRows.size === 0) {
      toast.error('No rows selected');
      return;
    }
    
    if (confirm(`Clear ${selectedRows.size} selected rows?`)) {
      const newSheet = deepCopy(csSheet);
      selectedRows.forEach(r => {
        newSheet.raw[r] = Array(CS_COLUMNS.length).fill('');
        newSheet.timers[r] = { elapsed: 0, start: null, doneClicks: 0, rejClicks: 0, state: "" };
      });
      setCSSheet(newSheet);
      saveCSSheet(newSheet);
      CHANNEL.postMessage({ type: "app:sync" });
      setSelectedRows(new Set());
      toast.success(`Cleared ${selectedRows.size} rows`);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedRows.size === 0) {
      toast.error('No rows selected');
      return;
    }
    
    if (confirm(`Delete ${selectedRows.size} selected rows? This will shift rows up.`)) {
      const newSheet = deepCopy(csSheet);
      const sortedRows = Array.from(selectedRows).sort((a, b) => b - a);
      
      sortedRows.forEach(r => {
        newSheet.raw.splice(r, 1);
        newSheet.timers.splice(r, 1);
        newSheet.raw.push(Array(CS_COLUMNS.length).fill(''));
        newSheet.timers.push({ elapsed: 0, start: null, doneClicks: 0, rejClicks: 0, state: "" });
      });
      
      setCSSheet(newSheet);
      saveCSSheet(newSheet);
      CHANNEL.postMessage({ type: "app:sync" });
      setSelectedRows(new Set());
      toast.success(`Deleted ${selectedRows.size} rows`);
    }
  };

  const applyFilters = (filters) => {
    setActiveFilters(filters);
    
    if (!filters || (!filters.remarkKeyword && !filters.reasonKeyword && !filters.timeFrom && !filters.timeTo && (!filters.sortColumns || filters.sortColumns.length === 0))) {
      setFilteredData(null);
      return;
    }

    let filtered = csSheet.raw.map((row, idx) => ({ row, idx, timer: csSheet.timers[idx] }));

    // Keyword filters
    if (filters.remarkKeyword) {
      const keyword = filters.remarkKeyword.toLowerCase();
      filtered = filtered.filter(item => 
        String(item.row[COL_REMARKS] || '').toLowerCase().includes(keyword)
      );
    }
    if (filters.reasonKeyword) {
      const keyword = filters.reasonKeyword.toLowerCase();
      filtered = filtered.filter(item => 
        String(item.row[COL_REASON] || '').toLowerCase().includes(keyword)
      );
    }

    // Time range filter
    if (filters.timeFrom || filters.timeTo) {
      filtered = filtered.filter(item => {
        const elapsed = item.timer.elapsed || 0;
        const running = item.timer.start ? (elapsed + (Date.now() - item.timer.start)) : elapsed;
        if (filters.timeFrom && running < filters.timeFrom) return false;
        if (filters.timeTo && running > filters.timeTo) return false;
        return true;
      });
    }

    // Multi-column sort
    if (filters.sortColumns && filters.sortColumns.length > 0) {
      filtered.sort((a, b) => {
        for (const sort of filters.sortColumns) {
          if (!sort.column) continue;
          const colIdx = CS_COLUMNS.indexOf(sort.column);
          if (colIdx === -1) continue;
          
          const valA = String(a.row[colIdx] || '').toLowerCase();
          const valB = String(b.row[colIdx] || '').toLowerCase();
          
          let comparison = 0;
          if (!isNaN(parseFloat(valA)) && !isNaN(parseFloat(valB))) {
            comparison = parseFloat(valA) - parseFloat(valB);
          } else {
            comparison = valA.localeCompare(valB);
          }
          
          if (comparison !== 0) {
            return sort.direction === 'asc' ? comparison : -comparison;
          }
        }
        return 0;
      });
    }

    setFilteredData(filtered);
  };

  const saveFilter = (filter) => {
    const newSheet = deepCopy(csSheet);
    if (!newSheet.savedFilters) newSheet.savedFilters = [];
    newSheet.savedFilters.push(filter);
    setCSSheet(newSheet);
    saveCSSheet(newSheet);
  };

  const deleteFilter = (index) => {
    const newSheet = deepCopy(csSheet);
    newSheet.savedFilters.splice(index, 1);
    setCSSheet(newSheet);
    saveCSSheet(newSheet);
    toast.success('Filter deleted');
  };

  const getDisplayData = () => {
    if (filteredData) {
      const result = Array(ROWS_COUNT).fill(null).map(() => Array(CS_COLUMNS.length).fill(''));
      const resultTimers = Array(ROWS_COUNT).fill(null).map(() => ({ elapsed: 0, start: null, doneClicks: 0, rejClicks: 0, state: "" }));
      
      filteredData.forEach((item, newIdx) => {
        if (newIdx < ROWS_COUNT) {
          result[newIdx] = item.row;
          resultTimers[newIdx] = item.timer;
        }
      });
      
      return { raw: result, timers: resultTimers };
    }
    return { raw: csSheet.raw, timers: csSheet.timers };
  };

  const displayData = getDisplayData();

  const handleSetPriority = () => {
    const numbers = priorityNumbers.split(/[\s,;\n]+/).map(n => n.trim()).filter(n => /^\d{10}$/.test(n));
    if (numbers.length === 0) {
      toast.error("Please enter valid 10-digit AWB numbers");
      return;
    }
    
    const sheets = loadAgentSheets();
    sheets.priorityNumbers = priorityNumbers;
    sheets.priorityList = numbers;
    saveAgentSheets(sheets);
    CHANNEL.postMessage({ type: "app:sync" });
    toast.success(`🚨 Priority set for ${numbers.length} AWBs - All agents notified!`);
  };

  const handleClearPriority = () => {
    if (confirm('Clear all priority/emergency clearance?')) {
      const sheets = loadAgentSheets();
      sheets.priorityNumbers = "";
      sheets.priorityList = [];
      saveAgentSheets(sheets);
      setPriorityNumbers("");
      CHANNEL.postMessage({ type: "app:sync" });
      toast.success("Priority clearance removed");
    }
  };

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
            <TabsTrigger value="priority" className="font-bold data-[state=active]:bg-yellow-400/60">
              <Zap className="w-4 h-4 mr-2" />
              Priority
              {agentSheets.priorityList?.length > 0 && (
                <Badge className="ml-2 bg-red-500 text-white">{agentSheets.priorityList.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="uploads" className="font-bold data-[state=active]:bg-yellow-400/60">
              <Upload className="w-4 h-4 mr-2" />
              CS Uploads
              {csUploads.length > 0 && (
                <Badge className="ml-2 bg-blue-500 text-white">{csUploads.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings" className="font-bold data-[state=active]:bg-yellow-400/60">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* CS Sheet Tab */}
          <TabsContent value="cs-sheet" className="mt-4 space-y-4">
            {/* Analytics & Upload */}
            <Card className="bg-white/95 border-black/10 shadow-lg">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-4 flex-wrap">
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
                  <div className="ml-auto flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button 
                      onClick={() => fileInputRef.current?.click()} 
                      variant="outline" 
                      size="sm" 
                      className="font-bold bg-green-50 hover:bg-green-100 border-green-300"
                      disabled={uploading}
                    >
                      {uploading ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      Upload
                    </Button>
                    <Button onClick={downloadAllCSData} variant="outline" size="sm" className="font-bold">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    <DailyReportDialog csSheet={csSheet} agents={agents} columns={CS_COLUMNS} />
                  </div>
                </div>
                
                <div className="text-xs text-black/50 bg-blue-50 border border-blue-200 rounded-lg p-2">
                  <b>Upload Format:</b> AGENT, AWB'S, REASON, REGION, CONFIRMATION, AGENT2, 2ND REJECTION, 2ND CONFIRMATION, etc. 
                  Data will auto-assign to agent profiles.
                </div>
              </CardContent>
            </Card>



            {/* Bulk Actions */}
            <Card className="bg-white/95 border-black/10 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge className="bg-blue-100 text-blue-800 font-black">BULK ACTIONS</Badge>
                  <Button onClick={handleSelectAll} size="sm" variant="outline" className="font-bold">
                    <CheckSquare className="w-4 h-4 mr-2" />
                    Select All
                  </Button>
                  <Button onClick={handleDeselectAll} size="sm" variant="outline" className="font-bold">
                    <Square className="w-4 h-4 mr-2" />
                    Deselect All
                  </Button>
                  <Button 
                    onClick={handleClearSelected} 
                    size="sm" 
                    variant="outline" 
                    className="font-bold text-orange-600 hover:bg-orange-50"
                    disabled={selectedRows.size === 0}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear Selected ({selectedRows.size})
                  </Button>
                  <Button 
                    onClick={handleDeleteSelected} 
                    size="sm" 
                    variant="outline" 
                    className="font-bold text-red-600 hover:bg-red-50"
                    disabled={selectedRows.size === 0}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Delete Selected ({selectedRows.size})
                  </Button>
                  <div className="ml-auto flex items-center gap-2">
                    <Button 
                      onClick={() => setFastEditMode(!fastEditMode)} 
                      size="sm" 
                      variant={fastEditMode ? "default" : "outline"}
                      className={`font-bold ${fastEditMode ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Fast Edit Mode {fastEditMode ? 'ON' : 'OFF'}
                    </Button>
                  </div>
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
              editableCols={CS_TEAM_EDITABLE}
              blinkRows={csSheet.blinkRows}
              selectedRows={selectedRows}
              onRowSelect={handleRowSelect}
              fastEditMode={fastEditMode}
            />
          </TabsContent>

          {/* Agents Tab */}
          <TabsContent value="agents" className="mt-4 space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
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

              {/* Create CS Allocator */}
              <Card className="bg-white/95 border-black/10 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Create CS Allocator
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-black/60">CS Username</Label>
                    <Input
                      value={newCSUser}
                      onChange={(e) => setNewCSUser(e.target.value)}
                      placeholder="e.g. cs01"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-black/60">CS Password</Label>
                    <Input
                      type="password"
                      value={newCSPass}
                      onChange={(e) => setNewCSPass(e.target.value)}
                      placeholder="Min 4 characters"
                      className="mt-1"
                    />
                  </div>
                  <Button onClick={createCSAllocator} className="w-full bg-blue-400 hover:bg-blue-500 text-white font-bold">
                    Create CS Allocator
                  </Button>
                </CardContent>
              </Card>

              {/* Agents List */}
              <Card className="bg-white/95 border-black/10 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Agents List & Status
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
                          const agentBreak = csSheet.agentBreaks?.[agent.username];
                          const breakActive = agentBreak?.active && agentBreak?.start;
                          const breakType = breakActive ? BREAK_TYPES.find(b => b.id === agentBreak.type) : null;
                          const breakDuration = breakActive && agentBreak.start ? 
                            Math.floor((Date.now() - agentBreak.start) / 1000 / 60) : 0;

                          return (
                            <div key={agent.username} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <div className="font-bold">{agent.username}</div>
                                  {breakActive && breakType && (
                                    <Badge className={`${breakType.color} text-xs animate-pulse`}>
                                      {breakType.icon && <breakType.icon className="w-3 h-3 mr-1" />}
                                      {breakType.label} • {breakDuration}m
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs text-black/50">
                                  Pending: {metrics.awb} ({metrics.lineSum} lines) | Done: {metrics.done} ({metrics.totalDoneLines} lines) | Rejected: {metrics.rej} ({metrics.totalRejectedLines} lines)
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

            {/* CS Allocators List */}
            <Card className="bg-white/95 border-black/10 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  CS Allocators ({csAllocators.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {csAllocators.length === 0 ? (
                  <p className="text-sm text-black/50 text-center py-4">No CS Allocators created yet</p>
                ) : (
                  <div className="grid md:grid-cols-3 gap-2">
                    {csAllocators.map(cs => (
                      <div key={cs.username} className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-200">
                        <div className="font-bold">{cs.username}</div>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => deleteCSAllocator(cs.username)}
                          className="font-bold text-red-600 hover:bg-red-50 h-7 w-7 p-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

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
                        const currentFilter = agentSheets.agentFilters?.[selectedAgent]?.region || "";
                        return (
                          <span className="text-sm text-black/50">
                            Pending: {m.awb} ({m.lineSum} lines) | Done: {m.done} ({m.totalDoneLines} lines) | Rej: {m.rej} ({m.totalRejectedLines} lines)
                            {currentFilter && ` | Region: ${currentFilter}`}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="flex items-center gap-2">
                      <Select 
                        value={agentSheets.agentFilters?.[selectedAgent]?.region || ""} 
                        onValueChange={(v) => {
                          applyRegionFilter(selectedAgent, v);
                          setRegionFilter(v);
                        }}
                      >
                        <SelectTrigger className="w-[150px]">
                          <SelectValue placeholder="ALL REGIONS" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={null}>ALL REGIONS</SelectItem>
                          {getUniqueRegions(selectedAgent).map(r => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button onClick={() => downloadAgentData(selectedAgent)} variant="outline" size="sm" className="font-bold">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                      <Button onClick={() => {
                        setSelectedAgent(null);
                        setRegionFilter("");
                      }} variant="outline" size="sm" className="font-bold">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="text-xs text-blue-600 mb-2 font-bold">
                    Showing only rows assigned to {selectedAgent} {regionFilter && `with region: ${regionFilter}`}
                  </div>
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
                    regionFilter={agentSheets.agentFilters?.[selectedAgent]?.region || ""}
                  />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Priority Tab */}
          <TabsContent value="priority" className="mt-4 space-y-4">
            <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-300 shadow-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl font-bold flex items-center gap-3">
                  <Zap className="w-6 h-6 text-red-600" />
                  🚨 Emergency / Urgent Clearance
                </CardTitle>
                <p className="text-sm text-red-700 font-medium">
                  Set priority AWBs that ALL agents must complete first. Other data will be hidden until these are done.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-bold text-red-800">Priority AWB Numbers (10 digits each)</Label>
                  <p className="text-xs text-gray-600 mb-2">Enter one or multiple AWBs separated by comma, space, or new line</p>
                  <Textarea
                    value={priorityNumbers}
                    onChange={(e) => setPriorityNumbers(e.target.value)}
                    placeholder="1234567890, 9876543210, 5555555555..."
                    className="mt-1 min-h-[120px] font-mono text-sm"
                  />
                </div>

                <div className="flex gap-3">
                  <Button 
                    onClick={handleSetPriority} 
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black"
                  >
                    <Zap className="w-5 h-5 mr-2" />
                    SET PRIORITY
                  </Button>
                  <Button 
                    onClick={handleClearPriority} 
                    variant="outline" 
                    className="font-bold"
                  >
                    Clear All
                  </Button>
                </div>

                {agentSheets.priorityList && agentSheets.priorityList.length > 0 && (
                  <div className="bg-red-100 border-2 border-red-300 rounded-lg p-4">
                    <div className="font-bold text-red-900 mb-2 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      Active Priority: {agentSheets.priorityList.length} AWBs
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {agentSheets.priorityList.slice(0, 20).map((num, idx) => (
                        <Badge key={idx} className="bg-red-600 text-white font-mono">{num}</Badge>
                      ))}
                      {agentSheets.priorityList.length > 20 && (
                        <Badge className="bg-red-400 text-white">+{agentSheets.priorityList.length - 20} more</Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* CS Uploads Tab */}
          <TabsContent value="uploads" className="mt-4">
            <Card className="bg-white/95 border-black/10 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  CS Team Upload History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {csUploads.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Upload className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No uploads yet from CS team</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-3">
                      {csUploads.map((upload, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="p-4 rounded-lg border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className="bg-blue-600 text-white font-bold">{upload.csUser}</Badge>
                                <Badge variant="outline" className="text-xs">{new Date(upload.timestamp).toLocaleString()}</Badge>
                              </div>
                              <div className="font-bold text-gray-900">{upload.filename}</div>
                              <div className="text-sm text-gray-600">
                                {upload.rowCount} rows uploaded
                              </div>
                              {upload.remarks && (
                                <div className="mt-2 text-sm text-gray-700 bg-white p-2 rounded border border-blue-200">
                                  <span className="font-semibold">Remarks:</span> {upload.remarks}
                                </div>
                              )}
                              {upload.downloadedBy && (
                                <div className="mt-2 flex items-center gap-2 text-sm bg-green-50 p-2 rounded border border-green-200">
                                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                                  <div className="text-green-800">
                                    <div className="font-semibold">✓ Downloaded</div>
                                    <div className="text-xs">By {upload.downloadedBy} on {new Date(upload.downloadedAt).toLocaleString()}</div>
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col gap-2">
                              {upload.fileData && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = upload.fileData;
                                    link.download = upload.filename;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    
                                    // Mark as downloaded
                                    const sheets = loadAgentSheets();
                                    const uploadIndex = sheets.csUploads.findIndex(u => 
                                      u.timestamp === upload.timestamp && u.filename === upload.filename
                                    );
                                    if (uploadIndex !== -1) {
                                      sheets.csUploads[uploadIndex].downloadedBy = username;
                                      sheets.csUploads[uploadIndex].downloadedAt = new Date().toISOString();
                                      saveAgentSheets(sheets);
                                      setCSUploads(sheets.csUploads || []);
                                      CHANNEL.postMessage({ type: "app:sync" });
                                    }
                                    
                                    toast.success(`Downloaded ${upload.filename}`);
                                  }}
                                  className="font-bold"
                                >
                                  <Download className="w-4 h-4 mr-1" />
                                  File
                                </Button>
                              )}
                              {upload.downloadedBy ? (
                                <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto" />
                              ) : (
                                <Clock className="w-6 h-6 text-orange-500 mx-auto" />
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
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
// CS ALLOCATOR DASHBOARD COMPONENT
// ============================================================================

const CSAllocatorDashboard = ({ username, onLogout }) => {
  const [csSheet, setCSSheet] = useState(loadCSSheet);
  const [refreshKey, setRefreshKey] = useState(0);
  const [myUploads, setMyUploads] = useState([]);

  useEffect(() => {
    const sheets = loadAgentSheets();
    const uploads = (sheets.csUploads || []).filter(u => u.csUser === username);
    setMyUploads(uploads);
    
    const interval = setInterval(() => {
      setRefreshKey(k => k + 1);
      const updated = loadCSSheet();
      setCSSheet(updated);
      
      const updatedSheets = loadAgentSheets();
      const updatedUploads = (updatedSheets.csUploads || []).filter(u => u.csUser === username);
      setMyUploads(updatedUploads);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [username]);

  useEffect(() => {
    const handleSync = (ev) => {
      if (ev?.data?.type === "app:sync") {
        const updated = loadCSSheet();
        setCSSheet(updated);
      }
      if (ev?.data?.rejectionNotification) {
        const notif = ev.data.rejectionNotification;
        toast.error(`🚨 New Rejection: ${notif.agent} rejected AWB ${notif.awb}`, { duration: 8000 });
      }
    };
    CHANNEL.addEventListener('message', handleSync);
    return () => CHANNEL.removeEventListener('message', handleSync);
  }, []);

  const handleCellChange = (r, c, value) => {
    // CS Allocator can only edit confirmation columns
    if (!CS_ALLOCATOR_EDITABLE.has(c)) return;
    
    const newSheet = deepCopy(csSheet);
    newSheet.raw[r][c] = value;
    
    // If CS team adds confirmation, blink for agent and clear rejected state
    if (value.trim()) {
      if (!newSheet.blinkRows) newSheet.blinkRows = {};
      newSheet.blinkRows[r] = true;
      
      if (newSheet.timers[r]?.state === "REJECTED") {
        newSheet.timers[r].state = "";
        newSheet.raw[r][COL_STATUS] = "";
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
    
    setCSSheet(newSheet);
    saveCSSheet(newSheet);
    CHANNEL.postMessage({ type: "app:sync" });
  };

  const getRejectedCount = () => {
    return csSheet.raw.filter(row => {
      const status = String(row[COL_STATUS] || '').toUpperCase();
      return status === 'REJECT' || status === 'REJECTED';
    }).length;
  };

  const downloadCSData = () => {
    const headers = CS_COLUMNS;
    const rejectedRows = csSheet.raw.filter(row => {
      const status = String(row[COL_STATUS] || '').toUpperCase();
      return status === 'REJECT' || status === 'REJECTED';
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rejectedRows]);
    XLSX.utils.book_append_sheet(wb, ws, 'CS Team Rejected');
    XLSX.writeFile(wb, `cs_team_rejected_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Downloaded rejected items");
  };

  const handleClearSheet = () => {
    if (confirm('Clear all rejected items from CS Team sheet? This will remove all REJECTED status rows.')) {
      const newSheet = deepCopy(csSheet);
      for (let r = 0; r < newSheet.raw.length; r++) {
        const status = String(newSheet.raw[r]?.[COL_STATUS] || '').toUpperCase();
        if (status === 'REJECT' || status === 'REJECTED') {
          newSheet.raw[r] = Array(CS_COLUMNS.length).fill('');
          newSheet.timers[r] = { elapsed: 0, start: null, doneClicks: 0, rejClicks: 0, state: "", hidden: false };
        }
      }
      setCSSheet(newSheet);
      saveCSSheet(newSheet);
      CHANNEL.postMessage({ type: "app:sync" });
      toast.success('Cleared rejected items');
    }
  };

  const handleUploadFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const parsedData = await parseUploadedFile(file);
      if (parsedData.length === 0) {
        toast.error("File is empty");
        return;
      }
      
      // Convert file to base64 for storage
      const fileReader = new FileReader();
      const fileDataPromise = new Promise((resolve) => {
        fileReader.onload = (event) => resolve(event.target.result);
        fileReader.readAsDataURL(file);
      });
      const fileData = await fileDataPromise;

      // Upload notification to admin
      const uploadLog = {
        csUser: username,
        filename: file.name,
        timestamp: new Date().toISOString(),
        rowCount: parsedData.length - 1,
        fileData: fileData,
        remarks: ""
      };
      
      const sheets = loadAgentSheets();
      if (!sheets.csUploads) sheets.csUploads = [];
      sheets.csUploads.unshift(uploadLog);
      saveAgentSheets(sheets);
      
      CHANNEL.postMessage({ type: "app:sync", uploadNotification: uploadLog });
      toast.success(`✅ File uploaded successfully. Admin notified.`);
    } catch (error) {
      toast.error("Failed to upload file");
    }
  };

  const getFilteredData = () => {
    const filtered = [];
    const filteredTimers = [];
    
    csSheet.raw.forEach((row, idx) => {
      const status = String(row[COL_STATUS] || '').toUpperCase();
      if (status === 'REJECT' || status === 'REJECTED') {
        filtered.push(row);
        filteredTimers.push(csSheet.timers[idx]);
      }
    });
    
    // Fill remaining with empty rows
    while (filtered.length < ROWS_COUNT) {
      filtered.push(Array(CS_COLUMNS.length).fill(''));
      filteredTimers.push({ elapsed: 0, start: null, doneClicks: 0, rejClicks: 0, state: "" });
    }
    
    return { data: filtered, timers: filteredTimers };
  };

  const { data: filteredData, timers: filteredTimers } = getFilteredData();

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
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Badge className="bg-blue-400 text-white font-black border-blue-500">CS TEAM</Badge>
                <span className="font-bold">Welcome, {username}</span>
                {myUploads.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-800">
                      {myUploads.length} uploads
                    </Badge>
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      {myUploads.filter(u => u.downloadedBy).length} received
                    </Badge>
                    {myUploads.some(u => !u.downloadedBy) && (
                      <Badge className="bg-orange-100 text-orange-800">
                        <Clock className="w-3 h-3 mr-1" />
                        {myUploads.filter(u => !u.downloadedBy).length} pending
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              <Button onClick={onLogout} variant="outline" className="font-bold bg-yellow-400/50 hover:bg-yellow-400/70 border-black/10">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Analytics */}
        <Card className="bg-white/95 border-black/10 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-4 flex-wrap mb-2">
              <Badge className="bg-blue-400 text-white font-black px-3 py-1">CS TEAM SHEET - REJECTED ITEMS ONLY</Badge>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200">
                <span className="text-sm font-medium text-red-800">REJECTED ITEMS:</span>
                <span className="font-mono font-bold text-red-800">{getRejectedCount()}</span>
              </div>
              <div className="ml-auto flex gap-2">
                <input
                  ref={React.useRef(null)}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleUploadFile}
                  className="hidden"
                  id="cs-upload"
                />
                <Button 
                  onClick={() => document.getElementById('cs-upload').click()} 
                  variant="outline" 
                  size="sm" 
                  className="font-bold bg-green-50 hover:bg-green-100"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </Button>
                <Button onClick={handleClearSheet} variant="outline" size="sm" className="font-bold bg-orange-50 hover:bg-orange-100">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear
                </Button>
                <Button onClick={downloadCSData} variant="outline" size="sm" className="font-bold">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
            <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-200">
              <b>CS Team View:</b> Shows ONLY rejected rows. Add confirmation values (2ND CONFIRMATION, 3RD CONFIRMATION, etc.) to send back to agents.
            </div>
          </CardContent>
        </Card>

        {/* CS Team Sheet */}
        <ExcelSheet
          columns={CS_COLUMNS}
          data={filteredData}
          timers={filteredTimers}
          onCellChange={handleCellChange}
          onStatusClick={() => {}}
          isAdmin={true}
          agentUsername=""
          editableCols={CS_ALLOCATOR_EDITABLE}
          blinkRows={csSheet.blinkRows}
        />
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
  const [onBreak, setOnBreak] = useState(false);
  const [breakType, setBreakType] = useState(null);
  const [breakStart, setBreakStart] = useState(null);
  const [regionFilter, setRegionFilter] = useState("");
  const [priorityMode, setPriorityMode] = useState(false);
  const [priorityList, setPriorityList] = useState([]);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showStartReminder, setShowStartReminder] = useState(false);

  useEffect(() => {
    const sheets = loadAgentSheets();
    const filter = sheets.agentFilters?.[username]?.region || "";
    setRegionFilter(filter);
    
    const pList = sheets.priorityList || [];
    setPriorityList(pList);
    setPriorityMode(pList.length > 0);
    
    const interval = setInterval(() => {
      setRefreshKey(k => k + 1);
      const updated = loadCSSheet();
      setCSSheet(updated);
      
      const updatedSheets = loadAgentSheets();
      const updatedFilter = updatedSheets.agentFilters?.[username]?.region || "";
      setRegionFilter(updatedFilter);
      
      const updatedPList = updatedSheets.priorityList || [];
      if (JSON.stringify(updatedPList) !== JSON.stringify(priorityList)) {
        setPriorityList(updatedPList);
        setPriorityMode(updatedPList.length > 0);
        if (updatedPList.length > priorityList.length) {
          toast.error(`🚨 PRIORITY ALERT: ${updatedPList.length} urgent AWBs assigned!`, { duration: 10000 });
        }
      }
      
      // Check if agent is on break
      const agentBreak = updated.agentBreaks?.[username];
      if (agentBreak?.active && agentBreak?.start) {
        setOnBreak(true);
        setBreakType(agentBreak.type);
        setBreakStart(agentBreak.start);
      } else {
        if (onBreak) {
          setOnBreak(false);
          setBreakType(null);
          setBreakStart(null);
        }
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [username, onBreak, priorityList]);

  const handleBreakToggle = (type) => {
    const newSheet = deepCopy(csSheet);
    if (!newSheet.agentBreaks) newSheet.agentBreaks = {};
    
    if (onBreak && breakType === type) {
      // End break - completely remove from breaks object
      delete newSheet.agentBreaks[username];
      setOnBreak(false);
      setBreakType(null);
      setBreakStart(null);
      toast.success("Break ended");
    } else {
      // Start new break or switch to different break
      newSheet.agentBreaks[username] = { active: true, type, start: Date.now() };
      setOnBreak(true);
      setBreakType(type);
      setBreakStart(Date.now());
      const breakLabel = BREAK_TYPES.find(b => b.id === type)?.label || 'Break';
      toast.success(`${breakLabel} started`);
    }
    
    setCSSheet(newSheet);
    saveCSSheet(newSheet);
    CHANNEL.postMessage({ type: "app:sync" });
  };

  useEffect(() => {
    const handleSync = (ev) => {
      if (ev?.data?.type === "app:sync") {
        const updated = loadCSSheet();
        setCSSheet(updated);
        const sheets = loadAgentSheets();
        setAgentSheets(sheets);
        
        // Check for cleared rejections (blink notification)
        if (updated.blinkRows) {
          Object.keys(updated.blinkRows).forEach(r => {
            if (updated.blinkRows[r] && updated.raw[r]?.[COL_AGENTS]?.toLowerCase() === username.toLowerCase()) {
              const awb = updated.raw[r]?.[COL_AWB] || '';
              toast.info(`✅ Rejection cleared for AWB ${awb}`, { duration: 5000 });
            }
          });
        }
      }
    };
    CHANNEL.addEventListener('message', handleSync);
    return () => CHANNEL.removeEventListener('message', handleSync);
  }, [username]);

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
    const timer = newSheet.timers[r] || { elapsed: 0, start: null, doneClicks: 0, rejClicks: 0, state: "", hidden: false };

    if (action === 'start') {
      if (!timer.start) {
        timer.start = Date.now();
        newSheet.timers[r] = timer;
        setCSSheet(newSheet);
        saveCSSheet(newSheet);
        CHANNEL.postMessage({ type: "app:sync" });
        toast.success("Timer started");
      }
      return;
    }

    if (action === 'done') {
      // Check if timer was started
      if (!timer.start && timer.elapsed === 0) {
        setShowStartReminder(true);
        return;
      }

      // Confirmation message before marking as done
      const confirmed = confirm('Please check the numbers. Is release okay? No update needed?');
      if (!confirmed) return;

      const awb = newSheet.raw[r]?.[COL_AWB] || '';
      timer.doneClicks = (timer.doneClicks || 0) + 1;
      const doneCount = timer.doneClicks;
      timer.state = "DONE";
      timer.hidden = true; // Hide from agent view
      if (timer.start != null) {
        timer.elapsed = (timer.elapsed || 0) + (Date.now() - timer.start);
        timer.start = null;
      }

      // Track in agent's Excel data
      const sheets = loadAgentSheets();
      if (!sheets.agentStats) sheets.agentStats = {};
      if (!sheets.agentStats[username]) sheets.agentStats[username] = { done: [], rejected: [] };
      sheets.agentStats[username].done.push({
        awb: awb,
        line: newSheet.raw[r]?.[COL_LINE] || '',
        lot: newSheet.raw[r]?.[COL_LOT] || '',
        region: newSheet.raw[r]?.[COL_REGION] || '',
        timestamp: new Date().toISOString()
      });
      saveAgentSheets(sheets);

      // Update metrics immediately
      toast.success(`✅ AWB ${awb} marked as DONE (Total Done: ${doneCount})`, { duration: 4000 });

      // Check if all rows in current region filter are done
      const currentFilter = sheets.agentFilters?.[username]?.region;
      if (currentFilter) {
        let allDone = true;
        for (let i = 0; i < ROWS_COUNT; i++) {
          const rowAgent = String(newSheet.raw[i]?.[COL_AGENTS] || '').trim().toLowerCase();
          const rowRegion = String(newSheet.raw[i]?.[COL_REGION] || '').trim().toUpperCase();
          const rowState = newSheet.timers[i]?.state?.toUpperCase() || '';

          if (rowAgent === username.toLowerCase() && 
              (rowRegion === currentFilter.toUpperCase() || rowRegion.includes(currentFilter.toUpperCase())) &&
              rowState !== 'DONE') {
            allDone = false;
            break;
          }
        }

        if (allDone) {
          sheets.agentFilters[username].region = "";
          saveAgentSheets(sheets);
          CHANNEL.postMessage({ type: "app:sync" });
          toast.success(`All items in ${currentFilter} completed! Filter removed.`);
        }
      }
    } else if (action === 'reject') {
      // Validate rejection reason is filled
      const rejCount = timer.rejClicks || 0;
      const rej2 = String(newSheet.raw[r]?.[COL_REJ2] || '').trim();
      const rej3 = String(newSheet.raw[r]?.[COL_REJ3] || '').trim();
      const rej4 = String(newSheet.raw[r]?.[COL_REJ4] || '').trim();
      const rej5 = String(newSheet.raw[r]?.[COL_REJ5] || '').trim();

      // Only check if data doesn't exist from admin upload
      if (rejCount === 0 && !rej2) {
        toast.error("Please fill 2ND REJECTION reason first");
        return;
      }
      if (rejCount === 1 && !rej3) {
        toast.error("Please fill 3RD REJECTION reason first");
        return;
      }
      if (rejCount === 2 && !rej4) {
        toast.error("Please fill 4TH REJECTION reason first");
        return;
      }
      if (rejCount === 3 && !rej5) {
        toast.error("Please fill 5TH REJECTION reason first");
        return;
      }
      
      timer.rejClicks = (timer.rejClicks || 0) + 1;
      timer.state = "REJECTED";
      timer.hidden = true; // Hide from agent view after rejection

      // Set STATUS column to REJECT
      newSheet.raw[r][COL_STATUS] = "REJECT";

      // Add agent name to AGENT2 column if empty (for CS team tracking)
      if (!newSheet.raw[r][COL_AGENT2]?.trim()) {
        newSheet.raw[r][COL_AGENT2] = username;
      }

      // Track in agent's Excel data
      const sheets = loadAgentSheets();
      if (!sheets.agentStats) sheets.agentStats = {};
      if (!sheets.agentStats[username]) sheets.agentStats[username] = { done: [], rejected: [] };
      const awb = newSheet.raw[r]?.[COL_AWB] || '';
      sheets.agentStats[username].rejected.push({
        awb: awb,
        line: newSheet.raw[r]?.[COL_LINE] || '',
        lot: newSheet.raw[r]?.[COL_LOT] || '',
        region: newSheet.raw[r]?.[COL_REGION] || '',
        reason: newSheet.raw[r]?.[COL_REJ2] || newSheet.raw[r]?.[COL_REJ3] || newSheet.raw[r]?.[COL_REJ4] || newSheet.raw[r]?.[COL_REJ5] || '',
        timestamp: new Date().toISOString()
      });
      saveAgentSheets(sheets);
      
      // Update metrics immediately
      toast.error(`❌ AWB ${awb} rejected`);

      // Set blink for CS sheet when agent rejects
      if (!newSheet.blinkRows) newSheet.blinkRows = {};
      newSheet.blinkRows[r] = true;

      // Notify CS team about rejection
      CHANNEL.postMessage({ 
        type: "app:sync",
        rejectionNotification: {
          agent: username,
          awb: awb,
          timestamp: new Date().toISOString()
        }
      });

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
    let awbPending = 0, lineSumPending = 0, done = 0, rej = 0, totalDone = 0, totalRejected = 0, totalDoneLines = 0, totalRejectedLines = 0;
    
    for (let r = 0; r < ROWS_COUNT; r++) {
      const agent = String(csSheet.raw[r]?.[COL_AGENTS] || '').trim().toLowerCase();
      if (agent !== username.toLowerCase()) continue;
      
      const state = csSheet.timers[r]?.state?.toUpperCase() || '';
      const lineSum = parseLineSum(csSheet.raw[r]?.[COL_LINE]);
      
      // Count total done/rejected
      if (state === 'DONE') {
        totalDone++;
        totalDoneLines += lineSum;
      }
      if (state === 'REJECTED') {
        totalRejected++;
        totalRejectedLines += lineSum;
      }
      
      // Skip hidden rows for pending count
      if (csSheet.timers[r]?.hidden || state === 'DONE' || state === 'REJECTED') continue;
      
      // Apply priority filter for pending
      if (priorityMode && priorityList.length > 0) {
        const rowAwb = String(csSheet.raw[r]?.[COL_AWB] || '').trim();
        if (!priorityList.includes(rowAwb)) continue;
      }
      
      if (csSheet.raw[r]?.[COL_AWB]?.trim()) awbPending++;
      lineSumPending += lineSum;
    }
    
    return { 
      awb: awbPending, 
      lineSum: lineSumPending, 
      done: totalDone, 
      rej: totalRejected,
      totalDoneLines,
      totalRejectedLines
    };
  };

  const metrics = getAgentMetrics();
  
  const getBreakDuration = () => {
    if (!onBreak || !breakStart) return 0;
    return Math.floor((Date.now() - breakStart) / 1000 / 60);
  };

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
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Badge className="bg-yellow-400 text-black font-black border-black/10">AGENT</Badge>
                <span className="font-bold">Welcome, {username}</span>
                {onBreak && (
                  <Badge className="bg-orange-400 text-white font-black border-orange-500 animate-pulse">
                    ON BREAK • {getBreakDuration()}m
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {BREAK_TYPES.map(bt => {
                  const Icon = bt.icon;
                  const isActive = onBreak && breakType === bt.id;
                  return (
                    <Button
                      key={bt.id}
                      onClick={() => handleBreakToggle(bt.id)}
                      size="sm"
                      variant="outline"
                      className={`font-bold transition-all ${isActive ? bt.color + ' border-2' : 'bg-white hover:bg-gray-50'}`}
                    >
                      {isActive ? <Pause className="w-4 h-4 mr-1" /> : <Icon className="w-4 h-4 mr-1" />}
                      {bt.label}
                    </Button>
                  );
                })}
                <Button onClick={onLogout} variant="outline" className="font-bold bg-yellow-400/50 hover:bg-yellow-400/70 border-black/10">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analytics */}
        <Card className="bg-white/95 border-black/10 shadow-lg">
          <CardContent className="p-4">
            {priorityMode && priorityList.length > 0 && (
              <div className="mb-3 p-3 bg-red-100 border-2 border-red-500 rounded-lg animate-pulse">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-red-600" />
                  <span className="font-black text-red-900">🚨 PRIORITY MODE: {priorityList.length} urgent AWBs - Complete these first!</span>
                </div>
              </div>
            )}
            <div className="flex items-center gap-4 flex-wrap mb-2">
              <Badge className="bg-yellow-400 text-black font-black px-3 py-1">AGENT VIEW ({username})</Badge>
              {priorityMode && (
                <Badge className="bg-red-600 text-white font-black animate-pulse">
                  <Zap className="w-3 h-3 mr-1" />
                  PRIORITY MODE
                </Badge>
              )}
              {regionFilter && (
                <Badge className="bg-blue-100 text-blue-800 font-bold">Region: {regionFilter}</Badge>
              )}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-black/10">
                <span className="text-sm font-medium">Pending:</span>
                <span className="font-mono font-bold">{metrics.awb}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-black/10">
                <span className="text-sm font-medium">Pending Lines:</span>
                <span className="font-mono font-bold">{metrics.lineSum}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200">
                <span className="text-sm font-medium text-green-800">DONE:</span>
                <span className="font-mono font-bold text-green-800">{metrics.done}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200">
                <span className="text-sm font-medium text-green-800">Done Lines:</span>
                <span className="font-mono font-bold text-green-800">{metrics.totalDoneLines}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200">
                <span className="text-sm font-medium text-red-800">REJECTED:</span>
                <span className="font-mono font-bold text-red-800">{metrics.rej}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200">
                <span className="text-sm font-medium text-red-800">Rej Lines:</span>
                <span className="font-mono font-bold text-red-800">{metrics.totalRejectedLines}</span>
              </div>
              <Button 
                onClick={() => {
                  // Get all done AWBs for this agent
                  const doneAwbs = [];
                  for (let r = 0; r < ROWS_COUNT; r++) {
                    const agent = String(csSheet.raw[r]?.[COL_AGENTS] || '').trim().toLowerCase();
                    const state = csSheet.timers[r]?.state?.toUpperCase() || '';
                    if (agent === username.toLowerCase() && state === 'DONE') {
                      const awb = String(csSheet.raw[r]?.[COL_AWB] || '').trim();
                      if (awb && /^\d{10}$/.test(awb)) {
                        doneAwbs.push(awb);
                      }
                    }
                  }
                  const copyText = doneAwbs.join('\n');
                  navigator.clipboard.writeText(copyText);
                  toast.success(`Copied ${doneAwbs.length} DONE AWBs`);
                }}
                variant="outline" 
                size="sm" 
                className="font-bold bg-green-50 hover:bg-green-100"
              >
                Copy Done
              </Button>
              <Button 
                onClick={() => {
                  // Get all rejected AWBs for this agent
                  const rejAwbs = [];
                  for (let r = 0; r < ROWS_COUNT; r++) {
                    const agent = String(csSheet.raw[r]?.[COL_AGENTS] || '').trim().toLowerCase();
                    const state = csSheet.timers[r]?.state?.toUpperCase() || '';
                    if (agent === username.toLowerCase() && state === 'REJECTED') {
                      const awb = String(csSheet.raw[r]?.[COL_AWB] || '').trim();
                      if (awb && /^\d{10}$/.test(awb)) {
                        rejAwbs.push(awb);
                      }
                    }
                  }
                  const copyText = rejAwbs.join('\n');
                  navigator.clipboard.writeText(copyText);
                  toast.success(`Copied ${rejAwbs.length} REJECTED AWBs`);
                }}
                variant="outline" 
                size="sm" 
                className="font-bold bg-red-50 hover:bg-red-100"
              >
                Copy Reject
              </Button>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))}
                  variant="outline" 
                  size="sm" 
                  className="font-bold"
                >
                  Zoom -
                </Button>
                <span className="text-sm font-mono font-bold">{zoomLevel}%</span>
                <Button 
                  onClick={() => setZoomLevel(Math.min(150, zoomLevel + 10))}
                  variant="outline" 
                  size="sm" 
                  className="font-bold"
                >
                  Zoom +
                </Button>
              </div>
              <Button 
                onClick={() => {
                  const sheets = loadAgentSheets();
                  const stats = sheets.agentStats?.[username] || { done: [], rejected: [] };
                  const wb = XLSX.utils.book_new();

                  // Done sheet
                  const doneData = [['AWB', 'LINE', 'LOT', 'REGION', 'TIMESTAMP']];
                  stats.done.forEach(item => doneData.push([item.awb, item.line, item.lot, item.region, item.timestamp]));
                  const doneWs = XLSX.utils.aoa_to_sheet(doneData);
                  XLSX.utils.book_append_sheet(wb, doneWs, 'Done');

                  // Rejected sheet
                  const rejData = [['AWB', 'LINE', 'LOT', 'REGION', 'REASON', 'TIMESTAMP']];
                  stats.rejected.forEach(item => rejData.push([item.awb, item.line, item.lot, item.region, item.reason, item.timestamp]));
                  const rejWs = XLSX.utils.aoa_to_sheet(rejData);
                  XLSX.utils.book_append_sheet(wb, rejWs, 'Rejected');

                  XLSX.writeFile(wb, `${username}_tracking_${new Date().toISOString().split('T')[0]}.xlsx`);
                  toast.success('Downloaded tracking report');
                }}
                variant="outline" 
                size="sm" 
                className="font-bold ml-auto"
              >
                <Download className="w-4 h-4 mr-2" />
                My Report
              </Button>
            </div>
            <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-200">
              {priorityMode ? (
                <b>🚨 PRIORITY MODE ACTIVE: Only showing urgent AWBs. All other data hidden until these are completed.</b>
              ) : (
                "Only your assigned rows shown. Fill rejection reason before clicking REJECT. Region filter auto-clears when all items done."
              )}
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
          regionFilter={regionFilter}
          priorityList={priorityList}
          zoomLevel={zoomLevel}
        />

        {/* Start Reminder Dialog */}
        <Dialog open={showStartReminder} onOpenChange={setShowStartReminder}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-orange-600">
                <Clock className="w-6 h-6" />
                ⏱️ Start Timer First
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-center text-lg font-medium text-gray-700">
                Please click the <span className="font-bold text-blue-600">START</span> button first before marking as DONE
              </p>
            </div>
            <DialogFooter>
              <Button onClick={() => setShowStartReminder(false)} className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold">
                Got it!
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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

  if (session.role === "cs_allocator") {
    return <CSAllocatorDashboard username={session.username} onLogout={handleLogout} />;
  }

  return <AgentDashboard username={session.username} onLogout={handleLogout} />;
}