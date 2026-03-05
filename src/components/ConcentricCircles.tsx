import React from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Settings, Youtube } from 'lucide-react';

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

      {/* Circle 1 - Single Pause Icon */}
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="circle-dashed absolute h-[250px] w-[250px]"
      >
        <div className="absolute -left-5 top-1/2 h-10 w-10 -translate-y-1/2 flex items-center justify-center rounded-full border border-white/20 bg-[#1A1A24] text-white shadow-lg">
           <Pause className="h-5 w-5 fill-white/20" />
        </div>
      </motion.div>

      {/* Circle 2 - Single Play Icon */}
      <motion.div 
        animate={{ rotate: -360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        className="circle-dashed absolute h-[400px] w-[400px] border-white/10"
      >
        <div className="absolute left-1/2 top-0 h-10 w-10 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full border border-white/20 bg-[#1A1A24] text-[#FF0000] shadow-lg">
           <Play className="h-5 w-5 fill-[#FF0000]/20 ml-0.5" />
        </div>
      </motion.div>

      {/* Circle 3 - Single Settings/Youtube Icon */}
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 55, repeat: Infinity, ease: "linear" }}
        className="circle-dashed absolute h-[550px] w-[550px] border-white/5"
      >
        <div className="absolute bottom-0 left-1/2 h-10 w-10 -translate-x-1/2 translate-y-1/2 flex items-center justify-center rounded-full border border-white/20 bg-[#1A1A24] text-white/60 shadow-lg">
           <Settings className="h-5 w-5" />
        </div>
      </motion.div>
    </div>
  );
}
