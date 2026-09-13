'use client';

import React, { useEffect, useRef } from 'react';
import { Stage, Layer as KonvaLayer, Text, Image as KonvaImage, Transformer } from 'react-konva';
import Konva from 'konva';
import type { DesignLayer } from '@/types/designer';
import { useHtmlImage } from './useHtmlImage';

interface GarmentCanvasProps {
  widthPx: number;
  heightPx: number;
  layers: DesignLayer[];
  selectedLayerId: string | null;
  onSelect: (id: string | null) => void;
  onChangeLayer: (id: string, partial: Partial<DesignLayer>) => void;
  /** Called with a PNG data URL of this zone's layers (transparent bg) —
   * used to bake a live texture for the 3D preview. */
  onExport?: (dataUrl: string) => void;
}

const ImageLayerNode: React.FC<{
  layer: DesignLayer;
  widthPx: number;
  heightPx: number;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (partial: Partial<DesignLayer>) => void;
  shapeRef: (node: Konva.Node | null) => void;
}> = ({ layer, widthPx, heightPx, isSelected, onSelect, onChange, shapeRef }) => {
  const src = layer.useVector && layer.vectorUrl ? layer.vectorUrl : layer.imageUrl;
  const img = useHtmlImage(src);
  const baseWidth = Math.min(widthPx, heightPx) * 0.5;
  const aspect = img ? img.width / img.height : 1;

  if (!img) return null;

  return (
    <KonvaImage
      ref={shapeRef}
      image={img}
      x={(layer.x / 100) * widthPx}
      y={(layer.y / 100) * heightPx}
      width={baseWidth * layer.scale}
      height={(baseWidth / aspect) * layer.scale}
      offsetX={(baseWidth * layer.scale) / 2}
      offsetY={(baseWidth / aspect / 2) * layer.scale}
      rotation={layer.rotation}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        onChange({ x: (e.target.x() / widthPx) * 100, y: (e.target.y() / heightPx) * 100 });
      }}
      onTransformEnd={(e) => {
        const node = e.target;
        const scaleX = node.scaleX();
        node.scaleX(1);
        node.scaleY(1);
        onChange({
          rotation: node.rotation(),
          scale: Math.max(0.2, layer.scale * scaleX),
          x: (node.x() / widthPx) * 100,
          y: (node.y() / heightPx) * 100,
        });
      }}
      stroke={isSelected ? 'var(--color-accent)' : undefined}
      strokeWidth={isSelected ? 1 : 0}
    />
  );
};

const TextLayerNode: React.FC<{
  layer: DesignLayer;
  widthPx: number;
  heightPx: number;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (partial: Partial<DesignLayer>) => void;
  shapeRef: (node: Konva.Node | null) => void;
}> = ({ layer, widthPx, heightPx, isSelected, onSelect, onChange, shapeRef }) => {
  const boxWidth = widthPx * 0.94;
  const fontSize = (layer.fontSize || 18) * layer.scale;
  return (
    <Text
    ref={shapeRef}
    text={layer.text || ''}
    x={(layer.x / 100) * widthPx}
    y={(layer.y / 100) * heightPx}
    width={boxWidth}
    fontSize={fontSize}
    fontFamily={layer.fontFamily === 'serif' ? 'Fraunces, Georgia, serif' : 'Inter, sans-serif'}
    fill={layer.color || '#141414'}
    fontStyle={layer.fontFamily === 'serif' ? 'italic' : 'normal'}
    align="center"
    offsetX={boxWidth / 2}
    offsetY={fontSize / 2}
    rotation={layer.rotation}
    draggable
    onClick={onSelect}
    onTap={onSelect}
    onDragEnd={(e) => {
      onChange({ x: (e.target.x() / widthPx) * 100, y: (e.target.y() / heightPx) * 100 });
    }}
    onTransformEnd={(e) => {
      const node = e.target;
      const scaleX = node.scaleX();
      node.scaleX(1);
      node.scaleY(1);
      onChange({
        rotation: node.rotation(),
        scale: Math.max(0.3, layer.scale * scaleX),
        x: (node.x() / widthPx) * 100,
        y: (node.y() / heightPx) * 100,
      });
    }}
    stroke={isSelected ? 'var(--color-accent)' : undefined}
    strokeWidth={isSelected ? 0.5 : 0}
    />
  );
};

export const GarmentCanvas: React.FC<GarmentCanvasProps> = ({
  widthPx,
  heightPx,
  layers,
  selectedLayerId,
  onSelect,
  onChangeLayer,
  onExport,
}) => {
  const transformerRef = useRef<Konva.Transformer>(null);
  const nodeRefs = useRef<Record<string, Konva.Node>>({});
  const stageRef = useRef<Konva.Stage>(null);
  const onExportRef = useRef(onExport);
  onExportRef.current = onExport;

  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;
    const node = selectedLayerId ? nodeRefs.current[selectedLayerId] : null;
    transformer.nodes(node ? [node] : []);
    transformer.getLayer()?.batchDraw();
  }, [selectedLayerId, layers]);

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
  }, [layers]);

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
        {layers.map((layer) =>
          layer.type === 'image' ? (
            <ImageLayerNode
              key={layer.id}
              layer={layer}
              widthPx={widthPx}
              heightPx={heightPx}
              isSelected={selectedLayerId === layer.id}
              onSelect={() => onSelect(layer.id)}
              onChange={(partial) => onChangeLayer(layer.id, partial)}
              shapeRef={(node) => {
                if (node) nodeRefs.current[layer.id] = node;
              }}
            />
          ) : (
            <TextLayerNode
              key={layer.id}
              layer={layer}
              widthPx={widthPx}
              heightPx={heightPx}
              isSelected={selectedLayerId === layer.id}
              onSelect={() => onSelect(layer.id)}
              onChange={(partial) => onChangeLayer(layer.id, partial)}
              shapeRef={(node) => {
                if (node) nodeRefs.current[layer.id] = node;
              }}
            />
          )
        )}
        <Transformer
          ref={transformerRef}
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
