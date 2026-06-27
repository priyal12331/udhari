// Lightweight API client. Uses EXPO_PUBLIC_BACKEND_URL from env.
const BASE = process.env.EXPO_PUBLIC_BACKEND_URL || '';

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const url = `${BASE}/api${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

export type Customer = {
  id: string; name: string; phone: string;
  balance: number; risk: 'green' | 'yellow' | 'red';
  last_transaction_at?: string | null; last_credit_at?: string | null;
  created_at: string;
};

export type Transaction = {
  id: string; customer_id: string; type: 'credit' | 'payment';
  amount: number; date: string; note: string; running_balance: number; created_at: string;
};

export type Dashboard = {
  total_outstanding: number; total_customers: number;
  customers_with_dues: number; customers: Customer[];
};

export type Setup = { shop_name: string; has_pin: boolean };

export const Api = {
  getSetup: () => request<Setup>('/setup'),
  postSetup: (shop_name: string, pin: string) =>
    request<Setup>('/setup', { method: 'POST', body: JSON.stringify({ shop_name, pin }) }),
  updateShopName: (shop_name: string) =>
    request<Setup>('/setup/shop-name', { method: 'PUT', body: JSON.stringify({ shop_name }) }),
  verifyPin: (pin: string) =>
    request<{ ok: boolean }>('/auth/verify-pin', { method: 'POST', body: JSON.stringify({ pin }) }),

  getDashboard: () => request<Dashboard>('/dashboard'),
  listCustomers: () => request<Customer[]>('/customers'),
  createCustomer: (name: string, phone: string) =>
    request<Customer>('/customers', { method: 'POST', body: JSON.stringify({ name, phone }) }),
  getCustomer: (id: string) => request<Customer>(`/customers/${id}`),
  deleteCustomer: (id: string) => request<{ ok: boolean }>(`/customers/${id}`, { method: 'DELETE' }),

  listTx: (cid: string) => request<Transaction[]>(`/customers/${cid}/transactions`),
  addTx: (cid: string, body: { type: 'credit' | 'payment'; amount: number; date?: string; note?: string }) =>
    request<Transaction>(`/customers/${cid}/transactions`, { method: 'POST', body: JSON.stringify(body) }),
  deleteTx: (id: string) => request<{ ok: boolean }>(`/transactions/${id}`, { method: 'DELETE' }),

  seed: () => request<{ ok: boolean; customers: number }>('/seed', { method: 'POST' }),

  parseVoiceText: (text: string) =>
    request<VoiceParse>('/voice/parse-text', { method: 'POST', body: JSON.stringify({ text }) }),

  // For audio upload — special handling because of FormData
  parseVoice: async (uri: string): Promise<VoiceParse> => {
    const form = new FormData();
    const filename = uri.split('/').pop() || 'audio.m4a';
    const ext = filename.split('.').pop()?.toLowerCase() || 'm4a';
    const mime = ext === 'wav' ? 'audio/wav' : ext === 'mp3' ? 'audio/mpeg' : 'audio/m4a';
    // @ts-ignore RN FormData file
    form.append('file', { uri, name: filename, type: mime });
    const res = await fetch(`${BASE}/api/voice/parse`, { method: 'POST', body: form as any });
    if (!res.ok) throw new Error(`Voice parse failed: ${res.status}`);
    return res.json();
  },
};

export type VoiceParse = {
  transcript: string;
  name?: string | null;
  amount?: number | null;
  type?: 'credit' | 'payment' | null;
  matched_customer_id?: string | null;
  matched_customer_name?: string | null;
};
