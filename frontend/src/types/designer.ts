export interface PrintZone {
  id: number;
  key: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  dpi: number;
}

export interface GarmentStyleOption {
  id: number;
  category: string;
  category_label: string;
  key: string;
  label: string;
  price_delta: string;
  is_default: boolean;
}

export interface GarmentTypeSummary {
  id: number;
  name: string;
  slug: string;
  svg_key: string;
  base_price: string;
}

export interface GarmentTypeDetail extends GarmentTypeSummary {
  description: string;
  viewbox_width: number;
  viewbox_height: number;
  print_zones: PrintZone[];
  style_options: GarmentStyleOption[];
}

export type LayerType = 'text' | 'image';

export interface DesignLayer {
  id: string;
  zone: string;
  type: LayerType;
  /** Position as a percentage (0-100) of the print zone's own box. */
  x: number;
  y: number;
  rotation: number;
  scale: number;
  // text layers
  text?: string;
  color?: string;
  fontFamily?: 'serif' | 'sans';
  fontSize?: number;
  // image layers
  imageUrl?: string;
  vectorUrl?: string;
  useVector?: boolean;
  width?: number;
  height?: number;
  dominantColors?: string[];
  suggestedPrintMethod?: string;
}

export interface Design {
  id: number;
  garment_type: number;
  garment_type_slug: string;
  garment_type_svg_key: string;
  name: string;
  base_color: string;
  selected_options: Record<string, string>;
  layers: DesignLayer[];
  price: string;
  is_public: boolean;
  share_token: string;
  author_name?: string;
  created_at: string;
  updated_at: string;
}

/** Read-only shape returned by the public, unauthenticated share-link endpoint. */
export interface PublicDesign {
  id: number;
  garment_type_slug: string;
  garment_type_svg_key: string;
  name: string;
  base_color: string;
  selected_options: Record<string, string>;
  layers: DesignLayer[];
  price: string;
  author_name?: string;
}

export interface Address {
  id: number;
  full_name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string;
  is_default: boolean;
  created_at: string;
}

export interface UploadedAsset {
  id: number;
  original_image: string;
  processed_image: string | null;
  vector_image: string | null;
  width: number | null;
  height: number | null;
  dominant_colors: string[];
  suggested_print_method: string;
  created_at: string;
}

export interface Order {
  id: number;
  design: number;
  garment_name?: string;
  customer_name?: string;
  size: string;
  quantity: number;
  unit_price: string;
  total_price: string;
  status: string;
  shipping_name?: string;
  shipping_line1?: string;
  shipping_line2?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_postal_code?: string;
  shipping_country?: string;
  shipping_phone?: string;
  created_at: string;
}

export interface FabricEstimate {
  roll_width_cm: number;
  fabric_length_cm: number;
  fabric_length_m: number;
  total_piece_area_cm2: number;
  fabric_area_used_cm2: number;
  utilization_pct: number;
  waste_pct: number;
  pieces_packed: number;
  pieces_total: number;
}
