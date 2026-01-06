import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Lock, User, Loader2, AlertCircle, CheckCircle2, KeyRound, Shield, Users, Briefcase } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { base44 as adn7 } from '@/api/base44Client';

export default function UnifiedLoginPortal({ onLoginSuccess, loadState, saveState }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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
  const [maintenance, setMaintenance] = useState(false);
  const [banner, setBanner] = useState("");

  useEffect(() => {
    let stopped = false;
    const fetchCfg = async () => {
      try {
        const cfgs = await adn7.entities.AdminConfig.filter({ config_key: 'main' });
        const cfg = (cfgs || [])[0];
        if (!stopped && cfg) {
          setMaintenance(!!cfg.maintenance_mode);
          setBanner(String(cfg.banner_message || '').trim());
        }
      } catch {}
    };
    fetchCfg();
    const id = setInterval(fetchCfg, 3000);
    return () => { stopped = true; clearInterval(id); };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const state = loadState();
      
      // Check Admin
      if (username === state.admin.username && password === state.admin.password) {
        state.session = { role: 'admin', username: state.admin.username };
        saveState(state);
        toast.success("Welcome, Admin!");
        onLoginSuccess('admin', state.admin.username);
        return;
      }

      // Check CS Allocator
      if (maintenance) {
        setError("Maintenance mode is active. Only admin can sign in right now.");
        return;
      }
      const csUser = state.csAllocators.find(
        cs => cs.username === username && cs.password === password
      );
      if (csUser) {
        state.session = { role: 'cs', username: csUser.username };
        saveState(state);
        toast.success("Welcome, CS Allocator!");
        onLoginSuccess('cs', csUser.username);
        return;
      }

      // Check Agent
      const agentUser = state.agents.find(
        agent => agent.username === username && agent.password === password
      );
      if (agentUser) {
        state.session = { role: 'agent', username: agentUser.username };
        saveState(state);
        toast.success("Welcome, Agent!");
        onLoginSuccess('agent', agentUser.username);
        return;
      }

      setError("Invalid username or password");
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (!forgotEmail.trim()) {
      setError("Please enter your email address");
      return;
    }

    setSendingOTP(true);
    setError("");

    try {
      const state = loadState();
      const savedEmail = state.admin.email || "";
      
      if (!savedEmail) {
        setError("No recovery email configured. Please contact admin.");
        setSendingOTP(false);
        return;
      }
      
      if (forgotEmail.toLowerCase() !== savedEmail.toLowerCase()) {
        setError("Email does not match registered email");
        setSendingOTP(false);
        return;
      }

      const response = await adn7.functions.invoke('sendOTP', { email: forgotEmail });

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
    if (!otpCode.trim()) {
      setError("Please enter the OTP code");
      return;
    }
    if (!newPassword.trim() || !confirmPassword.trim()) {
      setError("Please fill all password fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }

    setVerifyingOTP(true);
    setError("");

    try {
      const response = await adn7.functions.invoke('verifyOTP', {
        email: forgotEmail,
        otp: otpCode,
        newPassword: newPassword
      });

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

  const roleIcons = {
    admin: <Shield className="w-5 h-5" />,
    cs: <Users className="w-5 h-5" />,
    agent: <Briefcase className="w-5 h-5" />
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-1/4 -left-20 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-1/4 -right-20 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.5, 0.3, 0.5],
          }}
          transition={{ duration: 8, repeat: Infinity, delay: 1 }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-500/20 rounded-full blur-3xl"
          animate={{
            rotate: [0, 360],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:4rem_4rem]" />

      {/* Login Container */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {/* Logo/Brand */}
          <motion.div 
            className="text-center mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <motion.div
              className="inline-block"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <div className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text text-transparent">
                <h1 className="text-5xl font-black tracking-tight">DHL Sheet</h1>
              </div>
            </motion.div>
            <p className="text-gray-400 mt-2 text-sm font-medium">Unified Authentication Portal</p>
          </motion.div>

          {maintenance && (
            <div className="mb-4 rounded-lg border border-yellow-300 bg-yellow-100/90 text-yellow-900 p-3 text-sm font-semibold shadow">
              {banner || 'We are doing some updates in the app, We will get back soon...'}
            </div>
          )}
          {/* Login Card */}
          <Card className="backdrop-blur-2xl bg-white/10 border-white/20 shadow-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            
            <div className="relative p-8">
              {!showForgotPassword ? (
                <motion.form
                  onSubmit={handleLogin}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  {/* Header */}
                  <div className="text-center space-y-2 mb-8">
                    <motion.div
                      className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 border border-yellow-400/30 mb-4"
                      whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                      transition={{ duration: 0.5 }}
                    >
                      <Lock className="w-8 h-8 text-yellow-400" />
                    </motion.div>
                    <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
                    <p className="text-gray-400 text-sm">Sign in to continue to your dashboard</p>
                  </div>

                  {/* Error Message */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center gap-2 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm"
                      >
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Username Field */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Username</label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-purple-400/20 rounded-lg blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-yellow-400 transition-colors" />
                        <Input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="pl-11 h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400/50 focus:bg-white/10 transition-all"
                          placeholder="Enter your username"
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Password</label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-purple-400/20 rounded-lg blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-yellow-400 transition-colors" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-11 pr-11 h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400/50 focus:bg-white/10 transition-all"
                          placeholder="Enter your password"
                          disabled={isLoading}
                        />
                        <motion.button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-yellow-400 transition-colors"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </motion.button>
                      </div>
                    </div>
                  </div>

                  {/* Forgot Password Link */}
                  <div className="flex justify-end">
                    <motion.button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-sm text-yellow-400 hover:text-yellow-300 font-medium transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Forgot Password?
                    </motion.button>
                  </div>

                  {/* Login Button */}
                  <Button
                    type="submit"
                    disabled={isLoading || !username || !password}
                    className="w-full h-12 bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-black font-bold rounded-lg shadow-lg shadow-yellow-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all relative overflow-hidden group"
                  >
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0"
                      initial={{ x: "-100%" }}
                      whileHover={{ x: "100%" }}
                      transition={{ duration: 0.6 }}
                    />
                    <span className="relative flex items-center justify-center gap-2">
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Signing In...
                        </>
                      ) : (
                        <>
                          <Lock className="w-5 h-5" />
                          Sign In
                        </>
                      )}
                    </span>
                  </Button>

                  {/* Role Indicators */}
                  <div className="pt-4 border-t border-white/10">
                    <p className="text-xs text-gray-400 text-center mb-3">Supported Roles</p>
                    <div className="flex justify-center gap-4">
                      {Object.entries(roleIcons).map(([role, icon]) => (
                        <motion.div
                          key={role}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10"
                          whileHover={{ scale: 1.05, backgroundColor: "rgba(255, 255, 255, 0.1)" }}
                        >
                          <div className="text-yellow-400">{icon}</div>
                          <span className="text-xs text-gray-300 capitalize">{role}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.form>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  {/* Back Button */}
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setForgotStep("email");
                      setError("");
                    }}
                    className="text-gray-400 hover:text-white mb-4"
                  >
                    ← Back to Login
                  </Button>

                  {/* Header */}
                  <div className="text-center space-y-2 mb-8">
                    <motion.div
                      className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-400/20 to-purple-600/20 border border-purple-400/30 mb-4"
                      whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                      transition={{ duration: 0.5 }}
                    >
                      <KeyRound className="w-8 h-8 text-purple-400" />
                    </motion.div>
                    <h2 className="text-2xl font-bold text-white">Reset Password</h2>
                    <p className="text-gray-400 text-sm">
                      {forgotStep === "email" ? "Enter your email to receive OTP" : "Verify OTP and set new password"}
                    </p>
                  </div>

                  {/* Error Message */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center gap-2 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm"
                      >
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {forgotStep === "email" ? (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Email Address</label>
                        <Input
                          type="email"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-purple-400/50 focus:bg-white/10"
                          placeholder="admin@company.com"
                        />
                      </div>
                      <Button
                        onClick={handleSendOTP}
                        disabled={sendingOTP}
                        className="w-full h-12 bg-gradient-to-r from-purple-400 to-purple-600 hover:from-purple-500 hover:to-purple-700 text-white font-bold rounded-lg shadow-lg shadow-purple-500/50"
                      >
                        {sendingOTP ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            Sending OTP...
                          </>
                        ) : (
                          "Send OTP"
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">OTP Code</label>
                        <Input
                          type="text"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-purple-400/50 focus:bg-white/10 text-center text-2xl tracking-widest"
                          placeholder="000000"
                          maxLength={6}
                        />
                        <p className="text-xs text-gray-400 text-center">
                          Attempts remaining: {remainingAttempts}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">New Password</label>
                        <Input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-purple-400/50 focus:bg-white/10"
                          placeholder="Enter new password"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Confirm Password</label>
                        <Input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-purple-400/50 focus:bg-white/10"
                          placeholder="Confirm new password"
                        />
                      </div>
                      <Button
                        onClick={handleVerifyOTP}
                        disabled={verifyingOTP}
                        className="w-full h-12 bg-gradient-to-r from-purple-400 to-purple-600 hover:from-purple-500 hover:to-purple-700 text-white font-bold rounded-lg shadow-lg shadow-purple-500/50"
                      >
                        {verifyingOTP ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            Verifying...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-5 h-5 mr-2" />
                            Reset Password
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </Card>

          {/* Footer */}
          <motion.div
            className="text-center mt-6 text-gray-400 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <p>© 2026 DHL Sheet. All rights reserved.</p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}