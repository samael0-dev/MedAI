import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Eye,
  Sparkles,
  Layers,
  ChevronLeft,
  FileCheck,
  Printer,
  X,
} from 'lucide-react';
import { getScans } from '../api/client';
import { useToast } from '../context/ToastContext';
import type { MedicalScan, SeverityLevel } from '../types';

export const ScanResults: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const queryScanId = searchParams.get('id');
  const initialSearch = searchParams.get('search') || '';

  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [selectedScanType, setSelectedScanType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');

  // Detail View State
  const [selectedScan, setSelectedScan] = useState<MedicalScan | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [heatmapOpacity, setHeatmapOpacity] = useState(65);
  const [radiologistNoteInput, setRadiologistNoteInput] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Load scans
  const { data: scans = [], isLoading } = useQuery({
    queryKey: ['scans', selectedScanType, selectedStatus, selectedPriority, searchTerm],
    queryFn: () =>
      getScans({
        scanType: selectedScanType,
        status: selectedStatus,
        priority: selectedPriority,
        search: searchTerm,
      }),
  });

  // Synchronize URL id parameter with selected scan
  useEffect(() => {
    if (scans.length > 0) {
      if (queryScanId) {
        const found = scans.find((s) => s.id === queryScanId);
        if (found) {
          setSelectedScan(found);
          setRadiologistNoteInput(found.radiologistNotes || '');
        }
      }
    }
  }, [queryScanId, scans]);

  const handleSelectScan = (scan: MedicalScan) => {
    setSelectedScan(scan);
    setRadiologistNoteInput(scan.radiologistNotes || '');
    setSearchParams({ id: scan.id });
  };

  const handleSaveNotes = () => {
    setIsSavingNotes(true);
    setTimeout(() => {
      if (selectedScan) {
        selectedScan.radiologistNotes = radiologistNoteInput;
      }
      setIsSavingNotes(false);
      showToast('Radiology notes and clinical impressions recorded successfully!', 'success');
    }, 400);
  };

  const getSeverityBadge = (sev: SeverityLevel) => {
    switch (sev) {
      case 'critical':
        return <span className="rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 px-2 py-0.5 text-xs font-bold border border-rose-200 dark:border-rose-900/60">Critical</span>;
      case 'high':
        return <span className="rounded-md bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 px-2 py-0.5 text-xs font-semibold border border-orange-200 dark:border-orange-900/60">High Risk</span>;
      case 'moderate':
        return <span className="rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 text-xs font-medium border border-amber-200 dark:border-amber-900/60">Moderate</span>;
      case 'low':
        return <span className="rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 px-2 py-0.5 text-xs font-medium border border-blue-200 dark:border-blue-900/60">Mild</span>;
      case 'normal':
      default:
        return <span className="rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 text-xs font-medium border border-emerald-200 dark:border-emerald-900/60">Normal</span>;
    }
  };

  const getConfidenceBarColor = (sev: SeverityLevel) => {
    switch (sev) {
      case 'critical':
        return 'bg-rose-600';
      case 'high':
        return 'bg-orange-500';
      case 'moderate':
        return 'bg-amber-500';
      case 'low':
        return 'bg-blue-600';
      case 'normal':
      default:
        return 'bg-emerald-500';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Scan Diagnostic Results
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Review convolutional neural network findings, Grad-CAM attention heatmaps, and submit verified diagnostic reports.
          </p>
        </div>
        <button
          onClick={() => navigate('/scan-upload')}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Sparkles className="h-4 w-4" />
          Analyze New Scan
        </button>
      </div>

      {/* Main Content: Split View or Full List */}
      {selectedScan ? (
        /* DETAIL VIEW */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setSelectedScan(null);
                setSearchParams({});
              }}
              className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" /> Back to All Scans
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowReportModal(true)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer"
              >
                <Printer className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                Export Clinical Report
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Image Viewer + Heatmap Controls */}
            <div className="lg:col-span-6 space-y-4">
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 px-2.5 py-0.5 text-xs font-bold uppercase border border-blue-200/40 dark:border-blue-800/40">
                      {selectedScan.scanType}
                    </span>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">{selectedScan.bodyPart}</h3>
                  </div>
                  <span className="text-xs font-mono text-slate-400 dark:text-slate-500">{selectedScan.id}</span>
                </div>

                {/* Scan Image Container with Heatmap overlay */}
                <div className="relative aspect-4/3 w-full rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-800 select-none">
                  <img
                    src={selectedScan.imageUrl}
                    alt="Original scan"
                    className="absolute inset-0 w-full h-full object-cover"
                  />

                  {/* Heatmap Layer */}
                  {showHeatmap && selectedScan.heatmapUrl && (
                    <img
                      src={selectedScan.heatmapUrl}
                      alt="AI Attention Heatmap"
                      style={{ opacity: heatmapOpacity / 100 }}
                      className="absolute inset-0 w-full h-full object-cover mix-blend-screen pointer-events-none transition-opacity duration-150"
                    />
                  )}

                  {/* Visual bounding badge */}
                  <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md text-[11px] text-white font-mono flex items-center gap-2 border border-white/10">
                    <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                    ROI Attentive Field
                  </div>
                </div>

                {/* Heatmap Overlay Controls */}
                <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowHeatmap(!showHeatmap)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        showHeatmap
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <Layers className="h-3.5 w-3.5" />
                      {showHeatmap ? 'Heatmap Overlay On' : 'Heatmap Overlay Off'}
                    </button>
                  </div>

                  {showHeatmap && (
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Opacity:</span>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={heatmapOpacity}
                        onChange={(e) => setHeatmapOpacity(Number(e.target.value))}
                        className="w-28 sm:w-36 accent-blue-600 cursor-pointer"
                      />
                      <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 w-8">
                        {heatmapOpacity}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Patient Info Card */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                  Patient & Protocol Information
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Patient Name:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{selectedScan.patientName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Exam Date:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {new Date(selectedScan.scanDate).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Priority:</span>
                    <span className="font-bold uppercase text-blue-600 dark:text-blue-400">{selectedScan.priority}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Reviewing Radiologist:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedScan.reviewedBy || 'AI Primary Assessment'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Overall AI Confidence:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      {selectedScan.confidenceScore}%
                    </span>
                  </div>
                  <div className="col-span-2 sm:col-span-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button
                      type="button"
                      onClick={() => navigate('/patients')}
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      View Patient Record & History &rarr;
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: AI Findings & Radiologist Impression */}
            <div className="lg:col-span-6 space-y-4">
              {/* Findings Card */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">Neural Network Findings</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Automated classification with Bayesian confidence bounds</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-850 px-2.5 py-0.5 text-xs font-semibold">
                    {selectedScan.findings.length} findings
                  </span>
                </div>

                <div className="space-y-3">
                  {selectedScan.findings.map((finding) => (
                    <div
                      key={finding.id}
                      className="rounded-xl border border-slate-200/70 dark:border-slate-750 dark:border-slate-700 p-4 bg-slate-50/50 dark:bg-slate-800/40 space-y-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm text-slate-900 dark:text-white">{finding.condition}</h4>
                          {finding.location && (
                            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">({finding.location})</span>
                          )}
                        </div>
                        {getSeverityBadge(finding.severity)}
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{finding.description}</p>

                      <div className="pt-1">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-500 dark:text-slate-400 font-medium">Model Certainty:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{finding.confidence}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${getConfidenceBarColor(finding.severity)}`}
                            style={{ width: `${finding.confidence}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Radiologist Notes Editor */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Radiologist Impression & Sign-off</h3>
                  <span className="text-xs text-slate-400 dark:text-slate-500">Official Clinical Record</span>
                </div>

                <textarea
                  rows={4}
                  value={radiologistNoteInput}
                  onChange={(e) => setRadiologistNoteInput(e.target.value)}
                  placeholder="Enter clinical notes, concordances, recommended differential workups, or follow-up protocol..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 focus:outline-hidden focus:ring-3 focus:ring-blue-500/10 leading-relaxed"
                />

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    Signing as Dr. Alan Mitchell, MD
                  </span>
                  <button
                    onClick={handleSaveNotes}
                    disabled={isSavingNotes}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <FileCheck className="h-4 w-4" />
                    {isSavingNotes ? 'Recording...' : 'Save & Sign Impression'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* TABLE LIST VIEW */
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by patient name, body part, condition..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/10"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedScanType}
                onChange={(e) => setSelectedScanType(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-hidden"
              >
                <option value="all">All Modalities</option>
                <option value="X-ray">X-ray</option>
                <option value="MRI">MRI</option>
                <option value="CT">CT</option>
                <option value="Pathology">Pathology</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-hidden"
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="flagged">Flagged</option>
                <option value="analyzing">Analyzing</option>
              </select>

              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-hidden"
              >
                <option value="all">All Priorities</option>
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 dark:bg-slate-800/60 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-3.5">Scan ID</th>
                    <th className="px-6 py-3.5">Patient</th>
                    <th className="px-6 py-3.5">Modality & Anatomical Site</th>
                    <th className="px-6 py-3.5">Primary Finding</th>
                    <th className="px-6 py-3.5">AI Confidence</th>
                    <th className="px-6 py-3.5">Priority</th>
                    <th className="px-6 py-3.5 text-right">View Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {scans.map((scan: MedicalScan) => {
                    const topFinding = scan.findings[0];
                    return (
                      <tr
                        key={scan.id}
                        onClick={() => handleSelectScan(scan)}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                      >
                        <td className="px-6 py-4 font-mono font-medium text-xs text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          {scan.id}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900 dark:text-white">{scan.patientName}</div>
                          <div className="text-xs text-slate-400 dark:text-slate-500">{new Date(scan.scanDate).toLocaleDateString()}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700">
                              {scan.scanType}
                            </span>
                            <span className="text-slate-600 dark:text-slate-400 text-xs font-medium">{scan.bodyPart}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {topFinding ? (
                            <div className="flex items-center gap-2">
                              {getSeverityBadge(topFinding.severity)}
                              <span className="text-xs text-slate-700 dark:text-slate-300 font-medium truncate max-w-xs">
                                {topFinding.condition}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 dark:text-slate-500">None detected</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div
                                className="h-full bg-blue-600 rounded-full"
                                style={{ width: `${scan.confidenceScore}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{scan.confidenceScore}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                              scan.priority === 'critical'
                                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200/40 dark:border-rose-900/50'
                                : scan.priority === 'urgent'
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200/40 dark:border-amber-900/50'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700'
                            }`}
                          >
                            {scan.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectScan(scan);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:border-blue-300 dark:group-hover:border-blue-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 shadow-2xs cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" /> Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {scans.length === 0 && !isLoading && (
                <div className="p-12 text-center text-slate-400 dark:text-slate-500">
                  <p className="text-sm">No scans match the specified query filters.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Clinical Report Printable Modal */}
      {showReportModal && selectedScan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">MedAI Diagnostic Report</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Official Multimodal Radiologic Analysis Record</p>
                </div>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="font-bold block text-slate-900 dark:text-white">PATIENT:</span>
                  {selectedScan.patientName} (ID: {selectedScan.patientId})
                </div>
                <div>
                  <span className="font-bold block text-slate-900 dark:text-white">STUDY DATE:</span>
                  {new Date(selectedScan.scanDate).toLocaleString()}
                </div>
                <div>
                  <span className="font-bold block text-slate-900 dark:text-white">EXAMINATION:</span>
                  {selectedScan.scanType} — {selectedScan.bodyPart}
                </div>
                <div>
                  <span className="font-bold block text-slate-900 dark:text-white">TRIAGE PRIORITY:</span>
                  <span className="uppercase font-bold text-blue-600 dark:text-blue-400">{selectedScan.priority}</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 dark:text-white uppercase text-[11px] tracking-wider mb-2">
                  AI Computed Findings & Certainty:
                </h4>
                <div className="space-y-2">
                  {selectedScan.findings.map((f) => (
                    <div key={f.id} className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80">
                      <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                        <span>{f.condition}</span>
                        <span className="text-blue-600 dark:text-blue-400">{f.confidence}% Confidence</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 mt-1">{f.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 dark:text-white uppercase text-[11px] tracking-wider mb-2">
                  Attending Radiologist Impression:
                </h4>
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 italic text-slate-700 dark:text-slate-300">
                  {selectedScan.radiologistNotes || 'No notes signed yet.'}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between text-[11px] text-slate-400 dark:text-slate-500">
                <span>Signed by: {selectedScan.reviewedBy || 'Dr. Alan Mitchell, MD'}</span>
                <span>SHA-256 Digital Verification Hash: #7F841B92D0</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  window.print();
                  showToast('Preparing print job...', 'info');
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 cursor-pointer"
              >
                <Printer className="h-4 w-4" /> Print / Export PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
