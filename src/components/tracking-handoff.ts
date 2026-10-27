"use client";
// A one-time, memory-only handoff. No URL, cookie, storage or analytics event.
let pendingCode = "";
export function rememberTrackingCode(code: string) { pendingCode = code; }
export function takeTrackingCode() { const code = pendingCode; pendingCode = ""; return code; }
