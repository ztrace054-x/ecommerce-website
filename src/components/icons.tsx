import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export function ArrowIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

export function WhatsAppIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12.05 2a9.9 9.9 0 0 0-8.53 14.93L2 22l5.2-1.37A9.96 9.96 0 1 0 12.05 2Zm0 18.15a8.07 8.07 0 0 1-4.12-1.13l-.3-.18-3.08.8.82-2.99-.2-.31a8.13 8.13 0 1 1 6.88 3.81Zm4.47-6.07c-.25-.12-1.45-.71-1.68-.79-.23-.08-.39-.12-.55.12-.16.24-.63.79-.77.95-.14.16-.28.18-.53.06-.24-.12-1.03-.38-1.95-1.2-.72-.65-1.2-1.45-1.34-1.69-.14-.25-.02-.38.11-.5.11-.11.24-.28.37-.43.12-.14.16-.25.24-.41.08-.16.04-.3-.02-.43-.06-.12-.55-1.33-.75-1.82-.2-.47-.4-.41-.55-.42h-.47c-.16 0-.43.06-.66.3-.23.25-.86.84-.86 2.04 0 1.2.88 2.36 1 2.53.12.16 1.73 2.64 4.2 3.7.58.25 1.04.4 1.4.52.59.19 1.13.16 1.56.1.48-.07 1.46-.6 1.66-1.17.2-.58.2-1.08.14-1.18-.06-.1-.22-.16-.47-.28Z" />
    </svg>
  );
}

export function ServiceIcon({ kind, ...props }: IconProps & { kind: "setup" | "prompt" | "chatbot" | "website" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {kind === "setup" && <><path d="M4 7h16M4 17h16" /><rect x="7" y="4" width="4" height="6" rx="1" /><rect x="14" y="14" width="4" height="6" rx="1" /></>}
      {kind === "prompt" && <><path d="m12 3 2.8 6.2L21 12l-6.2 2.8L12 21l-2.8-6.2L3 12l6.2-2.8Z" /><path d="m20 3 1 1m-2 16 1 1" /></>}
      {kind === "chatbot" && <><path d="M20 11a8 8 0 0 1-8 8H5l-3 3V11a9 9 0 0 1 18 0Z" /><path d="M7 10h8m-8 4h5" /></>}
      {kind === "website" && <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18m-14 5 2 2-2 2m5 0h4M6 6.5h.01M9 6.5h.01" /></>}
    </svg>
  );
}
