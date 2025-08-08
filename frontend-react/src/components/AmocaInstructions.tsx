'use client'

import React from 'react'

export default function AmocaInstructions() {
  return (
    <div
      style={{
        marginTop: 12,
        padding: 16,
        border: '1px solid #e5e5e5',
        borderRadius: 12,
        background: '#fafafa'
      }}
    >
      <h3 style={{ marginTop: 0 }}>How AMOCA works</h3>
      <p style={{ margin: 0 }}>
        AMOCA helps validate and standardize community health contributions posted to a Hedera Topic. After you submit, the AI checks for your consent, assesses trustworthiness, and returns a compact JSON summary (with PII redacted).
      </p>
      <div style={{ height: 8 }} />
      <h4 style={{ margin: '8px 0 4px' }}>What to do</h4>
      <ol style={{ paddingLeft: 18, margin: 0 }}>
        <li>Enter the Hedera Topic ID where you want to publish.</li>
        <li>Confirm consent to share your data for validation/standardization.</li>
        <li>Describe your case: medicine used, disease/condition, context, and outcomes.</li>
        <li>Submit. You’ll see a transaction confirmation and the AI’s standardized response.</li>
      </ol>
      <div style={{ height: 8 }} />
      <h4 style={{ margin: '8px 0 4px' }}>What to include (medicine effectiveness case)</h4>
      <ul style={{ paddingLeft: 18, margin: 0 }}>
        <li><b>Medicine</b>: Name and formulation (e.g., Metformin 500 mg).</li>
        <li><b>Disease/Condition</b>: The target condition (e.g., Type 2 Diabetes).</li>
        <li><b>Context</b>: Relevant details (age range, comorbidities, prior therapies).</li>
        <li><b>Dosage & Duration</b>: How much and for how long.</li>
        <li><b>Observed Outcome</b>: What changed (measurements, symptoms, quality of life).</li>
        <li><b>Side Effects</b>: Any adverse reactions.</li>
        <li><b>Evidence Strength</b>: Personal observation, clinician note, lab values, etc.</li>
        <li><b>PII</b>: Avoid names, emails, phone numbers, or addresses.</li>
      </ul>
      <div style={{ height: 8 }} />
      <p style={{ margin: 0, color: '#666' }}>
        Tip: Keep it concise and factual. Example: “Metformin 500 mg BID for 12 weeks in a 45–50 y/o with T2D; HbA1c improved from 8.2% to 7.5%; mild GI upset first week; no other meds changed.”
      </p>
    </div>
  )
}
