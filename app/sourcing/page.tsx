"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  registerSeed, getSourcingSeeds, getSourcingCandidates, rescanYahoo, deleteSourcingCandidate,
} from "@/lib/api";

type Seed = {
  id: string; asin: string; title: string; brand: string;
  status: string; total: number; checked: number; hits: number;
};
type Candidate = {
  id: string; asin: string; jan: string; product_name: string;
  amazon_price: number; amazon_rank: number; est_monthly_sales: number;
  yahoo_price: number; yahoo_point: number; yahoo_effective: number;
  yahoo_url: string; yahoo_store: string;
  profit_amount: number; profit_rate: number;
  expected_monthly_profit: number; updated_at: string;
};

// プロの仕入れ日カレンダーに基づくキャンペーンプリセット
const CAMPAIGN_PRESETS = [
  { label: "通常日", percent: 0, cap: 0 },
  { label: "5のつく日 (+4%)", percent: 4, cap: 1000 },
  { label: "5のつく日+倍倍 (+9%)", percent: 9, cap: 3000 },
  { label: "超PayPay祭 (+12%)", percent: 12, cap: 5000 },
];

const MONTHLY_GOAL = 300000; // 月間目標利益（円）

export default function SourcingPage() {
  const router = useRouter();
  const [seedInput, setSeedInput] = useState("");
  const [seeds, setSeeds] = useState<Seed[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [rescanning, setRescanning] = useState(false);
  const [preset, setPreset] = useState(0);

  const refresh = useCallback(() => {
    getSourcingSeeds().then(setSeeds).catch(() => {});
    getSourcingCandidates().then(setCandidates).catch((e) => {
      if ((e?.message || "").includes("401")) router.replace("/login");
    });
  }, [router]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.replace("/login"); return; }
    refresh();
    const timer = setInterval(refresh, 30000);
    return () => clearInterval(timer);
  }, [router, refresh]);

  const handleSeed = async () => {
    if (!seedInput.trim()) return;
    setSubmitting(true);
    setMessage("");
    try {
      const d = await registerSeed(seedInput);
      setMessage(d.message);
      if (d.started) setSeedInput("");
      refresh();
    } catch {
      setMessage("種の登録に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRescan = async () => {
    setRescanning(true);
    setMessage("");
    try {
      const p = CAMPAIGN_PRESETS[preset];
      const d = await rescanYahoo(p.percent, p.cap);
      setMessage(d.message);
    } catch {
      setMessage("再スキャンの開始に失敗しました");
    } finally {
      setRescanning(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteSourcingCandidate(id).catch(() => {});
    setCandidates(candidates.filter((c) => c.id !== id));
  };

  const runningSeed = seeds.find((s) => s.status === "running");
  const profitable = candidates.filter((c) => c.profit_amount > 0);
  const totalExpected = profitable.reduce((sum, c) => sum + (c.expected_monthly_profit || 0), 0);
  const goalPct = Math.min(100, Math.round((totalExpected / MONTHLY_GOAL) * 100));

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <h1 className="text-lg font-bold text-blue-600">🛒 Yahoo!仕入れモード</h1>
        <button onClick={() => router.push("/dashboard")} className="text-sm text-gray-500 hover:text-gray-900">
          ← ダッシュボードに戻る
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* 月間目標トラッカー */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-sm text-gray-500">月間期待利益（利益 × 月販目安の合計）</p>
              <p className="text-3xl font-bold text-blue-600">
                ¥{totalExpected.toLocaleString()}
                <span className="text-base text-gray-400 font-normal ml-2">/ 目標 ¥{MONTHLY_GOAL.toLocaleString()}</span>
              </p>
            </div>
            <p className={`text-2xl font-bold ${goalPct >= 100 ? "text-green-600" : "text-gray-400"}`}>{goalPct}%</p>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div className={`h-3 rounded-full transition-all ${goalPct >= 100 ? "bg-green-500" : "bg-blue-500"}`}
              style={{ width: `${goalPct}%` }} />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            利益2,000円×月販30個の商品を5つ確保できれば月30万円に到達します。全商品を扱う必要はなく、上位の当たり商品に絞るのがプロの型です
          </p>
        </div>

        {/* 種の登録 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-3">
          <h2 className="font-bold text-gray-900">モデル商品（種）を登録</h2>
          <p className="text-sm text-gray-500">
            うまくいっている商品（例: 毎月売れているプリンター）のASINかAmazonのURLを入れると、
            <b>それに似た商品</b>を自動で発掘し、Yahoo!ショッピングのポイント込み実質価格と比較します。
          </p>
          <div className="flex gap-2">
            <input type="text" value={seedInput}
              onChange={(e) => setSeedInput(e.target.value)}
              placeholder="B0XXXXXXXX または https://www.amazon.co.jp/dp/..."
              className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <button onClick={handleSeed} disabled={submitting || !!runningSeed}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition shrink-0">
              {submitting ? "分析中..." : "🌱 種にして発掘開始"}
            </button>
          </div>

          {runningSeed && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
              <p className="text-sm font-semibold text-blue-700">発掘中: {runningSeed.title?.slice(0, 50)}</p>
              <p className="text-xs text-gray-500 mt-1">
                {runningSeed.checked} / {runningSeed.total} 件チェック済み（利益あり {runningSeed.hits} 件）
              </p>
              <div className="w-full bg-white rounded-full h-2 mt-2">
                <div className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${runningSeed.total ? Math.round((runningSeed.checked / runningSeed.total) * 100) : 0}%` }} />
              </div>
            </div>
          )}

          {seeds.filter((s) => s.status === "done").slice(0, 3).map((s) => (
            <p key={s.id} className="text-xs text-gray-500">
              ✅ {s.title?.slice(0, 40)}（{s.brand}） — {s.checked}件中 利益あり{s.hits}件
            </p>
          ))}
        </div>

        {message && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm px-4 py-2 rounded-lg">{message}</div>
        )}

        {/* 候補リスト */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="font-bold text-gray-900">仕入れ候補（利益順）</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                実質仕入れ値 = Yahoo!価格 − ポイント ／ 利益 = Amazon売価×82% − 実質仕入れ値。毎日自動で再チェックされます
              </p>
            </div>
            <div className="flex gap-2 items-center shrink-0">
              <select value={preset} onChange={(e) => setPreset(Number(e.target.value))}
                className="bg-white border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                {CAMPAIGN_PRESETS.map((p, i) => (
                  <option key={p.label} value={i}>{p.label}</option>
                ))}
              </select>
              <button onClick={handleRescan} disabled={rescanning}
                className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg disabled:opacity-50 transition">
                {rescanning ? "開始中..." : "🔄 再チェック"}
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500 -mt-2 mb-4">
            仕入れ日を選んで再チェックすると、その日の還元率（付与上限込み）で利益を再計算します。プロの基本は「5のつく日・日曜・倍倍ストア対象品」に仕入れを寄せることです
          </p>

          {candidates.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">
              まだ候補がありません。上でモデル商品を登録してください
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {candidates.map((c) => (
                <div key={c.id} className={`py-3 ${c.profit_amount > 0 ? "" : "opacity-50"}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm leading-snug">{c.product_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        ランク {c.amazon_rank?.toLocaleString()}位 ・ 月販目安 <b className="text-gray-700">{c.est_monthly_sales || 0}個</b> ・ {c.yahoo_store}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-sm font-bold px-2.5 py-1 rounded-full ${
                        c.profit_amount >= 2000 ? "bg-green-100 text-green-700"
                        : c.profit_amount > 0 ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-500"
                      }`}>
                        {c.profit_amount > 0 ? `+¥${c.profit_amount.toLocaleString()}/個` : "利益なし"}
                      </span>
                      {(c.expected_monthly_profit || 0) > 0 && (
                        <span className="text-xs font-bold text-blue-600">
                          月間 ¥{c.expected_monthly_profit.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-600">
                    <span>Yahoo! ¥{c.yahoo_price?.toLocaleString()}（P{c.yahoo_point?.toLocaleString()}）
                      → 実質 <b className="text-blue-600">¥{c.yahoo_effective?.toLocaleString()}</b></span>
                    <span>Amazon売価 ¥{c.amazon_price?.toLocaleString()}</span>
                    <span>利益率 {c.profit_rate}%</span>
                  </div>
                  <div className="mt-2 flex gap-3 items-center">
                    <a href={c.yahoo_url} target="_blank" rel="noopener noreferrer"
                      className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded transition">
                      Yahoo!で仕入れる
                    </a>
                    <a href={`https://www.amazon.co.jp/dp/${c.asin}`} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline">Amazon</a>
                    <a href={`https://keepa.com/#!product/5-${c.asin}`} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline">Keepaグラフ</a>
                    <button onClick={() => handleDelete(c.id)}
                      className="ml-auto text-xs text-gray-400 hover:text-red-500 transition">削除</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {profitable.length > 0 && (
            <p className="text-xs text-gray-500 mt-4 text-right">
              利益が出る候補: <b className="text-green-600">{profitable.length}件</b> / 全{candidates.length}件
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
