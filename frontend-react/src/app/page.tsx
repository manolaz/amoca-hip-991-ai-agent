"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import AmocaInstructions from '@/components/AmocaInstructions';
import DandelionsMedicine from '@/components/DandelionsMedicine';

type ChatMsg = {
  id: string;
  role: 'user' | 'system' | 'assistant';
  content: string;
  timestamp: number;
};

export default function Home() {
  const [topicId, setTopicId] = useState<string>(process.env.NEXT_PUBLIC_DEFAULT_TOPIC_ID || '0.0.6531943');
  const [consent, setConsent] = useState<boolean>(false);
  const [input, setInput] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const listEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Live updates from Hedera testnet via SSE when topicId is set
  useEffect(() => {
    if (!topicId) return;
    const url = `/api/stream?topicId=${encodeURIComponent(topicId)}`;
    const es = new EventSource(url);

    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data?.type === 'message') {
          const content = String(data.content || '');
          setMessages((m) => [
            ...m,
            {
              id: crypto.randomUUID(),
              role: 'system',
              content: `📡 New topic message (#${data.sequenceNumber ?? '?'}): ${content}`,
              timestamp: Date.now(),
            },
          ]);
        } else if (data?.type === 'error') {
          setMessages((m) => [
            ...m,
            { id: crypto.randomUUID(), role: 'system', content: `SSE error: ${data.error}`, timestamp: Date.now() },
          ]);
        }
      } catch (e) {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      // Let browser reconnect automatically; optional: show transient note
    };

    return () => {
      es.close();
    };
  }, [topicId]);

  const canSend = useMemo(() => !!topicId && input.trim().length > 0, [topicId, input]);

  const send = async () => {
    if (!canSend) return;
    setBusy(true);
    const payload = { consent, data: input };
    try {
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: 'user', content: input, timestamp: Date.now() }
      ]);
      setInput("");
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId, payload })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Submission failed');
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: 'system', content: `Submitted to Hedera Topic ${topicId}. Tx: ${json.transactionId || 'n/a'}`, timestamp: Date.now() }
      ]);

      // If backend produced latestResponse from AI, surface it in chat
      if (json.latestResponse) {
        const pretty = (() => {
          try { return JSON.stringify(json.latestResponse, null, 2); } catch { return String(json.latestResponse); }
        })();
        setMessages((m) => [
          ...m,
          { id: crypto.randomUUID(), role: 'assistant', content: pretty, timestamp: Date.now() }
        ]);
      }
      if (json.aiError) {
        setMessages((m) => [
          ...m,
          { id: crypto.randomUUID(), role: 'system', content: `AI Error: ${json.aiError}`, timestamp: Date.now() }
        ]);
      }
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: 'system', content: `Error: ${e.message}`, timestamp: Date.now() }
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container">
      <div className="stack">
        <div className="brand-hero">
          <div className="brand-word">AMOCA</div>
          <div className="brand-tagline">Healthcare data · consent-aware · standardized with love 💖</div>
        </div>
        <div className="card soft">
          <div className="pill">🩺 AMOCA · Healthcare Data on Hedera</div>
          <h1 className="title">Share, Validate, Standardize ✨</h1>
          <p className="subtitle">
            Contribute health data to a Hedera Topic. We’ll verify consent, assess trust, and provide a clean summary (no PII).
          </p>
        </div>

  <AmocaInstructions />
  <DandelionsMedicine />

        <div className="card">
          <div className="form-grid">
            <label className="stack">
              <span className="label">📬 Hedera Topic ID</span>
              <input
                className="input"
                placeholder="0.0.6531943"
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
              />
            </label>
            <label className="inline">
              <input className="checkbox" type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>✅ I consent to share my data for validation and standardization.</span>
            </label>
            <label className="stack">
              <span className="label">📝 Your message (health data, symptoms, notes)</span>
              <textarea
                className="textarea"
                rows={5}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g., Age 45, type 2 diabetes, recent HbA1c 7.8%. On metformin."
              />
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" disabled={!canSend || busy} onClick={send}>
                {busy ? 'Sending…' : 'Send to Topic ✈️'}
              </button>
            </div>
          </div>
        </div>

        <div className="card soft" style={{ marginTop: 12 }}>
          <h3>💬 Chat</h3>
          <div className="spacer-sm" />
          <div className="chat">
            {messages.map((m) => (
              <div key={m.id} className={`msg ${m.role}`}>
                <div className="meta">{m.role}</div>
                <div>{m.content}</div>
              </div>
            ))}
            <div ref={listEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}