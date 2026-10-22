import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Cpu,
  HardDrive,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { summarizeClinicalNotes, getWorkloadStats } from '../api/client';
import { useToast } from '../context/ToastContext';
import type { ClinicalNotesSummary, WorkloadStats } from '../types';

export const AdminPanel: React.FC = () => {
  const { showToast } = useToast();

  const [clinicalText, setClinicalText] = useState(
    '64-year-old female presents with persistent productive cough, greenish sputum, and high fevers (38.8°C) for the past 4 days. Denies chest pain or hemoptysis. Physical examination indicates coarse bibasilar crackles, more pronounced in the right lower lobe. Pulse ox is 94% on ambient air.'
  );

  const [summaryResult, setSummaryResult] = useState<ClinicalNotesSummary | null>(null);

  // Queries
  const { data: workload = [], refetch: refetchWorkload } = useQuery({
    queryKey: ['workloadStats'],
    queryFn: getWorkloadStats,
  });

  // Clinical NLP Mutation
  const summarizeMutation = useMutation({
    mutationFn: (text: string) => summarizeClinicalNotes(text),
    onSuccess: (data) => {
      setSummaryResult(data);
      showToast('Clinical notes parsed into structured EHR format!', 'success');
    },
    onError: () => {
      showToast('NLP summarization service failed', 'error');
    },
  });

  const handleRunNLP = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicalText.trim()) {
      showToast('Please provide clinical notes text', 'warning');
      return;
    }
    summarizeMutation.mutate(clinicalText);
  };

  const samplePresets = [
    {
      title: 'Pneumonia Case',
      text: '64-year-old female presents with persistent productive cough, greenish sputum, and high fevers (38.8°C) for the past 4 days. Physical examination indicates coarse bibasilar crackles, more pronounced in the right lower lobe. Pulse ox is 94% on ambient air.',
    },
    {
      title: 'Cardiac Palpitations',
      text: '52-year-old male with history of hypertension reports episodic tachyarrhythmia, lightheadedness, and dyspnea on exertion. EKG demonstrates irregular rhythm with absent P waves and variable ventricular response rate of 115 bpm.',
    },
    {
      title: 'Post-Op Knee Followup',
      text: 'Patient returns for 6-week post-op total knee arthroplasty review. Surgical incision well healed without erythema or drainage. Active flexion 110 degrees, full extension. Mild peri-patellar edema managed with cryotherapy.',
    },
  ];

  const recentAuditFeed = [
    { id: 1, user: 'Dr. Alan Mitchell', action: 'Signed radiologic report', target: 'Scan #scan-101 (Chest AP)', time: '14 min ago' },
    { id: 2, user: 'Dr. Sarah Lin', action: 'Approved medication review', target: 'Patient Eleanor Vance', time: '38 min ago' },
    { id: 3, user: 'System De-Identifier', action: 'Anonymized 18 DICOM slices', target: 'CT Ingestion Queue', time: '1 hr ago' },
    { id: 4, user: 'Dr. David Kim', action: 'Updated cardiology notes', target: 'Patient Sophia Rodriguez', time: '2 hrs ago' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Clinical Admin & Intelligence Engine
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          NLP clinical documentation extraction, departmental physician workload tracking, and neural inference system health.
        </p>
      </div>

      {/* System Health Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              API Gateway
            </span>
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">99.98%</span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Operational</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 dark:text-slate-500 flex items-center justify-between">
            <span>Latency: 18ms</span>
            <span>FHIR R4 / HL7 Ready</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              GPU Inference Cluster
            </span>
            <Cpu className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">320 ms</span>
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">p95 inference</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 dark:text-slate-500 flex items-center justify-between">
            <span>4x NVIDIA H100</span>
            <span>Load: 42%</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              PACS / DICOM Volume
            </span>
            <HardDrive className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">12.4 TB</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">/ 50 TB</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 dark:text-slate-500 flex items-center justify-between">
            <span>AES-256 Storage</span>
            <span>Auto-mirrored</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Audit Compliance
            </span>
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">HIPAA A+</span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Zero Flags</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 dark:text-slate-500 flex items-center justify-between">
            <span>SOC2 Type II</span>
            <span>Verified</span>
          </div>
        </div>
      </div>

      {/* Clinical Notes Processor */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs space-y-6">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Clinical Notes NLP Processor</h2>
            </div>
            <span className="rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 px-3 py-1 text-xs font-bold">
              MedAI-LLM v3
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Paste unformatted physician dictations or nursing observations to extract structured clinical entities and actionable care directives.
          </p>
        </div>

        {/* Quick Sample Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Insert Sample Note:</span>
          {samplePresets.map((preset) => (
            <button
              key={preset.title}
              type="button"
              onClick={() => setClinicalText(preset.text)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              {preset.title}
            </button>
          ))}
        </div>

        {/* Input Text Area */}
        <form onSubmit={handleRunNLP} className="space-y-4">
          <textarea
            rows={4}
            value={clinicalText}
            onChange={(e) => setClinicalText(e.target.value)}
            placeholder="Type or paste unstructured physician encounter notes here..."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 focus:outline-hidden focus:ring-3 focus:ring-blue-500/10 leading-relaxed font-mono"
          />

          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={summarizeMutation.isPending}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 transition-all disabled:opacity-50 cursor-pointer"
            >
              {summarizeMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Processing Clinical Entities...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Extract Structured Entities
                </>
              )}
            </button>
          </div>
        </form>

        {/* Structured Output Display */}
        {summaryResult && (
          <div className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/20 p-5 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-blue-100 dark:border-blue-900/40 border-b">
              <span className="font-bold text-sm text-blue-900 dark:text-blue-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Structured Clinical Record
              </span>
              <span className="text-xs text-blue-600 dark:text-blue-400 font-mono">
                {new Date(summaryResult.processedAt).toLocaleTimeString()}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="rounded-lg bg-white dark:bg-slate-900 p-3.5 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] block">
                  Chief Complaint
                </span>
                <p className="text-slate-700 dark:text-slate-300 font-medium">{summaryResult.chiefComplaint}</p>
              </div>

              <div className="rounded-lg bg-white dark:bg-slate-900 p-3.5 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] block">
                  History of Present Illness (HPI)
                </span>
                <p className="text-slate-600 dark:text-slate-400">{summaryResult.historyOfPresentIllness}</p>
              </div>
            </div>

            {/* Differential Diagnoses */}
            <div className="rounded-lg bg-white dark:bg-slate-900 p-3.5 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] block">
                Ranked Differential Diagnoses
              </span>
              <div className="space-y-1.5">
                {summaryResult.differentialDiagnosis.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between p-2 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60"
                  >
                    <div>
                      <span className="font-bold text-slate-900 dark:text-slate-100">{item.condition}</span>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px]">{item.rationale}</p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        item.likelihood === 'High'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          : item.likelihood === 'Moderate'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {item.likelihood} Likelihood
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Plan */}
            <div className="rounded-lg bg-white dark:bg-slate-900 p-3.5 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] block">
                Actionable Clinical Orders & Next Steps
              </span>
              <ul className="list-disc pl-5 space-y-1 text-slate-700 dark:text-slate-300">
                {summaryResult.recommendedActions.map((action, idx) => (
                  <li key={idx}>{action}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Staff Workload Chart & Activity Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Workload Bar Chart */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs lg:col-span-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Physician Workload by Department</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Active staffing, open study backlog, and turnaround metrics</p>
            </div>
            <button
              onClick={() => refetchWorkload()}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Refresh workload data"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workload} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                <XAxis dataKey="department" tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload as WorkloadStats;
                      return (
                        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-lg text-xs space-y-1">
                          <p className="font-bold text-slate-900 dark:text-slate-100">{d.department}</p>
                          <p className="text-blue-600 dark:text-blue-400">Pending Studies: {d.pendingCases}</p>
                          <p className="text-emerald-600 dark:text-emerald-400">Completed Today: {d.completedToday}</p>
                          <p className="text-slate-600 dark:text-slate-300">Active Physicians: {d.activeDoctors}</p>
                          <p className="text-purple-600 dark:text-purple-400 font-semibold">Avg Turnaround: {d.avgTurnaroundHours} hrs</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="pendingCases" name="Pending Cases" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completedToday" name="Completed Today" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Documentation Activity Audit */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs lg:col-span-4 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Documentation Audit Log</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Immutable chronological log of signed examinations</p>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentAuditFeed.map((item) => (
                <div key={item.id} className="py-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{item.user}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{item.time}</span>
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-0.5">{item.action}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{item.target}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
            <span className="text-[11px] text-slate-400 dark:text-slate-500">All events cryptographically signed</span>
          </div>
        </div>
      </div>
    </div>
  );
};
