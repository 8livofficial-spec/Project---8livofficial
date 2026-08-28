"use client";

import React, { useRef, useState } from "react";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { cn } from "@/lib/utils";

export interface ChromaCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}

export function ChromaCard({
  children,
  className,
  glowColor = "#0D9488",
  ...props
}: ChromaCardProps) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const [isHovered, setIsHovered] = useState(false);

  function handleMouseMove({
    currentTarget,
    clientX,
    clientY,
  }: React.MouseEvent<HTMLDivElement>) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  const background = useMotionTemplate`
    radial-gradient(
      400px circle at ${mouseX}px ${mouseY}px,
      rgba(13, 148, 136, 0.25),
      rgba(94, 234, 212, 0.15) 40%,
      transparent 80%
    )
  `;

  const border = useMotionTemplate`
    radial-gradient(
      300px circle at ${mouseX}px ${mouseY}px,
      #0D9488,
      #5EEAD4 40%,
      transparent 80%
    )
  `;

  return (
    <div
      className={cn(
        "group relative rounded-[2.5rem] p-[2px] transition-transform duration-500 ease-out hover:scale-[1.02]",
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...props}
    >
      {/* Animated Chromatic Border */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-[2.5rem] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: border }}
      />

      {/* Chromatic Glow Overlay */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-[2.5rem] opacity-0 transition-opacity duration-500 group-hover:opacity-100 z-10"
        style={{ background }}
      />

      {/* Card Inner Content */}
      <div className="relative w-full h-full rounded-[2.4rem] overflow-hidden bg-white shadow-xl">
        {children}
      </div>

      {/* Chromatic Corner Shimmer Line */}
      <div className="absolute -inset-1 rounded-[2.6rem] bg-gradient-to-r from-[#0D9488]/30 via-[#5EEAD4]/20 to-[#00A884]/30 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none -z-10" />
    </div>
  );
}

export default ChromaCard;
