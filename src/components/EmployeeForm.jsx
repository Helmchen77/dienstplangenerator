import React, { useState, useEffect } from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiX, FiSave, FiPlus, FiMinus } = FiIcons;

const SHIFT_TYPES = ['früh', 'zwischen', 'spät'];

function EmployeeForm({ employee, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    workload: 100,
    skills: ['früh', 'zwischen', 'spät'],
    preferences: []
  });

  useEffect(() => {
    if (employee) {
      setFormData({
        ...employee
      });
    }
  }, [employee]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Bitte geben Sie einen Namen ein');
      return;
    }
    if (formData.skills.length === 0) {
      alert('Bitte wählen Sie mindestens eine Qualifikation aus');
      return;
    }
    onSubmit(formData);
  };

  const handleSkillToggle = (skill) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
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
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {employee ? 'Mitarbeiter bearbeiten' : 'Neuen Mitarbeiter hinzufügen'}
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <SafeIcon icon={FiX} className="w-6 h-6" />
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
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
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    formData.skills.includes(shift)
                      ? 'bg-primary-100 text-primary-700 border-primary-200'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
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
                className="flex items-center px-3 py-1 text-sm text-primary-600 hover:text-primary-700"
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
                  <div key={preference.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <input
                      type="date"
                      value={preference.date}
                      onChange={(e) => updatePreference(preference.id, 'date', e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <select
                      value={preference.type}
                      onChange={(e) => updatePreference(preference.id, 'type', e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
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
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removePreference(preference.id)}
                      className="text-red-600 hover:text-red-700"
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
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
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