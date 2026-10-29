"use client";

import { SessionProvider } from "next-auth/react";
import React from "react";
import IdleTimer from "@/src/components/IdleTimer"; 
import { Toaster } from "react-hot-toast";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={10 * 60}>
      <IdleTimer timeoutMinutes={25} />
      
      <Toaster 
        position="top-right" 
        toastOptions={{
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
            fontWeight: 'bold',
          },
          success: {
            style: { background: '#10B981' },
          },
          error: {
            style: { background: '#EF4444' },
          },
        }} 
      />
      
      {children}
    </SessionProvider>
  );
}