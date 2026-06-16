import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Atoms } from './Atoms';
import { Bonds } from './Bonds';
import { useStore } from '../state/store';
import { ELEMENTS, ELEMENT_MAP } from '../data/elements';

export function ClusterScene() {
  const snapshot = useStore(s => s.snapshot);
  const symbol   = useStore(s => s.config.elementSymbol);
  const theme    = useStore(s => s.theme);
  const element  = ELEMENT_MAP.get(symbol) ?? ELEMENTS[0];

  const bg             = theme === 'dark' ? '#111827' : '#dde6ef';
  const ambientIntensity = theme === 'dark' ? 0.08 : 0.15;
  const placeholderColor = theme === 'dark' ? '#4b5563' : '#94a3b8';

  return (
    <Canvas
      camera={{ position: [0, 0, 20], fov: 45, near: 0.1, far: 500 }}
      gl={{ antialias: true }}
      style={{ background: bg }}
    >
      <ambientLight intensity={ambientIntensity} />
      <pointLight position={[10, 10, 15]} intensity={3.0} />
      <pointLight position={[-10, -8, -8]} intensity={0.5} />
      {snapshot ? (
        <>
          <Atoms coords={snapshot.bestCoords} element={element} />
          <Bonds coords={snapshot.bestCoords} theme={theme} />
        </>
      ) : (
        <mesh>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshPhongMaterial color={placeholderColor} />
        </mesh>
      )}
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} />
    </Canvas>
  );
}
