'use client';

import RamadanCalendar from '../components/RamadanCalendar';
import Link from 'next/link';

export default function RamadanPage() {
  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-8">
          <Link 
            href="/"
            className="px-6 py-2 bg-[#374151] hover:bg-[#4B5563] rounded-lg transition-colors text-white"
          >
            ← Back to Calendar
          </Link>
          <h1 className="text-3xl font-bold text-white">Ramadan Calendar</h1>
          <div className="w-[100px]"></div> {/* Spacer for alignment */}
        </div>
        <RamadanCalendar />
      </div>
    </div>
  );
} 