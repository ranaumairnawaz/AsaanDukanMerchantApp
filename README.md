# 📱 AsaanDukan Merchant Portal — Progressive Web App (PWA)

<p align="center">
  <img src="https://img.shields.io/badge/React-19.x-61DAFB?style=for-the-badge&logo=react" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-6.x-646CFF?style=for-the-badge&logo=vite" alt="Vite">
  <img src="https://img.shields.io/badge/PWA-Enabled-orange?style=for-the-badge&logo=pwa" alt="PWA Ready">
  <img src="https://img.shields.io/badge/TailwindCSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss" alt="TailwindCSS 4">
</p>

---

## 📖 What is AsaanDukan Merchant Portal?

**AsaanDukan Merchant Portal** is a high-performance **React 19 & TypeScript Progressive Web Application (PWA)** engineered specifically for store owners running their businesses on the AsaanDukan multi-tenant e-commerce ecosystem.

It functions as an agile mobile and desktop command center, enabling merchants to track revenue metrics, manage product inventory, fulfill orders, review customer interactions, and generate AI-driven catalog descriptions on the fly.

---

## 🎯 Why AsaanDukan Merchant Portal? Problem & Solution

| The Challenge | How This Portal Solves It |
| :--- | :--- |
| **Clunky Desktop-Only Admin Panels:** Traditional e-commerce admin panels are heavy and tedious to use on mobile devices while managing warehouse inventory. | Engineered as an installable **Progressive Web App (PWA)** that runs smoothly on smartphones, tablets, and desktops with offline service workers. |
| **Slow Product Description Authoring:** Creating compelling, SEO-friendly descriptions for hundreds of items takes hours of manual effort. | Integrated with **Google Gemini AI (`@google/genai`)** to generate professional marketing copy, titles, and tags automatically. |
| **Complex Order Tracking:** Merchants need instant visibility over new, processing, and delivered orders without navigating through multi-layer menus. | Features real-time state management, interactive Kanban-style status filters, and instant status updates. |

---

## 🌟 Key Features

### 📊 Real-Time Merchant Dashboard
- **Financial Analytics & Metrics:** Interactive revenue trends, average order value (AOV), total unit sales, and conversion rate charts powered by **Recharts**.
- **Recent Order Activity:** Instant notifications and list of latest incoming customer orders with fulfillment status badges.

### 📦 Smart Inventory & Catalog Suite
- **Product Management:** Create, edit, and categorize products with SKU tracking, stock level warnings, pricing, and image uploads.
- **AI Product Copywriting:** One-click integration with Google GenAI for instant product description generation and SEO optimization.
- **Stock & Variant Control:** Manage variant options (sizes, colors) and monitor stock counts with threshold alerts.

### 🚚 Order Lifecycle & Fulfillment
- **Fulfillment Pipeline:** Process incoming orders through Pending, Confirmed, Shipped, and Delivered milestones.
- **Customer Insights:** View customer purchase history, delivery addresses, and customer notes.

### 📲 Mobile-First PWA Experience
- **Home Screen Installable:** Install on iOS and Android devices directly from the browser as a standalone app.
- **Fluid Micro-Interactions:** Smooth page animations and card gestures implemented using **Framer Motion (`motion`)**.

---

## 🛠️ Technical Stack

- **UI Library:** React 19.x (Functional Components & Hooks)
- **Language:** TypeScript 5.8 (Strict Type Safety)
- **Bundler & Dev Server:** Vite 6.x
- **Styling:** TailwindCSS v4 with `@tailwindcss/vite`
- **Charts & Visualization:** Recharts
- **Icons:** Lucide React
- **Animations:** Framer Motion (`motion`)
- **AI Integration:** Google Gemini AI SDK (`@google/genai`)
- **PWA Tooling:** `vite-plugin-pwa`

---

## 🚀 Local Development & Setup

### 1. Prerequisites
- Node.js 18.x or 20+
- NPM or PNPM

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/ranaumairnawaz/AsaanDukanMerchantApp.git
cd AsaanDukanMerchantApp

# Install packages
npm install
```

### 3. Environment Variables
Create a `.env` file in the project root:
```env
VITE_API_BASE_URL=https://your-asaandukan-backend.com/api
VITE_GEMINI_API_KEY=your_google_gemini_api_key_here
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Production Build
```bash
npm run build
npm run preview
```

---

## 👨‍💻 Author
**Rana Umair Nawaz**  
- [GitHub Profile](https://github.com/ranaumairnawaz)  
- [LinkedIn Profile](https://linkedin.com/in/ranaumairnawaz)
