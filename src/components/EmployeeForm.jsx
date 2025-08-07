import React, { useState, useEffect } from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { useSchedule } from '../context/ScheduleContext';
import WebhookService from '../utils/webhookService';
import '../styles/neumorphism.css';

const { FiX, FiSave, FiPlus, FiMinus, FiCheck } = FiIcons;

const SHIFT_TYPES = ['früh', 'zwischen', 'spät'];
const WEEKDAYS = [
  { id: 'monday', label: 'Mo', fullLabel: 'Montag' },
  { id: 'tuesday', label: 'Di', fullLabel: 'Dienstag' },
  { id: 'wednesday', label: 'Mi', fullLabel: 'Mittwoch' },
  { id: 'thursday', label: 'Do', fullLabel: 'Donnerstag' },
  { id: 'friday', label: 'Fr', fullLabel: 'Freitag' },
  { id: 'saturday', label: 'Sa', fullLabel: 'Samstag' },
  { id: 'sunday', label: 'So', fullLabel: 'Sonntag' }
];

function EmployeeForm({ employee, onSubmit, onCancel }) {
  const { state } = useSchedule();
  const [formData, setFormData] = useState({
    name: '',
    workload: 100,
    skills: ['früh', 'zwischen', 'spät'],
    preferences: [],
    maxConsecutiveDays: 4,
    sickLeave: { from: '', to: '' },
    availableDays: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: true,
      sunday: true
    }
  });

  useEffect(() => {
    if (employee) {
      // Make sure all required properties exist
      const availableDays = employee.availableDays || {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: true,
        sunday: true
      };
      
      const sickLeave = employee.sickLeave || { from: '', to: '' };
      
      setFormData({
        ...employee,
        maxConsecutiveDays: employee.maxConsecutiveDays || 4,
        sickLeave,
        availableDays
      });
    }
  }, [employee]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Bitte geben Sie einen Namen ein');
      return;
    }
    if (formData.skills.length === 0) {
      alert('Bitte wählen Sie mindestens eine Qualifikation aus');
      return;
    }
    
    // Submit the form data
    onSubmit(formData);
    
    // Trigger employee webhook
    try {
      await WebhookService.triggerWebhook('employees', formData);
    } catch (error) {
      console.error('Webhook error:', error);
    }
  };

  const handleSkillToggle = (skill) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }));
  };

  const handleAvailableDayToggle = (day) => {
    setFormData(prev => ({
      ...prev,
      availableDays: {
        ...prev.availableDays,
        [day]: !prev.availableDays[day]
      }
    }));
  };

  const handleSickLeaveChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      sickLeave: {
        ...prev.sickLeave,
        [field]: value
      }
    }));
  };

  const addPreference = () => {
    const today = new Date();
    const newPreference = {
      id: Date.now(),
      date: today.toISOString().split('T')[0],
      type: 'frei',
      reason: ''
    };
    setFormData(prev => ({
      ...prev,
      preferences: [...prev.preferences, newPreference]
    }));
  };

  const removePreference = (id) => {
    setFormData(prev => ({
      ...prev,
      preferences: prev.preferences.filter(p => p.id !== id)
    }));
  };

  const updatePreference = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      preferences: prev.preferences.map(p =>
        p.id === id ? { ...p, [field]: value } : p
      )
    }));
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="neu-card bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {employee ? 'Mitarbeiter bearbeiten' : 'Neuen Mitarbeiter hinzufügen'}
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-2 rounded-full neu-button">
            <SafeIcon icon={FiX} className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="neu-input w-full"
              placeholder="Vor- und Nachname"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Arbeitspensum (%)
            </label>
            <input
              type="number"
              min="10"
              max="100"
              step="10"
              value={formData.workload}
              onChange={(e) => setFormData(prev => ({ ...prev, workload: parseInt(e.target.value) }))}
              className="neu-input w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max. aufeinanderfolgende Arbeitstage
            </label>
            <input
              type="number"
              min="1"
              max="7"
              value={formData.maxConsecutiveDays}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                maxConsecutiveDays: parseInt(e.target.value) 
              }))}
              className="neu-input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Krankheit
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Von</label>
                <input
                  type="date"
                  value={formData.sickLeave.from}
                  onChange={(e) => handleSickLeaveChange('from', e.target.value)}
                  className="neu-input w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Bis</label>
                <input
                  type="date"
                  value={formData.sickLeave.to}
                  onChange={(e) => handleSickLeaveChange('to', e.target.value)}
                  className="neu-input w-full"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Verfügbarkeit an Wochentagen
            </label>
            <div className="grid grid-cols-7 gap-2">
              {WEEKDAYS.map((day) => (
                <div 
                  key={day.id}
                  onClick={() => handleAvailableDayToggle(day.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-all flex flex-col items-center
                    ${formData.availableDays[day.id] ? 'neu-element-inset bg-orange-50' : 'neu-element'}`}
                  title={day.fullLabel}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1
                    ${formData.availableDays[day.id] ? 'bg-orange-500' : 'bg-gray-200'}`}>
                    {formData.availableDays[day.id] && 
                      <SafeIcon icon={FiCheck} className="w-4 h-4 text-white" />
                    }
                  </div>
                  <span className="text-sm font-medium">{day.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Qualifikationen *
            </label>
            <div className="flex flex-wrap gap-2">
              {SHIFT_TYPES.map((shift) => (
                <button
                  key={shift}
                  type="button"
                  onClick={() => handleSkillToggle(shift)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
                    ${formData.skills.includes(shift)
                      ? 'neu-element-inset bg-orange-50 text-orange-700'
                      : 'neu-element text-gray-600'
                    }`}
                >
                  {shift.charAt(0).toUpperCase() + shift.slice(1)}dienst
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Freiwünsche
              </label>
              <button
                type="button"
                onClick={addPreference}
                className="flex items-center px-3 py-2 text-sm neu-button text-orange-600"
              >
                <SafeIcon icon={FiPlus} className="w-4 h-4 mr-1" />
                Hinzufügen
              </button>
            </div>
            
            {formData.preferences.length === 0 ? (
              <p className="text-sm text-gray-500 italic">Keine Freiwünsche</p>
            ) : (
              <div className="space-y-3">
                {formData.preferences.map((preference) => (
                  <div key={preference.id} className="flex items-center space-x-3 p-3 neu-element-inset">
                    <input
                      type="date"
                      value={preference.date}
                      onChange={(e) => updatePreference(preference.id, 'date', e.target.value)}
                      className="neu-input text-sm"
                    />
                    <select
                      value={preference.type}
                      onChange={(e) => updatePreference(preference.id, 'type', e.target.value)}
                      className="neu-input text-sm"
                    >
                      <option value="frei">Frei</option>
                      <option value="früh">Frühdienst</option>
                      <option value="zwischen">Zwischendienst</option>
                      <option value="spät">Spätdienst</option>
                    </select>
                    <input
                      type="text"
                      value={preference.reason}
                      onChange={(e) => updatePreference(preference.id, 'reason', e.target.value)}
                      placeholder="Grund (optional)"
                      className="flex-1 neu-input text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removePreference(preference.id)}
                      className="text-red-600 hover:text-red-700 p-2 neu-button"
                    >
                      <SafeIcon icon={FiMinus} className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 neu-button text-gray-700"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="flex items-center px-4 py-2 neu-button bg-orange-50 text-orange-700"
            >
              <SafeIcon icon={FiSave} className="w-4 h-4 mr-2" />
              {employee ? 'Speichern' : 'Hinzufügen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EmployeeForm;