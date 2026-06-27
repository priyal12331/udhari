from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import hashlib
import json
import tempfile
import re
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta

from emergentintegrations.llm.openai.speech_to_text import OpenAISpeechToText
from emergentintegrations.llm.chat import LlmChat, UserMessage


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ---------- Helpers ----------
def hash_pin(pin: str) -> str:
    return hashlib.sha256(pin.encode()).hexdigest()


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


# ---------- Models ----------
class SetupCreate(BaseModel):
    shop_name: str
    pin: str  # 4-digit


class SetupOut(BaseModel):
    shop_name: str
    has_pin: bool


class PinVerify(BaseModel):
    pin: str


class CustomerCreate(BaseModel):
    name: str
    phone: str


class CustomerOut(BaseModel):
    id: str
    name: str
    phone: str
    balance: float  # positive = customer owes shop
    last_transaction_at: Optional[str] = None
    risk: str  # green | yellow | red
    last_credit_at: Optional[str] = None
    created_at: str


class TransactionCreate(BaseModel):
    type: Literal["credit", "payment"]
    amount: float
    date: Optional[str] = None  # ISO; if not provided => now
    note: Optional[str] = ""


class TransactionOut(BaseModel):
    id: str
    customer_id: str
    type: str
    amount: float
    date: str
    note: str
    running_balance: float
    created_at: str
    notified_at: Optional[str] = None


class DashboardOut(BaseModel):
    total_outstanding: float
    total_customers: int
    customers_with_dues: int
    customers: List[CustomerOut]


class VoiceParseOut(BaseModel):
    transcript: str
    name: Optional[str] = None
    amount: Optional[float] = None
    type: Optional[str] = None  # credit | payment
    matched_customer_id: Optional[str] = None
    matched_customer_name: Optional[str] = None


# ---------- Setup / Auth ----------
@api_router.get("/setup", response_model=SetupOut)
async def get_setup():
    doc = await db.settings.find_one({"_id": "settings"}, {"_id": 0})
    if not doc:
        return SetupOut(shop_name="", has_pin=False)
    return SetupOut(shop_name=doc.get("shop_name", ""), has_pin=bool(doc.get("pin_hash")))


@api_router.post("/setup", response_model=SetupOut)
async def post_setup(payload: SetupCreate):
    if not payload.shop_name.strip():
        raise HTTPException(400, "Shop name required")
    if not payload.pin or len(payload.pin) < 4 or not payload.pin.isdigit():
        raise HTTPException(400, "PIN must be at least 4 digits")
    await db.settings.update_one(
        {"_id": "settings"},
        {"$set": {
            "shop_name": payload.shop_name.strip(),
            "pin_hash": hash_pin(payload.pin),
            "updated_at": iso(now_utc()),
        }},
        upsert=True
    )
    return SetupOut(shop_name=payload.shop_name.strip(), has_pin=True)


@api_router.post("/auth/verify-pin")
async def verify_pin(payload: PinVerify):
    doc = await db.settings.find_one({"_id": "settings"}, {"_id": 0})
    if not doc or not doc.get("pin_hash"):
        raise HTTPException(404, "Setup not done")
    ok = hash_pin(payload.pin) == doc["pin_hash"]
    return {"ok": ok}


class ShopNameUpdate(BaseModel):
    shop_name: str


@api_router.put("/setup/shop-name", response_model=SetupOut)
async def update_shop_name(payload: ShopNameUpdate):
    if not payload.shop_name.strip():
        raise HTTPException(400, "Shop name required")
    await db.settings.update_one(
        {"_id": "settings"},
        {"$set": {"shop_name": payload.shop_name.strip()}},
        upsert=True
    )
    doc = await db.settings.find_one({"_id": "settings"}, {"_id": 0})
    return SetupOut(shop_name=doc.get("shop_name", ""), has_pin=bool(doc.get("pin_hash")))


# ---------- Customers ----------
def _compute_view_from_txs(customer: dict, txs: List[dict]) -> CustomerOut:
    """Pure computation — no DB calls. Pass the already-fetched txs for this customer."""
    cid = customer["id"]
    balance = 0.0
    last_credit_at: Optional[datetime] = None
    last_tx_at: Optional[datetime] = None
    for t in txs:
        amt = float(t["amount"])
        if t["type"] == "credit":
            balance += amt
            d = datetime.fromisoformat(t["date"])
            if not last_credit_at or d > last_credit_at:
                last_credit_at = d
        else:
            balance -= amt
        d = datetime.fromisoformat(t["date"])
        if not last_tx_at or d > last_tx_at:
            last_tx_at = d

    # Risk: based on oldest unpaid credit age. If balance <= 0 → green.
    risk = "green"
    if balance > 0 and last_credit_at:
        txs_sorted = sorted(txs, key=lambda x: x["date"])
        oldest_unpaid: Optional[datetime] = None
        # Track credits FIFO
        credits_queue: List[dict] = []
        for t in txs_sorted:
            if t["type"] == "credit":
                credits_queue.append({"date": t["date"], "remaining": float(t["amount"])})
            else:
                pay = float(t["amount"])
                while pay > 0 and credits_queue:
                    head = credits_queue[0]
                    if head["remaining"] <= pay:
                        pay -= head["remaining"]
                        credits_queue.pop(0)
                    else:
                        head["remaining"] -= pay
                        pay = 0.0
        if credits_queue:
            oldest_unpaid = datetime.fromisoformat(credits_queue[0]["date"])
        if oldest_unpaid:
            age_days = (now_utc() - oldest_unpaid).days
            if age_days >= 30:
                risk = "red"
            elif age_days >= 15:
                risk = "yellow"
            else:
                risk = "green"

    return CustomerOut(
        id=cid,
        name=customer["name"],
        phone=customer["phone"],
        balance=round(balance, 2),
        last_transaction_at=iso(last_tx_at) if last_tx_at else None,
        last_credit_at=iso(last_credit_at) if last_credit_at else None,
        risk=risk,
        created_at=customer["created_at"],
    )


@api_router.post("/customers", response_model=CustomerOut)
async def create_customer(payload: CustomerCreate):
    name = payload.name.strip()
    phone = payload.phone.strip()
    if not name:
        raise HTTPException(400, "Name required")
    if not phone:
        raise HTTPException(400, "Phone required")
    cust = {
        "id": str(uuid.uuid4()),
        "name": name,
        "phone": phone,
        "created_at": iso(now_utc()),
    }
    await db.customers.insert_one({**cust})
    # New customer has no transactions yet
    return _compute_view_from_txs(cust, [])


@api_router.get("/customers", response_model=List[CustomerOut])
async def list_customers():
    customers = await db.customers.find({}, {"_id": 0}).sort("created_at", -1).limit(500).to_list(500)
    cust_ids = [c["id"] for c in customers]
    # Single batched query for all transactions belonging to these customers
    all_txs = await db.transactions.find(
        {"customer_id": {"$in": cust_ids}},
        {"_id": 0, "customer_id": 1, "type": 1, "amount": 1, "date": 1},
    ).limit(5000).to_list(5000)
    grouped: dict[str, list] = {}
    for t in all_txs:
        grouped.setdefault(t["customer_id"], []).append(t)
    return [_compute_view_from_txs(c, grouped.get(c["id"], [])) for c in customers]


@api_router.get("/customers/{customer_id}", response_model=CustomerOut)
async def get_customer(customer_id: str):
    c = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Customer not found")
    txs = await db.transactions.find(
        {"customer_id": customer_id},
        {"_id": 0, "type": 1, "amount": 1, "date": 1},
    ).limit(1000).to_list(1000)
    return _compute_view_from_txs(c, txs)


@api_router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str):
    await db.customers.delete_one({"id": customer_id})
    await db.transactions.delete_many({"customer_id": customer_id})
    return {"ok": True}


# ---------- Transactions ----------
@api_router.post("/customers/{customer_id}/transactions", response_model=TransactionOut)
async def add_transaction(customer_id: str, payload: TransactionCreate):
    c = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Customer not found")
    if payload.amount <= 0:
        raise HTTPException(400, "Amount must be > 0")

    date_str = payload.date or iso(now_utc())
    tx = {
        "id": str(uuid.uuid4()),
        "customer_id": customer_id,
        "type": payload.type,
        "amount": float(payload.amount),
        "date": date_str,
        "note": payload.note or "",
        "created_at": iso(now_utc()),
    }
    await db.transactions.insert_one({**tx})

    # compute running balance up to & including this tx
    txs = await db.transactions.find(
        {"customer_id": customer_id},
        {"_id": 0, "id": 1, "type": 1, "amount": 1, "date": 1},
    ).limit(1000).to_list(1000)
    txs_sorted = sorted(txs, key=lambda x: x["date"])
    bal = 0.0
    running = 0.0
    for t in txs_sorted:
        bal += float(t["amount"]) if t["type"] == "credit" else -float(t["amount"])
        if t["id"] == tx["id"]:
            running = bal
    return TransactionOut(
        id=tx["id"], customer_id=tx["customer_id"], type=tx["type"],
        amount=tx["amount"], date=tx["date"], note=tx["note"],
        running_balance=round(running, 2), created_at=tx["created_at"],
        notified_at=None,
    )


@api_router.get("/customers/{customer_id}/transactions", response_model=List[TransactionOut])
async def list_transactions(customer_id: str):
    txs = await db.transactions.find(
        {"customer_id": customer_id},
        {"_id": 0, "id": 1, "customer_id": 1, "type": 1, "amount": 1, "date": 1, "note": 1, "created_at": 1, "notified_at": 1},
    ).limit(1000).to_list(1000)
    # Sort by date asc to compute running balance, then return desc
    txs_sorted = sorted(txs, key=lambda x: x["date"])
    bal = 0.0
    enriched = []
    for t in txs_sorted:
        bal += float(t["amount"]) if t["type"] == "credit" else -float(t["amount"])
        enriched.append(TransactionOut(
            id=t["id"], customer_id=t["customer_id"], type=t["type"],
            amount=float(t["amount"]), date=t["date"], note=t.get("note", ""),
            running_balance=round(bal, 2), created_at=t.get("created_at", t["date"]),
            notified_at=t.get("notified_at"),
        ))
    return list(reversed(enriched))


class NotifyOut(BaseModel):
    id: str
    notified_at: str


@api_router.post("/transactions/{tx_id}/notify", response_model=NotifyOut)
async def mark_notified(tx_id: str):
    ts = iso(now_utc())
    res = await db.transactions.update_one(
        {"id": tx_id},
        {"$set": {"notified_at": ts}},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Transaction not found")
    return NotifyOut(id=tx_id, notified_at=ts)


@api_router.delete("/transactions/{tx_id}")
async def delete_tx(tx_id: str):
    await db.transactions.delete_one({"id": tx_id})
    return {"ok": True}


# ---------- Dashboard ----------
@api_router.get("/dashboard", response_model=DashboardOut)
async def dashboard():
    customers = await db.customers.find({}, {"_id": 0}).sort("created_at", -1).limit(500).to_list(500)
    cust_ids = [c["id"] for c in customers]
    all_txs = await db.transactions.find(
        {"customer_id": {"$in": cust_ids}},
        {"_id": 0, "customer_id": 1, "type": 1, "amount": 1, "date": 1},
    ).limit(5000).to_list(5000)
    grouped: dict[str, list] = {}
    for t in all_txs:
        grouped.setdefault(t["customer_id"], []).append(t)

    out_customers = []
    total = 0.0
    with_dues = 0
    for c in customers:
        view = _compute_view_from_txs(c, grouped.get(c["id"], []))
        out_customers.append(view)
        if view.balance > 0:
            total += view.balance
            with_dues += 1
    # sort: highest balance first
    out_customers.sort(key=lambda x: -x.balance)
    return DashboardOut(
        total_outstanding=round(total, 2),
        total_customers=len(customers),
        customers_with_dues=with_dues,
        customers=out_customers,
    )


# ---------- Voice ----------
def _parse_command_locally(text: str, customers: List[dict]) -> dict:
    """Lightweight regex parser as fallback."""
    t = text.lower()
    # type detection
    tx_type = None
    if any(w in t for w in ["udhaar", "udhar", "credit", "diya", "li", "le liya", "lena"]):
        tx_type = "credit"
    if any(w in t for w in ["payment", "paid", "diya payment", "jama", "pay", "received", "wapis", "return", "vapas"]):
        tx_type = "payment"
    # amount
    amount = None
    m = re.search(r"(\d+(?:\.\d+)?)", t)
    if m:
        amount = float(m.group(1))
    # name match
    name = None
    matched_id = None
    for c in customers:
        if c["name"].lower().split()[0] in t or c["name"].lower() in t:
            name = c["name"]
            matched_id = c["id"]
            break
    return {"name": name, "amount": amount, "type": tx_type, "matched_customer_id": matched_id,
            "matched_customer_name": name}


@api_router.post("/voice/parse", response_model=VoiceParseOut)
async def voice_parse(file: UploadFile = File(...)):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(500, "EMERGENT_LLM_KEY not configured")

    # Save to temp file
    suffix = ".m4a"
    if file.filename and "." in file.filename:
        suffix = "." + file.filename.rsplit(".", 1)[-1].lower()
    if suffix.lstrip(".") not in ["mp3", "mp4", "mpeg", "mpga", "m4a", "wav", "webm"]:
        suffix = ".m4a"

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        content = await file.read()
        tmp.write(content)
        tmp.flush()
        tmp.close()

        stt = OpenAISpeechToText(api_key=EMERGENT_LLM_KEY)
        with open(tmp.name, "rb") as f:
            resp = await stt.transcribe(file=f, model="whisper-1", response_format="json")
        # litellm returns dict-like
        transcript = ""
        if isinstance(resp, dict):
            transcript = resp.get("text", "")
        else:
            transcript = getattr(resp, "text", "") or str(resp)
    except Exception as e:
        logger.exception("Whisper failed")
        raise HTTPException(500, f"Transcription failed: {e}")
    finally:
        try:
            os.unlink(tmp.name)
        except Exception:
            pass

    customers = await db.customers.find(
        {}, {"_id": 0, "id": 1, "name": 1},
    ).limit(500).to_list(500)

    # LLM parse
    parsed = {}
    try:
        names_list = ", ".join([c["name"] for c in customers]) or "(no customers yet)"
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"voice-{uuid.uuid4()}",
            system_message=(
                "You are a parser for an Indian Kirana shop owner's voice commands in Hindi/English/Hinglish. "
                "Extract: name (customer first name as spoken), amount (number in rupees), and type. "
                "Type rules: 'udhaar', 'udhar', 'le liya', 'credit', 'diya', 'lena' => credit. "
                "'payment', 'paid', 'jama', 'wapis', 'diya wapas', 'return' => payment. "
                "Match 'name' against this customer list if possible: " + names_list + ". "
                "Return ONLY strict JSON with keys: name (string|null), amount (number|null), type ('credit'|'payment'|null). "
                "No extra text."
            ),
        ).with_model("openai", "gpt-4o-mini")

        full = ""
        from emergentintegrations.llm.chat import TextDelta, StreamDone
        async for ev in chat.stream_message(UserMessage(text=transcript)):
            if isinstance(ev, TextDelta):
                full += ev.content
            elif isinstance(ev, StreamDone):
                break
        # Extract JSON
        m = re.search(r"\{.*\}", full, re.DOTALL)
        if m:
            parsed = json.loads(m.group(0))
    except Exception as e:
        logger.warning(f"LLM parse failed, falling back: {e}")
        parsed = _parse_command_locally(transcript, customers)

    # Match name to customer id
    name = parsed.get("name")
    matched_id = None
    matched_name = None
    if name:
        n_lower = str(name).lower().strip()
        for c in customers:
            cn = c["name"].lower()
            if cn == n_lower or n_lower in cn or cn.split()[0] == n_lower.split()[0]:
                matched_id = c["id"]
                matched_name = c["name"]
                break

    return VoiceParseOut(
        transcript=transcript,
        name=name,
        amount=parsed.get("amount"),
        type=parsed.get("type"),
        matched_customer_id=matched_id,
        matched_customer_name=matched_name,
    )


# ---------- Voice (text-only) fallback ----------
class VoiceTextIn(BaseModel):
    text: str


@api_router.post("/voice/parse-text", response_model=VoiceParseOut)
async def voice_parse_text(payload: VoiceTextIn):
    customers = await db.customers.find(
        {}, {"_id": 0, "id": 1, "name": 1},
    ).limit(500).to_list(500)
    parsed = _parse_command_locally(payload.text, customers)
    return VoiceParseOut(
        transcript=payload.text,
        name=parsed.get("name"),
        amount=parsed.get("amount"),
        type=parsed.get("type"),
        matched_customer_id=parsed.get("matched_customer_id"),
        matched_customer_name=parsed.get("matched_customer_name"),
    )


# ---------- Seed ----------
@api_router.post("/seed")
async def seed_data():
    # Always reset demo state to a known good shape
    await db.customers.delete_many({})
    await db.transactions.delete_many({})

    samples = [
        ("Ramesh Kumar", "+919876543210", [
            ("credit", 450, -45, "5kg atta + tel"),
            ("payment", 200, -20, "cash"),
            ("credit", 320, -10, "biscuit dal"),
        ]),
        ("Suresh Patel", "+919812345670", [
            ("credit", 800, -22, "monthly samaan"),
            ("payment", 800, -3, "cleared"),
        ]),
        ("Priya Sharma", "+919900112233", [
            ("credit", 1200, -18, "diwali stock"),
            ("payment", 500, -7, ""),
        ]),
        ("Mohan Lal", "+919876012345", [
            ("credit", 150, -2, "doodh ghee"),
        ]),
        ("Anita Devi", "+919898989898", [
            ("credit", 600, -35, "udhaari purani"),
        ]),
    ]
    for name, phone, txs in samples:
        cid = str(uuid.uuid4())
        await db.customers.insert_one({
            "id": cid, "name": name, "phone": phone,
            "created_at": iso(now_utc() - timedelta(days=60))
        })
        for ttype, amt, days_ago, note in txs:
            d = now_utc() + timedelta(days=days_ago)
            await db.transactions.insert_one({
                "id": str(uuid.uuid4()),
                "customer_id": cid,
                "type": ttype,
                "amount": float(amt),
                "date": iso(d),
                "note": note,
                "created_at": iso(d),
            })
    return {"ok": True, "customers": len(samples)}


@api_router.get("/")
async def root():
    return {"message": "Kirana Udhaar API"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
