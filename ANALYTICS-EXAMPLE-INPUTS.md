# AMOCA Analytics – Example Good Inputs

These examples are tailored to the analytics system prompt in `prompts/analytics-system-prompt.txt`. Copy one example into the agent input and (optionally) add: “Please output JSON only per the schema.”

- Scope: clinical/medical analytics across RCTs, cohorts, case series, PV signals, QI, time series, diagnostics, behavioral, special populations, registries, equity, VE, oncology, and sparse notes.
- Privacy: No PII; use study-level or de-identified subject IDs.
- Include: population/arms, intervention details (dose/route/frequency), endpoints, safety, timelines.

---

## 1) Randomized controlled trial (drug vs placebo)

Study: 12-week, double-blind RCT in adults with moderate persistent asthma. N=240 randomized 1:1.

Arms:

- Arm A: Budesonide-formoterol 160/4.5 µg, 2 puffs BID, n=120
- Arm B: Placebo inhaler, 2 puffs BID, n=120

Baseline: Mean age 41, 56% female, mean FEV1 68% predicted.

Primary endpoint: Rate of moderate/severe exacerbations over 12 weeks.

Secondary: Change in FEV1 (L), ACQ-7, rescue inhaler use.

Safety: AEs tracked; serious AEs, candidiasis, tremor.

Results:

- Exacerbation rate/pt-year (scaled to 12 wks): A=0.35, B=0.62
- ΔFEV1 (L) mean±SD: A=+0.21±0.35; B=+0.05±0.32
- ACQ-7 change: A=−0.55; B=−0.22
- AEs: oral candidiasis A=6%, B=1%; tremor A=3%, B=1%; SAEs A=1, B=2.

Please analyze and return JSON per schema.

## 2) Single-patient case with timeline

Subject: S001 (adult, F, 62), location: US.

Condition: Type 2 diabetes (Dx 2015), A1c 8.6%.

Intervention: Semaglutide 0.25 mg SC weekly (start 2025-04-10), uptitrate to 1.0 mg by 2025-06-05; adherence good per pharmacy fills.

Concomitant: Metformin 1000 mg BID (since 2016), Atorvastatin 20 mg QD.

Outcomes:

- A1c: 8.6% (2025-03-15) → 7.4% (2025-06-30) → 6.9% (2025-08-01)
- Weight: 92 kg → 87 kg → 85 kg

Adverse events: Nausea grade 1 (onset 2025-04-17, relatedness probable, resolved 2025-05-10).

Notes: No pancreatitis symptoms; eGFR stable (78→76 mL/min/1.73m²).

Please extract patterns and provide recommendations.

## 3) Retrospective cohort (comparative effectiveness)

Population: Adults with non-valvular AF, new users 2023–2025. Exclude CrCl <15.

Exposure cohorts:

- Apixaban n=3,420
- Rivaroxaban n=2,980

Covariates: Age, sex, CHA2DS2-VASc, HAS-BLED, CKD stage, prior stroke, concomitant antiplatelet.

Outcomes (6-month): Ischemic stroke, major bleeding (ISTH), all-cause mortality.

Events:

- Stroke: apix=52, riva=67
- Major bleeding: apix=61, riva=94
- Death: apix=88, riva=112

Provide effect estimates (adjust for confounding) and limitations.

## 4) Pharmacovigilance signal (case series)

Drug: Carbamazepine; Event: Hyponatremia.

Cases (n=7): Onset median 12 days (range 7–28) after start; ages 45–78; 5M/2F.

Severity: 2 serious (Na <120), 5 non-serious (Na 121–129).

Dechallenge: 6 improved after discontinuation; Rechallenge: 1 recurred.

Concomitants: HCTZ in 3 cases.

Please assess signal strength, alternative explanations, and monitoring advice.

## 5) Pre–post quality improvement (hospital program)

Setting: Surgical ward; intervention: Enhanced recovery after surgery (ERAS) bundle started 2025-02-01.

Population: Consecutive colorectal resections; Pre n=80 (2024-09–2025-01), Post n=75 (2025-02–2025-06).

Outcomes: LOS, 30-day readmission, SSI.

Results: LOS median (IQR) 6 (4–8) → 4 (3–6); readmission 12% → 9%; SSI 10% → 7%.

Process measure: early mobilization adherence 62% → 85%.

Analyze impact and residual confounding.

## 6) Lab/measurement time series

Subject: S014, M, 55; condition: HFrEF NYHA II.

Intervention: Dapagliflozin 10 mg QD started 2025-05-01.

Measurements:

- NT-proBNP (pg/mL): 1450 (04-25), 980 (06-01), 820 (07-15)
- eGFR: 64, 60, 59
- Weight (kg): 88, 85, 84

Patient-reported: Dyspnea improved; 6MWT +48 m at 10 weeks.

Adverse events: none serious; mild polyuria.

Summarize efficacy and renal safety.

## 7) Diagnostic test evaluation

Question: Performance of Ultrasound vs MRI for rotator cuff tears.

Design: Prospective, single-center, n=180, surgical reference standard.

US: sensitivity 0.78, specificity 0.85.

MRI: sensitivity 0.92, specificity 0.88.

Subgroup: partial tears (n=60): US sens 0.62, MRI 0.80.

Report clinical correlations, recommendations, and uncertainty.

## 8) Behavioral intervention

Population: Adults with chronic insomnia (n=120).

Intervention: Digital CBT-I app (8 weeks).

Comparator: Sleep hygiene education.

Endpoints: ISI score change (primary), SOL, WASO, patient-reported satisfaction.

Results: ISI Δ mean (SD): CBT-I −9.2 (5.1) vs control −3.8 (4.9); SOL −22 vs −8 min; WASO −31 vs −12 min; AEs: transient headache 4% vs 2%.

Provide effectiveness, bias/limitations, and next steps.

## 9) Special populations (pregnancy)

Cohort: Pregnant persons with epilepsy on levetiracetam (n=210); outcomes: major congenital malformations (MCM), preterm birth.

Controls: Pregnant, no AED (n=840), matched 1:4.

Results: MCM 2.4% vs 2.1%; preterm 9.5% vs 7.8%.

Adjust for age, parity, diabetes, smoking.

Assess safety signals and residual confounding.

## 10) Sparse/incomplete real-world note

Subject: S088, F, ~70; HFpEF dx 2024; started spironolactone “recently.”

Notes mention dizziness; no lab values recorded; unclear dose; BP “low-normal.”

Ask what key data are missing; give cautious recommendations and monitoring plan.

## 11) Multi-intervention, drug–drug interaction risk

Subject: S133, M, 67; AF + CAD.

Interventions: Amiodarone 200 mg QD (start 2025-06-10), Dabigatran 150 mg BID (since 2024), Diltiazem 180 mg QD.

Labs: Creatinine 1.4 mg/dL (eGFR 52), AST/ALT normal.

Events: Gum bleeding episodes increased after amiodarone start.

Assess interaction risk, safety signal, and mitigation.

## 12) Observational registry with imaging and PROs

Registry: Moderate–severe psoriasis, biologic-naïve, n=520; follow-up 24 weeks.

Interventions: Ustekinumab (n=210) vs Secukinumab (n=310).

Endpoints: PASI75/90, DLQI change, adverse events; imaging: nail US thickness subset (n=120).

Results: PASI90: 58% vs 64%; DLQI Δ: −8.1 vs −9.4; AEs serious: 1.4% vs 1.9%.

Summarize effectiveness, safety, and limitations.

## 13) Health equity subgroup analysis

Dataset: HTN program in community clinics (urban vs rural); n=4,200.

Intervention: Nurse-led BP titration protocol.

Primary: BP control (<130/80) at 6 months; Secondary: medication adherence (PDC).

Urban: control 58%, PDC 0.78; Rural: control 52%, PDC 0.73.

Analyze disparities, likely drivers, and equitable recommendations.

## 14) Vaccine effectiveness test-negative design

Population: Adults with ILI tested for influenza, 2024–2025 season; n=8,400.

Exposure: Received FluVax-2024 ≥14 days before onset.

Outcomes: Lab-confirmed influenza positivity.

Vaccinated: cases=620, controls=3,140. Unvaccinated: cases=1,040, controls=3,600.

Estimate VE, discuss bias/limitations.

## 15) Oncology small single-arm study

Indication: Relapsed DLBCL.

Intervention: CAR-T product X; n=42.

Endpoints: ORR, CR rate, DOR, CRS/ICANS grading.

Results: ORR 62%, CR 38%; median DOR 7.8 mo; CRS any 54% (grade ≥3: 9%); ICANS any 21% (grade ≥3: 7%).

Provide clinical correlations, safety management notes, and uncertainties.

---

### Notes for usage

- Avoid PII; use study-level or de-identified subject IDs.
- Include dates/timelines, doses, routes, comparators, and endpoints where possible.
- If asking for computation, you can add: “Please output JSON only per the schema.”
- The agent will emphasize clinical correlations, intervention effectiveness, safety, evidence-based recommendations, and uncertainty when applicable.
