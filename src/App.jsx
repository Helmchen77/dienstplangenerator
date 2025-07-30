import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import EmployeeManagement from './pages/EmployeeManagement';
import ScheduleGeneration from './pages/ScheduleGeneration';
import ScheduleView from './pages/ScheduleView';
import Settings from './pages/Settings';
import { ScheduleProvider } from './context/ScheduleContext';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ScheduleProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
          <div className="flex">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <main className="flex-1 p-6 ml-0 lg:ml-64 transition-all duration-300 mt-20">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/employees" element={<EmployeeManagement />} />
                <Route path="/generate" element={<ScheduleGeneration />} />
                <Route path="/schedule" element={<ScheduleView />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </main>
          </div>
        </div>
      </Router>
    </ScheduleProvider>
  );
}

export default App;