import { useMemo } from 'react';
import * as THREE from 'three';

interface BondsProps {
  coords: Float32Array;
  cutoff?: number; // in σ units, default 1.8
  theme?: 'dark' | 'light';
}

export function Bonds({ coords, cutoff = 1.8, theme = 'dark' }: BondsProps) {
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);

  const pairs = useMemo(() => {
    const N = coords.length / 3;
    const c2 = cutoff * cutoff;
    const result: Array<{ start: THREE.Vector3; end: THREE.Vector3 }> = [];
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const dx = coords[j*3]   - coords[i*3];
        const dy = coords[j*3+1] - coords[i*3+1];
        const dz = coords[j*3+2] - coords[i*3+2];
        if (dx*dx + dy*dy + dz*dz < c2) {
          result.push({
            start: new THREE.Vector3(coords[i*3], coords[i*3+1], coords[i*3+2]),
            end:   new THREE.Vector3(coords[j*3], coords[j*3+1], coords[j*3+2]),
          });
        }
      }
    }
    return result;
  }, [coords, cutoff]);

  return (
    <>
      {pairs.map(({ start, end }, idx) => {
        const dir = end.clone().sub(start);
        const len = dir.length();
        const mid = start.clone().lerp(end, 0.5);
        const quat = new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize());
        return (
          <mesh key={idx} position={mid} quaternion={quat}>
            <cylinderGeometry args={[0.04, 0.04, len, 6, 1]} />
            <meshPhongMaterial color={theme === 'light' ? '#777777' : '#aaaaaa'} transparent opacity={0.5} />
          </mesh>
        );
      })}
    </>
  );
}
