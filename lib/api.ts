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
  if (!res.ok) throw new Error("取得失敗");
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
