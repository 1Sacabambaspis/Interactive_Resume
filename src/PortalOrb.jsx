// src/PortalOrb.jsx
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function PortalOrb({ colorHex, bgColorHex, scale }) {
  const mountRef = useRef(null);
  const materialRef = useRef(null);

  useEffect(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-4, 4, 4, -4, 0.1, 100);
    camera.position.z = 10;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(120, 120); // Slightly larger canvas to fit the swirling edges
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    if (mountRef.current) mountRef.current.appendChild(renderer.domElement);

    const vertexShader = `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform vec3 colorBase;
      uniform vec3 colorHighlight;
      uniform vec3 colorShadow;
      uniform float time;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vPosition;

      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
      vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
      float snoise(vec3 v) {
          const vec2 C = vec2(1.0/6.0, 1.0/3.0);
          const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
          vec3 i  = floor(v + dot(v, C.yyy));
          vec3 x0 = v - i + dot(i, C.xxx);
          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min( g.xyz, l.zxy );
          vec3 i2 = max( g.xyz, l.zxy );
          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;
          i = mod289(i);
          vec4 p = permute( permute( permute( i.z + vec4(0.0, i1.z, i2.z, 1.0 )) + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
          float n_ = 0.142857142857;
          vec3  ns = n_ * D.wyz - D.xzx;
          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_ );
          vec4 x = x_ *ns.x + ns.yyyy;
          vec4 y = y_ *ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);
          vec4 b0 = vec4( x.xy, y.xy );
          vec4 b1 = vec4( x.zw, y.zw );
          vec4 s0 = floor(b0)*2.0 + 1.0;
          vec4 s1 = floor(b1)*2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));
          vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
          vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
          vec3 p0 = vec3(a0.xy,h.x);
          vec3 p1 = vec3(a0.zw,h.y);
          vec3 p2 = vec3(a1.xy,h.z);
          vec3 p3 = vec3(a1.zw,h.w);
          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
          p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
      }

      void main() {
        vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
        float lightIntensity = dot(vNormal, lightDir);
        float angle = time * 0.4;
        mat3 rotY = mat3(cos(angle), 0.0, sin(angle), 0.0, 1.0, 0.0, -sin(angle), 0.0, cos(angle));
        vec3 noisePos = rotY * vPosition * 1.8;
        
        float noiseVal = snoise(noisePos);
        
        // BASE color exactly matches the HTML background, making it "invisible"
        vec3 finalColor = colorBase; 
        
        // Swirling energy lines colored by the specific trigger color
        if (noiseVal > 0.05) {
            finalColor = colorHighlight;
        } else if (lightIntensity < -0.1) {
            finalColor = mix(colorBase, colorShadow, 0.6);
        }
        
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    const uniforms = {
      time: { value: 0 },
      colorBase: { value: new THREE.Color(bgColorHex) },
      colorHighlight: { value: new THREE.Color(colorHex) },
      colorShadow: { value: new THREE.Color(colorHex).multiplyScalar(0.3) } // Dynamic dark shadow based on the core color
    };

    const geometry = new THREE.IcosahedronGeometry(3.5, 30);
    const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, transparent: true });
    materialRef.current = material;
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    let animationId;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      uniforms.time.value += 0.02;
      sphere.rotation.y += 0.01;
      sphere.rotation.x += 0.005;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      if (mountRef.current && renderer.domElement) mountRef.current.removeChild(renderer.domElement);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []); // Run setup once

  // Dynamically update colors when theme overrides happen without re-mounting the whole canvas
  useEffect(() => {
    if(materialRef.current) {
       materialRef.current.uniforms.colorBase.value.set(bgColorHex);
       materialRef.current.uniforms.colorHighlight.value.set(colorHex);
       materialRef.current.uniforms.colorShadow.value.set(new THREE.Color(colorHex).multiplyScalar(0.3));
    }
  }, [bgColorHex, colorHex]);

  return (
    <div 
      ref={mountRef} 
      style={{ transform: `scale(${scale})`, transition: 'transform 0.2s ease-out' }}
      className="pointer-events-none drop-shadow-[0_0_20px_currentColor] -ml-[10px] -mt-[10px]"
    />
  );
}