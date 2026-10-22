"""Drug Interaction and Pharmacovigilance Service.

Contains built-in clinical drug interaction knowledge base (~50 common pairwise contraindications),
pairwise cross-checks, and active prescription evaluation for patients.
"""

import logging
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models.drug import Drug, DrugInteraction, InteractionSeverity, Prescription

logger = logging.getLogger("medai.services.drug_interaction")

# Built-in knowledge base of common drug interactions (generic name pairs in lowercase sorted order)
COMMON_DRUG_INTERACTIONS: Dict[Tuple[str, str], Dict[str, Any]] = {
    ("aspirin", "warfarin"): {
        "severity": InteractionSeverity.CRITICAL,
        "description": "Concurrent use significantly increases risk of major gastrointestinal and systemic bleeding due to dual antiplatelet and anticoagulant inhibition.",
        "recommendation": "Avoid combination unless strictly indicated for mechanical heart valves. Monitor INR closely.",
    },
    ("clopidogrel", "omeprazole"): {
        "severity": InteractionSeverity.HIGH,
        "description": "Omeprazole inhibits CYP2C19, significantly reducing metabolic activation of clopidogrel and increasing stent thrombosis risk.",
        "recommendation": "Switch to pantoprazole or famotidine which exhibit minimal CYP2C19 inhibition.",
    },
    ("atorvastatin", "clarithromycin"): {
        "severity": InteractionSeverity.HIGH,
        "description": "Clarithromycin is a potent CYP3A4 inhibitor, causing dramatic increases in serum atorvastatin levels and risk of rhabdomyolysis.",
        "recommendation": "Temporarily suspend atorvastatin during macrolide therapy or switch to azithromycin.",
    },
    ("atorvastatin", "gemfibrozil"): {
        "severity": InteractionSeverity.HIGH,
        "description": "Gemfibrozil inhibits statin glucuronidation and OATP1B1 uptake, drastically increasing risk of severe myopathy/rhabdomyolysis.",
        "recommendation": "Avoid concomitant therapy. Fenofibrate is preferred if fibrate is necessary.",
    },
    ("lisinopril", "spironolactone"): {
        "severity": InteractionSeverity.HIGH,
        "description": "Dual renin-angiotensin-aldosterone blockade and potassium retention lead to life-threatening hyperkalemia and cardiac arrhythmias.",
        "recommendation": "Monitor serum potassium and creatinine within 1 week of initiation and periodically thereafter.",
    },
    ("ciprofloxacin", "theophylline"): {
        "severity": InteractionSeverity.CRITICAL,
        "description": "Ciprofloxacin strongly inhibits CYP1A2, leading to theophylline toxicity manifesting as seizures, cardiac arrhythmias, and death.",
        "recommendation": "Avoid ciprofloxacin or reduce theophylline dose by 50% with strict serum concentration monitoring.",
    },
    ("fluoxetine", "tramadol"): {
        "severity": InteractionSeverity.CRITICAL,
        "description": "Synergistic serotonergic elevation increases risk of serotonin syndrome (hyperthermia, clonus, delirium). Tramadol analgesia also reduced.",
        "recommendation": "Avoid combination. Monitor for agitation, autonomic instability, and neuromuscular hyperactivity.",
    },
    ("amiodarone", "warfarin"): {
        "severity": InteractionSeverity.HIGH,
        "description": "Amiodarone inhibits CYP2C9 and CYP3A4, causing prolonged elimination of warfarin and severe bleeding.",
        "recommendation": "Empirically reduce warfarin dose by 30-50% when initiating amiodarone.",
    },
    ("digoxin", "verapamil"): {
        "severity": InteractionSeverity.HIGH,
        "description": "Verapamil reduces renal and non-renal clearance of digoxin via P-glycoprotein inhibition, doubling serum digoxin levels.",
        "recommendation": "Reduce digoxin dosage by 50% and monitor ECG for high-degree AV block.",
    },
    ("ibuprofen", "lisinopril"): {
        "severity": InteractionSeverity.MODERATE,
        "description": "NSAIDs blunt ACE-inhibitor antihypertensive efficacy and synergistically impair renal prostaglandins, worsening acute kidney injury.",
        "recommendation": "Limit NSAID duration; monitor blood pressure, renal panel, and hydration.",
    },
    ("aspirin", "ibuprofen"): {
        "severity": InteractionSeverity.MODERATE,
        "description": "Ibuprofen competitively blocks the COX-1 acetylation site of aspirin, antagonizing cardioprotective antiplatelet effects.",
        "recommendation": "Take immediate-release aspirin at least 30 minutes before or 8 hours after ibuprofen.",
    },
    ("methotrexate", "trimethoprim"): {
        "severity": InteractionSeverity.CRITICAL,
        "description": "Both agents inhibit dihydrofolate reductase. Concomitant use causes severe pancytopenia, bone marrow suppression, and megaloblastic anemia.",
        "recommendation": "Strictly contraindicated. Do not prescribe trimethoprim/sulfamethoxazole with methotrexate.",
    },
    ("metformin", "iodinated contrast"): {
        "severity": InteractionSeverity.HIGH,
        "description": "Contrast-induced nephropathy can lead to lactic acidosis accumulation in patients taking metformin.",
        "recommendation": "Withhold metformin at time of or prior to imaging procedure and resume 48 hours post-procedure after confirming stable renal function.",
    },
    ("sildenafil", "nitroglycerin"): {
        "severity": InteractionSeverity.CRITICAL,
        "description": "PDE-5 inhibitors potentiate nitric oxide-mediated cyclic GMP vasodilation, producing profound, refractory, and potentially fatal hypotension.",
        "recommendation": "Absolute contraindication. Never co-administer nitrates with PDE-5 inhibitors.",
    },
    ("apixaban", "carbamazepine"): {
        "severity": InteractionSeverity.HIGH,
        "description": "Carbamazepine strongly induces CYP3A4 and P-gp, dramatically reducing apixaban plasma concentration and increasing stroke risk.",
        "recommendation": "Avoid combination. Use alternative anticoagulant or non-inducing anticonvulsant.",
    },
    ("rivaroxaban", "ketoconazole"): {
        "severity": InteractionSeverity.HIGH,
        "description": "Ketoconazole inhibits both CYP3A4 and P-gp, elevating rivaroxaban AUC and heightening bleeding hazards.",
        "recommendation": "Avoid concomitant systemic azole antifungals with rivaroxaban.",
    },
    ("azithromycin", "ondansetron"): {
        "severity": InteractionSeverity.MODERATE,
        "description": "Additive prolongation of the QTc interval increasing risk of Torsades de Pointes ventricular arrhythmia.",
        "recommendation": "Obtain baseline ECG in patients with underlying cardiac risk factors or electrolyte disturbances.",
    },
    ("ciprofloxacin", "prednisone"): {
        "severity": InteractionSeverity.HIGH,
        "description": "Synergistic damage to collagen structures markedly increases incidence of Achilles tendonitis and tendon rupture.",
        "recommendation": "Instruct patient to immediately discontinue therapy and avoid exercise if tendon pain or swelling occurs.",
    },
    ("lithium", "hydrochlorothiazide"): {
        "severity": InteractionSeverity.HIGH,
        "description": "Thiazide diuretics promote compensatory proximal tubule reabsorption of sodium and lithium, precipitating lithium toxicity.",
        "recommendation": "Reduce lithium dosage by 50% and monitor serum lithium levels frequently.",
    },
    ("potassium chloride", "spironolactone"): {
        "severity": InteractionSeverity.CRITICAL,
        "description": "Excess exogenous potassium intake with potassium-sparing diuretic causes rapid hyperkalemia, cardiac arrest, and death.",
        "recommendation": "Do not co-prescribe routine potassium supplements with aldosterone antagonists unless severe documented hypokalemia.",
    },
    ("linezolid", "sertraline"): {
        "severity": InteractionSeverity.CRITICAL,
        "description": "Linezolid is a reversible, non-selective MAO inhibitor; co-administration with SSRIs can trigger fatal serotonin syndrome.",
        "recommendation": "Avoid linezolid in patients on SSRIs unless urgent; wash out SSRI for 2 weeks before linezolid when possible.",
    },
    ("levothyroxine", "calcium carbonate"): {
        "severity": InteractionSeverity.LOW,
        "description": "Calcium binds levothyroxine in the gastrointestinal tract, significantly decreasing thyroid hormone absorption.",
        "recommendation": "Separate administration by at least 4 hours.",
    },
    ("levothyroxine", "ferrous sulfate"): {
        "severity": InteractionSeverity.LOW,
        "description": "Iron complexes with levothyroxine in the gut, reducing therapeutic absorption and leading to persistent hypothyroidism.",
        "recommendation": "Separate dosing by at least 4 hours.",
    },
    ("ciprofloxacin", "ferrous sulfate"): {
        "severity": InteractionSeverity.MODERATE,
        "description": "Divalent and trivalent cations chelate fluoroquinolones, diminishing antibiotic bioavailability by up to 90%.",
        "recommendation": "Take ciprofloxacin 2 hours before or 6 hours after iron supplements.",
    },
    ("allopurinol", "azathioprine"): {
        "severity": InteractionSeverity.CRITICAL,
        "description": "Allopurinol inhibits xanthine oxidase, blocking 6-mercaptopurine degradation and producing life-threatening myelosuppression.",
        "recommendation": "Reduce azathioprine dosage to 25-33% of standard dose and monitor complete blood counts weekly.",
    },
    ("diltiazem", "simvastatin"): {
        "severity": InteractionSeverity.HIGH,
        "description": "Diltiazem inhibits CYP3A4, tripling simvastatin peak concentrations and predisposing to severe myotoxicity.",
        "recommendation": "Do not exceed 10mg simvastatin daily when combined with diltiazem.",
    },
    ("amiodarone", "digoxin"): {
        "severity": InteractionSeverity.HIGH,
        "description": "Amiodarone inhibits P-glycoprotein, reducing renal clearance and doubling serum digoxin concentration.",
        "recommendation": "Decrease digoxin dose by 50% upon starting amiodarone.",
    },
    ("clarithromycin", "colchicine"): {
        "severity": InteractionSeverity.CRITICAL,
        "description": "Dual CYP3A4 and P-gp inhibition causes toxic colchicine accumulation, particularly in patients with renal or hepatic impairment.",
        "recommendation": "Contraindicated in patients with renal/hepatic failure. In others, drastically reduce colchicine dose.",
    },
    ("warfarin", "miconazole"): {
        "severity": InteractionSeverity.CRITICAL,
        "description": "Even topical/oral gel miconazole potently inhibits CYP2C9, precipitating severe bleeding episodes.",
        "recommendation": "Avoid combination. Use nystatin for oral candidiasis in patients on warfarin.",
    },
    ("losartan", "potassium chloride"): {
        "severity": InteractionSeverity.MODERATE,
        "description": "Angiotensin receptor blockers increase serum potassium; supplemental potassium increases hyperkalemia risk.",
        "recommendation": "Regularly check serum electrolytes.",
    },
    ("tacrolimus", "voriconazole"): {
        "severity": InteractionSeverity.CRITICAL,
        "description": "Voriconazole inhibits CYP3A4, causing massive 3- to 10-fold spikes in tacrolimus levels and acute nephrotoxicity.",
        "recommendation": "Reduce tacrolimus dose to one-third and monitor trough levels daily.",
    },
    ("metformin", "cimetidine"): {
        "severity": InteractionSeverity.MODERATE,
        "description": "Cimetidine inhibits OCT2 renal clearance of metformin, increasing circulating levels and lactic acidosis hazard.",
        "recommendation": "Use famotidine or PPI as alternate gastric acid suppression.",
    },
    ("metoprolol", "fluoxetine"): {
        "severity": InteractionSeverity.MODERATE,
        "description": "Fluoxetine is a strong CYP2D6 inhibitor, substantially raising metoprolol exposure and causing marked bradycardia and hypotension.",
        "recommendation": "Monitor heart rate and blood pressure; consider atenolol or bisoprolol which do not depend on CYP2D6.",
    },
    ("clopidogrel", "fluconazole"): {
        "severity": InteractionSeverity.HIGH,
        "description": "Fluconazole inhibits CYP2C19, diminishing conversion of clopidogrel to active metabolite.",
        "recommendation": "Consider alternative antiplatelet (ticagrelor) or antifungal agent.",
    },
    ("enalapril", "potassium chloride"): {
        "severity": InteractionSeverity.MODERATE,
        "description": "ACE inhibitors cause aldosterone suppression, leading to potassium retention.",
        "recommendation": "Check potassium levels regularly.",
    },
    ("warfarin", "ciprofloxacin"): {
        "severity": InteractionSeverity.HIGH,
        "description": "Ciprofloxacin disrupts intestinal gut flora synthesizing vitamin K and inhibits CYP1A2, increasing INR and bleeding.",
        "recommendation": "Check INR within 3 days of starting ciprofloxacin and adjust warfarin.",
    },
    ("carbamazepine", "oral contraceptives"): {
        "severity": InteractionSeverity.HIGH,
        "description": "Strong CYP3A4 induction enhances estrogen/progestin metabolism, leading to contraceptive failure.",
        "recommendation": "Advise barrier methods or intrauterine devices.",
    },
    ("rifampin", "warfarin"): {
        "severity": InteractionSeverity.HIGH,
        "description": "Rifampin is a potent inducer of hepatic CYP enzymes, dramatically increasing warfarin clearance and causing treatment failure.",
        "recommendation": "Warfarin dose may need to be doubled or tripled; monitor INR every 2 to 3 days.",
    },
    ("phenytoin", "dexamethasone"): {
        "severity": InteractionSeverity.MODERATE,
        "description": "Phenytoin induces CYP3A4, accelerating dexamethasone breakdown and blunting cerebral edema control.",
        "recommendation": "Double the dexamethasone dose if given with phenytoin.",
    },
    ("doxycycline", "antacids"): {
        "severity": InteractionSeverity.LOW,
        "description": "Aluminum and magnesium ions bind doxycycline in stomach, impeding absorption.",
        "recommendation": "Separate administration by 2 to 3 hours.",
    },
    ("tramadol", "ondansetron"): {
        "severity": InteractionSeverity.MODERATE,
        "description": "Ondansetron 5-HT3 antagonism can reduce tramadol central analgesic effectiveness and mildly contribute to QT prolongation.",
        "recommendation": "Titrate pain relief; consider alternate antiemetic if analgesic response is insufficient.",
    },
    ("gabapentin", "morphine"): {
        "severity": InteractionSeverity.HIGH,
        "description": "Additive central nervous system depression; morphine also increases gabapentin AUC by ~44%, heightening respiratory depression.",
        "recommendation": "Start with lowest dosages and monitor respiratory status closely.",
    },
    ("pregabalin", "oxycodone"): {
        "severity": InteractionSeverity.HIGH,
        "description": "Synergistic CNS and respiratory depression risk.",
        "recommendation": "Reduce doses, avoid concomitant alcohol or sedatives, and monitor sedation levels.",
    },
    ("bupropion", "selegiline"): {
        "severity": InteractionSeverity.CRITICAL,
        "description": "Concurrent MAO inhibitors and bupropion trigger acute hypertensive crisis and neurotoxicity.",
        "recommendation": "Strictly contraindicated. Maintain at least a 14-day washout period between agents.",
    },
    ("paroxetine", "tamoxifen"): {
        "severity": InteractionSeverity.CRITICAL,
        "description": "Paroxetine potently inhibits CYP2D6, preventing bioactivation of tamoxifen to active endoxifen and worsening breast cancer recurrence.",
        "recommendation": "Switch to venlafaxine or escitalopram, which have minimal CYP2D6 inhibition.",
    },
    ("simvastatin", "erythromycin"): {
        "severity": InteractionSeverity.HIGH,
        "description": "Erythromycin inhibits CYP3A4, elevating simvastatin levels and causing severe rhabdomyolysis.",
        "recommendation": "Hold statin during macrolide antibiotic course.",
    },
    ("ciprofloxacin", "nsaids"): {
        "severity": InteractionSeverity.MODERATE,
        "description": "Co-administration increases risk of central nervous system excitation and epileptic seizures.",
        "recommendation": "Use caution in patients with known seizure disorder.",
    },
    ("aspirin", "methotrexate"): {
        "severity": InteractionSeverity.HIGH,
        "description": "Salicylates displace methotrexate from plasma proteins and suppress renal excretion, precipitating severe toxicity.",
        "recommendation": "Avoid high-dose aspirin or NSAIDs with anti-inflammatory/chemotherapeutic doses of methotrexate.",
    },
    ("clozapine", "ciprofloxacin"): {
        "severity": InteractionSeverity.HIGH,
        "description": "CYP1A2 inhibition elevates clozapine concentrations, raising risk of seizures, orthostatic collapse, and myocarditis.",
        "recommendation": "Halve clozapine dose and monitor serum levels.",
    },
    ("propranolol", "albuterol"): {
        "severity": InteractionSeverity.HIGH,
        "description": "Non-selective beta-blockers antagonize beta-2 bronchodilation, precipitating severe bronchospasm in asthmatic patients.",
        "recommendation": "Use cardioselective beta-1 blockers (e.g. metoprolol) or avoid beta-blockers in reactive airway disease.",
    },
}


class DrugInteractionService:
    """Evaluates multi-drug contraindications and active prescription safety."""

    def __init__(self):
        self.interactions_kb = COMMON_DRUG_INTERACTIONS

    def _normalize_key(self, drug_a: str, drug_b: str) -> Tuple[str, str]:
        """Produce deterministic sorted pair of lowercased generic names."""
        a, b = drug_a.strip().lower(), drug_b.strip().lower()
        return (a, b) if a <= b else (b, a)

    def get_interaction_severity(
        self, drug_a: str, drug_b: str
    ) -> Optional[Dict[str, Any]]:
        """Lookup interaction between two drugs by generic name."""
        key = self._normalize_key(drug_a, drug_b)
        return self.interactions_kb.get(key)

    async def check_interactions_by_ids(
        self, drug_ids: List[int], session: AsyncSession
    ) -> List[Dict[str, Any]]:
        """Check all pairwise combinations among a list of drug IDs using database and built-in rules."""
        if len(drug_ids) < 2:
            return []

        # Retrieve drug models from database
        stmt = select(Drug).where(Drug.id.in_(drug_ids))
        res = await session.execute(stmt)
        drugs = list(res.scalars().all())
        drug_dict = {d.id: d for d in drugs}

        interactions: List[Dict[str, Any]] = []

        # 1. Query database DrugInteraction table
        db_stmt = select(DrugInteraction).where(
            DrugInteraction.drug_a_id.in_(drug_ids),
            DrugInteraction.drug_b_id.in_(drug_ids),
        )
        db_res = await session.execute(db_stmt)
        db_interactions = db_res.scalars().all()

        recorded_pairs = set()
        for inter in db_interactions:
            pair = tuple(sorted([inter.drug_a_id, inter.drug_b_id]))
            recorded_pairs.add(pair)
            da = drug_dict.get(inter.drug_a_id)
            db = drug_dict.get(inter.drug_b_id)
            interactions.append({
                "drug_a_id": inter.drug_a_id,
                "drug_a_name": da.name if da else f"Drug #{inter.drug_a_id}",
                "drug_b_id": inter.drug_b_id,
                "drug_b_name": db.name if db else f"Drug #{inter.drug_b_id}",
                "severity": inter.severity,
                "description": inter.description,
                "recommendation": inter.recommendation,
            })

        # 2. Check built-in KB for any pairs not already captured
        for i in range(len(drugs)):
            for j in range(i + 1, len(drugs)):
                da, db = drugs[i], drugs[j]
                pair = tuple(sorted([da.id, db.id]))
                if pair in recorded_pairs:
                    continue

                # Check both brand and generic name matches
                kb_match = self.get_interaction_severity(da.generic_name, db.generic_name)
                if not kb_match:
                    kb_match = self.get_interaction_severity(da.name, db.name)

                if kb_match:
                    interactions.append({
                        "drug_a_id": da.id,
                        "drug_a_name": da.name,
                        "drug_b_id": db.id,
                        "drug_b_name": db.name,
                        "severity": kb_match["severity"],
                        "description": kb_match["description"],
                        "recommendation": kb_match["recommendation"],
                    })

        return interactions

    async def check_patient_interactions(
        self, patient_id: int, session: AsyncSession
    ) -> Dict[str, Any]:
        """Check all active prescriptions for a patient and evaluate pairwise conflicts."""
        # Query active prescriptions
        stmt = (
            select(Prescription)
            .where(Prescription.patient_id == patient_id, Prescription.is_active.is_(True))
        )
        res = await session.execute(stmt)
        prescriptions = list(res.scalars().all())

        if not prescriptions:
            return {
                "patient_id": patient_id,
                "evaluated_drugs": [],
                "total_interactions_found": 0,
                "has_critical_interaction": False,
                "interactions": [],
            }

        drug_ids = list({p.drug_id for p in prescriptions})
        drug_stmt = select(Drug).where(Drug.id.in_(drug_ids))
        drug_res = await session.execute(drug_stmt)
        drugs = list(drug_res.scalars().all())

        interactions = await self.check_interactions_by_ids(drug_ids, session)
        has_critical = any(
            item["severity"] in (InteractionSeverity.CRITICAL, "CRITICAL")
            for item in interactions
        )

        return {
            "patient_id": patient_id,
            "evaluated_drugs": [{"id": d.id, "name": d.name, "generic_name": d.generic_name} for d in drugs],
            "total_interactions_found": len(interactions),
            "has_critical_interaction": has_critical,
            "interactions": interactions,
        }


# Singleton interaction service instance
drug_interaction_service = DrugInteractionService()
