import {
  Announcement, News, Event as AppEvent, User, Store, DashboardData,
  Product, Order, Coupon, ThemeResponse, StorefrontSection,
  SettingsResponse, DomainResponse, StaffMember, BillingResponse, OrderStatus, TopProduct, Customer,
  MerchantCommunityPost, DiscoverProduct
} from '../types';

const API_BASE = '/api/merchant';

// Setup local storage keys for mock data
const KEYS = {
  TOKEN: 'merchant_token',
  USER: 'merchant_user',
  STORE: 'merchant_store',
  DEMO_MODE: 'merchant_demo_mode',
  ANNOUNCEMENTS: 'merchant_mock_announcements',
  NEWS: 'merchant_mock_news',
  EVENTS: 'merchant_mock_events',
  PRODUCTS: 'merchant_mock_products',
  ORDERS: 'merchant_mock_orders',
  CUSTOMERS: 'merchant_mock_customers',
  COUPONS: 'merchant_mock_coupons',
  THEME: 'merchant_mock_theme',
  SECTIONS: 'merchant_mock_sections',
  SETTINGS: 'merchant_mock_settings',
  DOMAIN: 'merchant_mock_domain',
  STAFF: 'merchant_mock_staff',
  BILLING: 'merchant_mock_billing',
  OFFLINE_QUEUE: 'merchant_offline_queue'
};

export class ApiClient {
  public static isDemo(): boolean {
    return false;
  }

  public static setDemo(val: boolean): void {
  }

  private static getHeaders(isFormData = false): HeadersInit {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    const token = localStorage.getItem(KEYS.TOKEN);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private static async request<T>(endpoint: string, options: RequestInit = {}): Promise<{ success: boolean; data?: T; message?: string; } & any> {
    try {
      const isPublic = endpoint.startsWith('/public/');
      // The user requested to always connect to the live backend API, even during local dev.
      const baseUrl = 'https://asaandukan.online';

      const url = `${baseUrl}${API_BASE}${endpoint}`;
      const method = options.method || 'GET';

      if (!navigator.onLine) {
        if (method === 'GET') {
          // Serve from offline cache
          const cacheKey = `offline_cache_${endpoint}`;
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            console.log(`Serving ${endpoint} from offline cache`);
            const parsed = JSON.parse(cached);
            parsed.isOffline = true;
            return parsed;
          }
          throw new Error("You are offline and no cached data is available.");
        } else {
          // Queue mutation
          const queue = JSON.parse(localStorage.getItem(KEYS.OFFLINE_QUEUE) || '[]');
          queue.push({
            endpoint,
            options: {
              ...options,
              // If body is FormData, we can't easily stringify it, assume JSON for simple forms
              body: typeof options.body === 'string' ? options.body : null,
              headers: { ...this.getHeaders() }
            },
            timestamp: Date.now()
          });
          localStorage.setItem(KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
          
          window.dispatchEvent(new CustomEvent('api_connection_failed', { detail: { message: 'Action queued for background sync when online.' } }));
          return { success: true, message: "Action queued offline.", data: null };
        }
      }

      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(options.body instanceof FormData),
          ...options.headers,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem(KEYS.TOKEN);
        localStorage.removeItem(KEYS.USER);
        localStorage.removeItem(KEYS.STORE);
        // Dispatch custom event to notify App
        window.dispatchEvent(new Event('merchant_logout_unauthorized'));
        throw new Error("Unauthenticated. Please log in again.");
      }

      const resBody = await response.json();

      if (response.status === 503) {
        // Maintenance mode — dispatch event so the app can show the screen
        window.dispatchEvent(new CustomEvent('merchant_maintenance', { detail: { message: resBody.message || 'Service is under maintenance.' } }));
        throw new Error(resBody.message || 'Service is temporarily under maintenance. Please try again later.');
      }

      if (!response.ok) {
        throw new Error(resBody.message || "An error occurred with the server request");
      }

      // Cache successful GET requests
      if (method === 'GET' && resBody.success) {
        const cacheKey = `offline_cache_${endpoint}`;
        localStorage.setItem(cacheKey, JSON.stringify(resBody));
      }

      return resBody;
    } catch (error: any) {
      if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
        console.warn("Network error during fetch to Real API.", error);
        window.dispatchEvent(new CustomEvent('api_connection_failed', { detail: { message: 'Connection failed. You might be offline.' } }));
        
        // Fallback if fetch fails but navigator.onLine was true
        if ((options.method || 'GET') === 'GET') {
          const cacheKey = `offline_cache_${endpoint}`;
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            parsed.isOffline = true;
            return parsed;
          }
        }
      }
      throw error;
    }
  }

  // Sync background queue
  public static async syncOfflineQueue(): Promise<void> {
    if (!navigator.onLine) return;
    
    const queue = JSON.parse(localStorage.getItem(KEYS.OFFLINE_QUEUE) || '[]');
    if (queue.length === 0) return;

    console.log(`Syncing ${queue.length} items from offline queue...`);
    const remainingQueue = [];

    for (const item of queue) {
      try {
        await this.request(item.endpoint, item.options);
      } catch (e) {
        console.error("Failed to sync item", item, e);
        remainingQueue.push(item);
      }
    }

    localStorage.setItem(KEYS.OFFLINE_QUEUE, JSON.stringify(remainingQueue));
  }

  public static async getAnnouncements(page = 1, perPage = 15): Promise<Announcement[]> {
    const res = await this.request<any>(`/public/announcements?page=${page}&per_page=${perPage}`);
    if (res.success && res.data?.data) {
      return res.data.data;
    }
    return [];
  }
  public static async getNews(page = 1, perPage = 15): Promise<News[]> {
    const res = await this.request<any>(`/public/news?page=${page}&per_page=${perPage}`);
    if (res.success && res.data?.data) {
      return res.data.data;
    }
    return [];
  }

  public static async getEvents(page = 1, perPage = 15): Promise<AppEvent[]> {
    const res = await this.request<any>(`/public/events?page=${page}&per_page=${perPage}`);
    if (res.success && res.data?.data) {
      return res.data.data;
    }
    return [];
  }

    // Login
    public static async login(email: string, password: string): Promise<{ success: boolean, message: string, token?: string, user?: User, store?: Store }> {


      // Try live API login
      this.setDemo(false);

      const res = await this.request<any>('/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      if (res.success && (res.data || (res as any).token)) {
        const data = (res.data || res) as any;
        const token = data.token || data.access_token;
        const user = data.user;
        const store = data.store;

        if (token && user) {
          localStorage.setItem(KEYS.TOKEN, token);
          localStorage.setItem(KEYS.USER, JSON.stringify(user));
          if (store) {
            localStorage.setItem(KEYS.STORE, JSON.stringify(store));
          }
          this.setDemo(false);
          return { success: true, message: "Successfully authenticated with Live API!", token, user, store };
        }
      }

      throw new Error(res.message || "Invalid merchant credentials or failed server response.");
    }

    // Register
    public static async register(payload: any): Promise<{ success: boolean, message: string, token?: string, user?: User, store?: Store }> {
      this.setDemo(false);
      const res = await this.request<any>('/register', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res.success && (res.data || (res as any).token)) {
        const data = (res.data || res) as any;
        const token = data.token || data.access_token;
        const user = data.user;
        const store = data.store;

        if (token && user) {
          localStorage.setItem(KEYS.TOKEN, token);
          localStorage.setItem(KEYS.USER, JSON.stringify(user));
          if (store) {
            localStorage.setItem(KEYS.STORE, JSON.stringify(store));
          }
          return { success: true, message: "Account created successfully!", token, user, store };
        }
      }
      throw new Error(res.message || "Registration failed.");
    }

    public static async getPublicThemes(planSlug?: string): Promise<any[]> {
      const url = planSlug ? `/public/themes?plan_slug=${encodeURIComponent(planSlug)}` : '/public/themes';
      const res = await this.request<any>(url);
      if (res.success && Array.isArray(res.data)) {
        return res.data;
      }
      return [];
    }

    public static async getPublicPlans(): Promise<any[]> {
      const isDemo = this.isDemo();
      if (isDemo) {
        return [
          { slug: 'free', name: 'Free', price_monthly: 0, price_yearly: 0, is_free: true, features: ['Core catalog', 'Up to 50 products', 'Basic themes'] },
          { slug: 'standard', name: 'Standard', price_monthly: 1500, price_yearly: 15000, is_free: false, features: ['Unlimited products', 'Premium themes', 'Custom domain routing'] },
          { slug: 'pro', name: 'Professional', price_monthly: 3000, price_yearly: 30000, is_free: false, features: ['Standard + API Access', 'Staff accounts', 'Advanced Analytics'] }
        ];
      }

      const res = await this.request<any>('/public/plans');
      if (res.success && Array.isArray(res.data)) {
        return res.data;
      }
      return [];
    }

  // Logout
  public static async logout(): Promise<void> {
    const isDemo = this.isDemo();
    if (!isDemo) {
      await fetch(`${API_BASE}/logout`, {
        method: 'POST',
        headers: this.getHeaders()
      }).catch(e => console.log("Logout api failed, clearing local token anyway", e));
    }

    localStorage.removeItem(KEYS.TOKEN);
    localStorage.removeItem(KEYS.USER);
    localStorage.removeItem(KEYS.STORE);
    this.setDemo(false);
  }

  // Get Profile
  public static async getMe(): Promise<User> {


    const res = await this.request<User>('/me');
    if (res.success && res.data) {
      return res.data;
    }
    return JSON.parse(localStorage.getItem(KEYS.USER) || '{}') as User;
  }

  // 1. Dashboard Info
  public static async getDashboard(): Promise<DashboardData> {


    const res = await this.request<DashboardData>('/dashboard');
    if (res.success && res.data) {
      return res.data;
    }
    throw new Error("Failed to fetch data");
  }

  // 2. Products Panel
  public static async getProducts(search = '', status = ''): Promise<{ data: Product[], product_count: number, product_limit: number, can_add: boolean }> {
    const url = `/products?search=${encodeURIComponent(search)}&status=${status}&per_page=50`;
    const res = await this.request<any>(url);
    if (res.success && res.data) {
      const productsField = res.data.products;
      const parsedProducts: Product[] = Array.isArray(productsField)
        ? productsField
        : Array.isArray(productsField?.data)
          ? productsField.data
          : [];

      return {
        data: parsedProducts,
        product_count: res.data.product_count ?? parsedProducts.length,
        product_limit: res.data.product_limit ?? 30,
        can_add: res.data.can_add ?? true,
      };
    }
    throw new Error((res as any).message || "Failed to fetch products");
  }

  public static async getProduct(id: number): Promise<Product> {


    const res = await this.request<Product>(`/products/${id}`);
    if (res.success && res.data) {
      return res.data;
    }
    throw new Error("Item not found");
  }

  public static async saveProduct(productData: any, id?: number): Promise<Product> {
    const isDemo = this.isDemo();

    // Capture for Offline Sync if the browser goes completely offline!
    if (!navigator.onLine && !isDemo) {
      queueOfflineAction(
        id ? `/products/${id}` : '/products',
        id ? 'POST' : 'POST',
        productData,
        id ? `Update Product: ${productData.name || id}` : `Create Product: ${productData.name}`
      );
    }

    if (isDemo) {
      const products = getStored<Product[]>(KEYS.PRODUCTS, INITIAL_PRODUCTS);

      // Basic simulation of images: if a file object is added, simulate a beautiful unsplash photo
      const imageList = productData.images && productData.images.length > 0
        ? productData.images
        : ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600&auto=format&fit=crop"];

      if (id) {
        // Edit Mode
        const idx = products.findIndex(p => p.id === id);
        if (idx !== -1) {
          const updated = {
            ...products[idx],
            ...productData,
            images: imageList,
            variants: productData.variants || []
          };
          products[idx] = updated;
          setStored(KEYS.PRODUCTS, products);
          return updated;
        }
        throw new Error("Product not found");
      } else {
        // Create Mode
        const newProduct: Product = {
          id: Math.floor(Math.random() * 1000) + 200,
          name: productData.name,
          description: productData.description || null,
          price: Number(productData.price),
          compare_at_price: productData.compare_at_price ? Number(productData.compare_at_price) : null,
          stock_quantity: Number(productData.stock_quantity),
          sku: productData.sku || null,
          category: productData.category || null,
          is_active: productData.is_active !== undefined ? productData.is_active : true,
          images: imageList,
          variants: productData.variants || []
        };
        products.push(newProduct);
        setStored(KEYS.PRODUCTS, products);
        return newProduct;
      }
    }

    const isEdit = !!id;
    const url = isEdit ? `/products/${id}` : `/products`;

    // Use FormData for multipart uploading
    const fd = new FormData();
    if (isEdit) {
      fd.append('_method', 'PUT');
    }

    Object.entries(productData).forEach(([key, val]) => {
      if (key === 'images') {
        // Handle files or URLs
        if (Array.isArray(val)) {
          val.forEach((img: any) => {
            if (img instanceof File) {
              fd.append('images[]', img);
            } else {
              fd.append('existing_images[]', img);
            }
          });
        }
      } else if (key === 'variants') {
        if (Array.isArray(val)) {
          val.forEach((variant: any, index: number) => {
            Object.entries(variant).forEach(([vKey, vVal]) => {
              if (vVal !== null && vVal !== undefined) {
                fd.append(`variants[${index}][${vKey}]`, String(vVal));
              }
            });
          });
        }
      } else if (val !== null && val !== undefined) {
        fd.append(key, typeof val === 'boolean' ? (val ? '1' : '0') : String(val));
      }
    });

    const res = await this.request<any>(url, {
      method: 'POST',
      body: fd
    }, true);

    if (res.success && res.data) {
      return res.data;
    }
    throw new Error(res.message || "Failed to save product.");
  }

  public static async deleteProduct(id: number): Promise<void> {


    const res = await this.request<any>(`/products/${id}/toggle-active`, { method: 'PATCH' });
    return !!res.success;
  }

  // 3. Orders Panel
  public static async getOrders(status = ''): Promise<Order[]> {
    const url = `/orders${status ? `?status=${status}` : ''}`;
    const res = await this.request<any>(url);
    if (res.success && res.data) {
      return res.data.data || res.data;
    }
    throw new Error("Failed to fetch data");
  }

  public static async getOrder(id: number): Promise<Order> {


    const res = await this.request<Order>(`/orders/${id}`);
    if (res.success && res.data) {
      return res.data;
    }
    throw new Error("Item not found");
  }

  public static async getCustomer(id: number): Promise<Customer> {


    const res = await this.request<Customer>(`/customers/${id}`);
    if (res.success && res.data) {
      return res.data;
    }
    throw new Error("Item not found");
  }

  public static async updateOrder(id: number, status: OrderStatus, courierName = '', trackingNumber = ''): Promise<Order> {
    const isDemo = this.isDemo();

    if (!navigator.onLine && !isDemo) {
      queueOfflineAction(
        `/orders/${id}`,
        'PATCH',
        { status, courier_name: courierName, tracking_number: trackingNumber },
        `Update Order #${id} to status ${status}`
      );
    }

    if (isDemo) {
      const orders = getStored<Order[]>(KEYS.ORDERS, INITIAL_ORDERS);
      const idx = orders.findIndex(o => o.id === id);
      if (idx !== -1) {
        orders[idx].status = status;
        if (status === 'shipped') {
          orders[idx].courier_name = courierName || "Courier Service";
          orders[idx].tracking_number = trackingNumber || "TRK123456789";
        } else {
          orders[idx].courier_name = courierName || orders[idx].courier_name;
          orders[idx].tracking_number = trackingNumber || orders[idx].tracking_number;
        }
        setStored(KEYS.ORDERS, orders);
        return orders[idx];
      }
      throw new Error("Order not found");
    }

    const body: any = { status };
    if (status === 'shipped' || courierName || trackingNumber) {
      body.courier_name = courierName;
      body.tracking_number = trackingNumber;
    }

    const res = await this.request<Order>(`/orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body)
    });

    if (res.success && res.data) {
      return res.data;
    }
    throw new Error(res.message || "Failed to update order status.");
  }

  // 4. Coupons Panel
  public static async getCoupons(): Promise<Coupon[]> {


    const res = await this.request<Coupon[]>('/coupons');
    if (res.success && res.data) {
      return res.data;
    }
    throw new Error("Failed to fetch data");
  }

  public static async saveCoupon(couponData: any, id?: number): Promise<Coupon> {
    const url = id ? `/coupons/${id}` : '/coupons';
    const method = id ? 'PUT' : 'POST';
    const res = await this.request<Coupon>(url, {
      method,
      body: JSON.stringify({
        ...couponData,
        code: String(couponData.code).toUpperCase()
      })
    });

    if (res.success && res.data) {
      return res.data;
    }
    throw new Error(res.message || "Failed to save coupon.");
  }

  public static async deleteCoupon(id: number): Promise<void> {
    const res = await this.request<any>(`/coupons/${id}`, { method: 'DELETE' });
    if (!res.success) throw new Error(res.message || "Failed to delete coupon.");
  }

  // 5. Theme Panel
  public static async getTheme(): Promise<ThemeResponse> {
    const res = await this.request<ThemeResponse>('/theme');
    if (res.success && res.data) {
      return res.data;
    }
    throw new Error("Failed to fetch theme settings.");
  }

  public static async updateTheme(themeData: any): Promise<ThemeResponse> {
    const fd = new FormData();
    Object.entries(themeData).forEach(([k, v]) => {
      if (v instanceof File) fd.append(k, v);
      else if (v !== null && v !== undefined) fd.append(k, String(v));
    });

    const res = await this.request<ThemeResponse>('/theme', {
      method: 'POST',
      body: fd
    }, true);

    if (res.success && res.data) {
      return res.data;
    }
    throw new Error(res.message || "Failed to update theme settings.");
  }

  // 6. Storefront Sections Panel
  public static async getSections(): Promise<{ sections: StorefrontSection[], products: Product[] }> {


    const res = await this.request<any>('/sections');
    if (res.success && res.data) {
      return {
        sections: res.data.sections || [],
        products: res.data.products || []
      };
    }
    return {
      sections: getStored<StorefrontSection[]>(KEYS.SECTIONS, INITIAL_SECTIONS),
      products: getStored<Product[]>(KEYS.PRODUCTS, INITIAL_PRODUCTS)
    };
  }

  public static async saveSection(sectionData: any, id?: number): Promise<StorefrontSection> {
    const url = id ? `/sections/${id}` : '/sections';
    const fd = new FormData();
    if (id) fd.append('_method', 'PUT');
    Object.entries(sectionData).forEach(([k, v]) => {
      if (v instanceof File) fd.append(k, v);
      else if (v !== null && v !== undefined) fd.append(k, String(v));
    });

    const res = await this.request<StorefrontSection>(url, {
      method: 'POST',
      body: fd
    }, true);

    if (res.success && res.data) {
      return res.data;
    }
    throw new Error(res.message || "Failed to save storefront section.");
  }

  public static async deleteSection(id: number): Promise<void> {
    const res = await this.request<any>(`/sections/${id}/toggle-active`, { method: 'PATCH' });
    if (!res.success) throw new Error(res.message || "Failed to toggle section.");
  }

  public static async toggleSectionActive(id: number): Promise<void> {
    return this.deleteSection(id);
  }

  public static async reorderSections(orderedIds: number[]): Promise<void> {
    const res = await this.request<any>('/sections/reorder', {
      method: 'POST',
      body: JSON.stringify({ ordered_ids: orderedIds })
    });
    if (!res.success) {
      throw new Error(res.message || "Failed to reorder sections");
    }
  }

  public static async getSettings(): Promise<SettingsResponse> {
    const res = await this.request<SettingsResponse>('/settings');
    let response: SettingsResponse;
    if (res.success && res.data) {
      response = res.data;
    } else {
      throw new Error(res.message || "Failed to load settings");
    }

    return {
      ...response,
      store_name: response.tenant.name,
      phone: response.tenant.whatsapp_number || '',
      support_email: '',
      support_phone: '',
      address: '',
      city: '',
      delivery_charge: response.tenant.delivery_charge || 0,
      bank_name: response.tenant.bank_name || '',
      account_title: response.tenant.account_title || '',
      account_number: response.tenant.account_number || '',
    };
  }

  public static async updateSettings(settingsData: any): Promise<SettingsResponse> {


    const res = await this.request<SettingsResponse>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settingsData)
    });

    if (res.success && res.data) {
      return res.data;
    }
    throw new Error(res.message || "Failed to update settings.");
  }

  public static async requestUnlock(unlockType: 'theme_change' | 'store_info_change', paymentProof: File, notes?: string): Promise<void> {
    const fd = new FormData();
    fd.append('unlock_type', unlockType);
    fd.append('payment_proof', paymentProof);
    if (notes) fd.append('notes', notes);
    const res = await this.request<any>('/settings/request-unlock', { method: 'POST', body: fd }, true);
    if (!res.success) throw new Error(res.message || "Failed to submit unlock request.");
  }

  // 8. Domain Panel
  public static async getDomain(): Promise<DomainResponse> {
    const res = await this.request<DomainResponse>('/domain');
    if (res.success && res.data) {
      return res.data;
    }
    throw new Error("Failed to fetch domain settings.");
  }

  public static async requestSubdomain(requestedValue: string): Promise<DomainResponse> {


    const res = await this.request<DomainResponse>('/domain/subdomain', {
      method: 'POST',
      body: JSON.stringify({ requested_value: requestedValue })
    });
    if (res.success && res.data) {
      return res.data;
    }
    throw new Error(res.message || "Failed to update subdomain.");
  }

  public static async requestCustomDomain(requestedValue: string, ownsDomain: boolean): Promise<DomainResponse> {
    const res = await this.request<any>('/domain/custom', {
      method: 'POST',
      body: JSON.stringify({ requested_value: requestedValue, merchant_owns_domain: ownsDomain ? 1 : 0 })
    });
    if (res.success) {
      // Re-fetch full domain data after submitting, since backend returns just the new request
      return await this.getDomain();
    }
    throw new Error(res.message || "Failed to submit custom domain request.");
  }

  public static async submitDomainPayment(requestId: string | number, proofImage: File): Promise<void> {
    const fd = new FormData();
    fd.append('domain_request_id', String(requestId));
    fd.append('proof_image', proofImage);
    const res = await this.request<any>('/domain/payment', { method: 'POST', body: fd }, true);
    if (!res.success) throw new Error(res.message || "Failed to upload payment proof.");
  }

  // 9. Staff Panel
  public static async getStaff(): Promise<StaffMember[]> {
    const res = await this.request<StaffMember[]>('/staff');
    if (res.success && res.data) {
      return res.data;
    }
    throw new Error("Failed to fetch staff list.");
  }

  public static async addStaff(staffData: any): Promise<StaffMember> {


    const res = await this.request<StaffMember>('/staff', {
      method: 'POST',
      body: JSON.stringify(staffData)
    });
    if (res.success && res.data) {
      return res.data;
    }
    throw new Error(res.message || "Failed to add staff member.");
  }

  public static async removeStaff(id: number): Promise<void> {
    const res = await this.request<any>(`/staff/${id}`, { method: 'DELETE' });
    if (!res.success) throw new Error(res.message || "Failed to remove staff member.");
  }

  // 10. Billing Panel
  public static async getBilling(): Promise<BillingResponse> {
    const isDemo = this.isDemo();
    if (isDemo) {
      return {
        plan: { name: 'Standard', price_monthly: 1500 },
        all_plans: [
          { name: 'Free (Basic)', price_monthly: 1000, features: [
            { key: 'product_limit', label: 'Product Listing Limit', value: '30' },
            { key: 'order_limit_monthly', label: 'Monthly Order Limit', value: '100' },
            { key: 'analytics_enabled', label: 'Analytics Dashboard', value: '0' },
            { key: 'customer_whatsapp_notifications', label: 'WhatsApp Notifications', value: '0' },
            { key: 'message_quota_monthly', label: 'WhatsApp Msg Quota/Month', value: '100' },
            { key: 'subdomain_allowed', label: 'Custom Subdomain', value: '0' },
            { key: 'custom_domain_allowed', label: 'Custom Domain Routing', value: '0' },
            { key: 'staff_logins_limit', label: 'Staff Login Accounts', value: '1' },
            { key: 'theme_change_allowed', label: 'Theme Switching', value: '0' },
            { key: 'theme_change_fee', label: 'One-Time Theme Change Fee', value: '500' },
          ]},
          { name: 'Growth', price_monthly: 2500, features: [
            { key: 'product_limit', label: 'Product Listing Limit', value: '150' },
            { key: 'order_limit_monthly', label: 'Monthly Order Limit', value: '500' },
            { key: 'analytics_enabled', label: 'Analytics Dashboard', value: '1' },
            { key: 'customer_whatsapp_notifications', label: 'WhatsApp Notifications', value: '1' },
            { key: 'message_quota_monthly', label: 'WhatsApp Msg Quota/Month', value: '1000' },
            { key: 'subdomain_allowed', label: 'Custom Subdomain', value: '1' },
            { key: 'custom_domain_allowed', label: 'Custom Domain Routing', value: '0' },
            { key: 'staff_logins_limit', label: 'Staff Login Accounts', value: '3' },
            { key: 'theme_change_allowed', label: 'Theme Switching', value: '1' },
            { key: 'theme_change_fee', label: 'One-Time Theme Change Fee', value: '0' },
          ]},
          { name: 'Enterprise', price_monthly: 6000, features: [
            { key: 'product_limit', label: 'Product Listing Limit', value: '0' },
            { key: 'order_limit_monthly', label: 'Monthly Order Limit', value: '0' },
            { key: 'analytics_enabled', label: 'Analytics Dashboard', value: '1' },
            { key: 'customer_whatsapp_notifications', label: 'WhatsApp Notifications', value: '1' },
            { key: 'message_quota_monthly', label: 'WhatsApp Msg Quota/Month', value: '5000' },
            { key: 'subdomain_allowed', label: 'Custom Subdomain', value: '1' },
            { key: 'custom_domain_allowed', label: 'Custom Domain Routing', value: '1' },
            { key: 'staff_logins_limit', label: 'Staff Login Accounts', value: '10' },
            { key: 'theme_change_allowed', label: 'Theme Switching', value: '1' },
            { key: 'theme_change_fee', label: 'One-Time Theme Change Fee', value: '0' },
          ]},
        ],
        billing: {
          quota_limit: 1000,
          messages_sent: 850,
          overage_count: 0,
          overage_price: 1.5,
          overage_cost: 0,
          usage_pct: 85,
          period_start: new Date(new Date().setDate(1)).toISOString(),
          period_end: new Date(new Date().setMonth(new Date().getMonth() + 1, 0)).toISOString(),
          plan_price_monthly: 1500,
          renewal_total: 1500,
          subscription_status: 'active',
          subscription_expires_at: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
        },
        stats: {
          total_orders: 145,
          pending_orders: 12,
          total_revenue: 1250000,
        }
      };
    }

    const res = await this.request<BillingResponse>('/billing');
    if (res.success && res.data) {
      return res.data;
    }
    throw new Error("Failed to fetch billing details.");
  }

  public static async submitPlanPayment(planId: number, proofFile: File): Promise<void> {
    const isDemo = this.isDemo();
    if (isDemo) return;

    const fd = new FormData();
    fd.append('plan_id', planId.toString());
    fd.append('payment_proof', proofFile);

    const res = await this.request<any>('/billing/payment', {
      method: 'POST',
      body: fd,
    });
    if (!res.success) throw new Error(res.message || "Failed to submit payment.");
  }

  // Sync Offline Queue when back online
  public static async syncOfflineData(): Promise<number> {
    const queue = getOfflineQueue();
    if (queue.length === 0) return 0;

    let syncCount = 0;
    const remaining: OfflineRequest[] = [];

    for (const req of queue) {
      try {
        console.log(`Syncing cached item: ${req.label}`);
        const response = await fetch(`${API_BASE}${req.url}`, {
          method: req.method,
          headers: this.getHeaders(req.body instanceof FormData),
          body: req.body instanceof FormData ? req.body : JSON.stringify(req.body)
        });

        if (response.ok) {
          syncCount++;
        } else {
          remaining.push(req);
        }
      } catch (e) {
        remaining.push(req);
      }
    }

    saveOfflineQueue(remaining);
    return syncCount;
  }

  // ALIASES & COMPATIBILITY HELPERS FOR SUBVIEWS
  public static async getProfile(): Promise<User> {
    return this.getMe();
  }

  public static enableDemoMode(val: boolean): void {
    this.setDemo(val);
  }

  public static async checkSubdomainAvailability(subdomain: string): Promise<boolean> {

    const res = await this.request<{ available: boolean }>(`/domain/check-availability?subdomain=${subdomain}`);
    if (res.success && res.data) {
      return res.data.available;
    }
    return true;
  }

  public static async saveDomain(type: 'subdomain' | 'custom_domain', value: string): Promise<DomainResponse> {
    if (type === 'subdomain') {
      return this.requestSubdomain(value);
    } else {
      return this.requestCustomDomain(value, true);
    }
  }

  public static async submitPaymentProof(unlockType: 'theme_change' | 'store_info_change', paymentProof: File, notes?: string): Promise<void> {
    return this.requestUnlock(unlockType, paymentProof, notes);
  }

  public static async deleteStaff(id: number): Promise<void> {
    return this.removeStaff(id);
  }

  public static async saveStaff(payload: any, id?: number): Promise<StaffMember> {
    if (id) {

      const res = await this.request<StaffMember>(`/staff/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      if (res.success && res.data) {
        return res.data;
      }
      throw new Error(res.message || "Failed to update staff member.");
    } else {
      return this.addStaff(payload);
    }
  }
  // =========================================================================
  // COMMUNITY POSTS & DISCOVER (PUBLIC)
  // =========================================================================

  public static async getCommunityPosts(page: number = 1, perPage: number = 15): Promise<MerchantCommunityPost[]> {
    const res = await this.request<any>(`/public/community-posts?page=${page}&per_page=${perPage}`);
    return res.data.data;
  }

  public static async createCommunityPost(formData: FormData): Promise<any> {
    return this.request<any>('/public/community-posts', {
      method: 'POST',
      body: formData,
    });
  }

  public static async likeCommunityPost(id: number): Promise<{ likes_count: number; liked: boolean }> {
    const res = await this.request<any>(`/public/community-posts/${id}/like`, { method: 'POST' });
    return res;
  }

  public static async getDiscoverProducts(): Promise<DiscoverProduct[]> {
    const res = await this.request<any>('/public/discover-products');
    return res.data;
  }

  // =========================================================================
  // WHATSAPP OTP – PASSWORD RESET
  // =========================================================================

  public static async sendPasswordResetOtp(phone: string): Promise<any> {
    return this.request<any>('/password/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }

  public static async verifyPasswordResetOtp(phone: string, otp: string): Promise<{ reset_token: string }> {
    const res = await this.request<any>('/password/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp }),
    });
    return res.data;
  }

  public static async resetPasswordWithOtp(reset_token: string, new_password: string): Promise<any> {
    return this.request<any>('/password/reset', {
      method: 'POST',
      body: JSON.stringify({ reset_token, new_password }),
    });
  }

  public static async changePassword(current_password: string, new_password: string): Promise<any> {
    return this.request<any>('/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password, new_password }),
    });
  }

  // =========================================================================
  // WHATSAPP OTP – REGISTRATION VERIFICATION
  // =========================================================================

  public static async sendRegistrationOtp(whatsapp_number: string): Promise<any> {
    return this.request<any>('/register/send-otp', {
      method: 'POST',
      body: JSON.stringify({ whatsapp_number }),
    });
  }

  public static async verifyRegistrationOtp(whatsapp_number: string, otp: string): Promise<any> {
    return this.request<any>('/register/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ whatsapp_number, otp }),
    });
  }
}

