import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function PortalOrb({ colorHex, scale }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const scene = new THREE.Scene();
    // Use an orthographic camera to keep the portal size consistent in your 2D space
    const camera = new THREE.OrthographicCamera(-4, 4, 4, -4, 0.1, 100);
    camera.position.z = 10;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    // Keep the canvas small to match the portal radius
    renderer.setSize(100, 100);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

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

      // Simplex noise functions omitted for brevity (insert the snoise block from the Mars orb here)
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
        float angle = time * 0.5;
        mat3 rotY = mat3(cos(angle), 0.0, sin(angle), 0.0, 1.0, 0.0, -sin(angle), 0.0, cos(angle));
        vec3 noisePos = rotY * vPosition * 2.0;
        
        float noiseVal = snoise(noisePos);
        vec3 finalColor = colorBase;
        
        if (noiseVal > 0.1) {
            finalColor = colorHighlight;
        } else if (lightIntensity < -0.2) {
            finalColor = mix(colorBase, colorShadow, 0.8);
        }
        
        // High-tech stipple edge effect
        float viewDot = dot(normalize(vNormal), vec3(0,0,1));
        if (viewDot < 0.4 && viewDot > 0.0) {
             if (mod(gl_FragCoord.x + gl_FragCoord.y, 4.0) < 2.0) {
                finalColor = colorShadow;
             }
        }
        
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    const uniforms = {
      time: { value: 0 },
      colorBase: { value: new THREE.Color(colorHex) },
      colorHighlight: { value: new THREE.Color('#ffffff') },
      colorShadow: { value: new THREE.Color('#0f172a') } // Slate 900
    };

    const geometry = new THREE.IcosahedronGeometry(3, 16);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: true,
    });

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
      mountRef.current?.removeChild(renderer.domElement);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [colorHex]);

  return (
    <div 
      ref={mountRef} 
      style={{ transform: `scale(${scale})`, transition: 'transform 0.2s ease-out' }}
      className="pointer-events-none drop-shadow-[0_0_15px_currentColor]"
    />
  );
}