import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { ScanUpload } from './pages/ScanUpload';
import { ScanResults } from './pages/ScanResults';
import { PatientRecords } from './pages/PatientRecords';
import { AdminPanel } from './pages/AdminPanel';
import { DrugChecker } from './pages/DrugChecker';
import { Scheduling } from './pages/Scheduling';
import { ResearchExplorer } from './pages/ResearchExplorer';
import { Login } from './pages/Login';

export const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="scan-upload" element={<ScanUpload />} />
        <Route path="scan-results" element={<ScanResults />} />
        <Route path="patients" element={<PatientRecords />} />
        <Route path="admin" element={<AdminPanel />} />
        <Route path="drug-checker" element={<DrugChecker />} />
        <Route path="scheduling" element={<Scheduling />} />
        <Route path="research" element={<ResearchExplorer />} />
        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

export default App;
