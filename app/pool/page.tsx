"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  getPoolCategories, previewPool, buildPool, importPoolCsv, getPoolStatus, getPoolList, registerTrackers, prunePool,
} from "@/lib/api";

const DEFAULT_EXCLUDE_NAMES = ["ミュージック", "デジタルミュージック"];

type Category = { id: number; name: string };
type Job = { id: string; status: string; total: number; screened: number; approved: number };
type WatchItem = {
  id: string; asin: string; product_name: string; median_price_90d: number;
  target_price: number; seller_count: number; amazon_in_stock: boolean;
  sales_rank: number; status: string;
};

export default function PoolPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCats, setSelectedCats] = useState<number[]>([]);
  const [excludedCats, setExcludedCats] = useState<number[]>([]);
  const [pruning, setPruning] = useState(false);
  const [form, setForm] = useState({ min_price: 5000, max_price: 50000, min_sellers: 3, max_rank: 50000 });
  const [preview, setPreview] = useState<{ total: number } | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [building, setBuilding] = useState(false);
  const [message, setMessage] = useState("");
  const [job, setJob] = useState<Job | null>(null);
  const [trackingCount, setTrackingCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [registering, setRegistering] = useState(false);
  const [watchList, setWatchList] = useState<WatchItem[]>([]);
  const [csvText, setCsvText] = useState("");
  const [debugInfo, setDebugInfo] = useState("");

  const refreshStatus = useCallback(() => {
    setDebugInfo(`取得中... ${new Date().toLocaleTimeString("ja-JP")}`);
    getPoolStatus()
      .then((d) => {
        setJob(d.job);
        setTrackingCount(d.tracking_count + d.approved_count);
        setApprovedCount(d.approved_count);
        setDebugInfo(
          `[${new Date().toLocaleTimeString("ja-JP")}] tracking=${d.tracking_count} approved=${d.approved_count} job_status=${d.job ? d.job.status : "null"} job_total=${d.job ? d.job.total : "-"} job_screened=${d.job ? d.job.screened : "-"}`
        );
      })
      .catch((e) => {
        const msg = e?.message || "unknown";
        setDebugInfo(`[${new Date().toLocaleTimeString("ja-JP")}] エラー: ${msg}`);
        if (msg.includes("401")) {
          setMessage("ログインの有効期限が切れました。再ログインしてください。");
          router.replace("/login");
        } else {
          setMessage(`ステータス取得エラー(${msg})`);
        }
      });
    getPoolList()
      .then(setWatchList)
      .catch((e) => setMessage((prev) => prev || `リスト取得エラー(${e?.message || "unknown"})`));
  }, [router]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.replace("/login"); return; }
    getPoolCategories()
      .then((cats: Category[]) => {
        setCategories(cats);
        const defaults = cats.filter((c) => DEFAULT_EXCLUDE_NAMES.includes(c.name)).map((c) => c.id);
        setExcludedCats(defaults);
      })
      .catch(() => {});
    refreshStatus();
    const timer = setInterval(refreshStatus, 30000);
    return () => clearInterval(timer);
  }, [router, refreshStatus]);

  const criteria = () => ({ ...form, categories: selectedCats, exclude_categories: excludedCats });

  const handlePreview = async () => {
    setPreviewing(true);
    setMessage("");
    try {
      const d = await previewPool(criteria());
      setPreview(d);
    } catch {
      setMessage("プレビューに失敗しました");
    } finally {
      setPreviewing(false);
    }
  };

  const handleBuild = async () => {
    if (!confirm("プール構築を開始しますか？審査には数時間かかります（トークンを消費します）")) return;
    setBuilding(true);
    setMessage("");
    try {
      const d = await buildPool(criteria());
      setMessage(d.message);
      refreshStatus();
    } catch {
      setMessage("構築の開始に失敗しました");
    } finally {
      setBuilding(false);
    }
  };

  const handleCsvImport = async () => {
    const asins = csvText.split(/[\s,;]+/).map((s) => s.trim()).filter((s) => /^[A-Z0-9]{10}$/i.test(s));
    if (asins.length === 0) { setMessage("有効なASINが見つかりません"); return; }
    try {
      const d = await importPoolCsv(asins);
      setMessage(d.started ? `${d.total}件の審査を開始しました` : d.message);
      setCsvText("");
      refreshStatus();
    } catch {
      setMessage("インポートに失敗しました");
    }
  };

  const handleRegister = async () => {
    setRegistering(true);
    setMessage("");
    try {
      const d = await registerTrackers();
      setMessage(d.ok ? `トラッカー登録: ${d.registered}/${d.total}件 完了` : `登録失敗: ${d.message}`);
      refreshStatus();
    } catch {
      setMessage("トラッカー登録に失敗しました");
    } finally {
      setRegistering(false);
    }
  };

  const toggleCat = (id: number) =>
    setSelectedCats((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);

  const toggleExcludeCat = (id: number) =>
    setExcludedCats((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);

  const handlePrune = async () => {
    if (!confirm("輸入品/音楽系に該当する登録済み商品をKeepaトラッカーごと削除します。よろしいですか？")) return;
    setPruning(true);
    setMessage("");
    try {
      const d = await prunePool();
      setMessage(`整理完了: ${d.checked}件中${d.removed}件を除外しました`);
      refreshStatus();
    } catch {
      setMessage("整理に失敗しました");
    } finally {
      setPruning(false);
    }
  };

  const jobRunning = job?.status === "running";

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <h1 className="text-lg font-bold text-orange-500">📡 監視プール</h1>
        <button onClick={() => router.push("/dashboard")} className="text-sm text-gray-500 hover:text-gray-900">
          ← ダッシュボードに戻る
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {debugInfo && (
          <div className="bg-gray-900 text-green-400 text-xs font-mono px-4 py-2 rounded-lg break-all">
            {debugInfo}
          </div>
        )}

        {/* 稼働状況 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">監視中の商品</p>
              <p className="text-3xl font-bold text-orange-500">{trackingCount.toLocaleString()}<span className="text-base text-gray-500 ml-1">件</span></p>
            </div>
            {jobRunning && job && (
              <div className="text-right">
                <p className="text-sm font-semibold text-blue-600">審査バッチ実行中...</p>
                <p className="text-xs text-gray-500 mt-1">{job.screened.toLocaleString()} / {job.total.toLocaleString()} 件（合格 {job.approved.toLocaleString()}）</p>
                <div className="w-48 bg-gray-100 rounded-full h-2 mt-2">
                  <div className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${job.total ? Math.round((job.screened / job.total) * 100) : 0}%` }} />
                </div>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-3">
            プールの商品はKeepaが24時間監視し、目標仕入れ価格（90日中央値×0.77）を割った瞬間に即時通知されます
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={handlePrune} disabled={pruning}
              className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-red-50 hover:border-red-300 text-gray-700 text-xs font-semibold rounded-lg disabled:opacity-50 transition">
              {pruning ? "整理中..." : "🧹 輸入品/音楽系を登録済みプールから除外"}
            </button>
            <button onClick={handleRegister} disabled={registering}
              className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-orange-50 hover:border-orange-300 text-gray-700 text-xs font-semibold rounded-lg disabled:opacity-50 transition">
              {registering ? "更新中..." : "🔁 トラッカー設定を一括更新"}
            </button>
          </div>
          {approvedCount > 0 && !jobRunning && (
            <div className="mt-3 flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2.5">
              <p className="text-sm text-yellow-800 flex-1">
                審査合格済みでトラッカー未登録の商品が <b>{approvedCount}件</b> あります
              </p>
              <button onClick={handleRegister} disabled={registering}
                className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition shrink-0">
                {registering ? "登録中..." : "🔗 トラッカー登録を実行"}
              </button>
            </div>
          )}
        </div>

        {/* プール構築条件 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-5">
          <h2 className="font-bold text-gray-900">プール構築条件</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">価格帯（円）</label>
              <div className="flex items-center gap-2">
                <input type="number" value={form.min_price}
                  onChange={(e) => setForm({ ...form, min_price: Number(e.target.value) })}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                <span className="text-gray-400 shrink-0">〜</span>
                <input type="number" value={form.max_price}
                  onChange={(e) => setForm({ ...form, max_price: Number(e.target.value) })}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">ランキング上限</label>
              <input type="number" value={form.max_rank}
                onChange={(e) => setForm({ ...form, max_rank: Number(e.target.value) })}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">新品出品者数（Amazon込み）</label>
              <input type="number" value={form.min_sellers}
                onChange={(e) => setForm({ ...form, min_sellers: Number(e.target.value) })}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                min={1} />
              <p className="text-xs text-gray-500 mt-1">この人数以上 = 一般セラーが健全に相乗り中</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">カテゴリ（未選択 = 全カテゴリ）</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button key={c.id} onClick={() => toggleCat(c.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                    selectedCats.includes(c.id)
                      ? "bg-orange-500 text-white border-orange-500"
                      : "bg-white text-gray-600 border-gray-300 hover:border-orange-400"
                  }`}>
                  {c.name}
                </button>
              ))}
              {categories.length === 0 && <p className="text-xs text-gray-400">カテゴリ読み込み中...</p>}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              おすすめ: ゲーム・おもちゃ・ホビー等のシュリンク付き商品（新品規約の壁をクリアしやすい）
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">除外カテゴリ（目利きできない商材を対象外に）</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button key={c.id} onClick={() => toggleExcludeCat(c.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                    excludedCats.includes(c.id)
                      ? "bg-red-500 text-white border-red-500"
                      : "bg-white text-gray-600 border-gray-300 hover:border-red-400"
                  }`}>
                  {c.name}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              ミュージック・デジタルミュージックはデフォルトで除外済み。タイトルに「輸入盤」「並行輸入」等が含まれる商品も自動で除外します。
            </p>
          </div>

          <div className="flex gap-3 items-center pt-2">
            <button onClick={handlePreview} disabled={previewing || jobRunning}
              className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg disabled:opacity-50 transition">
              {previewing ? "確認中..." : "🔍 件数プレビュー"}
            </button>
            {preview && (
              <span className="text-sm text-gray-700">該当: <b className="text-orange-500">{preview.total.toLocaleString()}</b> 件</span>
            )}
            <button onClick={handleBuild} disabled={building || jobRunning}
              className="ml-auto px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition">
              {jobRunning ? "審査実行中..." : building ? "開始中..." : "⚡ プール構築を開始"}
            </button>
          </div>
        </div>

        {/* CSVインポート */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-3">
          <h2 className="font-bold text-gray-900">CSV / ASINリストから追加（手動）</h2>
          <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)}
            placeholder={"B0XXXXXXXX\nB0YYYYYYYY\n（改行・カンマ・スペース区切りOK。KeepaサイトのProduct FinderのエクスポートCSVを貼り付けても可）"}
            className="w-full h-28 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-400" />
          <button onClick={handleCsvImport} disabled={jobRunning}
            className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg disabled:opacity-50 transition">
            📥 インポートして審査
          </button>
        </div>

        {message && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm px-4 py-2 rounded-lg">{message}</div>
        )}

        {/* 監視リスト */}
        {watchList.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-3">監視中の商品（ランク上位100件）</h2>
            <div className="divide-y divide-gray-100">
              {watchList.map((w) => (
                <div key={w.id} className="py-2.5 flex items-center gap-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{w.product_name || w.asin}</p>
                    <p className="text-xs text-gray-500">
                      ランク {w.sales_rank?.toLocaleString()}位 ・ 出品者{w.seller_count}人
                      {w.amazon_in_stock && <span className="text-orange-500 font-semibold"> ・ Amazon販売中</span>}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-500">通常 ¥{w.median_price_90d?.toLocaleString()}</p>
                    <p className="text-xs font-bold text-green-600">目標 ¥{w.target_price?.toLocaleString()}以下</p>
                  </div>
                  <a href={`https://keepa.com/#!product/5-${w.asin}`} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline shrink-0">グラフ</a>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
