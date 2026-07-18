'use client';

import { useEffect, useState } from 'react';
import { authenticatedJson } from '../lib/authenticatedApi';

export function AdminNavLink() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;
    authenticatedJson<{ user?: { role?: string } }>('/me')
      .then((data) => {
        if (active) setIsAdmin(data.user?.role === 'admin');
      })
      .catch(() => {
        if (active) setIsAdmin(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!isAdmin) return null;
  return <a href="/admin/runtime-management" className="hover:text-cyan-200">Runtime Management</a>;
}
