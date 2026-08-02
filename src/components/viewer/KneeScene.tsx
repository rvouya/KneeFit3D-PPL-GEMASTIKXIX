import { Canvas } from '@react-three/fiber';
import { OrbitControls, Bounds } from '@react-three/drei';
import { Suspense } from 'react';

const BONE = '#e7d8a8';
const BONE_DARK = '#cbb878';
const METAL = '#8b9099';
const POLY = '#e8ebef';

/** Distal femur — stylized condyles. */
function Femur({ implant }: { implant?: boolean }) {
  return (
    <group position={[0, 0.7, 0]}>
      {/* shaft */}
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.32, 0.42, 2.4, 32]} />
        <meshStandardMaterial color={BONE} roughness={0.85} />
      </mesh>
      {/* condyle block */}
      <mesh position={[0, -0.15, 0]}>
        <boxGeometry args={[1.15, 0.7, 0.95]} />
        <meshStandardMaterial color={BONE_DARK} roughness={0.85} />
      </mesh>
      <mesh position={[-0.42, -0.35, 0.1]}>
        <sphereGeometry args={[0.42, 32, 32]} />
        <meshStandardMaterial color={BONE_DARK} roughness={0.85} />
      </mesh>
      <mesh position={[0.42, -0.35, 0.1]}>
        <sphereGeometry args={[0.42, 32, 32]} />
        <meshStandardMaterial color={BONE_DARK} roughness={0.85} />
      </mesh>
      {implant && (
        <mesh position={[0, -0.5, 0.1]}>
          <boxGeometry args={[1.28, 0.5, 1.1]} />
          <meshStandardMaterial color={METAL} metalness={0.5} roughness={0.45} />
        </mesh>
      )}
    </group>
  );
}

/** Proximal tibia. */
function Tibia({ implant }: { implant?: boolean }) {
  return (
    <group position={[0, -0.72, 0]}>
      {implant && (
        <mesh position={[0, 0.55, 0.05]}>
          <boxGeometry args={[1.2, 0.14, 1.0]} />
          <meshStandardMaterial color={POLY} metalness={0.1} roughness={0.4} />
        </mesh>
      )}
      {implant && (
        <mesh position={[0, 0.42, 0.05]}>
          <boxGeometry args={[1.24, 0.12, 1.04]} />
          <meshStandardMaterial color={METAL} metalness={0.5} roughness={0.45} />
        </mesh>
      )}
      {/* plateau */}
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.62, 0.5, 0.5, 32]} />
        <meshStandardMaterial color={BONE_DARK} roughness={0.85} />
      </mesh>
      {/* shaft */}
      <mesh position={[0, -1.2, 0]}>
        <cylinderGeometry args={[0.42, 0.3, 2.4, 32]} />
        <meshStandardMaterial color={BONE} roughness={0.85} />
      </mesh>
    </group>
  );
}

export function KneeScene({ implant = false }: { implant?: boolean }) {
  return (
    <Canvas camera={{ position: [0, 0, 7], fov: 40 }} dpr={[1, 2]}>
      <ambientLight intensity={0.7} />
      <hemisphereLight args={['#ffffff', '#8090a8', 0.8]} />
      <directionalLight position={[4, 6, 5]} intensity={1.2} />
      <directionalLight position={[-5, -2, -4]} intensity={0.5} />
      <pointLight position={[0, 2, 6]} intensity={0.6} />
      <Suspense fallback={null}>
        <Bounds fit clip observe margin={1.2}>
          <group rotation={[0.05, 0.4, 0]}>
            <Femur implant={implant} />
            <Tibia implant={implant} />
          </group>
        </Bounds>
      </Suspense>
      <OrbitControls enablePan enableZoom enableRotate makeDefault />
    </Canvas>
  );
}
