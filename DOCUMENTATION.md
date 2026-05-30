# Technical Architecture & Implementation Specification
**Project**: Social Matching & Discovery Platform (B2C)
**Version**: 1.0.4-stable
**Author**: Engineering Team

## 1. System Overview
This specification details the end-to-end implementation of a high-performance matching platform. The architecture prioritizes horizontal scalability, low-latency geospatial discovery, and a robust real-time event pipeline. The system follows a modular monolith approach with a clearly defined Service-Repository abstraction layer.

---

## 2. Core Technology Stack & Rationales

### 2.1. Client-Side Engineering (React/Vite)
- **HMR (Hot Module Replacement)**: Vite was selected for its native ESM-based development server, significantly reducing developer feedback loops.
- **Animation Orchestration**: Used **Framer Motion** for card stack management. The logic utilizes `AnimatePresence` for exit transitions and `drag` gestures with constraint-based rebound.
- **State Hydration**: Custom hooks (`useAuth`) manage session persistence and JWT lifecycle, ensuring atomic updates across the UI.

### 2.2. Server-Side Engineering (Node.js/ESM)
- **Event-Driven Real-time Layer**: Built on **Socket.io**. The implementation utilizes a persistent heartbeat and room-based isolation for private messaging.
- **Geospatial Engine**: Discovery logic is implemented using the **Haversine formula**. We optimized the initial candidate fetch using a bounding box approach (lat/lon ± delta) before refining distances in-memory to minimize DB CPU cycles.
- **Data Integrity**: **Prisma ORM** provides type-safe access to our PostgreSQL cluster, with a strictly defined schema that enforces referential integrity on swipes, matches, and media records.

---

## 3. Key Implementation Logic

### 3.1. Discovery Algorithm (The Stack Logic)
The discovery controller (`getDiscoveryProfilesHandler`) implements a multi-pass filtering strategy:
1. **Pass 1 (Hard Filters)**: SQL-level filtering for Gender, Age Range, and Geographic Bounding Box.
2. **Pass 2 (State Filters)**: Exclusion of previously swiped IDs, blocked users, and self.
3. **Pass 3 (Ranking)**: Sorting based on `isBoosted` status (Boolean), `subscriptionTier` (Ordinal), and `lastActiveAt` (Temporal).
4. **Pass 4 (Interests Intersect)**: Filtering based on the intersection of user-selected interest IDs.

### 3.2. Real-Time Message Lifecycle
1. Client emits `send_message` via Socket.
2. Server validates message payload via Zod.
3. Message is persisted to PostgreSQL via Prisma.
4. Server emits `new_message` to the recipient's room.
5. Recipient client acknowledges, and the `read_receipt` is updated asynchronously.

---

## 4. Operational Specifications

### 4.1. Local Environment Setup
```bash
# Backend bootstrap
cd backend
npm install
npx prisma migrate deploy
node prisma/seed.js

# Frontend bootstrap
cd frontend
npm install
npm run dev
```

### 4.2. Database Seeding Strategy
We implemented specialized seeding logic to facilitate rapid QA:
- **`seed_crafted_profiles.js`**: Populates the NCR (National Capital Region) pool with 10 high-fidelity test profiles.
- **`seed_test_profiles.js`**: Generates a broader dataset of 10 additional candidates with diverse interest schemas.

---

## 5. Security & Performance Hardening
- **JWT Authentication**: Stateless authentication with custom middleware for role-based access control (Admin/User).
- **Redis Cache**: Discovery results are cached with a 60-second sliding window to mitigate "refresh-spam" DB pressure.
- **Validation**: Every public-facing endpoint is protected by Zod schema validation, preventing injection and malformed payloads.

---
*Internal Engineering Document - Confidential*
