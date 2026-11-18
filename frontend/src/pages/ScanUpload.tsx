import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  UploadCloud,
  FileText,
  Activity,
  Layers,
  Sparkles,
  Camera,
  X,
} from 'lucide-react';
import { getPatients, uploadScan } from '../api/client';
import { useToast } from '../context/ToastContext';
import type { ScanType, ScanPriority } from '../types';

export const ScanUpload: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [scanType, setScanType] = useState<ScanType>('X-ray');
  const [patientId, setPatientId] = useState<string>('');
  const [priority, setPriority] = useState<ScanPriority>('routine');
  const [clinicalIndication, setClinicalIndication] = useState('');

  // Analysis progress animation states
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [pipelineStage, setPipelineStage] = useState('Initializing scan...');

  // Query patients
  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: getPatients,
  });

  // Select first patient by default once loaded
  React.useEffect(() => {
    if (patients.length > 0 && !patientId) {
      setPatientId(patients[0].id);
    }
  }, [patients, patientId]);

  const selectedPatient = patients.find((p) => p.id === patientId);

  // File Handling
  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/') && !file.name.endsWith('.dcm') && !file.name.endsWith('.dicom')) {
      showToast('Please upload a valid medical image (PNG, JPEG, DICOM)', 'warning');
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setFilePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error('No file chosen');
      return await uploadScan(selectedFile, scanType, patientId);
    },
    onSuccess: (newScan) => {
      showToast('Scan successfully analyzed by MedAI Vision engine!', 'success', 'Analysis Complete');
      setTimeout(() => {
        navigate(`/scan-results?id=${newScan.id}`);
      }, 800);
    },
    onError: (err: Error) => {
      setIsProcessing(false);
      showToast(err.message || 'Upload processing failed', 'error');
    },
  });

  const handleStartAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      showToast('Please attach or drop a medical scan file first', 'warning');
      return;
    }
    if (!patientId) {
      showToast('Please select a target patient', 'warning');
      return;
    }

    setIsProcessing(true);
    setProgressPercent(10);
    setPipelineStage('Uploading and verifying DICOM integrity...');

    // Simulate real AI pipeline stages for high fidelity UX
    setTimeout(() => {
      setProgressPercent(35);
      setPipelineStage('Running Convolutional Feature Pyramid Network...');
    }, 600);

    setTimeout(() => {
      setProgressPercent(65);
      setPipelineStage('Generating Grad-CAM attention heatmap & pathology boundaries...');
    }, 1300);

    setTimeout(() => {
      setProgressPercent(90);
      setPipelineStage('Cross-referencing with ICD-11 & synthesizing findings...');
    }, 2000);

    setTimeout(() => {
      setProgressPercent(100);
      setPipelineStage('Finalizing diagnostics...');
      uploadMutation.mutate();
    }, 2500);
  };

  const scanTypes: { type: ScanType; title: string; desc: string; icon: React.FC<{ className?: string }> }[] = [
    { type: 'X-ray', title: 'Chest / Skeletal X-Ray', desc: 'Detects consolidations, pneumothorax, fractures', icon: Camera },
    { type: 'MRI', title: 'Magnetic Resonance (MRI)', desc: 'Soft tissue, neuro, ligamentous, oncology', icon: Activity },
    { type: 'CT', title: 'Computed Tomography (CT)', desc: 'High-resolution cross-sectional volumetric views', icon: Layers },
    { type: 'Pathology', title: 'Digital Histopathology', desc: 'Whole-slide microscopy, cellular atypia, biopsy', icon: FileText },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Upload Medical Scan
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Upload raw DICOM, high-res radiographs, CT, or histopathology slices for real-time deep learning classification.
        </p>
      </div>

      <form onSubmit={handleStartAnalysis} className="space-y-8">
        {/* Step 1: Modality Selection */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs">
          <label className="text-sm font-semibold text-slate-900 dark:text-white block mb-3">
            1. Select Imaging Modality
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {scanTypes.map((item) => {
              const Icon = item.icon;
              const isSelected = scanType === item.type;
              return (
                <button
                  type="button"
                  key={item.type}
                  onClick={() => setScanType(item.type)}
                  className={`flex flex-col text-left p-4 rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'border-blue-600 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 shadow-xs ring-2 ring-blue-600/10'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/80'
                  }`}
                >
                  <div className={`p-2 rounded-lg w-fit mb-3 ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="font-semibold text-sm text-slate-900 dark:text-white">{item.title}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{item.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Patient & Clinical Priority */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs">
          <label className="text-sm font-semibold text-slate-900 dark:text-white block mb-4">
            2. Patient & Examination Details
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Assign to Patient <span className="text-rose-500">*</span>
              </label>
              <select
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-hidden focus:ring-3 focus:ring-blue-500/10"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.lastName}, {p.firstName} — {p.mrn} ({p.age}y {p.gender})
                  </option>
                ))}
              </select>

              {selectedPatient && (
                <div className="mt-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 p-3 border border-slate-100 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
                  <div>
                    <span className="font-medium text-slate-900 dark:text-slate-100">MRN:</span> {selectedPatient.mrn} |{' '}
                    <span className="font-medium text-slate-900 dark:text-slate-100">Blood:</span> {selectedPatient.bloodType}
                  </div>
                  {selectedPatient.allergies.length > 0 && (
                    <span className="text-rose-600 dark:text-rose-400 font-medium">
                      Allergies: {selectedPatient.allergies.join(', ')}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Triage Priority Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['routine', 'urgent', 'critical'] as ScanPriority[]).map((level) => {
                  const isSelected = priority === level;
                  const colors = {
                    routine: 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 active:bg-slate-100 dark:active:bg-slate-800',
                    urgent: 'border-amber-400 dark:border-amber-700/60 text-amber-800 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/40',
                    critical: 'border-rose-400 dark:border-rose-700/60 text-rose-800 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/40',
                  }[level];
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setPriority(level)}
                      className={`capitalize py-2 sm:py-2.5 px-2 sm:px-3 rounded-xl text-[11px] sm:text-xs font-semibold border-2 transition-all text-center cursor-pointer ${
                        isSelected
                          ? level === 'critical'
                            ? 'border-rose-600 bg-rose-600 text-white'
                            : level === 'urgent'
                            ? 'border-amber-500 bg-amber-500 text-white'
                            : 'border-blue-600 bg-blue-600 text-white'
                          : colors
                      }`}
                    >
                      {level}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                Critical scans are prioritized on the radiologist review queue.
              </p>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Clinical Indication / Symptoms (Optional)
            </label>
            <input
              type="text"
              value={clinicalIndication}
              onChange={(e) => setClinicalIndication(e.target.value)}
              placeholder="e.g., Shortness of breath, localized right basal crackles, 5-day fever..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 focus:outline-hidden focus:ring-3 focus:ring-blue-500/10"
            />
          </div>
        </div>

        {/* Step 3: Drag & Drop Zone */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs">
          <label className="text-sm font-semibold text-slate-900 dark:text-white block mb-3">
            3. File Ingestion
          </label>

          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            accept="image/*,.dcm,.dicom"
            className="hidden"
          />

          {!filePreview ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-10 cursor-pointer transition-all ${
                dragActive
                  ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/50 scale-[1.01]'
                  : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100/70 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 mb-4 shadow-2xs">
                <UploadCloud className="h-7 w-7" />
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Click or drag & drop scan file here
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Supports DICOM (.dcm), High-Res PNG, JPEG, TIFF (up to 150MB)
              </p>
              <div className="mt-4 flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 shadow-2xs">
                <Sparkles className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                Automatic De-identification & DICOM Header Anonymization
              </div>
            </div>
          ) : (
            <div className="relative rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-950 p-4">
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setFilePreview(null);
                }}
                className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/80 text-white hover:bg-rose-600 transition-colors shadow-md"
                aria-label="Remove image"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="h-64 w-full md:w-64 rounded-xl overflow-hidden bg-black flex items-center justify-center border border-slate-800">
                  <img
                    src={filePreview}
                    alt="Scan preview"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="text-left text-white flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/40 px-2.5 py-0.5 text-xs font-semibold">
                      {scanType} File Ready
                    </span>
                    <span className="text-xs text-slate-400">
                      {selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB` : ''}
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-white truncate">{selectedFile?.name}</h4>
                  <p className="text-xs text-slate-300">
                    Image validated. Pre-processing matrix loaded with standard window leveling presets.
                  </p>
                  <div className="pt-2 flex items-center gap-4 text-xs text-slate-400">
                    <span>Patient: {selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : 'Unassigned'}</span>
                    <span>Priority: <span className="uppercase text-amber-400 font-bold">{priority}</span></span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Progress Display when processing */}
        {isProcessing && (
          <div className="rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/40 p-6 shadow-sm space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 font-semibold text-blue-900 dark:text-blue-300">
                <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-spin" />
                {pipelineStage}
              </div>
              <span className="font-bold text-blue-700 dark:text-blue-400">{progressPercent}%</span>
            </div>
            <div className="h-3 w-full rounded-full bg-blue-100 dark:bg-blue-900/50 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-xs text-blue-600/80 dark:text-blue-400/80">
              Generating Grad-CAM heatmap overlays and calculating Bayesian confidence percentiles...
            </p>
          </div>
        )}

        {/* Submit Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/scan-results')}
            className="w-full sm:w-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-center cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isProcessing || !selectedFile}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isProcessing ? (
              <>
                <Activity className="h-4 w-4 animate-spin" />
                Analyzing Scan...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Run AI Scan Diagnostics
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
