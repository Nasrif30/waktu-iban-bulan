'use client';

import { useEffect, useState } from 'react';
import { PrayerTimes } from '../types';
import { getPrayerTimes } from '../utils/api';
import { format, parse } from 'date-fns';

export default function TodayPrayers() {
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [nextPrayer, setNextPrayer] = useState<string>('');
  const [countdown, setCountdown] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    async function fetchTodayPrayers() {
      try {
        const response = await getPrayerTimes(new Date());
        const timings = response.data.timings;
        setPrayerTimes({
          fajr: timings.Fajr,
          dhuhr: timings.Dhuhr,
          asr: timings.Asr,
          maghrib: timings.Maghrib,
          isha: timings.Isha,
        });
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch prayer times:', error);
        setError('Failed to fetch prayer times');
        setLoading(false);
      }
    }

    fetchTodayPrayers();
  }, []);

  useEffect(() => {
    if (!prayerTimes) return;

    function updateNextPrayer() {
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');
      
      const times = prayerTimes as PrayerTimes;
      
      const prayers = [
        { name: 'Fajr', time: times.fajr },
        { name: 'Dhuhr', time: times.dhuhr },
        { name: 'Asr', time: times.asr },
        { name: 'Maghrib', time: times.maghrib },
        { name: 'Isha', time: times.isha },
      ];

      let nextPrayerTime: Date | null = null;
      let nextPrayerName = '';

      for (const prayer of prayers) {
        if (!prayer.time) continue;
        
        try {
          const prayerDateTime = parse(
            `${today} ${prayer.time}`,
            'yyyy-MM-dd HH:mm',
            new Date()
          );

          if (prayerDateTime > now) {
            nextPrayerTime = prayerDateTime;
            nextPrayerName = prayer.name;
            break;
          }
        } catch (error) {
          console.error(`Error parsing prayer time: ${prayer.time}`, error);
          continue;
        }
      }

      if (!nextPrayerTime && times.fajr) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        try {
          nextPrayerTime = parse(
            `${format(tomorrow, 'yyyy-MM-dd')} ${times.fajr}`,
            'yyyy-MM-dd HH:mm',
            new Date()
          );
          nextPrayerName = 'Fajr';
        } catch (error) {
          console.error('Error parsing tomorrow\'s Fajr time:', error);
        }
      }

      setNextPrayer(nextPrayerName);

      if (nextPrayerTime) {
        const diff = nextPrayerTime.getTime() - now.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdown(`${hours}:${minutes}:${seconds}`);
      }
    }

    updateNextPrayer();
    const interval = setInterval(updateNextPrayer, 1000);
    return () => clearInterval(interval);
  }, [prayerTimes]);

  if (loading) {
    return <div className="text-gray-400">Loading prayer times...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!prayerTimes) {
    return null;
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-6">
        {Object.entries(prayerTimes).map(([name, time]) => (
          <div 
            key={name}
            className={`flex justify-between items-center p-3 rounded-lg ${
              name === nextPrayer ? 'bg-blue-500 bg-opacity-20' : 'bg-gray-700'
            }`}
          >
            <span className="text-gray-300 capitalize">{name}</span>
            <span className="text-white font-mono">{time}</span>
          </div>
        ))}
      </div>

      {nextPrayer && (
        <div className="mt-6 bg-gray-700 rounded-lg p-4">
          <div className="text-gray-300 mb-2">Next Prayer: {nextPrayer}</div>
          <div className="text-3xl font-mono text-blue-400">{countdown}</div>
        </div>
      )}
    </div>
  );
} 