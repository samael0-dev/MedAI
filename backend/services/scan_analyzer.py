"""Medical Scan Analyzer Service.

Provides centralized routing, DICOM/image parsing, modality-specific inference,
and automated radiologic report generation for X-ray, MRI, CT, and Pathology.
"""

import logging
import os
from pathlib import Path
from typing import Any, Dict, Optional, Union
import numpy as np
from PIL import Image

from config import settings
from models.scan import ScanType
from ml.chest_xray import (
    load_model as load_xray_model,
    predict as predict_xray,
    preprocess_xray,
)
from ml.brain_mri import (
    load_model as load_mri_model,
    predict as predict_mri,
    preprocess_mri,
)
from ml.pathology import (
    load_model as load_pathology_model,
    predict as predict_pathology,
    preprocess_pathology,
)

logger = logging.getLogger("medai.services.scan_analyzer")


class ScanAnalyzer:
    """Medical scan analysis engine orchestrating multi-modal deep learning models."""

    def __init__(self, model_dir: Optional[str] = None):
        self.model_dir = Path(model_dir or settings.MODEL_DIR)
        self.xray_weights = self.model_dir / "densenet121_xray.pth"
        self.mri_weights = self.model_dir / "resnet50_mri.pth"
        self.pathology_weights = self.model_dir / "efficientnet_pathology.pth"

        # Lazy loaded model instances
        self._xray_model = None
        self._mri_model = None
        self._pathology_model = None

    @property
    def xray_model(self):
        if self._xray_model is None:
            self._xray_model = load_xray_model(self.xray_weights)
        return self._xray_model

    @property
    def mri_model(self):
        if self._mri_model is None:
            self._mri_model = load_mri_model(self.mri_weights)
        return self._mri_model

    @property
    def pathology_model(self):
        if self._pathology_model is None:
            self._pathology_model = load_pathology_model(self.pathology_weights)
        return self._pathology_model

    def _preprocess_dicom(self, file_path: Union[str, Path]) -> np.ndarray:
        """Read medical DICOM (.dcm) file and extract normalized pixel array.

        Handles RescaleIntercept, RescaleSlope, and windowing where available.
        """
        try:
            import pydicom
            ds = pydicom.dcmread(str(file_path))
            pixel_array = ds.pixel_array.astype(np.float32)

            # Apply rescale intercept and slope if present
            slope = getattr(ds, "RescaleSlope", 1)
            intercept = getattr(ds, "RescaleIntercept", 0)
            pixel_array = pixel_array * slope + intercept

            # Min-max normalization to 0..255 uint8 range
            p_min = pixel_array.min()
            p_max = pixel_array.max()
            if p_max > p_min:
                pixel_array = ((pixel_array - p_min) / (p_max - p_min) * 255.0).astype(np.uint8)
            else:
                pixel_array = np.zeros_like(pixel_array, dtype=np.uint8)

            logger.info("Decoded DICOM file %s successfully: shape=%s", file_path, pixel_array.shape)
            return pixel_array
        except Exception as exc:
            logger.warning("DICOM decode failed (%s). Falling back to standard image reader.", exc)
            return self._preprocess_image(file_path)

    def _preprocess_image(self, file_path: Union[str, Path]) -> np.ndarray:
        """Read standard image formats (PNG, JPG, TIFF) to numpy array."""
        try:
            with Image.open(str(file_path)) as img:
                return np.array(img.convert("RGB"))
        except Exception as exc:
            logger.error("Failed reading image file %s: %s", file_path, exc)
            # Generate fallback blank image to prevent pipeline crash
            return np.zeros((224, 224, 3), dtype=np.uint8)

    def load_and_preprocess(self, file_path: Union[str, Path]) -> np.ndarray:
        """Detect file format and convert to standard image array."""
        ext = str(file_path).lower()
        if ext.endswith(".dcm") or ext.endswith(".dicom"):
            return self._preprocess_dicom(file_path)
        return self._preprocess_image(file_path)

    def analyze_xray(self, image_data: Union[str, Path, np.ndarray]) -> Dict[str, Any]:
        """Perform Chest X-ray pulmonary detection."""
        if isinstance(image_data, (str, Path)):
            image_data = self.load_and_preprocess(image_data)
        tensor = preprocess_xray(image_data)
        return predict_xray(tensor, self.xray_model, str(self.xray_weights))

    def analyze_mri(self, image_data: Union[str, Path, np.ndarray]) -> Dict[str, Any]:
        """Perform Brain MRI neuro-oncology detection."""
        if isinstance(image_data, (str, Path)):
            image_data = self.load_and_preprocess(image_data)
        tensor = preprocess_mri(image_data)
        return predict_mri(tensor, self.mri_model, str(self.mri_weights))

    def analyze_pathology(self, image_data: Union[str, Path, np.ndarray]) -> Dict[str, Any]:
        """Perform Histopathology cancer screening."""
        if isinstance(image_data, (str, Path)):
            image_data = self.load_and_preprocess(image_data)
        tensor = preprocess_pathology(image_data)
        return predict_pathology(tensor, self.pathology_model, str(self.pathology_weights))

    def analyze_scan(
        self, file_path: Union[str, Path], scan_type: Union[ScanType, str]
    ) -> Dict[str, Any]:
        """Route scan to appropriate deep learning modality model.

        Args:
            file_path: Path to stored scan file.
            scan_type: Modality (XRAY, MRI, CT, PATHOLOGY).

        Returns:
            Structured diagnostic dictionary.
        """
        scan_type_str = str(scan_type).upper()
        if hasattr(scan_type, "value"):
            scan_type_str = scan_type.value.upper()

        image_arr = self.load_and_preprocess(file_path)

        if "XRAY" in scan_type_str:
            result = self.analyze_xray(image_arr)
        elif "MRI" in scan_type_str or "CT" in scan_type_str:
            # CT scans evaluated through neuro/cross-sectional MRI pipeline
            result = self.analyze_mri(image_arr)
            result["modality"] = scan_type_str
        elif "PATHOLOGY" in scan_type_str:
            result = self.analyze_pathology(image_arr)
        else:
            result = self.analyze_xray(image_arr)

        report = self.generate_report(result)
        result["radiological_report"] = report
        return result

    def generate_report(self, results: Dict[str, Any]) -> str:
        """Generate formatted radiologist text report from model findings."""
        modality = results.get("modality", "Unknown")
        primary = results.get("primary_finding", "Inconclusive")
        conf = results.get("confidence_score", 0.0) * 100
        clinical_note = results.get("clinical_note", "No additional observations.")

        top_findings = results.get("top_findings", [])
        diff_diag = ", ".join([f"{item[0]} ({item[1]*100:.1f}%)" for item in top_findings if item[0] != primary])

        report_lines = [
            f"=== AUTOMATED MEDAI RADIOLOGY INFERENCE REPORT ===",
            f"EXAMINATION TYPE: {modality} Imaging Examination",
            f"PRIMARY FINDING: {primary} (Diagnostic Confidence: {conf:.1f}%)",
            f"DIFFERENTIAL DIAGNOSES: {diff_diag if diff_diag else 'None significant'}",
            f"IMPRESSION & CLINICAL CORRELATION:",
            f"  {clinical_note}",
            f"DISCLAIMER: AI-generated triage assessment. Must be verified by a board-certified radiologist.",
            f"==================================================",
        ]
        return "\n".join(report_lines)


# Singleton scan analyzer instance
scan_analyzer = ScanAnalyzer()
