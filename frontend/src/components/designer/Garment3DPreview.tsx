'use client';

import React, { Suspense, useMemo } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { GARMENT_VIEWBOX, getGarmentSvg } from '@/lib/garmentSvgs';
import type { PrintZone } from '@/types/designer';

// Everything below is built in "raw" SVG viewBox units (same space the 2D
// canvas and backend PrintZone rectangles use), then this one scale factor
// converts the whole scene to a sensible Three.js world size. Doing it this
// way — one shared transform — keeps the garment body and the print-zone
// texture planes lined up without separate unit-conversion math for each.
const WORLD_SCALE = 0.022;
const DEPTH_RAW = 14;

/** Parses one of our hand-drawn SVG path strings into extrudable THREE.Shapes. */
function pathToShapes(d: string): THREE.Shape[] {
  const svgText = `<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`;
  const loader = new SVGLoader();
  const data = loader.parse(svgText);
  const shapes: THREE.Shape[] = [];
  for (const path of data.paths) {
    shapes.push(...path.toShapes());
  }
  return shapes;
}

const CX_RAW = GARMENT_VIEWBOX.width / 2;
const CY_RAW = GARMENT_VIEWBOX.height / 2;

const GarmentBodyMeshes: React.FC<{ svgKey: string; color: string }> = ({ svgKey, color }) => {
  const svg = getGarmentSvg(svgKey);

  const bodyGeometry = useMemo(() => {
    const shapes = pathToShapes(svg.back);
    const geo = new THREE.ExtrudeGeometry(shapes, {
      depth: DEPTH_RAW,
      bevelEnabled: true,
      bevelThickness: 3,
      bevelSize: 2,
      bevelSegments: 2,
      curveSegments: 12,
    });
    geo.translate(-CX_RAW, -CY_RAW, -DEPTH_RAW / 2);
    return geo;
  }, [svg.back]);

  const hoodGeometry = useMemo(() => {
    if (!svg.frontOverlay) return null;
    const shapes = pathToShapes(svg.frontOverlay);
    const depth = DEPTH_RAW * 0.6;
    const geo = new THREE.ExtrudeGeometry(shapes, {
      depth,
      bevelEnabled: true,
      bevelThickness: 2,
      bevelSize: 1.5,
      bevelSegments: 2,
      curveSegments: 12,
    });
    geo.translate(-CX_RAW, -CY_RAW, DEPTH_RAW / 2 - depth * 0.5);
    return geo;
  }, [svg.frontOverlay]);

  return (
    <>
      <mesh geometry={bodyGeometry}>
        <meshStandardMaterial color={color} roughness={0.8} metalness={0.05} side={THREE.DoubleSide} />
      </mesh>
      {hoodGeometry && (
        <mesh geometry={hoodGeometry}>
          <meshStandardMaterial color={color} roughness={0.8} metalness={0.05} side={THREE.DoubleSide} />
        </mesh>
      )}
    </>
  );
};

const ZonePrintPlane: React.FC<{ zone: PrintZone; dataUrl: string; faceZRaw: number; facingBack: boolean }> = ({
  zone,
  dataUrl,
  faceZRaw,
  facingBack,
}) => {
  const texture = useLoader(THREE.TextureLoader, dataUrl);
  texture.colorSpace = THREE.SRGBColorSpace;

  const cx = zone.x + zone.width / 2 - CX_RAW;
  const cy = zone.y + zone.height / 2 - CY_RAW;

  return (
    <mesh
      position={[cx, cy, faceZRaw]}
      rotation={facingBack ? [0, Math.PI, 0] : [0, 0, 0]}
      // The parent <group> below is mirrored on Y (SVG-down -> Three-up),
      // which flips this plane's own texture orientation along with it —
      // cancel that out locally so the baked design reads right-side up.
      scale={[1, -1, 1]}
      // The parent's mirror transform also throws off the standard depth
      // comparison and bounding-sphere frustum check for this thin overlay
      // plane (it was being silently depth-failed/culled against the body
      // despite sitting correctly in front of it). Since this plane is a
      // deliberate decal always meant to render on top of the body, we
      // render it unconditionally instead of relying on the depth buffer.
      frustumCulled={false}
      renderOrder={999}
    >
      <planeGeometry args={[zone.width, zone.height]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} depthTest={false} side={THREE.DoubleSide} />
    </mesh>
  );
};

interface Garment3DPreviewProps {
  svgKey: string;
  color: string;
  printZones: PrintZone[];
  zoneTextures: Record<string, string>;
}

export const Garment3DPreview: React.FC<Garment3DPreviewProps> = ({ svgKey, color, printZones, zoneTextures }) => {
  const frontZone = printZones.find((z) => z.key === 'front');
  const backZone = printZones.find((z) => z.key === 'back');

  return (
    <Canvas camera={{ position: [0, 0, 7], fov: 35 }} dpr={[1, 2]}>
      <color attach="background" args={['#F2F2F2']} />
      <ambientLight intensity={0.8} />
      <directionalLight position={[3, 4, 5]} intensity={1.1} />
      <directionalLight position={[-3, -2, -4]} intensity={0.4} />
      <directionalLight position={[0, 5, -5]} intensity={0.3} />
      <Suspense fallback={null}>
        <group scale={[WORLD_SCALE, -WORLD_SCALE, WORLD_SCALE]}>
          <GarmentBodyMeshes svgKey={svgKey} color={color} />
          {frontZone && zoneTextures.front && (
            <ZonePrintPlane zone={frontZone} dataUrl={zoneTextures.front} faceZRaw={DEPTH_RAW / 2 + 1} facingBack={false} />
          )}
          {backZone && zoneTextures.back && (
            <ZonePrintPlane zone={backZone} dataUrl={zoneTextures.back} faceZRaw={-DEPTH_RAW / 2 - 1} facingBack />
          )}
        </group>
      </Suspense>
      <OrbitControls enablePan={false} minDistance={4} maxDistance={12} />
    </Canvas>
  );
};
