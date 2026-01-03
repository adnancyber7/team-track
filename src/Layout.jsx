import React, { useEffect } from 'react';

export default function Layout({ children, currentPageName }) {
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

  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}