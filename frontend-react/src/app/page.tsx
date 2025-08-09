"use client";
import Image from 'next/image';
import amocaLogo from '../../assets/images/amoca-logo.jpeg';
import { useEffect, useMemo, useRef,           <p className="subtitle">
            Contribute health data to a Hedera Topic. We'll provide instant analytics and standardized summaries (no PII).
          </p>State } from 'react';
import AmocaInstructions from '@/components/AmocaInstructions';
import DandelionsMedicine from '@/components/DandelionsMedicine';
import PrivacyAnonymization from '@/components/PrivacyAnonymization';
import { sanitizeText } from './utils/pii';

type ChatMsg = {
  id: string;
  role: 'user' | 'system' | 'assistant' | 'cleaned' | 'ai-response';
  content: string;
  timestamp: number;
  isJSON?: boolean;
};

export default function Home() {
  const [topicId, setTopicId] = useState<string>(process.env.NEXT_PUBLIC_DEFAULT_TOPIC_ID || '0.0.6531943');
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
    
    // Show original user input
    setMessages((m) => [
      ...m,
      { id: crypto.randomUUID(), role: 'user', content: input, timestamp: Date.now() }
    ]);

    // Show cleaned version
    const cleanedInput = sanitizeText(input);
    if (cleanedInput !== input) {
      setMessages((m) => [
        ...m,
        { 
          id: crypto.randomUUID(), 
          role: 'cleaned', 
          content: `🧹 Cleaned version (PII removed): ${cleanedInput}`, 
          timestamp: Date.now() 
        }
      ]);
    }

    const payload = { 
      consent: true, // Always provide consent for streamlined experience
      data: input,
      collected_data: {}, // Initialize empty collected data
      conversation_history: messages.filter(m => m.role === 'user' || m.role === 'assistant').map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp
      }))
    };
    
    try {
      setInput("");
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId, payload })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Submission failed');
      
      // Show Hedera submission result
      setMessages((m) => [
        ...m,
        { 
          id: crypto.randomUUID(), 
          role: 'system', 
          content: `✅ Submitted to Hedera Topic ${topicId}. Tx: ${json.transactionId || 'n/a'}`, 
          timestamp: Date.now() 
        }
      ]);

      // Display OpenAI response in a formatted way
      if (json.latestResponse) {
        // Show the AI's conversational response if it has one
        if (json.latestResponse.next_question) {
          setMessages((m) => [
            ...m,
            { 
              id: crypto.randomUUID(), 
              role: 'ai-response', 
              content: json.latestResponse.next_question, 
              timestamp: Date.now() 
            }
          ]);
        }

        // Show the structured data collection progress
        const structuredData = {
          status: json.latestResponse.status,
          collected_data: json.latestResponse.collected_data,
          ...(json.workflow_details && { workflow_details: json.workflow_details })
        };
        
        setMessages((m) => [
          ...m,
          { 
            id: crypto.randomUUID(), 
            role: 'assistant', 
            content: JSON.stringify(structuredData, null, 2), 
            timestamp: Date.now(),
            isJSON: true
          }
        ]);
      }
      
      if (json.aiError) {
        setMessages((m) => [
          ...m,
          { id: crypto.randomUUID(), role: 'system', content: `❌ AI Error: ${json.aiError}`, timestamp: Date.now() }
        ]);
      }
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: 'system', content: `❌ Error: ${e.message}`, timestamp: Date.now() }
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container">
      <div className="stack">
        <div className="brand-hero">
          <Image src={amocaLogo} alt="AMOCA Logo" width={80} height={80} style={{ borderRadius: '12px' }} />
          <div className="brand-word">AMOCA</div>
          <div className="brand-tagline">Healthcare data · streamlined analytics · standardized with love 💖</div>
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
  <PrivacyAnonymization />

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
                {busy ? 'Analyzing…' : 'Analyze & Submit ✈️'}
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
                <div className="meta">
                  {m.role === 'cleaned' && '🧹 Cleaned Input'}
                  {m.role === 'ai-response' && '🤖 AI Response'}
                  {m.role === 'assistant' && '📊 Data Collection Status'}
                  {m.role === 'user' && '👤 You'}
                  {m.role === 'system' && '⚙️ System'}
                </div>
                {m.role === 'assistant' && m.isJSON ? (
                  <pre style={{ 
                    background: '#f5f5f5', 
                    padding: '12px', 
                    borderRadius: '8px', 
                    fontSize: '12px',
                    overflow: 'auto',
                    maxHeight: '300px'
                  }}>
                    {m.content}
                  </pre>
                ) : m.role === 'ai-response' ? (
                  <div style={{
                    background: '#e3f2fd',
                    padding: '12px',
                    borderRadius: '8px',
                    borderLeft: '4px solid #2196f3',
                    fontStyle: 'italic'
                  }}>
                    {m.content}
                  </div>
                ) : m.role === 'cleaned' ? (
                  <div style={{
                    background: '#fff3e0',
                    padding: '12px',
                    borderRadius: '8px',
                    borderLeft: '4px solid #ff9800',
                    fontSize: '14px'
                  }}>
                    {m.content}
                  </div>
                ) : (
                  <div>{m.content}</div>
                )}
              </div>
            ))}
            <div ref={listEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}