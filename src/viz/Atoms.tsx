import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ElementData } from '../data/elements';

interface AtomsProps {
  coords: Float32Array;
  element: ElementData;
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

export function Atoms({ coords, element }: AtomsProps) {
  const count   = coords.length / 3;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const fromRef = useRef(coords.slice());
  const toRef   = useRef(coords.slice());
  const tRef    = useRef(1);
  const dummy   = useRef(new THREE.Object3D());

  useEffect(() => {
    const t = tRef.current;
    const newFrom = new Float32Array(coords.length);
    for (let i = 0; i < coords.length; i++) {
      newFrom[i] = lerp(fromRef.current[i], toRef.current[i], t);
    }
    fromRef.current = newFrom;
    toRef.current   = coords.slice();
    tRef.current    = 0;
  }, [coords]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    tRef.current = Math.min(tRef.current + delta * 6, 1);
    const t    = tRef.current;
    const from = fromRef.current;
    const to   = toRef.current;

    for (let i = 0; i < count; i++) {
      dummy.current.position.set(
        lerp(from[i*3],   to[i*3],   t),
        lerp(from[i*3+1], to[i*3+1], t),
        lerp(from[i*3+2], to[i*3+2], t),
      );
      dummy.current.scale.setScalar(element.radius * 0.55);
      dummy.current.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.current.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 24, 24]} />
      <meshPhongMaterial color={element.color} shininess={100} specular="#ffffff" />
    </instancedMesh>
  );
}
