# 8am Foods - Campus Breakfast Pre-Order

A lean, mobile-first food pre-order web app for university students. Order breakfast, skip the queue.

## Quick Start

### 1. Prerequisites
- Node.js 18+
- PostgreSQL database (local or cloud)

### 2. Environment Setup

Create a `.env` file in the project root:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/eightam?schema=public"
```

**Cloud Database Options:**
- [Railway](https://railway.app) - Free tier available
- [Supabase](https://supabase.com) - Free tier available  
- [Neon](https://neon.tech) - Free tier available

### 3. Local Development with Docker (Optional)

Run PostgreSQL locally:

```bash
docker run --name eightam-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=eightam -p 5432:5432 -d postgres:15
```

### 4. Install and Run

```bash
# Install dependencies
npm install

# Generate Prisma client and push schema to database
npm run db:generate
npm run db:push

# Seed sample menu items
npm run db:seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Pages

| Page | URL | Description |
|------|-----|-------------|
| Menu | `/` | Browse items, add to cart |
| Checkout | `/checkout` | Review order, choose payment |
| Order Status | `/order/[code]` | Track order progress |
| Kitchen | `/kitchen` | Staff order management |

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL + Prisma ORM
- **Styling**: Tailwind CSS (mobile-first, dark theme)
- **API**: Next.js Route Handlers

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── items/        # GET menu items
│   │   ├── orders/       # POST create, GET/PATCH by code
│   │   ├── payments/     # POST confirm payment
│   │   └── kitchen/      # GET active orders
│   ├── checkout/         # Checkout page
│   ├── order/[code]/     # Order status page
│   ├── kitchen/          # Kitchen display
│   ├── globals.css       # Tailwind config
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Menu page
├── lib/
│   ├── db.ts             # Prisma client
│   ├── order-code.ts     # Short code generator
│   └── prep-time.ts      # Queue estimation
prisma/
├── schema.prisma         # Database schema
└── seed.ts               # Sample data
```

## API Reference

### GET /api/items
Returns available menu items with prep time estimates.

### POST /api/orders
Creates a new order.

```json
{
  "items": [{ "itemId": "...", "quantity": 2 }],
  "paymentMethod": "ONLINE | IN_PERSON",
  "phone": "080xxxxxxxx"
}
```

### GET /api/orders/[code]
Returns order details by short code.

### PATCH /api/orders/[code]
Updates order status (kitchen use).

```json
{
  "status": "PAID | PREPARING | READY | PICKED_UP"
}
```

### POST /api/payments/confirm
Confirms payment (webhook endpoint).

```json
{
  "orderId": "...",
  "success": true,
  "providerRef": "..."
}
```

## License

MIT
