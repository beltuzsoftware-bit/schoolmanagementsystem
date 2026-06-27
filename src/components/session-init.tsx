'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

// Install the polyfill immediately in module scope on the client side
if (typeof window !== 'undefined' && !(window as any).__kummi_session_polyfilled) {
  (window as any).__kummi_session_polyfilled = true;

  const originalGetItem = localStorage.getItem;
  localStorage.getItem = function (key) {
    if (key === 'kummi_user' || key === 'kummi_original_user') {
      const sessionVal = sessionStorage.getItem(key);
      if (sessionVal) return sessionVal;
    }
    return originalGetItem.apply(this, arguments as any);
  };

  const originalRemoveItem = localStorage.removeItem;
  localStorage.removeItem = function (key) {
    if (key === 'kummi_user' || key === 'kummi_original_user') {
      sessionStorage.removeItem(key);
    }
    return originalRemoveItem.apply(this, arguments as any);
  };
}

function SessionInitContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const impersonate = searchParams.get('impersonate');
    if (impersonate) {
      try {
        const user = JSON.parse(decodeURIComponent(impersonate));
        if (user) {
          // Set in sessionStorage so it is tab-specific and isolated
          sessionStorage.setItem('kummi_user', JSON.stringify(user));

          // Set kummi_original_user to the original user from localStorage if it exists
          const origUser = localStorage.getItem('kummi_original_user');
          if (origUser) {
            sessionStorage.setItem('kummi_original_user', origUser);
          }

          // Clean up query param from URL
          const params = new URLSearchParams(searchParams.toString());
          params.delete('impersonate');
          const cleanUrl = pathname + (params.toString() ? `?${params.toString()}` : '');

          // Dispatch profile-updated so that layout updates immediately
          window.dispatchEvent(new Event('profile-updated'));

          // Replace the URL with the clean version
          router.replace(cleanUrl);
        }
      } catch (e) {
        console.error('Failed to parse impersonation parameters', e);
      }
    }
  }, [searchParams, pathname, router]);

  return null;
}

export default function SessionInit() {
  return (
    <Suspense fallback={null}>
      <SessionInitContent />
    </Suspense>
  );
}
