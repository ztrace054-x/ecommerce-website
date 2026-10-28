"use client";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
type Turnstile = { render: (element: HTMLElement, options: Record<string, unknown>) => string; remove: (id: string) => void; reset: (id: string) => void };
declare global { interface Window { turnstile?: Turnstile } }
export function TurnstileChallenge({ siteKey, nonce, action, onToken, resetKey }: { siteKey: string; nonce: string; action: "order" | "track" | "admin"; onToken: (token: string) => void; resetKey: number }) {
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | undefined>(undefined);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const api = window.turnstile;
    if (!ready || !container.current || !api) return;
    const id = api.render(container.current, { sitekey: siteKey, action, callback: onToken, "expired-callback": () => onToken(""), "error-callback": () => { onToken(""); setFailed(true); } });
    widget.current = id;
    return () => { api.remove(id); widget.current = undefined; };
  }, [ready, siteKey, action, onToken]);
  useEffect(() => { if (widget.current) window.turnstile?.reset(widget.current); }, [resetKey]);
  return <><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" nonce={nonce} onReady={() => setReady(true)} onError={() => setFailed(true)} /><div ref={container} />{failed && <p role="alert">নিরাপত্তা যাচাই লোড হয়নি। Verification unavailable; reload to retry.</p>}</>;
}
