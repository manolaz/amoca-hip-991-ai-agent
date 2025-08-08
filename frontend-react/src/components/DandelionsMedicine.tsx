'use client'

import React from 'react'

export default function DandelionsMedicine() {
  return (
    <section
      style={{
        marginTop: 16,
        padding: 16,
        border: '1px solid #e5e5e5',
        borderRadius: 12,
        background: '#fffef8'
      }}
    >
      <h3 style={{ marginTop: 0 }}>Dandelion Cancer Research - Patient Records</h3>
      <h4 style={{ margin: '4px 0 8px' }}>Alternative Medicine Study: Dandelion Extract for Multiple Cancer Types</h4>
      <div style={{ fontSize: 14 }}>
        <p style={{ margin: 0 }}>🌿 <b>Research Context</b></p>
        <p style={{ margin: '6px 0' }}>
          <b>Study Question:</b> "Can dandelion root extract (Taraxacum officinale) show therapeutic benefits as complementary treatment for various cancer types?"
        </p>
        <p style={{ margin: '6px 0' }}>
          <b>Background:</b> Laboratory studies suggest dandelion extract may have anti-cancer properties, but human data is limited. This AMOCA-coordinated study collects real-world patient experiences with dandelion supplementation.
        </p>
      </div>

      <div style={{ height: 8 }} />
      <h4 style={{ margin: '8px 0 4px' }}>What to include in your contribution</h4>
      <ul style={{ paddingLeft: 18, margin: 0 }}>
        <li><b>Cancer Type & Stage</b>: e.g., colorectal stage II, breast ER+, etc.</li>
        <li><b>Dandelion Product</b>: root extract/tea/capsule, brand (optional), concentration.</li>
        <li><b>Dosage & Frequency</b>: amount per dose, times per day, total duration (weeks/months).</li>
        <li><b>Concurrent Treatments</b>: chemo, radiation, immunotherapy, other supplements.</li>
        <li><b>Observed Outcomes</b>: imaging/lab changes if known, symptom relief, energy, appetite.</li>
        <li><b>Side Effects</b>: GI upset, allergies, or other reactions.</li>
        <li><b>Lifestyle Context</b>: diet, exercise, sleep (if relevant).</li>
        <li><b>Evidence Type</b>: personal observation, clinician summary, or measured values.</li>
        <li><b>PII Caution</b>: Do not include names, emails, phone numbers, or addresses.</li>
      </ul>

      <div style={{ height: 8 }} />
      <p style={{ margin: 0, color: '#666' }}>
        Example: "Stage II colorectal cancer; dandelion root tea ~2 cups/day for 10 weeks alongside FOLFOX; appetite improved, mild bloating first week; CEA decreased from 6.1 to 4.8 ng/mL; resumed light exercise."
      </p>
    </section>
  )
}
