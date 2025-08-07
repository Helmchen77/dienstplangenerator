import React, { useState } from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { useSchedule } from '../context/ScheduleContext';
import { generateSchedule } from '../utils/scheduleGenerator';
import ScheduleNotification from '../components/ScheduleNotification';
import '../styles/neumorphism.css';

const { FiCalendar, FiPlay, FiAlertTriangle, FiCheck } = FiIcons;

function ScheduleGeneration() {
  const { state, dispatch } = useSchedule();
  const { employees } = state;
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [errors, setErrors] = useState([]);
  const [showNotification, setShowNotification] = useState(false);
  const [generationResult, setGenerationResult] = useState(null);

  const handleGenerate = async () => {
    if (employees.length === 0) {
      setErrors(['Mindestens ein Mitarbeiter muss hinzugefügt werden']);
      return;
    }
    
    setIsGenerating(true);
    setErrors([]);
    
    try {
      const result = await generateSchedule(employees, selectedMonth, state.settings);
      
      if (result.errors.length > 0) {
        setErrors(result.errors);
      }
      
      if (result.schedule) {
        const newSchedule = {
          id: Date.now(),
          month: selectedMonth,
          schedule: result.schedule,
          violations: result.violations,
          employeeHours: result.employeeHours,
          employeeStats: result.employeeStats,
          targetHours: result.targetHours,
          createdAt: new Date().toISOString()
        };
        
        // Check if we have a webhook response to use
        if (result.webhookResponse) {
          dispatch({ 
            type: 'IMPORT_SCHEDULE_FROM_WEBHOOK', 
            payload: result.webhookResponse 
          });
        } else {
          dispatch({ 
            type: 'ADD_SCHEDULE', 
            payload: newSchedule 
          });
        }
        
        setGenerationResult({
          success: result.violations.length === 0,
          violations: result.violations.length
        });
        setShowNotification(true);
      }
    } catch (error) {
      setErrors(['Fehler bei der Erstellung des Dienstplans: ' + error.message]);
    } finally {
      setIsGenerating(false);
    }
  };

  const canGenerate = employees.length > 0 && !isGenerating;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dienstplan erstellen</h1>
        <p className="mt-2 text-gray-600">Automatische Generierung des monatlichen Dienstplans</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 neu-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Einstellungen</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monat auswählen
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="neu-input w-full"
              />
            </div>

            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className={`w-full flex items-center justify-center px-4 py-3 rounded-lg font-medium transition-colors ${
                  canGenerate
                    ? 'neu-button bg-orange-50 text-orange-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-700 mr-2"></div>
                    Erstelle Plan...
                  </>
                ) : (
                  <>
                    <SafeIcon icon={FiPlay} className="w-5 h-5 mr-2" />
                    Plan erstellen
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 neu-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Voraussetzungen</h3>
          <div className="space-y-3">
            <div className="flex items-center p-3 neu-element rounded-lg">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                employees.length > 0 ? 'neu-element bg-green-50' : 'neu-element bg-yellow-50'
              }`}>
                <SafeIcon
                  icon={employees.length > 0 ? FiCheck : FiAlertTriangle}
                  className={`w-5 h-5 ${
                    employees.length > 0 ? 'text-green-600' : 'text-yellow-600'
                  }`}
                />
              </div>
              <span
                className={`text-sm ${
                  employees.length > 0 ? 'text-green-700' : 'text-yellow-700'
                }`}
              >
                Mitarbeiter hinzugefügt ({employees.length})
              </span>
            </div>

            <div className="flex items-center p-3 neu-element rounded-lg">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                employees.some((emp) => emp.skills.length > 0) ? 'neu-element bg-green-50' : 'neu-element bg-yellow-50'
              }`}>
                <SafeIcon
                  icon={employees.some((emp) => emp.skills.length > 0) ? FiCheck : FiAlertTriangle}
                  className={`w-5 h-5 ${
                    employees.some((emp) => emp.skills.length > 0)
                      ? 'text-green-600'
                      : 'text-yellow-600'
                  }`}
                />
              </div>
              <span
                className={`text-sm ${
                  employees.some((emp) => emp.skills.length > 0)
                    ? 'text-green-700'
                    : 'text-yellow-700'
                }`}
              >
                Qualifikationen definiert
              </span>
            </div>

            <div className="flex items-center p-3 neu-element rounded-lg">
              <div className="w-8 h-8 rounded-full flex items-center justify-center mr-3 neu-element bg-green-50">
                <SafeIcon icon={FiCheck} className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-sm text-green-700">Schichtzeiten konfiguriert</span>
            </div>
          </div>

          {errors.length > 0 && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg neu-element">
              <h4 className="text-sm font-medium text-red-800 mb-2">Fehler:</h4>
              <ul className="text-sm text-red-700 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 neu-card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Regeln & Einschränkungen</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Schichtregeln</h4>
            <ul className="text-sm text-gray-600 space-y-1 p-3 neu-element-inset rounded-lg">
              <li>• Wochenenden werden zuerst geplant (Sa+So zusammen)</li>
              <li>• Kein Mitarbeiter mehrmals pro Tag eingeplant</li>
              <li>• Individuelle maximale Arbeitstage pro Mitarbeiter</li>
              <li>• Keine Frühdienst nach Spätdienst</li>
              <li>• Freiwünsche werden berücksichtigt</li>
              <li>• Arbeitspensum wird berücksichtigt</li>
              <li>• Mindestens {state.settings.rules.minDaysOffBetweenBlocks} freie Tage zwischen Dienstblöcken</li>
              <li>• Faire Verteilung der Dienste</li>
              <li>• Feiertage und Krankheiten werden berücksichtigt</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">Schichtzeiten</h4>
            <ul className="text-sm text-gray-600 space-y-1 p-3 neu-element-inset rounded-lg">
              <li>• Frühdienst: {state.settings.shifts.früh.start} - {state.settings.shifts.früh.end} 
                  ({state.settings.shifts.früh.hours}h {state.settings.shifts.früh.minutes}min)</li>
              <li>• Zwischendienst: {state.settings.shifts.zwischen.start} - {state.settings.shifts.zwischen.end}
                  ({state.settings.shifts.zwischen.hours}h {state.settings.shifts.zwischen.minutes}min)</li>
              <li>• Spätdienst: {state.settings.shifts.spät.start} - {state.settings.shifts.spät.end}
                  ({state.settings.shifts.spät.hours}h {state.settings.shifts.spät.minutes}min)</li>
            </ul>
          </div>
        </div>
      </div>

      {showNotification && generationResult && (
        <ScheduleNotification 
          success={generationResult.success}
          violations={generationResult.violations}
          onClose={() => setShowNotification(false)}
        />
      )}
    </div>
  );
}

export default ScheduleGeneration;