export type ScanType = 'X-ray' | 'MRI' | 'CT' | 'Pathology';
export type ScanStatus = 'pending' | 'analyzing' | 'completed' | 'flagged';
export type ScanPriority = 'routine' | 'urgent' | 'critical';
export type SeverityLevel = 'normal' | 'low' | 'moderate' | 'high' | 'critical';

export interface ScanFinding {
  id: string;
  condition: string;
  confidence: number; // 0 to 100
  severity: SeverityLevel;
  location?: string;
  description: string;
}

export interface MedicalScan {
  id: string;
  patientId: string;
  patientName: string;
  scanType: ScanType;
  bodyPart: string;
  scanDate: string;
  status: ScanStatus;
  priority: ScanPriority;
  imageUrl: string;
  heatmapUrl?: string;
  findings: ScanFinding[];
  radiologistNotes?: string;
  confidenceScore: number;
  reviewedBy?: string;
}

export interface Prescription {
  id: string;
  drugId: string;
  drugName: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  prescribedBy: string;
  status: 'active' | 'completed' | 'discontinued';
}

export interface Patient {
  id: string;
  mrn: string; // Medical Record Number
  firstName: string;
  lastName: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  dateOfBirth: string;
  bloodType: string;
  phone: string;
  email: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  allergies: string[];
  chronicConditions: string[];
  scanHistoryIds: string[];
  prescriptions: Prescription[];
  createdAt: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorName: string;
  department: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  durationMinutes: number;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  type: 'Scan Review' | 'Consultation' | 'Follow-up' | 'Lab Analysis';
  notes?: string;
}

export interface Drug {
  id: string;
  name: string;
  genericName: string;
  category: string;
  dosage: string;
  commonUses: string[];
}

export type InteractionSeverity = 'minor' | 'moderate' | 'major' | 'contraindicated';

export interface DrugInteraction {
  id: string;
  drug1: string;
  drug2: string;
  severity: InteractionSeverity;
  description: string;
  recommendation: string;
  mechanism?: string;
}

export interface ResearchProject {
  id: string;
  title: string;
  leadResearcher: string;
  status: 'recruiting' | 'active' | 'data-analysis' | 'published';
  participantsCount: number;
  targetParticipants: number;
  completionPercentage: number;
  description: string;
  startDate: string;
  category: string;
}

export interface GeneticData {
  id: string;
  gene: string;
  sampleId: string;
  expressionLevel: number; // e.g. RPKM / TPM
  mutationType: string;
  significance: 'benign' | 'uncertain' | 'pathogenic';
  patientId?: string;
  chromosomeLocation?: string;
}

export interface TrajectoryPoint {
  month: number;
  score: number;
  predictedScore?: number;
  confidenceLower?: number;
  confidenceUpper?: number;
}

export interface DiseaseTrajectory {
  patientId: string;
  diseaseType: string;
  riskLevel: 'low' | 'moderate' | 'high';
  timepoints: TrajectoryPoint[];
}

export interface WorkloadStats {
  department: string;
  activeDoctors: number;
  pendingCases: number;
  completedToday: number;
  avgTurnaroundHours: number;
}

export interface DetectionStats {
  finding: string;
  count: number;
  percentage: number;
  avgConfidence: number;
}

export interface ClinicalNotesSummary {
  originalText: string;
  chiefComplaint: string;
  historyOfPresentIllness: string;
  physicalExamination: string[];
  differentialDiagnosis: {
    condition: string;
    likelihood: 'High' | 'Moderate' | 'Low';
    rationale: string;
  }[];
  recommendedActions: string[];
  processedAt: string;
}

export interface ScanFilters {
  scanType?: string;
  status?: string;
  search?: string;
  priority?: string;
}

export interface AppointmentFilters {
  department?: string;
  status?: string;
  date?: string;
}
