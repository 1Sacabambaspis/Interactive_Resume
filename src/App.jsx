import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SiPython, SiCplusplus, SiOracle, SiReact, SiTailwindcss } from 'react-icons/si';
import { FaGithub, FaJava, FaRProject } from 'react-icons/fa';
import { ProjectRegistry } from './Data/Projects';
import { DungeonModule } from './Data/dungeons';
import { InfoRegistry } from './Data/info'; 

const KONAMI_CODE = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright'];
const HACKING_LOG_TEMPLATES = [
  "Negotiating TLS handshake...", "Resolving identity provider...", "Injecting signed credentials...", "Validating checksum blocks..."
];

const EQUIPPED_SKILLS = [
  { id: 'python', name: 'Python', icon: <SiPython size={18} />, color: 'text-yellow-400 border-yellow-400', offset: (Math.PI * 2) * (0 / 7) },
  { id: 'cpp', name: 'C++', icon: <SiCplusplus size={18} />, color: 'text-blue-500 border-blue-500', offset: (Math.PI * 2) * (1 / 7) },
  { id: 'sql', name: 'Oracle SQL', icon: <SiOracle size={18} />, color: 'text-red-500 border-red-500', offset: (Math.PI * 2) * (2 / 7) },
  { id: 'java', name: 'Java', icon: <FaJava size={18} />, color: 'text-orange-500 border-orange-500', offset: (Math.PI * 2) * (3 / 7) },
  { id: 'r', name: 'R', icon: <FaRProject size={18} />, color: 'text-indigo-400 border-indigo-400', offset: (Math.PI * 2) * (4 / 7) },
  { id: 'react', name: 'React', icon: <SiReact size={18} />, color: 'text-cyan-400 border-cyan-400', offset: (Math.PI * 2) * (5 / 7) },
  { id: 'tailwind', name: 'Tailwind CSS', icon: <SiTailwindcss size={18} />, color: 'text-sky-400 border-sky-400', offset: (Math.PI * 2) * (6 / 7) }
];

// --- INLINE SVG SPRITES ---
const ArcanePortalSprite = ({ colorHex, scale }) => (
  <svg viewBox="0 0 100 100" className="w-full h-full animate-[spin_8s_linear_infinite]" 
       style={{ color: colorHex, transform: `scale(${scale})`, transition: 'transform 0.2s ease-out', filter: `drop-shadow(0 0 ${10 * scale}px currentColor)` }}>
    <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="10 5" />
    <polygon points="50,10 85,75 15,75" fill="none" stroke="currentColor" strokeWidth="2" className="animate-[pulse_2s_ease-in-out_infinite]" />
    <polygon points="50,90 85,25 15,25" fill="none" stroke="currentColor" strokeWidth="2" className="animate-[pulse_2s_ease-in-out_infinite_reverse]" />
    <circle cx="50" cy="50" r="15" fill="currentColor" className="animate-ping opacity-50" />
  </svg>
);

const PlayerSprite = () => (
  <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]">
    <rect x="20" y="16" width="24" height="24" fill="#cbd5e1" rx="4" />
    <rect x="24" y="24" width="16" height="6" fill="#0f172a" />
    <rect x="26" y="26" width="4" height="2" fill="#38bdf8" className="animate-pulse" />
    <path d="M16 40 L48 40 L44 64 L20 64 Z" fill="#334155" />
    <rect x="12" y="40" width="8" height="16" fill="#475569" rx="2" />
    <rect x="44" y="40" width="8" height="16" fill="#475569" rx="2" />
  </svg>
);

export default function App() {
  // CRITICAL FIX: The config hook is now safely inside the component!
  const [config, setConfig] = useState({
    rotateSkills: true,
    weatherEffects: true,
    particles: true,
    muted: true // Set to true by default to prevent browser auto-play warnings
  });

  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [currentDungeon, setCurrentDungeon] = useState(DungeonModule.hub);
  const [uiState, setUiState] = useState('EXPLORING'); 
  const [activeProject, setActiveProject] = useState(null);
  const [activeInfo, setActiveInfo] = useState(null);
  const [activeTrigger, setActiveTrigger] = useState(null);
  const [hackingLogs, setHackingLogs] = useState([]);
  const [easterEggActive, setEasterEggActive] = useState(false);

  const [envData, setEnvData] = useState({ isNight: false, weatherType: 'CLEAR', timeString: '', loaded: false });
  const [githubCache, setGithubCache] = useState(null);
  const [isFetchingGithub, setIsFetchingGithub] = useState(false);

  // Safely play sounds if the user has unmuted the app
  const playSfx = (file, volume = 0.3) => {
    if (config.muted) return;
    const sfx = new Audio(`/audio/${file}.mp3`);
    sfx.volume = volume;
    sfx.play().catch(() => console.log("Audio play blocked by browser."));
  };

  const playerRef = useRef({ 
    x: window.innerWidth * DungeonModule.hub.spawnPoint.rx, 
    y: window.innerHeight * DungeonModule.hub.spawnPoint.ry, 
    vx: 0, vy: 0, speed: 1.2, friction: 0.85, orbitAngle: 0 
  });
  const cameraRef = useRef({ trauma: 0, offsetX: 0, offsetY: 0 });
  const particlesRef = useRef([]);
  const rainRef = useRef([]); 
  const keysRef = useRef(new Set());
  const inputBufferRef = useRef([]);
  const animationRef = useRef();

  const [renderState, setRenderState] = useState({ 
    x: playerRef.current.x, y: playerRef.current.y, orbitAngle: 0, shakeX: 0, shakeY: 0, particles: [], rain: [] 
  });

  const closeUI = () => {
    setUiState('EXPLORING');
    setActiveProject(null);
    setActiveInfo(null);
    playSfx('close', 0.2); // Optional sound effect for closing
  };

  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchEnvironment = async () => {
      try {
        const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=3.1390&longitude=101.6869&current_weather=true");
        const data = await res.json();
        const wCode = data.current_weather.weathercode;
        let wType = 'CLEAR';
        if (wCode >= 1 && wCode <= 3) wType = 'CLOUDY';
        if (wCode >= 50) wType = 'RAIN';
        setEnvData({ isNight: data.current_weather.is_day === 0, weatherType: wType, loaded: true });
      } catch (e) {
        const hour = new Date().getHours();
        setEnvData({ isNight: hour < 7 || hour > 19, weatherType: 'CLEAR', loaded: true });
      }
    };
    fetchEnvironment();
    const timeInterval = setInterval(() => {
      setEnvData(prev => ({ ...prev, timeString: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }));
    }, 1000);
    return () => clearInterval(timeInterval);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeUI(); 
        return; 
      }
      const key = e.key.toLowerCase();
      keysRef.current.add(key);
      const buffer = inputBufferRef.current;
      buffer.push(key);
      if (buffer.length > 8) buffer.shift();
      if (buffer.join(',') === KONAMI_CODE.join(',')) {
        setEasterEggActive(true);
        cameraRef.current.trauma = 1.5;
        playSfx('powerup', 0.5);
      }
    };
    const handleKeyUp = (e) => keysRef.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const fetchGitHubActivity = async () => {
    setUiState('VIEW_GITHUB');
    playSfx('open', 0.3);
    if (githubCache) return;
    setIsFetchingGithub(true);
    try {
      const res = await fetch("https://api.github.com/users/1Sacabambaspis/events/public");
      if (!res.ok) throw new Error("GitHub API Rate Limited");
      const data = await res.json();
      const pushEvents = data.filter(e => e.type === 'PushEvent');
      setGithubCache({ score: pushEvents.length, active: pushEvents.length > 0, lastUpdated: new Date().toLocaleTimeString() });
    } catch (e) {
      setGithubCache({ score: 5, active: true, lastUpdated: "Offline Cache" });
    }
    setIsFetchingGithub(false);
  };

  const triggerHackingSequence = async (projectId) => {
    setUiState('HACKING');
    setHackingLogs([]);
    for (let i = 0; i < HACKING_LOG_TEMPLATES.length; i++) {
      playSfx('typing', 0.2); // Play typing sound per log
      await new Promise(res => setTimeout(res, 250)); 
      setHackingLogs(prev => [...prev, HACKING_LOG_TEMPLATES[i]]);
    }
    await new Promise(res => setTimeout(res, 400)); 
    playSfx('success', 0.4); // Access granted sound
    setActiveProject(ProjectRegistry[projectId]);
    setUiState('VIEW_PROJECT');
  };

  const executeTrigger = (trigger) => {
    if (trigger.type === "DUNGEON_EXIT") {
      playSfx('warp', 0.4);
      const nextDungeon = DungeonModule[trigger.targetDungeon];
      setCurrentDungeon(nextDungeon);
      playerRef.current.x = windowSize.width * nextDungeon.spawnPoint.rx;
      playerRef.current.y = windowSize.height * nextDungeon.spawnPoint.ry;
      playerRef.current.vx = 0; playerRef.current.vy = 0;
      cameraRef.current.trauma = 0.5; 
    } 
    else if (trigger.type === "PROJECT_TERMINAL") triggerHackingSequence(trigger.projectId);
    else if (trigger.type === "GITHUB_RACK") fetchGitHubActivity();
    else if (trigger.type === "INFO_BOARD") {
      playSfx('open', 0.3);
      setActiveInfo(InfoRegistry[trigger.infoId]);
      setUiState('VIEW_INFO');
    }
    else if (trigger.type === "EXTERNAL_LINK") {
      playSfx('open', 0.3);
      window.open(trigger.url, '_blank');
    }
    else if (trigger.type === "CONTACT_INFO") {
      playSfx('open', 0.3);
      setUiState('VIEW_CONTACT');
    }
  };

  const gameLoop = () => {
    if (uiState !== 'EXPLORING') {
      animationRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    const p = playerRef.current;
    const cam = cameraRef.current;
    const keys = keysRef.current;
    let isMoving = false;

    if (keys.has('w') || keys.has('arrowup')) { p.vy -= p.speed; isMoving = true; }
    if (keys.has('s') || keys.has('arrowdown')) { p.vy += p.speed; isMoving = true; }
    if (keys.has('a') || keys.has('arrowleft')) { p.vx -= p.speed; isMoving = true; }
    if (keys.has('d') || keys.has('arrowright')) { p.vx += p.speed; isMoving = true; }

    p.vx *= p.friction; p.vy *= p.friction;
    p.x += p.vx; p.y += p.vy;

    // Conditionally render footstep particles
    if (config.particles && isMoving && Math.random() > 0.6) {
      particlesRef.current.push({ id: Math.random(), x: p.x + (Math.random() * 30 - 15), y: p.y + 25, life: 1.0 });
    }
    particlesRef.current = particlesRef.current.filter(part => part.life > 0).map(part => {
      part.life -= 0.05; part.y -= 0.5; return part;
    });

    // Conditionally render weather physics
    if (config.weatherEffects && envData.weatherType === 'RAIN') {
      if (Math.random() > 0.2) { 
        rainRef.current.push({ id: Math.random(), x: Math.random() * windowSize.width, y: -20, speed: 15 + Math.random() * 10, length: 10 + Math.random() * 20 });
      }
      rainRef.current = rainRef.current.filter(drop => drop.y < windowSize.height).map(drop => {
        drop.y += drop.speed; drop.x -= 2; return drop;
      });
    } else {
      rainRef.current = []; 
    }

    if (p.x < 40) { p.x = 40; if (p.vx < -3) cam.trauma = 0.3; p.vx = 0; }
    if (p.x > windowSize.width - 40) { p.x = windowSize.width - 40; if (p.vx > 3) cam.trauma = 0.3; p.vx = 0; }
    if (p.y < 40) { p.y = 40; if (p.vy < -3) cam.trauma = 0.3; p.vy = 0; }
    if (p.y > windowSize.height - 40) { p.y = windowSize.height - 40; if (p.vy > 3) cam.trauma = 0.3; p.vy = 0; }

    // Settings Toggle: Spin or track behind player
    if (config.rotateSkills) {
      p.orbitAngle += 0.05;
    }

    if (cam.trauma > 0) {
      cam.offsetX = (Math.random() - 0.5) * 20 * cam.trauma;
      cam.offsetY = (Math.random() - 0.5) * 20 * cam.trauma;
      cam.trauma *= 0.9;
      if (cam.trauma < 0.01) cam.trauma = 0;
    } else {
      cam.offsetX = 0; cam.offsetY = 0;
    }

    let standingOnTrigger = null;
    for (const trigger of currentDungeon.triggers) {
      const absX = trigger.rx * windowSize.width;
      const absY = trigger.ry * windowSize.height;
      const dx = p.x - absX; 
      const dy = p.y - absY;
      if (Math.sqrt(dx * dx + dy * dy) < trigger.radius) {
        standingOnTrigger = trigger; break;
      }
    }
    setActiveTrigger(standingOnTrigger);

    if (standingOnTrigger && keys.has('f')) {
      keys.delete('f');
      executeTrigger(standingOnTrigger);
    }

    setRenderState({ 
      x: p.x, y: p.y, orbitAngle: p.orbitAngle, shakeX: cam.offsetX, shakeY: cam.offsetY, particles: [...particlesRef.current], rain: [...rainRef.current]
    });
    
    animationRef.current = requestAnimationFrame(gameLoop);
  };

  useEffect(() => {
    // We add 'config' to the dependency array so the game loop respects toggles instantly
    animationRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationRef.current);
  }, [uiState, currentDungeon, windowSize, envData.weatherType, config]); 

  const bgClass = envData.isNight ? 'bg-gradient-to-b from-gray-900 to-black' : 'bg-gradient-to-b from-sky-400 to-sky-200';

  return (
    <div className={`w-screen h-screen ${bgClass} font-mono text-white selection:bg-teal-500 overflow-hidden relative`}
         style={{ transform: `translate(${renderState.shakeX}px, ${renderState.shakeY}px)` }}>
      
      {/* 1. LAYERED BACKGROUND SPRITES (Sky / Sun / Moon) */}
      <div className="absolute inset-0 z-0">
        {envData.isNight ? (
          <>
            <div className="absolute top-10 right-20 w-24 h-24 bg-slate-200 rounded-full shadow-[0_0_50px_#f8fafc] opacity-80"></div>
            <div className="absolute inset-0 bg-[radial-gradient(white_1px,transparent_1px)] bg-[length:50px_50px] opacity-30"></div>
          </>
        ) : (
          <div className="absolute top-10 right-20 w-32 h-32 bg-yellow-300 rounded-full shadow-[0_0_80px_#fde047] opacity-90 animate-[pulse_4s_ease-in-out_infinite]"></div>
        )}
      </div>

      {/* 2. ATMOSPHERIC CLOUDS (Parallax) conditionally rendered by settings */}
      {config.weatherEffects && (envData.weatherType === 'CLOUDY' || envData.weatherType === 'RAIN') && (
        <div className="absolute inset-0 pointer-events-none z-10 opacity-40 overflow-hidden">
          <div className="absolute top-20 left-10 w-64 h-20 bg-white rounded-full blur-xl opacity-50 animate-[slide_20s_linear_infinite]"></div>
          <div className="absolute top-40 right-20 w-96 h-24 bg-white rounded-full blur-xl opacity-40 animate-[slide_35s_linear_infinite_reverse]"></div>
        </div>
      )}

      {/* 3. TRUE RAIN RENDERING */}
      <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
        {renderState.rain.map(r => (
          <div key={r.id} className="absolute w-[2px] bg-blue-300/70 rounded-full rotate-12"
               style={{ left: r.x, top: r.y, height: r.length }} />
        ))}
      </div>

      {/* 4. UI HUD */}
      <div className="absolute top-6 left-6 z-50 flex flex-col gap-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] pointer-events-none">
        <div className="text-white font-bold tracking-widest uppercase text-3xl drop-shadow-[0_0_8px_currentColor]">{currentDungeon.name}</div>
        <div className="flex gap-4 text-slate-200 text-sm bg-black/50 px-3 py-1 rounded-md border border-slate-600 w-fit backdrop-blur-sm">
           <span>SYS_TIME: <span className="text-teal-400">{envData.timeString}</span></span>
           <span>ATMOSPHERE: <span className="text-teal-400">{envData.weatherType}</span></span>
        </div>
      </div>

      {/* 5. GAME ENTITIES */}
      <div className="absolute inset-0 z-20">
        
        {/* Dynamic Sprited Portals with Proximity Scaling */}
        {currentDungeon.triggers.map(t => {
          const absX = t.rx * windowSize.width;
          const absY = t.ry * windowSize.height;
          
          // Calculate distance from player for dynamic glow/scaling
          const dist = Math.sqrt(Math.pow(renderState.x - absX, 2) + Math.pow(renderState.y - absY, 2));
          const proximityScale = Math.max(1, 1.5 - dist / 300); // Scales up as you get closer
          
          let hexColor = '#14b8a6'; // teal
          if (t.type === 'DUNGEON_EXIT') hexColor = '#a855f7'; // purple
          else if (t.type === 'GITHUB_RACK' || t.type === 'EXTERNAL_LINK') hexColor = '#22c55e'; // green
          else if (t.type === 'INFO_BOARD' || t.type === 'CONTACT_INFO') hexColor = '#3b82f6'; // blue
          
          return (
            <div key={t.id} className="absolute flex items-center justify-center transition-transform hover:scale-110"
                 style={{ width: t.radius * 2, height: t.radius * 2, left: absX - t.radius, top: absY - t.radius, zIndex: proximityScale > 1.2 ? 25 : 10 }}>
              <ArcanePortalSprite colorHex={hexColor} scale={proximityScale} />
            </div>
          );
        })}

        {/* Decor Renderer (To fill empty space if added to dungeons.js) */}
        {currentDungeon.decor && currentDungeon.decor.map(d => {
          const absX = d.rx * windowSize.width;
          const absY = d.ry * windowSize.height;
          return (
            <div key={d.id} className="absolute text-slate-500/30 text-6xl pointer-events-none" style={{ left: absX, top: absY }}>
               {d.type === 'SERVER_RACK' ? '🖧' : d.type === 'PILLAR' ? '🏛️' : '✧'}
            </div>
          )
        })}

        {/* Dust Particles */}
        {renderState.particles.map(p => (
          <div key={p.id} className="absolute w-2 h-2 bg-slate-200 rounded-full shadow-[0_0_5px_white]" style={{ left: p.x, top: p.y, opacity: p.life }} />
        ))}

        {/* Player Sprite */}
        <div className="absolute w-16 h-16 transition-none z-30" style={{ left: renderState.x - 32, top: renderState.y - 32 }}>
          <PlayerSprite />
          
          {/* Orbiting Familiars */}
          {EQUIPPED_SKILLS.map(skill => {
            const x = Math.cos(renderState.orbitAngle + skill.offset) * 85; 
            const y = Math.sin(renderState.orbitAngle + skill.offset) * 85; 
            return (
              <motion.div key={skill.id} className={`absolute w-10 h-10 rounded-full bg-black/90 border-2 flex items-center justify-center ${skill.color} shadow-[0_0_15px_currentColor]`}
                   style={{ left: 12 + x, top: 12 + y }} title={skill.name} whileHover={{ scale: 1.3, zIndex: 50 }}>
                {skill.icon}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* BOTTOM LEFT: CONTROL HINTS */}
      <div className="absolute bottom-6 left-6 z-50 pointer-events-none opacity-60 text-xs font-bold tracking-[0.1em] border-l-2 border-teal-500/50 pl-3">
        <div className="flex flex-col gap-1 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
          <p className="text-white"><span className="text-teal-400">[WASD]</span> MOVE SYSTEM</p>
          <p className="text-white"><span className="text-teal-400">[F]</span> ACCESS TERMINAL</p>
          <p className="text-white"><span className="text-teal-400">[ESC]</span> CLOSE UI</p>
        </div>
      </div>

      {/* BOTTOM RIGHT: SYSTEM SETTINGS TRAY */}
      <div className="absolute bottom-6 right-6 z-50 flex gap-3 drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">
        <button 
          onClick={() => setConfig(prev => ({...prev, weatherEffects: !prev.weatherEffects}))}
          className={`px-3 py-2 border ${config.weatherEffects ? 'border-sky-400 text-sky-400 bg-sky-900/40' : 'border-slate-600 text-slate-500 bg-black/40'} rounded-md hover:bg-white/10 transition-colors backdrop-blur-sm`}
          title="Toggle Weather Effects"
        >
          {config.weatherEffects ? '☁️ ON' : '☁️ OFF'}
        </button>
        <button 
          onClick={() => setConfig(prev => ({...prev, rotateSkills: !prev.rotateSkills}))}
          className={`px-3 py-2 border ${config.rotateSkills ? 'border-teal-400 text-teal-400 bg-teal-900/40' : 'border-slate-600 text-slate-500 bg-black/40'} rounded-md hover:bg-white/10 transition-colors backdrop-blur-sm`}
          title="Toggle Skill Orbit"
        >
          {config.rotateSkills ? '🌀 ORBIT' : '🛑 FIXED'}
        </button>
        <button 
          onClick={() => setConfig(prev => ({...prev, muted: !prev.muted}))}
          className={`px-3 py-2 border ${!config.muted ? 'border-purple-400 text-purple-400 bg-purple-900/40' : 'border-slate-600 text-slate-500 bg-black/40'} rounded-md hover:bg-white/10 transition-colors backdrop-blur-sm`}
          title="Toggle Audio"
        >
          {!config.muted ? '🔊 AUDIO' : '🔇 MUTE'}
        </button>
      </div>

      {/* Interaction Tooltip */}
      <AnimatePresence>
        {activeTrigger && uiState === 'EXPLORING' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-black/95 px-8 py-4 border-2 border-slate-600 rounded-lg text-teal-400 z-50 font-bold tracking-widest text-lg shadow-[0_0_30px_rgba(20,184,166,0.4)] pointer-events-none">
            Press [F] : {activeTrigger.label}
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- CRASH-FREE UI OVERLAYS (MODALS) --- */}
      
      {/* 1. Hacking Modal */}
      <AnimatePresence>
        {uiState === 'HACKING' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/95 z-50 p-10 flex flex-col justify-end border-[8px] border-slate-900 overflow-hidden">
             <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] z-50 opacity-50"></div>
             <div className="text-teal-500 mb-6 font-bold text-2xl z-40">&gt; SYSTEM BREACH INITIATED...</div>
             <div className="space-y-3 z-40">
               {hackingLogs.map((log, i) => (
                 <div key={i} className="text-green-400 text-lg tracking-widest drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]">
                   [ {((i+1)*25).toString().padStart(3, '0')}% ] {log}
                 </div>
               ))}
               <span className="w-4 h-6 bg-green-400 animate-pulse mt-2 block shadow-[0_0_10px_#4ade80]" />
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Complete Project Showcase Modal */}
      <AnimatePresence>
        {uiState === 'VIEW_PROJECT' && activeProject && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="absolute inset-0 bg-slate-900/95 backdrop-blur z-50 p-12 border-[16px] border-slate-800 flex flex-col">
            <div className="flex justify-between items-end border-b-2 border-slate-700 pb-4 mb-6">
              <div>
                <h2 className="text-5xl text-teal-400 font-bold uppercase drop-shadow-[0_0_10px_rgba(45,212,191,0.5)]">{activeProject.title}</h2>
                <span className="text-slate-400 tracking-widest text-xl">{activeProject.subtitle}</span>
              </div>
              <button onClick={closeUI} className="text-3xl text-slate-500 hover:text-red-500 font-bold transition-colors">ESC / [X]</button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-6 pr-4">
              <section>
                <h3 className="text-2xl text-white mb-2 border-b border-slate-700 inline-block uppercase">Architecture & Role</h3>
                <p className="text-slate-300 text-lg"><span className="text-teal-500 font-bold">Role:</span> {activeProject.role}</p>
                <p className="text-slate-300 text-lg mt-2">{activeProject.architecture}</p>
              </section>
              <section>
                <h3 className="text-2xl text-white mb-2 border-b border-slate-700 inline-block uppercase">Impact Metrics</h3>
                <ul className="list-disc pl-6 space-y-2 text-slate-300 text-lg">
                  {activeProject.impact.map((point, i) => <li key={i}>{point}</li>)}
                </ul>
              </section>
              <div className="flex gap-3 mt-4">
                {activeProject.techStack.map(tech => <span key={tech} className="bg-slate-800 text-teal-300 px-4 py-2 rounded-md border border-slate-700 shadow-md">{tech}</span>)}
              </div>
              
              {activeProject.aiCredits && (
                <section className="mt-8 bg-purple-900/10 border border-purple-500/30 rounded-lg p-6 shadow-[0_0_20px_rgba(168,85,247,0.1)]">
                  <h3 className="text-xl text-purple-400 font-bold mb-4 uppercase tracking-widest flex items-center gap-3">
                    <span className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></span> Ethical AI Assistance Log
                  </h3>
                  <div className="space-y-6">
                    {activeProject.aiCredits.map((credit, i) => (
                      <div key={i} className="border-l-4 border-purple-500/50 pl-4">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-white font-bold text-lg">{credit.toolName}</span>
                          <span className="text-sm bg-purple-900/50 text-purple-300 px-2 py-1 rounded border border-purple-700">{credit.provider}</span>
                        </div>
                        <p className="text-slate-300 mb-1"><span className="text-slate-500 font-bold">Purpose:</span> {credit.usagePurpose}</p>
                        <p className="text-slate-300"><span className="text-slate-500 font-bold">Scope Limitation:</span> {credit.scopeLimitations}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
            
            <div className="mt-6 pt-4 border-t-2 border-slate-700 flex items-center justify-end">
              <a href={`https://${activeProject.githubLink}`} target="_blank" rel="noreferrer" 
                 className="flex items-center gap-3 text-teal-500 hover:text-teal-300 transition-colors bg-slate-800 px-6 py-3 rounded-lg border border-slate-700 hover:border-teal-500 shadow-lg">
                <FaGithub size={24} />
                <span className="font-bold tracking-widest uppercase">Access Repository</span>
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. GitHub Rack Modal */}
      <AnimatePresence>
        {uiState === 'VIEW_GITHUB' && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 bg-slate-950/95 backdrop-blur z-50 flex items-center justify-center p-8 border-[12px] border-green-900/50">
            <div className="w-full max-w-3xl bg-black border-4 border-slate-800 p-10 shadow-[0_0_80px_rgba(34,197,94,0.2)] rounded-lg font-mono">
              <div className="flex justify-between border-b-2 border-slate-800 pb-6 mb-8">
                <h2 className="text-4xl text-green-400 font-bold drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]">LIVE REPOSITORY RACK</h2>
                <button onClick={closeUI} className="text-slate-500 hover:text-red-500 text-3xl font-bold transition-colors">ESC / [X]</button>
              </div>
              {isFetchingGithub ? (
                <div className="text-green-500 animate-pulse text-2xl text-center py-12">Pinging GitHub Servers...</div>
              ) : (
                <div className="flex gap-12 items-center">
                  <div className="w-40 bg-slate-900 border-4 border-slate-700 p-4 space-y-4 rounded-lg shadow-xl">
                    {[1, 2, 3, 4, 5].map(led => (
                      <div key={led} className="h-6 bg-black border-2 border-slate-800 rounded flex items-center px-2">
                        <div className={`w-3 h-3 rounded-full ${githubCache?.active && led <= (githubCache?.score || 1) ? 'bg-green-500 shadow-[0_0_12px_#22c55e]' : 'bg-slate-700'}`}></div>
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 space-y-6 text-slate-300 text-xl">
                    <p><span className="text-slate-500 font-bold w-48 inline-block">TARGET:</span> 1Sacabambaspis</p>
                    <p><span className="text-slate-500 font-bold w-48 inline-block">STATUS:</span> <span className="text-green-400 font-bold animate-pulse">ESTABLISHED</span></p>
                    <p><span className="text-slate-500 font-bold w-48 inline-block">PUSH EVENTS:</span> {githubCache?.score || 0}</p>
                    <p><span className="text-slate-500 font-bold w-48 inline-block">HEALTH:</span> {githubCache?.active ? 'OPTIMAL' : 'DORMANT'}</p>
                    <p className="text-sm text-slate-600 mt-6 border-t border-slate-800 pt-4">Last sync: {githubCache?.lastUpdated}</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Education Modal */}
      <AnimatePresence>
        {uiState === 'VIEW_INFO' && activeInfo && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 bg-blue-950/95 backdrop-blur z-50 p-12 border-[16px] border-blue-900 flex flex-col">
            <div className="flex justify-between border-b-2 border-blue-700 pb-6 mb-8 mt-4">
              <h2 className="text-5xl text-blue-400 font-bold uppercase drop-shadow-[0_0_10px_rgba(96,165,250,0.5)]">{activeInfo.title}</h2>
              <button onClick={closeUI} className="text-3xl text-slate-500 hover:text-red-500 font-bold transition-colors">ESC / [X]</button>
            </div>
            <div className="space-y-8 overflow-y-auto pr-8">
              {activeInfo.items.map((item, i) => (
                <div key={i} className="bg-blue-900/30 border-l-4 border-blue-500 pl-6 py-6 flex items-start gap-8 shadow-lg rounded-r-lg">
                  {item.institution.includes("PETRONAS") && (
                    <div className="flex-shrink-0 bg-white p-3 rounded-lg border-2 border-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.3)]">
                      <img src="https://upload.wikimedia.org/wikipedia/commons/7/7c/UTP_LOGO.png" alt="UTP Logo" className="w-20 h-20 object-contain" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-3xl font-bold text-white mb-2">{item.subtitle}</h3>
                    <div className="text-blue-300 font-bold mb-4 tracking-wide text-lg">
                      {item.institution} <span className="text-slate-400 font-normal ml-2">| {item.date}</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-lg">{item.details}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Complete Contact Modal */}
      <AnimatePresence>
        {uiState === 'VIEW_CONTACT' && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 bg-purple-950/95 backdrop-blur z-50 flex items-center justify-center p-8 border-[12px] border-purple-900/50">
            <div className="w-full max-w-2xl bg-black border-4 border-purple-700 p-10 rounded-lg shadow-[0_0_60px_rgba(168,85,247,0.3)]">
              <div className="flex justify-between border-b-2 border-purple-800 pb-6 mb-8">
                <h2 className="text-4xl text-purple-400 font-bold uppercase drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">Contact Uplink</h2>
                <button onClick={closeUI} className="text-3xl text-slate-500 hover:text-red-500 font-bold transition-colors">ESC / [X]</button>
              </div>
              <div className="space-y-6 text-xl">
                <p><span className="text-purple-500 font-bold w-32 inline-block">NAME:</span> <span className="text-white">Chong Jia Ze</span></p>
                <p><span className="text-purple-500 font-bold w-32 inline-block">LOC:</span> <span className="text-white">Johor Bahru, Johor</span></p>
                <p><span className="text-purple-500 font-bold w-32 inline-block">EMAIL:</span> <span className="text-white">chong_22010978@utp.edu.my</span></p>
                <p><span className="text-purple-500 font-bold w-32 inline-block">PHONE:</span> <span className="text-white">+60 10-553 6672</span></p>
              </div>
              <a href="mailto:chong_22010978@utp.edu.my" 
                 className="mt-10 block w-full text-center bg-purple-700 hover:bg-purple-500 text-white font-bold tracking-widest text-xl py-4 rounded-lg transition-colors shadow-lg border border-purple-500">
                INITIATE EMAIL SEQUENCE
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}