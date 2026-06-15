import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Atoms } from './Atoms';
import { Bonds } from './Bonds';
import { useStore } from '../state/store';
import { ELEMENTS, ELEMENT_MAP } from '../data/elements';

export function ClusterScene() {
  const snapshot = useStore(s => s.snapshot);
  const symbol   = useStore(s => s.config.elementSymbol);
  const element  = ELEMENT_MAP.get(symbol) ?? ELEMENTS[0];

  return (
    <Canvas
      camera={{ position: [0, 0, 20], fov: 45, near: 0.1, far: 500 }}
      gl={{ antialias: true }}
      style={{ background: '#111827' }}
    >
      <ambientLight intensity={0.35} />
      <pointLight position={[15, 15, 15]} intensity={1.4} />
      <pointLight position={[-15, -10, -10]} intensity={0.4} />
      {snapshot ? (
        <>
          <Atoms coords={snapshot.bestCoords} element={element} />
          <Bonds coords={snapshot.bestCoords} />
        </>
      ) : (
        <mesh>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshPhongMaterial color="#4b5563" />
        </mesh>
      )}
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} />
    </Canvas>
  );
}
