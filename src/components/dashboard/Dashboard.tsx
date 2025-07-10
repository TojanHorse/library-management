import React from 'react';
import { StatsCards } from './StatsCards';
import { RecentActivity } from './RecentActivity';
import { SeatOverview } from './SeatOverview';
import { Header } from '../layout/Header';

export function Dashboard() {
  return (
    <div className="flex-1 overflow-auto">
      <Header 
        title="Dashboard" 
        subtitle="Welcome to your seat management system overview"
      />
      
      <div className="p-4 lg:p-6">
        <StatsCards />
        
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <SeatOverview />
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}