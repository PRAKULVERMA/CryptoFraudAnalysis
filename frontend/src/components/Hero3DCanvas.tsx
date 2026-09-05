import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Hero3DCanvasProps {
  scrollProgress: number; // 0 (top of hero) to 1 (scrolled down)
  mousePos: { x: number; y: number };
}

export const Hero3DCanvas: React.FC<Hero3DCanvasProps> = ({ scrollProgress, mousePos }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const planetGroupRef = useRef<THREE.Group | null>(null);
  const coreSphereRef = useRef<THREE.Mesh | null>(null);
  const atmosphereRef = useRef<THREE.Mesh | null>(null);
  const ringRef = useRef<THREE.Mesh | null>(null);
  const outerRingRef = useRef<THREE.Mesh | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const lightsRef = useRef<{ mainLight: THREE.PointLight; rimLight: THREE.DirectionalLight } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera Setup
    const width = container.clientWidth;
    const height = container.clientHeight;
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    // Initial camera position positioned to frame the upper rim of the planet as in screenshot
    camera.position.set(0, 1.2, 5.2);
    camera.lookAt(0, -0.4, 0);
    cameraRef.current = camera;

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Planet & Celestial Structure
    const planetGroup = new THREE.Group();
    // Default position: lower down so top rim arches across the screen like in screenshot
    planetGroup.position.set(0, -2.1, 0);
    planetGroup.rotation.x = 0.28;
    planetGroup.rotation.z = -0.12;
    scene.add(planetGroup);
    planetGroupRef.current = planetGroup;

    // Procedural texture for the planet surface (dark obsidian / charcoal with faint volcanic magma veins)
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Base dark charcoal gradient
      const grad = ctx.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0, '#100c0b');
      grad.addColorStop(0.5, '#070505');
      grad.addColorStop(1, '#020101');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1024, 512);

      // Add subtle noise & faint warm fractures
      for (let i = 0; i < 70; i++) {
        const x = Math.random() * 1024;
        const y = Math.random() * 512;
        const radius = 20 + Math.random() * 80;
        const spotGrad = ctx.createRadialGradient(x, y, 0, x, y, radius);
        spotGrad.addColorStop(0, 'rgba(234, 88, 12, 0.12)');
        spotGrad.addColorStop(0.6, 'rgba(120, 30, 5, 0.04)');
        spotGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = spotGrad;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const planetTexture = new THREE.CanvasTexture(canvas);

    // Core Sphere
    const sphereRadius = 2.4;
    const sphereGeo = new THREE.SphereGeometry(sphereRadius, 64, 64);
    const sphereMat = new THREE.MeshStandardMaterial({
      map: planetTexture,
      roughness: 0.75,
      metalness: 0.35,
      color: 0x141010,
    });
    const coreSphere = new THREE.Mesh(sphereGeo, sphereMat);
    planetGroup.add(coreSphere);
    coreSphereRef.current = coreSphere;

    // Atmosphere / Corona Outer Glow using Custom Fresnel Shader
    const atmosphereGeo = new THREE.SphereGeometry(sphereRadius * 1.045, 64, 64);
    const atmosphereShader = {
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vec3 viewDir = normalize(vViewPosition);
          float fresnel = 1.0 - max(dot(vNormal, viewDir), 0.0);
          fresnel = pow(fresnel, 2.6);

          // Sophisticated Dark: Warm luxury bronze (#A58B6F) to champagne rim glow
          vec3 bronzeColor = vec3(0.65, 0.55, 0.44);
          vec3 champagneColor = vec3(0.95, 0.88, 0.76);
          vec3 rimColor = mix(bronzeColor, champagneColor, fresnel * 0.85);
          float alpha = smoothstep(0.0, 0.95, fresnel) * 0.92;
          gl_FragColor = vec4(rimColor * 1.5, alpha);
        }
      `,
    };

    const atmosphereMat = new THREE.ShaderMaterial({
      vertexShader: atmosphereShader.vertexShader,
      fragmentShader: atmosphereShader.fragmentShader,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });

    const atmosphere = new THREE.Mesh(atmosphereGeo, atmosphereMat);
    planetGroup.add(atmosphere);
    atmosphereRef.current = atmosphere;

    // Primary Equatorial Metallic Ring (Warm bronze luster matching Sophisticated Dark)
    const ringInner = sphereRadius * 1.06;
    const ringOuter = sphereRadius * 1.52;
    const ringGeo = new THREE.RingGeometry(ringInner, ringOuter, 128);

    // Generate gradient texture for the ring with metallic luster and illuminated edge
    const ringCanvas = document.createElement('canvas');
    ringCanvas.width = 512;
    ringCanvas.height = 32;
    const ringCtx = ringCanvas.getContext('2d');
    if (ringCtx) {
      const grad = ringCtx.createLinearGradient(0, 0, 512, 0);
      grad.addColorStop(0.0, 'rgba(215, 185, 150, 0.95)'); // Champagne inner rim
      grad.addColorStop(0.12, 'rgba(165, 139, 111, 0.75)'); // Bronze tone (#A58B6F)
      grad.addColorStop(0.35, 'rgba(100, 80, 60, 0.45)');
      grad.addColorStop(0.55, 'rgba(30, 25, 20, 0.2)');
      grad.addColorStop(0.72, 'rgba(145, 120, 95, 0.55)');
      grad.addColorStop(0.85, 'rgba(195, 168, 135, 0.7)');
      grad.addColorStop(1.0, 'rgba(210, 180, 145, 0.0)');
      ringCtx.fillStyle = grad;
      ringCtx.fillRect(0, 0, 512, 32);
    }
    const ringTex = new THREE.CanvasTexture(ringCanvas);

    const ringMat = new THREE.MeshBasicMaterial({
      map: ringTex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2 + 0.18;
    ring.rotation.y = -0.15;
    planetGroup.add(ring);
    ringRef.current = ring;

    // Secondary subtle outer orbital telemetry ring (Bronze #A58B6F wireframe)
    const outerRingGeo = new THREE.RingGeometry(sphereRadius * 1.62, sphereRadius * 1.635, 96);
    const outerRingMat = new THREE.MeshBasicMaterial({
      color: 0xa58b6f,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
    });
    const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    outerRing.rotation.x = Math.PI / 2 + 0.18;
    outerRing.rotation.y = -0.15;
    planetGroup.add(outerRing);
    outerRingRef.current = outerRing;

    // Additional wireframe geodesic ring matching design theme
    const wireframeOrbitGeo = new THREE.RingGeometry(sphereRadius * 1.82, sphereRadius * 1.83, 128);
    const wireframeOrbitMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.12,
    });
    const wireframeOrbit = new THREE.Mesh(wireframeOrbitGeo, wireframeOrbitMat);
    wireframeOrbit.rotation.x = Math.PI / 2 - 0.1;
    wireframeOrbit.rotation.z = 0.2;
    planetGroup.add(wireframeOrbit);

    // 5. Starfield & Ambient Embers / Floating Stardust
    const particleCount = 700;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      // Spread across 3D space
      positions[idx] = (Math.random() - 0.5) * 22;
      positions[idx + 1] = (Math.random() - 0.5) * 14 + 1;
      positions[idx + 2] = (Math.random() - 0.5) * 12 - 2;

      // Color variation: bronze (#A58B6F), champagne, and starlight white
      const rand = Math.random();
      if (rand > 0.45) {
        colors[idx] = 0.65; // bronze R
        colors[idx + 1] = 0.55; // bronze G
        colors[idx + 2] = 0.44; // bronze B
      } else {
        colors[idx] = 0.9;
        colors[idx + 1] = 0.92;
        colors[idx + 2] = 1.0;
      }
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.045,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);
    particlesRef.current = particles;

    // 6. Lights
    // Warm bronze/amber highlight lighting
    const mainLight = new THREE.PointLight(0xa58b6f, 3.8, 20);
    mainLight.position.set(0, 2.5, -2.5);
    scene.add(mainLight);

    const rimLight = new THREE.DirectionalLight(0xc4a482, 2.2);
    rimLight.position.set(0, 4, 1);
    scene.add(rimLight);

    const ambientLight = new THREE.AmbientLight(0x1a1210, 0.4);
    scene.add(ambientLight);

    lightsRef.current = { mainLight, rimLight };

    // 7. Window Resize Listener
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // 8. Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Continuous subtle idle rotation
      if (coreSphereRef.current) {
        coreSphereRef.current.rotation.y = elapsedTime * 0.035;
      }
      if (ringRef.current) {
        ringRef.current.rotation.z = elapsedTime * 0.02;
      }
      if (outerRingRef.current) {
        outerRingRef.current.rotation.z = -elapsedTime * 0.015;
      }
      if (particlesRef.current) {
        particlesRef.current.rotation.y = elapsedTime * 0.008;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      sphereGeo.dispose();
      sphereMat.dispose();
      atmosphereGeo.dispose();
      atmosphereMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      outerRingGeo.dispose();
      outerRingMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
    };
  }, []);

  // Update 3D transforms smoothly whenever scrollProgress or mouse position changes
  useEffect(() => {
    if (!planetGroupRef.current || !cameraRef.current) return;

    const p = scrollProgress; // 0 (Hero view) -> 1 (Scrolled fully into telemetry/dashboard)

    // Smooth camera choreography through 3D space:
    // At p = 0: Eye level framing top rim as in screenshot
    // At p = 0.4: Sweeping forward and tilting down, cinematic perspective
    // At p = 1.0: Center-stage holographic alignment backing the system dashboard
    const targetCamZ = 5.2 - p * 1.4;
    const targetCamY = 1.2 - p * 0.7;
    const targetCamX = mousePos.x * 0.4;

    cameraRef.current.position.x += (targetCamX - cameraRef.current.position.x) * 0.08;
    cameraRef.current.position.y += (targetCamY - cameraRef.current.position.y) * 0.08;
    cameraRef.current.position.z += (targetCamZ - cameraRef.current.position.z) * 0.08;

    // Smooth planet group repositioning & rotation
    // As you scroll down, the planet rises slightly into full view, tilts dynamically, revealing its 3D depth
    const targetPlanetY = -2.1 + p * 1.5;
    const targetRotX = 0.28 + p * 0.45 + mousePos.y * 0.08;
    const targetRotY = p * 0.8 + mousePos.x * 0.12;
    const targetRotZ = -0.12 - p * 0.25;

    planetGroupRef.current.position.y += (targetPlanetY - planetGroupRef.current.position.y) * 0.08;
    planetGroupRef.current.rotation.x += (targetRotX - planetGroupRef.current.rotation.x) * 0.08;
    planetGroupRef.current.rotation.y += (targetRotY - planetGroupRef.current.rotation.y) * 0.08;
    planetGroupRef.current.rotation.z += (targetRotZ - planetGroupRef.current.rotation.z) * 0.08;

    // Corona & lighting flare adjustment on scroll
    if (lightsRef.current) {
      lightsRef.current.mainLight.intensity = 3.8 + p * 1.8;
    }
  }, [scrollProgress, mousePos]);

  return (
    <div
      ref={containerRef}
      id="hero-3d-webgl-container"
      className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden"
      aria-hidden="true"
    />
  );
};
