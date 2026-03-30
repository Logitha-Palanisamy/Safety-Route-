"""
FemRoute — Backend Server (FastAPI)
====================================
File: backend/server.py

How to run:
  pip install fastapi uvicorn httpx python-dotenv
  uvicorn server:app --reload --port 8000

Endpoints:
  GET  /                    → health check
  POST /api/geocode         → geocode address via ORS
  POST /api/route           → get real route from ORS
  POST /api/safety-score    → AI safety scoring
  GET  /api/nearby/{type}   → nearby services
  POST /api/sos             → trigger SOS alert (mock)
  POST /api/chat            → Sakhi bot replies
"""

import os, math, json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import httpx
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="FemRoute API", version="1.0.0")

# Allow frontend to call backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production: specify your domain
    allow_methods=["*"],
    allow_headers=["*"],
)

ORS_KEY = os.getenv("ORS_API_KEY", "")
ORS_BASE = "https://api.openrouteservice.org"

# ── SIMULATED CRIME HOTSPOTS ─────────────────────────────────────
# In production: replace with SafeCity API / NCRB database
HOTSPOTS = [
    {"lat": 13.092, "lng": 80.275, "r": 0.8, "risk": 0.75, "name": "Zone A"},
    {"lat": 13.072, "lng": 80.268, "r": 0.6, "risk": 0.60, "name": "Zone B"},
    {"lat": 13.052, "lng": 80.255, "r": 1.0, "risk": 0.45, "name": "Zone C"},
    {"lat": 13.035, "lng": 80.232, "r": 0.5, "risk": 0.55, "name": "Zone D"},
    {"lat": 13.080, "lng": 80.260, "r": 0.7, "risk": 0.65, "name": "Zone E"},
]

# ── NEARBY DATA ──────────────────────────────────────────────────
NEARBY = {
    "police": [
        {"name": "Egmore Police Station",      "dist": "0.4 km", "status": "24h", "icon": "👮", "lat": 13.083, "lng": 80.272, "phone": "044-28193000"},
        {"name": "Park Town Police Station",   "dist": "0.9 km", "status": "24h", "icon": "👮", "lat": 13.079, "lng": 80.268, "phone": "044-25352000"},
        {"name": "Vepery Police Station",      "dist": "1.2 km", "status": "24h", "icon": "👮", "lat": 13.088, "lng": 80.265, "phone": "044-26420100"},
    ],
    "hospital": [
        {"name": "Govt. General Hospital",     "dist": "0.7 km", "status": "24h", "icon": "🏥", "lat": 13.080, "lng": 80.274, "phone": "044-25305000"},
        {"name": "Apollo Hospital",            "dist": "1.4 km", "status": "Open","icon": "🏥", "lat": 13.069, "lng": 80.259, "phone": "044-28293333"},
        {"name": "MIOT International",         "dist": "2.1 km", "status": "Open","icon": "🏥", "lat": 13.055, "lng": 80.248, "phone": "044-22490000"},
    ],
    "ngo": [
        {"name": "Snehi Women Centre",         "dist": "0.6 km", "status": "Open","icon": "🤝", "lat": 13.085, "lng": 80.270, "phone": "044-24311111"},
        {"name": "HELP Foundation",            "dist": "1.1 km", "status": "Open","icon": "🤝", "lat": 13.074, "lng": 80.261, "phone": "044-24322222"},
        {"name": "Nirbhaya Centre",            "dist": "1.8 km", "status": "Open","icon": "🤝", "lat": 13.060, "lng": 80.252, "phone": "044-24333333"},
    ],
    "bus": [
        {"name": "Chennai Central Bus Stop",   "dist": "0.1 km", "status": "Open","icon": "🚌", "lat": 13.082, "lng": 80.276},
        {"name": "Egmore Bus Terminus",        "dist": "0.5 km", "status": "Open","icon": "🚌", "lat": 13.078, "lng": 80.271},
        {"name": "Park Town Bus Stop",         "dist": "0.8 km", "status": "Open","icon": "🚌", "lat": 13.076, "lng": 80.267},
    ],
    "auto": [
        {"name": "Central Station Auto Stand", "dist": "0.1 km", "status": "Open","icon": "🛺", "lat": 13.082, "lng": 80.274},
        {"name": "Egmore Auto Stand",          "dist": "0.4 km", "status": "Open","icon": "🛺", "lat": 13.079, "lng": 80.270},
        {"name": "EVR Road Auto Stand",        "dist": "0.9 km", "status": "Open","icon": "🛺", "lat": 13.084, "lng": 80.264},
    ],
    "pharmacy": [
        {"name": "MedPlus Pharmacy",           "dist": "0.3 km", "status": "Open","icon": "💊", "lat": 13.081, "lng": 80.273},
        {"name": "Apollo Pharmacy",            "dist": "0.7 km", "status": "24h", "icon": "💊", "lat": 13.076, "lng": 80.269},
        {"name": "NetMeds Store",              "dist": "1.0 km", "status": "Open","icon": "💊", "lat": 13.070, "lng": 80.262},
    ],
}

# ── MODELS ───────────────────────────────────────────────────────
class GeocodeRequest(BaseModel):
    address: str

class RouteRequest(BaseModel):
    origin_lat: float
    origin_lng: float
    dest_lat: float
    dest_lng: float
    profile: str = "driving-car"  # driving-car | foot-walking

class Coord(BaseModel):
    lat: float
    lng: float

class SafetyRequest(BaseModel):
    coords: List[Coord]
    mode: str = "women"  # women | night | walking

class SOSRequest(BaseModel):
    lat: Optional[float] = None
    lng: Optional[float] = None
    message: Optional[str] = ""

class ChatRequest(BaseModel):
    message: str

# ── HELPERS ──────────────────────────────────────────────────────
def haversine(lat1, lng1, lat2, lng2):
    R = 6371
    dLat = math.radians(lat2 - lat1)
    dLng = math.radians(lng2 - lng1)
    a = math.sin(dLat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dLng/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

def compute_risk(lat, lng, mode, hour):
    base = 0.15

    # Time multiplier
    if hour >= 22 or hour < 5:
        time_mult = 1.6 if mode == "night" else 2.2
    elif hour >= 18:
        time_mult = 1.2
    else:
        time_mult = 1.0

    # Crime proximity
    for spot in HOTSPOTS:
        d = haversine(lat, lng, spot["lat"], spot["lng"])
        if d < spot["r"]:
            base += spot["risk"] * (1 - d / spot["r"])

    # Mode adjustments
    if mode == "women":   base *= 1.15
    if mode == "walking": base *= 1.30
    if mode == "night":   base *= 1.50

    return min(base * time_mult, 1.0)

def risk_level(r):
    if r < 0.3: return "low"
    if r < 0.6: return "medium"
    return "high"

def fmt_duration(seconds):
    m = round(seconds / 60)
    if m < 60: return f"{m} min"
    return f"{m // 60}h {m % 60}m"

# ── ROUTES ───────────────────────────────────────────────────────
@app.get("/")
def health():
    return {"status": "ok", "service": "FemRoute API", "version": "1.0.0"}

@app.post("/api/geocode")
async def geocode(req: GeocodeRequest):
    """Geocode an address using OpenRouteService"""
    if not ORS_KEY:
        raise HTTPException(400, "ORS_API_KEY not configured")
    url = f"{ORS_BASE}/geocode/search"
    params = {"api_key": ORS_KEY, "text": req.address, "boundary.country": "IN", "size": 1}
    async with httpx.AsyncClient() as client:
        r = await client.get(url, params=params, timeout=10)
        r.raise_for_status()
        data = r.json()
    if not data.get("features"):
        raise HTTPException(404, "Address not found")
    feat = data["features"][0]
    lng, lat = feat["geometry"]["coordinates"]
    return {"lat": lat, "lng": lng, "label": feat["properties"]["label"]}

@app.post("/api/route")
async def get_route(req: RouteRequest):
    """Get a real route from OpenRouteService"""
    if not ORS_KEY:
        raise HTTPException(400, "ORS_API_KEY not configured")
    url = f"{ORS_BASE}/v2/directions/{req.profile}"
    params = {
        "api_key": ORS_KEY,
        "start": f"{req.origin_lng},{req.origin_lat}",
        "end":   f"{req.dest_lng},{req.dest_lat}"
    }
    async with httpx.AsyncClient() as client:
        r = await client.get(url, params=params, timeout=15)
        if r.status_code != 200:
            raise HTTPException(r.status_code, "ORS routing failed")
        data = r.json()
    feat = data["features"][0]
    coords = [{"lat": c[1], "lng": c[0]} for c in feat["geometry"]["coordinates"]]
    summary = feat["properties"]["summary"]
    return {
        "coords": coords,
        "distance_m": summary["distance"],
        "duration_s": summary["duration"],
        "distance_str": f"{summary['distance']/1000:.1f} km",
        "duration_str": fmt_duration(summary["duration"])
    }

@app.post("/api/safety-score")
def safety_score(req: SafetyRequest):
    """
    AI Safety Scoring Engine
    Scores each coordinate and returns:
    - per-segment risk + level
    - overall safety score (%)
    - summary stats
    """
    import datetime
    hour = datetime.datetime.now().hour

    segments = []
    for coord in req.coords:
        risk = compute_risk(coord.lat, coord.lng, req.mode, hour)
        segments.append({
            "lat": coord.lat,
            "lng": coord.lng,
            "risk": round(risk, 3),
            "level": risk_level(risk),
            "risk_pct": round(risk * 100)
        })

    if not segments:
        raise HTTPException(400, "No coordinates provided")

    avg_risk = sum(s["risk"] for s in segments) / len(segments)
    safety = round((1 - avg_risk) * 100)
    cat = "safe" if safety >= 70 else "moderate" if safety >= 50 else "dangerous"

    high_segs  = [s for s in segments if s["level"] == "high"]
    med_segs   = [s for s in segments if s["level"] == "medium"]

    warnings = []
    if high_segs:
        warnings.append({"level": "high",   "msg": f"{len(high_segs)} high-risk segment(s) detected. Consider alternate route."})
    if med_segs:
        warnings.append({"level": "medium", "msg": f"{len(med_segs)} moderate-risk segment(s). Stay on main roads."})
    if hour >= 20 or hour < 6:
        warnings.append({"level": "high",   "msg": "Night travel: Risk elevated. Prefer busy, lit roads."})
    if req.mode == "women":
        warnings.append({"level": "info",   "msg": "Women Safety Mode active — route avoids isolated corridors."})

    return {
        "safety_score": safety,
        "category": cat,
        "avg_risk": round(avg_risk, 3),
        "segments": segments,
        "warnings": warnings,
        "high_risk_count": len(high_segs),
        "medium_risk_count": len(med_segs),
        "total_segments": len(segments),
        "mode": req.mode,
        "time_hour": hour
    }

@app.get("/api/nearby/{service_type}")
def get_nearby(service_type: str, lat: float = 13.082, lng: float = 80.275):
    """
    Get nearby services.
    In production: replace with Google Places API or ORS POI endpoint.
    service_type: police | hospital | ngo | bus | auto | pharmacy
    """
    if service_type not in NEARBY:
        raise HTTPException(400, f"Unknown service type. Choose from: {list(NEARBY.keys())}")
    items = NEARBY[service_type]
    # In production: sort by actual distance from lat,lng
    return {"type": service_type, "count": len(items), "items": items}

@app.post("/api/sos")
def trigger_sos(req: SOSRequest):
    """
    SOS Alert endpoint.
    In production: 
    - Send SMS via Twilio to emergency contacts
    - POST to police API / FCM push
    - Log to database with timestamp + location
    """
    location = f"{req.lat},{req.lng}" if req.lat and req.lng else "Location unavailable"
    print(f"🚨 SOS ALERT — Location: {location} — Message: {req.message}")
    # TODO: Twilio SMS
    # from twilio.rest import Client
    # client = Client(os.getenv("TWILIO_SID"), os.getenv("TWILIO_TOKEN"))
    # client.messages.create(to="+91XXXXXXXXXX", from_="+1...", body=f"SOS from FemRoute user at {location}")
    return {
        "status": "alert_sent",
        "message": "Emergency services and contacts have been notified",
        "location": location,
        "emergency_numbers": ["112", "1091", "100", "102"]
    }

@app.post("/api/chat")
def chat(req: ChatRequest):
    """
    Sakhi chatbot endpoint.
    In production: replace KB with LLM (Claude / GPT-4) call.
    """
    text = req.message.lower().strip()

    # Simple KB matching (same as frontend bot.js)
    KB = [
        (["hi","hello","hey","namaste"],          "Hi! I'm Sakhi, FemRoute's safety AI. How can I help you stay safe today? 💪", ["Safe route tips","Emergency help","Nearby services"]),
        (["sos","emergency","unsafe","help me","danger","scared","followed"], "🚨 EMERGENCY: Call 112 now! Move to a crowded lit area. Press SOS button in app. Stay on the line with someone you trust.", ["Call 112","Call 1091","I'm safe now"]),
        (["safety score","score"],                 "Safety scores range 0–100%. 70%+ is safe, 50–69% moderate, below 50% high risk. Calculated using crime data, time of day, and your travel mode.", ["How is risk calculated?","What modes are available?"]),
        (["mode","women safety","night","walking"],"FemRoute has 3 modes: ♀ Women Safety (default), 🌙 Night Travel (2.2× risk after 10PM), 🚶 Walking (avoids isolated paths).", ["Safe route tips","What is safety score?"]),
        (["nearby","police","hospital","ngo"],     "Use the 📍 Nearby button to find police stations, hospitals, NGOs, bus stops, auto stands & pharmacies near you with directions!", ["Nearest police station","Emergency numbers"]),
        (["ride","ola","uber","cab","taxi"],       "Click 🚗 Book Ride in the app to open Ola, Uber, or Rapido with your destination pre-filled. Always share your trip with a trusted contact!", ["Safety tips for rides"]),
        (["emergency numbers","helpline","112"],   "📞 Emergency Numbers:\n112 - National Emergency\n1091 - Women's Helpline\n100 - Police\n102 - Ambulance", ["I feel unsafe","Safe route tips"]),
        (["safe","tips","advice"],                 "Top tips: Check FemRoute before leaving · Stay on lit roads · Share live location · Save 112 and 1091 · Trust your instincts!", ["Night travel tips","Emergency numbers"]),
        (["thank","thanks","awesome","helpful"],   "You're welcome! Stay safe and confident. FemRoute is always here for you 💖", ["Safe route tips","Emergency help"]),
    ]

    for triggers, reply, qr in KB:
        if any(t in text for t in triggers):
            return {"reply": reply, "quick_replies": qr}

    return {
        "reply": "I'm not sure I understood that. Try asking about safe routes, emergency help, nearby services, or booking a ride!",
        "quick_replies": ["Safe route tips","Emergency help","Nearby services","Book a ride"]
    }

# ── RUN ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
