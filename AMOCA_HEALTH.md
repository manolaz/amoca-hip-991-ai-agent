## AMOCA Chat Workflow (Hedera + AI)

This project includes a simple chat-like flow to contribute healthcare data to a Hedera Topic and have an agent validate and standardize it.

High-level steps:

1. Create a topic and (optionally) custom fee using `index.js`.
2. Run the agent listener with `agent.js <topicId>`. The agent subscribes to the topic and uses OpenAI to validate consent and standardize messages.
3. Open the Next.js frontend and paste your `topicId`. Provide your data and check the consent box. Submitting sends a JSON payload to the topic.

Data contract posted to the Hedera topic:

```json
{
  "consent": true,
  "data": "free text or structured health data",
  "user": null
}
```

Agent output (printed to console) is JSON-only and includes:

```json
{
  "status": "OK | CONSENT_MISSING | INVALID",
  "consent": true,
  "trust_assessment": { "score": 0.0, "reasons": ["..."] },
  "standardized": {
    "summary": "...",
    "icd10_candidates": ["..."],
    "pii_detected": false,
    "pii_redacted_text": "..."
  },
  "notes": ["..."]
}
```

Environment variables required for submissions from the frontend API route:

- OPERATOR_ADDRESS, OPERATOR_KEY (or PAYER_ACCOUNT_ID/PAYER_EVM_ADDRESS + PAYER_PRIVATE_KEY)
- OPENAI_API_KEY (for the agent process)

# AMOCA Example: Drug Repurposing Study

## Metformin (Diabetes Drug) → Fragile X Syndrome Treatment

### 🎯 **Simple Scenario**

**Existing Drug**: Metformin (widely used diabetes medication)  
**New Target Disease**: Fragile X Syndrome (rare genetic disorder causing intellectual disability)  
**Research Question**: "Can metformin improve cognitive function in Fragile X patients?"

---

## 📋 **Step-by-Step Process**

### **1. Pharma Sponsor Initiative**

```typescript
const researchProposal = {
  sponsor: "NeuroTech Pharmaceuticals",
  drug: "Metformin (already FDA approved for diabetes)",
  newIndication: "Fragile X Syndrome cognitive improvement",
  budget: 100000, // $100k in $MDAI tokens
  timeline: "6 months",
  hypothesis: "Metformin's cellular energy effects may improve learning in FXS"
};
```

**Why This Drug?**

- Already proven safe (FDA approved since 1995)
- Cheap to manufacture ($0.10/pill)
- Some lab studies suggest it might help brain function
- Much faster/cheaper than developing new drug from scratch

---

### **2. AMOCA Agent Finds Patients**

The AI agent searches for Fragile X patients willing to share their data:

```typescript
const targetPatients = {
  condition: "Fragile X Syndrome",
  criteria: {
    age: "6-25 years old",
    cognitiveTests: "has recent IQ/learning assessments", 
    currentMedications: "not currently taking metformin",
    location: "global"
  },
  dataNeeded: [
    "Cognitive test scores",
    "Behavioral assessments", 
    "Medical history",
    "Current medications",
    "Family reports on daily functioning"
  ]
};
```

**Found**: 150 Fragile X families worldwide willing to participate

---

### **3. Simple Consent Process**

Patients see a clear explanation:

> **"NeuroTech wants to study if metformin (a safe diabetes drug) could help Fragile X learning.
> They need your child's cognitive test results and behavior reports.
> You get $50 in tokens. Your data stays private and encrypted.
> This could lead to a new treatment option for Fragile X."**

**Result**: 127 families consent to share their data

---

### **4. Researchers Get Involved**

AMOCA matches qualified researchers:

- **Dr. Smith** (Stanford) - expert in Fragile X syndrome
- **Dr. Johnson** (Harvard) - specialist in drug repurposing
- **Dr. Liu** (Toronto) - cognitive assessment expert

Each gets access to anonymized, structured data for analysis.

---

### **5. Data Analysis**

```typescript
const analysisResults = {
  patientData: {
    totalPatients: 127,
    avgAge: 12.3,
    baselineCognitiveLevels: "structured_fhir_data.json"
  },
  
  researchFindings: {
    "Dr. Smith": "Identified 3 patient subgroups with different severity levels",
    "Dr. Johnson": "Found similar metabolic patterns to successful autism study", 
    "Dr. Liu": "Created predictive model for which patients might respond best"
  },
  
  conclusions: [
    "67% of patients show metabolic markers suggesting metformin could help",
    "Younger patients (age 6-12) most likely to benefit",
    "Recommend 6-month clinical trial with 80 participants"
  ]
};
```

---

### **6. Everyone Gets Rewarded**

```typescript
const rewards = {
  patients: {
    each_family: "$50 in MDAI tokens",
    total_distributed: "$6,350",
    bonus: "Priority access if clinical trial starts"
  },
  
  researchers: {
    "Dr. Smith": "$15,000 research grant",
    "Dr. Johnson": "$12,000 research grant", 
    "Dr. Liu": "$8,000 research grant"
  },
  
  sponsor_gets: {
    structured_dataset: "127 patient profiles",
    research_analysis: "3 expert reports",
    clinical_trial_design: "Ready-to-submit FDA protocol",
    patient_recruitment: "80 families pre-screened for trial"
  }
};
```

---

## 🏆 **Simple Success Story**

### **Before AMOCA** (Traditional Approach)

- **Time**: 2-3 years to find patients and organize study
- **Cost**: $500K-1M for patient recruitment alone
- **Risk**: Maybe only 20-30 patients found globally
- **Data**: Inconsistent formats, missing information

### **With AMOCA** (6 months later)

- **Time**: 6 months from idea to clinical trial ready
- **Cost**: $100K total investment
- **Patients**: 127 high-quality patient datasets
- **Outcome**: FDA meeting scheduled, clinical trial approved

---

## 🔄 **The Simple Workflow**

```
1. Pharma: "We want to test metformin for Fragile X"
   ↓ (Deposit $100K tokens)

2. AMOCA: "Found 150 Fragile X families"  
   ↓ (AI matches patients)

3. Families: "Yes, we'll share our data for $50"
   ↓ (Digital consent via app)

4. Researchers: "Here's what the data shows"
   ↓ (AI structures data, researchers analyze)

5. Result: "Clinical trial ready in 6 months!"
   ↓ (Everyone gets paid, trial starts)
```

---

## 💡 **Why This Works**

**For Pharma**:

- Faster patient insights (months vs years)
- Lower risk (drug already proven safe)  
- Cheaper than traditional studies
- Better patient recruitment for trials

**For Families**:

- Compensation for data sharing
- Potential new treatment option
- Priority access to clinical trials
- Transparent, ethical data use

**For Researchers**:

- Access to rare disease datasets
- Funding for analysis work
- Collaboration opportunities
- Publication potential

**For Society**:

- Faster path to new treatments
- Lower drug development costs
- Better use of existing safe drugs
- More research on rare diseases

---

## 📊 **Real Numbers**

| Traditional Approach | AMOCA Approach | Improvement |
|---------------------|----------------|-------------|
| 2-3 years | 6 months | **4-5x faster** |
| $500K-1M cost | $100K cost | **5-10x cheaper** |
| 20-30 patients | 127 patients | **4-6x more data** |
| Inconsistent data | Structured FHIR | **Much higher quality** |

---

## 🎯 **Bottom Line**

Instead of spending years and millions developing completely new drugs, AMOCA helps pharmaceutical companies quickly test existing safe drugs for new diseases.

**Result**: Faster treatments for rare disease patients at a fraction of the cost.

This is just one example - the same approach works for testing any existing drug against any rare disease where patients are willing to share their data for research.
