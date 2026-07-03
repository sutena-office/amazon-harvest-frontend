"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getDeals, runHarvest, deleteDeal, logout } from "@/lib/api";

type Deal = {
  id: string;
  amazon_asin: string;
  product_name: string;
  current_price: number;
  regular_price: number;
  price_drop_rate: number;
  amazon_rank: number;
  profit_amount: number;
  profit_rate: number;
  amazon_fee_rate: number;
  found_at: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.replace("/login"); return; }
    fetchDeals();
  }, [router]);

  const fetchDeals = () => {
    setLoading(true);
    getDeals()
      .then(setDeals)
      .catch((e) => {
        const msg = e?.message || "";
        if (msg.includes("401") || msg.includes("認証")) {
          router.replace("/login");
        }
      })
      .finally(() => setLoading(false));
  };

  const handleRun = async () => {
    setRunning(true);
    setMessage("");
    try {
      await runHarvest();
      setMessage("スキャン開始！1〜2分後にページを更新してください。");
      setTimeout(() => { setMessage(""); fetchDeals(); }, 90000);
    } catch {
      setMessage("スキャンの開始に失敗しました。");
    } finally {
      setRunning(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteDeal(id);
    setDeals(deals.filter((d) => d.id !== id));
  };

  const formatTime = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔥</span>
          <h1 className="text-lg font-bold text-orange-500">Amazon刈り取りモニター</h1>
        </div>
        <div className="flex gap-3 items-center">
          <button onClick={() => router.push("/pool")} className="text-sm text-gray-500 hover:text-gray-900">📡 監視プール</button>
          <button onClick={() => router.push("/settings")} className="text-sm text-gray-500 hover:text-gray-900">設定</button>
          <button onClick={() => { logout(); router.replace("/login"); }} className="text-sm text-red-500 hover:text-red-400">ログアウト</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">刈り取り候補一覧</h2>
            <p className="text-sm text-gray-500 mt-0.5">30分ごとに自動スキャン。即時購入で利益確定。</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchDeals}
              className="px-3 py-2 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 text-sm rounded-lg transition"
            >
              🔄 更新
            </button>
            <button
              onClick={handleRun}
              disabled={running}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition"
            >
              {running ? "スキャン中..." : "⚡ 今すぐスキャン"}
            </button>
          </div>
        </div>

        {message && (
          <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-700 text-sm px-4 py-2 rounded-lg">
            {message}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500 text-center py-12">読み込み中...</p>
        ) : deals.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-gray-700 font-medium">現在、刈り取り候補はありません</p>
            <p className="text-sm text-gray-500 mt-2">「今すぐスキャン」を押すか、30分ごとに自動検索されます</p>
          </div>
        ) : (
          <div className="space-y-3">
            {deals.map((d) => (
              <div key={d.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:border-orange-400 transition shadow-sm">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm leading-snug">{d.product_name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{formatTime(d.found_at)} 発見　ランク {d.amazon_rank.toLocaleString()}位</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${d.profit_rate >= 20 ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                      利益率 {d.profit_rate}%
                    </span>
                    <span className="text-xs font-bold px-2 py-1 rounded-full bg-red-100 text-red-700">
                      📉 {d.price_drop_rate}%OFF
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                    <p className="text-gray-500 text-xs font-medium">🛒 仕入れ値（現在価格）</p>
                    <p className="font-bold text-orange-500 text-base">¥{d.current_price.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                    <p className="text-gray-500 text-xs font-medium">💰 転売価格（通常価格）</p>
                    <p className="font-bold text-gray-900 text-base">¥{d.regular_price.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">手数料 {d.amazon_fee_rate ?? 15.4}%</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                    <p className="text-gray-500 text-xs font-medium">📈 予想利益額</p>
                    <p className={`font-bold text-base ${d.profit_amount > 0 ? "text-green-600" : "text-red-600"}`}>
                      ¥{d.profit_amount.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                    <p className="text-gray-500 text-xs font-medium">📉 値下がり幅</p>
                    <p className="font-bold text-red-600 text-base">
                      ¥{(d.regular_price - d.current_price).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex gap-3 items-center">
                  <a
                    href={`https://www.amazon.co.jp/dp/${d.amazon_asin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-gray-900 text-xs font-bold rounded-lg transition"
                  >
                    🛒 今すぐ購入する
                  </a>
                  <a
                    href={`https://keepa.com/#!product/5-${d.amazon_asin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Keepaで価格推移を確認
                  </a>
                  <button
                    onClick={() => handleDelete(d.id)}
                    className="ml-auto text-xs text-gray-400 hover:text-red-500 transition"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
