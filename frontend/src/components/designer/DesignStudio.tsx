'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Type, Image as ImageIcon, Trash2, Loader2, ShoppingBag, Save,
  Undo2, Redo2, ChevronUp, ChevronDown, Copy, Palette, Sparkles, Box, Square, Scissors, Link2, Check, RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/api';
import { downloadAuthenticatedFile } from '@/lib/download';
import { computePrice } from '@/lib/pricing';
import { GARMENT_VIEWBOX } from '@/lib/garmentSvgs';
import { GarmentSilhouette } from './GarmentSilhouette';
import { GarmentCanvasClient } from './GarmentCanvasClient';
import { Garment3DPreviewClient } from './Garment3DPreviewClient';
import type { GarmentTypeDetail, DesignLayer, Design, Address } from '@/types/designer';

const BASE_COLOR_SWATCHES = [
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Ink', hex: '#141414' },
  { name: 'Rust', hex: '#B14A20' },
  { name: 'Olive', hex: '#5B6146' },
  { name: 'Indigo', hex: '#26344D' },
  { name: 'Linen', hex: '#F5EEE4' },
];

const PRINT_METHOD_LABEL: Record<string, string> = {
  one_color: '1-Color Screen Print',
  spot_color: 'Multi-Color Screen Print',
  full_color: 'Full-Color DTG',
};

const DISPLAY_WIDTH = 340;
const DISPLAY_SCALE = DISPLAY_WIDTH / GARMENT_VIEWBOX.width;
const DISPLAY_HEIGHT = GARMENT_VIEWBOX.height * DISPLAY_SCALE;

let layerCounter = 0;
const nextLayerId = () => `layer-${Date.now()}-${layerCounter++}`;

interface DesignDoc {
  baseColor: string;
  selectedOptions: Record<string, string>;
  layers: DesignLayer[];
}

const DEFAULT_DOC: DesignDoc = { baseColor: '#FFFFFF', selectedOptions: {}, layers: [] };

export const DesignStudio: React.FC<{ slug: string; initialDesignId?: number }> = ({ slug, initialDesignId }) => {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [garmentType, setGarmentType] = useState<GarmentTypeDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [doc, setDocState] = useState<DesignDoc>(DEFAULT_DOC);
  const historyRef = useRef<{ past: DesignDoc[]; future: DesignDoc[] }>({ past: [], future: [] });
  const [historyTick, setHistoryTick] = useState(0);

  const setDoc = useCallback((updater: (prev: DesignDoc) => DesignDoc, recordHistory = true) => {
    setDocState((prev) => {
      const next = updater(prev);
      if (recordHistory && next !== prev) {
        historyRef.current.past.push(prev);
        historyRef.current.future = [];
        setHistoryTick((t) => t + 1);
      }
      return next;
    });
  }, []);

  const undo = useCallback(() => {
    const h = historyRef.current;
    if (h.past.length === 0) return;
    setDocState((prev) => {
      const previous = h.past.pop()!;
      h.future.push(prev);
      return previous;
    });
    setHistoryTick((t) => t + 1);
  }, []);

  const redo = useCallback(() => {
    const h = historyRef.current;
    if (h.future.length === 0) return;
    setDocState((prev) => {
      const next = h.future.pop()!;
      h.past.push(prev);
      return next;
    });
    setHistoryTick((t) => t + 1);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  const [activeZoneKey, setActiveZoneKey] = useState<string>('');
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [textDraft, setTextDraft] = useState('');

  const [designId, setDesignId] = useState<number | null>(initialDesignId ?? null);
  const [designName, setDesignName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [isDigitizing, setIsDigitizing] = useState(false);
  const [embroideryError, setEmbroideryError] = useState<string | null>(null);

  const [is3D, setIs3D] = useState(false);
  const [zoneTextures, setZoneTextures] = useState<Record<string, string>>({});

  const [showOrderPanel, setShowOrderPanel] = useState(false);
  const [orderSize, setOrderSize] = useState('M');
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [isRefreshingAddresses, setIsRefreshingAddresses] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Load the garment type, and — if resuming a saved design — its content.
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const gtRes = await api.get<GarmentTypeDetail>(`/catalog/garment-types/${slug}/`);
        if (cancelled) return;
        setGarmentType(gtRes.data);
        setActiveZoneKey(gtRes.data.print_zones[0]?.key ?? '');

        if (initialDesignId) {
          const designRes = await api.get<Design>(`/designer/designs/${initialDesignId}/`);
          if (cancelled) return;
          setDocState({
            baseColor: designRes.data.base_color,
            selectedOptions: designRes.data.selected_options,
            layers: designRes.data.layers,
          });
          setDesignName(designRes.data.name);
          setIsPublic(designRes.data.is_public);
          setDesignId(designRes.data.id);
          setShareToken(designRes.data.share_token);
        } else {
          const defaults: Record<string, string> = {};
          for (const opt of gtRes.data.style_options) {
            if (opt.is_default) defaults[opt.category] = opt.key;
          }
          setDocState({ baseColor: '#FFFFFF', selectedOptions: defaults, layers: [] });
        }
        historyRef.current = { past: [], future: [] };
      } catch {
        if (!cancelled) setLoadError('Could not load this garment. It may not exist.');
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [slug, initialDesignId]);

  const price = useMemo(() => {
    if (!garmentType) return 0;
    return computePrice(garmentType, doc.selectedOptions, doc.layers);
  }, [garmentType, doc]);

  const activeZone = garmentType?.print_zones.find((z) => z.key === activeZoneKey);
  // Memoized so Konva's canvas-export effect (keyed on this array's identity)
  // only re-fires when the layers actually change, not on unrelated re-renders.
  const zoneLayers = useMemo(
    () => doc.layers.filter((l) => l.zone === activeZoneKey),
    [doc.layers, activeZoneKey]
  );
  const selectedLayer = doc.layers.find((l) => l.id === selectedLayerId) || null;

  const optionsByCategory = useMemo(() => {
    if (!garmentType) return [];
    const map = new Map<string, { label: string; options: typeof garmentType.style_options }>();
    for (const opt of garmentType.style_options) {
      if (!map.has(opt.category)) map.set(opt.category, { label: opt.category_label, options: [] });
      map.get(opt.category)!.options.push(opt);
    }
    return Array.from(map.entries());
  }, [garmentType]);

  const updateLayer = (id: string, partial: Partial<DesignLayer>, recordHistory = true) => {
    setDoc((prev) => ({ ...prev, layers: prev.layers.map((l) => (l.id === id ? { ...l, ...partial } : l)) }), recordHistory);
  };

  const addTextLayer = () => {
    if (!activeZoneKey) return;
    const layer: DesignLayer = {
      id: nextLayerId(),
      zone: activeZoneKey,
      type: 'text',
      x: 50,
      y: 50,
      rotation: 0,
      scale: 1,
      text: textDraft.trim() || 'YOUR TEXT',
      color: '#141414',
      fontFamily: 'sans',
      fontSize: 18,
    };
    setDoc((prev) => ({ ...prev, layers: [...prev.layers, layer] }));
    setSelectedLayerId(layer.id);
    setTextDraft('');
  };

  const handleImageSelected = async (file: File) => {
    if (!activeZoneKey) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('original_image', file);
      const res = await api.post('/designer/assets/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const imageUrl: string = res.data.processed_image || res.data.original_image;
      const layer: DesignLayer = {
        id: nextLayerId(),
        zone: activeZoneKey,
        type: 'image',
        x: 50,
        y: 50,
        rotation: 0,
        scale: 1,
        imageUrl,
        vectorUrl: res.data.vector_image || undefined,
        width: res.data.width,
        height: res.data.height,
        dominantColors: res.data.dominant_colors,
        suggestedPrintMethod: res.data.suggested_print_method,
      };
      setDoc((prev) => ({ ...prev, layers: [...prev.layers, layer] }));
      setSelectedLayerId(layer.id);
    } catch {
      setSaveError('Could not process that image. Try a different file.');
    } finally {
      setIsUploading(false);
    }
  };

  const deleteSelectedLayer = () => {
    if (!selectedLayerId) return;
    setDoc((prev) => ({ ...prev, layers: prev.layers.filter((l) => l.id !== selectedLayerId) }));
    setSelectedLayerId(null);
  };

  const duplicateSelectedLayer = () => {
    if (!selectedLayer) return;
    const copy: DesignLayer = { ...selectedLayer, id: nextLayerId(), x: Math.min(90, selectedLayer.x + 6), y: Math.min(90, selectedLayer.y + 6) };
    setDoc((prev) => ({ ...prev, layers: [...prev.layers, copy] }));
    setSelectedLayerId(copy.id);
  };

  const moveLayer = (id: string, direction: 'forward' | 'backward') => {
    const zoneIds = doc.layers.filter((l) => l.zone === activeZoneKey).map((l) => l.id);
    const idx = zoneIds.indexOf(id);
    const swapIdx = direction === 'forward' ? idx + 1 : idx - 1;
    if (idx === -1 || swapIdx < 0 || swapIdx >= zoneIds.length) return;
    const otherId = zoneIds[swapIdx];
    setDoc((prev) => {
      const layers = [...prev.layers];
      const i1 = layers.findIndex((l) => l.id === id);
      const i2 = layers.findIndex((l) => l.id === otherId);
      [layers[i1], layers[i2]] = [layers[i2], layers[i1]];
      return { ...prev, layers };
    });
  };

  const saveDesign = async (): Promise<Design | null> => {
    if (!garmentType) return null;
    setIsSaving(true);
    setSaveError(null);
    try {
      const payload = {
        garment_type: garmentType.id,
        name: designName,
        base_color: doc.baseColor,
        selected_options: doc.selectedOptions,
        layers: doc.layers,
        is_public: isPublic,
      };
      const res = designId
        ? await api.patch<Design>(`/designer/designs/${designId}/`, payload)
        : await api.post<Design>('/designer/designs/', payload);
      setDesignId(res.data.id);
      setShareToken(res.data.share_token);
      setSavedAt(Date.now());
      return res.data;
    } catch {
      setSaveError('Could not save your design. Please try again.');
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const downloadEmbroidery = async (layer: DesignLayer) => {
    setIsDigitizing(true);
    setEmbroideryError(null);
    try {
      // Always (re)save first — the layer being digitized may have been
      // edited since the design was last persisted, and designId alone
      // doesn't tell us that.
      const id = (await saveDesign())?.id ?? null;
      if (!id) {
        setEmbroideryError('Save your design first.');
        return;
      }
      await downloadAuthenticatedFile(
        `/designer/designs/${id}/embroidery/`,
        `design-${id}-${layer.id}.dst`,
        'post',
        { layer_id: layer.id }
      );
    } catch (err) {
      setEmbroideryError(
        err instanceof Error && err.message.includes('generating')
          ? err.message
          : 'Could not digitize this text — try shorter or simpler text.'
      );
    } finally {
      setIsDigitizing(false);
    }
  };

  const placeOrder = async () => {
    setIsOrdering(true);
    setOrderError(null);
    try {
      // Always (re)save first so the order is placed against the design's
      // current state, not a stale save from before the latest edits.
      const id = (await saveDesign())?.id ?? null;
      if (!id) {
        setOrderError('Save your design first.');
        return;
      }
      await api.post('/orders/', {
        design: id,
        size: orderSize,
        quantity: orderQuantity,
        ...(selectedAddressId ? { address_id: selectedAddressId } : {}),
      });
      setOrderSuccess(true);
    } catch {
      setOrderError('Could not place your order. Please try again.');
    } finally {
      setIsOrdering(false);
    }
  };

  const openOrderPanel = async () => {
    setShowOrderPanel(true);
    try {
      const res = await api.get<Address[]>('/auth/addresses/');
      setAddresses(res.data);
      const defaultAddress = res.data.find((a) => a.is_default) ?? res.data[0];
      setSelectedAddressId(defaultAddress?.id ?? null);
    } catch {
      setAddresses([]);
    }
  };

  // "Manage"/"Add one" open the addresses page in a new tab (rather than
  // navigating away) so this order-in-progress isn't lost — this refetches
  // the list in place once they're back, instead of requiring a reload.
  const refreshAddresses = async () => {
    setIsRefreshingAddresses(true);
    try {
      const res = await api.get<Address[]>('/auth/addresses/');
      setAddresses(res.data);
      setSelectedAddressId((prev) => {
        if (prev && res.data.some((a) => a.id === prev)) return prev;
        const defaultAddress = res.data.find((a) => a.is_default) ?? res.data[0];
        return defaultAddress?.id ?? null;
      });
    } finally {
      setIsRefreshingAddresses(false);
    }
  };

  const copyShareLink = async () => {
    // Always (re)save first so the shared link reflects what's on screen,
    // not a stale save from before the latest edits.
    const token = (await saveDesign())?.share_token ?? shareToken ?? null;
    if (!token) return;
    const url = `${window.location.origin}/share/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      setSaveError('Could not copy the link. Please try again.');
    }
  };

  if (loadError) {
    return (
      <div className="max-w-lg mx-auto px-sp-3 py-sp-6 text-center">
        <p className="text-secondary text-sm">{loadError}</p>
      </div>
    );
  }

  if (!garmentType) {
    return (
      <div className="flex items-center justify-center py-sp-8">
        <Loader2 className="w-6 h-6 text-secondary animate-spin" />
      </div>
    );
  }

  const canUndo = historyRef.current.past.length > 0;
  const canRedo = historyRef.current.future.length > 0;
  void historyTick; // re-render trigger for canUndo/canRedo

  return (
    <div className="max-w-6xl mx-auto px-sp-3 sm:px-sp-4 py-sp-4 pb-24 md:pb-sp-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-sp-4">
      {/* Canvas column */}
      <div className="space-y-sp-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl text-ink">{garmentType.name}</h1>
            <p className="text-xs text-secondary mt-1">{garmentType.description}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={undo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              className="w-8 h-8 rounded-full border border-hairline flex items-center justify-center text-secondary hover:text-ink active:text-ink disabled:opacity-30 disabled:hover:text-secondary"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              title="Redo (Ctrl+Shift+Z)"
              className="w-8 h-8 rounded-full border border-hairline flex items-center justify-center text-secondary hover:text-ink active:text-ink disabled:opacity-30 disabled:hover:text-secondary"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Zone tabs + 2D/3D toggle */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            {garmentType.print_zones.map((zone) => (
              <button
                key={zone.key}
                onClick={() => setActiveZoneKey(zone.key)}
                className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider border transition-colors ${
                  activeZoneKey === zone.key
                    ? 'bg-ink text-white border-ink'
                    : 'bg-white text-secondary border-hairline hover:text-ink active:text-ink'
                }`}
              >
                {zone.label}
              </button>
            ))}
          </div>
          <div className="flex rounded-full border border-hairline p-0.5 bg-white shrink-0">
            <button
              onClick={() => setIs3D(false)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                !is3D ? 'bg-ink text-white' : 'text-secondary'
              }`}
            >
              <Square className="w-3 h-3" /> 2D
            </button>
            <button
              onClick={() => setIs3D(true)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                is3D ? 'bg-ink text-white' : 'text-secondary'
              }`}
            >
              <Box className="w-3 h-3" /> 3D
            </button>
          </div>
        </div>

        {/* Garment + canvas */}
        <div className="overflow-x-auto">
          <div
            className="relative mx-auto bg-surface-subtle rounded-3xl border border-hairline"
            style={{ width: DISPLAY_WIDTH, height: DISPLAY_HEIGHT }}
          >
            {/* Always mounted (just hidden) in 2D mode too — the Konva stage
                here is what bakes zoneTextures for the 3D view, so it must
                keep running even while the 3D tab is showing, or edits made
                while looking at 3D would silently never reach the mesh. */}
            <div className={is3D ? 'hidden' : 'contents'}>
              <GarmentSilhouette
                svgKey={garmentType.svg_key}
                view={activeZoneKey === 'back' ? 'back' : 'front'}
                color={doc.baseColor}
                activeZone={activeZone}
                className="absolute inset-0 w-full h-full p-4"
              />
              {activeZone && (
                <div
                  className="absolute overflow-hidden"
                  style={{
                    left: activeZone.x * DISPLAY_SCALE + 16,
                    top: activeZone.y * DISPLAY_SCALE + 16,
                    width: activeZone.width * DISPLAY_SCALE,
                    height: activeZone.height * DISPLAY_SCALE,
                  }}
                >
                  <GarmentCanvasClient
                    widthPx={activeZone.width * DISPLAY_SCALE}
                    heightPx={activeZone.height * DISPLAY_SCALE}
                    layers={zoneLayers}
                    selectedLayerId={selectedLayerId}
                    onSelect={setSelectedLayerId}
                    onChangeLayer={updateLayer}
                    onExport={(dataUrl) => setZoneTextures((prev) => ({ ...prev, [activeZoneKey]: dataUrl }))}
                  />
                </div>
              )}
            </div>
            {is3D && (
              <Garment3DPreviewClient
                svgKey={garmentType.svg_key}
                color={doc.baseColor}
                printZones={garmentType.print_zones}
                zoneTextures={zoneTextures}
              />
            )}
          </div>
        </div>
        {is3D && (
          <p className="text-[11px] text-secondary text-center -mt-1">
            Drag to orbit. Switch back to 2D to keep editing.
          </p>
        )}

        {/* Add content toolbar */}
        <div className="editorial-card rounded-2xl p-sp-3 space-y-sp-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-secondary">Add to {activeZone?.label}</span>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={textDraft}
                onChange={(e) => setTextDraft(e.target.value)}
                placeholder="Type text to add"
                className="flex-1 px-3 py-2 rounded-lg bg-surface-subtle border border-hairline text-xs text-ink placeholder:text-secondary/60 focus:bg-white focus:outline-none focus:border-ink transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
              />
              <button
                onClick={addTextLayer}
                className="px-3 py-2 rounded-lg bg-ink hover:bg-black active:bg-black active:scale-[0.98] text-white text-xs font-semibold flex items-center gap-1.5 shrink-0"
              >
                <Type className="w-3.5 h-3.5" /> Add Text
              </button>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-3 py-2 rounded-lg bg-white border border-hairline hover:bg-surface-subtle active:bg-surface-subtle text-ink text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
              Upload Image
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageSelected(file);
                e.target.value = '';
              }}
            />
          </div>
          <p className="text-[11px] text-secondary">
            Uploaded images run through local background removal (rembg), k-means color analysis and
            vector tracing — no third-party AI API involved.
          </p>
        </div>

        {/* Layer list for this zone */}
        {zoneLayers.length > 0 && (
          <div className="editorial-card rounded-2xl p-sp-3 space-y-sp-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-secondary">
              Layers on {activeZone?.label}
            </span>
            <div className="space-y-1.5">
              {[...zoneLayers].reverse().map((layer) => (
                <div
                  key={layer.id}
                  onClick={() => setSelectedLayerId(layer.id)}
                  className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border cursor-pointer ${
                    selectedLayerId === layer.id ? 'border-accent bg-accent/5' : 'border-hairline hover:bg-surface-subtle active:bg-surface-subtle'
                  }`}
                >
                  <span className="flex items-center gap-2 text-xs text-ink truncate">
                    {layer.type === 'text' ? <Type className="w-3.5 h-3.5 text-secondary shrink-0" /> : <ImageIcon className="w-3.5 h-3.5 text-secondary shrink-0" />}
                    <span className="truncate">{layer.type === 'text' ? layer.text : 'Uploaded image'}</span>
                  </span>
                  <span className="flex items-center gap-0.5 shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, 'backward'); }} className="p-1 text-secondary hover:text-ink active:text-ink" title="Send backward">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, 'forward'); }} className="p-1 text-secondary hover:text-ink active:text-ink" title="Bring forward">
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected layer editor */}
        {selectedLayer && (
          <div className="editorial-card rounded-2xl p-sp-3 space-y-sp-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-secondary">
                Editing {selectedLayer.type === 'text' ? 'Text' : 'Image'}
              </span>
              <span className="flex items-center gap-2">
                <button
                  onClick={duplicateSelectedLayer}
                  className="text-secondary hover:text-ink active:text-ink flex items-center gap-1 text-xs font-semibold"
                >
                  <Copy className="w-3.5 h-3.5" /> Duplicate
                </button>
                <button
                  onClick={deleteSelectedLayer}
                  className="text-red-600 hover:text-red-700 active:text-red-700 flex items-center gap-1 text-xs font-semibold"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </span>
            </div>
            {selectedLayer.type === 'text' && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex gap-1.5">
                  {['#141414', '#B14A20', '#5B6146', '#26344D', '#FFFFFF'].map((c) => (
                    <button
                      key={c}
                      onClick={() => updateLayer(selectedLayer.id, { color: c })}
                      className={`w-6 h-6 rounded-full border-2 ${selectedLayer.color === c ? 'border-accent' : 'border-hairline'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => updateLayer(selectedLayer.id, { fontFamily: 'sans' })}
                    className={`px-2.5 py-1 rounded-md text-xs border ${selectedLayer.fontFamily === 'sans' ? 'bg-ink text-white border-ink' : 'border-hairline text-secondary'}`}
                  >
                    Sans
                  </button>
                  <button
                    onClick={() => updateLayer(selectedLayer.id, { fontFamily: 'serif' })}
                    className={`px-2.5 py-1 rounded-md text-xs italic border ${selectedLayer.fontFamily === 'serif' ? 'bg-ink text-white border-ink' : 'border-hairline text-secondary'}`}
                  >
                    Serif
                  </button>
                </div>
                <button
                  onClick={() => downloadEmbroidery(selectedLayer)}
                  disabled={isDigitizing || !selectedLayer.text?.trim()}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border border-hairline text-secondary hover:text-ink hover:border-ink active:text-ink active:border-ink transition-colors disabled:opacity-50"
                  title="Digitize this text into a .dst embroidery machine file"
                >
                  {isDigitizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scissors className="w-3.5 h-3.5" />}
                  Embroidery File
                </button>
                {embroideryError && <p className="text-[11px] text-red-600 w-full">{embroideryError}</p>}
              </div>
            )}
            {selectedLayer.type === 'image' && (
              <div className="space-y-2">
                {selectedLayer.vectorUrl && (
                  <label className="flex items-center gap-2 text-xs text-ink">
                    <input
                      type="checkbox"
                      checked={!!selectedLayer.useVector}
                      onChange={(e) => updateLayer(selectedLayer.id, { useVector: e.target.checked })}
                    />
                    Use vector-traced version (crisper at any size)
                  </label>
                )}
                {selectedLayer.dominantColors && selectedLayer.dominantColors.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Palette className="w-3.5 h-3.5 text-secondary" />
                    <div className="flex gap-1">
                      {selectedLayer.dominantColors.map((c) => (
                        <span key={c} className="w-4 h-4 rounded-full border border-hairline" style={{ backgroundColor: c }} title={c} />
                      ))}
                    </div>
                    {selectedLayer.suggestedPrintMethod && (
                      <span className="text-[11px] text-secondary">
                        Suggested: <span className="font-semibold text-ink">{PRINT_METHOD_LABEL[selectedLayer.suggestedPrintMethod] ?? selectedLayer.suggestedPrintMethod}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
            <p className="text-[11px] text-secondary">Drag to move, corner handles to resize/rotate.</p>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-sp-3">
        <div className="editorial-card rounded-2xl p-sp-3 space-y-sp-3">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-secondary block mb-2">Garment Color</span>
            <div className="flex flex-wrap gap-2">
              {BASE_COLOR_SWATCHES.map((s) => (
                <button
                  key={s.hex}
                  title={s.name}
                  onClick={() => setDoc((prev) => ({ ...prev, baseColor: s.hex }))}
                  className={`w-7 h-7 rounded-full border-2 ${doc.baseColor === s.hex ? 'border-accent scale-110' : 'border-hairline'}`}
                  style={{ backgroundColor: s.hex }}
                />
              ))}
            </div>
          </div>

          {optionsByCategory.map(([category, { label, options }]) => (
            <div key={category}>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-secondary block mb-2">{label}</span>
              <div className="flex flex-wrap gap-2">
                {options.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setDoc((prev) => ({ ...prev, selectedOptions: { ...prev.selectedOptions, [category]: opt.key } }))}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      doc.selectedOptions[category] === opt.key
                        ? 'bg-ink text-white border-ink'
                        : 'bg-white text-secondary border-hairline hover:text-ink active:text-ink'
                    }`}
                  >
                    {opt.label}
                    {parseFloat(opt.price_delta) > 0 && <span className="opacity-70"> +${opt.price_delta}</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="editorial-card rounded-2xl p-sp-3 space-y-sp-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-secondary block">Name Your Design</span>
          <input
            type="text"
            value={designName}
            onChange={(e) => setDesignName(e.target.value)}
            placeholder="Untitled Design"
            className="w-full px-3 py-2 rounded-lg bg-surface-subtle border border-hairline text-xs text-ink placeholder:text-secondary/60 focus:bg-white focus:outline-none focus:border-ink transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
          />
          <label className="flex items-center gap-2 text-xs text-secondary pt-1">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
            Share as a public template
          </label>
          <Link href="/design/gallery" className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent">
            <Sparkles className="w-3 h-3" /> Browse the template gallery
          </Link>
          <button
            onClick={copyShareLink}
            className="w-full mt-1 py-2 rounded-lg border border-hairline text-ink text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-surface-subtle active:bg-surface-subtle transition-colors"
          >
            {linkCopied ? <Check className="w-3.5 h-3.5 text-accent" /> : <Link2 className="w-3.5 h-3.5" />}
            {linkCopied ? 'Link Copied' : 'Copy Share Link'}
          </button>
        </div>

        <div className="editorial-card rounded-2xl p-sp-3 space-y-sp-2">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-secondary">Price</span>
            <span className="text-2xl font-bold text-ink tabular-nums">${price.toFixed(2)}</span>
          </div>
          <p className="text-[11px] text-secondary leading-relaxed">
            Base price + style options + a setup fee per print zone used + a fee per layer — a fixed
            rule, not a black box.
          </p>

          {saveError && <p className="text-xs text-red-600">{saveError}</p>}
          {savedAt && !saveError && <p className="text-xs text-accent">Saved.</p>}

          <button
            onClick={() => saveDesign()}
            disabled={isSaving}
            className="w-full py-2.5 rounded-full bg-white border border-hairline hover:bg-surface-subtle active:bg-surface-subtle text-ink font-semibold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {designId ? 'Save Changes' : 'Save Design'}
          </button>

          <button
            onClick={openOrderPanel}
            className="w-full py-2.5 rounded-full bg-ink hover:bg-black active:bg-black active:scale-[0.98] text-white font-semibold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
          >
            <ShoppingBag className="w-3.5 h-3.5" /> Order This Design
          </button>
        </div>
      </div>

      {/* Order panel */}
      {showOrderPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-sp-4 space-y-sp-3">
            {orderSuccess ? (
              <div className="text-center space-y-sp-2 py-sp-2">
                <h3 className="font-serif text-2xl text-ink">Order placed.</h3>
                <p className="text-sm text-secondary">We&apos;ll take it from here.</p>
                <button
                  onClick={() => router.push('/orders')}
                  className="mt-sp-2 px-5 py-2.5 rounded-full bg-ink text-white text-xs font-semibold uppercase tracking-wider"
                >
                  View My Orders
                </button>
              </div>
            ) : (
              <>
                <h3 className="font-serif text-xl text-ink">Order This Design</h3>
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-secondary block mb-2">Size</span>
                  <div className="grid grid-cols-6 gap-1.5">
                    {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((s) => (
                      <button
                        key={s}
                        onClick={() => setOrderSize(s)}
                        className={`py-2 rounded-lg text-xs font-semibold border ${
                          orderSize === s ? 'bg-ink text-white border-ink' : 'border-hairline text-secondary'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-secondary block mb-2">Quantity</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setOrderQuantity((q) => Math.max(1, q - 1))}
                      className="w-8 h-8 rounded-full border border-hairline text-ink"
                    >
                      -
                    </button>
                    <span className="text-sm font-semibold w-6 text-center">{orderQuantity}</span>
                    <button
                      onClick={() => setOrderQuantity((q) => q + 1)}
                      className="w-8 h-8 rounded-full border border-hairline text-ink"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-secondary">Ship To</span>
                    <span className="flex items-center gap-2">
                      <button
                        onClick={refreshAddresses}
                        disabled={isRefreshingAddresses}
                        title="Refresh address list"
                        className="text-secondary hover:text-ink active:text-ink disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3 h-3 ${isRefreshingAddresses ? 'animate-spin' : ''}`} />
                      </button>
                      <Link
                        href="/account/addresses"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-semibold text-accent"
                      >
                        Manage
                      </Link>
                    </span>
                  </div>
                  {addresses.length === 0 ? (
                    <p className="text-xs text-secondary">
                      No saved addresses.{' '}
                      <Link href="/account/addresses" target="_blank" rel="noopener noreferrer" className="text-accent font-semibold">
                        Add one
                      </Link>{' '}
                      (opens in a new tab — your order stays open here; use the refresh
                      icon above once you've saved it), or place this order without
                      shipping details.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {addresses.map((a) => (
                        <label
                          key={a.id}
                          className={`flex items-start gap-2 px-2.5 py-2 rounded-lg border cursor-pointer text-xs ${
                            selectedAddressId === a.id ? 'border-accent bg-accent/5' : 'border-hairline'
                          }`}
                        >
                          <input
                            type="radio"
                            name="shipping-address"
                            checked={selectedAddressId === a.id}
                            onChange={() => setSelectedAddressId(a.id)}
                            className="mt-0.5"
                          />
                          <span>
                            <span className="block font-semibold text-ink">{a.full_name}</span>
                            <span className="block text-secondary">
                              {a.line1}, {a.city}, {a.postal_code}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-baseline justify-between pt-sp-1 border-t border-hairline">
                  <span className="text-xs text-secondary">Total</span>
                  <span className="text-xl font-bold text-ink tabular-nums">${(price * orderQuantity).toFixed(2)}</span>
                </div>
                {orderError && <p className="text-xs text-red-600">{orderError}</p>}
                <div className="flex gap-2 pt-sp-1">
                  <button
                    onClick={() => setShowOrderPanel(false)}
                    className="flex-1 py-2.5 rounded-full border border-hairline text-secondary text-xs font-semibold uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={placeOrder}
                    disabled={isOrdering}
                    className="flex-1 py-2.5 rounded-full bg-ink hover:bg-black active:bg-black active:scale-[0.98] text-white text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    {isOrdering ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Place Order'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
