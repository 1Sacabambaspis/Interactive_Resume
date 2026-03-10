// src/CyboroLoader.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import * as THREE from 'three';

const LOG_MESSAGES = [
  "LOADING ASSETS...",
  "BUILDING GEOMETRY...",
  "COMPILING SHADERS...",
  "MAPPING TEXTURES...",
  "ESTABLISHING CONNECTION..."
];

export default function CyboroLoader({ onComplete }) {
  const mountRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [logIndex, setLogIndex] = useState(0);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    // --- THREE.JS SETUP ---
    const scene = new THREE.Scene();
    const aspect = window.innerWidth / window.innerHeight;
    const d = 5; 
    const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
    camera.position.set(10, 10, 10); 
    camera.lookAt(scene.position);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    if (mountRef.current) mountRef.current.appendChild(renderer.domElement);

    // --- STIPPLE BACKGROUND ---
    const noiseFragmentShader = `
      uniform float uTime;
      uniform vec2 uResolution;
      varying vec2 vUv;
      float random(vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123); }
      void main() {
        vec2 center = vec2(0.45, 0.45); 
        float dist = distance(vUv, center);
        float angle = atan(vUv.y - center.y, vUv.x - center.x);
        float radius = 0.3 + 0.1 * sin(angle * 3.0 + uTime * 0.5);
        float mask = smoothstep(radius, 0.0, dist);
        vec2 noiseUv = vUv * min(uResolution.x, uResolution.y) * 0.5;
        float noiseVal = random(noiseUv + uTime * 0.1);
        float stipple = step(noiseVal, mask * 1.5);
        gl_FragColor = vec4(vec3(0.04, 0.04, 0.04), stipple * 0.9);
      }
    `;
    const noiseMaterial = new THREE.ShaderMaterial({
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: noiseFragmentShader,
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
      }
    });
    const noisePlane = new THREE.Mesh(new THREE.PlaneGeometry(15, 15), noiseMaterial);
    noisePlane.lookAt(camera.position);
    noisePlane.position.set(-1, -1, -2); 
    scene.add(noisePlane);

    // --- CENTRAL OBJECTS ---
    const group = new THREE.Group();
    scene.add(group);

    const boxGeo = new THREE.BoxGeometry(6, 6, 6);
    const edges = new THREE.EdgesGeometry(boxGeo);
    const wireframeBox = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x0A0A0A, linewidth: 2, transparent: true })); 
    group.add(wireframeBox);

    const gradientFragmentShader = `
      varying vec2 vUv;
      varying vec3 vPosition;
      uniform float uProgress;
      void main() {
        vec3 teal = vec3(0.17, 0.86, 0.66);  
        vec3 yellow = vec3(0.90, 0.88, 0.42); 
        float mixFactor = (vPosition.x + vPosition.y + 5.0) / 10.0;
        vec3 finalColor = mix(teal, yellow, mixFactor);
        float wipe = step(vPosition.y + 2.5, uProgress * 5.0);
        if (wipe < 0.5) discard; 
        float edge = smoothstep(0.0, 0.05, vUv.x) * smoothstep(1.0, 0.95, vUv.x) * smoothstep(0.0, 0.05, vUv.y) * smoothstep(1.0, 0.95, vUv.y);
        if (edge < 0.5) { gl_FragColor = vec4(vec3(0.04), 1.0); } 
        else { gl_FragColor = vec4(finalColor, 1.0); }
      }
    `;
    const solidMaterial = new THREE.ShaderMaterial({
      vertexShader: `varying vec2 vUv; varying vec3 vPosition; void main() { vUv = uv; vPosition = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: gradientFragmentShader,
      side: THREE.DoubleSide,
      uniforms: { uProgress: { value: 0.0 } }
    });

    const innerMesh = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 0.5, 32), solidMaterial);
    innerMesh.rotation.x = Math.PI / 2; 
    innerMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(innerMesh.geometry), new THREE.LineBasicMaterial({ color: 0x0A0A0A })));
    group.add(innerMesh);

    // --- ANIMATION LOOP ---
    const clock = new THREE.Clock();
    let currentProg = 0;
    let targetProg = 0;
    let completionPhase = false;
    let animId;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();
      noiseMaterial.uniforms.uTime.value = time;

      // Smoothly interpolate progress
      currentProg += (targetProg - currentProg) * 0.05;
      solidMaterial.uniforms.uProgress.value = currentProg / 100;
      setProgress(Math.floor(currentProg));

      if (!completionPhase) {
        const rotSpeed = 0.2 + (currentProg / 100) * 2.0;
        group.rotation.y = time * rotSpeed * 0.5;
        group.rotation.x = Math.sin(time * 0.2) * 0.2; 
      } else {
        // Explode wireframe & snap rotation on completion
        wireframeBox.scale.lerp(new THREE.Vector3(1.5, 1.5, 1.5), 0.05);
        wireframeBox.material.opacity = THREE.MathUtils.lerp(wireframeBox.material.opacity, 0, 0.1);
        group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, Math.PI / 4, 0.05);
        group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, 0, 0.05);
      }

      renderer.render(scene, camera);
    };
    animate();

    // --- FAKE LOAD SEQUENCE ---
    const steps = [ { t: 14, d: 800 }, { t: 33, d: 600 }, { t: 76, d: 1200 }, { t: 89, d: 500 }, { t: 100, d: 800 } ];
    let delayAcc = 0;
    steps.forEach((step, i) => {
      setTimeout(() => {
        targetProg = step.t;
        if(i < steps.length - 1) setLogIndex(i + 1);
        if(step.t === 100) {
          setTimeout(() => {
            completionPhase = true;
            setIsDone(true);
            setTimeout(onComplete, 1500); // Wait for final explosion animation before unmounting
          }, step.d);
        }
      }, delayAcc);
      delayAcc += step.d;
    });

    const handleResize = () => {
      const aspect = window.innerWidth / window.innerHeight;
      camera.left = -d * aspect; camera.right = d * aspect; camera.top = d; camera.bottom = -d;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      noiseMaterial.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      if (mountRef.current && renderer.domElement) mountRef.current.removeChild(renderer.domElement);
      scene.clear();
      renderer.dispose();
    };
  }, []); // Empty array ensures this only runs once

  return (
    <motion.div exit={{ opacity: 0 }} transition={{ duration: 1 }} className="fixed inset-0 z-[100] bg-[#F4F4F2] text-[#0A0A0A] font-mono cursor-wait overflow-hidden select-none">
      <div ref={mountRef} className="absolute inset-0 z-10" />
      
      {/* HTML UI OVERLAY */}
      <div className="absolute inset-0 z-20 pointer-events-none p-8 flex flex-col justify-between">
        <div className="flex justify-between w-full">
          <div>
            <div className="text-[0.65rem] tracking-[0.1em] opacity-70">SYS.ID: CYB-09X</div>
            <div className="text-[0.65rem] tracking-[0.1em] opacity-40 mt-2">INITIATING SEQUENCE</div>
          </div>
          <div className="text-3xl font-serif leading-none">* * *</div>
        </div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-start mix-blend-difference text-white">
           <span className="font-serif italic tracking-tighter leading-[0.8] text-[15vw] tabular-nums">{progress}</span>
           <span className="font-serif text-[4vw] mt-[1vw] ml-[0.5vw]">%</span>
        </div>

        <div className="flex justify-between w-full items-end">
          <div className="h-[1.2em] overflow-hidden text-[0.65rem] tracking-[0.1em] opacity-70 uppercase w-64">
            <motion.ul animate={{ y: isDone ? 0 : `-${logIndex * 1.2}em` }} transition={{ type: "spring", stiffness: 100, damping: 15 }}>
              {isDone ? <li>SYSTEM.ONLINE // ACCESS GRANTED</li> : LOG_MESSAGES.map((msg, i) => <li key={i} className="leading-[1.2em]">{msg}</li>)}
            </motion.ul>
          </div>
          <div className="text-right text-[0.65rem] tracking-[0.1em] opacity-70 uppercase">
            VOL. <br /><span className="text-2xl text-[#0A0A0A] opacity-100">01</span>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[200px] h-[1px] bg-[#0A0A0A]/10 overflow-hidden">
          <div className="h-full bg-[#0A0A0A] origin-left" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </motion.div>
  );
}