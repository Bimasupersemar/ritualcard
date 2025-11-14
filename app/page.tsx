"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows, Billboard } from "@react-three/drei";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";

function AuroraParallaxSync() {
  const { camera } = useThree();

  useFrame(() => {
    const x = camera.rotation.y * 1;
    const y = camera.rotation.x * 10;
    document.documentElement.style.setProperty("--aurora-x", `${x}px`);
    document.documentElement.style.setProperty("--aurora-y", `${y}px`);
  });

  return null;
}
export function useCanvasRecorder() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = (canvas: HTMLCanvasElement) => {
    return new Promise<void>((resolve) => {
      // --- OFFSCREEN CANVAS UNTUK RECORDING (RESOLUSI 720p RASIO 3:4) ---
      const recCanvas = document.createElement("canvas");
      recCanvas.width = 720;  // width
      recCanvas.height = 960; // height (720 * 4/3)

      const recCtx = recCanvas.getContext("2d");

      // Copy frame dari canvas utama ke canvas recording
      const copyFrame = () => {
        const copyFrame = () => {
  if (!recCtx) return;

  const srcW = canvas.width;
  const srcH = canvas.height;
  const targetRatio = 3 / 4;
  const currentRatio = srcW / srcH;

  let sx = 0, sy = 0, sw = srcW, sh = srcH;

  if (currentRatio > targetRatio) {
    // Canvas terlalu lebar → crop kiri & kanan
    sw = srcH * targetRatio;
    sx = (srcW - sw) / 2;
  } else {
    // Canvas terlalu tinggi → crop atas & bawah
    sh = srcW / targetRatio;
    sy = (srcH - sh) / 2;
  }

  recCtx.drawImage(
    canvas,
    sx, sy, sw, sh,            // area crop
    0, 0, recCanvas.width, recCanvas.height // hasil 3:4
  );

  requestAnimationFrame(copyFrame);
};
        requestAnimationFrame(copyFrame);
      };
      copyFrame();
      // ------------------------------------------------------------

      const stream = recCanvas.captureStream(60);

      const recorder = new MediaRecorder(stream, {
        mimeType: "video/webm; codecs=vp9"
      });

      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      setIsRecording(true);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "card-animation-720p-3x4.webm";
        a.click();

        URL.revokeObjectURL(url);

        setIsRecording(false);
        resolve();          // ⭐ penting → tombol bisa aktif lagi
      };

      recorder.start();

      // Auto stop after 4 seconds
      setTimeout(() => recorder.stop(), 4000);
    });
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  return { startRecording, stopRecording, isRecording };
}




function AuroraLiteFogSphereGradientV3({
  radius = 6,
  intensity = 0.95,
  bottomColor = "#3eae80",
  midColor = "#1a563e",
  topFogColor = "#298962",
  fogDensity = 0.6,
  speed = 0.095,
  shimmerStrength = 0.95,
  spin = true,
  spinSpeed = 0.53,
}: {
  radius?: number;
  intensity?: number;
  bottomColor?: string;
  midColor?: string;
  topFogColor?: string;
  fogDensity?: number;
  speed?: number;
  shimmerStrength?: number;
  spin?: boolean;
  spinSpeed?: number;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  const matRef = useRef<THREE.ShaderMaterial>(null!);

  const uniforms = useMemo(
    () => ({
      u_time: { value: 0 },
      u_intensity: { value: intensity },
      u_bottomColor: { value: new THREE.Color(bottomColor) },
      u_midColor: { value: new THREE.Color(midColor) },
      u_topFogColor: { value: new THREE.Color(topFogColor) },
      u_fogDensity: { value: fogDensity },
      u_shimmerStrength: { value: shimmerStrength },
    }),
    []
  );

  useFrame((_, dt) => {
    matRef.current.uniforms.u_time.value += dt * (speed * 20.0);
    if (spin && ref.current) ref.current.rotation.y += dt * spinSpeed;
  });

  const vertexShader = `
    varying vec3 vWorldPos;
    void main() {
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPos = normalize(worldPos.xyz);
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `;

  const fragmentShader = `
    varying vec3 vWorldPos;
    uniform float u_time;
    uniform float u_intensity;
    uniform vec3 u_bottomColor;
    uniform vec3 u_midColor;
    uniform vec3 u_topFogColor;
    uniform float u_fogDensity;
    uniform float u_shimmerStrength;

    float hash(vec3 p){ return fract(sin(dot(p, vec3(17.0, 58.0, 113.0))) * 43758.5453); }
    float noise(vec3 p){
      vec3 i = floor(p);
      vec3 f = fract(p);
      f = f*f*(3.0 - 2.0*f);
      return mix(
        mix(
          mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
          mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x),
          f.y
        ),
        mix(
          mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
          mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x),
          f.y
        ),
        f.z
      );
    }

    void main() {
      vec3 p = normalize(vWorldPos) * 2.0;
      float n1 = noise(p * 1.5 + vec3(0.0, u_time * 0.15, 0.0));
      float n2 = noise(p * 3.0 + vec3(0.5, -u_time * 0.1, 0.5));

      // vertical gradient
      float h = clamp((p.y * 0.5 + 0.5), 0.0, 1.0);
      vec3 grad = mix(u_bottomColor, u_midColor, smoothstep(0.0, 0.65, h));
      grad = mix(grad, u_topFogColor, smoothstep(0.7, 1.0, h));

      // shimmer pattern naik
      float shimmer = smoothstep(0.4, 0.95, sin(h * 12.0 - u_time * 1.4) * 0.5 + 0.5);
      shimmer *= (0.6 + 0.4 * n2);
      shimmer *= u_shimmerStrength;
      vec3 shimmerCol = u_bottomColor * shimmer;

      // kabut lembut di atas
      float mist = smoothstep(0.55, 1.0, h) * (0.5 + 0.5 * noise(p * 2.0 + vec3(0, u_time * 0.3, 0)));
      vec3 fogLayer = mix(grad, u_topFogColor, mist * 0.8);

      // cahaya bawah
      float bottomGlow = smoothstep(0.0, 0.25, 1.0 - h);
      fogLayer += u_bottomColor * (bottomGlow * 0.25);

      // combine
      vec3 finalCol = fogLayer + shimmerCol;
      float polar = pow(1.0 - abs(p.y * 0.7), 2.0);
      float fog = exp(-u_fogDensity * length(vWorldPos) * 0.5);
      finalCol = mix(u_topFogColor, finalCol * polar, fog);

      float alpha = u_intensity * (0.45 + 0.55 * n1);
      gl_FragColor = vec4(finalCol, alpha);
    }
  `;

  return (
    <mesh ref={ref} scale={[radius, radius, radius]}>
      <sphereGeometry args={[1, 64, 64]} />
      {/* @ts-ignore */}
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.BackSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}



/* ===========================
   Helpers
   =========================== */
function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    try {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = (ev: any) => {
        const err = new Error(`Failed to load image: ${src}`);
        (err as any).event = ev;
        reject(err);
      };
      img.src = src;
    } catch (e) {
      reject(e);
    }
  });
}

function drawRoundedImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cx: number,
  cy: number,
  r: number
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
  ctx.restore();
}

function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startPx: number,
  minPx = 12
) {
  let size = startPx;
  ctx.font = `bold ${size}px ui-sans-serif,system-ui,-apple-system`;
  while (size > minPx && ctx.measureText(text).width > maxWidth) {
    size -= 1;
    ctx.font = `bold ${size}px ui-sans-serif,system-ui,-apple-system`;
  }
  return size;
}

function downloadDataURL(dataURL: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataURL;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/* ===========================
   Build textures from template + inputs
   =========================== */
async function buildTextures({
  templateUrl = "/idcard-template.jpg",
  photoFile,
  name,
  handle,
}: {
  templateUrl?: string;
  photoFile?: File | null;
  name: string;
  handle: string;
}): Promise<{
  frontTex: THREE.Texture;
  backTex: THREE.Texture;
  frontDataURL: string;
  backDataURL: string;
}> {
  let template: HTMLImageElement;
  try {
    template = await loadImage(templateUrl);
  } catch (e) {
    console.error(e);
    throw new Error(
      "Template tidak ditemukan. Pastikan /public/idcard-template.jpg ada dan path benar."
    );
  }

  const W = Math.round(template.width / 2);
  const H = template.height;

  const frontCanvas = document.createElement("canvas");
  const backCanvas = document.createElement("canvas");
  frontCanvas.width = backCanvas.width = W;
  frontCanvas.height = backCanvas.height = H;
  const tctxF = frontCanvas.getContext("2d")!;
  const tctxB = backCanvas.getContext("2d")!;
  tctxF.imageSmoothingEnabled = true;
  tctxB.imageSmoothingEnabled = true;

  // crop template
  tctxF.drawImage(template, 0, 0, template.width / 2, template.height, 0, 0, W, H);
  tctxB.drawImage(
    template,
    template.width / 2,
    0,
    template.width / 2,
    template.height,
    0,
    0,
    W,
    H
  );

  if (photoFile) {
    let blobUrl = "";
    try {
      blobUrl = URL.createObjectURL(photoFile);
      const photoImg = await loadImage(blobUrl);
      const cx = 0.499 * W;
      const cy = 0.394 * H;
      const radius = 0.138 * H;
      drawRoundedImage(tctxF, photoImg, cx, cy, radius);
    } catch (e) {
      console.error(e);
    } finally {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    }
  }

  const nameText = name?.trim() || "XXX";
  const handleText = handle ? `@${handle.replace(/^@/, "").trim()}` : "@xxx";

  // name (black)
  const nameY = 0.76 * H;
  const nameMaxWidth = W * 0.8;
  const nameSize = fitFont(tctxF, nameText, nameMaxWidth, Math.round(0.043 * H));
  tctxF.font = `bold ${nameSize}px ui-sans-serif,system-ui,-apple-system`;
  tctxF.fillStyle = "#000";
  tctxF.textAlign = "center";
  tctxF.textBaseline = "alphabetic";
  tctxF.fillText(nameText, W / 2, nameY);

  // handle (white + soft shadow)
  const handleY = 0.798 * H;
  const handleSize = Math.max(Math.round(0.03 * H), 12);
  tctxF.font = `600 ${handleSize}px ui-sans-serif,system-ui,-apple-system`;
  tctxF.fillStyle = "#fff";
  tctxF.shadowColor = "rgba(0,0,0,0.4)";
  tctxF.shadowBlur = 4;
  tctxF.fillText(handleText, W / 2, handleY);

  const frontTex = new THREE.CanvasTexture(frontCanvas);
  const backTex = new THREE.CanvasTexture(backCanvas);
  frontTex.needsUpdate = true;
  backTex.needsUpdate = true;

  return {
    frontTex,
    backTex,
    frontDataURL: frontCanvas.toDataURL("image/png"),
    backDataURL: backCanvas.toDataURL("image/png"),
  };
}

/* ===========================
   Shimmer overlay (foil effect)
   =========================== */
function ShimmerPlane({
  width,
  height,
  z,
  intensity = 0.28,
}: {
  width: number;
  height: number;
  z: number;
  intensity?: number;
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null!);
  const uniforms = useMemo(
    () => ({
      u_time: { value: 0 },
      u_intensity: { value: intensity },
    }),
    [intensity]
  );

  useFrame((_, dt) => {
    if (matRef.current) {
      (matRef.current.uniforms.u_time as any).value += dt;
      (matRef.current.uniforms.u_intensity as any).value = intensity;
    }
  });

  const vertex = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
  const fragment = `
    varying vec2 vUv;
    uniform float u_time;
    uniform float u_intensity;
    void main() {
      float t = fract(u_time * 0.4);
      float d = vUv.x * 0.7 + vUv.y * 0.3;
      float band = smoothstep(t - 0.15, t, d) * (1.0 - smoothstep(t, t + 0.15, d));
      float alpha = band * u_intensity;
      gl_FragColor = vec4(vec3(1.0), alpha);
    }
  `;

  return (
    <mesh position={[0, 0, z]}>
      <planeGeometry args={[width, height]} />
      {/* @ts-ignore */}
      <shaderMaterial
        ref={matRef}
        args={[
          {
            uniforms,
            vertexShader: vertex,
            fragmentShader: fragment,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          },
        ]}
      />
    </mesh>
  );
}

/* ===========================
   3D Card
   =========================== */
function SpinningCard({
  frontTex,
  backTex,
  autoSpin,
  spinKick,
  speed,
  roughness,
  clearcoat,
  edgeColor = "#0a0a0a",
  enableShimmer,
  shimmerIntensity,
}: {
  frontTex: THREE.Texture;
  backTex: THREE.Texture;
  autoSpin: boolean;
  spinKick: boolean;
  speed: number;
  roughness: number;
  clearcoat: number;
  edgeColor?: string;
  enableShimmer: boolean;
  shimmerIntensity: number;
}) {
  const group = useRef<THREE.Group>(null!);
  const kickVel = useRef(0);

  useEffect(() => {
    if (spinKick) kickVel.current = 5.5;
  }, [spinKick]);

  useFrame((_, dt) => {
    if (!group.current) return;
    if (autoSpin) group.current.rotation.y += dt * speed;
    if (kickVel.current > 0) {
      group.current.rotation.y += kickVel.current * dt;
      kickVel.current = Math.max(0, kickVel.current - 3.0 * dt);
    }
  });

  const thickness = 0.003;
  const width = 0.0883;
  const height = 0.1458;

  return (
    <group ref={group}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width, height, thickness]} />
        {/* [right, left, top, bottom, front, back] */}
        <meshPhysicalMaterial attach="material-0" color={edgeColor} roughness={Math.min(1, roughness + 0.2)} metalness={0.2} clearcoat={clearcoat} clearcoatRoughness={0.15} />
        <meshPhysicalMaterial attach="material-1" color={edgeColor} roughness={Math.min(1, roughness + 0.2)} metalness={0.2} clearcoat={clearcoat} clearcoatRoughness={0.15} />
        <meshPhysicalMaterial attach="material-2" color={edgeColor} roughness={Math.min(1, roughness + 0.2)} metalness={0.2} clearcoat={clearcoat} clearcoatRoughness={0.15} />
        <meshPhysicalMaterial attach="material-3" color={edgeColor} roughness={Math.min(1, roughness + 0.2)} metalness={0.2} clearcoat={clearcoat} clearcoatRoughness={0.15} />
        <meshPhysicalMaterial attach="material-4" map={frontTex} side={THREE.DoubleSide} roughness={roughness} metalness={0.0} clearcoat={clearcoat} clearcoatRoughness={0.12} />
        <meshPhysicalMaterial attach="material-5" map={backTex} side={THREE.DoubleSide} roughness={roughness} metalness={0.0} clearcoat={clearcoat} clearcoatRoughness={0.12} />
      </mesh>

      {enableShimmer && (
        <>
          <ShimmerPlane width={width} height={height} z={thickness / 2 + 0.00015} intensity={shimmerIntensity} />
          <group rotation={[0, Math.PI, 0]}>
            <ShimmerPlane width={width} height={height} z={thickness / 2 + 0.00015} intensity={shimmerIntensity * 0.85} />
          </group>
        </>
      )}
    </group>
  );
}

/* ===========================
   Fractal Aurora Background (3D)
   =========================== */
function FractalAurora() {
  const meshRef = useRef<THREE.Mesh>(null!);
  const materialRef = useRef<THREE.ShaderMaterial>(null!);

  const uniforms = useMemo(
    () => ({
      u_time: { value: 0 },
      u_intensity: { value: 0.8 },
      u_color1: { value: new THREE.Color("#ff00e6") },
      u_color2: { value: new THREE.Color("#40ffaf") },
      u_color3: { value: new THREE.Color("#ff00e6") },
    }),
    []
  );

  useFrame((_, dt) => {
    if (materialRef.current) {
      (materialRef.current.uniforms.u_time as any).value += dt;
    }
  });

  const vertexShader = `
    varying vec2 vUv;
    varying vec3 vPosition;
    
    void main() {
      vUv = uv;
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    uniform float u_time;
    uniform float u_intensity;
    uniform vec3 u_color1;
    uniform vec3 u_color2;
    uniform vec3 u_color3;
    
    varying vec2 vUv;
    varying vec3 vPosition;
    
    // Fractal noise function
    float fractalNoise(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;
      float frequency = 2.0;
      float maxAmplitude = 0.0;
      
      for (int i = 0; i < 6; i++) {
        value += amplitude * (sin(p.x * frequency + u_time * 0.5) * 
                            cos(p.y * frequency * 1.3 + u_time * 0.7) + 
                            sin(p.x * frequency * 0.7 - u_time * 0.3) * 
                            cos(p.y * frequency * 1.7 + u_time * 0.9));
        maxAmplitude += amplitude;
        amplitude *= 0.5;
        frequency *= 2.0;
      }
      
      return value / maxAmplitude;
    }
    
    void main() {
      vec2 uv = vUv * 2.0 - 1.0;
      uv.x = fract(uv.x + 0.001);
      float edgeFix = smoothstep(0.0, 0.02, uv.x) * smoothstep(1.0, 0.98, uv.x);
      alpha *= mix(1.0, 0.7, edgeFix);
      vec3 pos = vPosition;
      
      // Multiple layers of fractal noise
      float n1 = fractalNoise(uv * 3.0 + u_time * 0.1);
      float n2 = fractalNoise(uv * 5.0 - u_time * 0.2);
      float n3 = fractalNoise(uv * 8.0 + u_time * 0.15);
      
      // Combine noises
      float combined = (n1 * 0.6 + n2 * 0.3 + n3 * 0.1) * u_intensity;
      
      // Create flowing patterns
      float flow1 = sin(uv.x * 8.0 + u_time * 1.5) * cos(uv.y * 6.0 - u_time * 1.2);
      float flow2 = cos(uv.x * 12.0 - u_time * 0.8) * sin(uv.y * 10.0 + u_time * 1.0);
      
      combined += (flow1 + flow2) * 0.15;
      
      // Color mixing based on position and noise
      vec3 color1 = u_color1 * (0.7 + n1 * 0.3);
      vec3 color2 = u_color2 * (0.7 + n2 * 0.3);
      vec3 color3 = u_color3 * (0.7 + n3 * 0.3);
      
      // Radial gradient for depth
      float radial = 1.0 - length(uv) * 0.8;
      
      // Final color mixing
      vec3 finalColor = mix(color1, color2, n1 * 0.5 + 0.5);
      finalColor = mix(finalColor, color3, n2 * 0.3 + 0.2);
      finalColor *= radial * (1.2 + combined * 0.8);
      
      // Alpha based on intensity and radial
      float alpha = (combined * 0.8 + 0.2) * radial * u_intensity;
      
      gl_FragColor = vec4(finalColor, alpha * 0.4);
    }
  `;

  return (
    <mesh ref={meshRef} position={[0, 0, -2]} scale={[4, 2, 1]}>
      <planeGeometry args={[1, 1, 32, 32]} />
      {/* @ts-ignore */}
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent={true}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

/* ===========================
   FULL‑PAGE CSS Aurora Background (Enhanced)
   =========================== */
function BackgroundAuroraFull({
  accent = "#40ffaf",
  showGrid = true,
}: {
  accent?: string;
  showGrid?: boolean;
}) {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Base gradient (gelap ke hijau) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, #0c0d0d 0%, #000 38%, #001f16 100%)",
        }}
      />

      {/* Enhanced Aurora layers with more movement */}
      <div className="absolute -inset-[8%] filter saturate-150 blur-[52px]">
        <div
          className="absolute inset-0 will-change-transform mix-blend-screen opacity-80"
          style={{
            backgroundImage: `radial-gradient(55% 70% at 18% 8%, ${accent}88 0%, transparent 100%)`,
            animation: "aurora-a 18s ease-in-out infinite alternate",
          }}
        />
        <div
          className="absolute inset-0 will-change-transform mix-blend-screen opacity-70"
          style={{
            backgroundImage: `radial-gradient(60% 75% at 84% 18%, #00a2ff88 0%, transparent 70%)`,
            animation: "aurora-b 22s ease-in-out infinite alternate-reverse",
          }}
        />
        <div
          className="absolute inset-0 will-change-transform mix-blend-screen opacity-60"
          style={{
            backgroundImage: `radial-gradient(70% 80% at 45% 110%, #ff00e655 0%, transparent 70%)`,
            animation: "aurora-c 26s ease-in-out infinite alternate",
          }}
        />
      </div>

      {/* Pulsing glow effects */}
    
      <div
        className="absolute top-3/4 left-1/3 w-1/3 h-1/3 blur-[60px] opacity-30"
        style={{
          background: `radial-gradient(circle, #00a2ff33 0%, transparent 70%)`,
          animation: "pulse-glow 6s ease-in-out infinite reverse",
        }}
      />

      {/* Fog / mist feel */}
    
      <div
        className="absolute inset-0 blur-2xl"
        style={{
          background: `radial-gradient(85% 65% at 50% 120%, ${accent}33 0%, transparent 60%)`,
        }}
      />

      {/* Grid halus */}
      {showGrid && (
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, var(--grid-color, #40ffaf) 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />
      )}

      {/* Keyframes */}
      <style jsx>{`
        @keyframes aurora-a {
          0% { transform: translate3d(-3%, -3%, 0) scale(1.03) rotate(0deg); }
          100% { transform: translate3d(3%, 2%, 0) scale(1) rotate(1deg); }
        }
        @keyframes aurora-b {
          0% { transform: translate3d(2%, -2%, 0) scale(1) rotate(-1deg); }
          100% { transform: translate3d(-2%, 3%, 0) scale(1.04) rotate(0deg); }
        }
        @keyframes aurora-c {
          0% { transform: translate3d(0%, 2%, 0) scale(1.02) rotate(0.5deg); }
          100% { transform: translate3d(-2%, -1%, 0) scale(1.05) rotate(-0.5deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .will-change-transform { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

function DynamicAuroraBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Gradasi utama: hijau toska ke hitam */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, #313647 0%, #145e44 45%, #222831  100%)",
        }}
      />

      {/* Kabut hijau lembut bergerak */}
      <div
        className="absolute inset-0 blur-[70px] opacity-60 mix-blend-screen will-change-transform"
        style={{
          backgroundImage: `
            radial-gradient(80% 60% at 50% 90%, rgba(42,195,133,0.35) 0%, transparent 80%),
            radial-gradient(70% 50% at 40% 100%, rgba(42,195,133,0.25) 0%, transparent 70%)
          `,
          animation: "fog-rise 6s ease-in-out infinite alternate",
        }}
      />

      {/* Lapisan kabut gelap di atas */}
      <div
        className="absolute inset-0 blur-[110px] opacity-45"
        style={{
          backgroundImage: `
            radial-gradient(100% 80% at 50% 0%, rgba(0,0,0,0.75) 0%, transparent 85%),
            radial-gradient(80% 60% at 60% 10%, rgba(0,0,0,0.65) 0%, transparent 90%)
          `,
          animation: "fog-shift 40s ease-in-out infinite alternate",
        }}
      />

      {/* ✨ Shimmer lembut seperti bias cahaya */}
      <div
        className="absolute inset-0 opacity-20 mix-blend-screen blur-[120px]"
        style={{
          backgroundImage: `
            linear-gradient(115deg, rgba(255,255,255,0.15) 0%, transparent 70%),
            linear-gradient(-60deg, rgba(255,255,255,0.12) 0%, transparent 60%)
          `,
          backgroundSize: "200% 200%",
          animation: "shimmer-flow 12s ease-in-out infinite alternate",
        }}
      />

      {/* Noise lembut */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "url('https://grainy-gradients.vercel.app/noise.svg')",
          backgroundSize: "180px 180px",
          mixBlendMode: "overlay",
        }}
      />

      <style jsx>{`
        @keyframes fog-rise {
          0% {
            transform: translate3d(0, 6%, 0) scale(1);
          }
          50% {
            transform: translate3d(0, -4%, 0) scale(1.05);
          }
          100% {
            transform: translate3d(0, 3%, 0) scale(1.03);
          }
        }

        @keyframes fog-shift {
          0% {
            transform: translate3d(-3%, 0, 0) scale(1);
          }
          100% {
            transform: translate3d(3%, -2%, 0) scale(1.05);
          }
        }

        @keyframes shimmer-flow {
          0% {
            background-position: 0% 0%;
          }
          100% {
            background-position: 100% 100%;
          }
        }
      `}</style>
    </div>
  );
}



  export default function Page() {
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);

  const [textures, setTextures] = useState<{ frontTex: THREE.Texture; backTex: THREE.Texture } | null>(null);
  const [previewURLs, setPreviewURLs] = useState<{ front?: string; back?: string }>({});

  // Controls
  const [busy, setBusy] = useState(false);
  const [autoSpin, setAutoSpin] = useState(true);
  const [spinKick, setSpinKick] = useState(false);
  const [speed, setSpeed] = useState(0.35);
  const [roughness, setRoughness] = useState(0.32);
  const [clearcoat, setClearcoat] = useState(0.9);
  const [enableShimmer, setEnableShimmer] = useState(true);
  const [shimmerIntensity, setShimmerIntensity] = useState(0.28);
  const [auroraIntensity, setAuroraIntensity] = useState(0.8);
  const [auroraSpin, setAuroraSpin] = useState(true);
const [auroraSpinSpeed, setAuroraSpinSpeed] = useState(0.06);
const [fogDensity, setFogDensity] = useState(0.55);
const [fogSpeed, setFogSpeed] = useState(0.08);
const canvasRef = useRef<HTMLCanvasElement>(null);
const { startRecording, stopRecording, isRecording } = useCanvasRecorder();


  useEffect(() => {
    (async () => {
      try {
        const { frontTex, backTex, frontDataURL, backDataURL } = await buildTextures({
          name: "XXX",
          handle: "xxx",
        });
        setTextures({ frontTex, backTex });
        setPreviewURLs({ front: frontDataURL, back: backDataURL });
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const onGenerate = async () => {
    try {
      setBusy(true);
      const { frontTex, backTex, frontDataURL, backDataURL } = await buildTextures({
        photoFile: photo,
        name,
        handle,
      });
      setTextures({ frontTex, backTex });
      setPreviewURLs({ front: frontDataURL, back: backDataURL });

      setSpinKick(false);
      requestAnimationFrame(() => setSpinKick(true));
      setTimeout(() => setSpinKick(false), 50);
    } catch (e: any) {
      alert(e?.message || "Gagal generate kartu. Cek console untuk detail.");
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="
        relative min-h-dvh text-white 
        selection:bg-[#40ffaf] selection:text-black
        overflow-hidden
      "
      style={{ accentColor: "#40ffaf" }}
    >
      {/* >>> Full‑page Aurora background <<< */}
      <DynamicAuroraBackground/>

      {/* Main content */}
      <div className="relative z-10">
        <header className="mx-auto max-w-6xl px-4 py-5 flex flex-wrap items-center text-center justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight">ID Card Ritual</h1>
        </header>

        <main className="mx-auto max-w-6xl px-4 pb-14 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Viewer — MOBILE FIRST ATAS */}
          <section className="order-1 lg:order-2 lg:col-span-8 rounded-3xl border border-white/10 bg-white/5 p-2">
<div
  className="
    w-full
    aspect-[3/4]      /* MOBILE → 3:4 */
    md:h-[70vh]       /* DESKTOP → 70vh */
    md:aspect-auto    /* DESKTOP → bebas */
    rounded-2xl
    overflow-hidden
    relative
  "
>  <Canvas
    className="!w-full !h-full absolute inset-0"
    ref={canvasRef}
    dpr={[1, 2]}
  gl={{ preserveDrawingBuffer: true }}
            shadows camera={{ position: [0.25, 0.2, 0.45], fov: 25 }}
      
  >
  <AuroraParallaxSync />

  {/* Background & Atmosfer */}
<AuroraLiteFogSphereGradientV3
 
/>




  <ambientLight intensity={0.4} />
  <spotLight position={[1.5, 2.5, 2]} angle={0.4} penumbra={2.6} intensity={5.2} castShadow />
  <directionalLight position={[-2, 1.2, 1]} intensity={2.6} />
  {textures && (
    <SpinningCard
      frontTex={textures.frontTex}
      backTex={textures.backTex}
      autoSpin={autoSpin}
      spinKick={spinKick}
      speed={speed}
      roughness={roughness}
      clearcoat={clearcoat}
      enableShimmer={enableShimmer}
      shimmerIntensity={shimmerIntensity}
      edgeColor="#0a0a0a"
    />
  )}
  <Environment preset="city" />
  <ContactShadows position={[0, -0.002, 0]} opacity={0.35} scale={5} blur={2.4} />
  <OrbitControls enablePan={false} minDistance={0.2} maxDistance={1.2} />
</Canvas>

            </div>
          </section>

          <section className="order-2 lg:order-1 lg:col-span-4 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-medium mb-3">Input</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm mb-1">Upload Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="block w-full rounded-xl bg-white/5 border border-white/10 p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#40ffaf] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                    onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your Name"
                    className="w-full rounded-xl bg-white/5 border border-white/10 p-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#40ffaf] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">X Account</label>
                  <input
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    placeholder="@username"
                    className="w-full rounded-xl bg-white/5 border border-white/10 p-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#40ffaf] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  />
                </div>
                <button
                  onClick={onGenerate}
                  disabled={busy}
                  className="w-full rounded-2xl bg-[#40ffaf] hover:bg-[#36f2a5] disabled:opacity-50 text-black py-2 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#40ffaf] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                  {busy ? "Generating…" : "Generate"}
                </button>
                  <button
  onClick={async () => {
    if (!isRecording && canvasRef.current) {
      onGenerate();                   // 🔥 animasi putar
      await startRecording(canvasRef.current); // 🎥 record 4 detik + download
    }
  }}
  disabled={isRecording}
  className="w-full rounded-2xl bg-white/20 backdrop-blur-lg text-white py-2 font-medium disabled:opacity-50"
>
  Download Video
</button>

              </div>
            </div>

            {/* Previews + Download */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-medium mb-3">Preview texture</p>
              <div className="grid grid-cols-2 gap-2">
                {previewURLs.front && (
                  <img src={previewURLs.front} alt="front" className="w-full rounded-xl border border-white/10" />
                )}
                {previewURLs.back && (
                  <img src={previewURLs.back} alt="back" className="w-full rounded-xl border border-white/10" />
                )}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() =>
                    previewURLs.front && downloadDataURL(previewURLs.front, "idcard-front.png")
                  }
                  className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#40ffaf] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  disabled={!previewURLs.front}
                >
                  Download Front PNG
                </button>
                <button
                  onClick={() =>
                    previewURLs.back && downloadDataURL(previewURLs.back, "idcard-back.png")
                  }
                  className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#40ffaf] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  disabled={!previewURLs.back}
                >
                  Download Back PNG
                </button>
              </div>
            </div>
            <div className="image">
              <img src="../assets/ritual.png" alt="ritual" />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}