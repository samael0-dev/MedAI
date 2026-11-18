import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar as CalendarIcon,
  Plus,
  Filter,
  AlertTriangle,
  X,
  Stethoscope,
} from 'lucide-react';
import { getAppointments, createAppointment, getPatients } from '../api/client';
import { useToast } from '../context/ToastContext';
import type { Appointment } from '../types';

export const Scheduling: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [selectedDate, setSelectedDate] = useState('2026-10-22');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Appointment Form State
  const [formPatientId, setFormPatientId] = useState('pt-001');
  const [formDoctor, setFormDoctor] = useState('Dr. Alan Mitchell');
  const [formDepartment, setFormDepartment] = useState('Radiology');
  const [formDate, setFormDate] = useState('2026-10-22');
  const [formTime, setFormTime] = useState('10:00');
  const [formDuration, setFormDuration] = useState(30);
  const [formType, setFormType] = useState<Appointment['type']>('Scan Review');
  const [formNotes, setFormNotes] = useState('');

  // Queries
  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments', selectedDepartment],
    queryFn: () => getAppointments({ department: selectedDepartment }),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: getPatients,
  });

  // Conflict Detection Logic
  const hasConflict = appointments.some((apt) => {
    return (
      apt.date === formDate &&
      apt.time === formTime &&
      (apt.doctorName === formDoctor || apt.patientId === formPatientId)
    );
  });

  // Create Mutation
  const createAptMutation = useMutation({
    mutationFn: async () => {
      const patient = patients.find((p) => p.id === formPatientId);
      const payload: Partial<Appointment> = {
        patientId: formPatientId,
        patientName: patient ? `${patient.firstName} ${patient.lastName}` : 'Assigned Patient',
        doctorName: formDoctor,
        department: formDepartment,
        date: formDate,
        time: formTime,
        durationMinutes: Number(formDuration),
        type: formType,
        notes: formNotes,
      };
      return await createAppointment(payload);
    },
    onSuccess: (newApt) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setShowCreateModal(false);
      showToast(`Appointment booked for ${newApt.patientName} with ${newApt.doctorName}`, 'success');
      setFormNotes('');
    },
    onError: () => {
      showToast('Failed to schedule appointment', 'error');
    },
  });

  const doctorsList = [
    { name: 'Dr. Alan Mitchell', dept: 'Radiology' },
    { name: 'Dr. Sarah Lin', dept: 'Neurology' },
    { name: 'Dr. Emily Watson', dept: 'Oncology' },
    { name: 'Dr. David Kim', dept: 'Cardiology' },
    { name: 'Dr. Robert Marcus', dept: 'Internal Medicine' },
  ];

  const departments = ['Radiology', 'Oncology', 'Cardiology', 'Neurology', 'Internal Medicine'];

  const timeSlots = [
    '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'
  ];

  const filteredAppointments = appointments.filter((apt) => {
    if (selectedDepartment !== 'all' && apt.department.toLowerCase() !== selectedDepartment.toLowerCase()) {
      return false;
    }
    if (viewMode === 'day' && apt.date !== selectedDate) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Title & Booking Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Clinical Scheduling & Patient Encounters
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Real-time multi-departmental clinic bookings, doctor consultation timelines, and conflict detection.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Schedule Appointment
        </button>
      </div>

      {/* Control Bar: View Toggle, Date & Department Filter */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Left: View Mode Toggle */}
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200/80 dark:border-slate-700 w-fit">
          <button
            type="button"
            onClick={() => setViewMode('day')}
            className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'day' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Day View
          </button>
          <button
            type="button"
            onClick={() => setViewMode('week')}
            className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'week' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Week Overview
          </button>
        </div>

        {/* Middle: Date Selector */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-hidden"
          />
        </div>

        {/* Right: Department Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400 dark:text-slate-500" />
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-hidden"
          >
            <option value="all">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Timeline View */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              {viewMode === 'day' ? `Schedule for ${selectedDate}` : 'Scheduled Encounters Across Week'}
            </h3>
          </div>
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            {filteredAppointments.length} appointment{filteredAppointments.length !== 1 ? 's' : ''} listed
          </span>
        </div>

        {/* Time slot grid */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {timeSlots.map((slot) => {
            const slotApts = filteredAppointments.filter((a) => a.time.startsWith(slot.slice(0, 2)));

            return (
              <div key={slot} className="py-4 flex flex-col md:flex-row md:items-start gap-4">
                {/* Time Label */}
                <div className="w-20 shrink-0 font-mono text-xs font-bold text-slate-500 dark:text-slate-400 pt-1">
                  {slot}
                </div>

                {/* Appointment Cards */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {slotApts.map((apt) => {
                    const statusColors = {
                      'in-progress': 'border-blue-300 dark:border-blue-800/80 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200',
                      scheduled: 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 text-slate-900 dark:text-white',
                      completed: 'border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200',
                      cancelled: 'border-rose-200 dark:border-rose-800/80 bg-rose-50/70 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200',
                    }[apt.status];

                    return (
                      <div
                        key={apt.id}
                        className={`rounded-xl border p-4 shadow-2xs transition-all hover:shadow-md space-y-2 ${statusColors}`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200/40 dark:border-blue-800/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                              {apt.type}
                            </span>
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1">{apt.patientName}</h4>
                          </div>
                          <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                            {apt.time} ({apt.durationMinutes}m)
                          </span>
                        </div>

                        <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                          <Stethoscope className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                          <span>{apt.doctorName}</span>
                          <span className="text-slate-400 dark:text-slate-500">• {apt.department}</span>
                        </div>

                        {apt.notes && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 italic line-clamp-1 border-t border-slate-100/80 dark:border-slate-700/60 pt-1.5">
                            "{apt.notes}"
                          </p>
                        )}

                        <div className="pt-2 border-t border-slate-100/80 dark:border-slate-700/60 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => navigate('/patients')}
                            className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                          >
                            View Patient Chart &rarr;
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {slotApts.length === 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormTime(slot);
                        setFormDate(selectedDate);
                        setShowCreateModal(true);
                      }}
                      className="py-2.5 px-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-950/40 text-xs text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5 transition-all cursor-pointer group"
                    >
                      <Plus className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                      <span>Available • Book {slot}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Appointment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" /> Book Clinical Appointment
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Conflict Detection Alert */}
            {hasConflict && (
              <div className="rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/40 p-3.5 flex items-start gap-2.5 text-amber-900 dark:text-amber-200 text-xs">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Scheduling Conflict Detected!</span>
                  {formDoctor} or the patient already has an active appointment at {formTime} on {formDate}.
                  Consider selecting an alternative time slot.
                </div>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createAptMutation.mutate();
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Select Patient *</label>
                <select
                  value={formPatientId}
                  onChange={(e) => setFormPatientId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} — {p.mrn} ({p.gender}, {p.age}y)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Department</label>
                  <select
                    value={formDepartment}
                    onChange={(e) => {
                      setFormDepartment(e.target.value);
                      const matchingDoc = doctorsList.find((d) => d.dept === e.target.value);
                      if (matchingDoc) setFormDoctor(matchingDoc.name);
                    }}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
                  >
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Physician / Specialist</label>
                  <select
                    value={formDoctor}
                    onChange={(e) => setFormDoctor(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
                  >
                    {doctorsList.map((doc) => (
                      <option key={doc.name} value={doc.name}>
                        {doc.name} ({doc.dept})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Time</label>
                  <select
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
                  >
                    {timeSlots.map((ts) => (
                      <option key={ts} value={ts}>
                        {ts}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Duration</label>
                  <select
                    value={formDuration}
                    onChange={(e) => setFormDuration(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value={15}>15 mins</option>
                    <option value={30}>30 mins</option>
                    <option value={45}>45 mins</option>
                    <option value={60}>60 mins</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Encounter Type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as Appointment['type'])}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="Scan Review">Scan Review</option>
                  <option value="Consultation">Consultation</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="Lab Analysis">Lab Analysis</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Clinical Notes / Reason for Visit</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Review chest CT findings with oncology team..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 p-2.5 text-sm focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createAptMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-blue-600 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                >
                  {createAptMutation.isPending ? 'Booking...' : 'Confirm Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
