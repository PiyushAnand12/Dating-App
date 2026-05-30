# Social Matching & Discovery Platform (Flame)
An end-to-end, high-performance matching and real-time discovery platform designed for low-latency geospatial matching and robust real-time communication.

**Author**: Piyush Anand
**Role**: Backend/Full-Stack Developer

---

## 1. System Overview
This repository details the implementation of a high-performance matching platform. The architecture prioritizes horizontal scalability, low-latency geospatial discovery, and a robust real-time event pipeline. The system follows a modular monolith approach with a clearly defined Service-Repository abstraction layer to ensure clean separation of concerns and maintainability.

---

## 2. Key Features
- 📍 **Geospatial Discovery**: Real-time discovery of nearby users using an optimized distance formula.
- 💬 **Real-time Messaging**: Instant messaging with active room-based isolation and delivery/read receipts.
- 🎴 **Fluid Swiping UI**: Interactive card gesture mechanics with physics-based bounds.
- ⚡ **Performance Optimized**: Heavy caching layers and optimized DB queries to support rapid swiping and massive discovery pools.
- 💳 **Monetization Ready**: Integrated subscription models and profile boosting mechanisms.

---

## 3. Core Technology Stack & Rationales

### 3.1. Server-Side Engineering (Node.js/ESM)
- **Event-Driven Real-time Layer**: Built on **Socket.io**. The implementation utilizes a persistent heartbeat and room-based isolation for private messaging.
- **Geospatial Engine**: Discovery logic is implemented using the **Haversine formula**. We optimized the initial candidate fetch using a bounding box approach (lat/lon ± delta) before refining distances in-memory to minimize DB CPU cycles.
- **Data Integrity**: **Prisma ORM** provides type-safe access to our PostgreSQL database, with a strictly defined schema that enforces referential integrity on swipes, matches, and media records.
- **Validation & Security**: Every public-facing endpoint is protected by **Zod** schema validation to prevent injection/malformed payloads, and authenticated via **JWT**.
- **Caching**: **Redis Cache** holds discovery results with a 60-second sliding window to mitigate "refresh-spam" database pressure.

### 3.2. Client-Side Engineering (React/Vite)
- **HMR (Hot Module Replacement)**: Vite was selected for its native ESM-based development server, significantly reducing developer feedback loops.
- **Animation Orchestration**: Used **Framer Motion** for card stack management. The logic utilizes `AnimatePresence` for exit transitions and `drag` gestures with constraint-based rebound.
- **State Hydration**: Custom hooks (`useAuth`) manage session persistence and JWT lifecycle, ensuring atomic updates across the UI.

---

## 4. Key Implementation Logic

### 4.1. Discovery Algorithm (The Stack Logic)
The discovery controller (`getDiscoveryProfilesHandler`) implements a multi-pass filtering strategy:
1. **Pass 1 (Hard Filters)**: SQL-level filtering for Gender, Age Range, and Geographic Bounding Box.
2. **Pass 2 (State Filters)**: Exclusion of previously swiped IDs, blocked users, and self.
3. **Pass 3 (Ranking)**: Sorting based on `isBoosted` status (Boolean), `subscriptionTier` (Ordinal), and `lastActiveAt` (Temporal).
4. **Pass 4 (Interests Intersect)**: Filtering based on the intersection of user-selected interest IDs.

### 4.2. Real-Time Message Lifecycle
1. Client emits `send_message` via Socket.
2. Server validates message payload via Zod.
3. Message is persisted to PostgreSQL via Prisma.
4. Server emits `new_message` to the recipient's room.
5. Recipient client acknowledges, and the `read_receipt` is updated asynchronously.

---

## 5. Operational Specifications & Setup

### Prerequisites
Before running the project locally, make sure you have:
- Node.js (>= 20.0.0)
- PostgreSQL
- Redis Server

### 5.1. Local Environment Setup
```bash
# Clone the repository
git clone https://github.com/PiyushAnand12/Dating-App.git
cd Dating-App

# Backend bootstrap
npm install
npx prisma migrate deploy
node prisma/seed.js

# Frontend bootstrap
cd frontend
npm install
npm run dev
