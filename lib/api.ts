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

export async function getHistoryAnalysis() {
  const res = await fetch(`${BASE_URL}/api/deals/analysis`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

export async function downloadHistoryCsv() {
  const res = await fetch(`${BASE_URL}/api/deals/export`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`${res.status}`);
  const blob = await res.blob();
  const d = res.headers.get("Content-Disposition") || "";
  const m = d.match(/filename="(.+?)"/);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = m ? m[1] : "harvest_history.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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

export async function prunePool() {
  const res = await fetch(`${BASE_URL}/api/pool/prune`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

export async function resetPool() {
  const res = await fetch(`${BASE_URL}/api/pool/reset`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

export async function getPoolBudget() {
  const res = await fetch(`${BASE_URL}/api/pool/budget`, { headers: authHeaders() });
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

// ─── Yahoo!仕入れモード ───

export async function registerSeed(asinOrUrl: string) {
  const res = await fetch(`${BASE_URL}/api/sourcing/seed`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ asin_or_url: asinOrUrl }),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

export async function getSourcingSeeds() {
  const res = await fetch(`${BASE_URL}/api/sourcing/seeds`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

export async function getSourcingCandidates() {
  const res = await fetch(`${BASE_URL}/api/sourcing/candidates`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

export async function rescanYahoo(scenario = "auto") {
  const res = await fetch(`${BASE_URL}/api/sourcing/rescan`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ scenario }),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

export async function downloadSourcingCsv(onlyProfitable = true) {
  const res = await fetch(
    `${BASE_URL}/api/sourcing/export?only_profitable=${onlyProfitable}`,
    { headers: authHeaders() }
  );
  if (!res.ok) throw new Error(`${res.status}`);
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="(.+?)"/);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = match ? match[1] : "sourcing.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function getRescanStatus() {
  const res = await fetch(`${BASE_URL}/api/sourcing/rescan-status`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

export async function getYahooCampaign() {
  const res = await fetch(`${BASE_URL}/api/sourcing/campaign`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

export async function deleteSourcingCandidate(id: string) {
  const res = await fetch(`${BASE_URL}/api/sourcing/candidate/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}
