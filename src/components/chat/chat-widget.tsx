"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { postJson } from "@/lib/csrf-client";

/**
 * The site's chat assistant, floating on every public page.
 *
 * Rendered from the root layout, but only when the server has already
 * confirmed the assistant is configured — see `ChatWidgetGate`. This
 * component itself assumes it should render; it does not re-check
 * availability, and every message it sends can still fail server-side (rate
 * limit, a model outage), which it shows as a plain inline error rather than
 * pretending nothing went wrong.
 *
 * Hidden on `/admin` and `/account`: those are staff and signed-in customers,
 * not the anonymous visitor this widget exists to turn into a lead.
 */

type Message = { role: "user" | "assistant"; content: string };

export function ChatWidget({ assistantName }: { assistantName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leadCaptured, setLeadCaptured] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, pending]);

  if (pathname?.startsWith("/admin") || pathname?.startsWith("/account")) return null;

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || pending) return;

    const next: Message[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setPending(true);
    setError(null);

    const result = await postJson<{ reply: string; leadCaptured: boolean }>("/api/chat", {
      messages: next,
    });

    setPending(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setMessages([...next, { role: "assistant", content: result.data.reply }]);
    if (result.data.leadCaptured) setLeadCaptured(true);
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 sm:bottom-6 sm:right-6">
      {open ? (
        <div className="flex h-[32rem] max-h-[calc(100dvh-6rem)] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[--radius-lg] border border-line bg-white shadow-[0_16px_40px_-16px_rgb(0_0_0/0.35)]">
          <div className="flex items-center justify-between border-b border-line bg-graphite-900 px-4 py-3">
            <div>
              <p className="text-body font-semibold text-white">{assistantName}</p>
              <p className="text-label text-white/70">Usually replies in a moment</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="rounded-full p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
            >
              <CloseIcon />
            </button>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <p className="text-meta leading-relaxed text-ink-600">
                Hi, I&rsquo;m {assistantName}. Ask me about our software licensing or hardware, and
                I can point you in the right direction — or take your details for a call back.
              </p>
            ) : null}

            {messages.map((message, index) => (
              <div key={index} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <p
                  className={`max-w-[85%] whitespace-pre-wrap rounded-[--radius-md] px-3 py-2 text-meta leading-relaxed ${
                    message.role === "user"
                      ? "bg-accent-700 text-white"
                      : "border border-line bg-surface-muted text-graphite-900"
                  }`}
                >
                  {message.content}
                </p>
              </div>
            ))}

            {pending ? (
              <div className="flex justify-start">
                <p className="rounded-[--radius-md] border border-line bg-surface-muted px-3 py-2 text-meta text-ink-500">
                  {assistantName} is typing…
                </p>
              </div>
            ) : null}

            {error ? (
              <p className="rounded-[--radius-md] bg-danger-50 px-3 py-2 text-label text-danger-700">{error}</p>
            ) : null}

            {leadCaptured ? (
              <p className="rounded-[--radius-md] border border-success-600/30 bg-success-50 px-3 py-2 text-label text-success-700">
                Thanks — your details are with our sales team.
              </p>
            ) : null}
          </div>

          <form onSubmit={send} className="flex items-center gap-2 border-t border-line p-3">
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Type a message…"
              maxLength={2000}
              disabled={pending}
              className="h-10 flex-1 rounded-[--radius-md] border border-line-strong px-3 text-meta focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-700"
            />
            <button
              type="submit"
              disabled={pending || input.trim().length === 0}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[--radius-md] bg-accent-700 text-white hover:bg-accent-800 active:bg-accent-900 disabled:opacity-40"
              aria-label="Send message"
            >
              <SendIcon />
            </button>
          </form>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-700 text-white shadow-[0_10px_28px_-8px_rgb(0_0_0/0.4)] hover:bg-accent-800 active:bg-accent-900"
          aria-label={`Chat with ${assistantName}`}
        >
          <ChatIcon />
        </button>
      )}
    </div>
  );
}

function ChatIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 12a8 8 0 1 1 3.2 6.4L4 20l1.2-3.6A7.96 7.96 0 0 1 4 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M4 4l10 10M14 4 4 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M2 9h13M9 3l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
