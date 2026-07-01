'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { useLocale } from './LocaleContext';
import type { Product } from '@/lib/types';

export interface ChatAction {
  label: string;
  href: string;
}
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  at: number;
  products?: Product[];
  actions?: ChatAction[];
}
interface AiConfig {
  enabled: boolean;
  welcomeMessage: string;
  suggestedQuestions: string[];
  llmEnabled: boolean;
}

interface AiState {
  open: boolean;
  setOpen: (v: boolean) => void;
  messages: ChatMessage[];
  typing: boolean;
  config: AiConfig | null;
  send: (text: string) => Promise<void>;
  clear: () => void;
}

const AiContext = createContext<AiState | undefined>(undefined);
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export function AiAssistantProvider({ children }: { children: ReactNode }) {
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const [config, setConfig] = useState<AiConfig | null>(null);
  const sessionId = useRef<string>('');

  // Stable per-browser session id (context memory anchor).
  useEffect(() => {
    let sid = localStorage.getItem('nova-ai-sid');
    if (!sid) {
      sid = uid();
      localStorage.setItem('nova-ai-sid', sid);
    }
    sessionId.current = sid;
  }, []);

  // Load config once (lazily — only when the widget is first opened).
  useEffect(() => {
    if (!open || config) return;
    api<{ config: AiConfig }>('/ai/config')
      .then((d) => setConfig(d.config))
      .catch(() => setConfig({ enabled: true, welcomeMessage: "Hi! I'm NovaStyle AI 👋", suggestedQuestions: [], llmEnabled: false }));
  }, [open, config]);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || typing) return;

      const userMsg: ChatMessage = { id: uid(), role: 'user', text, at: Date.now() };
      setMessages((prev) => [...prev, userMsg]);
      setTyping(true);

      // Send a short rolling history for context memory.
      const history = [...messages, userMsg].slice(-8).map((m) => ({ role: m.role, text: m.text }));
      try {
        const data = await api<{ reply: string; products?: Product[]; actions?: ChatAction[]; intent: string }>('/ai/chat', {
          method: 'POST',
          body: JSON.stringify({ message: text, sessionId: sessionId.current, locale, history }),
        });
        setMessages((prev) => [
          ...prev,
          { id: uid(), role: 'assistant', text: data.reply, at: Date.now(), products: data.products, actions: data.actions },
        ]);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          { id: uid(), role: 'assistant', text: err instanceof Error ? err.message : 'Something went wrong. Please try again.', at: Date.now() },
        ]);
      } finally {
        setTyping(false);
      }
    },
    [messages, typing, locale]
  );

  const clear = useCallback(() => setMessages([]), []);

  return (
    <AiContext.Provider value={{ open, setOpen, messages, typing, config, send, clear }}>
      {children}
    </AiContext.Provider>
  );
}

export function useAiAssistant() {
  const ctx = useContext(AiContext);
  if (!ctx) throw new Error('useAiAssistant must be used within AiAssistantProvider');
  return ctx;
}
