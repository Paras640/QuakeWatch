"""
QuakeWatch India - Real-Time Seismic Analytics & Early Information
-----------------------------------------------------------------
Framework: Flask + Pandas + Requests
UI: Microsoft Fluent Design System 2 (Dark & Light Mode, Mica & Acrylic Effects)
Data Source: USGS Earthquake Hazards Program (Live FDSN GeoJSON stream)

Routes:
  /          -> Home Page (Overview, Bento Grid, Seismic Zones, Safety)
  /tracker   -> Main Page (Live Earthquake Tracker with Leaflet Map, Metrics, Data Table, CSV Export)
  /main      -> Alias to /tracker
  /about     -> About Page (System Architecture, Tech Stack, Pandas Pipeline, Emergency Contacts)
  /api/data  -> REST API endpoint returning cleaned and aggregated earthquake data
"""

import math
import os
import random
from datetime import datetime, timedelta, timezone

import pandas as pd
import requests
from flask import Flask, jsonify, render_template, request

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(
    __name__,
    template_folder=os.path.join(BASE_DIR, "templates"),
    static_folder=os.path.join(BASE_DIR, "static"),
)

USGS_URL = "https://earthquake.usgs.gov/fdsnws/event/1/query"

# Indian cities: name -> (latitude, longitude, seismic_zone)
CITIES = {
    "Agartala": (23.83, 91.28), "Agra": (27.18, 78.02), "Ahmedabad": (23.02, 72.57),
    "Aizawl": (23.73, 92.72), "Ajmer": (26.45, 74.64), "Amritsar": (31.63, 74.87),
    "Aurangabad": (19.88, 75.34), "Belagavi": (15.85, 74.50), "Bengaluru": (12.97, 77.59),
    "Bhopal": (23.26, 77.41), "Bhubaneswar": (20.30, 85.82), "Bhuj": (23.25, 69.67),
    "Bikaner": (28.02, 73.31), "Chandigarh": (30.73, 76.78), "Chennai": (13.08, 80.27),
    "Coimbatore": (11.02, 76.96), "Cuttack": (20.46, 85.88), "Daman": (20.42, 72.83),
    "Dehradun": (30.32, 78.03), "Delhi": (28.61, 77.21), "Dibrugarh": (27.48, 94.91),
    "Faridabad": (28.41, 77.31), "Gangtok": (27.33, 88.61), "Ghaziabad": (28.67, 77.45),
    "Gorakhpur": (26.76, 83.37), "Guwahati": (26.14, 91.74), "Gurugram": (28.46, 77.03),
    "Gwalior": (26.22, 78.18), "Haridwar": (29.95, 78.16), "Hubballi": (15.36, 75.12),
    "Hyderabad": (17.39, 78.49), "Imphal": (24.82, 93.94), "Indore": (22.72, 75.86),
    "Itanagar": (27.08, 93.61), "Jabalpur": (23.18, 79.99), "Jaipur": (26.91, 75.79),
    "Jalandhar": (31.33, 75.58), "Jammu": (32.73, 74.87), "Jamshedpur": (22.80, 86.20),
    "Jodhpur": (26.24, 73.02), "Kanpur": (26.45, 80.35), "Kavaratti": (10.57, 72.64),
    "Kochi": (9.93, 76.27), "Kohima": (25.67, 94.11), "Kolhapur": (16.70, 74.24),
    "Kolkata": (22.57, 88.36), "Kota": (25.21, 75.86), "Leh": (34.15, 77.58),
    "Lucknow": (26.85, 80.95), "Ludhiana": (30.90, 75.86), "Madurai": (9.92, 78.12),
    "Mangaluru": (12.91, 74.86), "Meerut": (28.98, 77.71), "Mumbai": (19.08, 72.88),
    "Mysuru": (12.30, 76.64), "Nagpur": (21.15, 79.09), "Nashik": (19.99, 73.79),
    "Noida": (28.54, 77.39), "Panaji": (15.50, 73.83), "Patna": (25.59, 85.14),
    "Pondicherry": (11.94, 79.81), "Port Blair": (11.62, 92.73), "Prayagraj": (25.44, 81.85),
    "Pune": (18.52, 73.86), "Raipur": (21.25, 81.63), "Rajkot": (22.30, 70.80),
    "Ranchi": (23.34, 85.31), "Salem": (11.66, 78.15), "Shillong": (25.58, 91.89),
    "Shimla": (31.10, 77.17), "Silchar": (24.83, 92.78), "Siliguri": (26.73, 88.40),
    "Silvassa": (20.27, 73.01), "Srinagar": (34.08, 74.80), "Surat": (21.17, 72.83),
    "Thiruvananthapuram": (8.52, 76.94), "Tiruchirappalli": (10.79, 78.70),
    "Tirupati": (13.63, 79.42), "Udaipur": (24.59, 73.71), "Vadodara": (22.31, 73.18),
    "Varanasi": (25.32, 82.97), "Vijayawada": (16.51, 80.65), "Visakhapatnam": (17.69, 83.22),
    "Warangal": (17.97, 79.59),
}

STATE_CITIES = {
    "Andhra Pradesh": ("Tirupati", "Vijayawada", "Visakhapatnam"),
    "Arunachal Pradesh": ("Itanagar",),
    "Assam": ("Dibrugarh", "Guwahati", "Silchar"),
    "Bihar": ("Patna",),
    "Chhattisgarh": ("Raipur",),
    "Goa": ("Panaji",),
    "Gujarat": ("Ahmedabad", "Bhuj", "Rajkot", "Surat", "Vadodara"),
    "Haryana": ("Faridabad", "Gurugram"),
    "Himachal Pradesh": ("Shimla",),
    "Jharkhand": ("Jamshedpur", "Ranchi"),
    "Karnataka": ("Belagavi", "Bengaluru", "Hubballi", "Mangaluru", "Mysuru"),
    "Kerala": ("Kochi", "Thiruvananthapuram"),
    "Madhya Pradesh": ("Bhopal", "Gwalior", "Indore", "Jabalpur"),
    "Maharashtra": ("Aurangabad", "Kolhapur", "Mumbai", "Nagpur", "Nashik", "Pune"),
    "Manipur": ("Imphal",),
    "Meghalaya": ("Shillong",),
    "Mizoram": ("Aizawl",),
    "Nagaland": ("Kohima",),
    "Odisha": ("Bhubaneswar", "Cuttack"),
    "Punjab": ("Amritsar", "Jalandhar", "Ludhiana"),
    "Rajasthan": ("Ajmer", "Bikaner", "Jaipur", "Jodhpur", "Kota", "Udaipur"),
    "Sikkim": ("Gangtok",),
    "Tamil Nadu": ("Chennai", "Coimbatore", "Madurai", "Salem", "Tiruchirappalli"),
    "Telangana": ("Hyderabad", "Warangal"),
    "Tripura": ("Agartala",),
    "Uttar Pradesh": ("Agra", "Ghaziabad", "Gorakhpur", "Kanpur", "Lucknow", "Meerut", "Noida", "Prayagraj", "Varanasi"),
    "Uttarakhand": ("Dehradun", "Haridwar"),
    "West Bengal": ("Kolkata", "Siliguri"),
    "Andaman and Nicobar Islands": ("Port Blair",),
    "Chandigarh": ("Chandigarh",),
    "Dadra and Nagar Haveli and Daman and Diu": ("Daman", "Silvassa"),
    "Delhi": ("Delhi",),
    "Jammu and Kashmir": ("Jammu", "Srinagar"),
    "Ladakh": ("Leh",),
    "Lakshadweep": ("Kavaratti",),
    "Puducherry": ("Pondicherry",),
}

STATE_PRIMARY_CITY = {
    "Andaman and Nicobar Islands": "Port Blair",
    "Andhra Pradesh": "Vijayawada",
    "Arunachal Pradesh": "Itanagar",
    "Assam": "Guwahati",
    "Bihar": "Patna",
    "Chandigarh": "Chandigarh",
    "Chhattisgarh": "Raipur",
    "Dadra and Nagar Haveli and Daman and Diu": "Daman",
    "Delhi": "Delhi",
    "Goa": "Panaji",
    "Gujarat": "Ahmedabad",
    "Haryana": "Gurugram",
    "Himachal Pradesh": "Shimla",
    "Jammu and Kashmir": "Srinagar",
    "Jharkhand": "Ranchi",
    "Karnataka": "Bengaluru",
    "Kerala": "Kochi",
    "Ladakh": "Leh",
    "Lakshadweep": "Kavaratti",
    "Madhya Pradesh": "Bhopal",
    "Maharashtra": "Mumbai",
    "Manipur": "Imphal",
    "Meghalaya": "Shillong",
    "Mizoram": "Aizawl",
    "Nagaland": "Kohima",
    "Odisha": "Bhubaneswar",
    "Puducherry": "Pondicherry",
    "Punjab": "Ludhiana",
    "Rajasthan": "Jaipur",
    "Sikkim": "Gangtok",
    "Tamil Nadu": "Chennai",
    "Telangana": "Hyderabad",
    "Tripura": "Agartala",
    "Uttar Pradesh": "Lucknow",
    "Uttarakhand": "Dehradun",
    "West Bengal": "Kolkata",
}

CITY_STATE = {
    city: state
    for state, cities in STATE_CITIES.items()
    for city in cities
}
CITY_LOOKUP = {name.lower(): name for name in CITIES}
STATE_LOOKUP = {name.lower(): name for name in STATE_PRIMARY_CITY}


# STEP 1: Fetch live data from USGS
def fetch(city, radius_km, days, min_mag):
    lat, lon = CITIES[city]
    now = datetime.now(timezone.utc)

    params = {
        "format": "geojson",
        "starttime": (now - timedelta(days=days)).strftime("%Y-%m-%dT%H:%M:%S"),
        "endtime": now.strftime("%Y-%m-%dT%H:%M:%S"),
        "latitude": lat,
        "longitude": lon,
        "maxradiuskm": radius_km,
        "minmagnitude": min_mag,
        "orderby": "time",
        "limit": 500,
    }
    r = requests.get(USGS_URL, params=params, timeout=12)
    r.raise_for_status()

    rows = []
    for item in r.json().get("features", []):
        p = item.get("properties", {})
        geom = item.get("geometry", {})
        coords = geom.get("coordinates", [lon, lat, 10])
        rows.append({
            "time": p.get("time"),
            "mag": p.get("mag"),
            "place": p.get("place", f"Near {city}"),
            "depth": coords[2] if len(coords) > 2 else 10,
            "latitude": coords[1] if len(coords) > 1 else lat,
            "longitude": coords[0] if len(coords) > 0 else lon,
        })
    return pd.DataFrame(rows, columns=["time", "mag", "place", "depth", "latitude", "longitude"])


# STEP 1B: Fallback simulated telemetry (resilient offline operation)
def generate_fallback_telemetry(city, radius_km, days, min_mag):
    lat, lon = CITIES[city]
    now = datetime.now(timezone.utc)

    # Deterministic seed based on city name for stable realistic preview
    rng = random.Random(sum(ord(c) for c in city) + int(days) + int(radius_km))
    count = rng.randint(4, 18)

    regional_descriptions = [
        f"{rng.randint(25, int(radius_km))} km NNE of {city}",
        f"{rng.randint(30, int(radius_km))} km SSW of {city}",
        f"{rng.randint(15, int(radius_km))} km E of {city} region",
        f"Himalayan Foothills region near {city}",
        f"Indo-Gangetic Basin boundary near {city}",
        f"{rng.randint(20, int(radius_km))} km NW of {city}",
        f"Regional Fault Line, {city} Sector",
    ]

    rows = []
    for i in range(count):
        event_time = now - timedelta(days=rng.uniform(0.1, float(days)))
        mag = round(rng.uniform(max(float(min_mag), 2.2), 5.4), 1)
        depth = round(rng.uniform(8.0, 75.0), 1)
        
        # Jitter coordinates around the city
        d_lat = rng.uniform(-radius_km / 120.0, radius_km / 120.0)
        d_lon = rng.uniform(-radius_km / 120.0, radius_km / 120.0)
        
        rows.append({
            "time": int(event_time.timestamp() * 1000),
            "mag": mag,
            "place": rng.choice(regional_descriptions),
            "depth": depth,
            "latitude": lat + d_lat,
            "longitude": lon + d_lon,
        })

    return pd.DataFrame(rows, columns=["time", "mag", "place", "depth", "latitude", "longitude"])


# STEP 2: Clean with Pandas
def clean(df):
    if df.empty:
        return df
    df = df.dropna(subset=["mag"]).copy()
    df["time"] = pd.to_datetime(df["time"], unit="ms", utc=True)
    df["depth"] = df["depth"].clip(lower=0)
    return df.sort_values("time", ascending=False)


# STEP 3: Analyse with Pandas
def analyse(df):
    if len(df) == 0:
        return {"total": 0, "strongest": 0, "avg_depth": 0, "latest": []}

    latest = [
        {
            "time": r.time.tz_convert("Asia/Kolkata").strftime("%d %b %Y, %I:%M %p"),
            "raw_time": r.time.isoformat(),
            "mag": round(float(r.mag), 1),
            "depth": round(float(r.depth)),
            "place": r.place,
            "latitude": round(float(r.latitude), 2),
            "longitude": round(float(r.longitude), 2),
        }
        for r in df.head(50).itertuples()
    ]
    return {
        "total": len(df),
        "strongest": round(float(df["mag"].max()), 1),
        "avg_depth": round(float(df["depth"].mean())),
        "latest": latest,
    }


# STEP 4: Application Routes

@app.route("/")
def home():
    """Home Page - Showcase, Bento grid, quick jump & seismic zones."""
    return render_template("home.html", active_page="home", cities=sorted(CITIES))


@app.route("/tracker")
@app.route("/main")
def tracker():
    """Main Page - Live Earthquake Tracker Dashboard."""
    requested = request.args.get("state", request.args.get("city", "Delhi")).strip().lower()
    if requested in STATE_LOOKUP:
        initial_state = STATE_LOOKUP[requested]
    elif requested in CITY_LOOKUP:
        city_name = CITY_LOOKUP[requested]
        initial_state = CITY_STATE.get(city_name, "Delhi")
    else:
        initial_state = "Delhi"

    return render_template(
        "tracker.html",
        active_page="tracker",
        states=sorted(STATE_PRIMARY_CITY),
        initial_state=initial_state,
    )


@app.route("/about")
def about():
    """About Page - Architecture, tech stack, and practical notes."""
    return render_template("about.html", active_page="about")


@app.route("/api/data")
def api_data():
    """REST API endpoint returning cleaned seismic data for the given state or city."""
    raw_query = request.args.get("state", request.args.get("city", "Delhi")).strip().lower()
    
    if raw_query in STATE_LOOKUP:
        state_name = STATE_LOOKUP[raw_query]
        city = STATE_PRIMARY_CITY[state_name]
        display_name = state_name
    elif raw_query in CITY_LOOKUP:
        city = CITY_LOOKUP[raw_query]
        display_name = CITY_STATE.get(city, city)
    else:
        return jsonify(error="Location not found in database. Please select a State or UT."), 400

    try:
        radius = int(request.args.get("radius", 300))
        days = int(request.args.get("days", 30))
        min_mag = float(request.args.get("min_mag", 2.5))
    except ValueError:
        return jsonify(error="Invalid numerical parameters for radius, days, or min_mag."), 400

    is_fallback = False
    try:
        df = clean(fetch(city, radius, days, min_mag))
    except requests.RequestException:
        # Graceful fallback to simulated realistic telemetry if USGS is unreachable or offline
        df = clean(generate_fallback_telemetry(city, radius, days, min_mag))
        is_fallback = True

    lat, lon = CITIES[city]
    result = analyse(df)
    result["city"] = city
    result["state"] = display_name
    result["location"] = display_name
    result["lat"] = lat
    result["lon"] = lon
    result["is_fallback"] = is_fallback
    result["checked_at"] = datetime.now().strftime("%I:%M:%S %p")
    return jsonify(result)


@app.route("/api/cities")
def api_cities():
    """Returns all supported cities with coordinates."""
    data = [{"name": name, "lat": coords[0], "lon": coords[1]} for name, coords in sorted(CITIES.items())]
    return jsonify(cities=data)


if __name__ == "__main__":
    print("\n=======================================================")
    print("  QuakeWatch India - Fluent 2 Web Application")
    print("  Running at: http://127.0.0.1:5000")
    print("  Pages:")
    print("    - Home:    http://127.0.0.1:5000/")
    print("    - Tracker: http://127.0.0.1:5000/tracker")
    print("    - About:   http://127.0.0.1:5000/about")
    print("=======================================================\n")
    app.run(debug=True)
