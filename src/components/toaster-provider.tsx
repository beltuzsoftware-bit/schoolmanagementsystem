'use client';

import { Toaster } from 'sonner';

export default function ToasterProvider() {
  return (
    <Toaster 
      position="top-center" 
      richColors 
      toastOptions={{
        style: { 
          padding: '8px 12px',
          fontSize: '12px',
          fontWeight: '600',
          maxWidth: '300px',
          marginTop: '10px'
        }
      }}
    />
  );
}
