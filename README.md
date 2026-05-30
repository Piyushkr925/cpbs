# Cricket Pitch Booking System (CPBS)

Real-time cricket pitch booking platform with JWT auth, MySQL, Sequelize transactions for concurrency, and Socket.io for live slot updates.

## Project Structure

```
CPBS/
├── client/          # React + Tailwind frontend
└── server/          # Node.js + Express backend
    └── src/
        ├── config/
        ├── controllers/
        ├── jobs/
        ├── middleware/
        ├── models/
        ├── repositories/
        ├── routes/
        ├── seeders/
        ├── services/
        ├── sockets/
        └── utils/
```

## Prerequisites

- Node.js 18+
- MySQL 8+

## Setup

### 1. Database

Create a MySQL database:

```sql
CREATE DATABASE cpbs_db;
```

### 2. Backend

```bash
cd server
cp .env.example .env
# Edit .env with your MySQL credentials and JWT secret

npm install
npm run db:sync    # create/update tables
npm run db:seed    # seed pitches & slots (if empty)
npm run dev
```

Server runs at `http://localhost:5000`

**Database scripts** (from `server/`):

| Command | What it does |
|---------|----------------|
| `npm run db:sync` | Create/update tables (`alter: true`, keeps data) |
| `npm run db:seed` | Insert sample pitches & slots if table is empty |
| `npm run db:truncate` | Empty all tables, keep schema |
| `npm run db:force` | Drop & recreate all tables (destroys everything) |
| `npm run db:reset` | Truncate + reseed pitches & slots |

On `npm run dev`, the server also runs `sync({ alter: true })` automatically so tables stay in sync with models.

### 3. Frontend

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

Client runs at `http://localhost:5173`

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Register user |
| POST | `/api/auth/login` | No | Login user |
| POST | `/api/auth/logout` | Yes | Logout |
| GET | `/api/pitches` | Yes | List pitches |
| GET | `/api/slots?pitchId=&date=` | Yes | Get slots with availability |
| POST | `/api/reserve-slot` | Yes | Reserve slot for 2 minutes |
| POST | `/api/confirm-booking` | Yes | Confirm reservation |
| GET | `/api/active-reservation` | Yes | Restore active hold after refresh |
| GET | `/api/my-bookings` | Yes | User's bookings |

## Concurrency Strategy

- **Sequelize transactions** with `SELECT ... FOR UPDATE` (row locking)
- **Unique constraint** on `(pitch_id, slot_id, booking_date)` for bookings and reservations
- Prevents double booking when two users book the same slot simultaneously

## Real-Time Updates

Socket.io broadcasts `slot-update` events when a slot is reserved, booked, or released after expiry.

## Architecture Notes

See `ARCHITECTURE.md` for detailed answers on race conditions, reservation expiry, and scaling.
