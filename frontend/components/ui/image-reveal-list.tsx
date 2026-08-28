"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface ImageRevealListItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image: string;
  number: string;
  phase?: string;
  href?: string;
}

export interface ImageRevealListProps {
  items: ImageRevealListItem[];
  className?: string;
}

export function ImageRevealList({ items, className }: ImageRevealListProps) {
  return (
    <div className={cn("relative max-w-3xl w-full mx-auto", className)}>
      <ul className="list-none bg-white rounded-3xl p-4 sm:p-6 shadow-xl border border-[#0D9488]/20 space-y-3">
        {items.map((item) => (
          <li key={item.id} className="relative">
            <div
              className="group relative flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-5 text-[#0F172A] rounded-2xl transition-all duration-300 hover:bg-[#0D9488]/5 hover:shadow-md border border-slate-100 hover:border-[#0D9488]/30 cursor-pointer"
            >
              {/* Floating Image Reveal on Hover */}
              <img
                src={item.image}
                alt={item.title}
                className="absolute -left-[140px] top-1/2 -translate-y-1/2 scale-90 w-[120px] h-[150px] rounded-2xl object-cover shadow-2xl opacity-0 pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-[100] group-hover:opacity-100 group-hover:scale-100 group-hover:-left-[125px] border-2 border-[#0D9488] hidden md:block"
              />

              <div className="flex items-start gap-4">
                <span className="w-10 h-10 rounded-full bg-[#0D9488]/15 text-[#0D9488] font-sora font-extrabold text-sm flex items-center justify-center shrink-0 shadow-xs">
                  {item.number}
                </span>

                <div>
                  {item.phase && (
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#0D9488] font-sora block mb-0.5">
                      {item.phase}
                    </span>
                  )}
                  <h3 className="font-sora text-base sm:text-lg font-bold text-[#0F172A] group-hover:text-[#0F766E] transition-colors leading-snug">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-xs sm:text-sm text-[#475569] font-light leading-relaxed mt-1 max-w-xl">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>

              {item.subtitle && (
                <span className="text-[#0F766E] text-xs font-semibold font-sora px-3 py-1 rounded-full bg-[#0D9488]/10 border border-[#0D9488]/20 shrink-0 mt-3 sm:mt-0 self-end sm:self-center">
                  {item.subtitle}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ImageRevealList;
