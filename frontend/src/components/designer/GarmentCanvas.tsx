'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer as KonvaLayer, Text, TextPath, Image as KonvaImage, Path, Transformer } from 'react-konva';
import Konva from 'konva';
import { GARMENT_VIEWBOX } from '@/lib/garmentArt';
import { ensureDesignFontsLoaded, getDesignFont } from '@/lib/designFonts';
import { getPrintPolygon, rectFitsInPolygon, type Polygon } from '@/lib/printZones';
import type { DesignLayer } from '@/types/designer';
import { useHtmlImage } from './useHtmlImage';

interface GarmentCanvasProps {
  /** Canvas size in px; the garment viewBox is mapped onto this. */
  widthPx: number;
  heightPx: number;
  /** Which garment/face, so the printable polygon can be looked up. */
  svgKey?: string;
  view?: 'front' | 'back';
  /** Fires while a layer is being dragged near the boundary, so the studio
   *  can highlight the print area. */
  onBoundaryPressure?: (active: boolean) => void;
  layers: DesignLayer[];
  selectedLayerId: string | null;
  onSelect: (id: string | null) => void;
  onChangeLayer: (id: string, partial: Partial<DesignLayer>) => void;
  /** PNG data URL of this side's artwork, used to bake the 3D texture. */
  onExport?: (dataUrl: string) => void;
}

/** Base on-garment width of an image layer, in viewBox units. */
const IMAGE_BASE_UNITS = GARMENT_VIEWBOX.width * 0.25;

const POCKET_PATHS: Record<string, string> = {
  patch: 'M0,0 L44,0 L44,48 L0,48 Z',
  rounded: 'M0,0 L44,0 L44,38 Q44,48 34,48 L10,48 Q0,48 0,38 Z',
  flap: 'M0,8 L44,8 L44,52 L0,52 Z M-2,0 L46,0 L46,12 L-2,12 Z',
};

const ImageLayerNode: React.FC<{
  layer: DesignLayer;
  scale: number;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (partial: Partial<DesignLayer>) => void;
  shapeRef: (node: Konva.Node | null) => void;
  dragBoundFunc: (this: Konva.Node, pos: { x: number; y: number }) => { x: number; y: number };
}> = ({ layer, scale, isSelected, onSelect, onChange, shapeRef, dragBoundFunc }) => {
  const src = layer.useVector && layer.vectorUrl ? layer.vectorUrl : layer.imageUrl;
  const img = useHtmlImage(src);
  const aspect = img ? img.width / img.height : 1;

  if (!img) return null;

  const width = IMAGE_BASE_UNITS * scale * layer.scale;
  const height = width / aspect;

  return (
    <KonvaImage
      ref={shapeRef}
      image={img}
      x={(layer.x / 100) * GARMENT_VIEWBOX.width * scale}
      y={(layer.y / 100) * GARMENT_VIEWBOX.height * scale}
      width={width}
      height={height}
      offsetX={width / 2}
      offsetY={height / 2}
      rotation={layer.rotation}
      draggable
      dragBoundFunc={dragBoundFunc}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        onChange({
          x: (e.target.x() / (GARMENT_VIEWBOX.width * scale)) * 100,
          y: (e.target.y() / (GARMENT_VIEWBOX.height * scale)) * 100,
        });
      }}
      onTransformEnd={(e) => {
        const node = e.target;
        const scaleX = node.scaleX();
        node.scaleX(1);
        node.scaleY(1);
        onChange({
          rotation: node.rotation(),
          scale: Math.max(0.05, layer.scale * scaleX),
          x: (node.x() / (GARMENT_VIEWBOX.width * scale)) * 100,
          y: (node.y() / (GARMENT_VIEWBOX.height * scale)) * 100,
        });
      }}
      stroke={isSelected ? 'var(--color-accent)' : undefined}
      strokeWidth={isSelected ? 1 : 0}
    />
  );
};

const TextLayerNode: React.FC<{
  layer: DesignLayer;
  scale: number;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (partial: Partial<DesignLayer>) => void;
  shapeRef: (node: Konva.Node | null) => void;
  dragBoundFunc: (this: Konva.Node, pos: { x: number; y: number }) => { x: number; y: number };
}> = ({ layer, scale, isSelected, onSelect, onChange, shapeRef, dragBoundFunc }) => {
  const font = getDesignFont(layer.fontFamily);
  const fontSize = (layer.fontSize ?? 11) * layer.scale * scale;
  const x = (layer.x / 100) * GARMENT_VIEWBOX.width * scale;
  const y = (layer.y / 100) * GARMENT_VIEWBOX.height * scale;

  const shared = {
    ref: shapeRef,
    x,
    y,
    rotation: layer.rotation,
    draggable: true,
    dragBoundFunc,
    onClick: onSelect,
    onTap: onSelect,
    fill: layer.color || '#141414',
    fontFamily: font.family,
    fontStyle: String(font.weight ?? 'normal'),
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
      onChange({
        x: (e.target.x() / (GARMENT_VIEWBOX.width * scale)) * 100,
        y: (e.target.y() / (GARMENT_VIEWBOX.height * scale)) * 100,
      });
    },
    onTransformEnd: (e: Konva.KonvaEventObject<Event>) => {
      const node = e.target;
      const scaleX = node.scaleX();
      node.scaleX(1);
      node.scaleY(1);
      onChange({
        rotation: node.rotation(),
        scale: Math.max(0.1, layer.scale * scaleX),
        x: (node.x() / (GARMENT_VIEWBOX.width * scale)) * 100,
        y: (node.y() / (GARMENT_VIEWBOX.height * scale)) * 100,
      });
    },
    stroke: isSelected ? 'var(--color-accent)' : undefined,
    strokeWidth: isSelected ? 0.5 : 0,
  };

  // Curved text rides an arc whose radius falls out of the bend angle, so
  // the type keeps its size as the curve tightens.
  if (layer.curve) {
    const text = layer.text || '';
    const arcWidth = fontSize * 0.62 * Math.max(text.length, 1);
    const radius = Math.max(fontSize * 1.2, (arcWidth / Math.abs(layer.curve)) * (180 / Math.PI));
    const sweep = layer.curve > 0 ? 1 : 0;
    const half = Math.min(radius * 1.9, arcWidth / 2);
    const rise = layer.curve > 0 ? -1 : 1;
    return (
      <TextPath
        {...shared}
        text={text}
        fontSize={fontSize}
        align="center"
        data={`M${-half},0 A${radius},${radius} 0 0,${sweep} ${half},${rise * 0.001}`}
      />
    );
  }

  const boxWidth = GARMENT_VIEWBOX.width * scale * 0.94;
  return (
    <Text
      {...shared}
      text={layer.text || ''}
      width={boxWidth}
      fontSize={fontSize}
      align="center"
      offsetX={boxWidth / 2}
      offsetY={fontSize / 2}
    />
  );
};

const PocketLayerNode: React.FC<{
  layer: DesignLayer;
  scale: number;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (partial: Partial<DesignLayer>) => void;
  shapeRef: (node: Konva.Node | null) => void;
  dragBoundFunc: (this: Konva.Node, pos: { x: number; y: number }) => { x: number; y: number };
}> = ({ layer, scale, isSelected, onSelect, onChange, shapeRef, dragBoundFunc }) => {
  const data = POCKET_PATHS[layer.pocketStyle ?? 'patch'] ?? POCKET_PATHS.patch;
  const size = scale * layer.scale * 0.5;

  return (
    <Path
      ref={shapeRef}
      data={data}
      x={(layer.x / 100) * GARMENT_VIEWBOX.width * scale}
      y={(layer.y / 100) * GARMENT_VIEWBOX.height * scale}
      scaleX={size}
      scaleY={size}
      offsetX={22}
      offsetY={24}
      rotation={layer.rotation}
      fill={layer.color || 'rgba(0,0,0,0.09)'}
      stroke={isSelected ? 'var(--color-accent)' : 'rgba(0,0,0,0.38)'}
      strokeWidth={isSelected ? 2.5 : 1.6}
      strokeScaleEnabled={false}
      dash={isSelected ? undefined : [3, 2]}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        onChange({
          x: (e.target.x() / (GARMENT_VIEWBOX.width * scale)) * 100,
          y: (e.target.y() / (GARMENT_VIEWBOX.height * scale)) * 100,
        });
      }}
      onTransformEnd={(e) => {
        const node = e.target;
        const factor = node.scaleX() / size;
        node.scaleX(size);
        node.scaleY(size);
        onChange({
          rotation: node.rotation(),
          scale: Math.max(0.2, layer.scale * factor),
          x: (node.x() / (GARMENT_VIEWBOX.width * scale)) * 100,
          y: (node.y() / (GARMENT_VIEWBOX.height * scale)) * 100,
        });
      }}
    />
  );
};

export const GarmentCanvas: React.FC<GarmentCanvasProps> = ({
  widthPx,
  heightPx,
  svgKey = 'tee',
  view = 'front',
  layers,
  selectedLayerId,
  onSelect,
  onChangeLayer,
  onExport,
  onBoundaryPressure,
}) => {
  const transformerRef = useRef<Konva.Transformer>(null);
  const nodeRefs = useRef<Record<string, Konva.Node>>({});
  const stageRef = useRef<Konva.Stage>(null);
  const onExportRef = useRef(onExport);
  onExportRef.current = onExport;

  const [fontsLoaded, setFontsLoaded] = useState(false);

  // px per garment viewBox unit.
  const scale = widthPx / GARMENT_VIEWBOX.width;

  // The printable area, in canvas pixels.
  const polygonPx: Polygon = useMemo(
    () => getPrintPolygon(svgKey, view).map(([x, y]) => [x * scale, y * scale] as [number, number]),
    [svgKey, view, scale],
  );
  const pressureRef = useRef(false);

  const signalPressure = useCallback(
    (blocked: boolean) => {
      if (pressureRef.current !== blocked) {
        pressureRef.current = blocked;
        onBoundaryPressure?.(blocked);
      }
    },
    [onBoundaryPressure],
  );

  /**
   * Konva hands us the position a drag *wants* to land on and lets us
   * return a different one, which is what actually pins the layer — an
   * out-of-bounds move is refused outright rather than accepted and warned
   * about after the fact. Konva binds `this` to the node being dragged.
   */
  const dragBoundFunc = useCallback(
    function (this: Konva.Node, pos: { x: number; y: number }) {
      const box = this.getClientRect({ skipShadow: true, skipStroke: true });
      const current = this.absolutePosition();
      const candidate = {
        x: box.x + (pos.x - current.x),
        y: box.y + (pos.y - current.y),
        width: box.width,
        height: box.height,
      };
      if (rectFitsInPolygon(candidate, polygonPx)) {
        signalPressure(false);
        return pos;
      }
      signalPressure(true);
      return current; // hold at the last position that fitted
    },
    [polygonPx, signalPressure],
  );

  // Canvas text bakes in whatever face is loaded at draw time, so redraw
  // once the design fonts actually arrive.
  useEffect(() => {
    let cancelled = false;
    ensureDesignFontsLoaded().then(() => {
      if (!cancelled) setFontsLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;
    const node = selectedLayerId ? nodeRefs.current[selectedLayerId] : null;
    transformer.nodes(node ? [node] : []);
    transformer.getLayer()?.batchDraw();
  }, [selectedLayerId, layers, fontsLoaded]);

  useEffect(() => {
    if (!onExportRef.current) return;
    const stage = stageRef.current;
    if (!stage) return;
    const timer = setTimeout(() => {
      const transformer = transformerRef.current;
      const wasVisible = transformer?.visible() ?? true;
      transformer?.visible(false);
      stage.batchDraw();
      const dataUrl = stage.toDataURL({ pixelRatio: 2 });
      transformer?.visible(wasVisible);
      stage.batchDraw();
      onExportRef.current?.(dataUrl);
    }, 200);
    return () => clearTimeout(timer);
  }, [layers, fontsLoaded]);

  return (
    <Stage
      ref={stageRef}
      width={widthPx}
      height={heightPx}
      onMouseDown={(e) => {
        if (e.target === e.target.getStage()) onSelect(null);
      }}
    >
      <KonvaLayer>
        {layers.map((layer) => {
          const common = {
            layer,
            scale,
            isSelected: selectedLayerId === layer.id,
            onSelect: () => onSelect(layer.id),
            onChange: (partial: Partial<DesignLayer>) => onChangeLayer(layer.id, partial),
            shapeRef: (node: Konva.Node | null) => {
              if (node) nodeRefs.current[layer.id] = node;
            },
            dragBoundFunc,
          };
          if (layer.type === 'image') return <ImageLayerNode key={layer.id} {...common} />;
          if (layer.type === 'pocket') return <PocketLayerNode key={layer.id} {...common} />;
          return <TextLayerNode key={layer.id} {...common} />;
        })}
        <Transformer
          ref={transformerRef}
          boundBoxFunc={(oldBox, newBox) =>
            rectFitsInPolygon(
              { x: newBox.x, y: newBox.y, width: newBox.width, height: newBox.height, rotation: newBox.rotation * (180 / Math.PI) },
              polygonPx,
            )
              ? newBox
              : oldBox
          }
          rotateEnabled
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
          borderStroke="var(--color-accent)"
          anchorStroke="var(--color-accent)"
          anchorFill="#FFFFFF"
          anchorSize={8}
        />
      </KonvaLayer>
    </Stage>
  );
};
