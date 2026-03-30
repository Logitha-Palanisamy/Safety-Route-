# FemRoute — Complete Setup Guide

## 📁 Project Structure

```
femroute/
├── frontend/
│   ├── index.html      ← Main app (open this in browser)
│   ├── styles.css      ← All styles (mobile-first)
│   ├── app.js          ← Map, routing, AI scoring, nearby, rides
│   └── bot.js          ← Sakhi chatbot (all replies + SOS)
│
├── backend/
│   ├── server.py       ← FastAPI backend (all API endpoints)
│   ├── requirements.txt
│   └── .env.example    ← Copy to .env and add your keys
│
└── README.md
```

---

## 🚀 Quick Start (Frontend Only — No Backend Needed for Demo)

1. Unzip the folder
2. Open `frontend/index.html` in any browser
3. The app works immediately with simulated data!

---

## 🔑 Get Your Free ORS API Key (Real Routing)

1. Go to **https://openrouteservice.org**
2. Click **Sign Up** (free)
3. Go to **Dashboard → API Keys → Create Key**
4. Copy the key
5. In the app → paste into the 🔑 API Key box → click **Save**

✅ Now you get **real distances, times, and route geometry**!

Free plan = **2,000 requests/day** — perfect for demo.

---

## 🐍 Run the Backend (Optional — for Production)

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env and add your ORS_API_KEY

# Start server
uvicorn server:app --reload --port 8000
```

Backend runs at: **http://localhost:8000**
API docs at: **http://localhost:8000/docs**

---

## 📡 Backend API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| POST | `/api/geocode` | Geocode address → lat/lng |
| POST | `/api/route` | Get real ORS route |
| POST | `/api/safety-score` | AI risk scoring for route |
| GET | `/api/nearby/{type}` | Nearby police/hospital/NGO etc |
| POST | `/api/sos` | Trigger SOS alert |
| POST | `/api/chat` | Sakhi chatbot response |

---

## 🤖 Sakhi Chatbot Topics

The bot handles:
- Greetings
- Emergency / unsafe situations → triggers SOS
- Safety tips (general, night travel, in cabs)
- What to do if followed / stalked
- Emergency numbers (112, 1091, etc.)
- How FemRoute works
- Safety scores explained
- Travel modes explained
- Nearby services
- Book a ride (Ola/Uber)
- How to report incidents
- ORS API key help
- AI algorithm explanation

---

## 🗺️ Features

### Core
- ✅ AI multi-factor safety scoring
- ✅ 3 routes analysed + ranked safest first
- ✅ Micro-segment colour-coded map (green/yellow/red)
- ✅ Real-time warnings
- ✅ Women Safety / Night Travel / Walking modes

### Navigation
- ✅ ORS real routing (with API key)
- ✅ Real distance + travel time
- ✅ My Location button (GPS)
- ✅ Swap origin/destination

### Nearby Services
- ✅ Police stations
- ✅ Hospitals
- ✅ NGOs / Women's centres
- ✅ Bus stops
- ✅ Auto stands
- ✅ Pharmacies
- ✅ One-tap directions (opens Google Maps)

### Ride Booking
- ✅ Ola Cabs (deep link with destination)
- ✅ Uber (deep link with destination)
- ✅ Rapido
- ✅ Google Maps navigation
- ✅ Pre-ride safety checklist

### Safety
- ✅ One-tap SOS button
- ✅ Emergency number display
- ✅ Sakhi chatbot (24/7 safety assistant)

### UI/UX
- ✅ Mobile-first responsive design
- ✅ Dark safety theme
- ✅ Animated splash screen
- ✅ Map/Controls toggle on mobile
- ✅ Floating chatbot bubble

---
<img width="1600" height="721" alt="image" src="https://github.com/user-attachments/assets/11c5e667-7c41-459f-8368-93e0d704fddc" />


## 📱 Mobile Usage

On mobile, the app shows controls by default.
Tap **🗺️ Map** button to switch to the map view.
Tap **📋 Controls** to go back.

---

## 🔄 Production Upgrades

| Current (Demo) | Production Replacement |
|----------------|----------------------|
| Simulated crime hotspots | SafeCity API + NCRB open data |
| Simulated nearby data | Google Places API / ORS POI |
| Mock SOS overlay | Twilio SMS to emergency contacts |
| Frontend-only bot | Claude API / GPT-4 backend |
| Single city data | Multi-city crime database |

---

## 👥 Team

**FemRoute** — Built for women's safety
N · V · D · L · DH

*Every woman deserves to travel safely.* ♀
