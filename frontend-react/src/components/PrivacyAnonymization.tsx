"use client";
import React from 'react';

export default function PrivacyAnonymization() {
  return (
    <div className="card soft">
      <div className="pill">🔒 Privacy & Anonymization</div>
      <h2 className="title">How your data is sanitized</h2>
      <p className="subtitle">We apply privacy filters before AI processing and before writing to Hedera.</p>
      <div className="spacer-sm" />
      <ul className="info-list">
        <li>
          <strong>Before OpenAI:</strong> your message is cleaned to remove common PII patterns like emails, phone numbers, simple street addresses, credit-card like numbers, SSN-like values, URLs, and long key-like hex strings.
        </li>
        <li>
          <strong>Before Hedera:</strong> the final structured dataset is recursively sanitized so any lingering PII in nested fields is redacted.
        </li>
        <li>
          <strong>What gets sent:</strong> OpenAI receives the redacted message; Hedera stores the redacted final dataset only when the AI marks the form as COMPLETE.
        </li>
        <li>
          <strong>In the chat:</strong> you may see placeholders like <code>[email]</code> or <code>[phone]</code>, confirming redaction.
        </li>
        <li>
          <strong>Tip:</strong> Please avoid sharing names, exact addresses, or contact details. If unsure, leave them out.
        </li>
      </ul>
      <div className="spacer-sm" />
      <p style={{ fontSize: 12, opacity: 0.8 }}>
        Note: Redaction uses heuristics and may be conservative. You can review and edit your text before sending.
      </p>
    </div>
  );
}
