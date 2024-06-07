import React from 'react';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';

export default function Sidebar() {
  return (
    <div className="relative w-64 p-4">
      <h2 className="text-xl font-bold mb-4">Recruitment Cycles</h2>
      <ul>
        <li>
          <div>{"hello"}</div>
        </li>
        <li>
          <div>{"hello"}</div>
        </li>
        {/* Add more links as needed */}
      </ul>
      <Separator orientation="vertical" className="absolute right-0 top-0 h-full border-l" />
    </div>
  );
}
