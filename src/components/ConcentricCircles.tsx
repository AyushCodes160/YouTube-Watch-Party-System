import React from 'react';
import { motion } from 'framer-motion';

export function ConcentricCircles() {
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      {/* Center Circle Content */}
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="absolute z-10 flex h-32 w-32 flex-col items-center justify-center rounded-full bg-[#0B0B13] shadow-[0_0_40px_rgba(138,43,226,0.3)] border border-primary/30"
      >
        <span className="text-2xl font-bold text-white">20k+</span>
        <span className="text-xs text-muted-foreground">Specialists</span>
      </motion.div>

      {/* Circle 1 */}
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        className="circle-dashed absolute h-[250px] w-[250px]"
      >
        <div className="absolute -left-3 top-1/2 h-8 w-8 -translate-y-1/2 overflow-hidden rounded-full border border-white/20 bg-black">
           <img src="https://i.pravatar.cc/100?img=1" alt="Avatar" className="h-full w-full object-cover" />
        </div>
        <div className="absolute -right-3 top-1/4 h-8 w-8 -translate-y-1/2 overflow-hidden rounded-full border border-white/20 bg-primary/20 flex items-center justify-center">
          <div className="w-3 h-3 bg-primary rounded-full glow-primary"></div>
        </div>
      </motion.div>

      {/* Circle 2 */}
      <motion.div 
        animate={{ rotate: -360 }}
        transition={{ duration: 55, repeat: Infinity, ease: "linear" }}
        className="circle-dashed absolute h-[400px] w-[400px] border-white/10"
      >
        <div className="absolute left-1/4 top-0 h-10 w-10 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border border-white/20 bg-black">
           <img src="https://i.pravatar.cc/100?img=3" alt="Avatar" className="h-full w-full object-cover" />
        </div>
        <div className="absolute bottom-1/4 right-0 h-12 w-12 translate-x-1/2 translate-y-1/2 items-center justify-center rounded-xl bg-card border border-white/10 flex p-2 shadow-xl shadow-black/50 rotate-12">
            <div className="w-full h-full bg-accent/20 rounded flex items-center justify-center">
                <div className="w-4 h-4 bg-accent rounded-full glow-accent"></div>
            </div>
        </div>
      </motion.div>

      {/* Circle 3 */}
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 70, repeat: Infinity, ease: "linear" }}
        className="circle-dashed absolute h-[550px] w-[550px] border-white/5"
      >
        <div className="absolute bottom-10 left-20 h-10 w-10 overflow-hidden rounded-full border border-white/20 bg-black">
           <img src="https://i.pravatar.cc/100?img=5" alt="Avatar" className="h-full w-full object-cover" />
        </div>
        <div className="absolute top-1/3 right-0 h-10 w-10 translate-x-1/2 overflow-hidden rounded-full border border-white/20 bg-black">
           <img src="https://i.pravatar.cc/100?img=8" alt="Avatar" className="h-full w-full object-cover" />
        </div>
      </motion.div>
    </div>
  );
}
