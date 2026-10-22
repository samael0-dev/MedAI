import React, { useState } from 'react';
import {
  Pill,
  Search,
  Plus,
  X,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { MOCK_DRUGS, checkDrugInteractions } from '../api/client';
import { useToast } from '../context/ToastContext';
import type { Drug, DrugInteraction, InteractionSeverity } from '../types';

export const DrugChecker: React.FC = () => {
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDrugs, setSelectedDrugs] = useState<Drug[]>([
    MOCK_DRUGS[4], // Warfarin
    MOCK_DRUGS[2], // Aspirin
    MOCK_DRUGS[7], // Ibuprofen
  ]);
  const [isChecking, setIsChecking] = useState(false);
  const [interactions, setInteractions] = useState<DrugInteraction[]>([]);
  const [hasRunCheck, setHasRunCheck] = useState(false);

  // Available drugs filter
  const filteredAvailableDrugs = MOCK_DRUGS.filter((drug) => {
    const isAlreadySelected = selectedDrugs.some((d) => d.id === drug.id);
    const matchesSearch =
      drug.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      drug.genericName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      drug.category.toLowerCase().includes(searchQuery.toLowerCase());
    return !isAlreadySelected && matchesSearch;
  });

  const handleAddDrug = (drug: Drug) => {
    setSelectedDrugs((prev) => [...prev, drug]);
    setSearchQuery('');
    setHasRunCheck(false);
  };

  const handleRemoveDrug = (drugId: string) => {
    setSelectedDrugs((prev) => prev.filter((d) => d.id !== drugId));
    setHasRunCheck(false);
  };

  const handleCheckInteractions = async () => {
    if (selectedDrugs.length < 2) {
      showToast('Select at least two medications to analyze drug-drug interactions', 'warning');
      return;
    }

    setIsChecking(true);
    try {
      const results = await checkDrugInteractions(selectedDrugs.map((d) => d.name));
      setInteractions(results);
      setHasRunCheck(true);
      if (results.length > 0) {
        showToast(`Identified ${results.length} pharmacological interactions`, 'warning');
      } else {
        showToast('No clinical drug-drug interactions flagged among selected medications', 'success');
      }
    } catch {
      showToast('Error evaluating interactions', 'error');
    } finally {
      setIsChecking(false);
    }
  };

  const getSeverityBadge = (severity: InteractionSeverity) => {
    switch (severity) {
      case 'contraindicated':
        return (
          <span className="rounded-md bg-purple-100 text-purple-900 border border-purple-300 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider">
            Contraindicated (Life-Threatening)
          </span>
        );
      case 'major':
        return (
          <span className="rounded-md bg-rose-100 text-rose-800 border border-rose-300 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider">
            Major Severity
          </span>
        );
      case 'moderate':
        return (
          <span className="rounded-md bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider">
            Moderate Severity
          </span>
        );
      case 'minor':
      default:
        return (
          <span className="rounded-md bg-blue-100 text-blue-800 border border-blue-300 px-2.5 py-0.5 text-xs font-medium uppercase tracking-wider">
            Minor
          </span>
        );
    }
  };

  // Helper to find specific pairwise interaction for the matrix
  const getPairInteraction = (name1: string, name2: string): DrugInteraction | undefined => {
    return interactions.find(
      (inter) =>
        (inter.drug1.toLowerCase() === name1.toLowerCase() && inter.drug2.toLowerCase() === name2.toLowerCase()) ||
        (inter.drug1.toLowerCase() === name2.toLowerCase() && inter.drug2.toLowerCase() === name1.toLowerCase())
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-6xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Clinical Drug Interaction Checker
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Multi-agent pharmacovigilance screening. Detect enzymatic CYP450 inhibitions, hemostatic synergies, and contraindications.
        </p>
      </div>

      {/* Drug Selection Section */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-6">
        <div>
          <label className="text-sm font-semibold text-slate-900 block mb-2">
            Selected Medications for Analysis ({selectedDrugs.length})
          </label>
          <div className="flex flex-wrap gap-2.5 min-h-12 items-center p-3 rounded-xl bg-slate-50 border border-slate-200">
            {selectedDrugs.map((drug) => (
              <span
                key={drug.id}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs group hover:border-slate-300 transition-colors"
              >
                <Pill className="h-3.5 w-3.5 text-blue-600" />
                <span>{drug.name}</span>
                <span className="text-[10px] text-slate-400 font-normal">({drug.dosage.split(',')[0]})</span>
                <button
                  type="button"
                  onClick={() => handleRemoveDrug(drug.id)}
                  className="text-slate-400 hover:text-rose-600 ml-1 p-0.5 rounded transition-colors"
                  aria-label={`Remove ${drug.name}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}

            {selectedDrugs.length === 0 && (
              <span className="text-xs text-slate-400 italic">No medications added yet. Search below to add drugs.</span>
            )}
          </div>
        </div>

        {/* Search and Add from Formulary */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-slate-700 block">
            Add Medication from Hospital Formulary
          </label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type drug brand or generic name (e.g. Aspirin, Warfarin, Sildenafil, Lisinopril)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/10"
            />
          </div>

          {/* Quick Click Add Pills */}
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="text-xs text-slate-400 self-center mr-1">Quick Add:</span>
            {filteredAvailableDrugs.slice(0, 8).map((drug) => (
              <button
                key={drug.id}
                type="button"
                onClick={() => handleAddDrug(drug)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors shadow-2xs"
              >
                <Plus className="h-3 w-3 text-slate-400" />
                {drug.name}
              </button>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <span className="text-xs text-slate-500">
            Evaluates bidirectional interactions across FDA and EMA pharmacopoeia databases.
          </span>
          <button
            type="button"
            onClick={handleCheckInteractions}
            disabled={isChecking || selectedDrugs.length < 2}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isChecking ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" /> Cross-referencing Pathways...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Check Interactions ({selectedDrugs.length} Drugs)
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results Section */}
      {hasRunCheck && (
        <div className="space-y-6">
          {/* Results Summary Banner */}
          <div
            className={`rounded-2xl border p-5 flex items-center justify-between ${
              interactions.length > 0
                ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
            }`}
          >
            <div className="flex items-center gap-3">
              {interactions.length > 0 ? (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white font-bold">
                  <AlertTriangle className="h-6 w-6" />
                </div>
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white font-bold">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
              )}
              <div>
                <h3 className="font-bold text-base">
                  {interactions.length > 0
                    ? `${interactions.length} Clinical Interaction${interactions.length > 1 ? 's' : ''} Detected`
                    : 'No Significant Interactions Detected'}
                </h3>
                <p className="text-xs opacity-90">
                  {interactions.length > 0
                    ? 'Review the detailed mechanisms, contraindications, and clinical management recommendations below.'
                    : 'The selected combinations show no documented major pharmacological antagonisms or toxicities.'}
                </p>
              </div>
            </div>
          </div>

          {/* Detailed Interaction Cards */}
          {interactions.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-900">Documented Drug-Drug Alerts</h3>
              <div className="grid grid-cols-1 gap-4">
                {interactions.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-base">{item.drug1}</span>
                        <span className="text-slate-400 font-semibold">×</span>
                        <span className="font-bold text-slate-900 text-base">{item.drug2}</span>
                      </div>
                      {getSeverityBadge(item.severity)}
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="font-bold text-slate-700 block mb-0.5">Clinical Description:</span>
                        <p className="text-slate-600 leading-relaxed">{item.description}</p>
                      </div>

                      {item.mechanism && (
                        <div>
                          <span className="font-bold text-slate-700 block mb-0.5">Pharmacological Mechanism:</span>
                          <p className="text-slate-500 leading-relaxed font-mono text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-100">
                            {item.mechanism}
                          </p>
                        </div>
                      )}

                      <div className="rounded-lg bg-blue-50/70 p-3 border border-blue-200/70">
                        <span className="font-bold text-blue-900 block mb-0.5">
                          Clinical Management & Recommendation:
                        </span>
                        <p className="text-blue-800 leading-relaxed">{item.recommendation}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Visual Interaction Matrix */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Visual Co-Prescription Matrix</h3>
              <p className="text-xs text-slate-500">
                Pairwise cross-tabulation of all currently evaluated pharmaceuticals.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-center border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="p-3 text-left font-bold text-slate-400 bg-slate-50 border border-slate-200 rounded-tl-xl">
                      Medication
                    </th>
                    {selectedDrugs.map((d) => (
                      <th
                        key={d.id}
                        className="p-3 font-bold text-slate-700 bg-slate-50 border border-slate-200 whitespace-nowrap"
                      >
                        {d.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedDrugs.map((rowDrug) => (
                    <tr key={rowDrug.id}>
                      <td className="p-3 text-left font-bold text-slate-800 bg-slate-50 border border-slate-200 whitespace-nowrap">
                        {rowDrug.name}
                      </td>
                      {selectedDrugs.map((colDrug) => {
                        if (rowDrug.id === colDrug.id) {
                          return (
                            <td key={colDrug.id} className="p-3 bg-slate-100 border border-slate-200 text-slate-400">
                              —
                            </td>
                          );
                        }

                        const match = getPairInteraction(rowDrug.name, colDrug.name);
                        if (!match) {
                          return (
                            <td
                              key={colDrug.id}
                              className="p-3 bg-emerald-50/60 border border-slate-200 text-emerald-700 font-medium"
                              title="No known interaction"
                            >
                              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Safe
                              </span>
                            </td>
                          );
                        }

                        const severityStyles = {
                          contraindicated: 'bg-purple-100 text-purple-900 border-purple-200 font-bold',
                          major: 'bg-rose-100 text-rose-800 border-rose-200 font-bold',
                          moderate: 'bg-amber-100 text-amber-800 border-amber-200 font-semibold',
                          minor: 'bg-blue-100 text-blue-800 border-blue-200 font-medium',
                        }[match.severity];

                        return (
                          <td
                            key={colDrug.id}
                            className={`p-3 border border-slate-200 ${severityStyles}`}
                            title={match.description}
                          >
                            <span className="uppercase text-[11px]">{match.severity}</span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
