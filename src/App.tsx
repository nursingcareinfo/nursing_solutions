/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  UserPlus, 
  Users, 
  Activity, 
  Settings, 
  LogOut, 
  Search,
  Plus,
  Filter,
  Download,
  CheckCircle2,
  AlertCircle,
  FileText,
  MessageSquare
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import StaffOnboarding from './components/Onboarding';
import StaffList from './components/StaffList';
import PatientManagement from './components/PatientManagement';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';

type Tab = 'dashboard' | 'onboarding' | 'staff' | 'patients' | 'whatsapp';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'onboarding', label: 'Staff Onboarding', icon: UserPlus },
    { id: 'staff', label: 'Staff Directory', icon: Users },
    { id: 'patients', label: 'Patient Management', icon: Activity },
    { id: 'whatsapp', label: 'WhatsApp Flows', icon: MessageSquare },
  ];

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="bg-white border-r border-slate-200 flex flex-col z-20"
      >
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
            H
          </div>
          {isSidebarOpen && (
            <span className="font-semibold text-lg tracking-tight">CarePoint Karachi</span>
          )}
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as Tab)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                activeTab === item.id 
                  ? "bg-blue-50 text-blue-700" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5",
                activeTab === item.id ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
              )} />
              {isSidebarOpen && <span className="font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
            <LogOut className="w-5 h-5" />
            {isSidebarOpen && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
        {/* Header */}
        <header className="sticky top-0 h-16 bg-white/80 backdrop-blur-md border-bottom border-slate-200 px-8 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold capitalize">
              {activeTab === 'dashboard' ? 'Overview' : activeTab.replace('-', ' ')}
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search staff, patients..."
                className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm w-64 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-200"></div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-8 pb-16">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && <Dashboard />}
              {activeTab === 'onboarding' && <StaffOnboarding onComplete={() => setActiveTab('staff')} />}
              {activeTab === 'staff' && <StaffList />}
              {activeTab === 'patients' && <PatientManagement />}
              {activeTab === 'whatsapp' && (
                <div className="flex flex-col items-center justify-center p-20 text-slate-400">
                  <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
                  <p>WhatsApp Integration Analytics Coming Soon</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
