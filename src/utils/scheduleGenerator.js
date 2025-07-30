import { getDaysInMonth, isWeekend, format, addDays, differenceInHours, getWeekdaysInMonth } from 'date-fns';

const SHIFTS = ['früh', 'zwischen', 'spät'];

// Hilfsfunktion zur Berechnung der Arbeitstage im Monat (ohne Wochenenden)
function getWorkingDaysInMonth(year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  let workingDays = 0;
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Nicht Samstag und nicht Sonntag
      workingDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return workingDays;
}

export async function generateSchedule(employees, monthStr, settings) {
  const [year, month] = monthStr.split('-').map(Number);
  const daysInMonth = getDaysInMonth(new Date(year, month - 1));
  const workingDaysInMonth = getWorkingDaysInMonth(year, month);
  
  const violations = [];
  const schedule = {};
  const employeeHours = {};
  const employeeStats = {};
  const employeeConsecutiveDays = {};
  
  // Initialize tracking
  employees.forEach(emp => {
    employeeHours[emp.id] = 0;
    employeeStats[emp.id] = { früh: 0, zwischen: 0, spät: 0, totalDays: 0 };
    employeeConsecutiveDays[emp.id] = 0;
  });
  
  // Berechne die Schichtlänge in Stunden
  const shiftDurationHours = settings.shifts.früh.hours + (settings.shifts.früh.minutes / 60);
  
  // Calculate target hours for each employee
  const targetHours = {};
  employees.forEach(emp => {
    // Berechnung des Pensums: Arbeitstage * Arbeitszeit pro Tag * Pensum%
    const monthlyHours = workingDaysInMonth * shiftDurationHours * (emp.workload / 100);
    targetHours[emp.id] = monthlyHours;
  });

  // Generate schedule for each day
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dateStr = format(date, 'yyyy-MM-dd');
    const isWeekendDay = isWeekend(date);
    
    schedule[dateStr] = {};
    
    // Get minimum staffing requirements
    const minStaffing = isWeekendDay ? settings.minStaffing.weekend : settings.minStaffing.weekday;
    
    // Track who is already assigned today
    const assignedToday = new Set();
    
    // Assign shifts for this day
    for (const shift of SHIFTS) {
      const requiredStaff = minStaffing[shift];
      const availableEmployees = getAvailableEmployees(
        employees, dateStr, shift, schedule, assignedToday, employeeConsecutiveDays, settings
      );
      
      // Sort by priority
      const sortedEmployees = prioritizeEmployees(
        availableEmployees, employeeHours, targetHours, dateStr, shift
      );
      
      const assignedEmployees = [];
      
      for (let i = 0; i < requiredStaff && i < sortedEmployees.length; i++) {
        const employee = sortedEmployees[i];
        
        // Check if assignment violates rules
        if (!violatesRules(employee, dateStr, shift, schedule, assignedToday, employeeConsecutiveDays, settings)) {
          assignedEmployees.push(employee.id);
          assignedToday.add(employee.id);
          
          // Update hours and stats
          const shiftDuration = getShiftDuration(shift, settings);
          employeeHours[employee.id] += shiftDuration;
          employeeStats[employee.id][shift]++;
          employeeStats[employee.id].totalDays++;
          employeeConsecutiveDays[employee.id]++;
        }
      }
      
      schedule[dateStr][shift] = assignedEmployees;
      
      // Check if minimum staffing is met
      if (assignedEmployees.length < requiredStaff) {
        violations.push({
          type: 'understaffed',
          date: dateStr,
          shift: shift,
          required: requiredStaff,
          assigned: assignedEmployees.length
        });
      }
    }
    
    // Reset consecutive days for employees not working today
    employees.forEach(emp => {
      if (!assignedToday.has(emp.id)) {
        employeeConsecutiveDays[emp.id] = 0;
      }
    });
  }
  
  // Check if employees meet their target hours
  employees.forEach(emp => {
    const actualHours = employeeHours[emp.id];
    const targetHoursForEmp = targetHours[emp.id];
    const difference = Math.abs(actualHours - targetHoursForEmp);
    
    if (difference > settings.rules.hoursTolerance) {
      violations.push({
        type: 'hours_mismatch',
        employeeId: emp.id,
        employeeName: emp.name,
        target: targetHoursForEmp,
        actual: actualHours,
        difference: difference
      });
    }
  });

  return {
    schedule,
    violations,
    employeeHours,
    employeeStats,
    targetHours,
    errors: []
  };
}

function getShiftDuration(shift, settings) {
  const shiftConfig = settings.shifts[shift];
  return shiftConfig.hours + (shiftConfig.minutes / 60);
}

function getAvailableEmployees(employees, date, shift, schedule, assignedToday, employeeConsecutiveDays, settings) {
  return employees.filter(emp => {
    // Check if already assigned today
    if (assignedToday.has(emp.id)) return false;
    
    // Check if employee has the required skill
    if (!emp.skills.includes(shift)) return false;
    
    // Check consecutive days limit
    if (employeeConsecutiveDays[emp.id] >= settings.rules.maxConsecutiveDays) return false;
    
    // Check preferences
    const preference = emp.preferences.find(p => p.date === date);
    if (preference) {
      if (preference.type === 'frei') return false;
      if (preference.type !== shift) return false;
    }
    
    return true;
  });
}

function prioritizeEmployees(employees, employeeHours, targetHours, date, shift) {
  return employees.sort((a, b) => {
    // Prioritize employees based on how far they are from meeting their target hours
    // We calculate a percentage of completion rather than absolute difference
    // This ensures employees with lower workload percentages are treated fairly
    const aCompletionPercent = employeeHours[a.id] / targetHours[a.id];
    const bCompletionPercent = employeeHours[b.id] / targetHours[b.id];
    
    // Lower completion percentage gets higher priority
    if (aCompletionPercent !== bCompletionPercent) {
      return aCompletionPercent - bCompletionPercent;
    }
    
    // If completion percentages are similar, prioritize by preferences
    const aPreference = a.preferences.find(p => p.date === date && p.type === shift);
    const bPreference = b.preferences.find(p => p.date === date && p.type === shift);
    
    if (aPreference && !bPreference) return -1;
    if (!aPreference && bPreference) return 1;
    
    // Finally, prioritize by workload percentage (higher workload gets priority)
    return b.workload - a.workload;
  });
}

function violatesRules(employee, date, shift, schedule, assignedToday, employeeConsecutiveDays, settings) {
  // Check if already assigned today
  if (assignedToday.has(employee.id)) return true;
  
  // Check consecutive days
  if (employeeConsecutiveDays[employee.id] >= settings.rules.maxConsecutiveDays) return true;
  
  const currentDate = new Date(date);
  const previousDate = new Date(currentDate);
  previousDate.setDate(previousDate.getDate() - 1);
  
  const prevDateStr = format(previousDate, 'yyyy-MM-dd');
  const prevDaySchedule = schedule[prevDateStr];
  
  // Check if employee worked late shift previous day and is assigned early shift today
  if (settings.rules.noEarlyAfterLate && shift === 'früh' && prevDaySchedule && prevDaySchedule.spät) {
    if (prevDaySchedule.spät.includes(employee.id)) {
      return true; // Violates early-after-late rule
    }
  }
  
  return false;
}