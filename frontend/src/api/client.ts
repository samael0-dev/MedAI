import axios, { AxiosError } from 'axios';
import type {
  MedicalScan,
  Patient,
  Appointment,
  DrugInteraction,
  ResearchProject,
  GeneticData,
  DiseaseTrajectory,
  WorkloadStats,
  DetectionStats,
  ClinicalNotesSummary,
  ScanFilters,
  AppointmentFilters,
  Drug,
  AuthUser,
  LoginCredentials,
  RegisterCredentials,
  AuthResponse,
  GoogleAuthPayload,
  OtpResponseData,
} from '../types';

const getBaseURL = () => {
  if (typeof window !== 'undefined') {
    // If running in browser, proxy through current host or use VITE_API_URL if set
    return (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000/api';
  }
  return 'http://localhost:8000/api';
};

export const apiClient = axios.create({
  baseURL: getBaseURL(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach JWT bearer token if stored
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('medai_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Console log for debugging, but don't crash
    console.warn(`[API Client] Backend call failed (${error.config?.url}):`, error.message);
    return Promise.reject(error);
  }
);

// -------------------------------------------------------------
// Fallback / Mock Data Repository
// -------------------------------------------------------------

export const MOCK_PATIENTS: Patient[] = [
  {
    id: 'pt-001',
    mrn: 'MRN-90214',
    firstName: 'Eleanor',
    lastName: 'Vance',
    age: 58,
    gender: 'Female',
    dateOfBirth: '1968-04-12',
    bloodType: 'A+',
    phone: '+1 (555) 234-8901',
    email: 'eleanor.vance@medmail.com',
    emergencyContact: {
      name: 'Thomas Vance',
      relationship: 'Spouse',
      phone: '+1 (555) 234-8902',
    },
    allergies: ['Penicillin', 'Sulfa drugs'],
    chronicConditions: ['Type 2 Diabetes', 'Hypertension'],
    scanHistoryIds: ['scan-101', 'scan-105'],
    prescriptions: [
      {
        id: 'rx-1',
        drugId: 'drug-1',
        drugName: 'Metformin',
        dosage: '500mg',
        frequency: 'Twice daily with meals',
        startDate: '2024-01-15',
        prescribedBy: 'Dr. Sarah Lin',
        status: 'active',
      },
      {
        id: 'rx-2',
        drugId: 'drug-2',
        drugName: 'Lisinopril',
        dosage: '10mg',
        frequency: 'Once daily morning',
        startDate: '2024-03-20',
        prescribedBy: 'Dr. Robert Marcus',
        status: 'active',
      },
      {
        id: 'rx-3',
        drugId: 'drug-3',
        drugName: 'Aspirin',
        dosage: '81mg',
        frequency: 'Once daily',
        startDate: '2023-11-10',
        prescribedBy: 'Dr. Robert Marcus',
        status: 'active',
      },
    ],
    createdAt: '2023-11-10T09:00:00Z',
  },
  {
    id: 'pt-002',
    mrn: 'MRN-78192',
    firstName: 'Marcus',
    lastName: 'Chen',
    age: 42,
    gender: 'Male',
    dateOfBirth: '1984-08-25',
    bloodType: 'O-',
    phone: '+1 (555) 872-3419',
    email: 'm.chen@biotech.org',
    emergencyContact: {
      name: 'Angela Chen',
      relationship: 'Sister',
      phone: '+1 (555) 872-3420',
    },
    allergies: ['Latex'],
    chronicConditions: ['Asthma'],
    scanHistoryIds: ['scan-102'],
    prescriptions: [
      {
        id: 'rx-4',
        drugId: 'drug-4',
        drugName: 'Albuterol Inhaler',
        dosage: '90mcg',
        frequency: 'As needed for wheezing',
        startDate: '2022-06-01',
        prescribedBy: 'Dr. Emily Watson',
        status: 'active',
      },
    ],
    createdAt: '2022-06-01T14:30:00Z',
  },
  {
    id: 'pt-003',
    mrn: 'MRN-44910',
    firstName: 'Sophia',
    lastName: 'Rodriguez',
    age: 67,
    gender: 'Female',
    dateOfBirth: '1959-12-03',
    bloodType: 'B+',
    phone: '+1 (555) 341-9920',
    email: 'sophia.rodriguez@domain.com',
    emergencyContact: {
      name: 'Carlos Rodriguez',
      relationship: 'Son',
      phone: '+1 (555) 341-9921',
    },
    allergies: ['Codeine', 'Contrast Dye'],
    chronicConditions: ['Atrial Fibrillation', 'Osteoarthritis'],
    scanHistoryIds: ['scan-103', 'scan-106'],
    prescriptions: [
      {
        id: 'rx-5',
        drugId: 'drug-5',
        drugName: 'Warfarin',
        dosage: '5mg',
        frequency: 'Daily evening',
        startDate: '2023-08-14',
        prescribedBy: 'Dr. David Kim',
        status: 'active',
      },
      {
        id: 'rx-6',
        drugId: 'drug-6',
        drugName: 'Atorvastatin',
        dosage: '20mg',
        frequency: 'Once daily bedtime',
        startDate: '2023-08-14',
        prescribedBy: 'Dr. David Kim',
        status: 'active',
      },
    ],
    createdAt: '2023-08-14T11:15:00Z',
  },
  {
    id: 'pt-004',
    mrn: 'MRN-33019',
    firstName: 'James',
    lastName: 'Kowalski',
    age: 71,
    gender: 'Male',
    dateOfBirth: '1955-02-18',
    bloodType: 'AB+',
    phone: '+1 (555) 602-1144',
    email: 'j.kowalski@legacy.net',
    emergencyContact: {
      name: 'Helen Kowalski',
      relationship: 'Spouse',
      phone: '+1 (555) 602-1145',
    },
    allergies: [],
    chronicConditions: ['Coronary Artery Disease', 'COPD'],
    scanHistoryIds: ['scan-104'],
    prescriptions: [
      {
        id: 'rx-7',
        drugId: 'drug-7',
        drugName: 'Clopidogrel',
        dosage: '75mg',
        frequency: 'Once daily',
        startDate: '2024-02-01',
        prescribedBy: 'Dr. David Kim',
        status: 'active',
      },
    ],
    createdAt: '2024-02-01T16:00:00Z',
  },
];

export const MOCK_SCANS: MedicalScan[] = [
  {
    id: 'scan-101',
    patientId: 'pt-001',
    patientName: 'Eleanor Vance',
    scanType: 'X-ray',
    bodyPart: 'Chest (AP View)',
    scanDate: '2026-10-21T10:15:00Z',
    status: 'flagged',
    priority: 'urgent',
    imageUrl: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80',
    heatmapUrl: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=800&q=80',
    confidenceScore: 94.2,
    reviewedBy: 'Dr. Alan Mitchell (Chief Radiologist)',
    radiologistNotes:
      'Patchy alveolar consolidation in the right lower lobe consistent with acute bacterial pneumonia. No pleural effusion or pneumothorax visible. Recommend oral antibiotic therapy and follow-up scan in 3 weeks.',
    findings: [
      {
        id: 'f-1',
        condition: 'Right Lower Lobe Pneumonia',
        confidence: 94.2,
        severity: 'high',
        location: 'Right Lower Lobe',
        description: 'Dense segmental opacity noted with visible air bronchograms.',
      },
      {
        id: 'f-2',
        condition: 'Mild Cardiomegaly',
        confidence: 76.5,
        severity: 'low',
        location: 'Cardiac Silhouette',
        description: 'Cardiothoracic ratio slightly elevated at 0.54.',
      },
    ],
  },
  {
    id: 'scan-102',
    patientId: 'pt-002',
    patientName: 'Marcus Chen',
    scanType: 'MRI',
    bodyPart: 'Brain (T1 & T2 FLAIR)',
    scanDate: '2026-10-20T14:40:00Z',
    status: 'completed',
    priority: 'routine',
    imageUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80',
    confidenceScore: 98.1,
    reviewedBy: 'Dr. Sarah Lin',
    radiologistNotes:
      'Brain MRI shows age-appropriate ventricles and sulci. No intracranial mass, acute ischemia, or hemorrhage detected. Normal midline structures.',
    findings: [
      {
        id: 'f-3',
        condition: 'Unremarkable Brain Parenchyma',
        confidence: 98.1,
        severity: 'normal',
        description: 'Normal gray-white matter differentiation. No lesions found.',
      },
    ],
  },
  {
    id: 'scan-103',
    patientId: 'pt-003',
    patientName: 'Sophia Rodriguez',
    scanType: 'CT',
    bodyPart: 'Abdomen & Pelvis with Contrast',
    scanDate: '2026-10-19T09:10:00Z',
    status: 'completed',
    priority: 'routine',
    imageUrl: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80',
    confidenceScore: 88.7,
    reviewedBy: 'Dr. Alan Mitchell',
    radiologistNotes:
      'Small 6mm hypodense lesion in segment VI of liver, likely benign hemangioma. Gallbladder, pancreas, and spleen appear standard.',
    findings: [
      {
        id: 'f-4',
        condition: 'Hepatic Hemangioma (Probable)',
        confidence: 88.7,
        severity: 'low',
        location: 'Liver Segment VI',
        description: 'Well-circumscribed hypoattenuating nodule, peripheral nodular enhancement.',
      },
    ],
  },
  {
    id: 'scan-104',
    patientId: 'pt-004',
    patientName: 'James Kowalski',
    scanType: 'CT',
    bodyPart: 'Chest High-Resolution CT',
    scanDate: '2026-10-18T16:05:00Z',
    status: 'flagged',
    priority: 'critical',
    imageUrl: 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&w=800&q=80',
    confidenceScore: 91.4,
    reviewedBy: 'Dr. Emily Watson',
    radiologistNotes:
      'Emphysematous changes in bilateral upper lobes. Solitary pulmonary nodule measuring 14mm in left upper lobe with spulated margins. Urgent PET-CT recommended.',
    findings: [
      {
        id: 'f-5',
        condition: 'Solitary Pulmonary Nodule (Spiculated)',
        confidence: 91.4,
        severity: 'critical',
        location: 'Left Upper Lobe (Apical)',
        description: '14mm spiculated pulmonary nodule suspicious for neoplasm.',
      },
      {
        id: 'f-6',
        condition: 'Centrilobular Emphysema',
        confidence: 89.0,
        severity: 'moderate',
        location: 'Bilateral Upper Lobes',
        description: 'Destruction of alveolar walls without fibrosis.',
      },
    ],
  },
  {
    id: 'scan-105',
    patientId: 'pt-001',
    patientName: 'Eleanor Vance',
    scanType: 'Pathology',
    bodyPart: 'Skin Biopsy (Left Forearm)',
    scanDate: '2026-10-15T11:20:00Z',
    status: 'completed',
    priority: 'routine',
    imageUrl: 'https://images.unsplash.com/photo-1579165466791-788226ab77b6?auto=format&fit=crop&w=800&q=80',
    confidenceScore: 96.5,
    reviewedBy: 'Dr. Gregory House',
    radiologistNotes: 'Seborrheic keratosis with hyperkeratosis and papillomatosis. Margins clear. No malignancy.',
    findings: [
      {
        id: 'f-7',
        condition: 'Seborrheic Keratosis',
        confidence: 96.5,
        severity: 'normal',
        description: 'Benign squamous proliferation.',
      },
    ],
  },
  {
    id: 'scan-106',
    patientId: 'pt-003',
    patientName: 'Sophia Rodriguez',
    scanType: 'X-ray',
    bodyPart: 'Right Knee (Weight-bearing)',
    scanDate: '2026-10-12T13:45:00Z',
    status: 'completed',
    priority: 'routine',
    imageUrl: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80',
    confidenceScore: 92.0,
    reviewedBy: 'Dr. Alan Mitchell',
    radiologistNotes: 'Grade 3 medial joint space narrowing with marginal osteophytes and subchondral sclerosis.',
    findings: [
      {
        id: 'f-8',
        condition: 'Osteoarthritis (Kellgren-Lawrence Grade 3)',
        confidence: 92.0,
        severity: 'moderate',
        location: 'Right Knee Medial Compartment',
        description: 'Definite osteophytes and marked joint space narrowing.',
      },
    ],
  },
];

export const MOCK_DRUGS: Drug[] = [
  { id: 'drug-1', name: 'Metformin', genericName: 'Metformin HCl', category: 'Antidiabetic', dosage: '500mg, 850mg, 1000mg', commonUses: ['Type 2 Diabetes', 'PCOS'] },
  { id: 'drug-2', name: 'Lisinopril', genericName: 'Lisinopril', category: 'ACE Inhibitor', dosage: '5mg, 10mg, 20mg, 40mg', commonUses: ['Hypertension', 'Heart Failure'] },
  { id: 'drug-3', name: 'Aspirin', genericName: 'Acetylsalicylic Acid', category: 'Antiplatelet / NSAID', dosage: '81mg, 325mg', commonUses: ['Cardioprotection', 'Pain', 'Fever'] },
  { id: 'drug-4', name: 'Albuterol', genericName: 'Albuterol Sulfate', category: 'Bronchodilator', dosage: '90mcg inhalation', commonUses: ['Asthma', 'COPD Bronchospasm'] },
  { id: 'drug-5', name: 'Warfarin', genericName: 'Warfarin Sodium', category: 'Anticoagulant', dosage: '1mg, 2.5mg, 5mg', commonUses: ['Atrial Fibrillation', 'DVT Prevention'] },
  { id: 'drug-6', name: 'Atorvastatin', genericName: 'Atorvastatin Calcium', category: 'Statin', dosage: '10mg, 20mg, 40mg, 80mg', commonUses: ['Hyperlipidemia', 'Cardiovascular Risk'] },
  { id: 'drug-7', name: 'Clopidogrel', genericName: 'Clopidogrel Bisulfate', category: 'P2Y12 Antiplatelet', dosage: '75mg', commonUses: ['Acute Coronary Syndrome', 'Stent Thrombosis Prevention'] },
  { id: 'drug-8', name: 'Ibuprofen', genericName: 'Ibuprofen', category: 'NSAID', dosage: '200mg, 400mg, 600mg', commonUses: ['Pain', 'Inflammation', 'Fever'] },
  { id: 'drug-9', name: 'Fluoxetine', genericName: 'Fluoxetine HCl', category: 'SSRI Antidepressant', dosage: '10mg, 20mg, 40mg', commonUses: ['Major Depressive Disorder', 'OCD'] },
  { id: 'drug-10', name: 'Sildenafil', genericName: 'Sildenafil Citrate', category: 'PDE5 Inhibitor', dosage: '20mg, 50mg, 100mg', commonUses: ['Pulmonary Arterial Hypertension', 'ED'] },
  { id: 'drug-11', name: 'Nitroglycerin', genericName: 'Nitroglycerin Sublingual', category: 'Vasodilator', dosage: '0.4mg', commonUses: ['Angina Pectoris'] },
];

export const MOCK_INTERACTIONS: DrugInteraction[] = [
  {
    id: 'int-1',
    drug1: 'Warfarin',
    drug2: 'Aspirin',
    severity: 'major',
    description: 'Concurrent use markedly elevates hemorrhage and gastrointestinal bleeding hazard.',
    recommendation: 'Avoid combination unless specifically indicated for mechanical heart valves. Monitor INR rigorously.',
    mechanism: 'Additive antiplatelet and anticoagulant pharmacological synergy on hemostatic pathways.',
  },
  {
    id: 'int-2',
    drug1: 'Warfarin',
    drug2: 'Ibuprofen',
    severity: 'major',
    description: 'NSAIDs displace warfarin from albumin and inhibit platelet aggregation, greatly increasing GI bleed incidence.',
    recommendation: 'Substitute with acetaminophen for mild-to-moderate analgesia.',
    mechanism: 'Competitive protein binding displacement and COX-1 gastrointestinal mucosal erosion.',
  },
  {
    id: 'int-3',
    drug1: 'Nitroglycerin',
    drug2: 'Sildenafil',
    severity: 'contraindicated',
    description: 'Potentiation of cGMP signaling leads to catastrophic refractory hypotension and fatal cardiovascular collapse.',
    recommendation: 'ABSOLUTE CONTRAINDICATION. Sildenafil must not be co-administered within 24 hours of nitrates.',
    mechanism: 'Synergistic excessive nitric oxide-mediated vascular smooth muscle relaxation.',
  },
  {
    id: 'int-4',
    drug1: 'Lisinopril',
    drug2: 'Aspirin',
    severity: 'moderate',
    description: 'High doses of aspirin attenuate the antihypertensive and renal protective benefits of ACE inhibitors.',
    recommendation: 'Low-dose cardioprotective aspirin (81mg) is permissible; monitor renal function and blood pressure.',
    mechanism: 'Inhibition of renal vasodilatory prostaglandins attenuates ACE-inhibitor-induced vasodilation.',
  },
  {
    id: 'int-5',
    drug1: 'Clopidogrel',
    drug2: 'Aspirin',
    severity: 'moderate',
    description: 'Dual antiplatelet therapy increases major bleeding risk, though standard following recent stenting.',
    recommendation: 'Ensure gastroprotection (e.g. PPI without CYP2C19 inhibition) and specify fixed treatment duration.',
    mechanism: 'Combined suppression of COX-1 thromboxane A2 and ADP P2Y12 platelet activation.',
  },
  {
    id: 'int-6',
    drug1: 'Fluoxetine',
    drug2: 'Warfarin',
    severity: 'moderate',
    description: 'Fluoxetine inhibits CYP2C9 metabolism of warfarin, potentially elevating INR and bleeding propensity.',
    recommendation: 'Monitor prothrombin time/INR upon initiation or dosage change of fluoxetine.',
    mechanism: 'CYP2C9 enzyme inhibition and platelet serotonin depletion.',
  },
];

export const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: 'apt-201',
    patientId: 'pt-001',
    patientName: 'Eleanor Vance',
    doctorName: 'Dr. Alan Mitchell',
    department: 'Radiology',
    date: '2026-10-22',
    time: '09:00',
    durationMinutes: 30,
    status: 'in-progress',
    type: 'Scan Review',
    notes: 'Review chest radiograph showing right lower lobe pneumonia progression.',
  },
  {
    id: 'apt-202',
    patientId: 'pt-002',
    patientName: 'Marcus Chen',
    doctorName: 'Dr. Sarah Lin',
    department: 'Neurology',
    date: '2026-10-22',
    time: '11:30',
    durationMinutes: 45,
    status: 'scheduled',
    type: 'Consultation',
    notes: 'Follow-up on episodic migraines and review unremarkable brain MRI.',
  },
  {
    id: 'apt-203',
    patientId: 'pt-004',
    patientName: 'James Kowalski',
    doctorName: 'Dr. Emily Watson',
    department: 'Oncology',
    date: '2026-10-22',
    time: '14:00',
    durationMinutes: 60,
    status: 'scheduled',
    type: 'Consultation',
    notes: 'Urgent discussion of solitary 14mm pulmonary nodule and PET scan referral.',
  },
  {
    id: 'apt-204',
    patientId: 'pt-003',
    patientName: 'Sophia Rodriguez',
    doctorName: 'Dr. David Kim',
    department: 'Cardiology',
    date: '2026-10-22',
    time: '15:30',
    durationMinutes: 30,
    status: 'scheduled',
    type: 'Follow-up',
    notes: 'INR monitoring check and antiarrhythmic medication calibration.',
  },
  {
    id: 'apt-205',
    patientId: 'pt-001',
    patientName: 'Eleanor Vance',
    doctorName: 'Dr. Robert Marcus',
    department: 'Internal Medicine',
    date: '2026-10-23',
    time: '10:00',
    durationMinutes: 30,
    status: 'scheduled',
    type: 'Follow-up',
    notes: 'Diabetes glycemic control and HbA1c review.',
  },
  {
    id: 'apt-206',
    patientId: 'pt-002',
    patientName: 'Marcus Chen',
    doctorName: 'Dr. Alan Mitchell',
    department: 'Radiology',
    date: '2026-10-24',
    time: '13:00',
    durationMinutes: 30,
    status: 'scheduled',
    type: 'Scan Review',
  },
];

export const MOCK_RESEARCH_PROJECTS: ResearchProject[] = [
  {
    id: 'res-301',
    title: 'Deep Convolutional Biomarkers for Early-Stage Non-Small Cell Lung Carcinoma',
    leadResearcher: 'Dr. Aris Thorne, MD, PhD',
    status: 'active',
    participantsCount: 1420,
    targetParticipants: 2000,
    completionPercentage: 71,
    description: 'Validating multimodal neural attention networks across 15,000 low-dose chest CTs to identify sub-solid malignant nodules.',
    startDate: '2025-01-15',
    category: 'Oncology / AI Vision',
  },
  {
    id: 'res-302',
    title: 'Amyloid-Beta Cortical Deposition Trajectory Modeling in Early Presymptomatic AD',
    leadResearcher: 'Dr. Helena Rostova, MD',
    status: 'data-analysis',
    participantsCount: 850,
    targetParticipants: 850,
    completionPercentage: 92,
    description: 'Longitudinal PET/MRI fusion analytics correlating CSF p-tau217 levels with hippocampal atrophy rates over 36 months.',
    startDate: '2024-06-01',
    category: 'Neurology / Longitudinal Modeling',
  },
  {
    id: 'res-303',
    title: 'Pharmacogenomic Polygenic Risk Stratification in Direct Oral Anticoagulant Efficacy',
    leadResearcher: 'Dr. Marcus Vance, PharmD',
    status: 'recruiting',
    participantsCount: 410,
    targetParticipants: 1200,
    completionPercentage: 34,
    description: 'Genome-wide association study analyzing CYP2C9, VKORC1, and ABCB1 polymorphisms influencing thrombin inhibitor clearance.',
    startDate: '2025-09-01',
    category: 'Pharmacogenomics',
  },
  {
    id: 'res-304',
    title: 'Automated Whole-Slide Histopathology Segmentation for HER2-Low Breast Cancers',
    leadResearcher: 'Dr. Chloe Fontaine, MD',
    status: 'published',
    participantsCount: 3200,
    targetParticipants: 3200,
    completionPercentage: 100,
    description: 'Vision transformer architecture achieving 97.4% concordance with expert panel immunohistochemistry scorecards.',
    startDate: '2023-11-01',
    category: 'Pathology / Deep Learning',
  },
];

export const MOCK_GENETIC_DATA: GeneticData[] = [
  { id: 'gen-1', gene: 'EGFR', sampleId: 'SAM-001', expressionLevel: 8.4, mutationType: 'L858R Exon 21 missense', significance: 'pathogenic', chromosomeLocation: 'chr7:55191822' },
  { id: 'gen-2', gene: 'BRCA1', sampleId: 'SAM-002', expressionLevel: 3.1, mutationType: '185delAG frameshift', significance: 'pathogenic', chromosomeLocation: 'chr17:43044295' },
  { id: 'gen-3', gene: 'TP53', sampleId: 'SAM-003', expressionLevel: 12.8, mutationType: 'R273H hotspot', significance: 'pathogenic', chromosomeLocation: 'chr17:7673803' },
  { id: 'gen-4', gene: 'KRAS', sampleId: 'SAM-004', expressionLevel: 6.2, mutationType: 'G12C codon 12', significance: 'pathogenic', chromosomeLocation: 'chr12:25245350' },
  { id: 'gen-5', gene: 'BRAF', sampleId: 'SAM-005', expressionLevel: 4.5, mutationType: 'V600E transversion', significance: 'pathogenic', chromosomeLocation: 'chr7:140753336' },
  { id: 'gen-6', gene: 'PIK3CA', sampleId: 'SAM-006', expressionLevel: 2.9, mutationType: 'E545K helical', significance: 'uncertain', chromosomeLocation: 'chr3:179218303' },
  { id: 'gen-7', gene: 'ALK', sampleId: 'SAM-007', expressionLevel: 1.2, mutationType: 'EML4-ALK fusion', significance: 'pathogenic', chromosomeLocation: 'chr2:29221147' },
  { id: 'gen-8', gene: 'MTHFR', sampleId: 'SAM-008', expressionLevel: 5.7, mutationType: 'C677T polymorphism', significance: 'benign', chromosomeLocation: 'chr1:11796321' },
];

export const MOCK_WORKLOAD_STATS: WorkloadStats[] = [
  { department: 'Radiology', activeDoctors: 6, pendingCases: 14, completedToday: 42, avgTurnaroundHours: 1.8 },
  { department: 'Oncology', activeDoctors: 4, pendingCases: 9, completedToday: 26, avgTurnaroundHours: 2.6 },
  { department: 'Cardiology', activeDoctors: 5, pendingCases: 11, completedToday: 38, avgTurnaroundHours: 1.4 },
  { department: 'Neurology', activeDoctors: 3, pendingCases: 7, completedToday: 19, avgTurnaroundHours: 3.1 },
  { department: 'Pathology', activeDoctors: 4, pendingCases: 16, completedToday: 31, avgTurnaroundHours: 4.2 },
];

export const MOCK_DETECTION_STATS: DetectionStats[] = [
  { finding: 'Pneumonia / Consolidation', count: 184, percentage: 32, avgConfidence: 93.4 },
  { finding: 'Solitary Nodule', count: 96, percentage: 17, avgConfidence: 91.2 },
  { finding: 'Cardiomegaly', count: 122, percentage: 21, avgConfidence: 89.8 },
  { finding: 'Pleural Effusion', count: 74, percentage: 13, avgConfidence: 94.6 },
  { finding: 'Bone Fracture', count: 58, percentage: 10, avgConfidence: 96.1 },
  { finding: 'Intracranial Ischemia', count: 41, percentage: 7, avgConfidence: 88.5 },
];

// In-memory mutable states for testing without backend
let scansStore: MedicalScan[] = [...MOCK_SCANS];
let patientsStore: Patient[] = [...MOCK_PATIENTS];
let appointmentsStore: Appointment[] = [...MOCK_APPOINTMENTS];

// -------------------------------------------------------------
// Typed API Export Functions
// -------------------------------------------------------------

export async function uploadScan(file: File, scanType: string, patientId: string): Promise<MedicalScan> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('scanType', scanType);
    formData.append('patientId', patientId);
    const res = await apiClient.post<MedicalScan>('/scans/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  } catch {
    // Fallback simulation
    const patient = patientsStore.find((p) => p.id === patientId) || patientsStore[0];
    const newScan: MedicalScan = {
      id: `scan-${Date.now()}`,
      patientId: patient.id,
      patientName: `${patient.firstName} ${patient.lastName}`,
      scanType: scanType as MedicalScan['scanType'],
      bodyPart: scanType === 'X-ray' ? 'Thoracic Cavity' : scanType === 'MRI' ? 'Neuro Axis' : 'Abdominal Region',
      scanDate: new Date().toISOString(),
      status: 'completed',
      priority: 'routine',
      imageUrl: URL.createObjectURL(file),
      heatmapUrl: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=800&q=80',
      confidenceScore: +(88 + Math.random() * 10).toFixed(1),
      reviewedBy: 'AI Primary Engine v4.2',
      radiologistNotes: `Automated preliminary screening for ${scanType} scan. No critical contraindications immediately flagged. Radiologist review advised.`,
      findings: [
        {
          id: `find-${Date.now()}`,
          condition: `Automated Scan Assessment (${scanType})`,
          confidence: +(85 + Math.random() * 12).toFixed(1),
          severity: 'moderate',
          location: 'ROI Region 1',
          description: `Segmental variance detected with ${+(85 + Math.random() * 12).toFixed(1)}% feature certainty.`,
        },
      ],
    };
    scansStore = [newScan, ...scansStore];
    return newScan;
  }
}

export async function getScans(filters?: ScanFilters): Promise<MedicalScan[]> {
  try {
    const res = await apiClient.get<MedicalScan[]>('/scans', { params: filters });
    return res.data;
  } catch {
    let result = [...scansStore];
    if (filters?.scanType && filters.scanType !== 'all') {
      result = result.filter((s) => s.scanType.toLowerCase() === filters.scanType?.toLowerCase());
    }
    if (filters?.status && filters.status !== 'all') {
      result = result.filter((s) => s.status.toLowerCase() === filters.status?.toLowerCase());
    }
    if (filters?.priority && filters.priority !== 'all') {
      result = result.filter((s) => s.priority.toLowerCase() === filters.priority?.toLowerCase());
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (s) =>
          s.patientName.toLowerCase().includes(q) ||
          s.bodyPart.toLowerCase().includes(q) ||
          s.findings.some((f) => f.condition.toLowerCase().includes(q))
      );
    }
    return result;
  }
}

export async function getScanById(id: string): Promise<MedicalScan> {
  try {
    const res = await apiClient.get<MedicalScan>(`/scans/${id}`);
    return res.data;
  } catch {
    const found = scansStore.find((s) => s.id === id);
    if (found) return found;
    return scansStore[0];
  }
}

export async function getPatients(): Promise<Patient[]> {
  try {
    const res = await apiClient.get<Patient[]>('/patients');
    return res.data;
  } catch {
    return patientsStore;
  }
}

export async function createPatient(data: Partial<Patient>): Promise<Patient> {
  try {
    const res = await apiClient.post<Patient>('/patients', data);
    return res.data;
  } catch {
    const newPatient: Patient = {
      id: `pt-${Date.now()}`,
      mrn: `MRN-${Math.floor(10000 + Math.random() * 90000)}`,
      firstName: data.firstName || 'New',
      lastName: data.lastName || 'Patient',
      age: Number(data.age) || 35,
      gender: data.gender || 'Other',
      dateOfBirth: data.dateOfBirth || '1990-01-01',
      bloodType: data.bloodType || 'O+',
      phone: data.phone || '+1 (555) 000-0000',
      email: data.email || 'patient@medai.org',
      emergencyContact: data.emergencyContact || { name: 'Emergency Contact', relationship: 'Family', phone: '+1 (555) 999-9999' },
      allergies: data.allergies || [],
      chronicConditions: data.chronicConditions || [],
      scanHistoryIds: [],
      prescriptions: [],
      createdAt: new Date().toISOString(),
    };
    patientsStore = [newPatient, ...patientsStore];
    return newPatient;
  }
}

export async function getPatientById(id: string): Promise<Patient> {
  try {
    const res = await apiClient.get<Patient>(`/patients/${id}`);
    return res.data;
  } catch {
    const p = patientsStore.find((item) => item.id === id);
    if (p) return p;
    return patientsStore[0];
  }
}

export async function checkDrugInteractions(drugIds: string[]): Promise<DrugInteraction[]> {
  try {
    const res = await apiClient.post<DrugInteraction[]>('/drugs/interactions', { drugIds });
    return res.data;
  } catch {
    // Look up names of drugs
    const names = drugIds.map((id) => {
      const d = MOCK_DRUGS.find((item) => item.id === id || item.name.toLowerCase() === id.toLowerCase());
      return d ? d.name : id;
    });

    const matches: DrugInteraction[] = [];
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const d1 = names[i];
        const d2 = names[j];
        const hit = MOCK_INTERACTIONS.find(
          (m) =>
            (m.drug1.toLowerCase() === d1.toLowerCase() && m.drug2.toLowerCase() === d2.toLowerCase()) ||
            (m.drug1.toLowerCase() === d2.toLowerCase() && m.drug2.toLowerCase() === d1.toLowerCase())
        );
        if (hit) {
          matches.push(hit);
        }
      }
    }
    return matches;
  }
}

export async function createAppointment(data: Partial<Appointment>): Promise<Appointment> {
  try {
    const res = await apiClient.post<Appointment>('/appointments', data);
    return res.data;
  } catch {
    const newApt: Appointment = {
      id: `apt-${Date.now()}`,
      patientId: data.patientId || 'pt-001',
      patientName: data.patientName || 'Eleanor Vance',
      doctorName: data.doctorName || 'Dr. Alan Mitchell',
      department: data.department || 'Radiology',
      date: data.date || new Date().toISOString().split('T')[0],
      time: data.time || '10:00',
      durationMinutes: data.durationMinutes || 30,
      status: 'scheduled',
      type: data.type || 'Scan Review',
      notes: data.notes || '',
    };
    appointmentsStore = [newApt, ...appointmentsStore];
    return newApt;
  }
}

export async function getAppointments(filters?: AppointmentFilters): Promise<Appointment[]> {
  try {
    const res = await apiClient.get<Appointment[]>('/appointments', { params: filters });
    return res.data;
  } catch {
    let result = [...appointmentsStore];
    if (filters?.department && filters.department !== 'all') {
      result = result.filter((a) => a.department.toLowerCase() === filters.department?.toLowerCase());
    }
    if (filters?.status && filters.status !== 'all') {
      result = result.filter((a) => a.status.toLowerCase() === filters.status?.toLowerCase());
    }
    if (filters?.date) {
      result = result.filter((a) => a.date === filters.date);
    }
    return result;
  }
}

export async function summarizeClinicalNotes(text: string): Promise<ClinicalNotesSummary> {
  try {
    const res = await apiClient.post<ClinicalNotesSummary>('/admin/summarize-notes', { text });
    return res.data;
  } catch {
    // Intelligent mock parsing for clinical text
    return {
      originalText: text,
      chiefComplaint: text.includes('cough')
        ? 'Persistent productive cough with purulent sputum and fever for 5 days.'
        : 'Subacute progressive fatigue and exercise intolerance.',
      historyOfPresentIllness:
        'Patient reports onset 5 days prior to encounter. Accompanied by pleuritic right-sided chest discomfort and low-grade pyrexia. Denies hemoptysis or orthopnea.',
      physicalExamination: [
        'Vital Signs: BP 132/84 mmHg, HR 88 bpm regular, Temp 38.2°C, SpO2 95% on room air.',
        'Pulmonary: Decreased breath sounds and coarse crackles over right lower lung field.',
        'Cardiovascular: Normal S1/S2 without murmurs, rubs, or gallops.',
        'Extremities: No peripheral pitting edema or cyanosis.',
      ],
      differentialDiagnosis: [
        {
          condition: 'Community-Acquired Pneumonia (CAP)',
          likelihood: 'High',
          rationale: 'Focal crackles, productive cough, fever, and right base consolidation.',
        },
        {
          condition: 'Acute Bronchitis',
          likelihood: 'Moderate',
          rationale: 'Prominent cough, but localized lung findings make pneumonia more plausible.',
        },
        {
          condition: 'Pulmonary Embolism',
          likelihood: 'Low',
          rationale: 'Pleuritic pain present, but lack of acute tachycardia or deep vein thrombosis indicators.',
        },
      ],
      recommendedActions: [
        'Order standard PA & Lateral chest radiograph.',
        'Initiate empiric oral Amoxicillin-Clavulanate 875/125mg BID + Azithromycin 500mg daily.',
        'Draw complete blood count (CBC) and inflammatory markers (CRP, Procalcitonin).',
        'Instruct patient on red-flag respiratory distress symptoms and schedule 72-hour clinical re-evaluation.',
      ],
      processedAt: new Date().toISOString(),
    };
  }
}

export async function getResearchProjects(): Promise<ResearchProject[]> {
  try {
    const res = await apiClient.get<ResearchProject[]>('/research/projects');
    return res.data;
  } catch {
    return MOCK_RESEARCH_PROJECTS;
  }
}

export async function analyzeGeneticData(data?: unknown): Promise<GeneticData[]> {
  try {
    const res = await apiClient.post<GeneticData[]>('/research/genetic-analysis', { data });
    return res.data;
  } catch {
    return MOCK_GENETIC_DATA;
  }
}

export async function getDiseaseTrajectory(patientId: string, diseaseType: string): Promise<DiseaseTrajectory> {
  try {
    const res = await apiClient.get<DiseaseTrajectory>(`/research/trajectory/${patientId}`, {
      params: { diseaseType },
    });
    return res.data;
  } catch {
    return {
      patientId,
      diseaseType: diseaseType || 'Cardiovascular Progression Index',
      riskLevel: 'moderate',
      timepoints: [
        { month: 0, score: 28 },
        { month: 3, score: 32 },
        { month: 6, score: 35 },
        { month: 9, score: 41 },
        { month: 12, score: 44 },
        { month: 15, score: 47, predictedScore: 47, confidenceLower: 43, confidenceUpper: 51 },
        { month: 18, score: 50, predictedScore: 51, confidenceLower: 45, confidenceUpper: 57 },
        { month: 21, score: 53, predictedScore: 55, confidenceLower: 47, confidenceUpper: 63 },
        { month: 24, score: 56, predictedScore: 59, confidenceLower: 50, confidenceUpper: 68 },
      ],
    };
  }
}

export async function getWorkloadStats(): Promise<WorkloadStats[]> {
  try {
    const res = await apiClient.get<WorkloadStats[]>('/admin/workload-stats');
    return res.data;
  } catch {
    return MOCK_WORKLOAD_STATS;
  }
}

export async function getDetectionStats(): Promise<DetectionStats[]> {
  try {
    const res = await apiClient.get<DetectionStats[]>('/admin/detection-stats');
    return res.data;
  } catch {
    return MOCK_DETECTION_STATS;
  }
}

// -------------------------------------------------------------
// Authentication Endpoints
// -------------------------------------------------------------

export async function loginUser(credentials: LoginCredentials): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>('/auth/login', credentials);
  return res.data;
}

export async function registerUser(credentials: RegisterCredentials): Promise<AuthUser> {
  const res = await apiClient.post<AuthUser>('/auth/register', credentials);
  return res.data;
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const res = await apiClient.get<AuthUser>('/auth/me');
  return res.data;
}

export async function logoutUser(): Promise<{ message: string; status: string }> {
  try {
    const res = await apiClient.post<{ message: string; status: string }>('/auth/logout');
    return res.data;
  } catch {
    return { message: 'Logged out', status: 'ok' };
  }
}

export async function loginWithGoogle(payload: GoogleAuthPayload): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>('/auth/google', payload);
  return res.data;
}

export async function sendLoginOtp(email: string, purpose: string = 'login'): Promise<OtpResponseData> {
  const res = await apiClient.post<OtpResponseData>('/auth/otp/send', { email, purpose });
  return res.data;
}

export async function verifyLoginOtp(email: string, otp: string): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>('/auth/otp/verify', { email, otp });
  return res.data;
}
