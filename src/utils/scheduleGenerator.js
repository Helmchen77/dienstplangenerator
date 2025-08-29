import { getDaysInMonth, isWeekend, format, addDays, parseISO, getDay } from 'date-fns';
import WebhookService from './webhookService';

const SHIFTS = ['früh', 'zwischen', 'spät'];
const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// Helper function to calculate working days in a month (excluding weekends)
function getWorkingDaysInMonth(year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  let workingDays = 0;
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Saturday and not Sunday
      workingDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return workingDays;
}

// Check if employee is available on a specific day of the week
function isEmployeeAvailableOnDay(employee, date) {
  const dayOfWeek = getDay(date); // 0=Sunday, 1=Monday, etc.
  const dayName = DAYS_OF_WEEK[dayOfWeek];
  return employee.availableDays[dayName];
}

// Check if the date is within employee's sick leave period
function isEmployeeOnSickLeave(employee, date) {
  if (!employee.sickLeave || !employee.sickLeave.from || !employee.sickLeave.to) {
    return false;
  }
  
  const dateStr = format(date, 'yyyy-MM-dd');
  const fromDate = employee.sickLeave.from;
  const toDate = employee.sickLeave.to;
  
  return dateStr >= fromDate && dateStr <= toDate;
}

// Check if the date is within employee's vacation period
function isEmployeeOnVacation(employee, date) {
  if (!employee.vacation || !employee.vacation.from || !employee.vacation.to) {
    return false;
  }
  
  const dateStr = format(date, 'yyyy-MM-dd');
  const fromDate = employee.vacation.from;
  const toDate = employee.vacation.to;
  
  return dateStr >= fromDate && dateStr <= toDate;
}

// Check if the date is a holiday
function isHoliday(date, holidays) {
  if (!holidays || !holidays.length) return false;
  const dateStr = format(date, 'yyyy-MM-dd');
  return holidays.some(holiday => holiday.date === dateStr);
}

// Calculate the number of consecutive working days for an employee
function calculateConsecutiveDays(schedule, employeeId, currentDate) {
  const dateObj = typeof currentDate === 'string' ? parseISO(currentDate) : currentDate;
  let consecutiveDays = 0;
  let checkDate = addDays(dateObj, -1);
  
  // Look back through schedule to count consecutive working days
  while (checkDate >= parseISO(Object.keys(schedule).sort()[0])) {
    const checkDateStr = format(checkDate, 'yyyy-MM-dd');
    const daySchedule = schedule[checkDateStr];
    
    if (!daySchedule) break;
    
    const isWorking = SHIFTS.some(
      shift => daySchedule[shift] && daySchedule[shift].includes(employeeId)
    );
    
    if (!isWorking) break; // Break the streak if employee wasn't working
    
    consecutiveDays++;
    checkDate = addDays(checkDate, -1);
  }
  
  return consecutiveDays;
}

// Calculate the number of consecutive free days between shifts
function calculateDaysOffBetweenBlocks(schedule, employeeId, currentDate) {
  const dateObj = typeof currentDate === 'string' ? parseISO(currentDate) : currentDate;
  let daysOff = 0;
  let checkDate = addDays(dateObj, -1);
  
  while (checkDate >= parseISO(Object.keys(schedule).sort()[0])) {
    const checkDateStr = format(checkDate, 'yyyy-MM-dd');
    const daySchedule = schedule[checkDateStr];
    
    if (!daySchedule) break;
    
    const isWorking = SHIFTS.some(
      shift => daySchedule[shift] && daySchedule[shift].includes(employeeId)
    );
    
    if (isWorking) break;
    
    daysOff++;
    checkDate = addDays(checkDate, -1);
  }
  
  return daysOff;
}

// Check if employee worked a late shift on the previous day
function workedLateShiftYesterday(schedule, employeeId, currentDate) {
  const dateObj = typeof currentDate === 'string' ? parseISO(currentDate) : currentDate;
  const yesterday = addDays(dateObj, -1);
  const yesterdayStr = format(yesterday, 'yyyy-MM-dd');
  const daySchedule = schedule[yesterdayStr];
  
  if (!daySchedule || !daySchedule.spät) return false;
  
  return daySchedule.spät.includes(employeeId);
}

// Group weekend days to ensure the same employees work both Saturday and Sunday
function getWeekendPairs(allDays) {
  const weekendPairs = [];
  let currentPair = [];
  
  for (const date of allDays) {
    if (isWeekend(date)) {
      currentPair.push(date);
      if (currentPair.length === 2) {
        weekendPairs.push([...currentPair]);
        currentPair = [];
      }
    }
  }
  
  // Handle case where there might be a single weekend day at the end of the month
  if (currentPair.length === 1) {
    weekendPairs.push([...currentPair]);
  }
  
  return weekendPairs;
}

// Get ideal shift distribution for an employee based on their skills
function getIdealShiftDistribution(employee) {
  const skills = employee.skills || [];
  if (skills.length === 0) return {};
  
  const distribution = {};
  const equalShare = 1 / skills.length;
  
  SHIFTS.forEach(shift => {
    distribution[shift] = skills.includes(shift) ? equalShare : 0;
  });
  
  return distribution;
}

// Calculate shift type imbalance for an employee
function calculateShiftImbalance(stats, idealDistribution) {
  if (!stats || stats.totalDays === 0) return 0;
  
  let totalImbalance = 0;
  
  SHIFTS.forEach(shift => {
    const actual = stats[shift] / stats.totalDays;
    const ideal = idealDistribution[shift] || 0;
    totalImbalance += Math.abs(actual - ideal);
  });
  
  return totalImbalance;
}

// CRITICAL: Check if assigning would exceed max consecutive days
function wouldExceedConsecutiveDaysLimit(schedule, employeeId, dateStr, maxConsecutiveDays) {
  if (!maxConsecutiveDays || maxConsecutiveDays <= 0) {
    // Default to max 5 if not specified or invalid
    maxConsecutiveDays = 5;
  }
  
  // Get consecutive days worked so far
  const consecutiveDays = calculateConsecutiveDays(schedule, employeeId, dateStr);
  
  // If already at or exceeding max, employee cannot work another day
  return consecutiveDays >= maxConsecutiveDays - 1; // -1 because we're checking before adding a new day
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
  const employeeLastShiftType = {};
  const employeeWeekendShifts = {};  // Track weekend shifts per employee
  const employeeDailyAssignments = {};  // Track daily assignments to prevent multiple shifts per day
  const daysWithoutZwischendienst = [];  // Track days where zwischendienst is omitted
  const idealShiftDistributions = {};  // Track ideal shift distributions for each employee
  
  // Initialize tracking
  employees.forEach(emp => {
    employeeHours[emp.id] = 0;
    employeeStats[emp.id] = { früh: 0, zwischen: 0, spät: 0, totalDays: 0 };
    employeeConsecutiveDays[emp.id] = 0;
    employeeLastShiftType[emp.id] = null;
    employeeWeekendShifts[emp.id] = 0;
    employeeDailyAssignments[emp.id] = {};  // Track assignments by date
    idealShiftDistributions[emp.id] = getIdealShiftDistribution(emp);
  });
  
  // Calculate shift durations
  const shiftDurations = {};
  for (const shift of SHIFTS) {
    shiftDurations[shift] = settings.shifts[shift].hours + (settings.shifts[shift].minutes / 60);
  }
  
  // Calculate target hours for each employee based on workload percentage
  const targetHours = {};
  employees.forEach(emp => {
    const averageShiftDuration = Object.values(shiftDurations).reduce((sum, duration) => sum + duration, 0) / SHIFTS.length;
    const monthlyHours = workingDaysInMonth * averageShiftDuration * (emp.workload / 100);
    targetHours[emp.id] = monthlyHours;
  });
  
  // Get all days of the month in chronological order
  const allDays = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    allDays.push(date);
  }
  
  // Get weekend pairs for weekend scheduling
  const weekendPairs = getWeekendPairs(allDays);
  
  // Process weekend pairs first to ensure the same employees work both Saturday and Sunday
  for (const weekendPair of weekendPairs) {
    // Check if any day in the weekend pair is a holiday
    const hasHoliday = weekendPair.some(date => isHoliday(date, settings.holidays));
    
    // Initialize schedules for the weekend days
    const weekendSchedules = {};
    weekendPair.forEach(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      weekendSchedules[dateStr] = {};
      schedule[dateStr] = {};
    });
    
    // Get minimum staffing requirements for weekend
    const minStaffing = settings.minStaffing.weekend;
    
    // Find employees available for the entire weekend
    const availableForWeekend = employees.filter(emp => {
      return weekendPair.every(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        
        // Get employee-specific max consecutive days limit
        // Use employee setting first, fallback to global setting, with 5 as absolute maximum
        const empMaxConsecutiveDays = Math.min(emp.maxConsecutiveDays || settings.rules.maxConsecutiveDays || 5, 5);
        
        // CRITICAL: Check if this would exceed max consecutive days
        // We need to check this before assigning the employee
        if (wouldExceedConsecutiveDaysLimit(schedule, emp.id, dateStr, empMaxConsecutiveDays)) {
          return false;
        }
        
        return isEmployeeAvailableOnDay(emp, date) && 
               !isEmployeeOnSickLeave(emp, date) && 
               !isEmployeeOnVacation(emp, date);
      });
    });
    
    // IMPROVED WEEKEND DISTRIBUTION: Sort by weekend allocation with more weight
    const sortedForWeekend = availableForWeekend.sort((a, b) => {
      // Use weekend rules for complete weekends, not individual days
      const aMaxWeekends = a.workload <= 50 ? settings.weekendRules.under50 : settings.weekendRules.over50;
      const bMaxWeekends = b.workload <= 50 ? settings.weekendRules.under50 : settings.weekendRules.over50;
      
      // Count actual weekend days and divide by 2 to get weekend count
      const aWeekendCount = Math.ceil((employeeWeekendShifts[a.id] || 0) / 2);
      const bWeekendCount = Math.ceil((employeeWeekendShifts[b.id] || 0) / 2);
      
      // Calculate fairness ratio (current count / max allowed)
      const aRatio = aWeekendCount / aMaxWeekends;
      const bRatio = bWeekendCount / bMaxWeekends;
      
      // First prioritize those with lower ratio (more fair distribution)
      if (Math.abs(aRatio - bRatio) > 0.01) {
        return aRatio - bRatio;
      }
      
      // If ratios are similar, prioritize those with lower absolute count
      if (aWeekendCount !== bWeekendCount) {
        return aWeekendCount - bWeekendCount;
      }
      
      // Finally by workload
      return b.workload - a.workload;
    });
    
    // Track who is assigned to this weekend
    const assignedToWeekend = new Set();
    
    // For weekends, prioritize früh and spät first, then zwischen
    // This ensures we fill the critical shifts first
    const prioritizedShifts = ['früh', 'spät', 'zwischen'];
    
    // Assign each shift type for the weekend
    for (const shift of prioritizedShifts) {
      const requiredStaff = minStaffing[shift];
      
      // Get available employees for this shift who can work both days
      const availableForShift = sortedForWeekend.filter(emp => {
        // Check if already assigned to this weekend
        if (assignedToWeekend.has(emp.id)) return false;
        
        // Check if employee has the required skill
        if (!emp.skills.includes(shift)) return false;
        
        // Check preferences for both days
        for (const date of weekendPair) {
          const dateStr = format(date, 'yyyy-MM-dd');
          const preference = emp.preferences?.find(p => p.date === dateStr);
          if (preference) {
            if (preference.type === 'frei') return false;
            if (preference.type !== shift) return false;
          }
        }
        
        // Check early-after-late rule for first day of weekend
        if (shift === 'früh') {
          const firstDay = format(weekendPair[0], 'yyyy-MM-dd');
          if (workedLateShiftYesterday(schedule, emp.id, firstDay) && settings.rules.noEarlyAfterLate) {
            return false;
          }
        }
        
        // Get employee-specific max consecutive days limit
        // Use employee setting first, fallback to global setting, with 5 as absolute maximum
        const empMaxConsecutiveDays = Math.min(emp.maxConsecutiveDays || settings.rules.maxConsecutiveDays || 5, 5);
        
        // CRITICAL: Check max consecutive days for both days in weekend
        for (const date of weekendPair) {
          const dateStr = format(date, 'yyyy-MM-dd');
          if (wouldExceedConsecutiveDaysLimit(schedule, emp.id, dateStr, empMaxConsecutiveDays)) {
            return false;
          }
        }
        
        return true;
      });
      
      // Sort available employees by shift balance
      const sortedByBalance = [...availableForShift].sort((a, b) => {
        // Get current stats
        const aStats = employeeStats[a.id];
        const bStats = employeeStats[b.id];
        
        // Get ideal distributions
        const aIdeal = idealShiftDistributions[a.id];
        const bIdeal = idealShiftDistributions[b.id];
        
        // Calculate current imbalance
        const aImbalance = calculateShiftImbalance(aStats, aIdeal);
        const bImbalance = calculateShiftImbalance(bStats, bIdeal);
        
        // Calculate how this shift would affect balance
        const aCurrentShiftRatio = aStats[shift] / Math.max(1, aStats.totalDays || 1);
        const bCurrentShiftRatio = bStats[shift] / Math.max(1, bStats.totalDays || 1);
        
        // Prioritize employees who have less of this shift type relative to their ideal
        const aIdealRatio = aIdeal[shift] || 0;
        const bIdealRatio = bIdeal[shift] || 0;
        const aDifference = aIdealRatio - aCurrentShiftRatio;
        const bDifference = bIdealRatio - bCurrentShiftRatio;
        
        if (Math.abs(aDifference - bDifference) > 0.1) {
          return bDifference - aDifference;  // Higher difference (more needed) comes first
        }
        
        // If differences are similar, use overall imbalance
        if (Math.abs(aImbalance - bImbalance) > 0.1) {
          return aImbalance - bImbalance;
        }
        
        // Finally, consider workload as a tiebreaker
        return b.workload - a.workload;
      });
      
      // Assign up to required number of employees to this shift for both weekend days
      const assignedEmployees = [];
      for (let i = 0; i < Math.min(requiredStaff, sortedByBalance.length); i++) {
        const employee = sortedByBalance[i];
        assignedEmployees.push(employee.id);
        assignedToWeekend.add(employee.id);
        
        // Assign to both days of the weekend
        for (const date of weekendPair) {
          const dateStr = format(date, 'yyyy-MM-dd');
          
          if (!weekendSchedules[dateStr][shift]) {
            weekendSchedules[dateStr][shift] = [];
          }
          
          weekendSchedules[dateStr][shift].push(employee.id);
          employeeDailyAssignments[employee.id][dateStr] = shift;
          
          // Update hours and stats
          const shiftDuration = shiftDurations[shift];
          employeeHours[employee.id] += shiftDuration;
          employeeStats[employee.id][shift]++;
          employeeStats[employee.id].totalDays++;
          
          // Mark as working a weekend day
          employeeWeekendShifts[employee.id] = (employeeWeekendShifts[employee.id] || 0) + 1;
        }
      }
      
      // Check if minimum staffing is met
      if (assignedEmployees.length < requiredStaff) {
        // If understaffed for zwischendienst, skip it and record for later redistribution
        if (shift === 'zwischen') {
          weekendPair.forEach(date => {
            const dateStr = format(date, 'yyyy-MM-dd');
            // Skip recording violation as we're going to redistribute
            daysWithoutZwischendienst.push(dateStr);
          });
        } else {
          weekendPair.forEach(date => {
            const dateStr = format(date, 'yyyy-MM-dd');
            violations.push({
              type: 'understaffed',
              date: dateStr,
              shift: shift,
              required: requiredStaff,
              assigned: assignedEmployees.length
            });
          });
        }
      }
    }
    
    // Copy weekend schedules to the main schedule
    for (const dateStr in weekendSchedules) {
      schedule[dateStr] = {...weekendSchedules[dateStr]};
    }
    
    // Handle redistribution for zwischendienst if needed
    for (const dateStr in weekendSchedules) {
      if (!schedule[dateStr]['zwischen'] && daysWithoutZwischendienst.includes(dateStr)) {
        // Find employees not yet assigned on this date who can work früh or spät
        const availableForRedistribution = employees.filter(emp => {
          // Get employee-specific max consecutive days limit with absolute maximum of 5
          const empMaxConsecutiveDays = Math.min(emp.maxConsecutiveDays || settings.rules.maxConsecutiveDays || 5, 5);
          
          // CRITICAL: Check max consecutive days
          if (wouldExceedConsecutiveDaysLimit(schedule, emp.id, dateStr, empMaxConsecutiveDays)) {
            return false;
          }
          
          return !employeeDailyAssignments[emp.id][dateStr] && 
                 isEmployeeAvailableOnDay(emp, new Date(dateStr)) && 
                 !isEmployeeOnSickLeave(emp, new Date(dateStr)) && 
                 !isEmployeeOnVacation(emp, new Date(dateStr)) && 
                 (emp.skills.includes('früh') || emp.skills.includes('spät'));
        });
        
        // Sort by optimal assignment
        const sortedForRedistribution = availableForRedistribution.sort((a, b) => {
          // Balance shift types
          const aFrühRatio = employeeStats[a.id]['früh'] / Math.max(1, employeeStats[a.id].totalDays || 1);
          const bFrühRatio = employeeStats[b.id]['früh'] / Math.max(1, employeeStats[b.id].totalDays || 1);
          const aSpätRatio = employeeStats[a.id]['spät'] / Math.max(1, employeeStats[a.id].totalDays || 1);
          const bSpätRatio = employeeStats[b.id]['spät'] / Math.max(1, employeeStats[b.id].totalDays || 1);
          
          // Compare the lowest ratio of früh/spät between employees
          const aMinRatio = Math.min(aFrühRatio, aSpätRatio);
          const bMinRatio = Math.min(bFrühRatio, bSpätRatio);
          
          if (Math.abs(aMinRatio - bMinRatio) > 0.1) {
            return aMinRatio - bMinRatio;  // Prioritize employee with less shifts overall
          }
          
          // Prioritize employees with fewer assigned hours relative to target
          const aCompletionPercent = employeeHours[a.id] / targetHours[a.id];
          const bCompletionPercent = employeeHours[b.id] / targetHours[b.id];
          
          return aCompletionPercent - bCompletionPercent;
        });
        
        // Try to fill früh first, then spät
        for (const shift of ['früh', 'spät']) {
          const currentCount = schedule[dateStr][shift] ? schedule[dateStr][shift].length : 0;
          const neededMore = Math.max(0, minStaffing[shift] - currentCount);
          
          if (neededMore > 0) {
            const eligibleEmployees = sortedForRedistribution.filter(emp => {
              if (!emp.skills.includes(shift) || employeeDailyAssignments[emp.id][dateStr]) {
                return false;
              }
              
              // Check early-after-late rule - explicitly check again
              if (shift === 'früh' && settings.rules.noEarlyAfterLate) {
                if (workedLateShiftYesterday(schedule, emp.id, dateStr)) {
                  return false;
                }
              }
              
              // Get employee-specific max consecutive days limit with absolute maximum of 5
              const empMaxConsecutiveDays = Math.min(emp.maxConsecutiveDays || settings.rules.maxConsecutiveDays || 5, 5);
              
              // CRITICAL: Check max consecutive days
              if (wouldExceedConsecutiveDaysLimit(schedule, emp.id, dateStr, empMaxConsecutiveDays)) {
                return false;
              }
              
              return true;
            });
            
            for (let i = 0; i < neededMore && i < eligibleEmployees.length; i++) {
              const employee = eligibleEmployees[i];
              
              // Check employee preferences
              const preference = employee.preferences?.find(p => p.date === dateStr);
              if (preference && preference.type === 'frei') continue;
              
              // Assign the employee
              if (!schedule[dateStr][shift]) schedule[dateStr][shift] = [];
              schedule[dateStr][shift].push(employee.id);
              employeeDailyAssignments[employee.id][dateStr] = shift;
              
              // Update hours and stats
              const shiftDuration = shiftDurations[shift];
              employeeHours[employee.id] += shiftDuration;
              employeeStats[employee.id][shift]++;
              employeeStats[employee.id].totalDays++;
              
              // Update weekend count
              employeeWeekendShifts[employee.id] = (employeeWeekendShifts[employee.id] || 0) + 1;
            }
          }
        }
      }
    }
  }
  
  // Process weekdays and holidays in chronological order
  for (const date of allDays) {
    // Skip weekends as they were already processed
    if (isWeekend(date)) continue;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    const isHolidayDate = isHoliday(date, settings.holidays);
    schedule[dateStr] = {};
    
    // Get minimum staffing requirements based on whether it's a holiday or a regular weekday
    const minStaffing = isHolidayDate ? settings.minStaffing.weekend : settings.minStaffing.weekday;
    
    // Track who is assigned today
    const assignedToday = new Set();
    
    // For weekdays and holidays, prioritize früh and spät first, then zwischen
    // This ensures we fill the critical shifts first
    const prioritizedShifts = ['früh', 'spät', 'zwischen'];
    
    // Assign shifts for this day
    for (const shift of prioritizedShifts) {
      const requiredStaff = minStaffing[shift];
      
      // Get available employees with improved filtering
      const availableEmployees = employees.filter(emp => {
        // Check if already assigned today - ensures no double assignments
        if (assignedToday.has(emp.id)) return false;
        
        // Check if already assigned to this date (from previous days processing)
        if (employeeDailyAssignments[emp.id][dateStr]) return false;
        
        // Check if employee has the required skill
        if (!emp.skills.includes(shift)) return false;
        
        // Check if employee is available on this day of the week
        if (!isEmployeeAvailableOnDay(emp, date)) return false;
        
        // Check if employee is on sick leave
        if (isEmployeeOnSickLeave(emp, date)) return false;
        
        // Check if employee is on vacation
        if (isEmployeeOnVacation(emp, date)) return false;
        
        // Get employee-specific max consecutive days limit
        // Use employee setting first, fallback to global setting, with 5 as absolute maximum
        const empMaxConsecutiveDays = Math.min(emp.maxConsecutiveDays || settings.rules.maxConsecutiveDays || 5, 5);
        
        // CRITICAL: Check max consecutive days - this is the most important rule
        if (wouldExceedConsecutiveDaysLimit(schedule, emp.id, dateStr, empMaxConsecutiveDays)) {
          return false;
        }
        
        // Check if enough days off between blocks
        const daysOff = calculateDaysOffBetweenBlocks(schedule, emp.id, dateStr);
        
        // Use employee-specific or global min days off setting
        const minDaysOff = settings.rules.minDaysOffBetweenBlocks || 2;
        
        if (calculateConsecutiveDays(schedule, emp.id, dateStr) === 0 && 
            daysOff > 0 && 
            daysOff < minDaysOff) {
          return false;
        }
        
        // Check preferences
        const preference = emp.preferences?.find(p => p.date === dateStr);
        if (preference) {
          if (preference.type === 'frei') return false;
          if (preference.type !== shift) return false;
        }
        
        // Check early-after-late rule
        if (settings.rules.noEarlyAfterLate && shift === 'früh') {
          if (workedLateShiftYesterday(schedule, emp.id, dateStr)) {
            return false;  // No early shift after late shift
          }
        }
        
        return true;
      });
      
      // Sort by priority with improved fairness algorithm and shift balance
      const sortedEmployees = availableEmployees.sort((a, b) => {
        // First check: Employee preferences
        const aPreference = a.preferences?.find(p => p.date === dateStr && p.type === shift);
        const bPreference = b.preferences?.find(p => p.date === dateStr && p.type === shift);
        
        if (aPreference && !bPreference) return -1;  // A has preference, prioritize A
        if (!aPreference && bPreference) return 1;  // B has preference, prioritize B
        
        // Get current stats and ideal distributions
        const aStats = employeeStats[a.id];
        const bStats = employeeStats[b.id];
        const aIdeal = idealShiftDistributions[a.id];
        const bIdeal = idealShiftDistributions[b.id];
        
        // Calculate how this shift would improve balance
        const aCurrentShiftRatio = aStats[shift] / Math.max(1, aStats.totalDays || 1);
        const bCurrentShiftRatio = bStats[shift] / Math.max(1, bStats.totalDays || 1);
        
        // Prioritize employees who need more of this shift type
        const aIdealShiftRatio = aIdeal[shift] || 0;
        const bIdealShiftRatio = bIdeal[shift] || 0;
        const aDifference = aIdealShiftRatio - aCurrentShiftRatio;
        const bDifference = bIdealShiftRatio - bCurrentShiftRatio;
        
        if (Math.abs(aDifference - bDifference) > 0.1) {
          return bDifference - aDifference;  // Prioritize employee who needs this shift more
        }
        
        // If shift differences are similar, check overall imbalance
        const aImbalance = calculateShiftImbalance(aStats, aIdeal);
        const bImbalance = calculateShiftImbalance(bStats, bIdeal);
        
        if (Math.abs(aImbalance - bImbalance) > 0.1) {
          return aImbalance - bImbalance;  // Prioritize employee with more imbalance
        }
        
        // Progress toward target hours
        const aRemainingPercent = 1 - (employeeHours[a.id] / targetHours[a.id]);
        const bRemainingPercent = 1 - (employeeHours[b.id] / targetHours[b.id]);
        
        if (Math.abs(aRemainingPercent - bRemainingPercent) > 0.05) {
          return bRemainingPercent - aRemainingPercent;  // Prioritize employee with more hours to fulfill
        }
        
        // Finally, prioritize by workload percentage (higher workload gets priority)
        return b.workload - a.workload;
      });
      
      const assignedEmployees = [];
      
      for (let i = 0; i < requiredStaff && i < sortedEmployees.length; i++) {
        const employee = sortedEmployees[i];
        
        // Final check for rule violations
        if (assignedToday.has(employee.id)) continue;  // No double assignments
        
        // Check if assigning this employee would exceed their target hours + tolerance
        const shiftDuration = shiftDurations[shift];
        const potentialHours = employeeHours[employee.id] + shiftDuration;
        const hoursTolerance = settings.rules.hoursTolerance + (settings.rules.minutesTolerance / 60);
        
        // Only check for exceeding target hours, not for being under target
        if (potentialHours > targetHours[employee.id] + hoursTolerance) {
          // Skip this employee if they would exceed their target hours + tolerance
          continue;
        }
        
        // Assign the employee
        assignedEmployees.push(employee.id);
        assignedToday.add(employee.id);
        employeeDailyAssignments[employee.id][dateStr] = shift;  // Mark this date as assigned for this employee
        
        // Update hours and stats
        employeeHours[employee.id] = potentialHours;
        employeeStats[employee.id][shift]++;
        employeeStats[employee.id].totalDays++;
        employeeConsecutiveDays[employee.id]++;
        employeeLastShiftType[employee.id] = shift;
      }
      
      schedule[dateStr][shift] = assignedEmployees;
      
      // Check if minimum staffing is met
      if (assignedEmployees.length < requiredStaff) {
        // If understaffed for zwischen, skip it and record for later redistribution
        if (shift === 'zwischen') {
          // Skip recording violation as we're going to redistribute
          // Remove the zwischen shift allocation
          delete schedule[dateStr][shift];
          daysWithoutZwischendienst.push(dateStr);
        } else {
          violations.push({
            type: 'understaffed',
            date: dateStr,
            shift: shift,
            required: requiredStaff,
            assigned: assignedEmployees.length
          });
        }
      }
    }
    
    // If zwischen shift is understaffed, redistribute staff to früh and spät
    if (!schedule[dateStr]['zwischen'] && daysWithoutZwischendienst.includes(dateStr)) {
      // Get employees who weren't assigned yet
      const unassignedEmployees = employees.filter(emp => 
        !assignedToday.has(emp.id) && 
        !employeeDailyAssignments[emp.id][dateStr] && 
        isEmployeeAvailableOnDay(emp, date) && 
        !isEmployeeOnSickLeave(emp, date) && 
        !isEmployeeOnVacation(emp, date) && 
        (emp.skills.includes('früh') || emp.skills.includes('spät'))
      );
      
      // Sort by priority with improved fairness
      const sortedForRedistribution = unassignedEmployees.sort((a, b) => {
        // Balance shift types using ideal distributions
        const aStats = employeeStats[a.id];
        const bStats = employeeStats[b.id];
        const aIdeal = idealShiftDistributions[a.id];
        const bIdeal = idealShiftDistributions[b.id];
        
        // Calculate imbalance for each shift type
        const aImbalance = calculateShiftImbalance(aStats, aIdeal);
        const bImbalance = calculateShiftImbalance(bStats, bIdeal);
        
        if (Math.abs(aImbalance - bImbalance) > 0.1) {
          return aImbalance - bImbalance;
        }
        
        // Prioritize employees with fewer assigned hours relative to target
        const aCompletionPercent = employeeHours[a.id] / targetHours[a.id];
        const bCompletionPercent = employeeHours[b.id] / targetHours[b.id];
        
        return aCompletionPercent - bCompletionPercent;
      });
      
      // Try to fill früh first, then spät
      for (const shift of ['früh', 'spät']) {
        const currentCount = schedule[dateStr][shift] ? schedule[dateStr][shift].length : 0;
        const neededMore = Math.max(0, minStaffing[shift] - currentCount);
        
        if (neededMore > 0) {
          const eligibleEmployees = sortedForRedistribution.filter(emp => {
            if (!emp.skills.includes(shift) || assignedToday.has(emp.id)) {
              return false;
            }
            
            // Check early-after-late rule - explicitly check again
            if (shift === 'früh' && settings.rules.noEarlyAfterLate) {
              if (workedLateShiftYesterday(schedule, emp.id, dateStr)) {
                return false;  // No early shift after late shift
              }
            }
            
            // Get employee-specific max consecutive days limit
            // Use employee setting first, fallback to global setting, with 5 as absolute maximum
            const empMaxConsecutiveDays = Math.min(emp.maxConsecutiveDays || settings.rules.maxConsecutiveDays || 5, 5);
            
            // CRITICAL: Check max consecutive days
            if (wouldExceedConsecutiveDaysLimit(schedule, emp.id, dateStr, empMaxConsecutiveDays)) {
              return false;
            }
            
            // Check if enough days off after a block of shifts
            const daysOff = calculateDaysOffBetweenBlocks(schedule, emp.id, dateStr);
            
            // Use employee-specific or global min days off setting
            const minDaysOff = settings.rules.minDaysOffBetweenBlocks || 2;
            
            if (calculateConsecutiveDays(schedule, emp.id, dateStr) === 0 && 
                daysOff > 0 && 
                daysOff < minDaysOff) {
              return false;
            }
            
            return true;
          });
          
          for (let i = 0; i < neededMore && i < eligibleEmployees.length; i++) {
            const employee = eligibleEmployees[i];
            
            // Check employee preferences
            const preference = employee.preferences?.find(p => p.date === dateStr);
            if (preference && preference.type === 'frei') continue;
            
            // Check if assigning this employee would exceed their target hours + tolerance
            const shiftDuration = shiftDurations[shift];
            const potentialHours = employeeHours[employee.id] + shiftDuration;
            const hoursTolerance = settings.rules.hoursTolerance + (settings.rules.minutesTolerance / 60);
            
            // Only check for exceeding target hours, not for being under target
            if (potentialHours > targetHours[employee.id] + hoursTolerance) {
              // Skip this employee if they would exceed their target hours + tolerance
              continue;
            }
            
            // Assign the employee
            if (!schedule[dateStr][shift]) schedule[dateStr][shift] = [];
            schedule[dateStr][shift].push(employee.id);
            assignedToday.add(employee.id);
            employeeDailyAssignments[employee.id][dateStr] = shift;
            
            // Update hours and stats
            employeeHours[employee.id] = potentialHours;
            employeeStats[employee.id][shift]++;
            employeeStats[employee.id].totalDays++;
            employeeConsecutiveDays[employee.id]++;
            employeeLastShiftType[employee.id] = shift;
          }
        }
      }
    }
    
    // Reset consecutive days for employees not working today
    employees.forEach(emp => {
      if (!assignedToday.has(emp.id) && !employeeDailyAssignments[emp.id][dateStr]) {
        employeeConsecutiveDays[emp.id] = 0;
      }
    });
  }
  
  // Check if employees exceed their target hours with consideration for tolerance
  employees.forEach(emp => {
    const actualHours = employeeHours[emp.id];
    const targetHoursForEmp = targetHours[emp.id];
    
    // Only check if employee is over their target hours (with tolerance)
    // We don't want to flag employees who are under their target hours
    if (actualHours > targetHoursForEmp) {
      const hourDifference = actualHours - targetHoursForEmp;
      
      // Check if the difference exceeds the tolerance (both hours and minutes)
      const hoursTolerance = settings.rules.hoursTolerance + (settings.rules.minutesTolerance / 60);
      
      if (hourDifference > hoursTolerance) {
        violations.push({
          type: 'hours_mismatch',
          employeeId: emp.id,
          employeeName: emp.name,
          target: targetHoursForEmp,
          actual: actualHours,
          difference: hourDifference,
          isOver: true
        });
      }
    }
  });
  
  // Create a summary of why some violations might be unavoidable
  const explanations = [];
  
  // Add explanation for days without Zwischendienst
  if (daysWithoutZwischendienst.length > 0) {
    explanations.push({
      type: 'zwischendienst_omitted',
      message: `An ${daysWithoutZwischendienst.length} Tagen wurde der Zwischendienst weggelassen, um die Früh- und Spätdienste ausreichend zu besetzen.`
    });
  }
  
  // Check for potential violations due to insufficient staff
  const totalRequired = Object.values(settings.minStaffing.weekday).reduce((sum, val) => sum + val, 0) * (daysInMonth - (daysInMonth / 7) * 2);  // Approximate weekdays
  const totalWeekendRequired = Object.values(settings.minStaffing.weekend).reduce((sum, val) => sum + val, 0) * Math.round((daysInMonth / 7) * 2);  // Approximate weekend days
  const totalShiftsRequired = totalRequired + totalWeekendRequired;
  
  const totalAvailableShifts = employees.reduce((sum, emp) => {
    const workingDaysPerEmployee = Math.min(
      daysInMonth, 
      Math.round(daysInMonth * (emp.workload / 100))
    );
    return sum + workingDaysPerEmployee;
  }, 0);
  
  if (totalShiftsRequired > totalAvailableShifts) {
    explanations.push({
      type: 'staffing_shortage',
      message: `Nicht genug Personal für alle erforderlichen Schichten. Benötigt: ca. ${Math.round(totalShiftsRequired)} Schichten, Verfügbar: ca. ${Math.round(totalAvailableShifts)} Schichten.`
    });
  }
  
  // Check for skill distribution issues
  const skillCounts = {};
  SHIFTS.forEach(shift => {
    skillCounts[shift] = employees.filter(emp => emp.skills.includes(shift)).length;
  });
  
  SHIFTS.forEach(shift => {
    const requiredForShift = (settings.minStaffing.weekday[shift] * (daysInMonth - (daysInMonth / 7) * 2)) + 
                           (settings.minStaffing.weekend[shift] * Math.round((daysInMonth / 7) * 2));
    
    // Assuming each employee with this skill could work at most half their days in this shift
    const maxAvailableForShift = skillCounts[shift] * (daysInMonth / 2);
    
    if (requiredForShift > maxAvailableForShift) {
      explanations.push({
        type: 'skill_shortage',
        message: `Zu wenig Mitarbeiter mit ${shift}-Qualifikation. Benötigt: ca. ${Math.round(requiredForShift)} Schichten, Maximal verfügbar: ca. ${Math.round(maxAvailableForShift)} Schichten.`
      });
    }
  });
  
  // Check for weekend constraints
  const weekendDays = allDays.filter(day => isWeekend(day)).length;
  const totalWeekendShiftsNeeded = weekendDays * Object.values(settings.minStaffing.weekend).reduce((sum, val) => sum + val, 0);
  
  // Calculate based on weekends (pairs), not individual days
  const maxWeekendShiftsAvailable = employees.reduce((sum, emp) => {
    const maxWeekends = emp.workload <= 50 ? settings.weekendRules.under50 : settings.weekendRules.over50;
    // Each weekend is 2 days, and each day needs staffing
    return sum + (maxWeekends * 2);
  }, 0);
  
  if (totalWeekendShiftsNeeded > maxWeekendShiftsAvailable) {
    explanations.push({
      type: 'weekend_constraint',
      message: `Wochenend-Einschränkungen sind zu streng. Benötigt: ca. ${Math.round(totalWeekendShiftsNeeded)} Wochenendschichten, Maximal verfügbar unter aktuellen Einstellungen: ca. ${Math.round(maxWeekendShiftsAvailable)} Schichten.`
    });
  }
  
  // Count total preferences and check if they might be causing issues
  let totalFreePreferences = 0;
  let totalShiftPreferences = 0;
  
  employees.forEach(emp => {
    if (emp.preferences && emp.preferences.length > 0) {
      emp.preferences.forEach(pref => {
        if (pref.type === 'frei') {
          totalFreePreferences++;
        } else {
          totalShiftPreferences++;
        }
      });
    }
  });
  
  // If there are many free preferences, this could cause staffing issues
  if (totalFreePreferences > daysInMonth * 0.15 * employees.length) {
    explanations.push({
      type: 'many_free_preferences',
      message: `Viele Freiwünsche (${totalFreePreferences}) könnten die optimale Dienstplanerstellung beeinträchtigen.`
    });
  }
  
  // Check for sick leave and vacation impact
  let totalAbsenceDays = 0;
  
  employees.forEach(emp => {
    // Count sick days
    if (emp.sickLeave && emp.sickLeave.from && emp.sickLeave.to) {
      const fromDate = new Date(emp.sickLeave.from);
      const toDate = new Date(emp.sickLeave.to);
      
      // Only count sick days within this month
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0);
      
      const effectiveFrom = fromDate < monthStart ? monthStart : fromDate;
      const effectiveTo = toDate > monthEnd ? monthEnd : toDate;
      
      if (effectiveFrom <= effectiveTo) {
        const diffTime = Math.abs(effectiveTo - effectiveFrom);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;  // +1 to include both start and end dates
        totalAbsenceDays += diffDays;
      }
    }
    
    // Count vacation days
    if (emp.vacation && emp.vacation.from && emp.vacation.to) {
      const fromDate = new Date(emp.vacation.from);
      const toDate = new Date(emp.vacation.to);
      
      // Only count vacation days within this month
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0);
      
      const effectiveFrom = fromDate < monthStart ? monthStart : fromDate;
      const effectiveTo = toDate > monthEnd ? monthEnd : toDate;
      
      if (effectiveFrom <= effectiveTo) {
        const diffTime = Math.abs(effectiveTo - effectiveFrom);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;  // +1 to include both start and end dates
        totalAbsenceDays += diffDays;
      }
    }
  });
  
  if (totalAbsenceDays > daysInMonth * 0.1 * employees.length) {
    explanations.push({
      type: 'high_sick_leave',
      message: `Hohe Anzahl an Abwesenheitstagen (${totalAbsenceDays}) schränkt die verfügbare Personalkapazität ein.`
    });
  }
  
  // Convert weekend shift counts from days to full weekends for display
  const employeeWeekendCounts = {};
  for (const empId in employeeWeekendShifts) {
    // Convert days to weekends (2 days = 1 weekend)
    employeeWeekendCounts[empId] = Math.ceil(employeeWeekendShifts[empId] / 2);
  }
  
  // Prepare schedule data for webhooks if configured
  const scheduleData = {
    month: monthStr,
    schedule,
    employees: employees.map(emp => ({
      id: emp.id,
      name: emp.name,
      workload: emp.workload
    })),
    violations,
    employeeStats,
    employeeHours,
    targetHours,
    employeeWeekendShifts: employeeWeekendCounts,  // Use weekend counts instead of days
    explanations,
    daysWithoutZwischendienst,
    createdAt: new Date().toISOString()
  };
  
  // Send data to webhook if configured
  try {
    const webhookResponse = await WebhookService.triggerWebhook('schedule', scheduleData);
    if (webhookResponse) {
      scheduleData.webhookResponse = webhookResponse;
    }
  } catch (error) {
    console.error('Error triggering schedule webhook:', error);
  }
  
  return {
    schedule,
    violations,
    employeeHours,
    employeeStats,
    targetHours,
    employeeWeekendShifts: employeeWeekendCounts,  // Use weekend counts instead of days
    explanations,
    daysWithoutZwischendienst,
    errors: []
  };
}