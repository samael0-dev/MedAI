"""Clinical Natural Language Processing (NLP) Pipeline Module.

Provides medical entity extraction, clinical summarization, ICD-10 cross-referencing,
and urgency triage using transformer models with rule-based regex fallback.
"""

import logging
import re
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("medai.ml.nlp_pipeline")

# Known clinical entities catalog for high-precision extraction
CONDITIONS_KB = {
    "hypertension": {"icd10": "I10", "name": "Essential (primary) hypertension"},
    "htn": {"icd10": "I10", "name": "Essential hypertension"},
    "type 2 diabetes": {"icd10": "E11.9", "name": "Type 2 diabetes mellitus without complications"},
    "diabetes mellitus": {"icd10": "E11.9", "name": "Type 2 diabetes mellitus"},
    "t2dm": {"icd10": "E11.9", "name": "Type 2 diabetes mellitus"},
    "pneumonia": {"icd10": "J18.9", "name": "Pneumonia, unspecified organism"},
    "tuberculosis": {"icd10": "A15.0", "name": "Tuberculosis of lung"},
    "tb": {"icd10": "A15.0", "name": "Tuberculosis of lung"},
    "glioma": {"icd10": "C71.9", "name": "Malignant neoplasm of brain"},
    "meningioma": {"icd10": "D32.9", "name": "Benign neoplasm of meninges"},
    "carcinoma": {"icd10": "C80.1", "name": "Malignant neoplasm, unspecified"},
    "atrial fibrillation": {"icd10": "I48.91", "name": "Unspecified atrial fibrillation"},
    "afib": {"icd10": "I48.91", "name": "Atrial fibrillation"},
    "asthma": {"icd10": "J45.909", "name": "Unspecified asthma, uncomplicated"},
    "copd": {"icd10": "J44.9", "name": "Chronic obstructive pulmonary disease"},
    "hyperlipidemia": {"icd10": "E78.5", "name": "Hyperlipidemia, unspecified"},
    "dyslipidemia": {"icd10": "E78.5", "name": "Hyperlipidemia"},
    "chronic kidney disease": {"icd10": "N18.9", "name": "Chronic kidney disease, unspecified"},
    "ckd": {"icd10": "N18.9", "name": "Chronic kidney disease"},
    "coronary artery disease": {"icd10": "I25.10", "name": "Atherosclerotic heart disease"},
    "cad": {"icd10": "I25.10", "name": "Coronary artery disease"},
}

DRUGS_KB = [
    "aspirin", "atorvastatin", "metformin", "lisinopril", "amoxicillin",
    "ciprofloxacin", "warfarin", "clopidogrel", "omeprazole", "levothyroxine",
    "metoprolol", "losartan", "amlodipine", "azithromycin", "rifampin",
    "isoniazid", "ethambutol", "pyrazinamide", "carboplatin", "paclitaxel",
    "doxorubicin", "pembrolizumab", "trastuzumab", "apixaban", "rivaroxaban",
]

PROCEDURES_KB = [
    "chest x-ray", "mri brain", "ct scan", "echocardiogram", "biopsy",
    "electrocardiogram", "ecg", "ekg", "bronchoscopy", "endoscopy",
    "lumbar puncture", "coronary angiogram", "ultrasound", "pet scan",
]

SYMPTOMS_KB = [
    "fever", "cough", "shortness of breath", "dyspnea", "chest pain",
    "headache", "fatigue", "nausea", "vomiting", "hemoptysis", "dizziness",
    "syncope", "edema", "weight loss", "night sweats", "wheezing",
]


class ClinicalNLPPipeline:
    """Natural Language Processing engine for unstructured clinical documentation."""

    def __init__(self, use_transformers: bool = False):
        self.use_transformers = use_transformers
        self.transformer_pipeline = None

        if self.use_transformers:
            try:
                from transformers import pipeline
                self.transformer_pipeline = pipeline(
                    "summarization", model="sshleifer/distilbart-cnn-12-6", device=-1
                )
                logger.info("Initialized transformer summarization pipeline.")
            except Exception as exc:
                logger.info("Transformers pipeline not initialized (%s). Utilizing rule-based NLP.", exc)

    def extract_entities(self, text: str) -> Dict[str, List[str]]:
        """Extract medical entities (conditions, medications, procedures, symptoms, dosages) from clinical text."""
        lower_text = text.lower()
        extracted: Dict[str, List[str]] = {
            "conditions": [],
            "medications": [],
            "procedures": [],
            "symptoms": [],
            "dosages": [],
        }

        # Extract conditions
        for cond in CONDITIONS_KB:
            pattern = r"\b" + re.escape(cond) + r"\b"
            if re.search(pattern, lower_text):
                canonical = cond.upper() if len(cond) <= 4 else cond.title()
                if canonical not in extracted["conditions"]:
                    extracted["conditions"].append(canonical)

        # Extract medications
        for drug in DRUGS_KB:
            pattern = r"\b" + re.escape(drug) + r"\b"
            if re.search(pattern, lower_text):
                extracted["medications"].append(drug.title())

        # Extract procedures
        for proc in PROCEDURES_KB:
            pattern = r"\b" + re.escape(proc) + r"\b"
            if re.search(pattern, lower_text):
                extracted["procedures"].append(proc.title())

        # Extract symptoms
        for sym in SYMPTOMS_KB:
            pattern = r"\b" + re.escape(sym) + r"\b"
            if re.search(pattern, lower_text):
                extracted["symptoms"].append(sym.title())

        # Extract dosages (e.g. 500mg, 10 mg, 5ml, 2 tablets)
        dosage_matches = re.findall(
            r"\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|units?|tablets?|capsules?)\b", lower_text
        )
        extracted["dosages"] = list(set(dosage_matches))

        return extracted

    def map_icd10(self, extracted_conditions: List[str]) -> List[Dict[str, str]]:
        """Map extracted condition strings to ICD-10 diagnostic codes."""
        results: List[Dict[str, str]] = []
        seen_codes = set()

        for cond in extracted_conditions:
            lookup_key = cond.lower()
            if lookup_key in CONDITIONS_KB:
                code_info = CONDITIONS_KB[lookup_key]
                if code_info["icd10"] not in seen_codes:
                    seen_codes.add(code_info["icd10"])
                    results.append({
                        "condition": cond,
                        "icd10_code": code_info["icd10"],
                        "description": code_info["name"],
                    })

        return results

    def summarize(self, text: str, max_sentences: int = 3) -> str:
        """Generate a concise clinical summary from long narrative notes."""
        if self.transformer_pipeline:
            try:
                res = self.transformer_pipeline(text, max_length=60, min_length=20, do_sample=False)
                return res[0]["summary_text"]
            except Exception as exc:
                logger.debug("Transformer inference failed: %s. Using heuristic summary.", exc)

        # Heuristic medical note summarizer
        sentences = [s.strip() for s in re.split(r"[.!?\n]+", text) if len(s.strip()) > 15]
        if not sentences:
            return "No comprehensive clinical narrative found."

        # Prioritize sentences containing assessment, diagnosis, plan, or key symptoms
        priority_keywords = [
            "assess", "diagnos", "impression", "plan", "prescribed", "presents with",
            "findings", "consistent with", "suggest", "noted",
        ]
        scored_sentences: List[Tuple[int, str]] = []
        for s in sentences:
            score = sum(1 for kw in priority_keywords if kw in s.lower())
            scored_sentences.append((score, s))

        # Sort by score descending and take top sentences in original order
        scored_sentences.sort(key=lambda x: x[0], reverse=True)
        top_sentences = [item[1] for item in scored_sentences[:max_sentences]]
        return ". ".join(top_sentences) + "."

    def derive_recommended_actions(self, entities: Dict[str, List[str]]) -> List[str]:
        """Derive actionable clinical workflow steps based on extracted entities."""
        actions: List[str] = []

        conditions = [c.lower() for c in entities.get("conditions", [])]
        symptoms = [s.lower() for s in entities.get("symptoms", [])]
        meds = [m.lower() for m in entities.get("medications", [])]

        if "tuberculosis" in conditions or "tb" in conditions:
            actions.append("Order sputum AFB smear & GeneXpert MTB/RIF assay")
            actions.append("Initiate airborne infection isolation precautions")
        if "pneumonia" in conditions or "cough" in symptoms:
            actions.append("Obtain posteroanterior and lateral chest radiography")
            actions.append("Evaluate CURB-65 / pneumonia severity score")
        if "hypertension" in conditions or "htn" in conditions:
            actions.append("Schedule 24-hour ambulatory blood pressure monitoring")
        if "warfarin" in meds:
            actions.append("Check baseline prothrombin time / INR within 48 hours")
        if not actions:
            actions.append("Routine clinical follow-up as indicated by attending physician")

        return actions
