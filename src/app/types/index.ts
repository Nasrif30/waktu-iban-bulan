export interface PrayerTimes {
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

export interface RamadanDay {
  date: string;
  hijriDate: string;
  gregorianDate: string;
  dayOfWeek: string;
  ramadanDay: number;
  isFirstDay: boolean;
  isLailatulQadr: boolean;
  prayerTimes: PrayerTimes;
}

export interface Designation {
  abbreviated: string;
  expanded: string;
}

export interface Month {
  number: number;
  en: string;
  ar?: string;
}

export interface Weekday {
  en: string;
  ar?: string;
}

export interface HijriDate {
  date: string;
  format: string;
  day: string;
  weekday?: Weekday;
  month: Month;
  year: string;
  designation: Designation;
  holidays?: string[];
}

export interface GregorianDate {
  date: string;
  format: string;
  day: string;
  weekday?: {
    en: string;
  };
  month: {
    number: number;
    en: string;
  };
  year: string;
  designation: Designation;
}

export interface CalendarDay {
  gregorian: GregorianDate;
  hijri: HijriDate;
}

export interface CalendarApiResponse {
  code: number;
  status: string;
  data: CalendarDay[] | CalendarDay;
}

export interface ApiResponse {
  code: number;
  status: string;
  data: {
    timings: {
      [key: string]: string;
      Fajr: string;
      Dhuhr: string;
      Asr: string;
      Maghrib: string;
      Isha: string;
    };
    date: {
      readable: string;
      timestamp: string;
      gregorian: {
        date: string;
        format: string;
        day: string;
        weekday: string;
        month: {
          number: number;
          en: string;
        };
        year: string;
      };
      hijri: {
        date: string;
        month: {
          number: number;
          en: string;
        };
        year: string;
      };
    };
  };
} 