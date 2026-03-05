import React from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Settings, ThumbsUp, MessageSquare, Share2, Users } from 'lucide-react';

export function ConcentricCircles() {
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      {/* Center Circle Content - YouTube Pause Button Aesthetic */}
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="absolute z-10 flex h-32 w-32 items-center justify-center rounded-full bg-[#FF0000] shadow-[0_0_60px_rgba(255,0,0,0.5)] border-4 border-white/20"
      >
        <div className="flex gap-2">
          <div className="h-10 w-3 rounded-full bg-white" />
          <div className="h-10 w-3 rounded-full bg-white" />
        </div>
      </motion.div>

      {/* Circle 1 - Interaction Icons (Clockwise) */}
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="circle-dashed absolute h-[250px] w-[250px]"
      >
        {/* Top Icon */}
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-[#1A1A24] text-white shadow-lg">
           <Pause className="h-5 w-5 fill-white/20" />
        </div>
        {/* Bottom Icon */}
        <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-[#1A1A24] text-white shadow-lg">
           <ThumbsUp className="h-5 w-5 fill-primary/10" />
        </div>
      </motion.div>

      {/* Circle 2 - Playback & Social Icons (Anti-Clockwise) */}
      <motion.div 
        animate={{ rotate: -360 }}
        transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
        className="circle-dashed absolute h-[400px] w-[400px] border-white/10"
      >
        {/* Left Icon */}
        <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-[#1A1A24] text-[#FF0000] shadow-lg">
           <Play className="h-5 w-5 fill-[#FF0000]/20 ml-0.5" />
        </div>
        {/* Right Icon */}
        <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-[#1A1A24] text-white shadow-lg">
           <MessageSquare className="h-5 w-5" />
        </div>
      </motion.div>

      {/* Circle 3 - Meta & Connectivity Icons (Clockwise) */}
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
        className="circle-dashed absolute h-[550px] w-[550px] border-white/5"
      >
        {/* Top (0°) */}
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center rounded-full border border-white/20 bg-[#1A1A24] text-white/60 shadow-lg">
           <Share2 className="h-5 w-5" />
        </div>
        {/* Bottom Right (120°) - x=93.3%, y=75% */}
        <div style={{ top: '75%', left: '93.3%' }} className="absolute -translate-x-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center rounded-full border border-white/20 bg-[#1A1A24] text-white/60 shadow-lg">
           <Users className="h-5 w-5" />
        </div>
        {/* Bottom Left (240°) - x=6.7%, y=75% */}
        <div style={{ top: '75%', left: '6.7%' }} className="absolute -translate-x-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center rounded-full border border-white/20 bg-[#1A1A24] text-white/60 shadow-lg">
           <Settings className="h-5 w-5" />
        </div>
      </motion.div>
    </div>
  );
}
