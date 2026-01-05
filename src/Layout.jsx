import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function Layout({ children, currentPageName }) {
  // Force HTTPS in production
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      const isLocal = host === 'localhost' || host === '127.0.0.1';
      if (window.location.protocol === 'http:' && !isLocal) {
        const newUrl = 'https://' + window.location.host + window.location.pathname + window.location.search + window.location.hash;
        window.location.replace(newUrl);
      }
    }
  }, []);

  const [maintenance, setMaintenance] = useState(false);
  const [banner, setBanner] = useState('');

  // Poll admin config for maintenance/banner (fast, small payload)
  useEffect(() => {
    let stopped = false;
    const fetchCfg = async () => {
      try {
        const cfgs = await base44.entities.AdminConfig.filter({ config_key: 'main' });
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

  // Auto-logout non-admin users while maintenance is ON
  useEffect(() => {
    if (!maintenance) return;
    try {
      const raw = localStorage.getItem('DHL_LOGIN_DEMO_V1');
      if (!raw) return;
      const state = JSON.parse(raw);
      const role = state?.session?.role;
      if (role && role !== 'admin') {
        state.session = { role: null, username: null };
        localStorage.setItem('DHL_LOGIN_DEMO_V1', JSON.stringify(state));
        // Give the banner a tick to render first
        setTimeout(() => { window.location.reload(); }, 200);
      }
    } catch {}
  }, [maintenance]);

  return (
    <div className="min-h-screen">
      {maintenance && (
        <div className="w-full bg-yellow-400 text-black font-semibold text-sm text-center py-2 border-b border-black/10">
          {banner || 'We are doing some updates in the app, We will get back soon...'}
        </div>
      )}
      {children}
    </div>
  );
}