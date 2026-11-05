# QuakeWatch India 🌐⚡
> **Real-Time Seismic Analytics & Early Information System**  
> Powered by Python, Flask, Pandas, and the USGS Earthquake Hazards Program. Built with Microsoft Fluent 2 Design System (Mica & Acrylic aesthetics, Adaptive Dark Mode, and Motion Animations).


## 🌟 Key Features

- **Live USGS Telemetry**: Queries the global FDSN web services API with dynamic radius and magnitude filters.
- **Pandas Analytical Pipeline**: Cleans missing records, handles coordinate bounds, converts timestamps to Indian Standard Time (IST), and calculates statistical summaries.
- **Fluent 2 Design System**:
  - Windows 11 Mica & Acrylic glassmorphic aesthetics (`backdrop-filter`).
  - Adaptive Dark Mode & Light Mode with zero-flicker launch and `localStorage` memory.
  - Fluent Motion animations: Staggered entrance transitions, radar pulse epicenter rings, number count-ups, and interactive micro-animations.
- **Interactive Geospatial Map**: Leaflet.js mapping with color-coded Richter magnitude markers and adaptive Light/Dark CartoDB tiles.
- **Complete 3-Page Flow**:
  - `/` &mdash; **Home Page** (Hero showcase, Bento feature grid, Emergency safety guidelines).
  - `/tracker` &mdash; **Live Tracker (Main)** (Interactive State/UT selector, live 60s auto-refresh, 4 metric cards, Leaflet map, searchable data table, and one-click CSV export).
  - `/about` &mdash; **About Page** (System architecture, tech stack breakdown, Indian tectonic settings, and safety protocols).
- **Fully Mobile-Optimized**: Responsive touch targets (44px+ HIG compliant), compact mobile navigation, and single-column form reflow.







## 📡 REST API Reference

### 1. Seismic Data Query
- **Endpoint**: `/api/data`
- **Method**: `GET`
- **Query Parameters**:
  - `state` (string, optional): State or Union Territory name (e.g., `Maharashtra`, `Delhi`, `Assam`, `Gujarat`).
  - `radius` (int, default: `300`): Radial perimeter distance in km.
  - `days` (int, default: `30`): Historical time window in days.
  - `min_mag` (float, default: `2.5`): Minimum Richter magnitude filter.
- **Sample Request**:
  ```http
  GET /api/data?state=Delhi&radius=300&days=30&min_mag=2.5
  

### 2. Supported Cities List
- **Endpoint**: `/api/cities`
- **Method**: `GET`
- Returns a list of all Indian cities with pre-mapped coordinates.

