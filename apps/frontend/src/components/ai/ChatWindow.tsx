'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Sparkles, X, Minus, Trash2, Send, Mic, Bot, User as UserIcon } from 'lucide-react';
import { useAiAssistant } from '@/context/AiAssistantContext';
import { formatPrice, cn } from '@/lib/utils';
import type { Product } from '@/lib/types';

function timeLabel(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Minimal markdown: **bold** and newlines.
function renderText(text: string) {
  return text.split('\n').map((line, i) => (
    <span key={i} className="block">
      {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <strong key={j}>{part.slice(2, -2)}</strong>
        ) : (
          <span key={j}>{part}</span>
        )
      )}
    </span>
  ));
}

function ProductCards({ products }: { products: Product[] }) {
  return (
    <div className="mt-2 grid grid-cols-2 gap-2">
      {products.slice(0, 4).map((p) => (
        <Link
          key={p._id}
          href={`/product/${p.slug}`}
          className="lift group overflow-hidden rounded-xl border border-ink/10 bg-surface"
        >
          <div className="relative aspect-square bg-ink/5">
            {p.images?.[0] && <Image src={p.images[0]} alt={p.title} fill className="object-cover" sizes="120px" />}
          </div>
          <div className="p-2">
            <p className="line-clamp-1 text-xs font-medium">{p.title}</p>
            <p className="text-xs font-bold text-nova-600">{formatPrice(p.price)}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function ChatWindow() {
  const { setOpen, messages, typing, config, send, clear } = useAiAssistant();
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll to newest message / typing indicator.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  // Voice input via the Web Speech API (feature-detected).
  const speechSupported =
    typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const toggleVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const rec = new SR();
    rec.lang = 'en-IN';
    rec.interimResults = false;
    rec.onresult = (e: any) => setInput(e.results[0][0].transcript);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
    setInput('');
  };

  const showWelcome = messages.length === 0;

  return (
    <div
      className={cn(
        'fixed z-[95] flex flex-col overflow-hidden border border-white/20 bg-surface/80 shadow-2xl backdrop-blur-xl',
        // Mobile: full-width bottom sheet. Tablet: 380px. Desktop: 420px.
        'inset-x-0 bottom-0 h-[85vh] rounded-t-3xl sm:inset-x-auto sm:bottom-24 sm:right-5 sm:h-[600px] sm:max-h-[80vh] sm:w-[380px] sm:rounded-3xl lg:w-[420px]'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-nova-600 to-nova-800 px-4 py-3 text-white">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <p className="flex items-center gap-1 font-bold leading-none">🤖 Clothinary AI</p>
            <p className="mt-0.5 text-[11px] text-white/70">Your Personal Fashion Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={clear} aria-label="Clear chat" title="Clear chat" className="press grid h-8 w-8 place-items-center rounded-lg hover:bg-white/15">
            <Trash2 className="h-4 w-4" />
          </button>
          <button onClick={() => setOpen(false)} aria-label="Minimize" title="Minimize" className="press grid h-8 w-8 place-items-center rounded-lg hover:bg-white/15">
            <Minus className="h-4 w-4" />
          </button>
          <button onClick={() => setOpen(false)} aria-label="Close" title="Close" className="press grid h-8 w-8 place-items-center rounded-lg hover:bg-white/15">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {showWelcome && (
          <>
            <Bubble role="assistant" at={Date.now()}>
              {renderText(config?.welcomeMessage || "Hi! I'm Clothinary AI 👋 How can I help you today?")}
            </Bubble>
            {config?.suggestedQuestions && config.suggestedQuestions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {config.suggestedQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="press rounded-full border border-ink/15 bg-surface px-3 py-1.5 text-xs font-medium transition hover:border-nova-500 hover:text-nova-700"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {messages.map((m) => (
          <Bubble key={m.id} role={m.role} at={m.at}>
            {renderText(m.text)}
            {m.products && m.products.length > 0 && <ProductCards products={m.products} />}
            {m.actions && m.actions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {m.actions.map((a) => (
                  <Link
                    key={a.href}
                    href={a.href}
                    onClick={() => setOpen(false)}
                    className="rounded-full bg-nova-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-nova-700"
                  >
                    {a.label}
                  </Link>
                ))}
              </div>
            )}
          </Bubble>
        ))}

        {typing && (
          <Bubble role="assistant" at={Date.now()}>
            <span className="flex items-center gap-1 py-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-2 w-2 animate-bounce rounded-full bg-ink/40"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </span>
          </Bubble>
        )}
      </div>

      {/* Composer */}
      <form onSubmit={submit} className="flex items-center gap-2 border-t border-ink/10 bg-surface p-3">
        {speechSupported && (
          <button
            type="button"
            onClick={toggleVoice}
            aria-label="Voice input"
            className={cn('press grid h-10 w-10 shrink-0 place-items-center rounded-full', listening ? 'bg-accent text-white' : 'bg-ink/5 text-ink')}
          >
            <Mic className="h-5 w-5" />
          </button>
        )}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything about fashion…"
          className="flex-1 rounded-full border border-ink/15 bg-surface px-4 py-2.5 text-sm outline-none focus:border-nova-500"
        />
        <button
          type="submit"
          disabled={!input.trim() || typing}
          aria-label="Send"
          className="press grid h-10 w-10 shrink-0 place-items-center rounded-full bg-nova-600 text-white disabled:opacity-40"
        >
          <Send className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}

function Bubble({ role, at, children }: { role: 'user' | 'assistant'; at: number; children: React.ReactNode }) {
  const isUser = role === 'user';
  return (
    <div className={cn('animate-fade-up flex gap-2', isUser && 'flex-row-reverse')}>
      <span
        className={cn(
          'grid h-8 w-8 shrink-0 place-items-center rounded-full text-white',
          isUser ? 'bg-ink' : 'bg-gradient-to-br from-nova-500 to-nova-700'
        )}
      >
        {isUser ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </span>
      <div className={cn('max-w-[78%]')}>
        <div
          className={cn(
            'rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
            isUser ? 'rounded-tr-sm bg-nova-600 text-white' : 'rounded-tl-sm border border-ink/10 bg-surface'
          )}
        >
          {children}
        </div>
        <p className={cn('mt-1 text-[10px] text-ink/40', isUser && 'text-right')}>{timeLabel(at)}</p>
      </div>
    </div>
  );
}
