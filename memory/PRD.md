# Kirana Udhaar Tracker — PRD

## Goal
Mobile app for Indian Kirana shop owners to track customer credit (udhaar) and payments, with WhatsApp reminders, voice-driven entry and risk badges.

## Stack
- Frontend: Expo SDK 54 (React Native), expo-router, react-native-reanimated, expo-audio, expo-secure-store
- Backend: FastAPI + MongoDB (motor)
- LLM: OpenAI Whisper (whisper-1) for STT + GPT-5.4-mini for command parsing via EMERGENT_LLM_KEY

## Features (v1)
1. **First-launch setup** — shop name + 4-digit PIN.
2. **PIN lock** — verified against backend hash on every cold start.
3. **Dashboard** — total outstanding udhaar, customers list with red/green balance, FAB → voice.
4. **Customers tab** — search, filter chips (All / Pending / Risky / Cleared).
5. **Add customer** — name + phone (modal).
6. **Customer detail** — sticky balance card, transaction history with running balance, WhatsApp reminder, delete.
7. **Add transaction** — segmented Udhaar (red) / Jama (green), giant amount input, optional note.
8. **Voice entry** — record via expo-audio → backend Whisper → LLM parse → prefilled add-transaction.
9. **Risk badge** — FIFO match credits vs payments → red 30+ days, yellow 15–30, green recent/cleared.
10. **WhatsApp reminder** — `whatsapp://send` with pre-filled Hindi message and shop name.
11. **Settings** — edit shop name, reset demo data, lock app.

## API surface
- `GET/POST /api/setup`, `PUT /api/setup/shop-name`, `POST /api/auth/verify-pin`
- `GET/POST /api/customers`, `GET/DELETE /api/customers/{id}`
- `GET/POST /api/customers/{id}/transactions`, `DELETE /api/transactions/{id}`
- `GET /api/dashboard`
- `POST /api/voice/parse` (multipart audio), `POST /api/voice/parse-text`
- `POST /api/seed`

## Future / Smart enhancement
- WhatsApp link tracking — log each reminder sent to compute "recovery success rate" per customer (drives engagement + ROI for shop owners).
