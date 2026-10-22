import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Microscope,
  Dna,
  TrendingUp,
  Search,
  Sparkles,
} from 'lucide-react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { getResearchProjects, analyzeGeneticData, getDiseaseTrajectory } from '../api/client';
import { useToast } from '../context/ToastContext';
import type { ResearchProject, DiseaseTrajectory } from '../types';

export const ResearchExplorer: React.FC = () => {
  const { showToast } = useToast();

  // Queries
  const { data: projects = [] } = useQuery({
    queryKey: ['researchProjects'],
    queryFn: getResearchProjects,
  });

  const { data: geneticData = [] } = useQuery({
    queryKey: ['geneticData'],
    queryFn: () => analyzeGeneticData(),
  });

  const { data: trajectory } = useQuery<DiseaseTrajectory>({
    queryKey: ['diseaseTrajectory'],
    queryFn: () => getDiseaseTrajectory('pt-001', 'Cardiovascular Risk Trajectory'),
  });

  // Clinical Trial Matcher State
  const [trialAge, setTrialAge] = useState(58);
  const [trialCondition, setTrialCondition] = useState('Non-Small Cell Lung Carcinoma (NSCLC)');
  const [trialBiomarker, setTrialBiomarker] = useState('EGFR L858R');
  const [matchedTrials, setMatchedTrials] = useState<
    { id: string; title: string; phase: string; matchScore: number; criteria: string }[]
  >([]);
  const [isMatching, setIsMatching] = useState(false);

  const handleMatchTrials = (e: React.FormEvent) => {
    e.preventDefault();
    setIsMatching(true);
    setTimeout(() => {
      setIsMatching(false);
      setMatchedTrials([
        {
          id: 'NCT-048291',
          title: 'Phase III Trial of Next-Gen EGFR Kinase Inhibitor in Advanced NSCLC',
          phase: 'Phase III',
          matchScore: 96,
          criteria: 'Matches EGFR L858R mutation, age 18-75, ECOG PS 0-1',
        },
        {
          id: 'NCT-051882',
          title: 'Multimodal Antibody-Drug Conjugate (ADC) for Recurrent Thoracic Adenocarcinoma',
          phase: 'Phase II',
          matchScore: 84,
          criteria: 'Requires prior tyrosine kinase exposure, confirmed radiographic progression',
        },
      ]);
      showToast('Found 2 high-concordance clinical trial protocols!', 'success');
    }, 600);
  };

  // Biomarkers correlation matrix data
  const biomarkers = ['ctDNA', 'CEA', 'CA-125', 'PSA', 'AFP', 'LDH'];
  const correlationMatrix: number[][] = [
    [1.0, 0.68, 0.42, 0.12, 0.35, 0.54],
    [0.68, 1.0, 0.55, 0.08, 0.48, 0.61],
    [0.42, 0.55, 1.0, 0.04, 0.29, 0.47],
    [0.12, 0.08, 0.04, 1.0, 0.15, 0.22],
    [0.35, 0.48, 0.29, 0.15, 1.0, 0.39],
    [0.54, 0.61, 0.47, 0.22, 0.39, 1.0],
  ];

  // Convert genetic data for scatter plot
  const scatterPoints = geneticData.map((g, idx) => ({
    x: idx + 1,
    y: g.expressionLevel,
    gene: g.gene,
    mutation: g.mutationType,
    significance: g.significance,
  }));

  // Trajectory points formatted
  const trajectoryChartData = trajectory?.timepoints.map((tp) => ({
    month: `M${tp.month}`,
    actual: tp.score,
    predicted: tp.predictedScore || tp.score,
    upper: tp.confidenceUpper,
    lower: tp.confidenceLower,
  })) || [];

  const getStatusBadge = (status: ResearchProject['status']) => {
    switch (status) {
      case 'recruiting':
        return <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold uppercase">Recruiting</span>;
      case 'active':
        return <span className="rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 text-xs font-bold uppercase">Active Cohort</span>;
      case 'data-analysis':
        return <span className="rounded-full bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-0.5 text-xs font-bold uppercase">Data Analysis</span>;
      case 'published':
      default:
        return <span className="rounded-full bg-slate-100 text-slate-800 border border-slate-200 px-2.5 py-0.5 text-xs font-bold uppercase">Published</span>;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Clinical Research & Precision Genomics
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Multimodal translational trials, single-cell gene expression profiles, longitudinal disease trajectory models, and trial matching.
        </p>
      </div>

      {/* Research Projects Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Microscope className="h-5 w-5 text-blue-600" /> Active Research Protocols ({projects.length})
          </h2>
          <span className="text-xs text-slate-400">Institutional Review Board (IRB) Cleared</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {projects.map((proj) => (
            <div
              key={proj.id}
              className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs space-y-4 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-xs font-mono text-slate-400 font-semibold">{proj.id}</span>
                  {getStatusBadge(proj.status)}
                </div>
                <h3 className="font-bold text-base text-slate-900 leading-snug">{proj.title}</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">{proj.description}</p>
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Lead Investigator:</span>
                  <span className="font-semibold text-slate-900">{proj.leadResearcher}</span>
                </div>

                <div>
                  <div className="flex justify-between text-slate-500 mb-1">
                    <span>Cohort Enrollment:</span>
                    <span className="font-bold text-slate-800">
                      {proj.participantsCount} / {proj.targetParticipants} ({proj.completionPercentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{ width: `${proj.completionPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Visualizations Grid: Gene Expression & Disease Trajectory */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gene Expression Scatter Plot */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Dna className="h-4 w-4 text-purple-600" /> Somatic Mutation Expression Levels
              </h3>
              <p className="text-xs text-slate-500">TPM expression vs oncogenic significance</p>
            </div>
            <span className="rounded-full bg-purple-50 text-purple-700 px-2.5 py-0.5 text-xs font-bold">
              RNA-Seq
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 15, right: 20, bottom: 15, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Sample ID"
                  tick={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Expression"
                  unit=" TPM"
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg text-xs space-y-1">
                          <p className="font-bold text-slate-900 text-sm">{d.gene}</p>
                          <p className="text-purple-600 font-semibold">Expression: {d.y} TPM</p>
                          <p className="text-slate-600">Mutation: {d.mutation}</p>
                          <p className="text-rose-600 font-bold uppercase text-[10px]">
                            {d.significance}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter name="Genes" data={scatterPoints} fill="#8b5cf6" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap gap-2 text-xs border-t border-slate-100 pt-3">
            {geneticData.slice(0, 5).map((g) => (
              <span key={g.id} className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-700 font-mono text-[11px]">
                {g.gene}: {g.expressionLevel} TPM
              </span>
            ))}
          </div>
        </div>

        {/* Longitudinal Disease Trajectory Line Chart */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" /> Longitudinal Disease Progression Model
              </h3>
              <p className="text-xs text-slate-500">Historical markers + AI predictive trajectory with confidence intervals</p>
            </div>
            <span className="rounded-full bg-blue-50 text-blue-700 px-2.5 py-0.5 text-xs font-bold">
              LSTM Forecast
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trajectoryChartData} margin={{ top: 15, right: 20, bottom: 15, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis domain={[20, 80]} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg text-xs space-y-1">
                          <p className="font-bold text-slate-900">{d.month} Projection</p>
                          <p className="text-blue-600">Actual Score: {d.actual}</p>
                          {d.predicted && <p className="text-indigo-600 font-semibold">Predicted: {d.predicted}</p>}
                          {d.upper && (
                            <p className="text-slate-400 text-[10px]">
                              95% CI: [{d.lower} - {d.upper}]
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="actual" name="Historical Observed" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="predicted" name="AI Forecast (24 Mo)" stroke="#8b5cf6" strokeWidth={2.5} strokeDasharray="5 5" dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
            <span>Risk Level: <b className="text-amber-600 uppercase">Moderate Progression</b></span>
            <span>Forecast Horizon: 24 Months</span>
          </div>
        </div>
      </div>

      {/* Biomarker Correlation Heatmap & Clinical Trial Matcher */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Correlation Heatmap */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs lg:col-span-6 space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Biomarker Correlation Matrix</h3>
            <p className="text-xs text-slate-500">Pearson r correlation coefficients between circulating tumor markers</p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-center border-collapse text-xs">
              <thead>
                <tr>
                  <th className="p-2 text-left font-bold text-slate-400 bg-slate-50 border border-slate-200">
                    Marker
                  </th>
                  {biomarkers.map((b) => (
                    <th key={b} className="p-2 font-bold text-slate-700 bg-slate-50 border border-slate-200">
                      {b}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {biomarkers.map((rowName, rIdx) => (
                  <tr key={rowName}>
                    <td className="p-2 text-left font-bold text-slate-800 bg-slate-50 border border-slate-200">
                      {rowName}
                    </td>
                    {biomarkers.map((colName, cIdx) => {
                      const val = correlationMatrix[rIdx][cIdx];
                      const bgStyle =
                        val >= 0.8
                          ? 'bg-rose-500 text-white font-bold'
                          : val >= 0.5
                          ? 'bg-amber-100 text-amber-900 font-semibold'
                          : val >= 0.3
                          ? 'bg-blue-100 text-blue-900'
                          : 'bg-slate-50 text-slate-500';

                      return (
                        <td
                          key={colName}
                          className={`p-2 border border-slate-200 font-mono text-[11px] ${bgStyle}`}
                          title={`${rowName} vs ${colName}: r = ${val}`}
                        >
                          {val.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Clinical Trial Matcher Form */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs lg:col-span-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-600" /> Clinical Trial Precision Matcher
              </h3>
              <span className="rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-0.5 text-xs font-bold border border-emerald-200">
                AI Eligibility
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Cross-reference patient genomic, histologic, and demographic parameters with live multi-center clinical trials.
            </p>

            <form onSubmit={handleMatchTrials} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Patient Age</label>
                  <input
                    type="number"
                    value={trialAge}
                    onChange={(e) => setTrialAge(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 p-2 text-sm focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Biomarker / Mutation</label>
                  <input
                    type="text"
                    value={trialBiomarker}
                    onChange={(e) => setTrialBiomarker(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2 text-sm focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Primary Condition / Histology</label>
                <input
                  type="text"
                  value={trialCondition}
                  onChange={(e) => setTrialCondition(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2 text-sm focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isMatching}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  <Search className="h-3.5 w-3.5" />
                  {isMatching ? 'Matching Trial Cohorts...' : 'Find Compatible Clinical Trials'}
                </button>
              </div>
            </form>
          </div>

          {/* Matched Trials List */}
          {matchedTrials.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
              <span className="text-xs font-bold text-slate-900 block">
                Top Matches ({matchedTrials.length}):
              </span>
              {matchedTrials.map((t) => (
                <div key={t.id} className="p-3 rounded-xl border border-blue-200 bg-blue-50/50 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-blue-900">{t.title}</span>
                    <span className="rounded-full bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 text-[10px]">
                      {t.matchScore}% Match
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600">{t.criteria}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
