/**
 * Shared Type Definitions for AssanDukan Merchant App / MeriDukan Merchant SPA
 */

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  tenant_role: 'owner' | 'manager' | 'staff';
}

export interface Store {
  id: number;
  name: string;
  store_slug: string;
  status: 'active' | 'inactive' | 'suspended';
  whatsapp_number?: string;
  delivery_charge?: number;
  bank_name?: string;
  account_title?: string;
  account_number?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'like' | 'order' | 'system';
  created_at: string;
  read: boolean;
  item_id?: number | string;
}

export interface Announcement {
  id: number;
  title: string;
  body: string;
  publish_date?: string;
  created_at: string;
  author: {
    name: string;
  };
  image?: string;
}

export interface News {
  id: number;
  title: string;
  body: string;
  excerpt?: string;
  created_at: string;
  author: {
    name: string;
  };
  image?: string;
}

export interface Event {
  id: number;
  title: string;
  description: string;
  event_date: string;
  location?: string;
  image?: string;
  created_at: string;
}

export interface DashboardStats {
  total_products: number;
  active_products: number;
  total_orders: number;
  pending_orders: number;
  today_orders?: number;
  total_revenue?: number;
  today_revenue?: number;
}

export interface MerchantCommunityPost {
  id: number;
  tenant_id: number;
  store_name?: string;
  store_slug?: string;
  user: { name: string };
  title: string;
  body: string;
  image_path: string | null;
  video_path: string | null;
  likes_count: number;
  user_has_liked: boolean;
  created_at: string;
  tenant?: {
      name: string;
      store_slug: string;
  }
}

export interface DiscoverProduct {
  product_id: number;
  product_name: string;
  price: number;
  image: string | null;
  store_name: string;
  store_slug: string;
  total_sold: number;
}

export interface TopProduct {
  product_id: number;
  product_name: string;
  image: string | null;
  total_sold: number;
}

export interface DashboardData {
  stats: DashboardStats;
  recent_orders: Order[];
  top_products: TopProduct[];
  analytics_enabled: boolean;
}

export interface ProductVariant {
  id?: number;
  option_name: string;
  option_value: string;
  price_override: number | null;
  stock_quantity: number;
}

export interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  stock_quantity: number;
  sku: string | null;
  category: string | null;
  is_active: boolean;
  images: string[];
  variants: ProductVariant[];
}

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderItem {
  id: number;
  product_id?: number;
  product_name: string;
  variant_name: string | null;
  quantity: number;
  unit_price: number;
  image?: string | null;
  product?: Product;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  avatar: string;
  total_orders_count: number;
  total_spend: number;
  member_since: string;
}

export interface Order {
  id: number;
  customer_id?: number;
  order_number: string;
  customer_name: string;
  customer_phone?: string;
  customer_address?: string;
  status: OrderStatus;
  subtotal: number;
  delivery_charge: number;
  total: number;
  courier_name?: string | null;
  tracking_number?: string | null;
  created_at: string;
  items?: OrderItem[];
  customer?: Customer;
}

export interface Coupon {
  id: number;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  usage_limit: number | null;
  expires_at: string | null;
  is_active: boolean;
}

export interface ThemeSettings {
  accent_color: string;
  secondary_color: string;
  typography: string;
  heading_font: string;
  favicon?: string | null;
  logo?: string | null;
  banner_image?: string | null;
  banner_text: string | null;
  store_description: string | null;
  bg_color: string;
  text_color: string;
  seo_title: string | null;
  seo_description: string | null;
  seo_image?: string | null;
}

export interface ThemeResponse {
  themes: {
    [key: string]: {
      name: string;
      premium: boolean;
      preview_url?: string;
    };
  };
  active_slug: string;
  settings: ThemeSettings;
  can_change: boolean;
  theme_change_fee: number;
  theme_unlock_pending: boolean;
}

export interface StorefrontSection {
  id: number;
  type: 'promo_banner' | 'whatsapp_cta' | 'new_arrivals' | 'featured_products' | 'testimonials' | 'faq' | 'category_showcase';
  title: string | null;
  subtitle: string | null;
  is_active: boolean;
  cta_text?: string;
  cta_link?: string;
  layout?: string;
  image?: string | null;
  message?: string;
  limit?: number;
  columns?: number;
  product_ids?: number[];
  items?: any[]; // For Testimonials, FAQ, Category Showcase repeaters
}

export interface StoreSettings {
  store_name: string;
  phone: string;
  support_email?: string | null;
  support_phone?: string | null;
  address?: string | null;
  city?: string | null;
  delivery_charge?: number | null;
  bank_name?: string | null;
  account_title?: string | null;
  account_number?: string | null;
  can_change_store_info?: boolean;
  store_info_change_fee?: number;
  theme_change_fee?: number;
}

export interface SettingsResponse {
  tenant: {
    name: string;
    store_slug: string;
    whatsapp_number: string | null;
    delivery_charge: number;
    bank_name: string | null;
    account_title: string | null;
    account_number: string | null;
  };
  can_change_store_info: boolean;
  store_info_change_fee: number;
  theme_change_fee: number;
  pending_unlocks: string[];
  approved_unlocks: string[];
}

export interface DomainResponse {
  subdomain_allowed: boolean;
  custom_domain_allowed: boolean;
  current_subdomain: string | null;
  subdomain_status: 'active' | 'pending' | 'rejected' | null;
  current_custom_domain: string | null;
  subdomain_request: string | null;
  custom_domain_request: string | null;
  custom_domain_request_id?: number;
  custom_domain_status?: string; // pending | quote_sent | payment_submitted | active | rejected
  custom_domain_quote?: number;
  merchant_owns_domain?: boolean;
  admin_note?: string | null;
  connection_fee?: number; // fixed fee (e.g. 400) when merchant owns domain
  payment_accounts?: Array<{
    bank_name: string;
    account_title: string;
    account_number: string;
    iban?: string;
    branch_code?: string;
  }>;
}

export interface StaffMember {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  tenant_role: 'owner' | 'manager' | 'staff';
  created_at: string;
}

export interface BillingResponse {
  plan: {
    name: string;
    price_monthly: number;
  };
  all_plans: Array<{
    name: string;
    price_monthly: number;
    features: string[];
  }>;
  billing: {
    quota_limit: number;
    messages_sent: number;
    overage_count: number;         // WA overage count
    overage_price: number;
    wa_overage_cost: number;
    usage_pct: number;

    order_limit: number;
    orders_this_month: number;
    order_overage_count: number;
    extra_order_fee: number;
    order_overage_cost: number;

    total_overage_cost: number;

    period_start: string;
    period_end: string;
    plan_price_monthly: number;
    renewal_total: number;
    subscription_status: string;
    subscription_expires_at: string;
  };
  payment_accounts?: Array<{
    bank_name: string;
    account_title: string;
    account_number: string;
    iban?: string;
    branch_code?: string;
  }>;
  stats: {
    total_orders: number;
    pending_orders: number;
    total_revenue: number;
  };
}
