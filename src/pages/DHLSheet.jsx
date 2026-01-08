import React, { useState, useEffect, useCallback, useMemo, useRef, memo, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, LogOut, Users, Settings, FileSpreadsheet, Eye, X, ChevronDown, ChevronUp, RefreshCw, Filter, Plus, Trash2, Save, AlertCircle, CheckCircle2, Clock, Zap, Upload, Coffee, UtensilsCrossed, Droplet, Moon, Play, Pause, Square, CheckSquare, Shield, Lock, User, EyeOff, KeyRound, Sparkles, Loader2, LayoutDashboard } from 'lucide-react';
import { base44 as adn7 } from '@/api/base44Client';
const DailyReportDialog = lazy(() => import('../components/DailyReportDialog'));
const RealtimeAdminDashboard = lazy(() => import('../components/RealtimeAdminDashboard'));
import AdvancedFilterPanel from '../components/AdvancedFilterPanel';
import FilterBar from '../components/filters/FilterBar';
const AgentPerformanceDashboard = lazy(() => import('../components/AgentPerformanceDashboard'));
const AdvancedReportingModule = lazy(() => import('../components/AdvancedReportingModule'));
const FreeAnalytics = lazy(() => import('../components/analytics/FreeAnalytics'));
import ConfirmDialog from '../components/ConfirmDialog';
import AdvancedAdminControls from '../components/AdvancedAdminControls';
import CellEditorDialog from '../components/CellEditorDialog';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";


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
"5TH CONFIRMATION", "6th CONFIRMATION", "PRIORITY"];


const AGENT_COLUMNS = [
"STATUS", "LINE", "TIME", "LOT", "REMARKS", "AGENTS", "AWB'S", "REASON", "REGION",
"CONFIRMATION", "AGENT2", "2ND REJECTION", "2ND CONFIRMATION", "3RD REJECTION",
"3RD CONFIRMATION", "4TH REJECTION", "4TH CONFIRMATION", "5TH REJECTION",
"5TH CONFIRMATION", "6th CONFIRMATION", "PRIORITY"];


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
const COL_PRIORITY = 20;

const ROWS_COUNT = 10000;
const AGENT_DEFAULT_ROWS = 500;

const BREAK_TYPES = [
{ id: 'prayer', label: 'Prayer Break', icon: Moon, color: 'bg-purple-100 text-purple-800 border-purple-300' },
{ id: 'lunch', label: 'Lunch Break', icon: UtensilsCrossed, color: 'bg-orange-100 text-orange-800 border-orange-300' },
{ id: 'tea', label: 'Tea Break', icon: Coffee, color: 'bg-amber-100 text-amber-800 border-amber-300' },
{ id: 'washroom', label: 'Washroom Break', icon: Droplet, color: 'bg-blue-100 text-blue-800 border-blue-300' }];


const ADMIN_EDITABLE_IN_CS = new Set([
COL_STATUS, COL_LINE, COL_TIME, COL_LOT, COL_REMARKS, COL_AGENTS, COL_AWB,
COL_REASON, COL_REGION, COL_CONF1, COL_AGENT2, COL_CONF2, COL_CONF3,
COL_CONF4, COL_CONF5, COL_CONF6, COL_PRIORITY]
);

const AGENT_EDITABLE = new Set([
COL_LINE, COL_REJ2, COL_REJ3, COL_REJ4, COL_REJ5]
);

const CS_ALLOCATOR_EDITABLE = new Set([
COL_CONF2, COL_CONF3, COL_CONF4, COL_CONF5, COL_CONF6]
);

const CS_TEAM_EDITABLE = new Set([
COL_STATUS, COL_LINE, COL_TIME, COL_LOT, COL_REMARKS, COL_AGENTS, COL_AWB,
COL_REASON, COL_REGION, COL_CONF1, COL_AGENT2, COL_CONF2, COL_CONF3,
COL_CONF4, COL_CONF5, COL_CONF6, COL_PRIORITY]
);

// CRITICAL: Only session is stored in localStorage - users stored in DATABASE only
const DEFAULT_STATE = {
  admin: { username: "admin", password: "admin123", email: "" },
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
  const m = Math.floor(totalSec % 3600 / 60);
  const s = totalSec % 60;
  const pad = (x) => String(x).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

const isValidAwb = (v) => /^\d{10}$/.test(String(v || "").trim());

const parseLineSum = (lineVal) => {
  const str = String(lineVal || "").trim();
  if (!str) return 0;
  const nums = str.split(/[+\s]+/).map((s) => parseFloat(s)).filter((n) => !isNaN(n));
  return nums.reduce((a, b) => a + b, 0);
};

// CRITICAL: Only loads admin + session from localStorage - NEVER loads users
const loadState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_STATE));
      return deepCopy(DEFAULT_STATE);
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") throw new Error("Bad");
    if (!parsed.admin) parsed.admin = DEFAULT_STATE.admin;
    if (!parsed.session) parsed.session = { role: null, username: null };
    // NEVER load agents/csAllocators from localStorage
    return { admin: parsed.admin, session: parsed.session };
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_STATE));
    return deepCopy(DEFAULT_STATE);
  }
};

// CRITICAL: Only saves admin + session - NEVER saves users to localStorage
const saveState = (s) => {
  const toSave = { admin: s.admin, session: s.session };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
};

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
    // Ensure arrays have correct length for high volume
    while (data.raw.length < ROWS_COUNT) {
      data.raw.push(Array(CS_COLUMNS.length).fill(''));
      data.timers.push({ elapsed: 0, start: null, doneClicks: 0, rejClicks: 0, state: "" });
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

// Maximum batching - 15s minimum interval
let saveTimeout = null;
let pendingBackendSync = null;
let lastSyncTime = 0;
const MIN_SYNC_INTERVAL = 15000; // Minimum 15s between backend syncs

const saveCSSheet = (data) => {
  const optimizedData = {
    ...data,
    raw: data.raw,
    timers: data.timers
  };
  localStorage.setItem(CS_SHEET_KEY, JSON.stringify(optimizedData));
  CHANNEL.postMessage({ type: 'app:sync' });

  if (pendingBackendSync) clearTimeout(pendingBackendSync);
  
  const timeSinceLastSync = Date.now() - lastSyncTime;
  const delay = Math.max(MIN_SYNC_INTERVAL - timeSinceLastSync, 2000);
  
  pendingBackendSync = setTimeout(() => {
    lastSyncTime = Date.now();
    pushAppState('cs_sheet', optimizedData);
  }, delay);
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
  // Cross-device sync
  pushAppState('agent_sheets', data);
};

// --- Global rate limiter with queue ---
let lastRemoteUpdates = { cs: 0, agents: 0, users: 0 };
const requestCache = new Map();
const requestQueue = [];
let isProcessingQueue = false;
const MIN_REQUEST_INTERVAL = 2000; // Min 2s between ANY requests
let lastRequestTime = 0;

const rateLimitedRequest = async (fn) => {
  return new Promise((resolve, reject) => {
    requestQueue.push({ fn, resolve, reject });
    processQueue();
  });
};

const processQueue = async () => {
  if (isProcessingQueue || requestQueue.length === 0) return;
  isProcessingQueue = true;
  
  while (requestQueue.length > 0) {
    const timeSinceLast = Date.now() - lastRequestTime;
    if (timeSinceLast < MIN_REQUEST_INTERVAL) {
      await new Promise(r => setTimeout(r, MIN_REQUEST_INTERVAL - timeSinceLast));
    }
    
    const { fn, resolve, reject } = requestQueue.shift();
    try {
      lastRequestTime = Date.now();
      const result = await fn();
      resolve(result);
    } catch (e) {
      reject(e);
    }
  }
  
  isProcessingQueue = false;
};

const getCacheKey = (fn, ...args) => `${fn.name}_${JSON.stringify(args)}`;

const cachedRequest = async (fn, ttl, ...args) => {
  const key = getCacheKey(fn, ...args);
  const cached = requestCache.get(key);
  if (cached && Date.now() - cached.time < ttl) {
    return cached.data;
  }
  const result = await rateLimitedRequest(() => fn(...args));
  requestCache.set(key, { data: result, time: Date.now() });
  setTimeout(() => requestCache.delete(key), ttl + 5000);
  return result;
};

const pushAppState = async (stateKey, payload) => {
  try {
    const rows = await cachedRequest(
      async (key) => await adn7.entities.AppState.filter({ state_key: key }),
      10000,
      stateKey
    );
    await rateLimitedRequest(async () => {
      if (rows && rows[0]) {
        await adn7.entities.AppState.update(rows[0].id, { data: payload });
      } else {
        await adn7.entities.AppState.create({ state_key: stateKey, data: payload });
      }
    });
    requestCache.delete(getCacheKey(adn7.entities.AppState.filter, { state_key: stateKey }));
  } catch (e) {
    // ignore
  }
};

// Maximum batching - 10s minimum interval
let lastPushTime = 0;
let pendingPush = null;
const pushCSImmediate = async (data) => { 
  localStorage.setItem(CS_SHEET_KEY, JSON.stringify(data));
  CHANNEL.postMessage({ type: 'app:sync' });
  
  if (pendingPush) clearTimeout(pendingPush);
  
  const timeSinceLast = Date.now() - lastPushTime;
  const delay = Math.max(10000 - timeSinceLast, 2000);
  
  pendingPush = setTimeout(() => {
    lastPushTime = Date.now();
    pushAppState('cs_sheet', data).catch(() => {});
  }, delay);
};
const pullAppState = async (stateKey) => {
  try {
    const rows = await cachedRequest(
      async (key) => await adn7.entities.AppState.filter({ state_key: key }),
      10000,
      stateKey
    );
    return (rows && rows[0]) || null;
  } catch {
    return null;
  }
};

// --- Global session sync helpers (shared across domains) ---
const pushSessionToBackend = async (session) => {
  await pushAppState('global_session', { session });
};
const pullSessionFromBackend = async () => {
  const rec = await pullAppState('global_session');
  return rec?.data?.session || null;
};

// Active sessions (cross-device) helpers
const INSTANCE_ID_KEY = 'DHL_INSTANCE_ID';
const getInstanceId = () => {
  let id = localStorage.getItem(INSTANCE_ID_KEY);
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(INSTANCE_ID_KEY, id);
  }
  return id;
};

const updateActiveSessions = async (mutateFn) => {
  try {
    const rows = await adn7.entities.AppState.filter({ state_key: 'active_sessions' });
    const row = rows && rows[0];
    const data = (row?.data) || {};
    const next = mutateFn({ ...data });
    if (row) await adn7.entities.AppState.update(row.id, { data: next });
    else await adn7.entities.AppState.create({ state_key: 'active_sessions', data: next });
  } catch {}
};

const markSessionLogin = async (role, username) => {
  const id = getInstanceId();
  await updateActiveSessions((data) => ({ ...data, [id]: { id, role, username, last_activity: Date.now() } }));
};

const markSessionHeartbeat = async () => {
  const id = getInstanceId();
  await updateActiveSessions((data) => {
    if (!data[id]) return data;
    return { ...data, [id]: { ...data[id], last_activity: Date.now() } };
  });
};

const markSessionLogout = async () => {
  const id = getInstanceId();
  await updateActiveSessions((data) => { const next = { ...data }; delete next[id]; return next; });
};

const checkKickAndLogout = async (onLogout) => {
  try {
    const id = getInstanceId();
    const rows = await adn7.entities.AppState.filter({ state_key: 'active_sessions' });
    const data = rows?.[0]?.data || {};
    const me = data[id];
    if (me?.kick) {
      await markSessionLogout();
      toast.error('You have been logged out by admin');
      onLogout();
    }
  } catch {}
};

// Notify other devices to refresh user lists (agents/CS)
const notifyUsersSync = async () => {
  await pushAppState('users_sync', { ts: Date.now() });
};

const downloadCSV = (data, filename) => {
  const csvContent = data.map((row) =>
  row.map((cell) => {
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

// Validation helpers
const normalizeAwb = (v) => {
  const digits = String(v || '').replace(/\D/g, '');
  return digits.length === 10 ? digits : null;
};

const isValidLineExpr = (v) => {
  const s = String(v || '').trim();
  if (!s) return true; // allow empty
  return /^\d+(\s*\+\s*\d+)*$/.test(s);
};

const isValidTimeStr = (s) => {
  if (s == null) return false;
  const str = String(s).trim();
  if (!str) return false;
  // 12h or 24h formats like 9:05, 09:05:10, 14:30, 2:15 PM
  const re = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)?$/i;
  const m = re.exec(str);
  if (!m) return false;
  const h = parseInt(m[1], 10);const mins = parseInt(m[2], 10);
  if (mins > 59) return false;
  if (m[4]) {return h >= 1 && h <= 12;}
  return h >= 0 && h <= 23;
};

const formatTimeEntry = (val) => {
  if (val == null) return null;
  if (typeof val === 'number' || !isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 1) {
    return excelSerialToTime(val);
  }
  const s = String(val).trim();
  if (!isValidTimeStr(s)) return null;
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)?$/i.exec(s);
  let h = parseInt(m[1], 10);const mins = parseInt(m[2], 10);
  let period = (m[4] || '').toUpperCase();
  if (!period) {
    // assume 24h -> convert
    period = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
  }
  return `${h}:${String(mins).padStart(2, '0')} ${period}`;
};

const parseUploadedFile = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const XLSX = await import('xlsx');
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
  let n = c + 1,s = '';
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
      let sum = 0,count = 0;
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
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState("email");
  const [forgotEmail, setForgotEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sendingOTP, setSendingOTP] = useState(false);
  const [verifyingOTP, setVerifyingOTP] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState(5);
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [showAgentPass, setShowAgentPass] = useState(false);
  const [showCSPass, setShowCSPass] = useState(false);

  useEffect(() => {
    try {
      const msg = localStorage.getItem('MAINTENANCE_LOGOUT_MSG');
      if (msg) {
        setError(msg);
        localStorage.removeItem('MAINTENANCE_LOGOUT_MSG');
      }
    } catch {}
  }, []);

  const [maintenanceInfo, setMaintenanceInfo] = useState({ on: false, message: '' });
  useEffect(() => {
    let stopped = false;
    const fetchCfg = async () => {
      try {
        const cfgs = await adn7.entities.AdminConfig.filter({ config_key: 'main' });
        const cfg = (cfgs || [])[0];
        if (!stopped && cfg) {
          setMaintenanceInfo({ on: !!cfg.maintenance_mode, message: String(cfg.banner_message || '').trim() });
        }
      } catch {}
    };
    fetchCfg();
    const id = setInterval(fetchCfg, 60000);
    return () => { stopped = true; clearInterval(id); };
  }, []);

  const handleAdminLogin = async () => {
    const state = loadState();
    if (!adminUser.trim() || !adminPass) {
      setError("Please enter admin username and password.");
      return;
    }
    // Check database admin credentials FIRST
    try {
      const cfgs = await adn7.entities.AdminConfig.filter({ config_key: 'main' });
      const cfg = (cfgs || [])[0];
      if (cfg && cfg.allow_admin_login === false) {
        setError("Admin logins are disabled.");
        return;
      }
      if (cfg && cfg.admin_username && cfg.admin_password) {
        if (adminUser === cfg.admin_username && adminPass === cfg.admin_password) {
          state.session = { role: "admin", username: adminUser };
          saveState(state);
          onLogin("admin", adminUser);
          return;
        }
      }
    } catch {}

    // Fallback to localStorage admin only if database not configured
    if (adminUser === state.admin.username && adminPass === state.admin.password) {
      state.session = { role: "admin", username: adminUser };
      saveState(state);
      onLogin("admin", adminUser);
    } else {
      setError("Invalid admin credentials.");
    }
  };

  const handleAgentLogin = async () => {
    const state = loadState();
    if (!agentUser.trim() || !agentPass) {
      setError("Please enter agent username and password.");
      return;
    }
    // Check global access controls
    try {
      const cfgs = await adn7.entities.AdminConfig.filter({ config_key: 'main' });
      const cfg = (cfgs || [])[0];
      if (cfg?.maintenance_mode) {
        setError(cfg?.banner_message?.trim() || "We are doing some updates in the app, We will get back soon...");
        return;
      }
      if (cfg && cfg.allow_agent_login === false) {
        setError("Agent logins are disabled by admin.");
        return;
      }
    } catch {}

    // ONLY authenticate against database - NO localStorage fallback
    try {
      const res = await adn7.entities.AgentUser.filter({ username: agentUser, password: agentPass });
      const found = (res || [])[0];
      if (found) {
        if (found.is_active === false) {
          setError("This agent is inactive.");
          return;
        }
        state.session = { role: "agent", username: agentUser };
        saveState(state);
        onLogin("agent", agentUser);
        return;
      }
    } catch (e) {
      setError("Database error. Please try again.");
      return;
    }

    setError("Invalid agent credentials.");
  };

  const handleCSLogin = async () => {
    const state = loadState();
    if (!csUser.trim() || !csPass) {
      setError("Please enter CS Allocator username and password.");
      return;
    }
    // Check global access controls
    try {
      const cfgs = await adn7.entities.AdminConfig.filter({ config_key: 'main' });
      const cfg = (cfgs || [])[0];
      if (cfg?.maintenance_mode) {
        setError(cfg?.banner_message?.trim() || "We are doing some updates in the app, We will get back soon...");
        return;
      }
      if (cfg && cfg.allow_cs_login === false) {
        setError("CS Team logins are disabled by admin.");
        return;
      }
    } catch {}

    // ONLY authenticate against database - NO localStorage fallback
    try {
      const res = await adn7.entities.CSUser.filter({ username: csUser, password: csPass });
      const found = (res || [])[0];
      if (found) {
        if (found.is_active === false) {
          setError("This CS user is inactive.");
          return;
        }
        state.session = { role: "cs_allocator", username: csUser };
        saveState(state);
        onLogin("cs_allocator", csUser);
        return;
      }
    } catch (e) {
      setError("Database error. Please try again.");
      return;
    }

    setError("Invalid CS Allocator credentials.");
  };

  const handleForgotPassword = () => {
    setShowForgotPassword(true);
    setForgotStep("email");
    setForgotEmail("");
    setOtpCode("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setRemainingAttempts(5);
  };

  const handleSendOTP = async () => {
    if (!forgotEmail.trim()) {
      setError("Please enter your email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    setSendingOTP(true);
    setError("");

    try {
      const state = loadState();
      const savedEmail = state.admin.email || "";

      if (!savedEmail) {
        setError("No recovery email configured. Please contact admin to set up email in Admin Panel Settings.");
        setSendingOTP(false);
        return;
      }

      if (forgotEmail.toLowerCase() !== savedEmail.toLowerCase()) {
        setError("Email does not match registered email");
        setSendingOTP(false);
        return;
      }

      const response = await adn7.functions.invoke('adminSettingsApi', { action: 'sendOtp', payload: { email: forgotEmail } });

      if (response.data.error) {
        setError(response.data.error);
        return;
      }

      toast.success("OTP sent to your email!");
      setForgotStep("otp");
      setError("");
    } catch (error) {
      setError(error.message || "Failed to send OTP. Please try again.");
    } finally {
      setSendingOTP(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setError("Please fill all fields");
      return;
    }

    if (otpCode.length !== 6 || !/^\d+$/.test(otpCode)) {
      setError("OTP must be 6 digits");
      return;
    }

    if (newPassword.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setVerifyingOTP(true);
    setError("");

    try {
      const response = await adn7.functions.invoke('adminSettingsApi', { action: 'verifyOtp', payload: { email: forgotEmail, otp: otpCode, newPassword } });

      const data = response.data;

      if (data.error) {
        if (data.attemptsLeft !== undefined) {
          setRemainingAttempts(data.attemptsLeft);
          setError(`${data.error}. ${data.attemptsLeft} attempts remaining.`);
        } else {
          setError(data.error);
        }
        return;
      }

      const state = loadState();
      state.admin.password = newPassword;
      saveState(state);

      toast.success("Password reset successfully!");
      setShowForgotPassword(false);
      setForgotStep("email");
      setForgotEmail("");
      setOtpCode("");
      setNewPassword("");
      setConfirmPassword("");
      setError("");
    } catch (error) {
      setError(error.message || "Failed to verify OTP. Please try again.");
    } finally {
      setVerifyingOTP(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-gradient-to-br from-yellow-600 via-red-900 to-black">
      {/* Advanced Animated Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute w-[600px] h-[600px] bg-gradient-to-r from-yellow-400/40 to-amber-500/40 rounded-full blur-3xl"
          animate={{
            x: [0, 250, 0],
            y: [0, -180, 0],
            scale: [1, 1.4, 1]
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{ top: '0%', left: '5%' }} />

        <motion.div
          className="absolute w-[700px] h-[700px] bg-gradient-to-r from-red-600/35 to-orange-600/35 rounded-full blur-3xl"
          animate={{
            x: [0, -220, 0],
            y: [0, 180, 0],
            scale: [1.3, 1, 1.3]
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1.5
          }}
          style={{ bottom: '0%', right: '5%' }} />

        <motion.div
          className="absolute w-[500px] h-[500px] bg-gradient-to-r from-yellow-500/25 to-red-500/25 rounded-full blur-3xl"
          animate={{
            x: [0, -120, 120, 0],
            y: [0, 120, -120, 0],
            rotate: [0, 180, 360],
            scale: [1, 1.2, 1]
          }}
          transition={{
            duration: 28,
            repeat: Infinity,
            ease: "linear"
          }}
          style={{ top: '35%', left: '40%' }} />

        <motion.div
          className="absolute w-[450px] h-[450px] bg-gradient-to-r from-amber-600/30 to-yellow-700/30 rounded-full blur-3xl"
          animate={{
            x: [0, 150, -150, 0],
            y: [0, -100, 100, 0],
            scale: [1.1, 1.3, 1.1]
          }}
          transition={{
            duration: 24,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5
          }}
          style={{ top: '60%', right: '30%' }} />

      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#fbbf2405_1px,transparent_1px),linear-gradient(to_bottom,#fbbf2405_1px,transparent_1px)] bg-[size:4rem_4rem]" />

      {/* Floating Particles */}
      {[...Array(30)].map((_, i) =>
      <motion.div
        key={i}
        className="absolute w-1 h-1 rounded-full"
        style={{
          background: i % 3 === 0 ? '#fbbf24' : i % 3 === 1 ? '#f59e0b' : '#dc2626',
          opacity: 0.3
        }}
        initial={{
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight
        }}
        animate={{
          y: [null, Math.random() * window.innerHeight],
          opacity: [0, 0.6, 0]
        }}
        transition={{
          duration: Math.random() * 10 + 10,
          repeat: Infinity,
          delay: Math.random() * 5
        }} />

      )}

      <div className="w-full max-w-md relative z-10">
        {maintenanceInfo.on && (
          <div className="mb-4 p-3 rounded-xl border-2 border-yellow-300 bg-yellow-50 text-yellow-900 text-sm font-semibold shadow">
            {maintenanceInfo.message || 'We are doing some updates in the app, We will get back soon...'}
          </div>
        )}
        {/* Brand Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-center mb-8">

          <motion.div
            className="inline-block"
            whileHover={{ scale: 1.05, rotate: [0, -2, 2, -2, 0] }}
            transition={{ duration: 0.5 }}>

            <h1 className="text-6xl font-black bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-600 bg-clip-text text-transparent drop-shadow-2xl">TEAM TRACK

            </h1>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }} className="text-gray-300 mt-3 text-sm font-medium tracking-wider">Authentication Portal



          </motion.p>
        </motion.div>

        {/* Login Panel */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}>

          <Card className="backdrop-blur-3xl bg-gradient-to-br from-black/40 via-red-900/30 to-black/40 border border-yellow-500/30 shadow-2xl overflow-hidden relative"
          style={{
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
            boxShadow: '0 0 80px rgba(251, 191, 36, 0.3), inset 0 0 60px rgba(0, 0, 0, 0.2)'
          }}>


          
          <div className="relative z-10">
          <div className="flex gap-2 p-5 bg-yellow-400 border-b border-black/10">
            <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                    onClick={() => {setActiveTab("admin");setError("");}}
                    className={`w-full font-black text-sm transition-all duration-300 ${
                    activeTab === "admin" ?
                    "bg-red-600 text-white border-0" :
                    "bg-yellow-400/60 text-black border border-black/10 hover:bg-yellow-400"}`
                    }>

                <Shield className="w-4 h-4 mr-2" />
                Admin
              </Button>
            </motion.div>
            <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                    onClick={() => {setActiveTab("agent");setError("");}}
                    className={`w-full font-black text-sm transition-all duration-300 ${
                    activeTab === "agent" ?
                    "bg-red-600 text-white border-0" :
                    "bg-yellow-400/60 text-black border border-black/10 hover:bg-yellow-400"}`
                    }>

                <Users className="w-4 h-4 mr-2" />
                Agent
              </Button>
            </motion.div>
            <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                    onClick={() => {setActiveTab("cs_allocator");setError("");}}
                    className={`w-full font-black text-sm transition-all duration-300 ${
                    activeTab === "cs_allocator" ?
                    "bg-red-600 text-white border-0" :
                    "bg-yellow-400/60 text-black border border-black/10 hover:bg-yellow-400"}`
                    }>

                <Users className="w-4 h-4 mr-2" />
                CS Team
              </Button>
            </motion.div>
          </div>

          <CardContent className="p-8">
            <AnimatePresence mode="wait">
              {activeTab === "admin" ?
                  <motion.div
                    key="admin"
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 30 }}
                    transition={{ duration: 0.4 }}
                    className="space-y-6">

                  <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}>

                    <h2 className="text-3xl font-black mb-2 text-yellow-400">
                      Admin Portal
                    </h2>
                    <p className="text-sm text-gray-300">Full administrative access and control</p>
                  </motion.div>
                  
                  <div className="space-y-4">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}>

                      <Label className="text-sm text-yellow-400 font-semibold mb-2 block">Username</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-yellow-400 transition-colors" />
                        <Input
                            value={adminUser}
                            onChange={(e) => setAdminUser(e.target.value)}
                            placeholder="Enter admin username"
                            className="pl-11 h-12 bg-yellow-400/20 border-yellow-400/40 text-white placeholder:text-gray-400 focus:border-yellow-400 focus:bg-yellow-400/30 transition-all"
                            onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()} />
                      </div>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}>

                      <Label className="text-sm text-yellow-400 font-semibold mb-2 block">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-yellow-400 transition-colors" />
                        <Input
                            type={showAdminPass ? "text" : "password"}
                            value={adminPass}
                            onChange={(e) => setAdminPass(e.target.value)}
                            placeholder="Enter admin password"
                            className="pl-11 pr-11 h-12 bg-yellow-400/20 border-yellow-400/40 text-white placeholder:text-gray-400 focus:border-yellow-400 focus:bg-yellow-400/30 transition-all"
                            onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()} />
                          <button
                            type="button"
                            onClick={() => setShowAdminPass(!showAdminPass)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-yellow-400 hover:text-yellow-300 transition-colors">
                            {showAdminPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                      </div>
                    </motion.div>
                  </div>

                  <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="flex justify-end">

                    <motion.button
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-sm text-yellow-400 hover:text-yellow-300 font-medium transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}>

                      Forgot Password?
                    </motion.button>
                  </motion.div>

                  <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}>

                    <Button
                        onClick={handleAdminLogin}
                        className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-black">
                      <span className="flex items-center justify-center gap-2">
                        <Lock className="w-5 h-5" />
                        Sign In as Admin
                      </span>
                    </Button>
                  </motion.div>

                  {error &&
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm font-medium flex items-center gap-2">

                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {error}
                    </motion.div>
                    }
                </motion.div> :
                  activeTab === "agent" ?
                  <motion.div
                    key="agent"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.4 }}
                    className="space-y-6">

                  <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}>

                    <h2 className="text-3xl font-black mb-2 text-yellow-400">
                      Agent Portal
                    </h2>
                    <p className="text-sm text-gray-300">Access your assigned tasks and workflows</p>
                  </motion.div>
                  
                  <div className="space-y-4">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}>

                      <Label className="text-sm text-yellow-400 font-semibold mb-2 block">Username</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-yellow-400 transition-colors" />
                        <Input
                            value={agentUser}
                            onChange={(e) => setAgentUser(e.target.value)}
                            placeholder="Enter agent username"
                            className="pl-11 h-12 bg-yellow-400/20 border-yellow-400/40 text-white placeholder:text-gray-400 focus:border-yellow-400 focus:bg-yellow-400/30 transition-all"
                            onKeyDown={(e) => e.key === 'Enter' && handleAgentLogin()} />
                      </div>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}>

                      <Label className="text-sm text-yellow-400 font-semibold mb-2 block">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-yellow-400 transition-colors" />
                        <Input
                            type={showAgentPass ? "text" : "password"}
                            value={agentPass}
                            onChange={(e) => setAgentPass(e.target.value)}
                            placeholder="Enter agent password"
                            className="pl-11 pr-11 h-12 bg-yellow-400/20 border-yellow-400/40 text-white placeholder:text-gray-400 focus:border-yellow-400 focus:bg-yellow-400/30 transition-all"
                            onKeyDown={(e) => e.key === 'Enter' && handleAgentLogin()} />
                          <button
                            type="button"
                            onClick={() => setShowAgentPass(!showAgentPass)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-yellow-400 hover:text-yellow-300 transition-colors">
                            {showAgentPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                      </div>
                    </motion.div>
                  </div>

                  <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}>

                    <Button
                        onClick={handleAgentLogin}
                        className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-black">
                      <span className="flex items-center justify-center gap-2">
                        <Users className="w-5 h-5" />
                        Sign In as Agent
                      </span>
                    </Button>
                  </motion.div>

                  {error &&
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm font-medium flex items-center gap-2">

                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {error}
                    </motion.div>
                    }
                </motion.div> :
                  activeTab === "cs_allocator" ?
                  <motion.div
                    key="cs_allocator"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -30 }}
                    transition={{ duration: 0.4 }}
                    className="space-y-6">

                  <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}>

                    <h2 className="text-3xl font-black mb-2 text-yellow-400">
                      CS Team Portal
                    </h2>
                    <p className="text-sm text-gray-300">Manage and review agent submissions</p>
                  </motion.div>
                  
                  <div className="space-y-4">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}>

                      <Label className="text-sm text-yellow-400 font-semibold mb-2 block">Username</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-yellow-400 transition-colors" />
                        <Input
                            value={csUser}
                            onChange={(e) => setCSUser(e.target.value)}
                            placeholder="Enter CS username"
                            className="pl-11 h-12 bg-yellow-400/20 border-yellow-400/40 text-white placeholder:text-gray-400 focus:border-yellow-400 focus:bg-yellow-400/30 transition-all"
                            onKeyDown={(e) => e.key === 'Enter' && handleCSLogin()} />
                      </div>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}>

                      <Label className="text-sm text-yellow-400 font-semibold mb-2 block">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-yellow-400 transition-colors" />
                        <Input
                            type={showCSPass ? "text" : "password"}
                            value={csPass}
                            onChange={(e) => setCSPass(e.target.value)}
                            placeholder="Enter CS password"
                            className="pl-11 pr-11 h-12 bg-yellow-400/20 border-yellow-400/40 text-white placeholder:text-gray-400 focus:border-yellow-400 focus:bg-yellow-400/30 transition-all"
                            onKeyDown={(e) => e.key === 'Enter' && handleCSLogin()} />
                          <button
                            type="button"
                            onClick={() => setShowCSPass(!showCSPass)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-yellow-400 hover:text-yellow-300 transition-colors">
                            {showCSPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                      </div>
                    </motion.div>
                  </div>

                  <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}>

                    <Button
                        onClick={handleCSLogin}
                        className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-black">
                      <span className="flex items-center justify-center gap-2">
                        <Users className="w-5 h-5" />
                        Sign In as CS Team
                      </span>
                    </Button>
                  </motion.div>

                  {error &&
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm font-medium flex items-center gap-2">

                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {error}
                    </motion.div>
                    }
                </motion.div> :
                  null}
            </AnimatePresence>
          </CardContent>
          </div>
        </Card>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center mt-8">

          <p className="text-gray-400 text-sm">© 2026 TEAM TRACK. Build by Adnancyber7.</p>
        </motion.div>

        {/* Forgot Password Dialog - Ultra Modern Design */}
        <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
          <DialogContent className="max-w-md backdrop-blur-3xl bg-gradient-to-br from-black/50 via-red-900/40 to-black/50 border border-yellow-500/30 shadow-2xl"
          style={{
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
            boxShadow: '0 0 60px rgba(251, 191, 36, 0.3)'
          }}>

            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                <motion.div
                  className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500 to-red-600 flex items-center justify-center shadow-lg shadow-yellow-500/50"
                  whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.05 }}
                  transition={{ duration: 0.5 }}>

                  <KeyRound className="w-7 h-7 text-black" />
                </motion.div>
                <span className="bg-gradient-to-r from-yellow-400 to-red-500 bg-clip-text text-transparent">
                  Password Recovery
                </span>
              </DialogTitle>
            </DialogHeader>

            <AnimatePresence mode="wait">
              {forgotStep === "email" ?
              <motion.div
                key="email"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.4 }}
                className="space-y-5 py-4">

                  <div className="p-4 bg-yellow-400/20 border border-yellow-400/40 rounded-2xl">
                    <p className="text-sm text-white font-medium flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-yellow-400" />
                      Enter your registered admin email to receive OTP
                    </p>
                  </div>

                  <motion.div
                  className="relative"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}>

                    <Label className="text-sm font-semibold text-yellow-400 mb-2 block">Email Address</Label>
                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-yellow-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="admin@company.com"
                      className="w-full px-4 py-3 pl-12 rounded-xl border border-yellow-400/40 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 transition-all duration-200 bg-yellow-400/20 text-white placeholder:text-gray-400"
                      onKeyDown={(e) => e.key === 'Enter' && !sendingOTP && handleSendOTP()} />
                    </div>
                  </motion.div>

                  {error &&
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm font-medium flex items-center gap-2">

                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {error}
                    </motion.div>
                }

                  <motion.div
                  className="flex gap-3 pt-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}>

                    <Button
                    onClick={() => {
                      setShowForgotPassword(false);
                      setError("");
                    }}
                    variant="outline"
                    className="flex-1 font-bold bg-white/10 text-white border-white/20 hover:bg-white/20">

                      Cancel
                    </Button>
                    <Button
                    onClick={handleSendOTP}
                    disabled={sendingOTP}
                    className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black font-black">
                      <span className="flex items-center justify-center">
                        {sendingOTP ?
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> :

                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                      }
                        {sendingOTP ? 'Sending...' : 'Send OTP'}
                      </span>
                    </Button>
                  </motion.div>
                </motion.div> :

              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.4 }}
                className="space-y-5 py-4">

                  <div className="p-4 bg-green-600/20 border border-green-500/40 rounded-2xl">
                    <p className="text-sm text-white font-medium flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      OTP sent to {forgotEmail}
                    </p>
                  </div>

                  <motion.div
                  className="relative"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}>

                    <Label className="text-sm font-semibold text-yellow-400 mb-2 block">Verification Code</Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-yellow-400 transition-colors" />
                      <input
                      type="text"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      className="w-full px-4 py-3 pl-12 rounded-xl border border-yellow-400/40 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 transition-all duration-200 bg-yellow-400/20 text-white placeholder:text-gray-400 font-mono text-lg tracking-[0.5em] text-center" />
                    </div>
                    {remainingAttempts < 5 &&
                  <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {remainingAttempts} attempts remaining
                      </p>
                  }
                  </motion.div>

                  <motion.div
                  className="relative"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}>

                    <Label className="text-sm font-semibold text-yellow-400 mb-2 block">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-yellow-400 transition-colors" />
                      <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full px-4 py-3 pl-12 rounded-xl border border-yellow-400/40 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 transition-all duration-200 bg-yellow-400/20 text-white placeholder:text-gray-400" />
                    </div>
                  </motion.div>

                  <motion.div
                  className="relative"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}>

                    <Label className="text-sm font-semibold text-yellow-400 mb-2 block">Confirm Password</Label>
                    <div className="relative">
                      <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-yellow-400 transition-colors" />
                      <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full px-4 py-3 pl-12 rounded-xl border border-yellow-400/40 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 transition-all duration-200 bg-yellow-400/20 text-white placeholder:text-gray-400"
                      onKeyDown={(e) => e.key === 'Enter' && !verifyingOTP && handleVerifyOTP()} />
                    </div>
                  </motion.div>

                  {error &&
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm font-medium flex items-center gap-2">

                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {error}
                    </motion.div>
                }

                  <motion.div
                  className="flex gap-3 pt-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}>

                    <Button
                    onClick={() => {
                      setForgotStep("email");
                      setOtpCode("");
                      setNewPassword("");
                      setConfirmPassword("");
                      setError("");
                    }}
                    variant="outline"
                    className="flex-1 font-bold bg-white/10 text-white border-white/20 hover:bg-white/20">

                      Back
                    </Button>
                    <Button
                    onClick={handleVerifyOTP}
                    disabled={verifyingOTP}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black">
                      <span className="flex items-center justify-center">
                        {verifyingOTP ?
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> :

                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      }
                        {verifyingOTP ? 'Verifying...' : 'Reset Password'}
                      </span>
                    </Button>
                  </motion.div>
                </motion.div>
              }
            </AnimatePresence>
          </DialogContent>
        </Dialog>
      </div>
    </div>);

};

// ============================================================================
// EXCEL-LIKE SHEET COMPONENT (Virtualized for Performance)
// ============================================================================

const ExcelSheet = memo(({
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
  zoomLevel = 100,
  filterAgentUsername = ""
}) => {
  const [activeCell, setActiveCell] = useState({ r: 0, c: 0 });
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [selection, setSelection] = useState({ r1: 0, c1: 0, r2: 0, c2: 0 });
  const [showCellEditor, setShowCellEditor] = useState(false);
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
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Compact view for agents - removes gaps from done/rejected rows - MEMOIZED
  const getCompactedView = useMemo(() => {
    if (isAdmin && !filterAgentUsername) {
      return { data, timers, rowMapping: data.map((_, i) => i) };
    }

    // Admin viewing a specific agent's profile: show only that agent's rows (including DONE/REJECTED)
    if (isAdmin && filterAgentUsername) {
      const filteredData = [];
      const filteredTimers = [];
      const map = [];
      for (let r = 0; r < data.length; r++) {
        const agentCell = String(data[r]?.[COL_AGENTS] || '').trim().toLowerCase();
        if (agentCell !== filterAgentUsername.toLowerCase()) continue;
        if (regionFilter) {
          const regionCell = String(data[r]?.[COL_REGION] || '').trim().toUpperCase();
          const filterUpper = regionFilter.toUpperCase();
          if (!(regionCell === filterUpper || regionCell.includes(filterUpper))) continue;
        }
        filteredData.push(data[r]);
        filteredTimers.push(timers[r]);
        map.push(r);
      }
      return { data: filteredData, timers: filteredTimers, rowMapping: map };
    }

    const compactedData = [];
    const compactedTimers = [];
    const rowMapping = [];

    // Check if this agent has priority numbers assigned
    const myPriorityNumbers = priorityList && priorityList.agentPriorityMap?.[agentUsername] || [];
    const priorityModeActive = priorityList && priorityList.priorityModeActive && myPriorityNumbers.length > 0;

    for (let r = 0; r < data.length; r++) {
      const agentCell = String(data[r]?.[COL_AGENTS] || '').trim().toLowerCase();
      const agentMatch = agentCell === agentUsername.toLowerCase();

      if (!agentMatch) continue;

      const state = timers[r]?.state?.toUpperCase() || '';
      if (state === 'DONE' || state === 'REJECTED') continue;

      // Apply priority mode filter: only show rows where AWB matches agent's priority numbers
      if (priorityModeActive) {
        const rowAwb = String(data[r]?.[COL_AWB] || '').trim();
        if (!myPriorityNumbers.includes(rowAwb)) continue;
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

    return { data: compactedData, timers: compactedTimers, rowMapping, priorityModeActive };
  }, [isAdmin, agentUsername, data, timers, priorityList, regionFilter, columns.length]);

  const displayData = getCompactedView.data;
  const displayTimers = getCompactedView.timers;
  const rowMapping = getCompactedView.rowMapping;
  const agentInPriorityMode = getCompactedView.priorityModeActive;

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

  const handleCellDoubleClick = (r, c, e) => {
    if (e) e.stopPropagation();
    if (c === COL_STATUS) return;

    // For agents: only rejection columns are editable, all others are read-only (view/copy only)
    const isEditable = canEdit(r, c);

    setEditingCell({ r, c, readOnly: !isEditable });
    setEditValue(displayData[r]?.[c] || '');
    setShowCellEditor(true);
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
      setShowCellEditor(false);
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
      }, 3000);
    }
  };

  const cancelEdit = () => {
    setShowCellEditor(false);
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
    toast.success(`Copied ${(r2 - r1 + 1) * (c2 - c1 + 1)} cells`);
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
    // Don't handle keys when cell editor dialog is open
    if (showCellEditor) {
      return;
    }

    if (editingCell) {
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
        setActiveCell((prev) => ({ r: Math.max(0, prev.r - 1), c: prev.c }));
        if (e.shiftKey) {
          setSelection((prev) => ({ ...prev, r2: Math.max(0, prev.r2 - 1) }));
        } else {
          setSelection((prev) => ({ r1: activeCell.r - 1, c1: activeCell.c, r2: activeCell.r - 1, c2: activeCell.c }));
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        setActiveCell((prev) => ({ r: Math.min(ROWS_COUNT - 1, prev.r + 1), c: prev.c }));
        if (e.shiftKey) {
          setSelection((prev) => ({ ...prev, r2: Math.min(ROWS_COUNT - 1, prev.r2 + 1) }));
        } else {
          setSelection((prev) => ({ r1: activeCell.r + 1, c1: activeCell.c, r2: activeCell.r + 1, c2: activeCell.c }));
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        setActiveCell((prev) => ({ r: prev.r, c: Math.max(0, prev.c - 1) }));
        if (e.shiftKey) {
          setSelection((prev) => ({ ...prev, c2: Math.max(0, prev.c2 - 1) }));
        } else {
          setSelection((prev) => ({ r1: activeCell.r, c1: activeCell.c - 1, r2: activeCell.r, c2: activeCell.c - 1 }));
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        setActiveCell((prev) => ({ r: prev.r, c: Math.min(columns.length - 1, prev.c + 1) }));
        if (e.shiftKey) {
          setSelection((prev) => ({ ...prev, c2: Math.min(columns.length - 1, prev.c2 + 1) }));
        } else {
          setSelection((prev) => ({ r1: activeCell.r, c1: activeCell.c + 1, r2: activeCell.r, c2: activeCell.c + 1 }));
        }
        break;
      case 'Enter':
      case 'F2':
        e.preventDefault();
        if (activeCell.c !== COL_STATUS) {
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
          if (activeCell.c !== COL_STATUS) {
            const isEditable = canEdit(activeCell.r, activeCell.c);
            const isViewOnly = [COL_REASON, COL_CONF1, COL_CONF2, COL_CONF3, COL_CONF4, COL_CONF5, COL_CONF6].includes(activeCell.c);

            setEditingCell({ r: activeCell.r, c: activeCell.c, readOnly: !isEditable || isViewOnly });
            setEditValue(e.key);
            setShowCellEditor(true);
            e.preventDefault();
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

  const getCellClass = useCallback((r, c) => {
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
  }, [activeCell, selection, rowMapping, displayTimers, blinkRows, isAdmin, selectedRows, typingCell]);

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
      setSelection((prev) => ({
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
      setSelection((prev) => ({
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
        {!isAdmin && actualRow !== -1 &&
        <>
            {!timer.start &&
          <button
            className="status-btn start"
            onClick={handleStart}
            type="button">

                START
              </button>
          }
            <button
            className="status-btn done"
            onClick={handleDone}
            type="button">

              DONE
            </button>
            <button
            className="status-btn reject"
            onClick={handleReject}
            type="button">

              REJ
            </button>
          </>
        }
        {isAdmin && statusText &&
        <span className="text-xs font-bold text-red-600">{statusText}</span>
        }
        {actualRow !== -1 &&
        <span className="status-label">
            D:{timer.doneClicks || 0} R:{timer.rejClicks || 0} T:{timeStr}
          </span>
        }
      </div>);

  };

  const renderCellContent = useCallback((r, c) => {
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
  }, [displayData, isRowVisible, isAdmin]);

  const visibleRows = isAdmin && !filterAgentUsername ? ROWS_COUNT : getCompactedView.data.length;
  const gridStyle = useMemo(() => ({
    display: 'grid',
    gridTemplateColumns: `48px ${colWidths.map((w) => `${w}px`).join(' ')}`,
    gridTemplateRows: `30px repeat(${visibleRows}, 30px)`,
    width: 'fit-content',
    transform: `scale(${zoomLevel / 100})`,
    transformOrigin: 'top left'
  }), [colWidths, visibleRows, zoomLevel]);

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
      onKeyDown={handleKeyDown}>

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
          overscroll-behavior: contain;
          scroll-behavior: smooth;
          will-change: scroll-position;
        }
        
        .sheet-scroll * {
          overscroll-behavior: contain;
        }
        
        .sheet-grid {
          will-change: transform;
          transform: translateZ(0);
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
          user-select: text;
          contain: layout style paint;
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
          {columns.map((col, c) =>
          <div
            key={`col-${c}`}
            className="col-header"
            style={{ gridRow: 1, gridColumn: c + 2, position: 'relative' }}
            onClick={() => handleSort(c)}
            title={`Click to sort by ${col}`}>

              <span>{colToName(c)}</span>
              <span style={{ fontSize: '9px', marginLeft: '2px', opacity: 0.7 }}>{col}</span>
              {sortConfig.column === c &&
            <span style={{ marginLeft: '4px' }}>
                  {sortConfig.direction === 'asc' ? '▲' : '▼'}
                </span>
            }
              <div
              className="col-resizer"
              data-c={c}
              onMouseDown={handleResizerMouseDown} />

            </div>
          )}
          
          {/* Row Headers & Cells - Optimized rendering */}
          {Array.from({ length: Math.min(visibleRows, 100) }).map((_, r) =>
          <React.Fragment key={`row-${r}`}>
              <div
              className="row-header"
              style={{ gridRow: r + 2, gridColumn: 1, cursor: isAdmin && onRowSelect ? 'pointer' : 'default' }}
              onClick={() => {
                const actualRow = rowMapping[r];
                if (isAdmin && onRowSelect && actualRow !== -1) {
                  onRowSelect(actualRow);
                }
              }}>

                {isAdmin && onRowSelect && selectedRows ?
              rowMapping[r] !== -1 && selectedRows.has(rowMapping[r]) ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" /> :

              r + 1
              }
              </div>
              {columns.map((_, c) =>
            <div
              key={`cell-${r}-${c}`}
              className={getCellClass(r, c)}
              style={{ gridRow: r + 2, gridColumn: c + 2, position: 'relative' }}
              onMouseDown={(e) => handleCellMouseDown(r, c, e)}
              onMouseEnter={() => handleMouseEnter(r, c)}
              onMouseUp={handleCellMouseUp}
              onClick={() => handleCellClick(r, c)}
              onDoubleClick={(e) => handleCellDoubleClick(r, c, e)}>

                  {editingCell && editingCell.r === r && editingCell.c === c ? null : renderCellContent(r, c)}
                </div>
            )}
            </React.Fragment>
          )}
        </div>
      </div>
      
      {/* Cell Editor Dialog */}
      <CellEditorDialog
        open={showCellEditor}
        onOpenChange={(open) => {
          setShowCellEditor(open);
          if (!open) cancelEdit();
        }}
        value={editValue}
        onChange={handleEditValueChange}
        onSave={commitEdit}
        rowIndex={editingCell?.r || 0}
        columnName={editingCell ? columns[editingCell.c] : ''}
        readOnly={editingCell?.readOnly || false} />

    </div>);

});

// ============================================================================
// ADMIN DASHBOARD COMPONENT
// ============================================================================

const AdminDashboard = memo(({ username, onLogout }) => {
  const [activeTab, setActiveTab] = useState("cs-sheet");
  const [csSheet, setCSSheet] = useState(loadCSSheet);
  const [agentSheets, setAgentSheets] = useState(loadAgentSheets);
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [newAgentUser, setNewAgentUser] = useState("");
  const [newAgentPass, setNewAgentPass] = useState("");
  const [newAdminUser, setNewAdminUser] = useState("");
  const [newAdminPass, setNewAdminPass] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [envTemplate, setEnvTemplate] = useState({ ADMIN_DEFAULT_USERNAME: '', ADMIN_DEFAULT_PASSWORD: '', OTP_EXPIRY_MINUTES: '10', EMAIL_SENDER_NAME: '' });
  const [importingBackup, setImportingBackup] = useState(false);
  const backupFileInputRef = useRef(null);
  const [regionFilter, setRegionFilter] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [undoAction, setUndoAction] = useState(null);
  const [auditSearch, setAuditSearch] = useState("");
  const [fastEditMode, setFastEditMode] = useState(false);
  const [activeFilters, setActiveFilters] = useState(null);
  const [csFilters, setCsFilters] = useState(null);
  const [filteredData, setFilteredData] = useState(null);
  const [csAllocators, setCSAllocators] = useState([]);
  const [newCSUser, setNewCSUser] = useState("");
  const [newCSPass, setNewCSPass] = useState("");
  const [priorityNumbers, setPriorityNumbers] = useState("");
  const [csUploads, setCSUploads] = useState([]);
  const fileInputRef = useRef(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', onConfirm: () => {}, variant: 'warning' });
  const [creatingAgent, setCreatingAgent] = useState(false);
  const [creatingCS, setCreatingCS] = useState(false);
  const [deletingUser, setDeletingUser] = useState(null);
  const prevAgentStatuses = useRef({});
  // Role permissions config (stored in AppState: role_permissions)
  const [rolePerm, setRolePerm] = useState({
    agent: { allowCopyButtons: true, allowDownloadReport: true },
    cs_allocator: { allowUpload: true, allowClear: true, allowDownload: true }
  });
  // Maintenance settings (mirrors AdminConfig)
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceBanner, setMaintenanceBanner] = useState("");
  // Live active sessions
  const [activeSessions, setActiveSessions] = useState({});
  // Audit logs
  const [auditLogs, setAuditLogs] = useState([]);
  const [liveSessions, setLiveSessions] = useState([]);
  const filteredAuditLogs = useMemo(() => {
    const q = (auditSearch || '').toLowerCase().trim();
    if (!q) return auditLogs;
    return auditLogs.filter((log) => {
      const details = (log.details || '');
      const target = `${log.target_type || ''}:${log.target_identifier || ''}`;
      return (
        (log.action || '').toLowerCase().includes(q) ||
        (log.actor_username || '').toLowerCase().includes(q) ||
        target.toLowerCase().includes(q) ||
        details.toLowerCase().includes(q)
      );
    });
  }, [auditLogs, auditSearch]);

  // Write an audit record (admin actions in this dashboard)
  const logAudit = async (action, details = {}, targetType = "", targetId = "") => {
    try {
      await adn7.entities.AuditLog.create({
        action,
        actor_username: username,
        actor_role: 'admin',
        target_type: targetType,
        target_identifier: targetId,
        details: JSON.stringify(details || {}),
        timestamp: Date.now()
      });
    } catch {}
  };

  const loadRolePerms = async () => {
    try {
      const rec = await pullAppState('role_permissions');
      const cfg = rec?.data;
      if (cfg) setRolePerm((prev) => ({
        agent: { ...prev.agent, ...(cfg.agent || {}) },
        cs_allocator: { ...prev.cs_allocator, ...(cfg.cs_allocator || {}) }
      }));
    } catch {}
  };
  const saveRolePerms = async (next) => {
    setRolePerm(next);
    await pushAppState('role_permissions', next);
    toast.success('Role permissions saved');
    logAudit('update_role_permissions', next);
  };
  const loadAudit = async () => {
    try {
      const list = await adn7.entities.AuditLog.list();
      const sorted = (list || []).sort((a,b) => (new Date(b.created_date).getTime()) - (new Date(a.created_date).getTime()));
      setAuditLogs(sorted.slice(0, 100));
    } catch {}
  };
  const saveMaintenance = async () => {
    try {
      await adn7.functions.invoke('adminSettingsApi', { 
        action: 'updateSettings', 
        payload: { 
          maintenance_mode: maintenanceMode, 
          banner_message: maintenanceBanner 
        } 
      });
      
      // If enabling maintenance, kick all non-admin users
      if (maintenanceMode) {
        try {
          const rows = await adn7.entities.AppState.filter({ state_key: 'active_sessions' });
          const sessionData = rows?.[0]?.data || {};
          Object.keys(sessionData).forEach(key => {
            if (sessionData[key]?.role !== 'admin') {
              sessionData[key].kick = true;
            }
          });
          if (rows?.[0]) await adn7.entities.AppState.update(rows[0].id, { data: sessionData });
        } catch {}
      }
      
      toast.success(`✅ Maintenance mode ${maintenanceMode ? 'enabled' : 'disabled'}`);
      logAudit('update_maintenance', { maintenance_mode: maintenanceMode, banner_message: maintenanceBanner });
    } catch {
      toast.error('Failed to save maintenance settings');
    }
  };

  useEffect(() => {
    (async () => {
      // Load AdminConfig
      try {
        const cfgs = await adn7.entities.AdminConfig.filter({ config_key: 'main' });
        const cfg = (cfgs || [])[0];
        if (cfg) {
          setMaintenanceMode(!!cfg.maintenance_mode);
          setMaintenanceBanner(String(cfg.banner_message || '').trim());
        }
      } catch {}
      await loadRolePerms();
      await loadAudit();
    })();
    
    // Removed auto-poll - only check on tab activation
    return () => {};
  }, []);

  // Poll live sessions
  useEffect(() => {
    let stopped = false;
    const load = async () => {
      try {
        const rows = await adn7.entities.AppState.filter({ state_key: 'active_sessions' });
        const data = rows?.[0]?.data || {};
        const list = Object.values(data).map((s) => ({ ...s }));
        if (!stopped) setLiveSessions(list);
      } catch {}
    };
    load();
    const id = setInterval(load, 3000);
    return () => { stopped = true; clearInterval(id); };
  }, []);

  // Poll active sessions DISABLED - use BroadcastChannel
  useEffect(() => {
    return () => {};
  }, []);

  // Precompute metrics for all agents in one pass for performance
  const allAgentMetrics = useMemo(() => {
    const map = {};
    (agents || []).forEach((a) => {
      map[a.username.toLowerCase()] = { username: a.username, awb: 0, lineSum: 0, done: 0, rej: 0, totalDoneLines: 0, totalRejectedLines: 0 };
    });
    for (let r = 0; r < ROWS_COUNT; r++) {
      const agentName = String(csSheet.raw[r]?.[COL_AGENTS] || '').trim();
      if (!agentName) continue;
      const key = agentName.toLowerCase();
      if (!map[key]) {
        map[key] = { username: agentName, awb: 0, lineSum: 0, done: 0, rej: 0, totalDoneLines: 0, totalRejectedLines: 0 };
      }
      const state = csSheet.timers[r]?.state?.toUpperCase() || '';
      const lineSum = parseLineSum(csSheet.raw[r]?.[COL_LINE]);
      if (state === 'DONE') {map[key].done++;map[key].totalDoneLines += lineSum;} else
      if (state === 'REJECTED') {map[key].rej++;map[key].totalRejectedLines += lineSum;} else
      {if (csSheet.raw[r]?.[COL_AWB]?.trim()) map[key].awb++;map[key].lineSum += lineSum;}
    }
    return map;
  }, [csSheet, agents]);

  useEffect(() => {
    const state = loadState();
    setNewAdminUser(state.admin.username);
    setAdminEmail(state.admin.email || "");

    // Load env overview for Settings tab
    (async () => {
      try {
        const res = await adn7.functions.invoke('adminSettingsApi', { action: 'getEnvOverview' });
        const saved = res.data?.saved || {};
        setEnvTemplate({
          ADMIN_DEFAULT_USERNAME: saved.ADMIN_DEFAULT_USERNAME ?? '',
          ADMIN_DEFAULT_PASSWORD: saved.ADMIN_DEFAULT_PASSWORD ?? '',
          OTP_EXPIRY_MINUTES: String(saved.OTP_EXPIRY_MINUTES ?? '10'),
          EMAIL_SENDER_NAME: saved.EMAIL_SENDER_NAME ?? ''
        });
      } catch {}
    })();

    // ALWAYS load agents/CS from DATABASE - this ensures persistence
    (async () => {
      try {
        console.log('[ADMIN MOUNT] Loading users from database...');
        const [serverAgents, serverCS] = await Promise.all([
          adn7.entities.AgentUser.list(),
          adn7.entities.CSUser.list()
        ]);
        console.log('[ADMIN MOUNT] Loaded:', serverAgents?.length, 'agents,', serverCS?.length, 'CS users');
        setAgents((serverAgents || []).map((a) => ({ 
          id: a.id,
          username: a.username, 
          password: a.password,
          full_name: a.full_name,
          email: a.email,
          region: a.region,
          notes: a.notes,
          is_active: a.is_active
        })));
        setCSAllocators((serverCS || []).map((a) => ({ 
          id: a.id,
          username: a.username, 
          password: a.password,
          is_active: a.is_active
        })));
      } catch (e) {
        console.error('[ADMIN MOUNT] Failed to load users:', e);
        toast.error('⚠️ Failed to load users from database: ' + (e.message || 'Unknown error'));
        setAgents([]);
        setCSAllocators([]);
      }
    })();

    // Realtime list polling moved to users_sync watcher effect below

    const sheets = loadAgentSheets();
    setCSUploads(sheets.csUploads || []);
    setPriorityNumbers(sheets.priorityNumbers || "");

    // Removed auto-refresh to reduce API calls
    return () => {};
  }, []);

  // Periodic refresh from database to ensure consistency
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [serverAgents, serverCS] = await Promise.all([
          adn7.entities.AgentUser.list(),
          adn7.entities.CSUser.list()
        ]);
        setAgents((serverAgents || []).map((a) => ({ 
          id: a.id,
          username: a.username, 
          password: a.password,
          full_name: a.full_name,
          email: a.email,
          region: a.region,
          notes: a.notes,
          is_active: a.is_active
        })));
        setCSAllocators((serverCS || []).map((a) => ({ 
          id: a.id,
          username: a.username, 
          password: a.password,
          is_active: a.is_active
        })));
      } catch {}
    }, 120000); // Every 2 minutes
    return () => clearInterval(interval);
  }, []);

  // Long-poll DISABLED - use BroadcastChannel + periodic sync only
  useEffect(() => {
    return () => {};
  }, []);

  // Minimal periodic sync - 60s interval only
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const csRec = await pullAppState('cs_sheet');
        if (csRec) {
          const t = Date.parse(csRec.updated_date || csRec.updatedAt || csRec.updated_at || '');
          if (t && t > lastRemoteUpdates.cs) {
            localStorage.setItem(CS_SHEET_KEY, JSON.stringify(csRec.data));
            setCSSheet(loadCSSheet());
            lastRemoteUpdates.cs = t;
            CHANNEL.postMessage({ type: 'app:sync' });
          }
        }
      } catch {}
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Database is now the ONLY source of truth - no localStorage migration needed
  useEffect(() => {
    return () => {};
  }, []);

  useEffect(() => {
    const handleSync = (ev) => {
      if (ev?.data?.uploadNotification) {
        const notif = ev.data.uploadNotification;
        toast.success(`🔔 CS Upload: ${notif.csUser} uploaded ${notif.filename} with ${notif.rowCount} rows`, { duration: 8000 });
        const sheets = loadAgentSheets();
        setCSUploads(sheets.csUploads || []);
      }
      if (ev?.data?.breakUpdate) {
        const breakInfo = ev.data.breakUpdate;
        const breakLabel = BREAK_TYPES.find((b) => b.id === breakInfo.type)?.label || 'Break';
        if (breakInfo.status === 'started') {
          toast.info(`${breakInfo.agent} started ${breakLabel}`, { duration: 3000 });
        } else if (breakInfo.status === 'ended') {
          toast.info(`${breakInfo.agent} ended break`, { duration: 3000 });
        }
        setCSSheet(loadCSSheet());
      }
      if (ev?.data?.agentLogout) {
        setCSSheet(loadCSSheet());
      }
      if (ev?.data?.priorityUnlocked) {
        toast.info(`${ev.data.priorityUnlocked.agent} unlocked all content`, { duration: 3000 });
        setAgentSheets(loadAgentSheets());
      }
      if (ev?.data?.type === "app:sync") {
        setCSSheet(loadCSSheet());
        setAgentSheets(loadAgentSheets());
        // Refresh users from database
        (async () => {
          try {
            const [serverAgents, serverCS] = await Promise.all([
              adn7.entities.AgentUser.list(),
              adn7.entities.CSUser.list()
            ]);
            setAgents((serverAgents || []).map((a) => ({ 
              id: a.id,
              username: a.username, 
              password: a.password,
              full_name: a.full_name,
              email: a.email,
              region: a.region,
              notes: a.notes,
              is_active: a.is_active
            })));
            setCSAllocators((serverCS || []).map((a) => ({ 
              id: a.id,
              username: a.username, 
              password: a.password,
              is_active: a.is_active
            })));
          } catch {}
        })();
      }
    };
    CHANNEL.addEventListener('message', handleSync);
    return () => CHANNEL.removeEventListener('message', handleSync);
  }, []);

  useEffect(() => {
    // Removed duplicate sync listener
    return () => {};
  }, []);

  // Notify on agent status changes (Busy / On Break / Available)
  useEffect(() => {
    const current = {};
    (agents || []).forEach((a) => {
      current[a.username] = getAgentStatus(a.username).label;
    });
    Object.keys(current).forEach((name) => {
      const prev = prevAgentStatuses.current[name];
      const now = current[name];
      if (prev && now && prev !== now) {
        toast.info(`${name} is now ${now}`);
      }
    });
    prevAgentStatuses.current = current;
  }, [csSheet, agents]);

  const handleCSCellChange = (r, c, value) => {
    const newSheet = deepCopy(csSheet);

    // Column-specific validation/formatting
    let newValue = value;
    if (c === COL_AWB) {
      const awb = normalizeAwb(value);
      if (!awb) {toast.error('AWB must be exactly 10 digits');return;}
      newValue = awb;
    } else if (c === COL_LINE) {
      if (!isValidLineExpr(value)) {toast.error('LINE must be numbers separated by + (e.g., 2+3+5)');return;}
    } else if (c === COL_TIME) {
      const formatted = formatTimeEntry(value);
      if (!formatted) {toast.error('TIME must be a valid time (e.g., 2:30 PM or 14:30)');return;}
      newValue = formatted;
    } else if (c === COL_STATUS) {
      if (typeof newValue === 'string' && /reject/i.test(newValue)) newValue = 'REJECT';
    }

    newSheet.raw[r][c] = newValue;

    // Cross-field checks
    const awbNow = String(newSheet.raw[r]?.[COL_AWB] || '').trim();
    const agentNow = String(newSheet.raw[r]?.[COL_AGENTS] || '').trim();
    const reasonNow = String(newSheet.raw[r]?.[COL_REASON] || '').trim();
    const statusNow = String(newSheet.raw[r]?.[COL_STATUS] || '').toUpperCase();
    if (awbNow && !agentNow) {toast.warning('AGENTS is required when AWB is set');}
    if (statusNow === 'REJECT' && !reasonNow) {toast.warning('REASON is required for REJECT status');}

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

    // CS confirmations are informational only; do not change rejection state or trigger blinks
    if ([COL_CONF2, COL_CONF3, COL_CONF4, COL_CONF5, COL_CONF6].includes(c) && value.trim()) {

      // no-op: keep state as-is (REJECTED rows remain for CS view)
    }
    setCSSheet(newSheet);
    saveCSSheet(newSheet);
    // trigger instant cross-device update
    pushCSImmediate(newSheet);
    CHANNEL.postMessage({ type: "app:sync" });
  };

  const handleCSStatusClick = (r, action) => {



    // Admin doesn't use status buttons in CS sheet
  };

  // Helper: Clean orphaned references when an agent is removed
  // - Clears AGENTS column in CS sheet for rows assigned to the deleted agent
  // - Removes agent entries from priority maps (agentPriorityMap, priorityAgentMap)
  const cleanOrphanDataForAgent = async (agentUsername) => {
    const nextSheet = deepCopy(csSheet);
    let changed = false;
    for (let r = 0; r < ROWS_COUNT; r++) {
      if (String(nextSheet.raw[r]?.[COL_AGENTS] || '').trim().toLowerCase() === String(agentUsername).toLowerCase()) {
        nextSheet.raw[r][COL_AGENTS] = '';
        changed = true;
      }
    }
    if (changed) { setCSSheet(nextSheet); saveCSSheet(nextSheet); pushCSImmediate(nextSheet); }

    const sheets = loadAgentSheets();
    if (sheets.agentPriorityMap && sheets.agentPriorityMap[agentUsername]) {
      const numbers = sheets.agentPriorityMap[agentUsername] || [];
      delete sheets.agentPriorityMap[agentUsername];
      if (sheets.priorityAgentMap) {
        numbers.forEach((p) => { if (sheets.priorityAgentMap[p] === agentUsername) sheets.priorityAgentMap[p] = null; });
      }
      saveAgentSheets(sheets);
      setAgentSheets(sheets);
    }
  };

  const createAgent = async () => {
    const username = String(newAgentUser || '').trim();
    const password = String(newAgentPass || '');
    
    console.log('[CREATE AGENT] Starting creation:', { username, passwordLength: password.length });
    
    if (!username || !password) { 
      toast.error('Username and password required'); 
      return; 
    }
    if (password.length < 4) { 
      toast.error('Password must be at least 4 characters'); 
      return; 
    }
    if (creatingAgent) {
      console.log('[CREATE AGENT] Already creating, skipping');
      return;
    }

    setCreatingAgent(true);
    toast.info('Creating agent profile...');
    
    try {
      console.log('[CREATE AGENT] Calling backend API...');
      
      // Use backend API for atomic transaction with confirmation
      const response = await adn7.functions.invoke('adminSettingsApi', {
        action: 'createAgent',
        payload: { username, password }
      });
      
      console.log('[CREATE AGENT] Backend response:', response.data);
      
      // Check for errors in response
      if (response.data?.error) {
        console.error('[CREATE AGENT] Backend error:', response.data.error);
        toast.error('❌ Backend error: ' + response.data.error);
        return;
      }
      
      if (!response.data?.success) {
        console.error('[CREATE AGENT] No success flag in response');
        toast.error('❌ Creation failed - no success confirmation from backend');
        return;
      }
      
      console.log('[CREATE AGENT] Verifying in database...');
      
      // Wait for database confirmation - reload from database with retry
      let serverAgents = null;
      let created = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        await new Promise(r => setTimeout(r, 500)); // Wait 500ms between retries
        serverAgents = await adn7.entities.AgentUser.list();
        created = serverAgents.find(a => a.username === username);
        if (created) {
          console.log('[CREATE AGENT] Found in database on attempt', attempt + 1);
          break;
        }
        console.log('[CREATE AGENT] Not found on attempt', attempt + 1, ', retrying...');
      }
      
      if (!created) {
        console.error('[CREATE AGENT] CRITICAL: Profile not found in database after 3 attempts');
        console.log('[CREATE AGENT] Available users:', serverAgents?.map(a => a.username));
        toast.error('❌ CRITICAL: Profile created but not found in database. Contact support.');
        return;
      }
      
      console.log('[CREATE AGENT] Successfully verified:', created);
      
      // Update UI with complete database records
      setAgents((serverAgents || []).map((a) => ({ 
        id: a.id,
        username: a.username, 
        password: a.password,
        full_name: a.full_name,
        email: a.email,
        region: a.region,
        notes: a.notes,
        is_active: a.is_active
      })));
      
      console.log('[CREATE AGENT] UI updated with', serverAgents.length, 'agents');
      
      setNewAgentUser('');
      setNewAgentPass('');
      
      // Sync to other devices
      await notifyUsersSync();
      CHANNEL.postMessage({ type: 'app:sync' });
      await logAudit('create_agent', { username });
      
      toast.success(`✅ Agent "${username}" created successfully! Total agents: ${serverAgents.length}`);
    } catch (e) {
      console.error('[CREATE AGENT] Exception:', e);
      const msg = e?.response?.data?.error || e?.message || String(e);
      toast.error('❌ Failed to create agent: ' + msg);
      
      // Always reload from database on error
      try {
        const list = await adn7.entities.AgentUser.list();
        console.log('[CREATE AGENT] Reloaded after error:', list?.length, 'agents');
        setAgents((list || []).map((a) => ({ 
          id: a.id,
          username: a.username, 
          password: a.password,
          full_name: a.full_name,
          email: a.email,
          region: a.region,
          notes: a.notes,
          is_active: a.is_active
        })));
      } catch (reloadErr) {
        console.error('[CREATE AGENT] Failed to reload:', reloadErr);
      }
    } finally {
      setCreatingAgent(false);
      console.log('[CREATE AGENT] Completed');
    }
  };

  const deleteAgent = async (username) => {
    if (deletingUser === username) return;
    
    setConfirmDialog({
      open: true,
      title: 'Delete Agent',
      message: `Delete agent "${username}"? This will remove all assignments and log them out.`,
      variant: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        setDeletingUser(username);
        try {
          // Use backend API for atomic deletion with confirmation
          const response = await adn7.functions.invoke('adminSettingsApi', {
            action: 'deleteAgent',
            payload: { username }
          });
          
          // Check for errors
          if (response.data?.error) {
            toast.error(response.data.error);
            return;
          }
          
          // Verify deletion - reload from database
          const serverAgents = await adn7.entities.AgentUser.list();
          const stillExists = serverAgents.find(a => a.username === username);
          
          if (stillExists) {
            toast.error('Deletion failed - profile still exists in database');
            return;
          }
          
          // Update UI with verified database state
          setAgents((serverAgents || []).map((a) => ({ 
            id: a.id,
            username: a.username, 
            password: a.password,
            full_name: a.full_name,
            email: a.email,
            region: a.region,
            notes: a.notes,
            is_active: a.is_active
          })));
          
          // Background cleanup
          Promise.all([
            (async () => {
              const sessionRows = await adn7.entities.AppState.filter({ state_key: 'active_sessions' });
              const sessionData = sessionRows?.[0]?.data || {};
              Object.keys(sessionData).forEach(key => {
                if (sessionData[key]?.username === username && sessionData[key]?.role === 'agent') {
                  sessionData[key].kick = true;
                }
              });
              if (sessionRows?.[0]) await adn7.entities.AppState.update(sessionRows[0].id, { data: sessionData });
            })(),
            cleanOrphanDataForAgent(username),
            notifyUsersSync()
          ]);
          
          await logAudit('delete_agent', { username });
          toast.success(`✅ Agent "${username}" permanently deleted and verified`);
          CHANNEL.postMessage({ type: 'app:sync' });
        } catch (e) {
          const msg = e?.response?.data?.error || e?.message || String(e);
          toast.error('Failed to delete agent: ' + msg);
          
          // Always reload from database
          try {
            const list = await adn7.entities.AgentUser.list();
            setAgents((list || []).map((a) => ({ 
              id: a.id,
              username: a.username, 
              password: a.password,
              full_name: a.full_name,
              email: a.email,
              region: a.region,
              notes: a.notes,
              is_active: a.is_active
            })));
          } catch {}
        } finally {
          setDeletingUser(null);
        }
      }
    });
  };

  const createCSAllocator = async () => {
    const username = String(newCSUser || '').trim();
    const password = String(newCSPass || '');
    
    console.log('[CREATE CS] Starting creation:', { username, passwordLength: password.length });
    
    if (!username || !password) { 
      toast.error('Username and password required'); 
      return; 
    }
    if (password.length < 4) { 
      toast.error('Password must be at least 4 characters'); 
      return; 
    }
    if (creatingCS) {
      console.log('[CREATE CS] Already creating, skipping');
      return;
    }

    setCreatingCS(true);
    toast.info('Creating CS profile...');
    
    try {
      console.log('[CREATE CS] Calling backend API...');
      
      // Use backend API for atomic transaction with confirmation
      const response = await adn7.functions.invoke('adminSettingsApi', {
        action: 'createCS',
        payload: { username, password }
      });
      
      console.log('[CREATE CS] Backend response:', response.data);
      
      // Check for errors in response
      if (response.data?.error) {
        console.error('[CREATE CS] Backend error:', response.data.error);
        toast.error('❌ Backend error: ' + response.data.error);
        return;
      }
      
      if (!response.data?.success) {
        console.error('[CREATE CS] No success flag in response');
        toast.error('❌ Creation failed - no success confirmation from backend');
        return;
      }
      
      console.log('[CREATE CS] Verifying in database...');
      
      // Wait for database confirmation - reload from database with retry
      let serverCS = null;
      let created = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        await new Promise(r => setTimeout(r, 500)); // Wait 500ms between retries
        serverCS = await adn7.entities.CSUser.list();
        created = serverCS.find(a => a.username === username);
        if (created) {
          console.log('[CREATE CS] Found in database on attempt', attempt + 1);
          break;
        }
        console.log('[CREATE CS] Not found on attempt', attempt + 1, ', retrying...');
      }
      
      if (!created) {
        console.error('[CREATE CS] CRITICAL: Profile not found in database after 3 attempts');
        console.log('[CREATE CS] Available users:', serverCS?.map(a => a.username));
        toast.error('❌ CRITICAL: Profile created but not found in database. Contact support.');
        return;
      }
      
      console.log('[CREATE CS] Successfully verified:', created);
      
      // Update UI with complete database records
      setCSAllocators((serverCS || []).map((a) => ({ 
        id: a.id,
        username: a.username, 
        password: a.password,
        is_active: a.is_active
      })));
      
      console.log('[CREATE CS] UI updated with', serverCS.length, 'CS users');
      
      setNewCSUser('');
      setNewCSPass('');
      
      // Sync to other devices
      await notifyUsersSync();
      CHANNEL.postMessage({ type: 'app:sync' });
      await logAudit('create_cs_allocator', { username });
      
      toast.success(`✅ CS Allocator "${username}" created successfully! Total CS users: ${serverCS.length}`);
    } catch (e) {
      console.error('[CREATE CS] Exception:', e);
      const msg = e?.response?.data?.error || e?.message || String(e);
      toast.error('❌ Failed to create CS allocator: ' + msg);
      
      // Always reload from database on error
      try {
        const list = await adn7.entities.CSUser.list();
        console.log('[CREATE CS] Reloaded after error:', list?.length, 'CS users');
        setCSAllocators((list || []).map((a) => ({ 
          id: a.id,
          username: a.username, 
          password: a.password,
          is_active: a.is_active
        })));
      } catch (reloadErr) {
        console.error('[CREATE CS] Failed to reload:', reloadErr);
      }
    } finally {
      setCreatingCS(false);
      console.log('[CREATE CS] Completed');
    }
  };

  const deleteCSAllocator = async (username) => {
    if (deletingUser === username) return;
    
    setConfirmDialog({
      open: true,
      title: 'Delete CS Allocator',
      message: `Delete CS user "${username}"? They will be logged out immediately.`,
      variant: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        setDeletingUser(username);
        try {
          // Use backend API for atomic deletion with confirmation
          const response = await adn7.functions.invoke('adminSettingsApi', {
            action: 'deleteCS',
            payload: { username }
          });
          
          // Check for errors
          if (response.data?.error) {
            toast.error(response.data.error);
            return;
          }
          
          // Verify deletion - reload from database
          const serverCS = await adn7.entities.CSUser.list();
          const stillExists = serverCS.find(a => a.username === username);
          
          if (stillExists) {
            toast.error('Deletion failed - profile still exists in database');
            return;
          }
          
          // Update UI with verified database state
          setCSAllocators((serverCS || []).map((a) => ({ 
            id: a.id,
            username: a.username, 
            password: a.password,
            is_active: a.is_active
          })));
          
          // Background cleanup
          Promise.all([
            (async () => {
              const sessionRows = await adn7.entities.AppState.filter({ state_key: 'active_sessions' });
              const sessionData = sessionRows?.[0]?.data || {};
              Object.keys(sessionData).forEach(key => {
                if (sessionData[key]?.username === username && sessionData[key]?.role === 'cs_allocator') {
                  sessionData[key].kick = true;
                }
              });
              if (sessionRows?.[0]) await adn7.entities.AppState.update(sessionRows[0].id, { data: sessionData });
            })(),
            notifyUsersSync()
          ]);
          
          await logAudit('delete_cs_allocator', { username });
          toast.success(`✅ CS "${username}" permanently deleted and verified`);
          CHANNEL.postMessage({ type: 'app:sync' });
        } catch (e) {
          const msg = e?.response?.data?.error || e?.message || String(e);
          toast.error('Failed to delete CS allocator: ' + msg);
          
          // Always reload from database
          try {
            const list = await adn7.entities.CSUser.list();
            setCSAllocators((list || []).map((a) => ({ 
              id: a.id,
              username: a.username, 
              password: a.password,
              is_active: a.is_active
            })));
          } catch {}
        } finally {
          setDeletingUser(null);
        }
      }
    });
  };

  const saveAdminCreds = async () => {
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
    try {
      const payload = { admin_username: newAdminUser };
      if (newAdminPass.trim() && newAdminPass.length >= 4) {
        payload.admin_password = newAdminPass;
      }
      await adn7.functions.invoke('adminSettingsApi', { action: 'updateSettings', payload });
    } catch {}
    setNewAdminPass("");
    logAudit('update_admin_credentials', { username: newAdminUser });
    toast.success("Admin credentials updated");
  };

  const saveAdminEmail = async () => {
    if (!adminEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    const state = loadState();
    state.admin.email = adminEmail;
    saveState(state);
    try {
      await adn7.functions.invoke('adminSettingsApi', { action: 'updateSettings', payload: { admin_email: adminEmail } });
    } catch {}
    logAudit('update_admin_email', { email: adminEmail });
    toast.success("Recovery email saved successfully");
  };

  const getAgentMetrics = (agentUser) => {
    const sheet = csSheet;
    let awbPending = 0,lineSumPending = 0,done = 0,rej = 0,totalDoneLines = 0,totalRejectedLines = 0;

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

  const agentStatusMap = useMemo(() => {
    const statusMap = {};
    (agents || []).forEach(a => {
        const agentBreak = csSheet.agentBreaks?.[a.username];
        if (agentBreak?.active && agentBreak?.start) {
            statusMap[a.username] = { label: 'On Break', variant: 'break', classes: 'bg-orange-100 text-orange-800 border-orange-300' };
        } else {
            statusMap[a.username] = { label: 'Available', variant: 'available', classes: 'bg-green-100 text-green-800 border-green-300' };
        }
    });

    const busyAgents = new Set();
    for (let r = 0; r < ROWS_COUNT; r++) {
        const rowAgentName = String(csSheet.raw[r]?.[COL_AGENTS] || '').trim().toLowerCase();
        if (!rowAgentName || busyAgents.has(rowAgentName)) continue;
        
        const t = csSheet.timers[r];
        const st = t?.state?.toUpperCase() || '';
        
        if (t?.start && st !== 'DONE' && st !== 'REJECTED') {
            const agentUsername = (agents || []).find(a => a.username.toLowerCase() === rowAgentName)?.username;
            if (agentUsername && statusMap[agentUsername]?.label === 'Available') {
                statusMap[agentUsername] = { label: 'Busy', variant: 'busy', classes: 'bg-blue-100 text-blue-800 border-blue-300' };
                busyAgents.add(rowAgentName);
            }
        }
    }
    return statusMap;
  }, [csSheet, agents]);

  // Presence status helper: On Break, Busy, Available
  const getAgentStatus = (agentUser) => {
    return agentStatusMap[agentUser] || { label: 'Offline', variant: 'offline', classes: 'bg-gray-200 text-gray-500' };
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
        region.split(/[\s,;|]+/).forEach((s) => {
          if (s.trim()) regions.add(s.trim());
        });
      }
    }
    return Array.from(regions).sort();
  };

  const applyRegionFilter = async (agent, region) => {
    const sheets = loadAgentSheets();
    if (!sheets.agentFilters) sheets.agentFilters = {};
    if (!sheets.agentFilters[agent]) sheets.agentFilters[agent] = {};
    sheets.agentFilters[agent].region = region;
    saveAgentSheets(sheets);
    setAgentSheets(sheets);
    setRegionFilter(region);
    CHANNEL.postMessage({ type: "app:sync" });
    toast.success(`Region filter "${region || 'ALL'}" applied to ${agent}${region ? ' - Agent will only see rows with this region' : ' - Agent will see all their rows'}`);
    logAudit('apply_region_filter', { agent, region });
  };

  const clearAllData = () => {
    setConfirmDialog({
      open: true,
      title: 'Clear All Data',
      message: 'Are you sure you want to clear all CS Sheet data? This cannot be undone.',
      variant: 'danger',
      confirmText: 'Clear All',
      onConfirm: async () => {
        const newSheet = {
          raw: Array.from({ length: ROWS_COUNT }, () => Array(CS_COLUMNS.length).fill('')),
          timers: Array.from({ length: ROWS_COUNT }, () => ({ elapsed: 0, start: null, doneClicks: 0, rejClicks: 0, state: "" })),
          colWidths: CS_COLUMNS.map(() => 140),
          blinkRows: {},
          agentBreaks: {}
        };
        setCSSheet(newSheet);
        saveCSSheet(newSheet);
        pushCSImmediate(newSheet);
        CHANNEL.postMessage({ type: "app:sync" });
        toast.success("All data cleared");
        logAudit('clear_cs_sheet', {});
      }
    });
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
    const rows = [headers, ...csSheet.raw.filter((row) => row.some((cell) => cell.trim()))];
    downloadCSV(rows, 'master_sheet_data.csv');
    toast.success("Downloaded Master Sheet data");
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
        const csIdx = CS_COLUMNS.findIndex((col) => col.toUpperCase() === headerUpper);
        if (csIdx !== -1) {
          colMapping[idx] = csIdx;
        }
      });

      const newSheet = deepCopy(csSheet);
      let rowsAdded = 0;
      let duplicatesSkipped = 0;

      // Build existing AWB -> state markers map (treat empty/available as blocker)
      const existingByAwb = {};
      for (let r = 0; r < ROWS_COUNT; r++) {
        const awb = normalizeAwb(csSheet.raw[r]?.[COL_AWB]);
        if (awb) {
          const st = String(csSheet.timers[r]?.state || '').toUpperCase();
          const statusCell = String(csSheet.raw[r]?.[COL_STATUS] || '').toUpperCase();
          // Consider a row rejected if either timer state is REJECTED or STATUS cell says REJECT
          const marker = st === 'REJECTED' || statusCell === 'REJECT' ? 'REJECTED' : st || statusCell || '';
          if (!existingByAwb[awb]) existingByAwb[awb] = [];
          existingByAwb[awb].push(marker);
        }
      }

      // Find first empty row in Master sheet (append at end)
      let writeRow = 0;
      for (let r = 0; r < ROWS_COUNT; r++) {
        if (csSheet.raw[r].every((cell) => !cell.trim())) {
          writeRow = r;
          break;
        }
      }

      // Source index for AWB in uploaded file
      const srcAwbIdx = Object.keys(colMapping).find((k) => colMapping[k] === COL_AWB);

      // Add data rows with duplicate rules
      dataRows.forEach((row) => {
        if (writeRow >= ROWS_COUNT) return;

        // Duplicate check by AWB
        let importAllowed = true;
        let awbNorm = null;
        if (srcAwbIdx !== undefined) {
          const rawAwb = String(row[srcAwbIdx] || '').trim();
          awbNorm = normalizeAwb(rawAwb);
          if (awbNorm) {
            const states = existingByAwb[awbNorm] || [];
            const hasBlocked = states.some((s) => s !== 'REJECTED');
            importAllowed = !hasBlocked; // allow only if ALL existing entries are explicitly REJECTED
          }
        }

        if (!importAllowed) {
          duplicatesSkipped++;
          return;
        }

        // Map and write cells
        Object.entries(colMapping).forEach(([srcIdx, targetCol]) => {
          let cellValue = String(row[srcIdx] || '').trim();
          if (targetCol === COL_AWB) {
            const awb = normalizeAwb(cellValue);
            cellValue = awb || '';
          }
          if (targetCol === COL_LINE) {
            if (!isValidLineExpr(cellValue)) cellValue = '';
          }
          if (targetCol === COL_TIME && cellValue) {
            const formatted = formatTimeEntry(cellValue);
            cellValue = formatted || '';
          }
          newSheet.raw[writeRow][targetCol] = cellValue;
        });

        // Initialize timer but don't start it (agent will start it)
        const awbVal = newSheet.raw[writeRow][COL_AWB];
        if (isValidAwb(awbVal)) {
          newSheet.timers[writeRow] = {
            elapsed: 0,
            start: null,
            doneClicks: 0,
            rejClicks: 0,
            state: "",
            updatedAt: Date.now()
          };
        }

        // Update map to avoid multiple imports of same AWB in this upload
        if (awbNorm) {
          if (!existingByAwb[awbNorm]) existingByAwb[awbNorm] = [];
          existingByAwb[awbNorm].push('');
        }

        rowsAdded++;
        writeRow++;
      });

      setCSSheet(newSheet);
      saveCSSheet(newSheet);
      pushCSImmediate(newSheet);
      CHANNEL.postMessage({ type: "app:sync" });
      toast.success(`Uploaded ${rowsAdded} rows successfully${duplicatesSkipped ? ", skipped " + duplicatesSkipped + " duplicates" : ''}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload file. Please check the format.");
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getCSMetrics = () => {
    let awb = 0,lineSum = 0,done = 0,rej = 0;

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
      if (csSheet.raw[r].some((cell) => cell.trim())) {
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

  const undoLast = () => {
    if (!undoAction) return;
    setCSSheet(undoAction.prevSheet);
    saveCSSheet(undoAction.prevSheet);
    CHANNEL.postMessage({ type: "app:sync" });
    logAudit('undo_action', { action: undoAction.type, meta: undoAction.meta }, 'cs_sheet', '');
    setUndoAction(null);
    toast.success('Action undone');
  };

  const handleClearSelected = () => {
    if (selectedRows.size === 0) {
      toast.error('No rows selected');
      return;
    }

    setConfirmDialog({
      open: true,
      title: 'Clear Selected Rows',
      message: `Clear ${selectedRows.size} selected rows?`,
      variant: 'warning',
      confirmText: 'Clear',
      onConfirm: () => {
        const newSheet = deepCopy(csSheet);
        selectedRows.forEach((r) => {
          newSheet.raw[r] = Array(CS_COLUMNS.length).fill('');
          newSheet.timers[r] = { elapsed: 0, start: null, doneClicks: 0, rejClicks: 0, state: "" };
        });
        const prevSheet = deepCopy(csSheet);
        const affected = Array.from(selectedRows).map((r) => ({ row: r, awb: String(prevSheet.raw[r]?.[COL_AWB] || '') }));
        setCSSheet(newSheet);
        saveCSSheet(newSheet);
        CHANNEL.postMessage({ type: "app:sync" });
        setSelectedRows(new Set());
        setUndoAction({ type: 'clear_selected', prevSheet, meta: { count: affected.length, rows: affected } });
        logAudit('clear_selected', { count: affected.length, rows: affected.map(x=>x.row), awbs: affected.map(x=>x.awb) }, 'cs_sheet', '');
        toast.success(`Cleared ${affected.length} rows`, { action: { label: 'Undo', onClick: () => undoLast() } });
      }
    });
  };

  const handleDeleteSelected = () => {
    if (selectedRows.size === 0) {
      toast.error('No rows selected');
      return;
    }

    setConfirmDialog({
      open: true,
      title: 'Delete Selected Rows',
      message: `Delete ${selectedRows.size} selected rows? This will shift rows up.`,
      variant: 'danger',
      confirmText: 'Delete',
      onConfirm: () => {
        const newSheet = deepCopy(csSheet);
        const sortedRows = Array.from(selectedRows).sort((a, b) => b - a);

        sortedRows.forEach((r) => {
          newSheet.raw.splice(r, 1);
          newSheet.timers.splice(r, 1);
          newSheet.raw.push(Array(CS_COLUMNS.length).fill(''));
          newSheet.timers.push({ elapsed: 0, start: null, doneClicks: 0, rejClicks: 0, state: "" });
        });

        const prevSheet = deepCopy(csSheet);
        const affected = Array.from(selectedRows).map((r) => ({ row: r, awb: String(prevSheet.raw[r]?.[COL_AWB] || '') }));
        setCSSheet(newSheet);
        saveCSSheet(newSheet);
        pushCSImmediate(newSheet);
        CHANNEL.postMessage({ type: "app:sync" });
        setSelectedRows(new Set());
        setUndoAction({ type: 'delete_selected', prevSheet, meta: { count: affected.length, rows: affected } });
        logAudit('delete_selected', { count: affected.length, rows: affected.map(x=>x.row), awbs: affected.map(x=>x.awb) }, 'cs_sheet', '');
        toast.success(`Deleted ${affected.length} rows`, { action: { label: 'Undo', onClick: () => undoLast() } });
        }
    });
  };

  const applyFilters = (filters) => {
    setActiveFilters(filters);

    if (!filters || (!filters.remarkKeyword && !filters.reasonKeyword && !filters.timeFrom && !filters.timeTo && !filters.dateFrom && !filters.dateTo && !filters.statuses && (!filters.sortColumns || filters.sortColumns.length === 0))) {
      setFilteredData(null);
      return;
    }

    let filtered = csSheet.raw.map((row, idx) => ({ row, idx, timer: csSheet.timers[idx] }));

    // Keyword filters
    if (filters.remarkKeyword) {
      const keyword = filters.remarkKeyword.toLowerCase();
      filtered = filtered.filter((item) =>
      String(item.row[COL_REMARKS] || '').toLowerCase().includes(keyword)
      );
    }
    if (filters.reasonKeyword) {
      const keyword = filters.reasonKeyword.toLowerCase();
      filtered = filtered.filter((item) =>
      String(item.row[COL_REASON] || '').toLowerCase().includes(keyword)
      );
    }

    // Date range filter using timers.updatedAt (fallback to timer.start for in-progress)
    if (filters.dateFrom || filters.dateTo) {
      const from = filters.dateFrom ? new Date(filters.dateFrom + 'T00:00:00').getTime() : null;
      const to = filters.dateTo ? new Date(filters.dateTo + 'T23:59:59').getTime() : null;
      filtered = filtered.filter((item) => {
        const t = item.timer?.updatedAt ?? (item.timer?.start || null);
        if (!t) return false;
        if (from && t < from) return false;
        if (to && t > to) return false;
        return true;
      });
    }

    // Time range filter (legacy, by elapsed ms)
    if (filters.timeFrom || filters.timeTo) {
      filtered = filtered.filter((item) => {
        const elapsed = item.timer.elapsed || 0;
        const running = item.timer.start ? elapsed + (Date.now() - item.timer.start) : elapsed;
        if (filters.timeFrom && running < filters.timeFrom) return false;
        if (filters.timeTo && running > filters.timeTo) return false;
        return true;
      });
    }

    // Status filter
    if (filters.statuses) {
      const wantPending = !!filters.statuses.pending;
      const wantDone = !!filters.statuses.done;
      const wantRejected = !!filters.statuses.rejected;
      filtered = filtered.filter((item) => {
        const st = String(item.timer?.state || item.row[COL_STATUS] || '').toUpperCase();
        const isDone = st === 'DONE';
        const isRejected = st === 'REJECTED' || st === 'REJECT';
        const hasAwb = !!String(item.row[COL_AWB] || '').trim();
        const isPending = !isDone && !isRejected && hasAwb;
        return (isPending && wantPending) || (isDone && wantDone) || (isRejected && wantRejected);
      });
    }

    // Enforce data quality in filtered view (skip invalid rows)
    filtered = filtered.filter((item) => {
      const row = item.row;
      // AWB validation if present
      const awb = normalizeAwb(row[COL_AWB]);
      if (row[COL_AWB] && !awb) return false;
      // LINE expression validity
      if (row[COL_LINE] && !isValidLineExpr(row[COL_LINE])) return false;
      // TIME format validity
      if (row[COL_TIME] && !isValidTimeStr(row[COL_TIME])) return false;
      return true;
    });

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
    const numbers = priorityNumbers.split(/[\s,;\n]+/).map((n) => n.trim()).filter((n) => /^\d{10}$/.test(n));
    if (numbers.length === 0) {
      toast.error("Please enter valid 10-digit priority numbers");
      return;
    }

    const sheets = loadAgentSheets();
    sheets.priorityNumbers = priorityNumbers;
    sheets.priorityModeActive = true;
    sheets.agentPriorityMap = {}; // Map: agent -> [priority numbers]
    sheets.priorityAgentMap = {}; // Map: priority number -> agent
    sheets.priorityStatus = {}; // Map: priority number -> status

    // Scan CS sheet to find which agent has which priority number (match AWB)
    numbers.forEach((priorityNum) => {
      let foundAgent = null;
      for (let r = 0; r < ROWS_COUNT; r++) {
        const rowAwb = String(csSheet.raw[r]?.[COL_AWB] || '').trim();
        if (rowAwb === priorityNum) {
          foundAgent = String(csSheet.raw[r]?.[COL_AGENTS] || '').trim();
          break;
        }
      }

      if (foundAgent) {
        sheets.priorityAgentMap[priorityNum] = foundAgent;
        if (!sheets.agentPriorityMap[foundAgent]) {
          sheets.agentPriorityMap[foundAgent] = [];
        }
        sheets.agentPriorityMap[foundAgent].push(priorityNum);
        sheets.priorityStatus[priorityNum] = 'pending';
      } else {
        sheets.priorityAgentMap[priorityNum] = null;
        sheets.priorityStatus[priorityNum] = 'unassigned';
      }
    });

    saveAgentSheets(sheets);
    setAgentSheets(sheets); // Update state immediately
    CHANNEL.postMessage({ type: "app:sync" });
    logAudit('priority_activate', { count: numbers.length });
    toast.success(`🚨 Priority Mode activated for ${numbers.length} AWBs!`);
  };

  const handleReassignPriority = (priorityNum, newAgent) => {
    const sheets = loadAgentSheets();

    // Remove from old agent's list
    const oldAgent = sheets.priorityAgentMap?.[priorityNum];
    if (oldAgent && sheets.agentPriorityMap?.[oldAgent]) {
      sheets.agentPriorityMap[oldAgent] = sheets.agentPriorityMap[oldAgent].filter((p) => p !== priorityNum);
    }

    // Add to new agent's list
    sheets.priorityAgentMap[priorityNum] = newAgent;
    if (!sheets.agentPriorityMap[newAgent]) {
      sheets.agentPriorityMap[newAgent] = [];
    }
    if (!sheets.agentPriorityMap[newAgent].includes(priorityNum)) {
      sheets.agentPriorityMap[newAgent].push(priorityNum);
    }

    // Update CS sheet to reflect new agent assignment for this AWB
    for (let r = 0; r < ROWS_COUNT; r++) {
      const rowAwb = String(csSheet.raw[r]?.[COL_AWB] || '').trim();
      if (rowAwb === priorityNum) {
        const newSheet = deepCopy(csSheet);
        newSheet.raw[r][COL_AGENTS] = newAgent;
        setCSSheet(newSheet);
        saveCSSheet(newSheet);
        break;
      }
    }

    saveAgentSheets(sheets);
    setAgentSheets(sheets); // Update state immediately
    CHANNEL.postMessage({ type: "app:sync" });
    toast.success(`Priority ${priorityNum} reassigned to ${newAgent}`);
  };



  const handleClearPriority = () => {
    setConfirmDialog({
      open: true,
      title: 'Clear Priority Mode',
      message: 'Deactivate Priority Mode and remove all priority assignments?',
      variant: 'warning',
      confirmText: 'Deactivate',
      onConfirm: async () => {
        const sheets = loadAgentSheets();
        sheets.priorityNumbers = "";
        sheets.priorityModeActive = false;
        sheets.agentPriorityMap = {};
        sheets.priorityAgentMap = {};
        sheets.priorityStatus = {};
        saveAgentSheets(sheets);
        setAgentSheets(sheets);
        setPriorityNumbers("");
        CHANNEL.postMessage({ type: "app:sync" });
        toast.success("Priority Mode deactivated");
        logAudit('priority_deactivate', {});
      }
    });
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
              <Button onClick={() => (window.location.href = '/AdminSettings') } variant="outline" className="font-bold">
                Settings
              </Button>
              <Button onClick={onLogout} variant="outline" className="font-bold bg.yellow-400/50 hover:bg-yellow-400/70 border-black/10">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="dashboard">
          <TabsList className="bg-white/80 border border-black/10 p-1 h-auto flex flex-wrap">
            {/* Role-based access guards: hide tabs if role permissions disabled */}
            <TabsTrigger value="dashboard" className="font-bold data-[state=active]:bg-yellow-400/60">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="cs-sheet" className="font-bold data-[state=active]:bg-yellow-400/60">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Master Sheet
            </TabsTrigger>
            <TabsTrigger value="agents" className="font-bold data-[state=active]:bg-yellow-400/60">
              <Users className="w-4 h-4 mr-2" />
              Agents ({agents?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="priority" className="font-bold data-[state=active]:bg-yellow-400/60">
              <Zap className="w-4 h-4 mr-2" />
              Priority
              {(() => {
                // Compute pending priority count: numbers not completed or downloaded state irrelevant
                const sheets = agentSheets || {};
                const statusMap = sheets.priorityStatus || {};
                const pendingCount = Object.values(statusMap).filter((s) => s !== 'completed').length;
                return pendingCount > 0 ?
                <Badge className="ml-2 bg-red-500 text-white">{pendingCount}</Badge> :
                null;
              })()}
            </TabsTrigger>
            <TabsTrigger value="uploads" className="font-bold data-[state=active]:bg-yellow-400/60">
              <Upload className="w-4 h-4 mr-2" />
              CS Uploads
              {(() => {
                const pending = (csUploads || []).filter((u) => !u.downloadedBy).length;
                return pending > 0 ?
                <Badge className="ml-2 bg-blue-500 text-white">{pending}</Badge> :
                null;
              })()}
            </TabsTrigger>
            {/* Example: disable Reports for agents via rolePerm (admin sees all here, but we store policy centrally) */}
            <TabsTrigger value="reports" className="font-bold data-[state=active]:bg-yellow-400/60">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="advanced" className="font-bold data-[state=active]:bg-yellow-400/60">
              <Zap className="w-4 h-4 mr-2" />
              Advanced Controls
            </TabsTrigger>
            <TabsTrigger value="settings" className="font-bold data-[state=active]:bg-yellow-400/60">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* CS Sheet Tab */}
          <TabsContent value="dashboard" className="mt-4">
            <Suspense fallback={<div className="text-sm text-black/50 p-6 text-center">Loading Real-time Dashboard…</div>}>
              <RealtimeAdminDashboard
                agents={agents}
                csSheet={csSheet}
                agentSheets={agentSheets}
                allAgentMetrics={allAgentMetrics}
                getAgentStatus={getAgentStatus}
                setSelectedAgent={setSelectedAgent}
                onTabChange={setActiveTab}
              />
            </Suspense>
          </TabsContent>

          <TabsContent value="cs-sheet" className="mt-4 space-y-4">
            {/* Analytics & Upload */}
            <Card className="bg-white/95 border-black/10 shadow-lg">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-4 flex-wrap">
                  <Badge className="bg-yellow-400 text-black font-black px-3 py-1">MASTER SHEET VIEW</Badge>
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
                    <Button
                      onClick={() => {
                        const allAwbs = [];
                        for (let r = 0; r < ROWS_COUNT; r++) {
                          const awb = String(csSheet.raw[r]?.[COL_AWB] || '').trim();
                          if (awb && /^\d{10}$/.test(awb)) allAwbs.push(awb);
                        }
                        navigator.clipboard.writeText(allAwbs.join('\n'));
                        toast.success(`📋 Copied ${allAwbs.length} AWBs`);
                      }}
                      variant="outline"
                      size="sm"
                      className="font-bold bg-purple-50 hover:bg-purple-100">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                      Copy All AWBs
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      className="hidden" />

                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      size="sm"
                      className="font-bold bg-green-50 hover:bg-green-100 border-green-300"
                      disabled={uploading}>

                      {uploading ?
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> :

                      <Upload className="w-4 h-4 mr-2" />
                      }
                      Upload
                    </Button>
                    <Button onClick={downloadAllCSData} variant="outline" size="sm" className="font-bold">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    <Suspense fallback={<div className="text-xs text-black/50">Loading report…</div>}>
                      <DailyReportDialog csSheet={csSheet} agents={agents} columns={CS_COLUMNS} />
                    </Suspense>
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
                    disabled={selectedRows.size === 0}>

                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear Selected ({selectedRows.size})
                  </Button>
                  <Button
                    onClick={handleDeleteSelected}
                    size="sm"
                    variant="outline"
                    className="font-bold text-red-600 hover:bg-red-50"
                    disabled={selectedRows.size === 0}>

                    <X className="w-4 h-4 mr-2" />
                    Delete Selected ({selectedRows.size})
                  </Button>
                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      onClick={() => setFastEditMode(!fastEditMode)}
                      size="sm"
                      variant={fastEditMode ? "default" : "outline"}
                      className={`font-bold ${fastEditMode ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}>

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
              fastEditMode={fastEditMode} />

          </TabsContent>

          {/* Agents Tab */}
          <TabsContent value="agents" className="mt-4 space-y-4">
            <Suspense fallback={<div className="text-sm text-black/50">Loading analytics…</div>}>
              <FreeAnalytics
                agents={agents}
                csSheet={csSheet}
                ROWS_COUNT={ROWS_COUNT}
                COL_AGENTS={COL_AGENTS}
                COL_AWB={COL_AWB}
                COL_LINE={COL_LINE}
                COL_REJ2={COL_REJ2}
                COL_REJ3={COL_REJ3}
                COL_REJ4={COL_REJ4}
                COL_REJ5={COL_REJ5}
                COL_REGION={COL_REGION} />

            </Suspense>

            
            <Suspense fallback={<div className="text-sm text-black/50">Loading performance dashboard…</div>}>
              <AgentPerformanceDashboard
                csSheet={csSheet}
                agents={agents}
                ROWS_COUNT={ROWS_COUNT}
                COL_AGENTS={COL_AGENTS}
                COL_AWB={COL_AWB}
                COL_LINE={COL_LINE}
                COL_REJ2={COL_REJ2}
                COL_REJ3={COL_REJ3}
                COL_REJ4={COL_REJ4}
                COL_REJ5={COL_REJ5} />

            </Suspense>

            
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
                      className="mt-1" />

                  </div>
                  <div>
                    <Label className="text-xs text-black/60">Agent Password</Label>
                    <Input
                      type="password"
                      value={newAgentPass}
                      onChange={(e) => setNewAgentPass(e.target.value)}
                      placeholder="Min 4 characters"
                      className="mt-1" />

                  </div>
                  <Button 
                    onClick={createAgent} 
                    disabled={creatingAgent}
                    className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold">
                    {creatingAgent ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Agent'
                    )}
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
                      className="mt-1" />

                  </div>
                  <div>
                    <Label className="text-xs text-black/60">CS Password</Label>
                    <Input
                      type="password"
                      value={newCSPass}
                      onChange={(e) => setNewCSPass(e.target.value)}
                      placeholder="Min 4 characters"
                      className="mt-1" />

                  </div>
                  <Button 
                    onClick={createCSAllocator}
                    disabled={creatingCS}
                    className="w-full bg-blue-400 hover:bg-blue-500 text-white font-bold">
                    {creatingCS ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create CS Allocator'
                    )}
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
                      <div className="text-center py-8">
                        <p className="text-sm text-black/50 mb-2">No agents created yet</p>
                        <Button 
                          onClick={async () => {
                            console.log('[DEBUG] Manual reload triggered');
                            try {
                              const list = await adn7.entities.AgentUser.list();
                              console.log('[DEBUG] Database contains:', list?.length, 'agents');
                              console.log('[DEBUG] Agent usernames:', list?.map(a => a.username));
                              setAgents((list || []).map((a) => ({ 
                                id: a.id,
                                username: a.username, 
                                password: a.password,
                                full_name: a.full_name,
                                email: a.email,
                                region: a.region,
                                notes: a.notes,
                                is_active: a.is_active
                              })));
                              toast.success(`Reloaded: ${list?.length || 0} agents found`);
                            } catch (e) {
                              console.error('[DEBUG] Reload failed:', e);
                              toast.error('Reload failed: ' + e.message);
                            }
                          }}
                          variant="outline"
                          size="sm"
                          className="font-bold"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Reload from Database
                        </Button>
                      </div>
                    ) : (
                    <div className="space-y-2">
                        {agents.map((agent) => {
                        const metrics = allAgentMetrics[agent.username.toLowerCase()] || { awb: 0, lineSum: 0, done: 0, rej: 0, totalDoneLines: 0, totalRejectedLines: 0 };
                        const agentBreak = csSheet.agentBreaks?.[agent.username];
                        const breakActive = agentBreak?.active && agentBreak?.start;
                        const breakType = breakActive ? BREAK_TYPES.find((b) => b.id === agentBreak.type) : null;
                        const breakDuration = breakActive && agentBreak.start ?
                        Math.floor((Date.now() - agentBreak.start) / 1000 / 60) : 0;

                        return (
                          <div key={agent.username} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <div className="font-bold">{agent.username}</div>
                                  {/* Live status badge + dot */}
                                  {(() => {
                                  const status = getAgentStatus(agent.username);
                                  const dotColor = status.label === 'Available' ? 'bg-green-500' : status.label === 'Busy' ? 'bg-blue-500' : 'bg-orange-500';
                                  return (
                                    <>
                                        <div className={`w-2 h-2 rounded-full ${dotColor} animate-pulse`} />
                                        <Badge className={`${status.classes} text-xs`}>{status.label}{status.label === 'On Break' && breakActive ? ` • ${breakDuration}m` : ''}</Badge>
                                      </>);

                                })()}
                                  {/* Detailed break type badge when on break */}
                                  {breakActive && breakType &&
                                <Badge className={`${breakType.color} text-[10px]`}>{breakType.label}</Badge>
                                }
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
                                className="font-bold bg-yellow-400/30 hover:bg-yellow-400/50">
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                size="sm"
                                variant="outline"
                                onClick={() => downloadAgentData(agent.username)}
                                className="font-bold">
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteAgent(agent.username)}
                                disabled={deletingUser === agent.username}
                                className="font-bold text-red-600 hover:bg-red-50">
                                  {deletingUser === agent.username ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            </div>);

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
                {csAllocators.length === 0 ?
                <p className="text-sm text-black/50 text-center py-4">No CS Allocators created yet</p> :

                <div className="grid md:grid-cols-3 gap-2">
                    {csAllocators.map((cs) =>
                  <div key={cs.username} className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-200">
                        <div className="font-bold">{cs.username}</div>
                        <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteCSAllocator(cs.username)}
                      disabled={deletingUser === cs.username}
                      className="font-bold text-red-600 hover:bg-red-50 h-7 w-7 p-0">
                          {deletingUser === cs.username ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                  )}
                  </div>
                }
              </CardContent>
            </Card>

            {/* Agent Profile View */}
            {selectedAgent &&
            <Card className="bg-white/95 border-black/10 shadow-lg">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-yellow-400 text-black font-black">AGENT PROFILE</Badge>
                      {(() => {
                      const s = getAgentStatus(selectedAgent);
                      const dc = s.label === 'Available' ? 'bg-green-500' : s.label === 'Busy' ? 'bg-blue-500' : 'bg-orange-500';
                      return <div className={`w-2 h-2 rounded-full ${dc} animate-pulse`} />;
                    })()}
                      <span className="font-bold text-lg">{selectedAgent}</span>
                      {/* Live break status on profile header */}
                      {(() => {
                      const b = csSheet.agentBreaks?.[selectedAgent];
                      if (b?.active && b?.start) {
                        const bt = BREAK_TYPES.find((t) => t.id === b.type);
                        const mins = Math.floor((Date.now() - b.start) / 60000);
                        return (
                          <Badge className={`${bt ? bt.color : 'bg-orange-100 text-orange-800 border-orange-300'} text-xs animate-pulse`}>
                              {bt?.label || 'On Break'} • {mins}m
                            </Badge>);

                      }
                      return null;
                    })()}
                      {(() => {
                      const m = allAgentMetrics[selectedAgent.toLowerCase()] || { awb: 0, lineSum: 0, done: 0, rej: 0, totalDoneLines: 0, totalRejectedLines: 0 };
                      const currentFilter = agentSheets.agentFilters?.[selectedAgent]?.region || "";
                      return (
                        <span className="text-sm text-black/50">
                            Pending: {m.awb} ({m.lineSum} lines) | Done: {m.done} ({m.totalDoneLines} lines) | Rej: {m.rej} ({m.totalRejectedLines} lines)
                            {currentFilter && ` | Region: ${currentFilter}`}
                          </span>);

                    })()}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Live status dot in header is above by the name */}
                      <Select
                      value={agentSheets.agentFilters?.[selectedAgent]?.region || ""}
                      onValueChange={(v) => {
                        applyRegionFilter(selectedAgent, v);
                        setRegionFilter(v);
                      }}>

                        <SelectTrigger className="w-[150px]">
                          <SelectValue placeholder="ALL REGIONS" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={null}>ALL REGIONS</SelectItem>
                          {getUniqueRegions(selectedAgent).map((r) =>
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                        )}
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
                  filterAgentUsername={selectedAgent} />

                </CardContent>
              </Card>
            }
          </TabsContent>

          {/* Priority Tab */}
          <TabsContent value="priority" className="mt-4 space-y-4">
            <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-300 shadow-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl font-bold flex items-center gap-3">
                  <Zap className="w-6 h-6 text-red-600" />
                  🚨 Priority Mode System
                </CardTitle>
                <p className="text-sm text-red-700 font-medium">
                  Enter priority AWB numbers (10 digits). System auto-detects which agent owns each AWB. Those agents will only see their priority AWBs until completed.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-white rounded-lg border-2 border-red-200">
                  <h3 className="font-bold text-red-900 mb-3">How It Works:</h3>
                  <ul className="text-sm space-y-2 text-gray-700">
                    <li>✓ Admin enters 10-digit priority numbers (AWBs)</li>
                    <li>✓ System scans CS sheet and finds which agent is assigned to each AWB</li>
                    <li>✓ Each agent only sees content where AWB matches their priority numbers</li>
                    <li>✓ All other content is hidden for that agent until they complete their priority AWBs</li>
                    <li>✓ Each agent progresses independently - content visibility is per-agent</li>
                    <li>✓ When agent completes all priority AWBs, all content unlocks instantly</li>
                  </ul>
                </div>

                <div>
                  <Label className="text-sm font-bold text-red-800">Priority AWB Numbers (10 digits each)</Label>
                  <p className="text-xs text-gray-600 mb-2">Paste one or multiple AWBs separated by comma, space, or new line</p>
                  <Textarea
                    value={priorityNumbers}
                    onChange={(e) => setPriorityNumbers(e.target.value)}
                    placeholder="5555451016&#10;4691674665&#10;7661702296&#10;4634127131"
                    className="mt-1 min-h-[120px] font-mono text-sm" />

                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleSetPriority}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black">

                    <Zap className="w-5 h-5 mr-2" />
                    ACTIVATE PRIORITY MODE
                  </Button>
                  <Button
                    onClick={handleClearPriority}
                    variant="outline"
                    className="font-bold">

                    Deactivate
                  </Button>
                </div>

                {agentSheets.priorityModeActive &&
                <Card className="bg-red-100 border-2 border-red-300">
                    <CardContent className="p-4">
                      <div className="font-bold text-red-900 mb-3 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        Priority Mode Active
                      </div>
                      
                      <ScrollArea className="max-h-[500px]">
                        <div className="space-y-2 pr-4">
                          {Object.entries(agentSheets.priorityAgentMap || {}).map(([priorityNum, agentName]) => {
                          const status = agentSheets.priorityStatus?.[priorityNum] || 'pending';
                          const isCompleted = status === 'completed';

                          // Check real-time status
                          let actionTaken = false;
                          let rowStatus = '';
                          for (let r = 0; r < ROWS_COUNT; r++) {
                            if (String(csSheet.raw[r]?.[COL_AWB] || '').trim() === priorityNum) {
                              rowStatus = csSheet.timers[r]?.state?.toUpperCase() || '';
                              actionTaken = rowStatus === 'DONE' || rowStatus === 'REJECTED' || csSheet.timers[r]?.start !== null;
                              break;
                            }
                          }

                          return (
                            <div
                              key={priorityNum}
                              className={`flex items-center gap-3 p-3 rounded border ${
                              isCompleted ? 'bg-green-50 border-green-300' : 'bg-white border-red-200'}`
                              }>

                                <div className="flex items-center gap-2 flex-1">
                                  {isCompleted ?
                                <CheckCircle2 className="w-5 h-5 text-green-600" /> :
                                <Clock className="w-5 h-5 text-orange-600" />
                                }
                                  <Badge className={`font-mono ${isCompleted ? 'bg-green-600' : 'bg-red-600'} text-white`}>
                                    {priorityNum}
                                  </Badge>

                                  {agentName ?
                                <Badge className="bg-yellow-400 text-black font-bold">
                                      {agentName}
                                    </Badge> :
                                <Badge variant="outline" className="text-red-600">
                                      Not Assigned
                                    </Badge>
                                }

                                  {!isCompleted && agentName &&
                                <Select value={agentName} onValueChange={(agent) => handleReassignPriority(priorityNum, agent)}>
                                      <SelectTrigger className="w-[140px] h-7 text-xs">
                                        <SelectValue placeholder="Reassign" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {agents.map((agent) =>
                                    <SelectItem key={agent.username} value={agent.username}>
                                            {agent.username}
                                          </SelectItem>
                                    )}
                                      </SelectContent>
                                    </Select>
                                }
                                </div>

                                <div className="flex items-center gap-2">
                                  {isCompleted ?
                                <Badge className="bg-green-600 text-white text-xs">
                                      ✓ COMPLETED
                                    </Badge> :
                                actionTaken ?
                                <Badge className="bg-blue-500 text-white text-xs">
                                        ⚡ IN PROGRESS
                                      </Badge> :
                                <Badge className="bg-orange-500 text-white text-xs">
                                        ⏳ PENDING
                                      </Badge>
                                }
                                </div>
                              </div>);

                        })}
                        </div>
                      </ScrollArea>

                      {/* Agent Summary */}
                      <div className="mt-4 pt-4 border-t border-red-300">
                        <h4 className="font-bold text-red-900 mb-2">Agent Overview:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {agents.map((agent) => {
                          const myPriorities = agentSheets.agentPriorityMap?.[agent.username] || [];
                          if (myPriorities.length === 0) return null;

                          const completed = myPriorities.filter((p) => agentSheets.priorityStatus?.[p] === 'completed').length;

                          return (
                            <div key={agent.username} className="p-2 bg-white rounded border border-red-200 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-yellow-400 text-black font-bold text-xs">
                                    {agent.username}
                                  </Badge>
                                  <span className="text-xs text-gray-600">
                                    {completed} / {myPriorities.length} done
                                  </span>
                                </div>
                                {completed === myPriorities.length ?
                              <CheckCircle2 className="w-4 h-4 text-green-600" /> :
                              <Clock className="w-4 h-4 text-orange-600" />
                              }
                              </div>);

                        })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                }
              </CardContent>
            </Card>
          </TabsContent>

          {/* CS Uploads Tab */}
          <TabsContent value="uploads" className="mt-4">
            <Card className="bg-white/95 border-black/10 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-lg font-bold">
                    <Upload className="w-5 h-5" />
                    CS Team Upload History
                  </div>
                  <Button 
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setConfirmDialog({
                        open: true,
                        title: 'Clear Upload History',
                        message: 'Are you sure you want to delete all CS upload records? This cannot be undone.',
                        variant: 'danger',
                        confirmText: 'Clear History',
                        onConfirm: () => {
                          const sheets = loadAgentSheets();
                          sheets.csUploads = [];
                          saveAgentSheets(sheets);
                          setCSUploads([]);
                          CHANNEL.postMessage({ type: "app:sync" });
                          toast.success("CS Upload history cleared.");
                        }
                      });
                    }}
                    disabled={csUploads.length === 0}
                  >
                    <Trash2 className="w-4 h-4 mr-2"/>
                    Clear History
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {csUploads.length === 0 ?
                <div className="text-center py-12 text-gray-500">
                    <Upload className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No uploads yet from CS team</p>
                  </div> :

                <ScrollArea className="h-[500px]">
                    <div className="space-y-3">
                      {csUploads.map((upload, idx) =>
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 rounded-lg border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors">

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
                              {upload.remarks &&
                          <div className="mt-2 text-sm text-gray-700 bg-white p-2 rounded border border-blue-200">
                                  <span className="font-semibold">Remarks:</span> {upload.remarks}
                                </div>
                          }
                              {upload.downloadedBy &&
                          <div className="mt-2 flex items-center gap-2 text-sm bg-green-50 p-2 rounded border border-green-200">
                                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                                  <div className="text-green-800">
                                    <div className="font-semibold">✓ Downloaded</div>
                                    <div className="text-xs">By {upload.downloadedBy} on {new Date(upload.downloadedAt).toLocaleString()}</div>
                                  </div>
                                </div>
                          }
                            </div>
                            <div className="flex flex-col gap-2">
                              {upload.fileData &&
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
                              const uploadIndex = sheets.csUploads.findIndex((u) =>
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
                            className="font-bold">

                                  <Download className="w-4 h-4 mr-1" />
                                  File
                                </Button>
                          }
                              {upload.downloadedBy ?
                          <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto" /> :

                          <Clock className="w-6 h-6 text-orange-500 mx-auto" />
                          }
                            </div>
                          </div>
                        </motion.div>
                    )}
                    </div>
                  </ScrollArea>
                }
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="mt-4">
            <Suspense fallback={<div className="text-sm text-black/50">Loading reports…</div>}>
              <AdvancedReportingModule
                csSheet={csSheet}
                agents={agents}
                ROWS_COUNT={ROWS_COUNT}
                COL_AGENTS={COL_AGENTS}
                COL_AWB={COL_AWB}
                COL_LINE={COL_LINE}
                COL_REJ2={COL_REJ2}
                COL_REJ3={COL_REJ3}
                COL_REJ4={COL_REJ4}
                COL_REJ5={COL_REJ5}
                COL_REGION={COL_REGION}
                COL_REASON={COL_REASON} />

            </Suspense>

          </TabsContent>

          {/* Advanced Controls Tab */}
          <TabsContent value="advanced" className="mt-4">
            <AdvancedAdminControls
              agents={agents}
              csSheet={csSheet}
              onUpdate={() => {
                setAgentSheets(loadAgentSheets());
                CHANNEL.postMessage({ type: "app:sync" });
              }}
              ROWS_COUNT={ROWS_COUNT}
              COL_AGENTS={COL_AGENTS}
              COL_AWB={COL_AWB} />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-4">
            {/* Maintenance Mode Control */}
            <Card className="bg-white/95 border-black/10 shadow-lg mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Shield className="w-5 h-5 text-orange-600" />
                  Maintenance Mode
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <Label className="font-bold text-lg">Enable Maintenance Mode</Label>
                      <p className="text-sm text-gray-600 mt-1">
                        Disables Agent and CS logins. Shows banner on login screen.
                      </p>
                    </div>
                    <Switch 
                      checked={maintenanceMode} 
                      onCheckedChange={setMaintenanceMode}
                      className="scale-125"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-bold">Banner Message</Label>
                    <Textarea
                      value={maintenanceBanner}
                      onChange={(e) => setMaintenanceBanner(e.target.value)}
                      placeholder="We are doing some updates in the app, We will get back soon..."
                      className="min-h-[80px]"
                    />
                  </div>

                  {maintenanceMode && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-300 rounded text-sm text-red-700 font-semibold">
                      ⚠️ Warning: All non-admin users will be immediately logged out when you save.
                    </div>
                  )}

                  <Button 
                    onClick={saveMaintenance} 
                    className="w-full mt-3 bg-orange-600 hover:bg-orange-700 text-white font-bold"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Maintenance Settings
                  </Button>
                </div>

                <div className="grid md:grid-cols-3 gap-3 pt-4 border-t">
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <div>
                      <Label className="font-bold">Admin Login</Label>
                      <p className="text-xs text-gray-600">Always enabled</p>
                    </div>
                    <Badge className="bg-green-100 text-green-800">ON</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <div>
                      <Label className="font-bold">Agent Login</Label>
                      <p className="text-xs text-gray-600">Controlled by maintenance</p>
                    </div>
                    <Badge className={maintenanceMode ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}>
                      {maintenanceMode ? "BLOCKED" : "ON"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <div>
                      <Label className="font-bold">CS Team Login</Label>
                      <p className="text-xs text-gray-600">Controlled by maintenance</p>
                    </div>
                    <Badge className={maintenanceMode ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}>
                      {maintenanceMode ? "BLOCKED" : "ON"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Live Sessions */}
            <Card className="bg-white/95 border-black/10 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Live Active Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600 mb-3">Users currently logged in</div>
                {liveSessions.length === 0 ? (
                  <p className="text-sm text-black/50">No active sessions</p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {liveSessions.sort((a,b) => (b.last_activity||0)-(a.last_activity||0)).map((s) => (
                      <div key={s.id} className="flex items-center justify-between p-3 rounded border bg-white">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-yellow-400 text-black font-bold">{s.username}</Badge>
                          <Badge variant="outline" className="text-xs">{s.role}</Badge>
                          <span className="text-xs text-gray-600">
                            Last: {Math.max(0, Math.round((Date.now()-(s.last_activity||0))/1000))}s ago
                          </span>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={async () => {
                            try {
                              const rows = await adn7.entities.AppState.filter({ state_key: 'active_sessions' });
                              const data = rows?.[0]?.data || {};
                              if (data[s.id]) {
                                data[s.id].kick = true;
                                await adn7.entities.AppState.update(rows[0].id, { data });
                                await adn7.entities.AuditLog.create({ 
                                  action: 'force_logout', 
                                  actor_username: session.username, 
                                  actor_role: 'admin', 
                                  details: JSON.stringify({ instance_id: s.id, username: s.username, role: s.role }), 
                                  timestamp: Date.now() 
                                });
                                toast.success('Logout signal sent');
                              }
                            } catch {}
                          }}
                          className="text-red-600 hover:bg-red-50"
                        >
                          Force Logout
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Admin Credentials moved after Maintenance Mode */}

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="bg-white/95 border-black/10 shadow-lg">
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
                </CardContent>
              </Card>

              <Card className="bg-white/95 border-black/10 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Recovery Email
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-black/60">Email Address</Label>
                    <Input
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="admin@company.com"
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Used for password recovery via OTP
                    </p>
                  </div>
                  <Button onClick={saveAdminEmail} className="w-full bg-blue-400 hover:bg-blue-500 text-white font-bold">
                    <Save className="w-4 h-4 mr-2" />
                    Save Email
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-white/95 border-black/10 shadow-lg mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold">Audit Log (latest)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-2">
                  <Input value={auditSearch} onChange={(e)=>setAuditSearch(e.target.value)} placeholder="Search by action, user, AWB, or details..." className="max-w-sm" />
                  <Button variant="outline" onClick={loadAudit} className="font-bold">Refresh</Button>
                </div>
                {filteredAuditLogs.length === 0 ? (
                  <p className="text-sm text-black/50">No audit entries yet.</p>
                ) : (
                  <ScrollArea className="h-[240px] pr-4">
                    <div className="space-y-2">
                      {filteredAuditLogs.map((log) => (
                        <div key={log.id} className="p-2 rounded border bg-white flex items-center justify-between">
                          <div className="text-sm">
                            <div className="font-bold">{log.action}</div>
                            <div className="text-xs text-gray-600">By {log.actor_username} ({log.actor_role}) • {new Date(log.created_date).toLocaleString()}</div>
                            {log.details && (
                              <div className="text-xs text-gray-700 mt-1 font-mono truncate">{log.details}</div>
                            )}
                          </div>
                          {log.target_type && (
                            <Badge variant="outline" className="text-xs">{log.target_type}:{log.target_identifier}</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* Backend Manager */}
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              {/* .env Manager */}
              <Card className="bg-white/95 border-black/10 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-bold">Environment (.env) Manager</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-black/60">ADMIN_DEFAULT_USERNAME</Label>
                      <Input value={envTemplate.ADMIN_DEFAULT_USERNAME} onChange={(e) => setEnvTemplate({ ...envTemplate, ADMIN_DEFAULT_USERNAME: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs text-black/60">ADMIN_DEFAULT_PASSWORD</Label>
                      <Input type="password" value={envTemplate.ADMIN_DEFAULT_PASSWORD} onChange={(e) => setEnvTemplate({ ...envTemplate, ADMIN_DEFAULT_PASSWORD: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs text-black/60">OTP_EXPIRY_MINUTES</Label>
                      <Input value={envTemplate.OTP_EXPIRY_MINUTES} onChange={(e) => setEnvTemplate({ ...envTemplate, OTP_EXPIRY_MINUTES: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs text-black/60">EMAIL_SENDER_NAME</Label>
                      <Input value={envTemplate.EMAIL_SENDER_NAME} onChange={(e) => setEnvTemplate({ ...envTemplate, EMAIL_SENDER_NAME: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={async () => {await adn7.functions.invoke('adminSettingsApi', { action: 'updateEnvTemplate', payload: envTemplate });toast.success('Env template saved');}}
                      className="font-bold bg-yellow-400 hover:bg-yellow-500 text-black">
                      <Save className="w-4 h-4 mr-2" /> Save Template
                    </Button>
                    <Button
                      variant="outline"
                      onClick={async () => {const res = await adn7.functions.invoke('adminSettingsApi', { action: 'downloadDotEnv' });const blob = new Blob([res.data], { type: 'text/plain' });const url = URL.createObjectURL(blob);const a = document.createElement('a');a.href = url;a.download = '.env';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);}}
                      className="font-bold">
                      <Download className="w-4 h-4 mr-2" /> Download .env
                    </Button>
                  </div>
                  <p className="text-xs text-black/50">Tip: Download and place this .env on your target platform.</p>

                  <div className="mt-4 pt-4 border-t">
                    <Label className="text-sm font-bold">Custom Variables</Label>
                    <p className="text-xs text-black/50 mb-2">Add any extra variables you need (they will be included in the downloaded .env).</p>

                    {Object.entries(envTemplate).filter(([k]) => !['ADMIN_DEFAULT_USERNAME', 'ADMIN_DEFAULT_PASSWORD', 'OTP_EXPIRY_MINUTES', 'EMAIL_SENDER_NAME'].includes(k)).length === 0 &&
                    <p className="text-xs text-black/40">No custom variables yet.</p>
                    }

                    {Object.entries(envTemplate).
                    filter(([k]) => !['ADMIN_DEFAULT_USERNAME', 'ADMIN_DEFAULT_PASSWORD', 'OTP_EXPIRY_MINUTES', 'EMAIL_SENDER_NAME'].includes(k)).
                    map(([k, v]) =>
                    <div key={k} className="grid md:grid-cols-5 gap-2 items-center mb-2">
                          <Input
                        value={k}
                        onChange={(e) => {
                          const newKey = e.target.value.trim();
                          setEnvTemplate((prev) => {
                            const next = { ...prev };
                            const val = next[k];
                            delete next[k];
                            next[newKey || k] = val;
                            return next;
                          });
                        }}
                        placeholder="KEY" />

                          <div className="md:col-span-3">
                            <Input
                          value={v}
                          onChange={(e) => setEnvTemplate((prev) => ({ ...prev, [k]: e.target.value }))}
                          placeholder="value" />

                          </div>
                          <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEnvTemplate((prev) => {const next = { ...prev };delete next[k];return next;})}
                        className="text-red-600 hover:bg-red-50">

                            <Trash2 className="w-4 h-4 mr-1" /> Remove
                          </Button>
                        </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEnvTemplate((prev) => ({ ...prev, ["CUSTOM_VAR_" + Date.now()]: '' }))}
                      className="mt-2">

                      <Plus className="w-4 h-4 mr-1" /> Add Variable
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Database Backup */}
              <Card className="bg-white/95 border-black/10 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-bold">Database Backup</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      onClick={async () => {const res = await adn7.functions.invoke('adminSettingsApi', { action: 'exportBackup' });const blob = new Blob([res.data], { type: 'application/json' });const url = URL.createObjectURL(blob);const a = document.createElement('a');a.href = url;a.download = 'backup.json';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);}}
                      className="font-bold">
                      <Download className="w-4 h-4 mr-2" /> Export Backup
                    </Button>
                    <input ref={backupFileInputRef} type="file" accept="application/json" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0];if (!file) return;setImportingBackup(true);
                      try {const text = await file.text();const backup = JSON.parse(text);await adn7.functions.invoke('adminSettingsApi', { action: 'importBackup', payload: { backup } });toast.success('Backup imported');CHANNEL.postMessage({ type: 'app:sync' });}
                      catch {toast.error('Invalid backup file');} finally
                      {setImportingBackup(false);e.target.value = '';}
                    }} />
                    <Button onClick={() => backupFileInputRef.current?.click()} className="font-bold bg-blue-600 hover:bg-blue-700 text-white" disabled={importingBackup}>
                      {importingBackup ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                      Import Backup
                    </Button>
                  </div>
                  <p className="text-xs text-black/50">Export/Import AdminConfig, AgentUser, CSUser, and AppState.</p>
                </CardContent>
              </Card>

              {/* Developer Bundle */}
              <Card className="bg-white/95 border-black/10 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-bold">Developer Bundle</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-black/60">Download entities schemas, function docs, and Client helper (admin-only).</p>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      onClick={async () => {const res = await adn7.functions.invoke('adminSettingsApi', { action: 'downloadDeveloperBundle' });const blob = new Blob([res.data], { type: 'application/json' });const url = URL.createObjectURL(blob);const a = document.createElement('a');a.href = url;a.download = 'developer_bundle.json';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);}}
                      className="font-bold">
                      <Download className="w-4 h-4 mr-2" /> Download Developer Bundle (JSON)
                    </Button>
                    <Button
                      variant="outline"
                      onClick={async () => {const res = await adn7.functions.invoke('adminSettingsApi', { action: 'downloadBackendZip' });const blob = new Blob([res.data], { type: 'application/zip' });const url = URL.createObjectURL(blob);const a = document.createElement('a');a.href = url;a.download = 'backend_bundle.zip';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);}}
                      className="font-bold">
                      <Download className="w-4 h-4 mr-2" /> Download Backend ZIP
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        onConfirm={confirmDialog.onConfirm} />
    </div>);

});

// ============================================================================
// CS ALLOCATOR DASHBOARD COMPONENT
// ============================================================================

const CSAllocatorDashboard = memo(({ username, onLogout }) => {
  const [csSheet, setCSSheet] = useState(loadCSSheet);
  const [refreshKey, setRefreshKey] = useState(0);
  const [myUploads, setMyUploads] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', onConfirm: () => {}, variant: 'warning' });
  const [rolePerm, setRolePerm] = useState({ cs_allocator: { allowUpload: true, allowClear: true, allowDownload: true } });

  useEffect(() => {
    const sheets = loadAgentSheets();
    const uploads = (sheets.csUploads || []).filter((u) => u.csUser === username);
    setMyUploads(uploads);
    // removed periodic local refresh; relying on pull loop for cross-device and ExcelSheet local tick
  }, [username]);

  // Load role permissions for CS Allocator
  useEffect(() => {
    (async () => {
      try {
        const rec = await pullAppState('role_permissions');
        const cfg = rec?.data;
        if (cfg?.cs_allocator) setRolePerm((prev)=>({ cs_allocator: { ...prev.cs_allocator, ...cfg.cs_allocator } }));
      } catch {}
    })();
  }, []);

  // Fallback sync disabled - long-poll handles everything
  useEffect(() => {
    return () => {};
  }, []);

  // Long-poll DISABLED - BroadcastChannel handles sync
  useEffect(() => {
    return () => {};
  }, []);

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
      if (ev?.data?.priorityCompleted) {
        toast.success(`🎉 All priority AWBs completed! Priority mode disabled.`, { duration: 5000 });
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
    newSheet.timers[r] = { ...(newSheet.timers[r] || {}), updatedAt: Date.now() };

    // CS confirmations are informational only; do not change rejection state or trigger blinks
    if (value.trim()) {

      // no-op: keep state as-is (REJECTED rows remain for CS view)
    }
    setCSSheet(newSheet);
    saveCSSheet(newSheet);
    // trigger instant cross-device update
    pushCSImmediate(newSheet);
    CHANNEL.postMessage({ type: "app:sync" });
  };

  const getRejectedCount = () => {
    return csSheet.raw.filter((row) => {
      const status = String(row[COL_STATUS] || '').toUpperCase();
      return status === 'REJECT' || status === 'REJECTED';
    }).length;
  };

  const downloadCSData = async () => {
    if (!rolePerm.cs_allocator?.allowDownload) { toast.error('Download is disabled by admin'); return; }
    const headers = CS_COLUMNS;
    const rejectedRows = csSheet.raw.filter((row) => {
      const status = String(row[COL_STATUS] || '').toUpperCase();
      return status === 'REJECT' || status === 'REJECTED';
    });
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rejectedRows]);
    XLSX.utils.book_append_sheet(wb, ws, 'CS Team Rejected');
    XLSX.writeFile(wb, `cs_team_rejected_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Downloaded rejected items");
    try { await adn7.entities.AuditLog.create({ action: 'cs_download_rejected', actor_username: username, actor_role: 'cs_allocator', target_type: 'file', target_identifier: `cs_team_rejected_${new Date().toISOString().split('T')[0]}.xlsx`, timestamp: Date.now() }); } catch {}
  };

  const handleClearSheet = () => {
    if (!rolePerm.cs_allocator?.allowClear) { toast.error('Clearing is disabled by admin'); return; }
    setConfirmDialog({
      open: true,
      title: 'Clear Rejected Items',
      message: 'Clear all rejected items from CS Team sheet? This will remove all REJECTED status rows.',
      variant: 'danger',
      confirmText: 'Clear All',
      onConfirm: async () => {
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
        pushCSImmediate(newSheet);
        CHANNEL.postMessage({ type: "app:sync" });
        toast.success('Cleared rejected items');
        try { await adn7.entities.AuditLog.create({ action: 'cs_clear_rejected', actor_username: username, actor_role: 'cs_allocator', target_type: 'cs_sheet', timestamp: Date.now() }); } catch {}
      }
    });
  };

  const handleUploadFile = async (e) => {
    if (!rolePerm.cs_allocator?.allowUpload) { toast.error('Upload is disabled by admin'); return; }
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
      try { await adn7.entities.AuditLog.create({ action: 'cs_upload', actor_username: username, actor_role: 'cs_allocator', target_type: 'file', target_identifier: file.name, timestamp: Date.now() }); } catch {}
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
                {myUploads.length > 0 &&
                <div className="flex items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-800">
                      {myUploads.length} uploads
                    </Badge>
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      {myUploads.filter((u) => u.downloadedBy).length} received
                    </Badge>
                    {myUploads.some((u) => !u.downloadedBy) &&
                  <Badge className="bg-orange-100 text-orange-800">
                        <Clock className="w-3 h-3 mr-1" />
                        {myUploads.filter((u) => !u.downloadedBy).length} pending
                      </Badge>
                  }
                  </div>
                }
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
                  id="cs-upload" />

                {rolePerm.cs_allocator.allowUpload && (
                  <Button
                    onClick={() => document.getElementById('cs-upload').click()}
                    variant="outline"
                    size="sm"
                    className="font-bold bg-green-50 hover:bg-green-100"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </Button>
                )}
                {rolePerm.cs_allocator.allowClear && (
                  <Button onClick={handleClearSheet} variant="outline" size="sm" className="font-bold bg-orange-50 hover:bg-orange-100">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear
                  </Button>
                )}
                {rolePerm.cs_allocator.allowDownload && (
                  <Button onClick={downloadCSData} variant="outline" size="sm" className="font-bold">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                )}
              </div>
            </div>
            <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-200">
              <b>CS Team View:</b> Shows ONLY rejected rows. You can upload/download and add confirmations for tracking; items stay in CS view until resolved by admin.
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
          blinkRows={csSheet.blinkRows} />

      </div>

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        onConfirm={confirmDialog.onConfirm} />
    </div>);

});

// ============================================================================
// AGENT DASHBOARD COMPONENT
// ============================================================================

const AgentDashboard = memo(({ username, onLogout }) => {
  const [csSheet, setCSSheet] = useState(loadCSSheet);
  const [agentSheets, setAgentSheets] = useState(loadAgentSheets);
  const [refreshKey, setRefreshKey] = useState(0);
  const [onBreak, setOnBreak] = useState(false);
  const [breakType, setBreakType] = useState(null);
  const [breakStart, setBreakStart] = useState(null);
  const [regionFilter, setRegionFilter] = useState("");
  const [priorityMode, setPriorityMode] = useState(false);
  const [priorityList, setPriorityList] = useState([]);
  const [rolePerm, setRolePerm] = useState({ agent: { allowCopyButtons: true, allowDownloadReport: true } });
  const [agentFilters, setAgentFilters] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showStartReminder, setShowStartReminder] = useState(false);
  const [showReleaseConfirm, setShowReleaseConfirm] = useState(false);
  const [pendingDoneRow, setPendingDoneRow] = useState(null);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [pendingRejectRow, setPendingRejectRow] = useState(null);
  const [missingRejectLabel, setMissingRejectLabel] = useState(null);
  const [forceRefresh, setForceRefresh] = useState(0);

  useEffect(() => {
    const sheets = loadAgentSheets();
    const filter = sheets.agentFilters?.[username]?.region || "";
    setRegionFilter(filter);
    setPriorityList(sheets);

    const currentSheet = loadCSSheet();
    const agentBreak = currentSheet.agentBreaks?.[username];
    if (agentBreak?.active && agentBreak?.start) {
      setOnBreak(true);
      setBreakType(agentBreak.type);
      setBreakStart(agentBreak.start);
    } else {
      setOnBreak(false);
      setBreakType(null);
      setBreakStart(null);
    }
    // removed periodic local refresh; relying on pull loop for cross-device and ExcelSheet local tick
  }, [username]);

  // Load role permissions for agent
  useEffect(() => {
    (async () => {
      try {
        const rec = await pullAppState('role_permissions');
        const cfg = rec?.data;
        if (cfg?.agent) setRolePerm((prev)=>({ agent: { ...prev.agent, ...cfg.agent } }));
      } catch {}
    })();
  }, []);

  // Fallback sync disabled - long-poll handles everything
  useEffect(() => {
    return () => {};
  }, []);

  // Long-poll DISABLED - BroadcastChannel handles sync
  useEffect(() => {
    return () => {};
  }, []);

  const handleBreakToggle = useCallback((type) => {
    const newSheet = deepCopy(csSheet);
    if (!newSheet.agentBreaks) newSheet.agentBreaks = {};

    const isEndingBreak = onBreak && breakType === type;

    if (isEndingBreak) {
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
      const breakLabel = BREAK_TYPES.find((b) => b.id === type)?.label || 'Break';
      toast.success(`${breakLabel} started`);
    }

    setCSSheet(newSheet);
    saveCSSheet(newSheet);
    pushCSImmediate(newSheet);

    // Send break update notification immediately
    CHANNEL.postMessage({
      type: "app:sync",
      breakUpdate: {
        agent: username,
        status: isEndingBreak ? 'ended' : 'started',
        type,
        timestamp: Date.now()
      }
    });
  }, [csSheet, onBreak, breakType, username]);

  useEffect(() => {
    const handleSync = (ev) => {
      if (ev?.data?.type === "app:sync") {
        const updated = loadCSSheet();
        setCSSheet(updated);
        const sheets = loadAgentSheets();
        setAgentSheets(sheets);

        // Update priority list
        setPriorityList(sheets);
        setForceRefresh((prev) => prev + 1);

        // Update break status from other tabs/sessions
        const agentBreak = updated.agentBreaks?.[username];
        if (agentBreak?.active && agentBreak?.start) {
          if (!onBreak) {
            setOnBreak(true);
            setBreakType(agentBreak.type);
            setBreakStart(agentBreak.start);
          }
        } else {
          if (onBreak) {
            setOnBreak(false);
            setBreakType(null);
            setBreakStart(null);
          }
        }

        // Check for cleared rejections (blink notification)
        if (updated.blinkRows) {
          Object.keys(updated.blinkRows).forEach((r) => {
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
  }, [username, onBreak]);

  const handleCellChange = useCallback((r, c, value) => {
    // Agent can only edit their assigned rows
    const agent = String(csSheet.raw[r]?.[COL_AGENTS] || '').trim().toLowerCase();
    if (agent !== username.toLowerCase()) return;

    if (!AGENT_EDITABLE.has(c)) return;

    const newSheet = deepCopy(csSheet);

    // Agent-side validations
    if (c === COL_LINE) {
      if (!isValidLineExpr(value)) {
        toast.error('LINE must be numbers separated by + (e.g., 2+3+5)');
        return;
      }
    }

    // Rejection reasons
    let newValue = value;
    if (c === COL_REJ2 || c === COL_REJ3 || c === COL_REJ4 || c === COL_REJ5) {
      if (!String(newValue || '').trim()) {
        toast.error('Rejection reason cannot be empty');
        return;
      }
    }

    newSheet.raw[r][c] = newValue;
    newSheet.timers[r] = { ...(newSheet.timers[r] || {}), updatedAt: Date.now() };
    setCSSheet(newSheet);
    saveCSSheet(newSheet);
    // trigger instant cross-device update
    pushCSImmediate(newSheet);
    CHANNEL.postMessage({ type: "app:sync" });
  }, [csSheet, username]);

  const handleStatusClick = useCallback((r, action) => {
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
        pushCSImmediate(newSheet);
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

      // Show release confirmation dialog
      setPendingDoneRow(r);
      setShowReleaseConfirm(true);
      return;
    }

    if (action === 'confirmDone') {
      const awb = newSheet.raw[r]?.[COL_AWB] || '';
      timer.doneClicks = (timer.doneClicks || 0) + 1;
      const doneCount = timer.doneClicks;
      timer.state = "DONE";
      timer.updatedAt = Date.now();
      timer.hidden = true;
      if (timer.start != null) {
        timer.elapsed = (timer.elapsed || 0) + (Date.now() - timer.start);
        timer.start = null;
      }
      
      // Instant state update first
      newSheet.timers[r] = timer;
      setCSSheet(newSheet);
      localStorage.setItem(CS_SHEET_KEY, JSON.stringify(newSheet));

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

      // Check if this AWB was a priority number for this agent
      const rowAwb = String(newSheet.raw[r]?.[COL_AWB] || '').trim();
      const myPriorityNumbers = sheets.agentPriorityMap?.[username] || [];

      if (myPriorityNumbers.includes(rowAwb)) {
        // Mark this priority number as completed
        sheets.priorityStatus[rowAwb] = 'completed';

        // Check if agent completed ALL their priority numbers
        const allMyPrioritiesCompleted = myPriorityNumbers.every((pNum) => {
          // Check if this priority number is completed
          for (let i = 0; i < ROWS_COUNT; i++) {
            const checkAwb = String(newSheet.raw[i]?.[COL_AWB] || '').trim();
            if (checkAwb === pNum) {
              const state = newSheet.timers[i]?.state?.toUpperCase() || '';
              return state === 'DONE' || state === 'REJECTED';
            }
          }
          return false;
        });

        if (allMyPrioritiesCompleted) {
          // Remove this agent from priority mode
          delete sheets.agentPriorityMap[username];
          saveAgentSheets(sheets);
          setAgentSheets(sheets);
          setForceRefresh((prev) => prev + 1);
          toast.success(`✅ All priority AWBs completed! Showing all content now.`, { duration: 5000 });
          CHANNEL.postMessage({ type: "app:sync" });
        } else {
          saveAgentSheets(sheets);
        }
      } else {
        saveAgentSheets(sheets);
      }

      // Persist and sync
      saveCSSheet(newSheet);
      pushCSImmediate(newSheet);
      CHANNEL.postMessage({ type: "app:sync" });
      
      toast.success(`✅ AWB ${awb} marked as DONE (Total Done: ${doneCount})`, { duration: 4000 });
      return;

      // Check if all rows in current region filter are done
      const currentFilter = sheets.agentFilters?.[username]?.region;
      if (currentFilter) {
        let allDone = true;
        for (let i = 0; i < ROWS_COUNT; i++) {
          const rowAgent = String(newSheet.raw[i]?.[COL_AGENTS] || '').trim().toLowerCase();
          const rowRegion = String(newSheet.raw[i]?.[COL_REGION] || '').trim().toUpperCase();
          const rowState = newSheet.timers[i]?.state?.toUpperCase() || '';

          if (rowAgent === username.toLowerCase() && (
          rowRegion === currentFilter.toUpperCase() || rowRegion.includes(currentFilter.toUpperCase())) &&
          !(rowState === 'DONE' || rowState === 'REJECTED')) {
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
      const rej2 = String(newSheet.raw[r]?.[COL_REJ2] || '').trim();
      const rej3 = String(newSheet.raw[r]?.[COL_REJ3] || '').trim();
      const rej4 = String(newSheet.raw[r]?.[COL_REJ4] || '').trim();
      const rej5 = String(newSheet.raw[r]?.[COL_REJ5] || '').trim();

      // New rule: require at least ONE rejection reason; if none, prompt to fill 2nd
      const anyReason = !!rej2 || !!rej3 || !!rej4 || !!rej5;
      if (!anyReason) {
        setMissingRejectLabel('2ND REJECTION');
        setPendingRejectRow(r);
        setShowRejectConfirm(true);
        return;
      }

      // A reason exists → proceed to reject immediately
      handleStatusClick(r, 'confirmReject');
      return;
    }

    if (action === 'confirmReject') {
      timer.rejClicks = (timer.rejClicks || 0) + 1;
      timer.state = "REJECTED";
      timer.updatedAt = Date.now();
      timer.hidden = true;
      newSheet.raw[r][COL_STATUS] = "REJECT";
      if (!newSheet.raw[r][COL_AGENT2]?.trim()) {
        newSheet.raw[r][COL_AGENT2] = username;
      }
      
      // Instant state update first
      newSheet.timers[r] = timer;
      setCSSheet(newSheet);
      localStorage.setItem(CS_SHEET_KEY, JSON.stringify(newSheet));

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

      if (!newSheet.blinkRows) newSheet.blinkRows = {};
      newSheet.blinkRows[r] = true;
      
      // Persist and sync
      saveCSSheet(newSheet);
      pushCSImmediate(newSheet);
      CHANNEL.postMessage({
        type: "app:sync",
        rejectionNotification: { agent: username, awb: awb, timestamp: new Date().toISOString() }
      });
      
      toast.error(`❌ AWB ${awb} rejected`);
      
      setTimeout(() => {
        const updated = loadCSSheet();
        if (updated.blinkRows) {
          updated.blinkRows[r] = false;
          saveCSSheet(updated);
          CHANNEL.postMessage({ type: "app:sync" });
        }
      }, 5000);
      return;
    }
  }, [csSheet, username]);

  const getAgentMetrics = useMemo(() => {
    let awbPending = 0,lineSumPending = 0,done = 0,rej = 0,totalDone = 0,totalRejected = 0,totalDoneLines = 0,totalRejectedLines = 0;

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

      // Apply priority mode filter for pending
      const myPriorityNumbers = agentSheets.agentPriorityMap?.[username] || [];
      const priorityModeActive = agentSheets.priorityModeActive && myPriorityNumbers.length > 0;

      if (priorityModeActive) {
        const rowAwb = String(csSheet.raw[r]?.[COL_AWB] || '').trim();
        if (!myPriorityNumbers.includes(rowAwb)) continue;
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
  }, [csSheet, username, agentSheets]);

  const metrics = getAgentMetrics;

  const agentDisplayData = React.useMemo(() => {
    if (!agentFilters) return { raw: csSheet.raw, timers: csSheet.timers };
    let items = csSheet.raw.map((row, idx) => ({ row, idx, timer: csSheet.timers[idx] }));

    // Date range filter
    if (agentFilters.dateFrom || agentFilters.dateTo) {
      const from = agentFilters.dateFrom ? new Date(agentFilters.dateFrom + 'T00:00:00').getTime() : null;
      const to = agentFilters.dateTo ? new Date(agentFilters.dateTo + 'T23:59:59').getTime() : null;
      items = items.filter((item) => {
        const t = item.timer?.updatedAt ?? (item.timer?.start || null);
        if (!t) return false;
        if (from && t < from) return false;
        if (to && t > to) return false;
        return true;
      });
    }

    // Status filter
    if (agentFilters.statuses) {
      const wantPending = !!agentFilters.statuses.pending;
      const wantDone = !!agentFilters.statuses.done;
      const wantRejected = !!agentFilters.statuses.rejected;
      items = items.filter((item) => {
        const st = String(item.timer?.state || item.row[COL_STATUS] || '').toUpperCase();
        const isDone = st === 'DONE';
        const isRejected = st === 'REJECTED' || st === 'REJECT';
        const hasAwb = !!String(item.row[COL_AWB] || '').trim();
        const isPending = !isDone && !isRejected && hasAwb;
        return (isPending && wantPending) || (isDone && wantDone) || (isRejected && wantRejected);
      });
    }

    // Sorting
    if (agentFilters.sortColumns && agentFilters.sortColumns.length > 0) {
      items.sort((a, b) => {
        for (const sort of agentFilters.sortColumns) {
          if (!sort.column) continue;
          const colIdx = AGENT_COLUMNS.indexOf(sort.column);
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

    // Build fixed-size arrays for grid
    const result = Array(ROWS_COUNT).fill(null).map(() => Array(AGENT_COLUMNS.length).fill(''));
    const resultTimers = Array(ROWS_COUNT).fill(null).map(() => ({ elapsed: 0, start: null, doneClicks: 0, rejClicks: 0, state: "" }));
    items.forEach((item, newIdx) => {
      if (newIdx < ROWS_COUNT) {
        result[newIdx] = item.row;
        resultTimers[newIdx] = item.timer;
      }
    });
    return { raw: result, timers: resultTimers };
  }, [agentFilters, csSheet]);

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
                {onBreak &&
                <Badge className="bg-orange-400 text-white font-black border-orange-500 animate-pulse">
                    ON BREAK • {getBreakDuration()}m
                  </Badge>
                }
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end">
                {BREAK_TYPES.map((bt) => {
                  const Icon = bt.icon;
                  const isActive = onBreak && breakType === bt.id;
                  return (
                    <Button
                      key={bt.id}
                      onClick={() => handleBreakToggle(bt.id)}
                      size="sm"
                      variant="outline"
                      className={`font-bold transition-all ${isActive ? bt.color + ' border-2' : 'bg-white hover:bg-gray-50'}`}>

                      {isActive ? <Pause className="w-4 h-4 mr-1" /> : <Icon className="w-4 h-4 mr-1" />}
                      {bt.label}
                    </Button>);

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
            {agentSheets.priorityModeActive && agentSheets.agentPriorityMap?.[username]?.length > 0 &&
            <div className="mb-3 p-3 bg-red-100 border-2 border-red-500 rounded-lg animate-pulse">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-red-600" />
                  <span className="font-black text-red-900">
                    🚨 PRIORITY MODE: {agentSheets.agentPriorityMap[username].length} priority AWBs assigned - Complete these first!
                  </span>
                </div>
              </div>
            }
            <div className="flex items-center gap-4 flex-wrap mb-2">
              <Badge className="bg-yellow-400 text-black font-black px-3 py-1">AGENT VIEW ({username})</Badge>
              {agentSheets.priorityModeActive && agentSheets.agentPriorityMap?.[username]?.length > 0 &&
              <Badge className="bg-red-600 text-white font-black animate-pulse">
                  <Zap className="w-3 h-3 mr-1" />
                  PRIORITY MODE
                </Badge>
              }
              {regionFilter &&
              <Badge className="bg-blue-100 text-blue-800 font-bold">Region: {regionFilter}</Badge>
              }
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-black/10">
                <span className="text-sm font-medium">Pending:</span>
                <span className="font-mono font-bold">{getAgentMetrics.awb}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-black/10">
                <span className="text-sm font-medium">:</span>
                <span className="font-mono font-bold">{getAgentMetrics.lineSum}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200">
                <span className="text-sm font-medium text-green-800">DONE:</span>
                <span className="font-mono font-bold text-green-800">{getAgentMetrics.done}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200">
                <span className="text-sm font-medium text-green-800">Done Lines:</span>
                <span className="font-mono font-bold text-green-800">{getAgentMetrics.totalDoneLines}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200">
                <span className="text-sm font-medium text-red-800">REJECTED:</span>
                <span className="font-mono font-bold text-red-800">{getAgentMetrics.rej}</span>
              </div>

              {rolePerm.agent.allowCopyButtons && (
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
                className="font-bold bg-green-50 hover:bg-green-100">

                Copy Done
              </Button>
              )}
              {rolePerm.agent.allowCopyButtons && (
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
                className="font-bold bg-red-50 hover:bg-red-100">

                Copy Reject
              </Button>
              )}
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))}
                  variant="outline"
                  size="sm"
                  className="font-bold">

                  Zoom -
                </Button>
                <span className="text-sm font-mono font-bold">{zoomLevel}%</span>
                <Button
                  onClick={() => setZoomLevel(Math.min(150, zoomLevel + 10))}
                  variant="outline"
                  size="sm"
                  className="font-bold">

                  Zoom +
                </Button>
              </div>
              {rolePerm.agent.allowDownloadReport && (
                            <Button
                               onClick={async () => {
                  const sheets = loadAgentSheets();
                  const stats = sheets.agentStats?.[username] || { done: [], rejected: [] };
                  const XLSX = await import('xlsx');
                  const wb = XLSX.utils.book_new();

                  // Done sheet
                  const doneData = [['AWB', 'LINE', 'LOT', 'REGION', 'TIMESTAMP']];
                  stats.done.forEach((item) => doneData.push([item.awb, item.line, item.lot, item.region, item.timestamp]));
                  const doneWs = XLSX.utils.aoa_to_sheet(doneData);
                  XLSX.utils.book_append_sheet(wb, doneWs, 'Done');

                  // Rejected sheet
                  const rejData = [['AWB', 'LINE', 'LOT', 'REGION', 'REASON', 'TIMESTAMP']];
                  stats.rejected.forEach((item) => rejData.push([item.awb, item.line, item.lot, item.region, item.reason, item.timestamp]));
                  const rejWs = XLSX.utils.aoa_to_sheet(rejData);
                  XLSX.utils.book_append_sheet(wb, rejWs, 'Rejected');

                  XLSX.writeFile(wb, `${username}_tracking_${new Date().toISOString().split('T')[0]}.xlsx`);
                  toast.success('Downloaded tracking report');
                }}
                variant="outline"
                size="sm"
                className="font-bold ml-auto">

                <Download className="w-4 h-4 mr-2" />
                My Report
              </Button>
              )}
            </div>
            <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-200">
              {agentSheets.priorityModeActive && agentSheets.agentPriorityMap?.[username]?.length > 0 ?
              <b>🚨 PRIORITY MODE: Only showing your {agentSheets.agentPriorityMap[username].length} priority AWBs. All other content hidden until these are completed.</b> :

              "Only your assigned rows shown. Fill rejection reason before clicking REJECT. Region filter auto-clears when all items done."
              }
            </div>
          </CardContent>
        </Card>

        {/* Agent Sheet - Optimized */}
        <ExcelSheet
          columns={AGENT_COLUMNS}
          data={agentDisplayData.raw}
          timers={agentDisplayData.timers}
          onCellChange={handleCellChange}
          onStatusClick={handleStatusClick}
          isAdmin={false}
          agentUsername={username}
          editableCols={AGENT_EDITABLE}
          blinkRows={csSheet.blinkRows}
          regionFilter={regionFilter}
          priorityList={priorityList}
          zoomLevel={zoomLevel} />


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

        {/* Release Confirmation Dialog */}
        <Dialog open={showReleaseConfirm} onOpenChange={setShowReleaseConfirm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-blue-600">
                <CheckCircle2 className="w-6 h-6" />
                Confirmation
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-center text-lg font-medium text-gray-700">
                Please check the number is <span className="text-green-600 font-bold">Released</span> before marking as done.
              </p>
            </div>
            <DialogFooter className="flex gap-2">
              <Button
                onClick={() => {
                  setShowReleaseConfirm(false);
                  setPendingDoneRow(null);
                }}
                variant="outline"
                className="flex-1 font-bold">

                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowReleaseConfirm(false);
                  if (pendingDoneRow !== null) {
                    handleStatusClick(pendingDoneRow, 'confirmDone');
                  }
                  setPendingDoneRow(null);
                }}
                className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black font-bold">

                OK
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Confirmation Dialog */}
        <Dialog open={showRejectConfirm} onOpenChange={setShowRejectConfirm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="w-6 h-6" />
                ⚠️ Put Reason in Rejection Row
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-center text-lg font-medium text-gray-700">
                Please put the reason in the {missingRejectLabel || 'rejection row'} before marking as REJECT
              </p>
            </div>
            <DialogFooter className="flex gap-2">
              <Button
                onClick={() => {
                  setShowRejectConfirm(false);
                  setPendingRejectRow(null);
                  setMissingRejectLabel(null);
                }}
                variant="outline"
                className="flex-1 font-bold">

                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowRejectConfirm(false);
                  if (!missingRejectLabel && pendingRejectRow !== null) {
                    handleStatusClick(pendingRejectRow, 'confirmReject');
                  }
                  setPendingRejectRow(null);
                  setMissingRejectLabel(null);
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold">

                OK
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
        </div>);

});

AdminDashboard.displayName = 'AdminDashboard';
CSAllocatorDashboard.displayName = 'CSAllocatorDashboard';
AgentDashboard.displayName = 'AgentDashboard';

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

export default function DHLSheet() {
  const [session, setSession] = useState({ role: null, username: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const state = loadState();
    if (state.session?.role) setSession(state.session);
    setLoading(false);
  }, []);



  const handleLogin = (role, username) => {
    setSession({ role, username });
    const local = loadState();
    local.session = { role, username };
    saveState(local);
    CHANNEL.postMessage({ type: 'app:sync' });
    markSessionLogin(role, username);
  };

  const handleLogout = () => {
    const state = loadState();
    const currentUsername = state.session.username;
    const currentRole = state.session.role;

    // Preserve break status on logout so admin can still see it
    if (currentRole === 'agent' && currentUsername) {
      CHANNEL.postMessage({
        type: "app:sync",
        agentLogout: { agent: currentUsername, timestamp: Date.now() }
      });
    }

    state.session = { role: null, username: null };
    saveState(state);
    setSession({ role: null, username: null });
    markSessionLogout();
    CHANNEL.postMessage({ type: 'app:sync' });
  };

  useEffect(() => {
    if (!session.role) return;
    const id = setInterval(() => { markSessionHeartbeat(); checkKickAndLogout(handleLogout); }, 60000);
    checkKickAndLogout(handleLogout);
    const onBeforeUnload = () => { markSessionLogout(); };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => { clearInterval(id); window.removeEventListener('beforeunload', onBeforeUnload); };
  }, [session.role]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        background: `linear-gradient(180deg, #fff 0%, #fff7d1 100%)`
      }}>
        <div className="flex items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-yellow-500" />
          <span className="font-bold text-lg">Loading...</span>
        </div>
      </div>);

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