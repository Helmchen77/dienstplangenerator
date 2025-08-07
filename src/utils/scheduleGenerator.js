import { getDaysInMonth, isWeekend, format, addDays, differenceInHours, parseISO, getDay } from 'date-fns';
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
  const dayOfWeek = getDay(date); // 0 = Sunday, 1 = Monday, etc.
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

// Check if the date is a holiday
function isHoliday(date, holidays) {
  if (!holidays || !holidays.length) return false;
  
  const dateStr = format(date, 'yyyy-MM-dd');
  return holidays.some(holiday => holiday.date === dateStr);
}

// Calculate the number of consecutive free days between shifts
function calculateDaysOffBetweenBlocks(schedule, employeeId, currentDate) {
  const dateObj = parseISO(currentDate);
  let daysOff = 0;
  let checkDate = addDays(dateObj, -1);
  
  while (checkDate >= parseISO(Object.keys(schedule)[0])) {
    const checkDateStr = format(checkDate, 'yyyy-MM-dd');
    const daySchedule = schedule[checkDateStr];
    
    if (!daySchedule) break;
    
    const isWorking = SHIFTS.some(shift => 
      daySchedule[shift] && daySchedule[shift].includes(employeeId)
    );
    
    if (isWorking) break;
    daysOff++;
    checkDate = addDays(checkDate, -1);
  }
  
  return daysOff;
}

// Calculate weekend shifts for an employee
function getWeekendShiftsCount(employee, schedule) {
  let count = 0;
  
  Object.entries(schedule).forEach(([dateStr, daySchedule]) => {
    const date = new Date(dateStr);
    if (isWeekend(date)) {
      const hasShift = SHIFTS.some(shift => 
        daySchedule[shift] && daySchedule[shift].includes(employee.id)
      );
      if (hasShift) count++;
    }
  });
  
  return count;
}

// Calculate shift distribution fairness
function calculateShiftDistribution(employeeStats, employees) {
  const shiftDistribution = {};
  
  employees.forEach(emp => {
    if (!employeeStats[emp.id]) return;
    
    const stats = employeeStats[emp.id];
    const totalShifts = stats.totalDays;
    
    if (totalShifts === 0) return;
    
    shiftDistribution[emp.id] = {
      früh: stats.früh / totalShifts,
      zwischen: stats.zwischen / totalShifts,
      spät: stats.spät / totalShifts,
      balance: Math.max(stats.früh, stats.zwischen, stats.spät) - 
               Math.min(stats.früh, stats.zwischen, stats.spät)
    };
  });
  
  return shiftDistribution;
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
  const employeeWeekendShifts = {};
  
  // Initialize tracking
  employees.forEach(emp => {
    employeeHours[emp.id] = 0;
    employeeStats[emp.id] = { früh: 0, zwischen: 0, spät: 0, totalDays: 0 };
    employeeConsecutiveDays[emp.id] = 0;
    employeeLastShiftType[emp.id] = null;
    employeeWeekendShifts[emp.id] = 0;
  });
  
  // Calculate shift durations
  const shiftDurations = {};
  for (const shift of SHIFTS) {
    shiftDurations[shift] = settings.shifts[shift].hours + (settings.shifts[shift].minutes / 60);
  }
  
  // Calculate target hours for each employee
  const targetHours = {};
  employees.forEach(emp => {
    // Calculate workload based on workload percentage
    const averageShiftDuration = Object.values(shiftDurations).reduce((sum, duration) => sum + duration, 0) / SHIFTS.length;
    const monthlyHours = workingDaysInMonth * averageShiftDuration * (emp.workload / 100);
    targetHours[emp.id] = monthlyHours;
  });

  // Get all days of the month
  const allDays = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    allDays.push(date);
  }

  // First, sort days to prioritize weekends
  const sortedDays = [...allDays].sort((a, b) => {
    const aIsWeekend = isWeekend(a) ? 1 : 0;
    const bIsWeekend = isWeekend(b) ? 1 : 0;
    return bIsWeekend - aIsWeekend; // Weekends first
  });

  // Process weekends together to assign same employee to both Saturday and Sunday
  const weekendPairs = [];
  for (let i = 0; i < sortedDays.length - 1; i++) {
    const currentDay = sortedDays[i];
    const nextDay = sortedDays[i + 1];
    
    if (isWeekend(currentDay) && isWeekend(nextDay) && 
        format(currentDay, 'yyyy-MM-dd') !== format(nextDay, 'yyyy-MM-dd')) {
      // This is a Saturday-Sunday pair
      const saturday = currentDay.getDay() === 6 ? currentDay : nextDay;
      const sunday = currentDay.getDay() === 0 ? currentDay : nextDay;
      
      weekendPairs.push({ saturday, sunday });
      
      // Skip the next day as we've already processed it
      i++;
    }
  }

  // First, schedule weekend pairs
  for (const { saturday, sunday } of weekendPairs) {
    const satDateStr = format(saturday, 'yyyy-MM-dd');
    const sunDateStr = format(sunday, 'yyyy-MM-dd');
    
    // Initialize schedule entries
    schedule[satDateStr] = {};
    schedule[sunDateStr] = {};
    
    // Skip if either day is a holiday
    if (isHoliday(saturday, settings.holidays) || isHoliday(sunday, settings.holidays)) {
      continue;
    }
    
    // Get minimum staffing for weekend
    const minStaffing = settings.minStaffing.weekend;
    
    // Track who is assigned to this weekend
    const assignedToWeekend = new Set();
    
    // Assign shifts for this weekend
    for (const shift of SHIFTS) {
      const requiredStaff = minStaffing[shift];
      
      // Get available employees for Saturday
      const availableForSaturday = employees.filter(emp => 
        isEmployeeAvailableOnDay(emp, saturday) && 
        !isEmployeeOnSickLeave(emp, saturday) && 
        emp.skills.includes(shift)
      );
      
      // Get available employees for Sunday who are also available for Saturday
      const availableForWeekend = availableForSaturday.filter(emp => 
        isEmployeeAvailableOnDay(emp, sunday) && 
        !isEmployeeOnSickLeave(emp, sunday)
      );
      
      // Sort by priority - updated to respect weekend limits
      const sortedEmployees = availableForWeekend.sort((a, b) => {
        // Check weekend limits based on workload
        const aMaxWeekends = a.workload > 50 ? 2 : 1;
        const bMaxWeekends = b.workload > 50 ? 2 : 1;
        
        const aWeekendCount = employeeWeekendShifts[a.id];
        const bWeekendCount = employeeWeekendShifts[b.id];
        
        // If one employee is at or over their limit but the other isn't
        if (aWeekendCount >= aMaxWeekends && bWeekendCount < bMaxWeekends) {
          return 1; // Prioritize b
        }
        if (bWeekendCount >= bMaxWeekends && aWeekendCount < aMaxWeekends) {
          return -1; // Prioritize a
        }
        
        // If both are under their limit, prioritize by count
        if (aWeekendCount < aMaxWeekends && bWeekendCount < bMaxWeekends) {
          return aWeekendCount - bWeekendCount;
        }
        
        // Lower completion percentage gets higher priority if weekend counts are equal
        const aCompletionPercent = employeeHours[a.id] / targetHours[a.id];
        const bCompletionPercent = employeeHours[b.id] / targetHours[b.id];
        
        return aCompletionPercent - bCompletionPercent;
      });
      
      const assignedEmployees = [];
      
      for (let i = 0; i < requiredStaff && i < sortedEmployees.length; i++) {
        const employee = sortedEmployees[i];
        
        // Check if already assigned to this weekend
        if (assignedToWeekend.has(employee.id)) continue;
        
        // Check consecutive days limit
        if (employeeConsecutiveDays[employee.id] >= employee.maxConsecutiveDays) continue;
        
        // Check days off between blocks
        const satDaysOff = calculateDaysOffBetweenBlocks(schedule, employee.id, satDateStr);
        if (satDaysOff < settings.rules.minDaysOffBetweenBlocks && employeeConsecutiveDays[employee.id] === 0) {
          continue;
        }
        
        // Check if employee would exceed weekend limit
        const maxWeekendShifts = employee.workload > 50 ? 2 : 1;
        if (employeeWeekendShifts[employee.id] + 2 > maxWeekendShifts * 2) {
          // Skip if this would exceed their limit
          continue;
        }
        
        // Assign to Saturday
        if (!schedule[satDateStr][shift]) schedule[satDateStr][shift] = [];
        schedule[satDateStr][shift].push(employee.id);
        
        // Assign to Sunday
        if (!schedule[sunDateStr][shift]) schedule[sunDateStr][shift] = [];
        schedule[sunDateStr][shift].push(employee.id);
        
        // Mark as assigned to this weekend
        assignedToWeekend.add(employee.id);
        
        // Update hours and stats for both days
        const shiftDuration = shiftDurations[shift];
        
        // Saturday
        employeeHours[employee.id] += shiftDuration;
        employeeStats[employee.id][shift]++;
        employeeStats[employee.id].totalDays++;
        employeeConsecutiveDays[employee.id]++;
        employeeLastShiftType[employee.id] = shift;
        employeeWeekendShifts[employee.id]++;
        
        // Sunday
        employeeHours[employee.id] += shiftDuration;
        employeeStats[employee.id][shift]++;
        employeeStats[employee.id].totalDays++;
        employeeWeekendShifts[employee.id]++;
        // Note: we don't increment consecutive days again until we process regular days
        
        assignedEmployees.push(employee.id);
      }
      
      // Check if minimum staffing is met for weekends
      if (assignedEmployees.length < requiredStaff) {
        // If understaffed, redistribute shifts
        if (shift === 'zwischen') {
          // Skip recording violation as we're going to redistribute
          // Remove the zwischen shift allocation
          delete schedule[satDateStr][shift];
          delete schedule[sunDateStr][shift];
        } else {
          violations.push({
            type: 'understaffed',
            date: satDateStr,
            shift: shift,
            required: requiredStaff,
            assigned: assignedEmployees.length
          });
          
          violations.push({
            type: 'understaffed',
            date: sunDateStr,
            shift: shift,
            required: requiredStaff,
            assigned: assignedEmployees.length
          });
        }
      }
    }
    
    // If zwischen shift is understaffed, redistribute staff to früh and spät
    if (!schedule[satDateStr]['zwischen'] || schedule[satDateStr]['zwischen'].length < minStaffing['zwischen']) {
      // Get employees who weren't assigned yet
      const unassignedEmployees = employees.filter(emp => 
        !assignedToWeekend.has(emp.id) && 
        isEmployeeAvailableOnDay(emp, saturday) && 
        isEmployeeAvailableOnDay(emp, sunday) && 
        !isEmployeeOnSickLeave(emp, saturday) && 
        !isEmployeeOnSickLeave(emp, sunday) &&
        (emp.skills.includes('früh') || emp.skills.includes('spät'))
      );
      
      // Sort by priority
      const sortedForRedistribution = unassignedEmployees.sort((a, b) => {
        // Check weekend limits
        const aMaxWeekends = a.workload > 50 ? 2 : 1;
        const bMaxWeekends = b.workload > 50 ? 2 : 1;
        
        const aWeekendCount = employeeWeekendShifts[a.id];
        const bWeekendCount = employeeWeekendShifts[b.id];
        
        if (aWeekendCount >= aMaxWeekends && bWeekendCount < bMaxWeekends) {
          return 1;
        }
        if (bWeekendCount >= bMaxWeekends && aWeekendCount < aMaxWeekends) {
          return -1;
        }
        
        return aWeekendCount - bWeekendCount;
      });
      
      // Try to fill früh first, then spät
      for (const shift of ['früh', 'spät']) {
        const currentCount = schedule[satDateStr][shift] ? schedule[satDateStr][shift].length : 0;
        const neededMore = Math.max(0, minStaffing[shift] - currentCount);
        
        if (neededMore > 0) {
          const eligibleEmployees = sortedForRedistribution.filter(emp => 
            emp.skills.includes(shift) && !assignedToWeekend.has(emp.id)
          );
          
          for (let i = 0; i < neededMore && i < eligibleEmployees.length; i++) {
            const employee = eligibleEmployees[i];
            
            // Check if employee would exceed weekend limit
            const maxWeekendShifts = employee.workload > 50 ? 2 : 1;
            if (employeeWeekendShifts[employee.id] + 2 > maxWeekendShifts * 2) {
              continue;
            }
            
            // Assign to Saturday
            if (!schedule[satDateStr][shift]) schedule[satDateStr][shift] = [];
            schedule[satDateStr][shift].push(employee.id);
            
            // Assign to Sunday
            if (!schedule[sunDateStr][shift]) schedule[sunDateStr][shift] = [];
            schedule[sunDateStr][shift].push(employee.id);
            
            // Mark as assigned
            assignedToWeekend.add(employee.id);
            
            // Update hours and stats for both days
            const shiftDuration = shiftDurations[shift];
            
            // Saturday
            employeeHours[employee.id] += shiftDuration;
            employeeStats[employee.id][shift]++;
            employeeStats[employee.id].totalDays++;
            employeeConsecutiveDays[employee.id]++;
            employeeLastShiftType[employee.id] = shift;
            employeeWeekendShifts[employee.id]++;
            
            // Sunday
            employeeHours[employee.id] += shiftDuration;
            employeeStats[employee.id][shift]++;
            employeeStats[employee.id].totalDays++;
            employeeWeekendShifts[employee.id]++;
          }
        }
      }
    }
  }

  // Now process regular days
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dateStr = format(date, 'yyyy-MM-dd');
    const isWeekendDay = isWeekend(date);
    
    // Skip if we've already processed this date as part of a weekend pair
    if (schedule[dateStr] && Object.keys(schedule[dateStr]).length > 0) {
      continue;
    }
    
    // Skip holidays
    if (isHoliday(date, settings.holidays)) {
      schedule[dateStr] = {};
      continue;
    }
    
    schedule[dateStr] = {};
    
    // Get minimum staffing requirements
    const minStaffing = isWeekendDay ? settings.minStaffing.weekend : settings.minStaffing.weekday;
    
    // Track who is already assigned today
    const assignedToday = new Set();
    
    // Assign shifts for this day
    for (const shift of SHIFTS) {
      const requiredStaff = minStaffing[shift];
      const availableEmployees = getAvailableEmployees(
        employees, date, shift, schedule, assignedToday, 
        employeeConsecutiveDays, employeeLastShiftType, settings
      );
      
      // Sort by priority with improved fairness
      const sortedEmployees = prioritizeEmployeesWithFairness(
        availableEmployees, employeeHours, targetHours, employeeStats,
        dateStr, shift, schedule, settings, employeeWeekendShifts, isWeekendDay
      );
      
      const assignedEmployees = [];
      
      for (let i = 0; i < requiredStaff && i < sortedEmployees.length; i++) {
        const employee = sortedEmployees[i];
        
        // Check if assignment violates rules
        if (!violatesRules(
          employee, dateStr, shift, schedule, assignedToday, 
          employeeConsecutiveDays, employeeLastShiftType, settings
        )) {
          assignedEmployees.push(employee.id);
          assignedToday.add(employee.id);
          
          // Update hours and stats
          const shiftDuration = shiftDurations[shift];
          employeeHours[employee.id] += shiftDuration;
          employeeStats[employee.id][shift]++;
          employeeStats[employee.id].totalDays++;
          employeeConsecutiveDays[employee.id]++;
          employeeLastShiftType[employee.id] = shift;
          
          // Update weekend count if applicable
          if (isWeekendDay) {
            employeeWeekendShifts[employee.id]++;
          }
        }
      }
      
      schedule[dateStr][shift] = assignedEmployees;
      
      // Check if minimum staffing is met
      if (assignedEmployees.length < requiredStaff) {
        // If understaffed, redistribute shifts for zwischen
        if (shift === 'zwischen') {
          // Skip recording violation as we're going to redistribute
          // Remove the zwischen shift allocation
          delete schedule[dateStr][shift];
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
    if (!schedule[dateStr]['zwischen']) {
      // Get employees who weren't assigned yet
      const unassignedEmployees = employees.filter(emp => 
        !assignedToday.has(emp.id) && 
        isEmployeeAvailableOnDay(emp, date) && 
        !isEmployeeOnSickLeave(emp, date) &&
        (emp.skills.includes('früh') || emp.skills.includes('spät'))
      );
      
      // Sort by priority
      const sortedForRedistribution = unassignedEmployees.sort((a, b) => {
        const aCompletionPercent = employeeHours[a.id] / targetHours[a.id];
        const bCompletionPercent = employeeHours[b.id] / targetHours[b.id];
        return aCompletionPercent - bCompletionPercent;
      });
      
      // Try to fill früh first, then spät
      for (const shift of ['früh', 'spät']) {
        const currentCount = schedule[dateStr][shift] ? schedule[dateStr][shift].length : 0;
        const neededMore = Math.max(0, minStaffing[shift] - currentCount);
        
        if (neededMore > 0) {
          const eligibleEmployees = sortedForRedistribution.filter(emp => 
            emp.skills.includes(shift) && !assignedToday.has(emp.id)
          );
          
          for (let i = 0; i < neededMore && i < eligibleEmployees.length; i++) {
            const employee = eligibleEmployees[i];
            
            if (!violatesRules(
              employee, dateStr, shift, schedule, assignedToday, 
              employeeConsecutiveDays, employeeLastShiftType, settings
            )) {
              if (!schedule[dateStr][shift]) schedule[dateStr][shift] = [];
              schedule[dateStr][shift].push(employee.id);
              assignedToday.add(employee.id);
              
              // Update hours and stats
              const shiftDuration = shiftDurations[shift];
              employeeHours[employee.id] += shiftDuration;
              employeeStats[employee.id][shift]++;
              employeeStats[employee.id].totalDays++;
              employeeConsecutiveDays[employee.id]++;
              employeeLastShiftType[employee.id] = shift;
              
              // Update weekend count if applicable
              if (isWeekendDay) {
                employeeWeekendShifts[employee.id]++;
              }
            }
          }
        }
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
    const hourDifference = Math.abs(actualHours - targetHoursForEmp);
    const minuteDifference = Math.round(hourDifference * 60);
    
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
        isOver: actualHours > targetHoursForEmp
      });
    }
  });

  // Prepare schedule data for webhooks if configured
  const scheduleData = {
    month: monthStr,
    schedule,
    employees: employees.map(emp => ({ id: emp.id, name: emp.name, workload: emp.workload })),
    violations,
    employeeStats,
    employeeHours,
    targetHours,
    employeeWeekendShifts,
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
    employeeWeekendShifts,
    errors: []
  };
}

function getShiftDuration(shift, settings) {
  const shiftConfig = settings.shifts[shift];
  return shiftConfig.hours + (shiftConfig.minutes / 60);
}

function getAvailableEmployees(employees, date, shift, schedule, assignedToday, 
                              employeeConsecutiveDays, employeeLastShiftType, settings) {
  return employees.filter(emp => {
    // Check if already assigned today
    if (assignedToday.has(emp.id)) return false;
    
    // Check if employee has the required skill
    if (!emp.skills.includes(shift)) return false;
    
    // Check if employee is available on this day of the week
    if (!isEmployeeAvailableOnDay(emp, date)) return false;
    
    // Check if employee is on sick leave
    if (isEmployeeOnSickLeave(emp, date)) return false;
    
    // Check consecutive days limit (now using employee-specific value)
    if (employeeConsecutiveDays[emp.id] >= emp.maxConsecutiveDays) return false;
    
    // Check if enough days off after a block of shifts
    const dateStr = format(date, 'yyyy-MM-dd');
    const daysOff = calculateDaysOffBetweenBlocks(schedule, emp.id, dateStr);
    const wasWorkingBefore = daysOff < settings.rules.minDaysOffBetweenBlocks && daysOff > 0;
    
    if (wasWorkingBefore && employeeConsecutiveDays[emp.id] === 0) {
      if (daysOff < settings.rules.minDaysOffBetweenBlocks) {
        return false;
      }
    }
    
    // Check preferences
    const preference = emp.preferences.find(p => p.date === format(date, 'yyyy-MM-dd'));
    if (preference) {
      if (preference.type === 'frei') return false;
      if (preference.type !== shift) return false;
    }
    
    return true;
  });
}

function prioritizeEmployeesWithFairness(employees, employeeHours, targetHours, employeeStats, 
                                        date, shift, schedule, settings, employeeWeekendShifts, isWeekendDay) {
  return employees.sort((a, b) => {
    // If it's a weekend day, check weekend allocation limits
    if (isWeekendDay) {
      const aMaxWeekends = a.workload > 50 ? 2 : 1;
      const bMaxWeekends = b.workload > 50 ? 2 : 1;
      
      const aWeekendCount = employeeWeekendShifts[a.id];
      const bWeekendCount = employeeWeekendShifts[b.id];
      
      // If one is at limit but the other isn't
      if (aWeekendCount >= aMaxWeekends && bWeekendCount < bMaxWeekends) {
        return 1; // Prioritize b
      }
      if (bWeekendCount >= bMaxWeekends && aWeekendCount < aMaxWeekends) {
        return -1; // Prioritize a
      }
    }
    
    // Calculate shift distribution fairness - prioritize employees with less of this shift type
    const aShiftRatio = employeeStats[a.id][shift] / Math.max(1, employeeStats[a.id].totalDays);
    const bShiftRatio = employeeStats[b.id][shift] / Math.max(1, employeeStats[b.id].totalDays);
    
    // If there's a significant difference in shift distribution, prioritize fairness
    if (Math.abs(aShiftRatio - bShiftRatio) > 0.2) {
      return aShiftRatio - bShiftRatio;
    }
    
    // Calculate how far each employee is from meeting their target hours
    const aRemainingPercent = 1 - (employeeHours[a.id] / targetHours[a.id]);
    const bRemainingPercent = 1 - (employeeHours[b.id] / targetHours[b.id]);
    
    // Prioritize employees who have more hours to fulfill
    if (Math.abs(aRemainingPercent - bRemainingPercent) > 0.05) {
      return bRemainingPercent - aRemainingPercent;
    }
    
    // Check preferences
    const aPreference = a.preferences.find(p => p.date === date && p.type === shift);
    const bPreference = b.preferences.find(p => p.date === date && p.type === shift);
    
    if (aPreference && !bPreference) return -1;
    if (!aPreference && bPreference) return 1;
    
    // Finally, prioritize by workload percentage (higher workload gets priority)
    return b.workload - a.workload;
  });
}

function violatesRules(employee, date, shift, schedule, assignedToday, 
                     employeeConsecutiveDays, employeeLastShiftType, settings) {
  // Check if already assigned today
  if (assignedToday.has(employee.id)) return true;
  
  // Check consecutive days (using employee-specific limit)
  if (employeeConsecutiveDays[employee.id] >= employee.maxConsecutiveDays) return true;
  
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
  
  // Check if employee is available on this day of the week
  if (!isEmployeeAvailableOnDay(employee, currentDate)) {
    return true;
  }
  
  // Check if employee is on sick leave
  if (isEmployeeOnSickLeave(employee, currentDate)) {
    return true;
  }
  
  // Check if enough days off after a block of shifts
  const daysOff = calculateDaysOffBetweenBlocks(schedule, employee.id, date);
  const wasWorkingBefore = daysOff < settings.rules.minDaysOffBetweenBlocks && daysOff > 0;
  
  if (wasWorkingBefore && employeeConsecutiveDays[employee.id] === 0) {
    if (daysOff < settings.rules.minDaysOffBetweenBlocks) {
      return true;
    }
  }
  
  return false;
}