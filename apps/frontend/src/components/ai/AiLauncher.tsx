'use client';

import dynamic from 'next/dynamic';
import { Sparkles } from 'lucide-react';
import { useAiAssistant } from '@/context/AiAssistantContext';

// Lazy-load the heavy chat window — only fetched when first opened (code-split).
const ChatWindow = dynamic(() => import('./ChatWindow'), { ssr: false });

export default function AiLauncher() {
  const { open, setOpen, config } = useAiAssistant();

  // Respect the admin enable/disable toggle (config loads on first open;
  // the button always shows so the assistant is discoverable).
  const disabled = config?.enabled === false;

  return (
    <>
      {!open && !disabled && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open Clothinary AI assistant"
          className="press fixed bottom-5 right-5 z-[90] grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-nova-600 to-nova-800 text-white shadow-xl"
        >
          {/* Pulse ring */}
          <span className="absolute inset-0 animate-ping rounded-full bg-nova-500/40" />
          <Sparkles className="relative h-6 w-6" />
        </button>
      )}
      {open && <ChatWindow />}
    </>
  );
}
