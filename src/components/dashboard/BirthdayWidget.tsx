"use client";

import React, { useState, useMemo } from "react";
import { Gift, ExternalLink } from "lucide-react";

interface BirthdayWidgetProps {
  students: any[];
  onOpenStudent: (studentId: string, studentData: any) => void;
}

export default function BirthdayWidget({ students, onOpenStudent }: BirthdayWidgetProps) {
  const [activeTab, setActiveTab] = useState<'today' | 'tomorrow' | 'week' | 'month'>('today');

  const { todayList, tomorrowList, weekList, monthList } = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentDate = today.getDate();
    const currentYear = today.getFullYear();
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowMonth = tomorrow.getMonth();
    const tomorrowDate = tomorrow.getDate();

    // Helper to get ISO week number
    const getWeekNumber = (d: Date) => {
        const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        const dayNum = date.getUTCDay() || 7;
        date.setUTCDate(date.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
        return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
    };
    
    const currentWeek = getWeekNumber(today);

    const result = {
      todayList: [] as any[],
      tomorrowList: [] as any[],
      weekList: [] as any[],
      monthList: [] as any[]
    };

    students.forEach(stu => {
      if (!stu.dob) return;
      const dobDate = new Date(stu.dob);
      const bMonth = dobDate.getMonth();
      const bDate = dobDate.getDate();
      const bYear = dobDate.getFullYear();
      
      const turningAge = currentYear - bYear;
      const stuData = { ...stu, turningAge, dobDate };

      // Check today
      if (bMonth === currentMonth && bDate === currentDate) {
        result.todayList.push(stuData);
      }
      
      // Check tomorrow
      if (bMonth === tomorrowMonth && bDate === tomorrowDate) {
        result.tomorrowList.push(stuData);
      }
      
      // Check this month
      if (bMonth === currentMonth) {
        result.monthList.push(stuData);
      }
      
      // Check this week
      // Create a date for this year's birthday
      const thisYearBirthday = new Date(currentYear, bMonth, bDate);
      if (getWeekNumber(thisYearBirthday) === currentWeek) {
        result.weekList.push(stuData);
      }
    });
    
    // Sort logic (sort by date ascending)
    const sortByDate = (a: any, b: any) => a.dobDate.getDate() - b.dobDate.getDate();
    result.monthList.sort(sortByDate);
    result.weekList.sort(sortByDate);
    result.todayList.sort(sortByDate);
    result.tomorrowList.sort(sortByDate);

    return result;
  }, [students]);

  const renderList = (list: any[], emptyMessage: string) => {
    if (list.length === 0) return <p className="text-muted" style={{ padding: '1rem', textAlign: 'center' }}>{emptyMessage}</p>;
    
    return (
      <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
        {list.map(stu => (
          <div key={stu.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div 
                style={{ cursor: 'pointer', color: '#2563eb', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={() => onOpenStudent(stu.id, stu)}
                onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
              >
                [{stu.id}] {stu.full_name} <ExternalLink size={12} />
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                SN: {stu.dobDate.toLocaleDateString('vi-VN')} • Sẽ đạt {stu.turningAge} tuổi
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.85rem' }}>
              <div style={{ color: '#0f172a', fontWeight: 500 }}>{stu.parent_phone || 'Chưa có SĐT'}</div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="chart-section glass-panel" style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="section-header" style={{ padding: '1.25rem 1.25rem 0', marginBottom: 0 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
          <Gift size={20} style={{ color: '#8b5cf6' }} /> Lịch sinh nhật tổng quát
        </h2>
      </div>
      
      <div style={{ padding: '0.5rem 1.25rem 1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
            <button 
              onClick={() => setActiveTab('today')}
              style={{ 
                background: 'none', 
                border: 'none', 
                padding: '0.5rem 0.75rem', 
                cursor: 'pointer',
                borderBottom: activeTab === 'today' ? '2px solid #ec4899' : '2px solid transparent',
                color: activeTab === 'today' ? '#ec4899' : '#64748b',
                fontWeight: activeTab === 'today' ? 600 : 400
              }}>
              Hôm nay ({todayList.length})
            </button>
            <button 
              onClick={() => setActiveTab('tomorrow')}
              style={{ 
                background: 'none', 
                border: 'none', 
                padding: '0.5rem 0.75rem', 
                cursor: 'pointer',
                borderBottom: activeTab === 'tomorrow' ? '2px solid #ec4899' : '2px solid transparent',
                color: activeTab === 'tomorrow' ? '#ec4899' : '#64748b',
                fontWeight: activeTab === 'tomorrow' ? 600 : 400
              }}>
              Ngày mai ({tomorrowList.length})
            </button>
            <button 
              onClick={() => setActiveTab('week')}
              style={{ 
                background: 'none', 
                border: 'none', 
                padding: '0.5rem 0.75rem', 
                cursor: 'pointer',
                borderBottom: activeTab === 'week' ? '2px solid #8b5cf6' : '2px solid transparent',
                color: activeTab === 'week' ? '#8b5cf6' : '#64748b',
                fontWeight: activeTab === 'week' ? 600 : 400
              }}>
              Tuần này ({weekList.length})
            </button>
            <button 
              onClick={() => setActiveTab('month')}
              style={{ 
                background: 'none', 
                border: 'none', 
                padding: '0.5rem 0.75rem', 
                cursor: 'pointer',
                borderBottom: activeTab === 'month' ? '2px solid #8b5cf6' : '2px solid transparent',
                color: activeTab === 'month' ? '#8b5cf6' : '#64748b',
                fontWeight: activeTab === 'month' ? 600 : 400
              }}>
              Tháng này ({monthList.length})
            </button>
          </div>
          
          <div style={{ flex: 1 }}>
            {activeTab === 'today' && renderList(todayList, "Không có học viên nào sinh nhật hôm nay")}
            {activeTab === 'tomorrow' && renderList(tomorrowList, "Không có học viên nào sinh nhật ngày mai")}
            {activeTab === 'week' && renderList(weekList, "Không có học viên nào sinh nhật trong tuần này")}
            {activeTab === 'month' && renderList(monthList, "Không có học viên nào sinh nhật trong tháng này")}
          </div>
      </div>
    </div>
  );
}
