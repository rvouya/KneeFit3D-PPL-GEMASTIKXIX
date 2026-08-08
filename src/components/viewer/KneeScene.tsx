import { Canvas, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls, Bounds, useGLTF } from '@react-three/drei';
import { Component, Suspense, useEffect, useMemo, type ReactNode } from 'react';
import { Box3, DoubleSide, Mesh, Vector3, type BufferGeometry } from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

/**
 * Path model disimpan relatif, lalu di-resolve terhadap base build saat dimuat.
 * Tanpa ini bundle standalone hanya jalan bila dihosting di root domain — path
 * absolut `/models/...` gagal saat dibuka dari berkas atau dari subpath.
 */
export const asset = (p: string) => `${import.meta.env.BASE_URL}${p.replace(/^\//, '')}`;

export const DEFAULT_FEMUR_URL = 'models/femur.stl';
export const DEFAULT_TIBIA_URL = 'models/tibia-fibula.stl';

/** Model GLB siap pakai: lutut polos (rekonstruksi) dan lutut + implan (fitting). */
export const RECONSTRUCTION_GLB_URL = 'models/GCK4_knee_reconstruction.glb';
export const IMPLANT_GLB_URL = 'models/GCK4_knee_with_implant.glb';

const BONE = '#e7d8a8';
const BONE_DARK = '#d8c68c';
const METAL = '#8b9099';
const POLY = '#e8ebef';

/** Skala komponen implan relatif ukuran kandidat (M = referensi). */
const SIZE_SCALE: Record<string, number> = { S: 0.94, M: 1, L: 1.06, XL: 1.12 };

type Stats = { cx: number; cz: number; width: number; depth: number; rms: number };
type Bone = { geometry: BufferGeometry; height: number; width: number; depth: number };

/** Putar sumbu terpanjang geometri ke sumbu Y (superior–inferior). */
function longAxisToY(g: BufferGeometry) {
  g.computeBoundingBox();
  const s = g.boundingBox!.getSize(new Vector3());
  if (s.x >= s.y && s.x >= s.z) g.rotateZ(Math.PI / 2);
  else if (s.z >= s.y) g.rotateX(-Math.PI / 2);
}

/** Sebaran verteks pada pita ketinggian [y0,y1]: pusat, lebar, dan radius RMS. */
function bandStats(g: BufferGeometry, y0: number, y1: number): Stats {
  const p = g.getAttribute('position');
  let n = 0, sx = 0, sz = 0, sq = 0;
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y < y0 || y > y1) continue;
    const x = p.getX(i);
    const z = p.getZ(i);
    n += 1; sx += x; sz += z; sq += x * x + z * z;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  if (!n) return { cx: 0, cz: 0, width: 0, depth: 0, rms: 0 };
  const cx = sx / n;
  const cz = sz / n;
  return { cx, cz, width: maxX - minX, depth: maxZ - minZ, rms: Math.sqrt(Math.max(0, sq / n - cx * cx - cz * cz)) };
}

/**
 * Bawa satu tulang ke pose kanonik: berdiri di sumbu Y, ujung terlebar di atas
 * (kepala femur / plateau tibia), lalu geser agar bidang sendi tepat di y = 0
 * dan sumbunya berada di tengah. Kedua STL berasal dari ruang koordinat masing-
 * masing, jadi artikulasi lutut disusun di sini, bukan diwarisi dari berkas.
 */
function prepare(src: BufferGeometry, joint: 'bottom' | 'top'): Bone {
  const g = src.clone();
  longAxisToY(g);
  g.computeBoundingBox();
  let bb = g.boundingBox!;
  const height = bb.max.y - bb.min.y;
  const pita = height * 0.12;

  const top = bandStats(g, bb.max.y - pita, bb.max.y);
  const bottom = bandStats(g, bb.min.y, bb.min.y + pita);
  if (bottom.rms > top.rms) {
    g.rotateZ(Math.PI);
    g.computeBoundingBox();
    bb = g.boundingBox!;
  }

  const jb =
    joint === 'bottom'
      ? bandStats(g, bb.min.y, bb.min.y + height * 0.08)
      : bandStats(g, bb.max.y - height * 0.08, bb.max.y);

  g.translate(-jb.cx, joint === 'bottom' ? -bb.min.y : -bb.max.y, -jb.cz);
  g.computeBoundingBox();

  return { geometry: g, height, width: jb.width, depth: jb.depth };
}

function Bone({ geometry, color }: { geometry: BufferGeometry; color: string }) {
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={color} roughness={0.8} metalness={0.02} side={DoubleSide} />
    </mesh>
  );
}

function Knee({
  femurUrl,
  tibiaUrl,
  implant,
  size,
  side,
}: {
  femurUrl: string;
  tibiaUrl: string;
  implant: boolean;
  size: string;
  side: 'Kanan' | 'Kiri';
}) {
  const [femurRaw, tibiaRaw] = useLoader(STLLoader, [asset(femurUrl), asset(tibiaUrl)]);
  const femur = useMemo(() => prepare(femurRaw, 'bottom'), [femurRaw]);
  const tibia = useMemo(() => prepare(tibiaRaw, 'top'), [tibiaRaw]);

  const k = SIZE_SCALE[size] ?? 1;
  const w = Math.max(femur.width, tibia.width) || 1;
  const femThick = w * 0.11;
  const trayThick = w * 0.06;
  const insertThick = w * 0.09;
  // komponen femoral separuh terbenam di kondilus, sisanya mengisi celah sendi
  const femInset = femThick * 0.45;
  const gap = implant ? femThick - femInset + trayThick + insertThick : w * 0.06;

  const topY = gap / 2 + femur.height;
  const bottomY = -gap / 2 - tibia.height;
  const s = 4 / Math.max(topY - bottomY, 1e-6);
  const centerY = (topY + bottomY) / 2;

  return (
    <group scale={[side === 'Kiri' ? -s : s, s, s]}>
      <group position={[0, -centerY, 0]}>
        <group position={[0, gap / 2, 0]}>
          <Bone geometry={femur.geometry} color={BONE} />
        </group>
        <group position={[0, -gap / 2, 0]}>
          <Bone geometry={tibia.geometry} color={BONE_DARK} />
        </group>

        {implant && (
          <group>
            {/* femoral component menutup permukaan reseksi distal femur */}
            <mesh position={[0, gap / 2 - femThick / 2 + femInset, 0]}>
              <boxGeometry args={[femur.width * 1.02 * k, femThick, femur.depth * 0.94 * k]} />
              <meshStandardMaterial color={METAL} metalness={0.7} roughness={0.3} />
            </mesh>
            {/* tibial tray di atas plateau */}
            <mesh position={[0, -gap / 2 + trayThick / 2, 0]}>
              <boxGeometry args={[tibia.width * 1.0 * k, trayThick, tibia.depth * 0.9 * k]} />
              <meshStandardMaterial color={METAL} metalness={0.7} roughness={0.3} />
            </mesh>
            {/* polyethylene insert */}
            <mesh position={[0, -gap / 2 + trayThick + insertThick / 2, 0]}>
              <boxGeometry args={[tibia.width * 0.96 * k, insertThick, tibia.depth * 0.86 * k]} />
              <meshStandardMaterial color={POLY} metalness={0.05} roughness={0.5} />
            </mesh>
          </group>
        )}
      </group>
    </group>
  );
}

/**
 * GLB dari pipeline sudah lengkap (tulang, dan implan jika ada), jadi tidak
 * disusun ulang seperti STL: cukup dipusatkan, diskalakan ke ~4 unit, dan
 * dicerminkan untuk lutut kiri.
 */
function GltfKnee({ url, side }: { url: string; side: 'Kanan' | 'Kiri' }) {
  const { scene } = useGLTF(asset(url));

  const { root, scale } = useMemo(() => {
    const root = scene.clone(true);
    const box = new Box3().setFromObject(root);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    root.position.set(-center.x, -center.y, -center.z);
    // pencerminan lutut kiri membalik normal; DoubleSide menjaga permukaan terlihat
    root.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      for (const mat of Array.isArray(m.material) ? m.material : [m.material]) mat.side = DoubleSide;
    });
    return { root, scale: 4 / Math.max(size.x, size.y, size.z, 1e-6) };
  }, [scene]);

  return (
    <group scale={[side === 'Kiri' ? -scale : scale, scale, scale]}>
      <primitive object={root} />
    </group>
  );
}

/**
 * Menyerahkan fungsi tangkap-layar kanvas ke pemanggil. Render diulang lebih
 * dulu karena buffer WebGL bisa sudah dikosongkan sejak frame terakhir.
 */
function CaptureBridge({ onReady }: { onReady: (fn: () => string | null) => void }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    onReady(() => {
      try {
        gl.render(scene, camera);
        return gl.domElement.toDataURL('image/png');
      } catch {
        return null;
      }
    });
  }, [gl, scene, camera, onReady]);
  return null;
}

/** WebGL tak tersedia atau STL gagal dimuat tidak boleh menjatuhkan halaman. */
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="grid h-full w-full place-items-center px-8 text-center text-sm text-white/80">
        Tampilan 3D tidak dapat dimuat di peramban ini (WebGL tidak tersedia).
      </div>
    );
  }
}

export function KneeScene({
  implant = false,
  femurUrl,
  tibiaUrl,
  glbUrl,
  side = 'Kanan',
  size = 'M',
  onCapture,
}: {
  implant?: boolean;
  femurUrl?: string | null;
  tibiaUrl?: string | null;
  /**
   * Model GLB yang ditampilkan. Default mengikuti `implant`; GLB diutamakan di
   * atas pasangan STL. Isi `null` untuk memaksa jalur STL (femur + tibia).
   */
  glbUrl?: string | null;
  side?: 'Kanan' | 'Kiri';
  size?: string;
  /** Menerima fungsi untuk menangkap isi kanvas sebagai data URL PNG. */
  onCapture?: (fn: () => string | null) => void;
}) {
  const glb = glbUrl === undefined ? (implant ? IMPLANT_GLB_URL : RECONSTRUCTION_GLB_URL) : glbUrl;

  return (
    <SceneBoundary>
      <Canvas
        camera={{ position: [0, 0, 9], fov: 40 }}
        dpr={[1, 2]}
        // wajib agar toDataURL() masih berisi gambar setelah frame selesai
        gl={{ preserveDrawingBuffer: true }}
      >
        {onCapture && <CaptureBridge onReady={onCapture} />}
        <ambientLight intensity={0.65} />
        <hemisphereLight args={['#ffffff', '#8090a8', 0.8]} />
        <directionalLight position={[4, 6, 5]} intensity={1.15} />
        <directionalLight position={[-5, -2, -4]} intensity={0.5} />
        <pointLight position={[0, 2, 6]} intensity={0.5} />
        <Suspense fallback={null}>
          <Bounds fit clip observe margin={1.15}>
            <group rotation={[0.05, 0.35, 0]}>
              {glb ? (
                <GltfKnee url={glb} side={side} />
              ) : (
                <Knee
                  femurUrl={femurUrl || DEFAULT_FEMUR_URL}
                  tibiaUrl={tibiaUrl || DEFAULT_TIBIA_URL}
                  implant={implant}
                  size={size}
                  side={side}
                />
              )}
            </group>
          </Bounds>
        </Suspense>
        <OrbitControls enablePan enableZoom enableRotate makeDefault />
      </Canvas>
    </SceneBoundary>
  );
}
