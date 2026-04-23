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
import PerformanceDevTools from './components/PerformanceDevTools';

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
    <div className="flex h-screen bg-cat-base text-cat-text font-sans">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="bg-cat-mantle border-r border-cat-surface0 flex flex-col z-20"
      >
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-cat-blue rounded-lg flex items-center justify-center text-cat-base font-bold text-lg shadow-lg shadow-cat-blue/20">
            H
          </div>
          {isSidebarOpen && (
            <span className="font-semibold text-lg tracking-tight text-cat-text">CarePoint Karachi</span>
          )}
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as Tab)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-left",
                activeTab === item.id 
                  ? "bg-cat-lavender text-cat-base shadow-md shadow-cat-lavender/20" 
                  : "text-cat-subtext0 hover:bg-cat-surface0 hover:text-cat-text"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5",
                activeTab === item.id ? "text-cat-base" : "text-cat-overlay0 group-hover:text-cat-text"
              )} />
              {isSidebarOpen && <span className="font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-cat-surface0">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 text-cat-subtext0 hover:text-cat-red hover:bg-cat-red/10 rounded-xl transition-all">
            <LogOut className="w-5 h-5" />
            {isSidebarOpen && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
        {/* Header */}
        <header className="sticky top-0 h-16 bg-cat-base/80 backdrop-blur-md border-b border-cat-surface0 px-8 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-cat-text">
              {activeTab === 'dashboard' ? 'Overview' : activeTab.replace('-', ' ')}
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cat-overlay0" />
              <input 
                type="text" 
                placeholder="Search staff, patients..."
                className="pl-10 pr-4 py-2 bg-cat-mantle border-none rounded-full text-sm w-64 focus:ring-2 focus:ring-cat-blue focus:bg-cat-crust transition-all text-cat-text"
              />
            </div>
            <div className="w-9 h-9 rounded-full bg-cat-lavender/30 border-2 border-cat-lavender flex items-center justify-center text-cat-lavender font-bold text-xs uppercase tracking-tighter">
              Admin
            </div>
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
                <div className="flex flex-col items-center justify-center p-20 text-cat-overlay0">
                  <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
                  <p className="font-bold uppercase tracking-widest text-sm">WhatsApp Integration analytics coming soon</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <PerformanceDevTools />
    </div>
  );
}
