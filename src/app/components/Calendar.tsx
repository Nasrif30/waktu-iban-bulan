'use client';

import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from 'date-fns';
import { getMonthCalendar, getPrayerTimes } from '../utils/api';
import Link from 'next/link';

interface CalendarDay {
  gregorian: Date;
  hijri?: {
    date: string;
    day: string;
    month: {
      number: number;
      en: string;
    };
    year: string;
  };
}

interface PrayerTime {
  name: string;
  time: string;
  timeRemaining?: string;
  isNext?: boolean;
}

function parseTime(timeStr: string): Date | null {
  if (!timeStr || typeof timeStr !== 'string' || !timeStr.trim()) {
    return null;
  }

  try {
    const today = new Date();
    const [hours, minutes] = timeStr.split(':').map(Number);
    
    if (isNaN(hours) || isNaN(minutes)) {
      return null;
    }

    return new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      hours,
      minutes
    );
  } catch (error) {
    console.error('Error parsing time:', timeStr, error);
    return null;
  }
}

function getTimeRemaining(prayerTime: string): string {
  try {
    const now = new Date();
    const prayerDate = parseTime(prayerTime);
    
    if (!prayerDate || prayerDate <= now) {
      return '';
    }

    const diff = prayerDate.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  } catch (error) {
    console.error('Error calculating time remaining:', error);
    return '';
  }
}

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime[]>([]);

  // Update prayer times and countdown
  useEffect(() => {
    async function fetchPrayerTimes() {
      try {
        const response = await getPrayerTimes(new Date());
        const timings = response.data.timings;
        
        const prayers: PrayerTime[] = [
          { name: 'Fajr', time: timings.Fajr || '' },
          { name: 'Sunrise', time: timings.Sunrise || '' },
          { name: 'Dhuhr', time: timings.Dhuhr || '' },
          { name: 'Asr', time: timings.Asr || '' },
          { name: 'Maghrib', time: timings.Maghrib || '' },
          { name: 'Isha', time: timings.Isha || '' }
        ].filter(prayer => prayer.time !== '');

        // Calculate remaining time for each prayer
        let foundNext = false;
        const updatedPrayers = prayers.map(prayer => {
          try {
            const remaining = getTimeRemaining(prayer.time);
            if (!foundNext && remaining) {
              foundNext = true;
              return { ...prayer, timeRemaining: remaining, isNext: true };
            }
            return { ...prayer, timeRemaining: remaining, isNext: false };
          } catch (error) {
            console.error('Error processing prayer time:', prayer.name, error);
            return prayer;
          }
        });
        
        setPrayerTimes(updatedPrayers);
      } catch (error) {
        console.error('Error fetching prayer times:', error);
      }
    }

    fetchPrayerTimes();
    const interval = setInterval(fetchPrayerTimes, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch calendar data
  useEffect(() => {
    async function fetchCalendarData() {
      try {
        setLoading(true);
        setError('');

        const month = currentDate.getMonth() + 1;
        const year = currentDate.getFullYear();
        const response = await getMonthCalendar(month, year);
        
        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);
        const days = eachDayOfInterval({ start, end });

        const mappedDays = days.map(day => {
          const formattedDate = format(day, 'dd-MM-yyyy');
          const hijriData = response.data.find(d => d.gregorian.date === formattedDate);
          
          return {
            gregorian: day,
            hijri: hijriData ? {
              date: hijriData.hijri.date,
              day: hijriData.hijri.day,
              month: hijriData.hijri.month,
              year: hijriData.hijri.year
            } : undefined
          };
        });

        setCalendarDays(mappedDays);
        setLoading(false);
      } catch (err) {
        console.error('Calendar error:', err);
        setError('Failed to fetch calendar data');
        setLoading(false);
      }
    }

    fetchCalendarData();
  }, [currentDate]);

  const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] text-white flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-xl mb-4">Loading Calendar...</div>
          <div className="animate-pulse">⏳</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] text-white flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-red-500 text-xl mb-4">⚠ {error}</div>
          <button
            onClick={() => {
              setError('');
              setLoading(true);
              setCurrentDate(new Date());
            }}
            className="px-6 py-2 bg-[#374151] hover:bg-[#4B5563] rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto p-4">
        {/* Bismillah Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-arabic mb-3 font-bold">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</h1>
          <p className="text-gray-400 text-lg">Waktu Pagsambahayang iban Bulan</p>
        </div>

        {/* Prayer Times Section */}
        <div className="mb-8 bg-[var(--secondary)] rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4 text-center">Prayer Times</h2>
          <h3 className="text-lg font-bold mb-4 text-center">Bongao, Tawi-Tawi</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {prayerTimes.map((prayer) => (
              <div 
                key={prayer.name} 
                className={`prayer-card ${prayer.isNext ? 'next' : ''}`}
              >
                <div className="text-lg font-bold">{prayer.name}</div>
                <div className="text-gray-400">{prayer.time}</div>
                {prayer.timeRemaining && (
                  <div className={`mt-1 ${prayer.isNext ? 'text-lg font-bold text-green-400' : 'text-sm text-gray-400'}`}>
                    {prayer.isNext && '⏰ '}
                    {prayer.timeRemaining}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => setCurrentDate(prev => subMonths(prev, 1))}
            className="btn"
          >
            Previous Month
          </button>
          <div className="text-center">
            <h2 className="text-2xl font-bold">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <div className="mt-2 text-sm text-gray-400">
              Ramadan Calendar - Coming Soon
            </div>
          </div>
          <button
            onClick={() => setCurrentDate(prev => addMonths(prev, 1))}
            className="btn"
          >
            Next Month
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-4">
          {/* Weekday headers */}
          {weekDays.map(day => (
            <div key={day} className="text-center font-semibold p-2">
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {/* Add empty cells for days before the first of the month */}
          {Array.from({ length: calendarDays[0]?.gregorian.getDay() || 0 }).map((_, index) => (
            <div key={`empty-${index}`} className="calendar-day opacity-0"></div>
          ))}
          {/* Render actual calendar days */}
          {calendarDays.map((day, index) => {
            const isToday = format(day.gregorian, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            const isFriday = day.gregorian.getDay() === 5;

            return (
              <div
                key={index}
                className={`calendar-day ${isToday ? 'today' : ''} ${isFriday ? 'friday' : ''}`}
              >
                <div className="text-lg">{format(day.gregorian, 'd')}</div>
                {day.hijri && (
                  <div className="text-sm text-gray-400">
                    <div>{day.hijri.day} {day.hijri.month.en}</div>
                    <div>{day.hijri.year} AH</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
} 