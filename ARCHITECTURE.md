# Cricket Pitch Booking System — Architecture Notes

This document explains the main design decisions for the Cricket Pitch Booking System (CPBS). The app is built with React on the frontend and Node.js + Express + Sequelize + MySQL on the backend, with Socket.io for real-time slot updates.

I chose MySQL because the data is naturally relational — users, pitches, slots, bookings — and I needed proper transactions and unique constraints to handle concurrent bookings safely.

---

## 1. Slot Race Condition

**Question:** How does the system ensure two users cannot book the same slot?

The classic problem here is simple: User A and User B both try to book 7–8 PM at the same moment. Without care, both requests could go through.

I handled this with three layers, not just one. Relying on a single check in code isn't enough when two requests hit the server at the exact same time.

**First — database transactions.** Every reserve and confirm operation runs inside a Sequelize transaction. If anything fails midway, the whole thing rolls back. There's no half-done booking sitting in the database.

**Second — row locking.** Before writing anything, the code reads existing bookings and reservations with `SELECT ... FOR UPDATE` (via `transaction.LOCK.UPDATE` in Sequelize). MySQL locks those rows until the transaction finishes. So when User B's request comes in while User A's transaction is still running, User B has to wait. By the time B's turn comes, A's reservation already exists and B gets rejected.

**Third — unique constraints as a safety net.** Even if something slips through the application logic, the database won't allow it:

- `bookings` — unique on `(pitch_id, slot_id, booking_date)`
- `reservations` — unique on `(pitch_id, slot_id, booking_date)`

If a duplicate somehow gets through, MySQL throws an error and the API returns a 409 response.

Here's roughly what happens when two people race for the same slot:

```
User A hits "Reserve 7-8 PM"
User B hits "Reserve 7-8 PM" at the same time

→ A's transaction starts, locks the rows
→ B's transaction waits
→ A creates the reservation and commits
→ B finally runs, sees A's reservation, gets rejected
```

The same logic applies on confirm — we lock, check, then insert into `bookings`.

I considered optimistic locking (a version column), but for something as scarce as a time slot, pessimistic locking makes more sense. With optimistic locking, one user always loses and has to retry manually. With row locking, the second request is handled cleanly at the database level.

---

## 2. Temporary Reservation (2 Minutes)

**Question:** How does the system handle the 2-minute slot reservation?

When a user picks a slot, it shouldn't be instantly booked forever — but it also shouldn't stay open while they think about it. The assignment asks for a 2-minute hold, and if they don't confirm, the slot goes back to available.

### Why I used the database instead of Redis

The assignment mentions three options: Redis, in-memory, or temporary DB state. I went with **temporary DB state** — a `reservations` table with an `expires_at` column.

Redis with TTL would be cleaner for auto-expiry and would scale better across multiple servers. But for this project I already had MySQL set up, and keeping reservations in the same database meant I could use the same transactions and locking as bookings. Less moving parts for a single-server setup.

In production with multiple servers, I'd move the hold logic to Redis TTL and keep MySQL only for confirmed bookings.

### How the flow works

**When the user selects a slot** (`POST /api/reserve-slot`):
- A row goes into `reservations` with `expires_at = now + 2 minutes`
- Socket.io tells everyone else viewing that pitch: this slot is now reserved

**When they confirm in time** (`POST /api/confirm-booking`):
- We check the reservation still exists and hasn't expired
- Create a row in `bookings`
- Delete the reservation
- Socket.io broadcasts: slot is booked

**When they don't confirm:**
- A background job runs every 15 seconds, finds expired reservations, deletes them, and sends a socket event so the slot shows as available again
- Every read also filters with `expires_at > NOW()`, so expired holds are ignored even before the job runs
- The frontend shows a countdown and clears the hold when it hits zero

A few extra details worth mentioning:

- **One hold per user** — if you reserve slot A and then pick slot B, slot A is released automatically. Each new pick gets a fresh 2-minute timer.
- **After refresh or disconnect** — the hold lives on the server, not just in the browser. There's a `GET /api/active-reservation` endpoint to restore it, plus localStorage to sync across tabs.

---

## 3. Scalability

**Question:** What changes are needed if 10,000 users check availability at the same time?

The current setup — one Node server, one MySQL instance — is fine for development and demo. It won't comfortably handle 10,000 people hitting `GET /slots` at once. Here's what I'd change:

### Load balancer

Put NGINX or an AWS Application Load Balancer in front of multiple Node.js instances. Traffic gets spread across servers, unhealthy ones get removed automatically, and SSL can terminate at the edge.

```
Clients → Load Balancer → Node 1 / Node 2 / Node 3 → MySQL
```

### Redis caching

Checking slot availability is a read-heavy operation — that's what most of those 10,000 users would be doing. I'd cache the response:

```
Key:  slots:{pitchId}:{date}
TTL:  ~30 seconds
```

Invalidate the cache whenever someone reserves, confirms, or a hold expires. Instead of 10,000 database queries, you'd mostly serve from Redis. Pitch list (`GET /pitches`) rarely changes, so that can be cached with a longer TTL too.

### MySQL read replicas

Writes (register, reserve, confirm) go to the primary. Availability reads go to read replicas. Sequelize supports separate read/write connections for this.

### Other practical changes

- **CDN** for the React build — static files shouldn't touch your app servers at all
- **Bigger connection pools** — tune Sequelize pool size and MySQL `max_connections` based on how many Node instances you run
- **Rate limiting** on reserve and confirm — something like 10 requests per minute per user, to stop abuse
- **Indexes** on `bookings(pitch_id, booking_date)` and `reservations(expires_at)` — the expiry job and slot queries depend on these

At scale, the picture looks something like:

```
Users → CDN (frontend)
     → Load Balancer → Node × N → Redis (cache + pub/sub)
                              → MySQL primary (writes)
                              → MySQL replica (reads)
```

---

## 4. Socket.io Scaling

**Question:** How would you scale Socket.io across multiple servers?

Right now Socket.io runs on a single server and works fine. The moment you add a second server, you hit a problem: User A connects to Server 1, User B connects to Server 2. When A books a slot, Server 1 knows about it — but Server 2 has no idea, so B's screen doesn't update.

### Redis pub/sub (Socket.io Redis Adapter)

This is the standard fix. All Node instances connect to the same Redis using `@socket.io/redis-adapter`:

```javascript
const { createAdapter } = require('@socket.io/redis-adapter');
const pubClient = createClient({ url: 'redis://localhost:6379' });
const subClient = pubClient.duplicate();
io.adapter(createAdapter(pubClient, subClient));
```

When Server 1 emits a `slot-update` event, it publishes to Redis. Redis forwards it to every server. Whichever server has User B connected will deliver the event to them.

### Load balancer

WebSockets need special handling. NGINX (or similar) has to pass through the upgrade headers:

```nginx
location /socket.io/ {
    proxy_pass http://nodejs_backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

### Sticky sessions

A WebSocket is a long-lived connection. Once a client connects to Server 2, all traffic for that connection should stay on Server 2. Configure the load balancer with IP hash or cookie-based sticky sessions.

Even with Redis pub/sub handling broadcasts across servers, sticky sessions still help keep the initial WebSocket connection stable.

### Rooms (already in the current code)

Clients join a room per pitch and date: `pitch-{pitchId}-{date}`. Events only go to people actually viewing that pitch on that day — not every connected user. That matters a lot when you have thousands of people online.

```
User A books on Server 1
        ↓
   Redis pub/sub
        ↓
User B on Server 2 gets the update
User C on Server 3 gets the update
```

---

## 5. Database Schema

```
users          → id, name, email, password, created_at, updated_at

pitches        → id, name, location, price_per_hour, created_at, updated_at

slots          → id, pitch_id, start_time, end_time, status
                 (hourly templates pre-generated per pitch, e.g. 6 AM – 10 PM)

bookings       → id, user_id, pitch_id, slot_id, booking_date, status, reservation_id
                 UNIQUE on (pitch_id, slot_id, booking_date)
                 UNIQUE on reservation_id

reservations   → id, user_id, pitch_id, slot_id, booking_date, expires_at
                 UNIQUE on (pitch_id, slot_id, booking_date)
```

Slots are pre-generated in the database (one row per hour per pitch). The booking date comes from the user at booking time — the same slot ID is reused every day.

---

## 6. Backend Structure

The backend follows a simple layered pattern:

```
Route → Controller → Service → Repository → Model → MySQL
```

- **Routes** — map URLs to handlers
- **Controllers** — read the request, send the response
- **Services** — business logic, transactions
- **Repositories** — database queries
- **Models** — Sequelize schema definitions

---

## 7. Edge Cases

These came up in the assignment requirements and are handled in the current code:

**Duplicate booking requests** — transactions, row locking, and unique constraints together prevent double booking.

**Network retry** — if the same user hits reserve again, we upsert and extend the timer instead of creating a duplicate. On confirm, if the booking already went through (same `reservationId`), the API returns success instead of an error.

**Reservation expiry** — DB expiry timestamp, background cleanup job, Socket.io notification, and a frontend countdown.

**User disconnects mid-reservation** — the hold stays in the database until it expires. On return, `GET /active-reservation` picks it back up.

**Multiple tabs** — only one active hold allowed per user; localStorage keeps tabs in sync; Socket.io updates the slot grid everywhere.

---

## 8. Quick Summary

| Topic | What we built | What I'd add at scale |
|-------|---------------|----------------------|
| Race conditions | Transactions + row locking + unique constraints | Same approach — it's DB-level safety |
| 2-min reservation | DB reservations table + expiry job | Redis TTL for holds |
| 10k concurrent users | Single server + MySQL | Load balancer, Redis cache, read replicas, CDN |
| Socket.io | Single server with rooms | Redis pub/sub adapter, load balancer, sticky sessions |

That covers the main architecture decisions. The current build is designed to work correctly on a single machine for the assignment demo, with a clear path to scale when needed.
