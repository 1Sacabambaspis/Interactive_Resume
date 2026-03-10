import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function CyboroLoader({ onComplete }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const intervals = [14, 33, 76, 89, 100];
    let step = 0;
    
    const bootTimer = setInterval(() => {
      setProgress(intervals[step]);
      if (step === intervals.length - 1) {
        clearInterval(bootTimer);
        setTimeout(onComplete, 1500); // Hold at 100% for dramatic effect, then unmount
      }
      step++;
    }, 600);

    return () => clearInterval(bootTimer);
  }, [onComplete]);

  return (
    <motion.div 
      exit={{ opacity: 0, filter: 'blur(10px)', scale: 1.1 }} 
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="fixed inset-0 z-[100] bg-slate-100 flex items-center justify-center font-mono cursor-wait"
    >
      {/* Background Noise & Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#0a0a0a_1px,transparent_1px)] bg-[length:20px_20px] opacity-10"></div>
      
      {/* UI Framing */}
      <div className="absolute top-8 left-8 text-xs font-bold tracking-widest text-slate-500">SYS.ID: CYB-09X<br/>INITIATING SEQUENCE</div>
      <div className="absolute bottom-8 right-8 text-right text-xs font-bold tracking-widest text-slate-500">VOL.<br/><span className="text-2xl text-slate-900">01</span></div>
      
      {/* Center Counter */}
      <div className="text-slate-900 text-[15vw] font-serif italic leading-none flex items-start mix-blend-difference">
        {progress}<span className="text-[4vw] mt-4">%</span>
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-48 h-[1px] bg-slate-300">
        <motion.div 
          className="h-full bg-slate-900 origin-left" 
          animate={{ width: `${progress}%` }} 
          transition={{ type: "spring", bounce: 0 }}
        />
      </div>
    </motion.div>
  );
}