# QuakeWatch India 🌐⚡
> **Real-Time Seismic Analytics & Early Information System**  
> Powered by Python, Flask, Pandas, and the USGS Earthquake Hazards Program. Built with Microsoft Fluent 2 Design System (Mica & Acrylic aesthetics, Adaptive Dark Mode, and Motion Animations).

---

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

---

## 🚀 Quick Start (Local Run)

### 1. Clone or Open the Project Directory
```powershell
cd "c:\Users\Paras\OneDrive\Attachments\Desktop\PHEONIX FOR DESKTOP\PYTHON PROGRAMMING\PRACTICALS\PRCTICAL 10"
```

### 2. Install Dependencies
```powershell
pip install -r requirements.txt
```

### 3. Run the Application
```powershell
python wsgi.py
# or: python app.py
```

Open your browser at **`http://127.0.0.1:5000`**

---

## 🐳 Docker Deployment

Build and run anywhere using the production Docker container:

```bash
# Build the Docker image
docker build -t quakewatch-india .

# Run container on port 5000
docker run -d -p 5000:5000 --name quakewatch quakewatch-india
```

Visit `http://localhost:5000` in your browser.

---

## ☁️ Cloud Deployment Options

### Option A: Render.com (Recommended Free Cloud Hosting)
1. Push your repository to GitHub or GitLab.
2. Sign in to [Render](https://render.com) and click **New > Blueprint**.
3. Connect your repository &mdash; Render will automatically detect [`render.yaml`](./render.yaml).
4. Click **Apply**. Your app will build and deploy on a live `.onrender.com` URL!

### Option B: Railway.app
1. Sign in to [Railway.app](https://railway.app).
2. Click **New Project > Deploy from GitHub repo**.
3. Select this repository &mdash; Railway will automatically detect [`railway.json`](./railway.json) and [`Procfile`](./Procfile).
4. Deploy with zero configuration.

### Option C: Heroku
```bash
heroku create quakewatch-india
git push heroku main
heroku open
```

### Option D: Google Cloud Run (Serverless Container)
```bash
gcloud builds submit --tag gcr.io/[PROJECT_ID]/quakewatch-india
gcloud run deploy quakewatch-india --image gcr.io/[PROJECT_ID]/quakewatch-india --platform managed --allow-unauthenticated
```

---

## 📂 Project Architecture

```
PRCTICAL 10/
├── app.py              # Flask backend, Pandas analytics, and USGS telemetry
├── wsgi.py             # WSGI entrypoint for Gunicorn production servers
├── requirements.txt    # Production Python dependencies
├── Dockerfile          # Multi-stage production container
├── .dockerignore       # Excludes unnecessary files from Docker context
├── Procfile            # Deployment command for Heroku/Render/Railway
├── render.yaml         # Render Blueprint deployment manifest
├── railway.json        # Railway deployment configuration
├── .env.example        # Environment variable sample
├── run.bat             # Windows one-click launcher
├── run.sh              # Linux/macOS launcher
├── static/
│   ├── css/
│   │   └── fluent.css  # Microsoft Fluent 2 CSS system, Mica styles & animations
│   └── js/
│       ├── theme.js    # Zero-flash dark/light mode toggle with persistence
│       └── tracker.js  # Live tracker logic, count-up animations, Leaflet map & CSV export
└── templates/
    ├── base.html       # Master Fluent layout, navigation bar, and footer
    ├── home.html       # Landing page with hero, Bento grid & safety protocols
    ├── tracker.html    # Live earthquake monitoring dashboard
    └── about.html      # System architecture, tech stack & tectonic reference
```

---

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
  ```

### 2. Supported Cities List
- **Endpoint**: `/api/cities`
- **Method**: `GET`
- Returns a list of all Indian cities with pre-mapped coordinates.

