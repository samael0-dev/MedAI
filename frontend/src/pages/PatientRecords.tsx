import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  UserPlus,
  Calendar,
  AlertTriangle,
  Pill,
  ScanLine,
  Phone,
  Mail,
  ShieldAlert,
  ChevronRight,
  X,
} from 'lucide-react';
import { getPatients, createPatient, getScans, getAppointments, checkDrugInteractions } from '../api/client';
import { useToast } from '../context/ToastContext';
import type { Patient, Prescription, DrugInteraction } from '../types';

export const PatientRecords: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Patient Form State
  const [newPatientData, setNewPatientData] = useState({
    firstName: '',
    lastName: '',
    age: 35,
    gender: 'Female' as Patient['gender'],
    dateOfBirth: '1989-05-14',
    bloodType: 'O+',
    phone: '',
    email: '',
    allergies: '',
    chronicConditions: '',
  });

  // Queries
  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: getPatients,
  });

  const { data: allScans = [] } = useQuery({
    queryKey: ['scans'],
    queryFn: () => getScans(),
  });

  const { data: allAppointments = [] } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => getAppointments(),
  });

  // Query interactions for selected patient's active prescriptions
  const { data: patientInteractions = [] } = useQuery<DrugInteraction[]>({
    queryKey: ['patientInteractions', selectedPatient?.id],
    queryFn: () => {
      if (!selectedPatient || !selectedPatient.prescriptions.length) return Promise.resolve([]);
      const drugNames = selectedPatient.prescriptions.map((p) => p.drugName);
      return checkDrugInteractions(drugNames);
    },
    enabled: !!selectedPatient,
  });

  // Create Patient Mutation
  const createPatientMutation = useMutation({
    mutationFn: async () => {
      const payload: Partial<Patient> = {
        firstName: newPatientData.firstName,
        lastName: newPatientData.lastName,
        age: Number(newPatientData.age),
        gender: newPatientData.gender,
        dateOfBirth: newPatientData.dateOfBirth,
        bloodType: newPatientData.bloodType,
        phone: newPatientData.phone || '+1 (555) 000-0000',
        email: newPatientData.email || 'patient@medai.org',
        allergies: newPatientData.allergies.split(',').map((s) => s.trim()).filter(Boolean),
        chronicConditions: newPatientData.chronicConditions.split(',').map((s) => s.trim()).filter(Boolean),
      };
      return await createPatient(payload);
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setShowAddModal(false);
      setSelectedPatient(created);
      showToast(`Patient record for ${created.firstName} ${created.lastName} created!`, 'success');
      setNewPatientData({
        firstName: '',
        lastName: '',
        age: 35,
        gender: 'Female',
        dateOfBirth: '1989-05-14',
        bloodType: 'O+',
        phone: '',
        email: '',
        allergies: '',
        chronicConditions: '',
      });
    },
    onError: () => {
      showToast('Failed to create patient record', 'error');
    },
  });

  // Filter patients
  const filteredPatients = patients.filter((p) => {
    const q = searchTerm.toLowerCase();
    return (
      p.firstName.toLowerCase().includes(q) ||
      p.lastName.toLowerCase().includes(q) ||
      p.mrn.toLowerCase().includes(q) ||
      p.chronicConditions.some((c) => c.toLowerCase().includes(q))
    );
  });

  // Filter scans & appointments for selected patient
  const patientScans = allScans.filter((s) => s.patientId === selectedPatient?.id);
  const patientAppointments = allAppointments.filter((a) => a.patientId === selectedPatient?.id);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Electronic Health Records
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Comprehensive patient directory, longitudinal scan histories, active pharmacotherapy, and allergy surveillance.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 transition-all self-start sm:self-auto cursor-pointer"
        >
          <UserPlus className="h-4 w-4" />
          Register Patient
        </button>
      </div>

      {/* Search Input Bar */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search patients by name, Medical Record Number (MRN), or chronic diagnosis..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/10"
          />
        </div>
      </div>

      {/* Patient Directory Grid / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredPatients.map((patient) => {
          const isSelected = selectedPatient?.id === patient.id;
          return (
            <div
              key={patient.id}
              onClick={() => setSelectedPatient(patient)}
              className={`rounded-2xl border p-5 transition-all cursor-pointer bg-white dark:bg-slate-900 shadow-2xs hover:shadow-md flex flex-col justify-between ${
                isSelected
                  ? 'border-blue-600 dark:border-blue-500 ring-2 ring-blue-600/10'
                  : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-sm border border-blue-100 dark:border-blue-900/60">
                      {patient.firstName[0]}
                      {patient.lastName[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-base">
                        {patient.firstName} {patient.lastName}
                      </h3>
                      <span className="font-mono text-xs text-slate-400 dark:text-slate-500">{patient.mrn}</span>
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200/40 dark:border-slate-700">
                    {patient.bloodType}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800 pt-3">
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block">Age & Sex:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {patient.age} yrs • {patient.gender}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block">Phone:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300 truncate block">{patient.phone}</span>
                  </div>
                </div>

                {patient.chronicConditions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {patient.chronicConditions.map((cond) => (
                      <span
                        key={cond}
                        className="rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-900/60 px-2 py-0.5 text-[11px] font-medium"
                      >
                        {cond}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  {patient.prescriptions.length} Active Rx • {patient.scanHistoryIds.length} Scans
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPatient(patient);
                  }}
                  className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                >
                  View Chart <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Patient Detail Drawer / Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-4xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-lg shadow-sm">
                  {selectedPatient.firstName[0]}
                  {selectedPatient.lastName[0]}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                    {selectedPatient.firstName} {selectedPatient.lastName}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <span>MRN: <b className="text-slate-800 dark:text-slate-200">{selectedPatient.mrn}</b></span>
                    <span>DOB: {selectedPatient.dateOfBirth} ({selectedPatient.age} yrs)</span>
                    <span>Blood: <b className="text-rose-600 dark:text-rose-400">{selectedPatient.bloodType}</b></span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPatient(null);
                    navigate('/scheduling');
                  }}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800/80 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors cursor-pointer"
                >
                  <Calendar className="h-3.5 w-3.5" /> Book Encounter
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPatient(null)}
                  className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  aria-label="Close dialog"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Drug Interaction Alerts Warning (if any) */}
            {patientInteractions.length > 0 && (
              <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-4 space-y-2">
                <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold text-xs uppercase tracking-wider">
                  <ShieldAlert className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  Clinical Pharmacological Interaction Alert
                </div>
                {patientInteractions.map((inter) => (
                  <div key={inter.id} className="text-xs text-rose-900 dark:text-rose-200 pl-6 border-l-2 border-rose-300 dark:border-rose-700">
                    <span className="font-bold">
                      {inter.drug1} + {inter.drug2}:
                    </span>{' '}
                    {inter.description}
                    <div className="text-[11px] text-rose-700 dark:text-rose-400 italic mt-0.5">
                      Recommendation: {inter.recommendation}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Demographics & Clinical Profile */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 p-4 text-xs space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white uppercase text-[11px] tracking-wider mb-2">
                  Contact Information
                </h4>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Phone className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" /> {selectedPatient.phone}
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Mail className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" /> {selectedPatient.email}
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 dark:text-slate-500 block font-medium">Emergency Contact:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedPatient.emergencyContact.name} ({selectedPatient.emergencyContact.relationship})
                  </p>
                  <p className="text-slate-600 dark:text-slate-400">{selectedPatient.emergencyContact.phone}</p>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 p-4 text-xs space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white uppercase text-[11px] tracking-wider mb-2">
                  Known Allergies
                </h4>
                {selectedPatient.allergies.length > 0 ? (
                  <div className="space-y-1">
                    {selectedPatient.allergies.map((allergy) => (
                      <div
                        key={allergy}
                        className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-semibold bg-rose-50 dark:bg-rose-950/60 px-2 py-1 rounded-md border border-rose-100 dark:border-rose-900/50"
                      >
                        <AlertTriangle className="h-3 w-3" /> {allergy}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 dark:text-slate-500 italic">No documented drug or environmental allergies.</p>
                )}
              </div>

              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 p-4 text-xs space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white uppercase text-[11px] tracking-wider mb-2">
                  Chronic Diagnoses
                </h4>
                {selectedPatient.chronicConditions.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPatient.chronicConditions.map((cond) => (
                      <span
                        key={cond}
                        className="rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 px-2 py-1 text-xs font-medium"
                      >
                        {cond}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 dark:text-slate-500 italic">No chronic diagnoses flagged.</p>
                )}
              </div>
            </div>

            {/* Active Prescriptions Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <Pill className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Active Medications ({selectedPatient.prescriptions.length})
                </h4>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto text-xs">
                <table className="w-full text-left min-w-[500px]">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-4 py-2.5">Medication</th>
                      <th className="px-4 py-2.5">Dosage</th>
                      <th className="px-4 py-2.5">Frequency</th>
                      <th className="px-4 py-2.5">Prescribed By</th>
                      <th className="px-4 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {selectedPatient.prescriptions.map((rx: Prescription) => (
                      <tr key={rx.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-white">{rx.drugName}</td>
                        <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{rx.dosage}</td>
                        <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{rx.frequency}</td>
                        <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{rx.prescribedBy}</td>
                        <td className="px-4 py-2.5">
                          <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-850 px-2 py-0.5 text-[10px] font-semibold">
                            {rx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {selectedPatient.prescriptions.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-400 dark:text-slate-500">
                          No active prescriptions recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Scan History Timeline */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <ScanLine className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Longitudinal Scan History ({patientScans.length})
              </h4>
              <div className="space-y-2">
                {patientScans.map((scan) => (
                  <div
                    key={scan.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/50 hover:bg-slate-100/60 dark:hover:bg-slate-800/80 transition-colors text-xs gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200/40 dark:border-blue-900/40 font-bold px-2 py-0.5">
                        {scan.scanType}
                      </span>
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">{scan.bodyPart}</span>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {new Date(scan.scanDate).toLocaleDateString()} • {scan.findings[0]?.condition || 'Reviewed'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 hidden sm:inline">{scan.confidenceScore}% AI Confidence</span>
                      <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold">
                        {scan.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPatient(null);
                          navigate(`/scan-results?id=${scan.id}`);
                        }}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors shadow-2xs cursor-pointer"
                      >
                        Inspect Scan &rarr;
                      </button>
                    </div>
                  </div>
                ))}
                {patientScans.length === 0 && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic">No prior diagnostic scans found for this patient.</p>
                )}
              </div>
            </div>

            {/* Upcoming Appointments */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Scheduled Encounters ({patientAppointments.length})
              </h4>
              <div className="space-y-2">
                {patientAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/50 text-xs gap-3"
                  >
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">{apt.type}</span> — <span className="text-slate-600 dark:text-slate-300">{apt.department}</span>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                        With {apt.doctorName} on {apt.date} at {apt.time}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/40 dark:border-blue-900/50 px-2.5 py-0.5 font-semibold text-[10px]">
                        {apt.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPatient(null);
                          navigate('/scheduling');
                        }}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors shadow-2xs cursor-pointer"
                      >
                        Manage &rarr;
                      </button>
                    </div>
                  </div>
                ))}
                {patientAppointments.length === 0 && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic">No upcoming encounters scheduled.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Patient Registration Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-blue-600 dark:text-blue-400" /> New Patient Registration
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createPatientMutation.mutate();
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={newPatientData.firstName}
                    onChange={(e) => setNewPatientData({ ...newPatientData, firstName: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={newPatientData.lastName}
                    onChange={(e) => setNewPatientData({ ...newPatientData, lastName: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Age</label>
                  <input
                    type="number"
                    value={newPatientData.age}
                    onChange={(e) => setNewPatientData({ ...newPatientData, age: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Gender</label>
                  <select
                    value={newPatientData.gender}
                    onChange={(e) => setNewPatientData({ ...newPatientData, gender: e.target.value as Patient['gender'] })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Blood Type</label>
                  <select
                    value={newPatientData.bloodType}
                    onChange={(e) => setNewPatientData({ ...newPatientData, bloodType: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
                  >
                    {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((bt) => (
                      <option key={bt} value={bt}>
                        {bt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+1 (555) 000-0000"
                    value={newPatientData.phone}
                    onChange={(e) => setNewPatientData({ ...newPatientData, phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="patient@domain.com"
                    value={newPatientData.email}
                    onChange={(e) => setNewPatientData({ ...newPatientData, email: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Known Allergies (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Penicillin, Codeine, Peanuts"
                  value={newPatientData.allergies}
                  onChange={(e) => setNewPatientData({ ...newPatientData, allergies: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Chronic Conditions (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Hypertension, Asthma, Type 2 Diabetes"
                  value={newPatientData.chronicConditions}
                  onChange={(e) => setNewPatientData({ ...newPatientData, chronicConditions: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 text-center cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPatientMutation.isPending}
                  className="w-full sm:w-auto px-5 py-2 rounded-xl bg-blue-600 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 text-center cursor-pointer"
                >
                  {createPatientMutation.isPending ? 'Registering...' : 'Save Patient Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
