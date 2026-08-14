import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

interface FaceProps {
  isSpeaking?: boolean;
  theme?: 'dark' | 'light';
}

function Face({ isSpeaking = false, theme = 'dark' }: FaceProps) {
  const meshColor = theme === 'light' ? '#18181b' : '#ffffff';
  const groupRef = useRef<THREE.Group>(null);
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);
  const mouthRef = useRef<THREE.Mesh>(null);

  const floatSpeed = 1.5;
  const floatAmplitude = 0.2;

  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(time * floatSpeed) * floatAmplitude;
    }

    if (leftEyeRef.current && rightEyeRef.current) {
      const blinkCycle = time % 4;
      if (blinkCycle > 3.8 && blinkCycle < 3.9) {
        leftEyeRef.current.scale.y = 0.1;
        rightEyeRef.current.scale.y = 0.1;
      } else {
        leftEyeRef.current.scale.y = 1;
        rightEyeRef.current.scale.y = 1;
      }
    }

    if (mouthRef.current) {
      if (isSpeaking) {
        const mouthScaleY = 0.3 + Math.random() * 0.7;
        const mouthScaleX = 0.8 + Math.random() * 0.4;
        mouthRef.current.scale.set(mouthScaleX, mouthScaleY, 1);
      } else {
        mouthRef.current.scale.set(1, 0.1, 1);
      }
    }
  });

  return (
    <group ref={groupRef}>
      <group position={[0, 0, 0]}>
        {/* Left Eye */}
        <mesh ref={leftEyeRef} position={[-0.6, 0.3, 0]}>
          <capsuleGeometry args={[0.2, 0.4, 4, 16]} />
          <meshBasicMaterial color={meshColor} toneMapped={false} />
        </mesh>

        {/* Right Eye */}
        <mesh ref={rightEyeRef} position={[0.6, 0.3, 0]}>
          <capsuleGeometry args={[0.2, 0.4, 4, 16]} />
          <meshBasicMaterial color={meshColor} toneMapped={false} />
        </mesh>

        {/* Mouth */}
        <mesh ref={mouthRef} position={[0, -0.4, 0]} rotation={[0, 0, Math.PI / 2]}>
          <capsuleGeometry args={[0.1, 0.6, 4, 16]} />
          <meshBasicMaterial color={meshColor} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

export function FaceCanvas({ isSpeaking = false, theme = 'dark' }: FaceProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 40 }}
      style={{ background: 'transparent' }}
      gl={{ alpha: true, antialias: true }}
    >
      <ambientLight intensity={theme === 'light' ? 1.0 : 0.6} />
      <directionalLight
        position={[5, 5, 5]}
        intensity={1}
        color={theme === 'light' ? '#8b5cf6' : '#a78bfa'}
      />
      <directionalLight
        position={[-5, 5, 5]}
        intensity={1}
        color={theme === 'light' ? '#d946ef' : '#c084fc'}
      />
      <Face isSpeaking={isSpeaking} theme={theme} />
      <EffectComposer>
        <Bloom luminanceThreshold={0.5} mipmapBlur intensity={1.5} />
      </EffectComposer>
    </Canvas>
  );
}
