'use client'

import React from 'react'
import Image from 'next/image'
import dde from '../../assets/images/dde.png'

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <div style={{ flex: '0 0 120px', display: 'flex', justifyContent: 'center' }}>
          <Image
            src={dde}
            alt="Dandelion illustration"
            style={{ borderRadius: 12, objectFit: 'cover' }}
            width={120}
            height={120}
            priority
          />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ marginTop: 0 }}>Dandelion Cancer Research - Patient Records</h3>
          <h4 style={{ margin: '4px 0 8px' }}>Alternative Medicine Study: Dandelion Extract for Multiple Cancer Types</h4>
        </div>
      </div>
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
      <h4 style={{ margin: '8px 0 8px', color: '#2e7d32', fontSize: '18px' }}>💬 Chat Input Examples - How to Share Your Experience</h4>
      
      <div style={{ 
        background: '#f3e5f5', 
        padding: '16px', 
        borderRadius: '12px', 
        marginBottom: '12px',
        border: '2px solid #9c27b0'
      }}>
        <h5 style={{ margin: '0 0 8px', color: '#6a1b9a', fontSize: '16px' }}>🎯 Example 1 - Breast Cancer Patient:</h5>
        <p style={{ 
          margin: 0, 
          fontSize: '15px', 
          lineHeight: '1.5',
          background: 'white',
          padding: '12px',
          borderRadius: '8px',
          fontWeight: '500'
        }}>
          "🎀 Stage IIIA invasive ductal carcinoma, ER+ PR+ HER2-. Started dandelion root capsules (Nature's Way, 525mg) 2x daily during AC-T chemo. Week 4-16 of treatment. 
          
          💪 Energy levels improved noticeably, less nausea than expected. Mild stomach upset first few days then resolved. 
          
          📊 Tumor shrunk from 3.2cm to 1.8cm on MRI after 12 weeks. Oncologist surprised by response rate. Still taking alongside Herceptin maintenance."
        </p>
      </div>

      <div style={{ 
        background: '#e8f5e8', 
        padding: '16px', 
        borderRadius: '12px', 
        marginBottom: '12px',
        border: '2px solid #4caf50'
      }}>
        <h5 style={{ margin: '0 0 8px', color: '#2e7d32', fontSize: '16px' }}>🎯 Example 2 - Colorectal Cancer Patient:</h5>
        <p style={{ 
          margin: 0, 
          fontSize: '15px', 
          lineHeight: '1.5',
          background: 'white',
          padding: '12px',
          borderRadius: '8px',
          fontWeight: '500'
        }}>
          "🔵 Stage II colorectal adenocarcinoma, post-surgery. Drinking organic dandelion root tea (Traditional Medicinals) ~2 cups daily for 10 weeks alongside FOLFOX chemotherapy.
          
          🍽️ Appetite dramatically improved by week 3! Mild bloating first week then stomach felt better. Could actually enjoy meals again.
          
          📈 CEA tumor marker decreased from 6.1 to 4.8 ng/mL at 8-week check. Started light exercise again - walking 30min daily. Energy much more stable."
        </p>
      </div>

      <div style={{ 
        background: '#fff3e0', 
        padding: '16px', 
        borderRadius: '12px', 
        marginBottom: '12px',
        border: '2px solid #ff9800'
      }}>
        <h5 style={{ margin: '0 0 8px', color: '#f57c00', fontSize: '16px' }}>🎯 Example 3 - Lung Cancer Patient:</h5>
        <p style={{ 
          margin: 0, 
          fontSize: '15px', 
          lineHeight: '1.5',
          background: 'white',
          padding: '12px',
          borderRadius: '8px',
          fontWeight: '500'
        }}>
          "🫁 Non-small cell lung cancer T2N1M0. Taking dandelion extract liquid drops (Herb Pharm) 30 drops 3x daily with meals. Started during concurrent chemo-radiation therapy.
          
          😷 Less respiratory inflammation, coughing reduced significantly after 6 weeks. Sleep quality improved from 4-5 hours to 6-7 hours nightly.
          
          🔬 Latest CT scan showed stable disease, no progression. Liver enzymes stayed normal throughout treatment (ALT 28, AST 31). Continuing drops through maintenance phase."
        </p>
      </div>

      <div style={{ 
        background: '#e3f2fd', 
        padding: '16px', 
        borderRadius: '12px', 
        marginBottom: '16px',
        border: '2px solid #2196f3'
      }}>
        <h5 style={{ margin: '0 0 8px', color: '#1565c0', fontSize: '16px' }}>🎯 Example 4 - Prostate Cancer Patient:</h5>
        <p style={{ 
          margin: 0, 
          fontSize: '15px', 
          lineHeight: '1.5',
          background: 'white',
          padding: '12px',
          borderRadius: '8px',
          fontWeight: '500'
        }}>
          "🔷 Prostate adenocarcinoma Gleason 7 (3+4), PSA 8.2 at diagnosis. Using dandelion root powder (Starwest Botanicals) 1 tsp in morning smoothie for 5 months during active surveillance.
          
          💊 No side effects noticed. Energy levels steady, urinary symptoms slightly improved. Following anti-inflammatory diet too.
          
          📊 PSA trending down: 8.2 → 7.1 → 6.8 over 6 months. Urologist allowing continued monitoring. Planning to continue dandelion through any future treatment."
        </p>
      </div>

      <div style={{ 
        background: '#fce4ec', 
        padding: '12px', 
        borderRadius: '8px',
        marginBottom: '8px',
        border: '1px solid #e91e63'
      }}>
        <p style={{ margin: 0, fontSize: '14px', color: '#ad1457' }}>
          ⚡ <b>Pro Tips for Better Responses:</b> Include specific timeframes, dosages, brand names, and measurable outcomes when possible. The more details you provide, the more valuable your contribution becomes for other patients! 🙏
        </p>
      </div>
    </section>
  )
}
