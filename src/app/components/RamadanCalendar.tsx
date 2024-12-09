'use client';

import { useState, useEffect } from 'react';
import { RamadanDay } from '../types';
import { getRamadanCalendar, getPrayerTimes, verifyRamadanDates } from '../utils/api';

export default function RamadanCalendar() {
  const [ramadanDays, setRamadanDays] = useState<RamadanDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState(2025);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verified' | 'mismatch'>('pending');

  useEffect(() => {
    let isMounted = true;

    async function fetchCalendar() {
      try {
        if (!isMounted) return;
        setLoading(true);
        setError('');
        setVerificationStatus('pending');

        // Verify Ramadan dates
        const verification = await verifyRamadanDates(selectedYear).catch((err) => {
          console.warn('Verification failed:', err);
          return { datesMatch: false };
        });
        
        if (!isMounted) return;
        setVerificationStatus(verification.datesMatch ? 'verified' : 'mismatch');

        // Get Ramadan calendar data
        const response = await getRamadanCalendar(selectedYear);
        if (!isMounted) return;
        
        if (!Array.isArray(response.data) || response.data.length === 0) {
          throw new Error('No Ramadan days found for the selected year');
        }

        // Process each Ramadan day
        const formattedDays = [];
        for (let i = 0; i < response.data.length; i++) {
          const day = response.data[i];
          try {
            const dateParts = day.gregorian.date.split('-');
            const prayerDate = new Date(
              parseInt(dateParts[2]),
              parseInt(dateParts[1]) - 1,
              parseInt(dateParts[0])
            );

            const prayerTimesResponse = await getPrayerTimes(prayerDate);
            const timings = prayerTimesResponse.data.timings;

            formattedDays.push({
              date: day.gregorian.date,
              hijriDate: `${day.hijri.day} ${day.hijri.month.en} ${day.hijri.year}`,
              gregorianDate: `${day.gregorian.day} ${day.gregorian.month.en}`,
              dayOfWeek: day.gregorian.weekday?.en || '',
              ramadanDay: i + 1,
              isFirstDay: i === 0,
              isLailatulQadr: [21, 23, 25, 27, 29].includes(i + 1),
              prayerTimes: {
                fajr: timings.Fajr,
                dhuhr: timings.Dhuhr,
                asr: timings.Asr,
                maghrib: timings.Maghrib,
                isha: timings.Isha,
              }
            });

            // Update progress every 5 days
            if (i % 5 === 0 && isMounted) {
              setRamadanDays([...formattedDays]);
            }
          } catch (error) {
            console.error('Error processing day:', error);
            // Skip days with errors
            continue;
          }
        }

        if (!isMounted) return;
        setRamadanDays(formattedDays);
        setLoading(false);
      } catch (err) {
        if (!isMounted) return;
        console.error('Calendar error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch Ramadan calendar');
        setLoading(false);
      }
    }

    fetchCalendar();

    return () => {
      isMounted = false;
    };
  }, [selectedYear]);

  if (loading && ramadanDays.length === 0) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] text-white flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-xl mb-4">Loading Ramadan Calendar...</div>
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
              setVerificationStatus('pending');
              const year = selectedYear;
              setSelectedYear(0);
              setTimeout(() => setSelectedYear(year), 100);
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
    <div className="bg-[#1a1a1a] text-white">
      {/* Year Selection */}
      <div className="flex items-center justify-between p-4 bg-[#1f2937]">
        <button
          onClick={() => setSelectedYear(prev => prev - 1)}
          className="px-6 py-2 bg-[#374151] hover:bg-[#4B5563] rounded-lg transition-colors"
        >
          Previous Year
        </button>
        <div className="flex flex-col items-center">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-4 py-2 bg-[#374151] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Array.from({ length: 11 }, (_, i) => 2020 + i).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          {/* Verification Status */}
          <div className={`mt-2 px-3 py-1 rounded-full text-sm ${
            verificationStatus === 'verified' 
              ? 'bg-green-500' 
              : verificationStatus === 'mismatch' 
                ? 'bg-yellow-500' 
                : 'bg-gray-500'
          }`}>
            {verificationStatus === 'verified' 
              ? '✓ Ramadan Dates Verified' 
              : verificationStatus === 'mismatch' 
                ? '⚠ Date Verification Needed' 
                : '⋯ Verifying Dates'}
          </div>
        </div>
        <button
          onClick={() => setSelectedYear(prev => prev + 1)}
          className="px-6 py-2 bg-[#374151] hover:bg-[#4B5563] rounded-lg transition-colors"
        >
          Next Year
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        <div className="grid grid-cols-7 gap-4">
          {ramadanDays.map((day) => (
            <div
              key={day.date}
              className={`p-4 rounded-lg ${
                day.isLailatulQadr ? 'bg-purple-900' : 'bg-[#2d2d2d]'
              } ${day.isFirstDay ? 'ring-2 ring-green-500' : ''}`}
            >
              <div className="text-lg font-bold">Day {day.ramadanDay}</div>
              <div className="text-sm text-gray-400">{day.gregorianDate}</div>
              <div className="text-sm text-gray-400">{day.dayOfWeek}</div>
              <div className="mt-2 text-xs">
                <div>Fajr: {day.prayerTimes.fajr}</div>
                <div>Maghrib: {day.prayerTimes.maghrib}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Watermark */}
      <div className="mt-8 text-center text-gray-500 text-sm">
        Made by alnasrif JH
      </div>
    </div>
  );
} 