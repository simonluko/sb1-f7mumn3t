import { BUSINESS_HOURS } from './constants';

/**
 * Calculates end time and duration based on start time and selected duration
 * @param startTime ISO datetime string
 * @param durationString Duration string (e.g., "3 hours", "Full day (8 hours)")
 * @returns Object containing end time and formatted duration
 */
export const calculateEndTimeAndDuration = (startTime: string, durationString: string): { 
  endTime: string;
  duration: string;
} => {
  // Extract hours from duration string
  let hours = 0;
  
  if (durationString.includes('Full day')) {
    hours = 8;
  } else if (durationString.includes('Multiple days')) {
    hours = 24;
  } else {
    const match = durationString.match(/(\d+)\s*hours?/);
    if (match) {
      hours = parseInt(match[1], 10);
    }
  }
  
  // Calculate end time
  const startDate = new Date(startTime);
  const endDate = new Date(startDate.getTime() + hours * 60 * 60 * 1000);
  
  // Format end time to match ISO 8601 format with Z suffix
  const endTimeFormatted = endDate.toISOString().split('.')[0] + 'Z';
  
  // Format duration as HH:mm
  const durationFormatted = `${hours.toString().padStart(2, '0')}:00`;
  
  return {
    endTime: endTimeFormatted,
    duration: durationFormatted
  };
};

/**
 * Formats a date and time for webhook submission
 * @param date ISO date string (YYYY-MM-DD)
 * @param time Time string (e.g., "09:30" or "14:30")
 * @returns ISO datetime string for Google Calendar
 */
export const formatDateTimeForWebhook = (date: string, time: string): string => {
  try {
    // Ensure time is in 24-hour format with leading zeros
    const [hours, minutes] = time.split(':').map(num => num.padStart(2, '0'));

    // Format directly to ISO 8601 format with Z suffix to indicate UTC
    return `${date}T${hours}:${minutes}:00Z`;
  } catch (error) {
    console.error('Error formatting date/time:', error);
    // Return a fallback format if parsing fails
    return `${date}T${time}:00.000Z`;
  }
};

/**
 * Generates default time slots in 30-minute intervals
 * @returns Array of time slots from 9:00 AM to 8:00 PM
 */
// Helper function to check if a time slot is before the minimum buffer time
const isBeforeMinimumBuffer = (timeSlot: string, date: string): boolean => {
  // Get current time in UTC
  const now = new Date();
  const utcNow = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
  
  // Convert selected date to UTC
  const selectedDate = new Date(date + 'T00:00:00Z');
  
  // If the selected date is in the future, all time slots are valid
  if (selectedDate.getUTCDate() > utcNow.getUTCDate() || 
      selectedDate.getUTCMonth() > utcNow.getUTCMonth() || 
      selectedDate.getUTCFullYear() > utcNow.getUTCFullYear()) {
    return false;
  }
  
  // Convert timeSlot to a Date object for the selected date
  const [hours, minutes] = timeSlot.split(':').map(Number);
  const slotTime = new Date(selectedDate.getTime());
  slotTime.setUTCHours(hours, minutes, 0, 0);
  
  // Calculate the minimum buffer time (current time + 30 minutes)
  const bufferTime = new Date(utcNow.getTime());
  bufferTime.setUTCMinutes(bufferTime.getUTCMinutes() + 30);
  
  // Round up to the next 30-minute interval
  const remainder = bufferTime.getUTCMinutes() % 30;
  if (remainder > 0) {
    bufferTime.setUTCMinutes(bufferTime.getUTCMinutes() + (30 - remainder));
  }
  
  return slotTime < bufferTime;
};

export const generateDefaultTimeSlots = () => {
  const slots = [];
  
  // Default to Monday's hours if no date is provided
  const dayOfWeek = 1;
  const { start, end } = BUSINESS_HOURS[dayOfWeek as keyof typeof BUSINESS_HOURS];
  
  // Generate slots based on business hours
  for (let hour = start; hour < end; hour++) {
    const displayHour = hour.toString().padStart(2, '0');
    
    // Generate slots in 30-minute intervals
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${displayHour}:${minute.toString().padStart(2, '0')}`;
      
      // Check if this time slot is before the minimum buffer time
      const isTooSoon = isBeforeMinimumBuffer(time, new Date().toISOString().split('T')[0]);
      
      slots.push({
        time,
        available: !isTooSoon
      });
    }
  }
  
  return slots;
};

export const formatTimeForDisplay = (time: string): string => {
  if (!time) return '';
  
  const [hours, minutes] = time.split(':').map(Number);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

export const formatTimeForStorage = (time: string): string => {
  if (!time) return '';
  
  if (time.match(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)) {
    return time;
  }
  
  const match = time.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (!match) return time;
  
  let [_, hours, minutes, period] = match;
  let hour = parseInt(hours, 10);
  
  if (period.toUpperCase() === 'PM' && hour < 12) hour += 12;
  if (period.toUpperCase() === 'AM' && hour === 12) hour = 0;
  
  return `${hour.toString().padStart(2, '0')}:${minutes.padStart(2, '0')}`;
};

/**
 * Validates an Irish phone number
 * @param phone Phone number to validate
 * @returns Boolean indicating if the phone number is valid
 */
export const validateIrishPhone = (phone: string): boolean => {
  // Remove spaces for validation
  const cleanPhone = phone.replace(/\s/g, '');
  const phoneRegex = /^08[0-9][0-9]{7}$/;
  return phoneRegex.test(cleanPhone);
};

/**
 * Formats a date for display
 * @param dateString ISO date string (YYYY-MM-DD)
 * @returns Formatted date string (e.g., "Monday, January 1, 2024")
 */
export const formatDateForDisplay = (dateString: string): string => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Gets the next 30 days starting from today
 * @returns Array of date objects for the next 30 days
 */
export const getNext30Days = () => {
  const days = [];
  const today = new Date();
  
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    days.push(date);
  }
  
  return days;
};

/**
 * Parses webhook response and formats time slots
 * @param data Response data from webhook
 * @param selectedDateISO Selected date in ISO format (YYYY-MM-DD)
 * @returns Array of formatted time slots
 */
export const parseWebhookTimeSlots = (data: any, selectedDateISO: string): { time: string, available: boolean }[] => {
  try {
    // Normalize the response into an events array
    const events = Array.isArray(data) ? data : 
      data?.bookedTimes?.map((time: string) => ({ start: { dateTime: time } })) || [];

    if (!events.length || !selectedDateISO) {
      return generateDefaultTimeSlots();
    }
    
    const bookedTimesByDate: Record<string, Set<string>> = {};
    
    events.forEach((event: any) => {
      if (!event.start || !event.start.dateTime) return;
      
      const eventStart = new Date(event.start.dateTime);
      const eventDateISO = eventStart.toISOString().split('T')[0];
      
      if (!bookedTimesByDate[eventDateISO]) {
        bookedTimesByDate[eventDateISO] = new Set();
      }
      
      const startTime = eventStart.toISOString().substring(11, 16);
      bookedTimesByDate[eventDateISO].add(startTime);
    });
    
    // Get booked times for the selected date
    const bookedTimes = bookedTimesByDate[selectedDateISO] || new Set();
    
    // Get business hours for the selected date
    const selectedDay = new Date(selectedDateISO).getDay();
    const { start, end } = BUSINESS_HOURS[selectedDay as keyof typeof BUSINESS_HOURS];

    // Generate time slots for the selected date's business hours
    const slots = [];
    for (let hour = start; hour < end; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push({ time, available: !bookedTimes.has(time) });
      }
    }
    
    return slots;
  } catch (error) {
    console.error('Error parsing webhook response:', error);
    return generateDefaultTimeSlots();
  }
};

/**
 * Formats selected services for webhook submission
 * @param selectedServices Array of service IDs
 * @param servicesList Array of service objects
 * @returns Object with individual service properties
 */
export const formatSelectedServices = (selectedServices: string[], servicesList: any[]): Record<string, string> => {
  const result: Record<string, string> = {};
  
  selectedServices.forEach((serviceId, index) => {
    const service = servicesList.find(s => s.id === serviceId);
    if (service) {
      result[`service${index + 1}`] = service.name;
    }
  });
  
  return result;
};