import React, { createContext, useContext, useReducer, useEffect } from 'react';

const ScheduleContext = createContext();

const initialState = {
  employees: [
    {
      id: 1,
      name: 'Anna Müller',
      workload: 100,
      preferences: [],
      skills: ['früh', 'zwischen', 'spät']
    },
    {
      id: 2,
      name: 'Thomas Schmidt',
      workload: 80,
      preferences: [],
      skills: ['früh', 'zwischen', 'spät']
    },
    {
      id: 3,
      name: 'Lisa Weber',
      workload: 60,
      preferences: [],
      skills: ['zwischen', 'spät']
    }
  ],
  schedules: [],
  currentSchedule: null,
  settings: {
    shifts: {
      früh: { start: '06:00', end: '14:00', hours: 8, minutes: 0 },
      zwischen: { start: '14:00', end: '22:00', hours: 8, minutes: 0 },
      spät: { start: '22:00', end: '06:00', hours: 8, minutes: 0 }
    },
    minStaffing: {
      weekday: { früh: 2, zwischen: 3, spät: 2 },
      weekend: { früh: 1, zwischen: 2, spät: 1 }
    },
    rules: {
      maxConsecutiveDays: 4,
      minRestHours: 11,
      noEarlyAfterLate: true,
      maxHoursPerDay: 12,
      maxHoursPerWeek: 48,
      hoursTolerance: 8
    }
  }
};

function scheduleReducer(state, action) {
  switch (action.type) {
    case 'ADD_EMPLOYEE':
      return {
        ...state,
        employees: [...state.employees, { ...action.payload, id: Date.now() }]
      };
    case 'UPDATE_EMPLOYEE':
      return {
        ...state,
        employees: state.employees.map(emp => 
          emp.id === action.payload.id ? { ...emp, ...action.payload } : emp
        )
      };
    case 'DELETE_EMPLOYEE':
      return {
        ...state,
        employees: state.employees.filter(emp => emp.id !== action.payload)
      };
    case 'SET_CURRENT_SCHEDULE':
      return {
        ...state,
        currentSchedule: action.payload
      };
    case 'ADD_SCHEDULE':
      return {
        ...state,
        schedules: [...state.schedules, action.payload],
        currentSchedule: action.payload
      };
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload }
      };
    default:
      return state;
  }
}

export function ScheduleProvider({ children }) {
  const [state, dispatch] = useReducer(scheduleReducer, initialState);

  useEffect(() => {
    const savedData = localStorage.getItem('dienstplan-data');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        Object.keys(parsedData).forEach(key => {
          if (key === 'employees') {
            parsedData.employees.forEach(emp => {
              dispatch({ type: 'UPDATE_EMPLOYEE', payload: emp });
            });
          }
          if (key === 'settings') {
            dispatch({ type: 'UPDATE_SETTINGS', payload: parsedData.settings });
          }
        });
      } catch (error) {
        console.error('Fehler beim Laden der Daten:', error);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('dienstplan-data', JSON.stringify(state));
  }, [state]);

  return (
    <ScheduleContext.Provider value={{ state, dispatch }}>
      {children}
    </ScheduleContext.Provider>
  );
}

export function useSchedule() {
  const context = useContext(ScheduleContext);
  if (!context) {
    throw new Error('useSchedule must be used within a ScheduleProvider');
  }
  return context;
}