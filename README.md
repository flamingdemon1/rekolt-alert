# Rekolt Alert

A bilingual agricultural-alert homepage for Mauritius, built from the supplied
visual reference. Kreol Morisien is the default language and English is
available from the header.

## Run locally

```bash
npm install
npm run dev
npm run build
```

The development site opens at `http://localhost:3000`.

## Page modularisation

The homepage keeps the hero, live summary and district-alert interface. The
other navigation items are separate routes:

- `app/components/Header.tsx` — navigation, mobile menu and language selector
- `app/components/HeroSection.tsx` — hero copy and primary actions
- `app/components/DistrictMap.tsx` — interactive 3D map of all nine districts
- `app/components/WeatherWidget.tsx` — current-location weather interface
- `app/components/StatusStrip.tsx` — weather and agricultural summary
- `app/components/AlertSection.tsx` — district alert cards
- `app/kouma-li-marse/page.tsx` — How it works page
- `app/banne-done/page.tsx` — Data page
- `app/resours/page.tsx` — Resources page
- `app/lor-nou/page.tsx` — About page
- `app/magazin/page.tsx` — protected agricultural shop
- `app/magazin/login/page.tsx` — shop login
- `app/magazin/register/page.tsx` — shop account registration
- `app/check-plant/page.tsx` — Dokter Plant conversation page
- `app/data/site-content.ts` — both language dictionaries and demo risk data
- `app/context/LanguageContext.tsx` — language preference across all pages
- `app/hooks/useLiveWeather.ts` — browser geolocation and weather UI state

Each separated route gets its data from a matching backend module under
`app/backend/pages/`. The shared visual page frame is
`app/components/pages/SegmentPage.tsx`.

## Backend modules

- `app/backend/weather/weather.service.ts` — validates coordinates and calls
  Open-Meteo
- `app/api/weather/route.ts` — current-location weather endpoint
- `app/backend/plant-check/plant-check.service.ts` — validates a photo and
  screens reported symptoms
- `app/api/plant-check/route.ts` — multipart Check My Plant endpoint
- `app/backend/plant-chat/plant-chat.service.ts` — validates chat prompts and
  attachments, then returns bilingual preliminary guidance
- `app/api/plant-chat/route.ts` — private, no-store Dokter Plant chat endpoint
- `app/backend/shop-auth/` — password hashing, sessions and SQLite repository
- `app/api/shop-auth/` — register, login and logout endpoints
- `app/backend/pages/shop.service.ts` — normalises the 46-product JSON dataset
- `db/schema.ts` — SQLite user and session tables
- `drizzle/0000_living_saracen.sql` — generated database migration

## Secure shop accounts

Opening **Magazin** redirects a signed-out visitor to the login page. A new
visitor can register and is then sent directly to the full catalogue. Passwords
are never stored as plain text: every account gets a unique 16-byte salt and a
PBKDF2-SHA-256 derivation with 210,000 rounds. The browser receives a seven-day
HTTP-only, SameSite session cookie, while SQLite stores only its one-way hash.

Local development uses the `DB` SQLite-compatible D1 binding configured in
`.openai/hosting.json`. The auth repository creates its two tables safely on
first use, and the generated Drizzle migration is included for deployment.

The shop catalogue comes from
`app/data/mauritius-agro-products.json`. Its seven product-family images are in
`public/shop/`, while the responsive 3D cards and gateway transition are kept
in `app/globals.css`.

Every catalogue field has an English and Kreol Morisien display value. The
dataset remains unchanged; the complete Kreol descriptions, purposes, formats,
units and categories live in `app/data/shop-kreol-translations.ts`.

## Cart and demonstration checkout

- `app/hooks/useShopCart.ts` — device-local cart draft separated by username
- `app/components/shop/ShopCartDrawer.tsx` — quantities, deletion, clear-cart,
  free-delivery progress and coupons (`REKOLT10` and `MORIS50`)
- `app/components/shop/ShopCheckout.tsx` — post, home-delivery and pickup
  choices with a responsive 3D checkout
- `app/components/shop/shop-cart.types.ts` — shared line and coupon calculations

The checkout offers card, Juice and cash-on-delivery demonstrations. Pickup
automatically disables card and Juice and switches to cash on collection.
Payment-looking values stay only in the open form, are never sent to an API or
database, and are cleared after confirmation. No real payment is processed.

Dokter Plant supports typed prompts, voice dictation, spoken replies and up to
three plant photos. The assistant performs a transparent preliminary symptom
screening; it does not claim to be a laboratory or computer-vision diagnosis.
Submitted files are processed in memory for the current response and are not
saved to a database.

## Geographic accuracy

The district shapes come from the Republic of Mauritius Open Data dataset
“Mauritius districts” (CC BY-SA 4.0). Only the nine features classified as
districts are used:

Black River, Flacq, Grand Port, Moka, Pamplemousses, Plaines Wilhems, Port
Louis, Rivière du Rempart and Savanne.

The source coordinates are simplified below a rendered pixel for web
performance. CSS depth, lighting and hover transforms are added without
altering the geographic shapes.

## Live weather and privacy

The weather ribbon presents a clear **Use my location** action when permission
has not yet been decided. It first requests a fresh high-accuracy browser
position, retries with a faster network/Wi-Fi device position if GPS times out,
and then uses a clearly labelled IP estimate if device access is denied or
unavailable. An existing granted permission is reused automatically.

Coordinates are sent only to the site's weather endpoint for current
Open-Meteo conditions and a server-side readable place lookup; they are never
stored. The response includes temperature, humidity, precipitation, wind,
weather code and a simple agricultural conditions assessment.

## Notes

- Alert and pest values are realistic interface demo data, not operational
  agricultural advice.
- No GitHub commit or push is required to run the project.
