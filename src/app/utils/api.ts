'use client';

import axios from 'axios';
import { format } from 'date-fns';
import { ApiResponse, CalendarApiResponse, CalendarDay } from '../types';

const ALADHAN_BASE_URL = 'https://api.aladhan.com/v1';
const ISLAMIC_FINDER_BASE_URL = 'https://www.islamicfinder.us/index.php/api';

// Default coordinates for Malaysia
const DEFAULT_LOCATION = {
  latitude: 1.4854094669440312,
  longitude: 110.35411071777344,
  method: 3, // ISNA
  hijriAdjustment: 0,
  timezone: 'Asia/Kuching'
} as const;

const ISLAMIC_MONTHS = {
  RAMADAN: 9
} as const;

interface HijriCalendarDay {
  gregorian: {
    date: string;
    format: string;
    day: string;
    weekday: { en: string };
    month: {
      number: number;
      en: string;
    };
    year: string;
    designation: { abbreviated: string; expanded: string };
  };
  hijri: {
    date: string;
    format: string;
    day: string;
    weekday: { en: string; ar: string };
    month: {
      number: number;
      en: string;
      ar: string;
    };
    year: string;
    designation: { abbreviated: string; expanded: string };
    holidays: string[];
  };
}

interface VerificationResult {
  datesMatch: boolean;
  primaryDates?: unknown;
  secondaryDates?: unknown;
}

// Type guard to check if data is a valid calendar day
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

// Utility function to handle API requests with retries
async function fetchWithRetry(url: string, params: Record<string, string | number>, retries = 3): Promise<any> {
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

// Format time to 24-hour format
function formatTime(time: string): string {
  if (!time) return '';
  return time.replace(/[APap][Mm]$/, '').trim();
}

// Get the Hijri year for a given Gregorian date
async function findRamadanYear(gregorianYear: number): Promise<number> {
  try {
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

// Get Gregorian to Hijri calendar for a specific month
export async function getMonthCalendar(
  month: number,
  year: number,
  adjustment: number = DEFAULT_LOCATION.hijriAdjustment
): Promise<CalendarApiResponse> {
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
      data: data.data as CalendarDay[]
    };
  } catch (error) {
    console.error('Error fetching calendar:', error);
    throw new Error('Failed to fetch calendar data. Please try again later.');
  }
}

// Get Ramadan calendar for a specific year
export async function getRamadanCalendar(
  gregorianYear: number,
  adjustment: number = DEFAULT_LOCATION.hijriAdjustment
): Promise<CalendarApiResponse> {
  try {
    const hijriYear = await findRamadanYear(gregorianYear);
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
    };
  } catch (error) {
    console.error('Error fetching Ramadan calendar:', error);
    throw new Error('Failed to fetch Ramadan calendar. Please try again later.');
  }
}

// Get prayer times for a specific date
export async function getPrayerTimes(date: Date = new Date()): Promise<ApiResponse> {
  try {
    const params = {
      latitude: DEFAULT_LOCATION.latitude.toString(),
      longitude: DEFAULT_LOCATION.longitude.toString(),
      timezone: DEFAULT_LOCATION.timezone,
      method: DEFAULT_LOCATION.method.toString(),
      time_format: '0',
      juristic: '0',
      high_latitude: '1',
      date: format(date, 'yyyy-MM-dd')
    };
    
    const prayerData = await fetchWithRetry(
      `${ISLAMIC_FINDER_BASE_URL}/prayer_times`,
      params
    );
    
    if (!prayerData?.results) {
      throw new Error('Invalid prayer times response format');
    }

    const hijriData = await fetchWithRetry(
      `${ALADHAN_BASE_URL}/gToH/${format(date, 'dd-MM-yyyy')}`,
      {}
    );

    if (!hijriData?.data?.hijri) {
      throw new Error('Invalid Hijri date response format');
    }

    const timings = {
      Fajr: formatTime(prayerData.results.Fajr),
      Sunrise: formatTime(prayerData.results.Sunrise),
      Dhuhr: formatTime(prayerData.results.Dhuhr),
      Asr: formatTime(prayerData.results.Asr),
      Maghrib: formatTime(prayerData.results.Maghrib),
      Isha: formatTime(prayerData.results.Isha)
    };

    const validTimings = Object.fromEntries(
      Object.entries(timings).filter(([, time]) => time !== '')
    ) as Record<string, string>;

    return {
      code: 200,
      status: 'OK',
      data: {
        timings: {
          Fajr: validTimings.Fajr || '',
          Dhuhr: validTimings.Dhuhr || '',
          Asr: validTimings.Asr || '',
          Maghrib: validTimings.Maghrib || '',
          Isha: validTimings.Isha || ''
        },
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
    };
  } catch (error) {
    console.error('Error fetching prayer times:', error);
    throw new Error('Failed to fetch prayer times. Please try again later.');
  }
}

// Function to verify Ramadan dates
export async function verifyRamadanDates(year: number): Promise<VerificationResult> {
  try {
    const [primaryData, secondaryData] = await Promise.all([
      getRamadanCalendar(year),
      getRamadanCalendar(year, DEFAULT_LOCATION.hijriAdjustment + 1)
    ]);

    if (!Array.isArray(primaryData.data)) {
      throw new Error('Invalid primary data format');
    }

    const primaryDaysCount = primaryData.data.length;
    const datesMatch = primaryDaysCount === 29 || primaryDaysCount === 30;

    return {
      primaryDates: primaryData,
      secondaryDates: secondaryData,
      datesMatch
    };
  } catch (error) {
    console.error('Error verifying Ramadan dates:', error);
    return { datesMatch: false };
  }
} 