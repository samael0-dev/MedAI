import React, { useState } from 'react';
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Electronic Health Records
          </h1>
          <p className="mt-1 text-sm text-slate-500">
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
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search patients by name, Medical Record Number (MRN), or chronic diagnosis..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/10"
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
              className={`rounded-2xl border p-5 transition-all cursor-pointer bg-white shadow-2xs hover:shadow-md flex flex-col justify-between ${
                isSelected ? 'border-blue-600 ring-2 ring-blue-600/10' : 'border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700 font-bold text-sm border border-blue-100">
                      {patient.firstName[0]}
                      {patient.lastName[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">
                        {patient.firstName} {patient.lastName}
                      </h3>
                      <span className="font-mono text-xs text-slate-400">{patient.mrn}</span>
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                    {patient.bloodType}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                  <div>
                    <span className="text-slate-400 block">Age & Sex:</span>
                    <span className="font-semibold text-slate-800">
                      {patient.age} yrs • {patient.gender}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Phone:</span>
                    <span className="font-medium text-slate-700 truncate block">{patient.phone}</span>
                  </div>
                </div>

                {patient.chronicConditions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {patient.chronicConditions.map((cond) => (
                      <span
                        key={cond}
                        className="rounded-md bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 text-[11px] font-medium"
                      >
                        {cond}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">
                  {patient.prescriptions.length} Active Rx • {patient.scanHistoryIds.length} Scans
                </span>
                <button
                  type="button"
                  className="font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
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
          <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-lg">
                  {selectedPatient.firstName[0]}
                  {selectedPatient.lastName[0]}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">
                    {selectedPatient.firstName} {selectedPatient.lastName}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                    <span>MRN: <b className="text-slate-800">{selectedPatient.mrn}</b></span>
                    <span>DOB: {selectedPatient.dateOfBirth} ({selectedPatient.age} yrs)</span>
                    <span>Blood: <b className="text-rose-600">{selectedPatient.bloodType}</b></span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedPatient(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drug Interaction Alerts Warning (if any) */}
            {patientInteractions.length > 0 && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-rose-800 font-bold text-xs uppercase tracking-wider">
                  <ShieldAlert className="h-4 w-4 text-rose-600" />
                  Clinical Pharmacological Interaction Alert
                </div>
                {patientInteractions.map((inter) => (
                  <div key={inter.id} className="text-xs text-rose-900 pl-6 border-l-2 border-rose-300">
                    <span className="font-bold">
                      {inter.drug1} + {inter.drug2}:
                    </span>{' '}
                    {inter.description}
                    <div className="text-[11px] text-rose-700 italic mt-0.5">
                      Recommendation: {inter.recommendation}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Demographics & Clinical Profile */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-4 text-xs space-y-2">
                <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-2">
                  Contact Information
                </h4>
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="h-3.5 w-3.5 text-slate-400" /> {selectedPatient.phone}
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="h-3.5 w-3.5 text-slate-400" /> {selectedPatient.email}
                </div>
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-slate-400 block font-medium">Emergency Contact:</span>
                  <p className="font-semibold text-slate-800">
                    {selectedPatient.emergencyContact.name} ({selectedPatient.emergencyContact.relationship})
                  </p>
                  <p className="text-slate-600">{selectedPatient.emergencyContact.phone}</p>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-4 text-xs space-y-2">
                <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-2">
                  Known Allergies
                </h4>
                {selectedPatient.allergies.length > 0 ? (
                  <div className="space-y-1">
                    {selectedPatient.allergies.map((allergy) => (
                      <div
                        key={allergy}
                        className="flex items-center gap-1.5 text-rose-700 font-semibold bg-rose-50 px-2 py-1 rounded-md border border-rose-100"
                      >
                        <AlertTriangle className="h-3 w-3" /> {allergy}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">No documented drug or environmental allergies.</p>
                )}
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-4 text-xs space-y-2">
                <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-2">
                  Chronic Diagnoses
                </h4>
                {selectedPatient.chronicConditions.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPatient.chronicConditions.map((cond) => (
                      <span
                        key={cond}
                        className="rounded-md bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 text-xs font-medium"
                      >
                        {cond}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">No chronic diagnoses flagged.</p>
                )}
              </div>
            </div>

            {/* Active Prescriptions Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Pill className="h-4 w-4 text-blue-600" /> Active Medications ({selectedPatient.prescriptions.length})
                </h4>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5">Medication</th>
                      <th className="px-4 py-2.5">Dosage</th>
                      <th className="px-4 py-2.5">Frequency</th>
                      <th className="px-4 py-2.5">Prescribed By</th>
                      <th className="px-4 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedPatient.prescriptions.map((rx: Prescription) => (
                      <tr key={rx.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-2.5 font-bold text-slate-900">{rx.drugName}</td>
                        <td className="px-4 py-2.5 text-slate-700">{rx.dosage}</td>
                        <td className="px-4 py-2.5 text-slate-600">{rx.frequency}</td>
                        <td className="px-4 py-2.5 text-slate-600">{rx.prescribedBy}</td>
                        <td className="px-4 py-2.5">
                          <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold">
                            {rx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {selectedPatient.prescriptions.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-400">
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
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ScanLine className="h-4 w-4 text-blue-600" /> Longitudinal Scan History ({patientScans.length})
              </h4>
              <div className="space-y-2">
                {patientScans.map((scan) => (
                  <div
                    key={scan.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100/60 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="rounded-md bg-blue-100 text-blue-800 font-bold px-2 py-0.5">
                        {scan.scanType}
                      </span>
                      <div>
                        <span className="font-bold text-slate-900">{scan.bodyPart}</span>
                        <div className="text-[11px] text-slate-500">
                          {new Date(scan.scanDate).toLocaleDateString()} • {scan.findings[0]?.condition || 'Reviewed'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-slate-700">{scan.confidenceScore}% AI Confidence</span>
                      <span className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[10px] font-bold">
                        {scan.status}
                      </span>
                    </div>
                  </div>
                ))}
                {patientScans.length === 0 && (
                  <p className="text-xs text-slate-400 italic">No prior diagnostic scans found for this patient.</p>
                )}
              </div>
            </div>

            {/* Upcoming Appointments */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" /> Scheduled Encounters ({patientAppointments.length})
              </h4>
              <div className="space-y-2">
                {patientAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/60 text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900">{apt.type}</span> — {apt.department}
                      <p className="text-slate-500 text-[11px]">
                        With {apt.doctorName} on {apt.date} at {apt.time}
                      </p>
                    </div>
                    <span className="rounded-full bg-blue-50 text-blue-700 px-2.5 py-0.5 font-semibold text-[10px]">
                      {apt.status}
                    </span>
                  </div>
                ))}
                {patientAppointments.length === 0 && (
                  <p className="text-xs text-slate-400 italic">No upcoming encounters scheduled.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Patient Registration Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-blue-600" /> New Patient Registration
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={newPatientData.firstName}
                    onChange={(e) => setNewPatientData({ ...newPatientData, firstName: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={newPatientData.lastName}
                    onChange={(e) => setNewPatientData({ ...newPatientData, lastName: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Age</label>
                  <input
                    type="number"
                    value={newPatientData.age}
                    onChange={(e) => setNewPatientData({ ...newPatientData, age: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Gender</label>
                  <select
                    value={newPatientData.gender}
                    onChange={(e) => setNewPatientData({ ...newPatientData, gender: e.target.value as Patient['gender'] })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Blood Type</label>
                  <select
                    value={newPatientData.bloodType}
                    onChange={(e) => setNewPatientData({ ...newPatientData, bloodType: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
                  >
                    {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((bt) => (
                      <option key={bt} value={bt}>
                        {bt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+1 (555) 000-0000"
                    value={newPatientData.phone}
                    onChange={(e) => setNewPatientData({ ...newPatientData, phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="patient@domain.com"
                    value={newPatientData.email}
                    onChange={(e) => setNewPatientData({ ...newPatientData, email: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Known Allergies (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Penicillin, Codeine, Peanuts"
                  value={newPatientData.allergies}
                  onChange={(e) => setNewPatientData({ ...newPatientData, allergies: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Chronic Conditions (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Hypertension, Asthma, Type 2 Diabetes"
                  value={newPatientData.chronicConditions}
                  onChange={(e) => setNewPatientData({ ...newPatientData, chronicConditions: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPatientMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-blue-600 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
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
