"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import AmocaInstructions from '@/components/AmocaInstructions';

type ChatMsg = {
  id: string;
  role: 'user' | 'system' | 'assistant';
  content: string;
  timestamp: number;
};

export default function Home() {
  const [topicId, setTopicId] = useState<string>("");
  const [consent, setConsent] = useState<boolean>(false);
  const [input, setInput] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const listEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

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
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}>
      <h1>AMOCA · Healthcare Data Contribution on Hedera</h1>
      <p style={{ color: '#666' }}>
        Share health data to a Hedera Topic for community discussion. Your consent is required. An AI agent validates trustworthiness and produces a standardized summary.
      </p>

  <AmocaInstructions />

      <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Hedera Topic ID</span>
          <input
            placeholder="0.0.xxxxx"
            value={topicId}
            onChange={(e) => setTopicId(e.target.value)}
            style={{ padding: 8, border: '1px solid #ccc', borderRadius: 8 }}
          />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>I consent to share my health data to the specified Hedera Topic for validation and standardization.</span>
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Your message (health data, symptoms, notes)</span>
          <textarea
            rows={5}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g., Age 45, type 2 diabetes, recent HbA1c 7.8%. On metformin."
            style={{ padding: 10, border: '1px solid #ccc', borderRadius: 8 }}
          />
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button disabled={!canSend || busy} onClick={send} style={{ padding: '8px 14px', borderRadius: 8 }}>
            {busy ? 'Sending…' : 'Send to Topic'}
          </button>
        </div>
      </div>

      <div style={{ marginTop: 24, borderTop: '1px solid #eee', paddingTop: 16 }}>
        <h3>Chat</h3>
        <div style={{ display: 'grid', gap: 8 }}>
          {messages.map((m) => (
            <div key={m.id} style={{
              padding: 10,
              borderRadius: 8,
              background: m.role === 'user' ? '#e6f4ff' : '#f5f5f5'
            }}>
              <div style={{ fontSize: 12, color: '#888' }}>{m.role}</div>
              <div>{m.content}</div>
            </div>
          ))}
          <div ref={listEndRef} />
        </div>
      </div>
    </div>
  );
}