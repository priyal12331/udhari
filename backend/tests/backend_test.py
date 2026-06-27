"""Backend tests for Kirana Udhaar Tracker"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get(
    "EXPO_PUBLIC_BACKEND_URL",
    "https://udhaar-track-6.preview.emergentagent.com",
).rstrip("/")
API = f"{BASE_URL}/api"

SHOP_NAME = "Sharma Kirana Store"
PIN = "1234"


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session", autouse=True)
def ensure_setup_and_seed(session):
    # Ensure setup exists with PIN 1234
    r = session.post(f"{API}/setup", json={"shop_name": SHOP_NAME, "pin": PIN})
    assert r.status_code == 200, r.text
    # Re-seed demo data so tests are deterministic
    r = session.post(f"{API}/seed")
    assert r.status_code == 200, r.text
    yield


# ---------- Setup / Auth ----------
class TestSetupAuth:
    def test_get_setup(self, session):
        r = session.get(f"{API}/setup")
        assert r.status_code == 200
        data = r.json()
        assert data["shop_name"] == SHOP_NAME
        assert data["has_pin"] is True

    def test_verify_pin_ok(self, session):
        r = session.post(f"{API}/auth/verify-pin", json={"pin": PIN})
        assert r.status_code == 200
        assert r.json()["ok"] is True

    def test_verify_pin_wrong(self, session):
        r = session.post(f"{API}/auth/verify-pin", json={"pin": "9999"})
        assert r.status_code == 200
        assert r.json()["ok"] is False

    def test_update_shop_name(self, session):
        r = session.put(f"{API}/setup/shop-name", json={"shop_name": "TEST_Updated Store"})
        assert r.status_code == 200
        assert r.json()["shop_name"] == "TEST_Updated Store"
        # restore
        session.put(f"{API}/setup/shop-name", json={"shop_name": SHOP_NAME})


# ---------- Dashboard ----------
class TestDashboard:
    def test_dashboard(self, session):
        r = session.get(f"{API}/dashboard")
        assert r.status_code == 200
        data = r.json()
        assert "total_outstanding" in data
        assert "customers" in data
        assert isinstance(data["customers"], list)
        assert len(data["customers"]) >= 5
        # total_outstanding > 0 from seeded data
        assert data["total_outstanding"] > 0

    def test_risk_badges(self, session):
        """Anita Devi (35 days old credit) should be 'red'; Priya (~18 days) yellow."""
        r = session.get(f"{API}/dashboard")
        customers = r.json()["customers"]
        by_name = {c["name"]: c for c in customers}
        assert "Anita Devi" in by_name, f"Missing Anita Devi: {list(by_name.keys())}"
        assert "Priya Sharma" in by_name
        assert by_name["Anita Devi"]["risk"] == "red", f"Anita risk={by_name['Anita Devi']['risk']}"
        assert by_name["Priya Sharma"]["risk"] == "yellow", f"Priya risk={by_name['Priya Sharma']['risk']}"
        # Suresh cleared => green and balance 0
        assert by_name["Suresh Patel"]["balance"] == 0
        assert by_name["Suresh Patel"]["risk"] == "green"


# ---------- Customers / Transactions ----------
class TestCustomers:
    def test_list_customers(self, session):
        r = session.get(f"{API}/customers")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 5

    def test_create_customer_and_persist(self, session):
        payload = {"name": "TEST_Foo Bar", "phone": "+919999900000"}
        r = session.post(f"{API}/customers", json=payload)
        assert r.status_code == 200, r.text
        c = r.json()
        cid = c["id"]
        assert c["name"] == payload["name"]
        assert c["balance"] == 0
        # Verify persistence via GET
        r2 = session.get(f"{API}/customers/{cid}")
        assert r2.status_code == 200
        assert r2.json()["name"] == payload["name"]
        # cleanup
        session.delete(f"{API}/customers/{cid}")

    def test_create_customer_missing_name(self, session):
        r = session.post(f"{API}/customers", json={"name": " ", "phone": "+91999"})
        assert r.status_code == 400

    def test_transaction_credit_then_payment_and_running_balance(self, session):
        # Create fresh customer to keep balance math clean
        r = session.post(f"{API}/customers", json={"name": "TEST_Tx User", "phone": "+919112233445"})
        assert r.status_code == 200
        cid = r.json()["id"]
        try:
            # credit 500
            r1 = session.post(f"{API}/customers/{cid}/transactions",
                              json={"type": "credit", "amount": 500, "note": "TEST"})
            assert r1.status_code == 200, r1.text
            assert r1.json()["running_balance"] == 500
            time.sleep(0.05)
            # payment 200 (date must be after credit)
            r2 = session.post(f"{API}/customers/{cid}/transactions",
                              json={"type": "payment", "amount": 200, "note": "TEST"})
            assert r2.status_code == 200
            assert r2.json()["running_balance"] == 300

            # GET history should be desc with running_balance correct
            rl = session.get(f"{API}/customers/{cid}/transactions")
            assert rl.status_code == 200
            txs = rl.json()
            assert len(txs) == 2
            # Most recent first => payment
            assert txs[0]["type"] == "payment"
            assert txs[0]["running_balance"] == 300
            assert txs[1]["type"] == "credit"
            assert txs[1]["running_balance"] == 500

            # Customer balance via GET
            rc = session.get(f"{API}/customers/{cid}")
            assert rc.json()["balance"] == 300
        finally:
            session.delete(f"{API}/customers/{cid}")

    def test_transaction_invalid_amount(self, session):
        r = session.post(f"{API}/customers", json={"name": "TEST_Invalid Tx", "phone": "+91000"})
        cid = r.json()["id"]
        try:
            r1 = session.post(f"{API}/customers/{cid}/transactions",
                              json={"type": "credit", "amount": 0})
            assert r1.status_code == 400
        finally:
            session.delete(f"{API}/customers/{cid}")

    def test_tx_for_missing_customer(self, session):
        r = session.post(f"{API}/customers/nonexistent-id-xyz/transactions",
                         json={"type": "credit", "amount": 100})
        assert r.status_code == 404


# ---------- Voice text parse ----------
class TestVoiceTextParse:
    def test_parse_credit(self, session):
        r = session.post(f"{API}/voice/parse-text", json={"text": "Ramesh 450 udhaar"})
        assert r.status_code == 200
        data = r.json()
        assert data["type"] == "credit"
        assert data["amount"] == 450
        assert data["matched_customer_name"] == "Ramesh Kumar", data
        assert data["matched_customer_id"]

    def test_parse_payment(self, session):
        r = session.post(f"{API}/voice/parse-text", json={"text": "Suresh 200 payment"})
        assert r.status_code == 200
        data = r.json()
        assert data["type"] == "payment"
        assert data["amount"] == 200
        # Suresh Patel should match
        assert data["matched_customer_name"] == "Suresh Patel"


# ---------- Seed ----------
class TestSeed:
    def test_reseed(self, session):
        r = session.post(f"{API}/seed")
        assert r.status_code == 200
        assert r.json()["customers"] == 5
        # Verify by list
        cs = session.get(f"{API}/customers").json()
        names = {c["name"] for c in cs}
        for nm in ["Ramesh Kumar", "Suresh Patel", "Priya Sharma", "Mohan Lal", "Anita Devi"]:
            assert nm in names
