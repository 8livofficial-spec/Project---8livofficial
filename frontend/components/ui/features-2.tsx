"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ShieldCheck, Stethoscope, Activity, HeartHandshake } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Feature2Item {
  id: string;
  number: string;
  badge: string;
  title: string;
  description: string;
  image: string;
  overlayTitle: string;
  overlaySubtitle: string;
  accentTag: string;
}

const DEFAULT_FEATURES: Feature2Item[] = [
  {
    id: "feature-01",
    number: "01",
    badge: "BIOLOGICAL INTAKE",
    title: "Comprehensive Metabolic Screening",
    description: "Your health history, symptoms, previous weight logs, and biomarkers are analyzed before physician evaluation.",
    image: "/images/hero_indian.png",
    overlayTitle: "Confidential Intake",
    overlaySubtitle: "Clinical safety screening active",
    accentTag: "Phase 01"
  },
  {
    id: "feature-02",
    number: "02",
    badge: "PHYSICIAN CONSULT",
    title: "1-on-1 Board-Certified Video Care",
    description: "Direct video consultation with a licensed physician to co-design your clinical care protocol.",
    image: "/images/doctor_consultation.png",
    overlayTitle: "Physician Consultation",
    overlaySubtitle: "Zero algorithmic dosing",
    accentTag: "Phase 02"
  },
  {
    id: "feature-03",
    number: "03",
    badge: "PRECISION PROTOCOL",
    title: "Evidence-Based Medical Treatment",
    description: "Licensed medications prescribed only when medically indicated and shipped via cold-chain delivery.",
    image: "/images/nutrition_indian.png",
    overlayTitle: "Targeted Treatment",
    overlaySubtitle: "Discreet cold-chain shipping",
    accentTag: "Phase 03"
  },
  {
    id: "feature-04",
    number: "04",
    badge: "CONTINUOUS SUPPORT",
    title: "Dietitian & Behavioral Pacing",
    description: "Personalized Indian meal blueprints and progressive habit coaching tailored around your daily life.",
    image: "/images/nutrition_lifestyle.png",
    overlayTitle: "Dietitian Coaching",
    overlaySubtitle: "Indian food culture preserved",
    accentTag: "Phase 04"
  }
];

export interface Features2Props {
  items?: Feature2Item[];
  autoPlayInterval?: number;
  className?: string;
}

export function Features2({
  items = DEFAULT_FEATURES,
  autoPlayInterval = 3500,
  className
}: Features2Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % items.length);
  }, [items.length]);

  useEffect(() => {
    const timer = setInterval(handleNext, autoPlayInterval);
    return () => clearInterval(timer);
  }, [autoPlayInterval, handleNext]);

  const currentItem = items[activeIndex] || items[0];

  return (
    <div className={cn("w-full h-full flex flex-col justify-center", className)}>
      {/* Claude.ai Style Visual Feature Card */}
      <div className="relative w-full h-[680px] sm:h-[750px] lg:h-[780px] rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-200/80 bg-slate-900 group">


        <AnimatePresence mode="wait">
          <motion.div
            key={currentItem.id}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="absolute inset-0 w-full h-full"
          >
            <img
              src={currentItem.image}
              alt={currentItem.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/85 via-[#0F172A]/20 to-transparent pointer-events-none" />

            {/* Top Active Tag */}
            <div className="absolute top-5 left-5 px-4 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-white/60 text-[#0F766E] text-xs font-bold font-sora shadow-lg flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0D9488] animate-pulse" />
              <span>{currentItem.accentTag} • {currentItem.badge}</span>
            </div>

            {/* Bottom Animated Glass Card Overlay */}
            <div className="absolute bottom-6 left-6 right-6 p-6 rounded-2xl bg-white/95 backdrop-blur-xl border border-white/80 shadow-2xl">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#0D9488] font-sora">
                  {currentItem.overlayTitle}
                </span>
                <span className="text-xs font-bold text-[#64748B] font-sora">
                  {currentItem.number} / 04
                </span>
              </div>
              <h4 className="font-sora text-base sm:text-lg font-bold text-[#0F172A] leading-snug">
                {currentItem.title}
              </h4>
              <p className="text-xs text-[#475569] font-light leading-relaxed mt-1.5">
                {currentItem.description}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Carousel Pagination Dots */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
          {items.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300 cursor-pointer",
                idx === activeIndex
                  ? "w-8 bg-[#0D9488]"
                  : "w-2 bg-white/50 hover:bg-white/80"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default Features2;

