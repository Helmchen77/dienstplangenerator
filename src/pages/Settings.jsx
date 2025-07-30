import React, { useState } from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { useSchedule } from '../context/ScheduleContext';

const { FiSave, FiClock, FiUsers, FiSettings } = FiIcons;

function Settings() {
  const { state, dispatch } = useSchedule();
  const [settings, setSettings] = useState(state.settings);

  const handleSave = () => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
    alert('Einstellungen gespeichert!');
  };

  const updateShift = (shiftType, field, value) => {
    setSettings(prev => ({
      ...prev,
      shifts: {
        ...prev.shifts,
        [shiftType]: {
          ...prev.shifts[shiftType],
          [field]: field === 'hours' || field === 'minutes' ? parseInt(value) || 0 : value
        }
      }
    }));
  };

  const updateMinStaffing = (dayType, shift, value) => {
    setSettings(prev => ({
      ...prev,
      minStaffing: {
        ...prev.minStaffing,
        [dayType]: {
          ...prev.minStaffing[dayType],
          [shift]: parseInt(value) || 0
        }
      }
    }));
  };

  const updateRule = (rule, value) => {
    setSettings(prev => ({
      ...prev,
      rules: {
        ...prev.rules,
        [rule]: typeof prev.rules[rule] === 'boolean' ? value : parseInt(value) || 0
      }
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Einstellungen</h1>
        <p className="mt-2 text-gray-600">Konfiguration der Schichtzeiten und Besetzungsregeln</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <SafeIcon icon={FiClock} className="w-6 h-6 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Schichtzeiten</h3>
          </div>
          
          <div className="space-y-4">
            {Object.entries(settings.shifts).map(([shiftType, shift]) => (
              <div key={shiftType} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3 capitalize">
                  {shiftType}dienst
                </h4>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Beginn
                    </label>
                    <input
                      type="time"
                      value={shift.start}
                      onChange={(e) => updateShift(shiftType, 'start', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Ende
                    </label>
                    <input
                      type="time"
                      value={shift.end}
                      onChange={(e) => updateShift(shiftType, 'end', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Stunden
                    </label>
                    <input
                      type="number"
                      value={shift.hours}
                      onChange={(e) => updateShift(shiftType, 'hours', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      min="0"
                      max="24"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Minuten
                    </label>
                    <input
                      type="number"
                      value={shift.minutes}
                      onChange={(e) => updateShift(shiftType, 'minutes', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      min="0"
                      max="59"
                    />
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Gesamtdauer: {shift.hours}h {shift.minutes}min
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <SafeIcon icon={FiUsers} className="w-6 h-6 text-green-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Mindestbesetzung</h3>
          </div>
          
          <div className="space-y-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Werktage</h4>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(settings.minStaffing.weekday).map(([shift, count]) => (
                  <div key={shift}>
                    <label className="block text-xs font-medium text-gray-700 mb-1 capitalize">
                      {shift}
                    </label>
                    <input
                      type="number"
                      value={count}
                      onChange={(e) => updateMinStaffing('weekday', shift, e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      min="0"
                      max="10"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Wochenende</h4>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(settings.minStaffing.weekend).map(([shift, count]) => (
                  <div key={shift}>
                    <label className="block text-xs font-medium text-gray-700 mb-1 capitalize">
                      {shift}
                    </label>
                    <input
                      type="number"
                      value={count}
                      onChange={(e) => updateMinStaffing('weekend', shift, e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      min="0"
                      max="10"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <SafeIcon icon={FiSettings} className="w-6 h-6 text-purple-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Planungsregeln (bearbeitbar)</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max. aufeinanderfolgende Arbeitstage
              </label>
              <input
                type="number"
                value={settings.rules.maxConsecutiveDays}
                onChange={(e) => updateRule('maxConsecutiveDays', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                min="1"
                max="7"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min. Ruhezeit (Stunden)
              </label>
              <input
                type="number"
                value={settings.rules.minRestHours}
                onChange={(e) => updateRule('minRestHours', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                min="8"
                max="24"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max. Arbeitszeit pro Tag (Stunden)
              </label>
              <input
                type="number"
                value={settings.rules.maxHoursPerDay}
                onChange={(e) => updateRule('maxHoursPerDay', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                min="4"
                max="24"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max. Arbeitszeit pro Woche (Stunden)
              </label>
              <input
                type="number"
                value={settings.rules.maxHoursPerWeek}
                onChange={(e) => updateRule('maxHoursPerWeek', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                min="10"
                max="60"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stunden-Toleranz (±Stunden)
              </label>
              <input
                type="number"
                value={settings.rules.hoursTolerance}
                onChange={(e) => updateRule('hoursTolerance', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                min="0"
                max="20"
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="noEarlyAfterLate"
                checked={settings.rules.noEarlyAfterLate}
                onChange={(e) => updateRule('noEarlyAfterLate', e.target.checked)}
                className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="noEarlyAfterLate" className="ml-2 text-sm text-gray-700">
                Kein Frühdienst nach Spätdienst
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <SafeIcon icon={FiSave} className="w-5 h-5 mr-2" />
          Einstellungen speichern
        </button>
      </div>
    </div>
  );
}

export default Settings;