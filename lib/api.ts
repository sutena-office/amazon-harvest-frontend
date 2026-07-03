const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken() {
  return localStorage.getItem("access_token") || "";
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

export async function login(email: string, password: string) {
  const res = await fetch(`${BASE_URL}/api/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error("ログイン失敗");
  return res.json();
}

export function logout() {
  localStorage.removeItem("access_token");
}

export async function getDeals() {
  const res = await fetch(`${BASE_URL}/api/deals/`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

export async function runHarvest() {
  const res = await fetch(`${BASE_URL}/api/deals/run`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("実行失敗");
  return res.json();
}

export async function deleteDeal(id: string) {
  const res = await fetch(`${BASE_URL}/api/deals/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("削除失敗");
  return res.json();
}

export async function getSettings() {
  const res = await fetch(`${BASE_URL}/api/settings/`, { headers: authHeaders() });
  if (!res.ok) throw new Error("取得失敗");
  return res.json();
}

export async function updateSettings(data: Record<string, unknown>) {
  const res = await fetch(`${BASE_URL}/api/settings/`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("保存失敗");
  return res.json();
}

// ─── 監視プール ───

export async function getPoolCategories() {
  const res = await fetch(`${BASE_URL}/api/pool/categories`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

export async function previewPool(criteria: Record<string, unknown>) {
  const res = await fetch(`${BASE_URL}/api/pool/preview`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(criteria),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

export async function buildPool(criteria: Record<string, unknown>) {
  const res = await fetch(`${BASE_URL}/api/pool/build`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(criteria),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

export async function importPoolCsv(asins: string[]) {
  const res = await fetch(`${BASE_URL}/api/pool/import-csv`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ asins }),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

export async function registerTrackers() {
  const res = await fetch(`${BASE_URL}/api/pool/register`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

export async function getPoolStatus() {
  const res = await fetch(`${BASE_URL}/api/pool/status`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

export async function getPoolList() {
  const res = await fetch(`${BASE_URL}/api/pool/list`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}
