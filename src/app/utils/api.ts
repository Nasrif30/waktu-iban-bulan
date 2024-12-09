'use client';

import axios from 'axios';
import { ApiResponse, CalendarApiResponse, CalendarDay } from '../types';
import { format } from 'date-fns';

const ALADHAN_BASE_URL = 'https://api.aladhan.com/v1';
const ISLAMIC_FINDER_BASE_URL = 'https://www.islamicfinder.us/index.php/api';

// Default coordinates for Malaysia
const DEFAULT_LOCATION = {
  latitude: 1.4854094669440312,
  longitude: 110.35411071777344,
  method: 3, // ISNA
  hijriAdjustment: 0,
  timezone: 'Asia/Kuching'
};

// Constants for Islamic months
const ISLAMIC_MONTHS = {
  RAMADAN: 9
} as const;

interface IslamicFinderPrayerTimes {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  date: string;
  timezone: string;
  method: number;
}

interface HijriCalendarDay {
  gregorian: {
    date: string;
    format: string;
    day: string;
    weekday: {
      en: string;
    };
    month: {
      number: number;
      en: string;
    };
    year: string;
    designation: {
      abbreviated: string;
      expanded: string;
    };
  };
  hijri: {
    date: string;
    format: string;
    day: string;
    weekday: {
      en: string;
      ar: string;
    };
    month: {
      number: number;
      en: string;
      ar: string;
    };
    year: string;
    designation: {
      abbreviated: string;
      expanded: string;
    };
    holidays: string[];
  };
}

interface CalendarApiResponse {
  code: number;
  status: string;
  data: HijriCalendarDay[];
}

function isValidCalendarDay(data: unknown): data is HijriCalendarDay {
  if (!data || typeof data !== 'object') return false;
  const day = data as Record<string, unknown>;
  return (
    typeof day.gregorian === 'object' &&
    day.gregorian !== null &&
    typeof day.hijri === 'object' &&
    day.hijri !== null
  );
}

// Get Gregorian to Hijri calendar for a specific month
export async function getMonthCalendar(
  month: number,
  year: number,
  adjustment: number = DEFAULT_LOCATION.hijriAdjustment
) {
  try {
    const params = {
      adjustment: adjustment.toString(),
      latitude: DEFAULT_LOCATION.latitude.toString(),
      longitude: DEFAULT_LOCATION.longitude.toString(),
      method: DEFAULT_LOCATION.method.toString()
    };

    const data = await fetchWithRetry(
      `${ALADHAN_BASE_URL}/gToHCalendar/${month}/${year}`,
      params
    );

    if (!data || data.code !== 200 || !Array.isArray(data.data)) {
      throw new Error('Invalid calendar data received');
    }

    return {
      code: 200,
      status: 'OK',
      data: data.data as HijriCalendarDay[]
    };
  } catch (error) {
    console.error('Error fetching calendar:', error);
    throw new Error('Failed to fetch calendar data. Please try again later.');
  }
}

// Convert a specific Gregorian date to Hijri
export async function convertToHijri(
  date: Date,
  adjustment: number = DEFAULT_LOCATION.hijriAdjustment
) {
  try {
    const formattedDate = format(date, 'dd-MM-yyyy');
    const params = {
      adjustment: adjustment.toString()
    };

    const data = await fetchWithRetry(
      `${ALADHAN_BASE_URL}/gToH/${formattedDate}`,
      params
    );

    if (!data || data.code !== 200 || !data.data) {
      throw new Error('Invalid conversion data received');
    }

    return data;
  } catch (error) {
    console.error('Error converting date:', error);
    throw new Error('Failed to convert date. Please try again later.');
  }
}

// Utility function to handle API requests with retries
async function fetchWithRetry(url: string, params: Record<string, string | number>, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(url, {
        params,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      return response.data;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw new Error('Maximum retries reached');
}

// Type guard to check if data is an array of CalendarDay
function isCalendarDayArray(data: CalendarDay | CalendarDay[]): data is CalendarDay[] {
  return Array.isArray(data);
}

// Get the Hijri year for a given Gregorian date
async function findRamadanYear(gregorianYear: number): Promise<number> {
  try {
    // Try March 1st of the Gregorian year as it's likely to be close to Ramadan
    const marchFirst = `01-03-${gregorianYear}`;
    const response = await fetchWithRetry(
      `${ALADHAN_BASE_URL}/gToH/${marchFirst}`,
      {}
    );

    if (response?.code === 200 && response?.data?.hijri) {
      return parseInt(response.data.hijri.year);
    }
    throw new Error('Failed to convert date');
  } catch (error) {
    // Fallback to approximation if API fails
    return Math.floor(gregorianYear - 622 + (gregorianYear - 622) / 32.5);
  }
}

export async function getRamadanCalendar(
  gregorianYear: number, 
  adjustment: number = DEFAULT_LOCATION.hijriAdjustment
) {
  try {
    // First find the correct Hijri year
    const hijriYear = await findRamadanYear(gregorianYear);
    
    // Try a range of ±1 year to ensure we find Ramadan
    const yearsToTry = [hijriYear - 1, hijriYear, hijriYear + 1];
    let ramadanDays: CalendarDay[] = [];

    for (const year of yearsToTry) {
      const params = {
        adjustment: adjustment.toString(),
        latitude: DEFAULT_LOCATION.latitude.toString(),
        longitude: DEFAULT_LOCATION.longitude.toString(),
        method: DEFAULT_LOCATION.method.toString(),
        month: ISLAMIC_MONTHS.RAMADAN.toString(),
        year: year.toString(),
        annual: "false"
      };
      
      const data = await fetchWithRetry(
        `${ALADHAN_BASE_URL}/hijriCalendar`,
        params
      );
      
      if (data?.code === 200 && Array.isArray(data.data)) {
        const validDays = data.data
          .filter((day: unknown) => isValidCalendarDay(day))
          .map((day: HijriCalendarDay) => ({
            gregorian: {
              date: day.gregorian.date,
              format: day.gregorian.format,
              day: day.gregorian.day,
              weekday: { en: day.gregorian.weekday.en },
              month: {
                number: parseInt(String(day.gregorian.month.number)),
                en: day.gregorian.month.en
              },
              year: day.gregorian.year,
              designation: day.gregorian.designation
            },
            hijri: {
              date: day.hijri.date,
              format: day.hijri.format,
              day: day.hijri.day,
              weekday: {
                en: day.hijri.weekday.en,
                ar: day.hijri.weekday.ar
              },
              month: {
                number: parseInt(String(day.hijri.month.number)),
                en: day.hijri.month.en,
                ar: day.hijri.month.ar
              },
              year: day.hijri.year,
              designation: day.hijri.designation,
              holidays: day.hijri.holidays
            }
          }));

        // Check if these days are for the requested Gregorian year
        const matchingDays = validDays.filter((day: CalendarDay) => 
          day.gregorian.year === gregorianYear.toString()
        );

        if (matchingDays.length >= 29) {
          ramadanDays = matchingDays;
          break;
        }
      }
    }

    if (ramadanDays.length === 0) {
      throw new Error(`No Ramadan days found for year ${gregorianYear}`);
    }

    return {
      code: 200,
      status: 'OK',
      data: ramadanDays
    } as CalendarApiResponse;
  } catch {
    console.error('Error fetching Ramadan calendar');
    throw new Error('Failed to fetch Ramadan calendar. Please try again later.');
  }
}

// Convert time to 24-hour format
function formatTime(time: string | undefined): string {
  if (!time || typeof time !== 'string' || !time.trim()) {
    return '';
  }

  try {
    // If already in 24-hour format (HH:mm)
    if (time.includes(':') && !time.includes(' ')) {
      const [hours, minutes] = time.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes)) {
        return '';
      }
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    // Convert from 12-hour format (hh:mm AM/PM)
    const [timeStr, period] = time.split(' ');
    if (!timeStr || !period) {
      return '';
    }

    const [hours, minutes] = timeStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) {
      return '';
    }

    let hour = hours;
    if (period.toUpperCase() === 'PM' && hours !== 12) {
      hour += 12;
    } else if (period.toUpperCase() === 'AM' && hours === 12) {
      hour = 0;
    }

    return `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  } catch (error) {
    console.error('Error formatting time:', time, error);
    return '';
  }
}

// Get prayer times from Islamic Finder API
export async function getPrayerTimes(date: Date = new Date()) {
  try {
    const params = {
      latitude: DEFAULT_LOCATION.latitude,
      longitude: DEFAULT_LOCATION.longitude,
      timezone: DEFAULT_LOCATION.timezone,
      method: DEFAULT_LOCATION.method,
      time_format: 0, // 24-hour format
      juristic: 0, // Standard (Shafi, Hanbli, Maliki)
      high_latitude: 1, // Midnight
      date: format(date, 'yyyy-MM-dd')
    };
    
    // Get prayer times from Islamic Finder
    const prayerData = await fetchWithRetry(
      `${ISLAMIC_FINDER_BASE_URL}/prayer_times`,
      params
    );
    
    if (!prayerData?.results) {
      throw new Error('Invalid prayer times response format');
    }

    // Get Hijri date for the given date
    const hijriData = await fetchWithRetry(
      `${ALADHAN_BASE_URL}/gToH/${format(date, 'dd-MM-yyyy')}`,
      {}
    );

    if (!hijriData?.data?.hijri) {
      throw new Error('Invalid Hijri date response format');
    }

    // Ensure all times are in 24-hour format and valid
    const timings = {
      Fajr: formatTime(prayerData.results.Fajr),
      Sunrise: formatTime(prayerData.results.Sunrise),
      Dhuhr: formatTime(prayerData.results.Dhuhr),
      Asr: formatTime(prayerData.results.Asr),
      Maghrib: formatTime(prayerData.results.Maghrib),
      Isha: formatTime(prayerData.results.Isha)
    };

    // Only include valid prayer times
    const validTimings = Object.fromEntries(
      Object.entries(timings).filter(([_, time]) => time !== '')
    );

    // Convert to our API format
    return {
      code: 200,
      status: 'OK',
      data: {
        timings: validTimings,
        date: {
          readable: format(date, 'dd MMM yyyy'),
          timestamp: date.getTime().toString(),
          gregorian: {
            date: format(date, 'dd-MM-yyyy'),
            format: 'DD-MM-YYYY',
            day: format(date, 'dd'),
            weekday: format(date, 'EEEE'),
            month: {
              number: parseInt(format(date, 'M')),
              en: format(date, 'MMMM')
            },
            year: format(date, 'yyyy')
          },
          hijri: {
            date: hijriData.data.hijri.date,
            month: {
              number: hijriData.data.hijri.month.number,
              en: hijriData.data.hijri.month.en
            },
            year: hijriData.data.hijri.year
          }
        }
      }
    } as ApiResponse;
  } catch (error) {
    console.error('Error fetching prayer times:', error);
    throw new Error('Failed to fetch prayer times. Please try again later.');
  }
}

// Get prayer times for entire month
export async function getMonthPrayerTimes(date: Date) {
  try {
    const params = {
      latitude: DEFAULT_LOCATION.latitude,
      longitude: DEFAULT_LOCATION.longitude,
      timezone: DEFAULT_LOCATION.timezone,
      method: DEFAULT_LOCATION.method,
      time_format: 1,
      juristic: 0,
      high_latitude: 1,
      date: format(date, 'yyyy-MM-dd'),
      show_entire_month: 1
    };
    
    const data = await fetchWithRetry(
      `${ISLAMIC_FINDER_BASE_URL}/prayer_times`,
      params
    );
    
    if (!data || !data.results) {
      throw new Error('Invalid monthly prayer times response format');
    }

    return data.results;
  } catch (error) {
    console.error('Error fetching monthly prayer times:', error);
    throw new Error('Failed to fetch monthly prayer times. Please try again later.');
  }
}

// Function to verify Ramadan dates
interface VerificationResult {
  datesMatch: boolean;
  primaryDates?: unknown;
  secondaryDates?: unknown;
}

export async function verifyRamadanDates(year: number): Promise<VerificationResult> {
  try {
    const [primaryData, secondaryData] = await Promise.all([
      getRamadanCalendar(year),
      getRamadanCalendar(year, DEFAULT_LOCATION.hijriAdjustment + 1)
    ]);
    
    if (!isCalendarDayArray(primaryData.data)) {
      throw new Error('Invalid primary data format');
    }

    const primaryDaysCount = primaryData.data.length;
    const datesMatch = primaryDaysCount === 29 || primaryDaysCount === 30;
    
    return {
      primaryDates: primaryData,
      secondaryDates: secondaryData,
      datesMatch
    };
  } catch {
    return { datesMatch: false };
  }
} 