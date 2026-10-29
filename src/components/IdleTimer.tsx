"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";

export default function IdleTimer({ timeoutMinutes = 25 }: { timeoutMinutes?: number }) {
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleLogout = async () => {
      alert("Session expired due to inactivity. You will be securely logged out.");
      await signOut({ callbackUrl: "/login" }); 
    };

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(handleLogout, timeoutMinutes * 60 * 1000);
    };

    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];

    events.forEach((event) => window.addEventListener(event, resetTimer));
    resetTimer(); 

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [timeoutMinutes]);

  return null; 
}