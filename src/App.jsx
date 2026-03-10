// src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SiPython, SiCplusplus, SiOracle, SiReact, SiTailwindcss } from 'react-icons/si';
import { FaGithub, FaJava, FaRProject } from 'react-icons/fa';
import { ProjectRegistry } from './Data/Projects';
import { DungeonModule } from './Data/dungeons';
import { InfoRegistry } from './Data/info'; 
import PortalOrb from './PortalOrb';
import CyboroLoader from './CyboroLoader';

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

const SacabambaspisSprite = () => (
  <svg viewBox="0 0 100 50" className="w-full h-full drop-shadow-[0_0_15px_rgba(56,189,248,0.8)]">
    <ellipse cx="50" cy="25" rx="45" ry="20" fill="#94a3b8" />
    <ellipse cx="50" cy="22" rx="40" ry="15" fill="#cbd5e1" />
    <circle cx="85" cy="20" r="3" fill="#0f172a" />
    <circle cx="85" cy="30" r="3" fill="#0f172a" />
    <path d="M 90 20 Q 95 25 90 30" fill="none" stroke="#0f172a" strokeWidth="2" />
    <polygon points="5,25 15,10 20,25" fill="#64748b" />
    <polygon points="5,25 15,40 20,25" fill="#64748b" />
  </svg>
);

export default function App() {
  const [isBooting, setIsBooting] = useState(true);
  const [config, setConfig] = useState({
    rotateSkills: true,
    particles: true,
    themeOverride: 'AUTO', 
    weatherOverride: 'AUTO' 
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

  const activeNightMode = config.themeOverride === 'AUTO' ? envData.isNight : config.themeOverride === 'DARK';
  const activeWeather = config.weatherOverride === 'AUTO' ? envData.weatherType : config.weatherOverride;

  // --- PHYSICS & COMBAT REFS ---
  const playerRef = useRef({ 
    x: window.innerWidth * DungeonModule.hub.spawnPoint.rx, 
    y: window.innerHeight * DungeonModule.hub.spawnPoint.ry, 
    vx: 0, vy: 0, speed: 1.2, friction: 0.85, orbitAngle: 0 
  });
  const cameraRef = useRef({ trauma: 0, offsetX: 0, offsetY: 0 });
  const particlesRef = useRef([]);
  const rainRef = useRef([]); 
  const enemiesRef = useRef([]);      
  const projectilesRef = useRef([]);  
  const explosionsRef = useRef([]);   
  const mouseRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  
  const keysRef = useRef(new Set());
  const inputBufferRef = useRef([]);
  const animationRef = useRef();

  const [renderState, setRenderState] = useState({ 
    x: playerRef.current.x, y: playerRef.current.y, orbitAngle: 0, shakeX: 0, shakeY: 0, 
    particles: [], rain: [], enemies: [], projectiles: [], explosions: []
  });

  const closeUI = () => {
    setUiState('EXPLORING');
    setActiveProject(null);
    setActiveInfo(null);
  };

  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };
    const handleClick = () => {
      if (uiState !== 'EXPLORING' || currentDungeon.id !== 'hub') return;
      
      const px = playerRef.current.x;
      const py = playerRef.current.y - 16;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      
      const angle = Math.atan2(my - py, mx - px);
      const speed = 12;
      const randomSkill = EQUIPPED_SKILLS[Math.floor(Math.random() * EQUIPPED_SKILLS.length)];
      
      projectilesRef.current.push({
        id: Math.random(), x: px, y: py,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 100, skill: randomSkill
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
    };
  }, [uiState, currentDungeon.id]);

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
      await new Promise(res => setTimeout(res, 250)); 
      setHackingLogs(prev => [...prev, HACKING_LOG_TEMPLATES[i]]);
    }
    await new Promise(res => setTimeout(res, 400)); 

    let foundProject = null;
    if (Array.isArray(ProjectRegistry)) {
      foundProject = ProjectRegistry.find(p => p.id === projectId);
    } else if (ProjectRegistry) {
      foundProject = ProjectRegistry[projectId];
    }
    
    if (!foundProject) {
       foundProject = {
         title: "404 NOT FOUND", subtitle: "Data Parse Error", role: "N/A", 
         architecture: `Make sure the ID "${projectId}" matches your Data/Projects.js keys exactly.`,
         impact: ["Data unlinked"], techStack: ["Error Handling"], githubLink: ""
       };
    }

    setActiveProject(foundProject);
    setUiState('VIEW_PROJECT');
  };

  const executeTrigger = (trigger) => {
    if (trigger.type === "DUNGEON_EXIT") {
      const nextDungeon = DungeonModule[trigger.targetDungeon];
      setCurrentDungeon(nextDungeon);
      playerRef.current.x = windowSize.width * nextDungeon.spawnPoint.rx;
      playerRef.current.y = windowSize.height * nextDungeon.spawnPoint.ry;
      playerRef.current.vx = 0; playerRef.current.vy = 0;
      cameraRef.current.trauma = 0.5; 
      enemiesRef.current = []; projectilesRef.current = []; explosionsRef.current = [];
    } 
    else if (trigger.type === "PROJECT_TERMINAL") triggerHackingSequence(trigger.projectId);
    else if (trigger.type === "GITHUB_RACK") fetchGitHubActivity();
    else if (trigger.type === "INFO_BOARD") {
      setActiveInfo(InfoRegistry[trigger.infoId]);
      setUiState('VIEW_INFO');
    }
    else if (trigger.type === "EXTERNAL_LINK") {
      window.open(trigger.url, '_blank');
    }
    else if (trigger.type === "CONTACT_INFO") {
      setUiState('VIEW_CONTACT');
    }
  };

  const gameLoop = () => {
    // Pause physics if booting or a UI modal is open
    if (isBooting || uiState !== 'EXPLORING') {
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

    if (config.particles && isMoving && Math.random() > 0.6) {
      particlesRef.current.push({ id: Math.random(), x: p.x + (Math.random() * 30 - 15), y: p.y + 25, life: 1.0 });
    }
    particlesRef.current = particlesRef.current.filter(part => part.life > 0).map(part => {
      part.life -= 0.05; part.y -= 0.5; return part;
    });

    if (currentDungeon.id === 'hub') {
      if (Math.random() < 0.015 && enemiesRef.current.length < 5) { 
        const edge = Math.floor(Math.random() * 4);
        let ex, ey;
        if (edge === 0) { ex = Math.random() * windowSize.width; ey = -50; } 
        if (edge === 1) { ex = Math.random() * windowSize.width; ey = windowSize.height + 50; } 
        if (edge === 2) { ex = -50; ey = Math.random() * windowSize.height; } 
        if (edge === 3) { ex = windowSize.width + 50; ey = Math.random() * windowSize.height; } 
        enemiesRef.current.push({ id: Math.random(), x: ex, y: ey, speed: 1 + Math.random() });
      }

      enemiesRef.current.forEach(enemy => {
        const angle = Math.atan2(p.y - enemy.y, p.x - enemy.x);
        enemy.x += Math.cos(angle) * enemy.speed;
        enemy.y += Math.sin(angle) * enemy.speed;
      });

      projectilesRef.current = projectilesRef.current.filter(proj => proj.life > 0);
      projectilesRef.current.forEach(proj => {
        proj.x += proj.vx; proj.y += proj.vy; proj.life--;
      });

      for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
        const proj = projectilesRef.current[i];
        let hit = false;
        for (let j = enemiesRef.current.length - 1; j >= 0; j--) {
          const enemy = enemiesRef.current[j];
          const dist = Math.hypot(proj.x - enemy.x, proj.y - enemy.y);
          if (dist < 30) { 
            explosionsRef.current.push({ id: Math.random(), x: enemy.x, y: enemy.y, life: 1.0 });
            enemiesRef.current.splice(j, 1);
            hit = true; break; 
          }
        }
        if (hit) projectilesRef.current.splice(i, 1); 
      }
    }

    explosionsRef.current = explosionsRef.current.filter(exp => exp.life > 0);
    explosionsRef.current.forEach(exp => { exp.life -= 0.04; });

    if (activeWeather === 'RAIN') {
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

    if (config.rotateSkills) p.orbitAngle += 0.05;

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
      x: p.x, y: p.y, orbitAngle: p.orbitAngle, shakeX: cam.offsetX, shakeY: cam.offsetY, 
      particles: [...particlesRef.current], rain: [...rainRef.current],
      enemies: [...enemiesRef.current], projectiles: [...projectilesRef.current], explosions: [...explosionsRef.current]
    });
    
    animationRef.current = requestAnimationFrame(gameLoop);
  };

  useEffect(() => {
    animationRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationRef.current);
  }, [uiState, isBooting, currentDungeon, windowSize, activeWeather, config]); 

  const bgClass = activeNightMode ? 'bg-slate-950' : 'bg-slate-200';
  const textClass = activeNightMode ? 'text-white' : 'text-slate-900';

  const cycleTheme = () => {
    const modes = ['AUTO', 'LIGHT', 'DARK'];
    setConfig(p => ({ ...p, themeOverride: modes[(modes.indexOf(p.themeOverride) + 1) % 3] }));
  };
  const cycleWeather = () => {
    const modes = ['AUTO', 'CLEAR', 'CLOUDY', 'RAIN'];
    setConfig(p => ({ ...p, weatherOverride: modes[(modes.indexOf(p.weatherOverride) + 1) % 4] }));
  };

  return (
    <>
      <AnimatePresence>
        {isBooting && <CyboroLoader onComplete={() => setIsBooting(false)} />}
      </AnimatePresence>

      <div className={`w-screen h-screen ${bgClass} ${textClass} font-mono selection:bg-teal-500 overflow-hidden relative transition-colors duration-1000`}
           style={{ transform: `translate(${renderState.shakeX}px, ${renderState.shakeY}px)` }}>
        
        {/* 1. LAYERED BACKGROUND SPRITES */}
        <div className="absolute inset-0 z-0">
          <div className={`absolute inset-0 bg-[radial-gradient(${activeNightMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'}_2px,transparent_2px)] bg-[length:40px_40px]`}></div>
          
          {activeNightMode ? (
            <div className="absolute top-10 right-20 w-24 h-24 bg-slate-200 rounded-full shadow-[0_0_50px_#f8fafc] opacity-80"></div>
          ) : (
            <div className="absolute top-10 right-20 w-32 h-32 bg-yellow-400 rounded-full shadow-[0_0_80px_#facc15] opacity-90 animate-[pulse_4s_ease-in-out_infinite]"></div>
          )}
        </div>

        {/* 2. CLOUD INFRASTRUCTURE: NETWORK TOPOLOGY LINES */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 opacity-30">
          {currentDungeon.triggers.map(t => {
            const startX = windowSize.width * currentDungeon.spawnPoint.rx;
            const startY = windowSize.height * currentDungeon.spawnPoint.ry;
            const endX = t.rx * windowSize.width;
            const endY = t.ry * windowSize.height;
            return (
              <line key={`line-${t.id}`} x1={startX} y1={startY} x2={endX} y2={endY} 
                    stroke={activeNightMode ? "#14b8a6" : "#0f766e"} strokeWidth="2" strokeDasharray="6 6" className="animate-[pulse_3s_ease-in-out_infinite]" />
            );
          })}
          <circle cx={windowSize.width * currentDungeon.spawnPoint.rx} cy={windowSize.height * currentDungeon.spawnPoint.ry} 
                  r="40" fill="none" stroke={activeNightMode ? "#14b8a6" : "#0f766e"} strokeWidth="2" className="animate-[spin_10s_linear_infinite]" strokeDasharray="15 10"/>
        </svg>

        {/* 3. ATMOSPHERIC CLOUDS */}
        {(activeWeather === 'CLOUDY' || activeWeather === 'RAIN') && (
          <div className="absolute inset-0 pointer-events-none z-10 opacity-40 overflow-hidden">
            <div className={`absolute top-20 left-10 w-64 h-20 ${activeNightMode ? 'bg-slate-300' : 'bg-slate-500'} rounded-full blur-xl opacity-50 animate-[slide_20s_linear_infinite]`}></div>
            <div className={`absolute top-40 right-20 w-96 h-24 ${activeNightMode ? 'bg-slate-300' : 'bg-slate-500'} rounded-full blur-xl opacity-40 animate-[slide_35s_linear_infinite_reverse]`}></div>
          </div>
        )}

        {/* 4. TRUE RAIN RENDERING */}
        <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
          {renderState.rain.map(r => (
            <div key={r.id} className="absolute w-[2px] bg-blue-400/70 rounded-full rotate-12"
                 style={{ left: r.x, top: r.y, height: r.length }} />
          ))}
        </div>

        {/* 5. UI HUD */}
        <div className="absolute top-6 left-6 z-50 flex flex-col gap-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] pointer-events-none">
          <div className={`font-bold tracking-widest uppercase text-3xl drop-shadow-[0_0_8px_currentColor] ${activeNightMode ? 'text-white' : 'text-slate-900'}`}>
            {currentDungeon.name}
          </div>
          <div className={`flex gap-4 text-sm px-3 py-1 rounded-md border w-fit backdrop-blur-sm ${activeNightMode ? 'bg-black/50 text-slate-200 border-slate-600' : 'bg-white/50 text-slate-800 border-slate-300'}`}>
             <span>SYS_TIME: <span className="text-teal-500 font-bold">{envData.timeString}</span></span>
             <span>ATMOSPHERE: <span className="text-teal-500 font-bold">{activeWeather}</span></span>
          </div>
        </div>

        {/* 6. GAME ENTITIES & COMBAT */}
        <div className="absolute inset-0 z-20 pointer-events-none">
          
          {currentDungeon.triggers.map(t => {
            const absX = t.rx * windowSize.width;
            const absY = t.ry * windowSize.height;
            const dist = Math.sqrt(Math.pow(renderState.x - absX, 2) + Math.pow(renderState.y - absY, 2));
            const proximityScale = Math.max(1, 1.5 - dist / 300);
            
            let hexColor = '#14b8a6';
            if (t.type === 'DUNGEON_EXIT') hexColor = '#a855f7';
            else if (t.type === 'GITHUB_RACK' || t.type === 'EXTERNAL_LINK') hexColor = '#22c55e';
            else if (t.type === 'INFO_BOARD' || t.type === 'CONTACT_INFO') hexColor = '#3b82f6';
            
           
              const appBgHex = activeNightMode ? '#020617' : '#e2e8f0';

              return (
                <div key={t.id} className="absolute flex flex-col items-center justify-center pointer-events-auto"
                    style={{ width: t.radius * 2, height: t.radius * 2, left: absX - t.radius, top: absY - t.radius, zIndex: proximityScale > 1.2 ? 25 : 10 }}>
                  
                  {/* Notice we added bgColorHex={appBgHex} */}
                  <PortalOrb colorHex={hexColor} bgColorHex={appBgHex} scale={proximityScale} />
                  
                  <span className={`absolute -bottom-8 whitespace-nowrap text-xs tracking-widest font-bold ${activeNightMode ? 'text-slate-400' : 'text-slate-600'} opacity-50`}>{t.label}</span>
                </div>
              );
          })}

          {renderState.enemies.map(enemy => (
             <div key={enemy.id} className="absolute w-8 h-8 -ml-4 -mt-4 bg-red-600 rounded-sm shadow-[0_0_20px_#ef4444] flex items-center justify-center animate-pulse z-20"
                  style={{ left: enemy.x, top: enemy.y }}>
               <span className="text-white text-[10px] font-black tracking-widest">BUG</span>
             </div>
          ))}

          {renderState.projectiles.map(proj => (
             <div key={proj.id} className={`absolute w-6 h-6 -ml-3 -mt-3 flex items-center justify-center ${proj.skill.color} drop-shadow-[0_0_10px_currentColor] z-20`} 
                  style={{ left: proj.x, top: proj.y }}>
               {proj.skill.icon}
             </div>
          ))}

          {renderState.explosions.map(exp => (
             <div key={exp.id} className="absolute w-20 h-20 -ml-10 -mt-10 border-4 border-red-500 rounded-full z-20" 
                  style={{ left: exp.x, top: exp.y, transform: `scale(${2.5 - exp.life})`, opacity: exp.life }} />
          ))}

          {renderState.particles.map(p => (
            <div key={p.id} className={`absolute w-2 h-2 rounded-full shadow-[0_0_5px_currentColor] ${activeNightMode ? 'bg-slate-200 text-white' : 'bg-slate-500 text-slate-500'}`} style={{ left: p.x, top: p.y, opacity: p.life }} />
          ))}

          {/* PLAYER SPRITE GROUP */}
          <div className="absolute w-16 h-16 transition-none z-30" style={{ left: renderState.x - 32, top: renderState.y - 32 }}>
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-12 h-4 bg-black/40 blur-[4px] rounded-[100%] scale-y-50"></div>

            {easterEggActive ? (
              <div className="relative w-full h-full animate-bounce">
                <SacabambaspisSprite />
                <div className="absolute -top-24 left-1/2 -translate-x-1/2 text-cyan-300 font-black tracking-widest text-2xl whitespace-nowrap animate-pulse drop-shadow-[0_0_10px_currentColor] z-[999]">
                  &lt; HIRE ME /&gt;
                </div>
              </div>
            ) : (
              <PlayerSprite />
            )}
            
            {EQUIPPED_SKILLS.map(skill => {
              const x = Math.cos(renderState.orbitAngle + skill.offset) * 85; 
              const y = Math.sin(renderState.orbitAngle + skill.offset) * 85; 
              return (
                <motion.div key={skill.id} className={`absolute w-10 h-10 rounded-full bg-black/90 border-2 flex items-center justify-center ${skill.color} shadow-[0_0_15px_currentColor] pointer-events-auto`}
                     style={{ left: 12 + x, top: 12 + y, zIndex: 10 }} title={skill.name} whileHover={{ scale: 1.3, zIndex: 50 }}>
                  {skill.icon}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* BOTTOM LEFT: CONTROL HINTS */}
        <div className={`absolute bottom-6 left-6 z-50 pointer-events-none opacity-60 text-xs font-bold tracking-[0.1em] border-l-2 border-teal-500/50 pl-3 ${activeNightMode ? 'drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]' : ''}`}>
          <div className="flex flex-col gap-1">
            <p><span className="text-teal-500">[WASD]</span> MOVE SYSTEM</p>
            <p><span className="text-teal-500">[CLICK]</span> DEPLOY SKILLS</p>
            <p><span className="text-teal-500">[F]</span> ACCESS TERMINAL</p>
            <p className="mt-2 text-[10px] text-slate-400 opacity-50"><span className="text-teal-500">[SYS_OVERRIDE]</span> ↑ ↑ ↓ ↓ ← → ← →</p>
          </div>
        </div>

        {/* BOTTOM RIGHT: OVERRIDE TRAY */}
        <div className="absolute bottom-6 right-6 z-50 flex gap-3 drop-shadow-[0_4px_4px_rgba(0,0,0,0.3)]">
          <button onClick={cycleTheme} className={`px-3 py-2 border rounded-md transition-colors backdrop-blur-sm text-xs font-bold ${config.themeOverride !== 'AUTO' ? 'border-yellow-400 text-yellow-500 bg-yellow-900/20' : activeNightMode ? 'border-slate-600 text-slate-400 bg-black/40' : 'border-slate-400 text-slate-600 bg-white/60 hover:bg-white'}`}>THEME: {config.themeOverride}</button>
          <button onClick={cycleWeather} className={`px-3 py-2 border rounded-md transition-colors backdrop-blur-sm text-xs font-bold ${config.weatherOverride !== 'AUTO' ? 'border-sky-400 text-sky-500 bg-sky-900/20' : activeNightMode ? 'border-slate-600 text-slate-400 bg-black/40' : 'border-slate-400 text-slate-600 bg-white/60 hover:bg-white'}`}>WX: {config.weatherOverride}</button>
          <button onClick={() => setConfig(p => ({...p, rotateSkills: !p.rotateSkills}))} className={`px-3 py-2 border rounded-md transition-colors backdrop-blur-sm text-xs font-bold ${config.rotateSkills ? 'border-teal-400 text-teal-500 bg-teal-900/20' : activeNightMode ? 'border-slate-600 text-slate-400 bg-black/40' : 'border-slate-400 text-slate-600 bg-white/60 hover:bg-white'}`}>{config.rotateSkills ? '🌀 ORBIT' : '🛑 FIXED'}</button>
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

        {/* --- UI MODALS --- */}
        <AnimatePresence>
          {uiState === 'HACKING' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/95 z-50 p-10 flex flex-col justify-end border-[8px] border-slate-900 overflow-hidden text-white">
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

        <AnimatePresence>
          {uiState === 'VIEW_PROJECT' && activeProject && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="absolute inset-0 bg-slate-900/95 backdrop-blur z-50 p-12 border-[16px] border-slate-800 flex flex-col text-white">
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

        <AnimatePresence>
          {uiState === 'VIEW_GITHUB' && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 bg-slate-950/95 backdrop-blur z-50 flex items-center justify-center p-8 border-[12px] border-green-900/50 text-white">
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

        <AnimatePresence>
          {uiState === 'VIEW_INFO' && activeInfo && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 bg-blue-950/95 backdrop-blur z-50 p-12 border-[16px] border-blue-900 flex flex-col text-white">
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

        <AnimatePresence>
          {uiState === 'VIEW_CONTACT' && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 bg-purple-950/95 backdrop-blur z-50 flex items-center justify-center p-8 border-[12px] border-purple-900/50 text-white">
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
    </>
  );
}