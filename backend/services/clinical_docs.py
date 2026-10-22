"""Clinical Document Processing and NLP Service.

Transforms unstructured clinical consultations, progress notes, and discharge summaries
into structured JSON entities, ICD-10 diagnostics, and clinical action plans.
"""

import logging
import time
from typing import Any, Dict, List, Optional
from ml.nlp_pipeline import ClinicalNLPPipeline

logger = logging.getLogger("medai.services.clinical_docs")


class ClinicalDocService:
    """Service wrapping clinical NLP pipelines for document parsing and summarization."""

    def __init__(self, use_transformers: bool = False):
        self.nlp = ClinicalNLPPipeline(use_transformers=use_transformers)

    def extract_entities(self, text: str) -> Dict[str, List[str]]:
        """Extract medical conditions, drugs, procedures, symptoms, and dosages."""
        return self.nlp.extract_entities(text)

    def summarize_notes(self, raw_text: str, max_sentences: int = 3) -> str:
        """Condense lengthy progress notes into an executive clinical summary."""
        return self.nlp.summarize(raw_text, max_sentences=max_sentences)

    def generate_structured_report(
        self,
        raw_text: str,
        patient_id: Optional[int] = None,
        encounter_type: str = "Outpatient Consultation",
    ) -> Dict[str, Any]:
        """Convert unstructured text into a comprehensive structured clinical record."""
        start_t = time.perf_counter()

        entities = self.extract_entities(raw_text)
        icd10_codes = self.nlp.map_icd10(entities.get("conditions", []))
        summary = self.summarize_notes(raw_text)
        actions = self.nlp.derive_recommended_actions(entities)

        duration_ms = round((time.perf_counter() - start_t) * 1000, 2)

        return {
            "patient_id": patient_id,
            "encounter_type": encounter_type,
            "summary": summary,
            "extracted_entities": entities,
            "icd10_codes": icd10_codes,
            "recommended_actions": actions,
            "processing_time_ms": duration_ms,
        }


# Singleton clinical documentation service
clinical_doc_service = ClinicalDocService(use_transformers=False)
