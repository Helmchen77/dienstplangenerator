import React,{useState,useEffect} from 'react';
import {HashRouter as Router,Routes,Route} from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';
import Dashboard from './pages/Dashboard';
import EmployeeManagement from './pages/EmployeeManagement';
import ScheduleGeneration from './pages/ScheduleGeneration';
import ScheduleView from './pages/ScheduleView';
import Settings from './pages/Settings';
import {ScheduleProvider} from './context/ScheduleContext';
import './styles/neumorphism.css';

function App() {
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const [theme,setTheme]=useState('light');

  useEffect(()=> {
    // Apply neumorphic design theme to body
    document.body.className=theme==='light' ? 'bg-gray-50' : 'bg-gray-800';
  },[theme]);

  return (
    <ScheduleProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <Header onMenuClick={()=> setSidebarOpen(!sidebarOpen)} />
          <div className="flex flex-1">
            <Sidebar isOpen={sidebarOpen} onClose={()=> setSidebarOpen(false)} />
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
          <Footer />
        </div>
      </Router>
    </ScheduleProvider>
  );
}

export default App;