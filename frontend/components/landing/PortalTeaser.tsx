'use client'

import React from 'react'
import { Activity, Bell, Calendar, User, TrendingDown, Heart, FileText, ChevronRight, Apple } from 'lucide-react'
import { motion } from 'framer-motion'

export default function PortalTeaser() {
  return (
    <section id="portal" className="py-24 relative overflow-hidden bg-white/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold font-sora text-[#0F172A] mb-4">
            Your Metabolic <span className="teal-gradient-text">Dashboard</span>
          </h2>
          <p className="text-[#475569] text-lg max-w-2xl mx-auto">
            Manage your entire weight loss journey from one seamless, intelligent app.
          </p>
        </motion.div>

        <div className="max-w-5xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="glass-card rounded-[2.5rem] p-4 md:p-6 relative shadow-[0_20px_50px_-12px_rgba(212,110,83,0.2)]"
          >
            {/* Desktop Mockup Framework */}
            <div className="bg-[#F9F6F0] rounded-[2rem] overflow-hidden ring-1 ring-[#D46E53]/20 flex flex-col md:flex-row h-[500px] sm:h-[550px] md:h-[600px] shadow-inner relative">
              
              {/* Background abstract blur */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-[#D46E53]/10 rounded-full blur-[100px] pointer-events-none" />

              {/* Sidebar Menu */}
              <div className="bg-white/60 backdrop-blur-md border-r border-[#D46E53]/10 p-4 sm:p-6 w-full md:w-64 flex-shrink-0 flex flex-row md:flex-col justify-between md:justify-start gap-4 md:gap-8 border-b md:border-b-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#A84A33] to-[#D46E53] shadow-lg flex items-center justify-center">
                    <span className="text-white font-bold font-sora text-lg">8</span>
                  </div>
                  <span className="text-[#0F172A] font-bold text-xl tracking-tight hidden md:block font-sora">Portal</span>
                </div>
                
                <div className="flex flex-row md:flex-col gap-2 overflow-x-auto custom-scrollbar py-1 md:py-0 w-full md:w-auto shrink-0 md:shrink">
                  <div className="flex items-center gap-3 text-[#D46E53] bg-white shadow-sm border border-[#D46E53]/10 px-4 py-3 rounded-xl cursor-pointer transition-all hover:shadow-md">
                    <Activity size={20} />
                    <span className="font-semibold hidden md:block">Overview</span>
                  </div>
                  <div className="flex items-center gap-3 text-[#475569] px-4 py-3 rounded-xl hover:bg-white/50 transition-all cursor-pointer">
                    <Apple size={20} />
                    <span className="font-medium hidden md:block">Nutrition</span>
                  </div>
                  <div className="flex items-center gap-3 text-[#475569] px-4 py-3 rounded-xl hover:bg-white/50 transition-all cursor-pointer">
                    <Calendar size={20} />
                    <span className="font-medium hidden md:block">Schedule</span>
                  </div>
                  <div className="flex items-center gap-3 text-[#475569] px-4 py-3 rounded-xl hover:bg-white/50 transition-all cursor-pointer">
                    <FileText size={20} />
                    <span className="font-medium hidden md:block">Consultations</span>
                  </div>
                </div>

                <div className="hidden md:block mt-auto">
                  <div className="p-4 rounded-2xl bg-white/80 border border-[#D46E53]/10 shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#D46E53]/10 flex items-center justify-center">
                      <User className="text-[#D46E53] w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#0F172A]">Priya S.</p>
                      <p className="text-xs text-[#475569]">Week 12</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 p-4 sm:p-6 md:p-8 flex flex-col overflow-y-auto z-10">
                {/* Header */}
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  viewport={{ once: true }}
                  className="flex justify-between items-center mb-8"
                >
                  <div>
                    <h3 className="text-2xl font-bold font-sora text-[#0F172A]">Good morning, Priya</h3>
                    <p className="text-[#475569]">Here's your metabolic health summary.</p>
                  </div>
                  <div className="relative p-2 rounded-full bg-white shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow">
                    <Bell className="text-[#475569] w-5 h-5" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                  </div>
                </motion.div>

                {/* Top Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    viewport={{ once: true }}
                    className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown className="w-4 h-4 text-[#D46E53]" />
                      <p className="text-[#475569] text-sm font-medium">Weight Loss</p>
                    </div>
                    <p className="text-3xl font-bold text-[#0F172A] font-sora">8.2 <span className="text-base text-[#475569] font-normal">kgs</span></p>
                    <p className="text-[#D46E53] text-xs mt-2 font-medium bg-[#D46E53]/10 inline-block px-2 py-1 rounded-md">Top 15% of patients</p>
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    viewport={{ once: true }}
                    className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="w-4 h-4 text-rose-500" />
                      <p className="text-[#475569] text-sm font-medium">Metabolic Score</p>
                    </div>
                    <div className="flex items-end gap-3">
                      <p className="text-3xl font-bold text-[#0F172A] font-sora">92</p>
                      <p className="text-[#475569] text-sm mb-1">/ 100</p>
                    </div>
                    <div className="mt-3 h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        whileInView={{ width: "92%" }}
                        transition={{ duration: 1, delay: 0.8, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-rose-400 to-rose-500 rounded-full"
                      />
                    </div>
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                    viewport={{ once: true }}
                    className="col-span-2 md:col-span-1 p-5 rounded-2xl bg-gradient-to-br from-[#A84A33] to-[#D46E53] text-white shadow-lg relative overflow-hidden group cursor-pointer"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
                    <p className="text-white/80 text-sm font-medium mb-1">Next Delivery</p>
                    <p className="text-2xl font-bold font-sora mb-1">Oct 12</p>
                    <p className="text-white/90 text-sm mb-3">GLP-1 Medication Refill</p>
                    <div className="flex items-center gap-1 text-sm font-semibold bg-white/20 w-fit px-3 py-1 rounded-full backdrop-blur-sm">
                      Track Package <ChevronRight className="w-4 h-4" />
                    </div>
                  </motion.div>
                </div>

                {/* Bottom Section: Chart & Activity */}
                <div className="grid md:grid-cols-3 gap-6 flex-1">
                  
                  {/* Mock Chart Area */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7, duration: 0.5 }}
                    viewport={{ once: true }}
                    className="md:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col"
                  >
                    <div className="flex justify-between items-center mb-6">
                      <h4 className="font-bold text-[#0F172A] font-sora">Weight Trend</h4>
                      <select className="text-sm bg-gray-50 border-none rounded-lg text-[#475569] outline-none">
                        <option>Last 3 Months</option>
                      </select>
                    </div>
                    {/* CSS-based Line Chart Mockup */}
                    <div className="flex-1 relative flex items-end justify-between gap-2 pt-4 min-h-[160px] md:min-h-0">
                      {/* Grid lines */}
                      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6">
                        <div className="border-b border-gray-100 w-full h-0"></div>
                        <div className="border-b border-gray-100 w-full h-0"></div>
                        <div className="border-b border-gray-100 w-full h-0"></div>
                        <div className="border-b border-gray-100 w-full h-0"></div>
                      </div>
                      
                      {/* Bars/Points */}
                      {[60, 65, 55, 75, 50, 85, 45, 95].map((height, i) => (
                        <div key={i} className="relative flex flex-col items-center group w-full h-full justify-end z-10">
                          <motion.div 
                            initial={{ height: 0 }}
                            whileInView={{ height: `${height}%` }}
                            transition={{ duration: 0.8, delay: 0.8 + (i * 0.1), ease: "easeOut" }}
                            className="w-full max-w-[24px] bg-[#D46E53]/20 rounded-t-md relative overflow-hidden group-hover:bg-[#D46E53]/40 transition-colors"
                          >
                            <div className="absolute top-0 left-0 w-full h-1 bg-[#D46E53] rounded-t-md"></div>
                          </motion.div>
                          <span className="text-[10px] text-gray-400 mt-2 font-medium">W{i+1}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Tasks / Activity */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, duration: 0.5 }}
                    viewport={{ once: true }}
                    className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
                  >
                    <h4 className="font-bold text-[#0F172A] font-sora mb-6">Today's Tasks</h4>
                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#D46E53]/10 flex items-center justify-center shrink-0 border border-[#D46E53]/20">
                          <div className="w-3 h-3 rounded-full bg-[#D46E53]"></div>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#0F172A]">Take Medication</p>
                          <p className="text-xs text-[#475569]">0.5mg dosage</p>
                        </div>
                      </div>
                      <div className="flex gap-3 opacity-60">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                          <CheckCircle className="w-4 h-4 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#0F172A] line-through">Setup Video Profile</p>
                          <p className="text-xs text-[#475569]">Completed at 8:00 AM</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                </div>

              </div>
            </div>
          </motion.div>
        </div>

      </div>
    </section>
  )
}

function CheckCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

