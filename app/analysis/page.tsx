"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getHistoryAnalysis, downloadHistoryCsv } from "@/lib/api";

type Repeat = {
  asin: string; times: number; name: string;
  history: { date: string; drop: number; price: number; name: string }[];
};
type Analysis = {
  count: number;
  period?: { from: string; to: string; days: number; per_day: number };
  unique_asins?: number;
  by_weekday?: { label: string; count: number }[];
  by_hour?: { hour: number; count: number }[];
  by_date?: { date: string; count: number }[];
  drop_distribution?: { range: string; count: number }[];
  drop_stats?: { avg: number; max: number; min: number };
  repeats?: Repeat[];
};

function Bars({ data, labelKey, max }: {
  data: { count: number; [k: string]: string | number }[];
  labelKey: string; max: number;
}) {
  return (
    <div className="space-y-1">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="w-14 shrink-0 text-gray-500 text-right">{String(d[labelKey])}</span>
          <div className="flex-1 bg-gray-100 rounded h-4 relative overflow-hidden">
            <div className="bg-orange-400 h-4 rounded transition-all"
              style={{ width: max ? `${(d.count / max) * 100}%` : "0%" }} />
          </div>
          <span className="w-8 shrink-0 text-gray-700 font-mono">{d.count}</span>
        </div>
      ))}
    </div>
  );
}

export default function AnalysisPage() {
  const router = useRouter();
  const [a, setA] = useState<Analysis | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.replace("/login"); return; }
    getHistoryAnalysis().then(setA).catch((e) => {
      if ((e?.message || "").includes("401")) router.replace("/login");
      else setErr("集計の取得に失敗しました");
    });
  }, [router]);

  const maxWd = Math.max(1, ...(a?.by_weekday?.map((x) => x.count) || [1]));
  const maxHr = Math.max(1, ...(a?.by_hour?.map((x) => x.count) || [1]));
  const maxDrop = Math.max(1, ...(a?.drop_distribution?.map((x) => x.count) || [1]));

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <h1 className="text-lg font-bold text-orange-500">📈 値下がりの傾向分析</h1>
        <button onClick={() => router.push("/dashboard")} className="text-sm text-gray-500 hover:text-gray-900">
          ← ダッシュボードに戻る
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {err && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">{err}</div>}

        {a && a.count === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
            <p className="text-gray-500">まだ検知履歴がありません</p>
            <p className="text-xs text-gray-400 mt-2">
              値下がりを検知してDiscordに通知した商品が蓄積されると、ここに傾向が表示されます
            </p>
          </div>
        )}

        {a && a.count > 0 && (
          <>
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex justify-between items-start gap-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
                  <div>
                    <p className="text-xs text-gray-500">検知件数</p>
                    <p className="text-2xl font-bold text-orange-500">{a.count}<span className="text-sm text-gray-400 ml-1">件</span></p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">対象商品数</p>
                    <p className="text-2xl font-bold">{a.unique_asins}<span className="text-sm text-gray-400 ml-1">品</span></p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">1日あたり</p>
                    <p className="text-2xl font-bold">{a.period?.per_day}<span className="text-sm text-gray-400 ml-1">件</span></p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">平均値下がり率</p>
                    <p className="text-2xl font-bold text-red-500">{a.drop_stats?.avg}<span className="text-sm text-gray-400 ml-1">%</span></p>
                  </div>
                </div>
                <button onClick={() => downloadHistoryCsv().catch(() => setErr("CSVの取得に失敗しました"))}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition shrink-0">
                  📊 CSVで書き出す
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                期間: {a.period?.from} 〜 {a.period?.to}（{a.period?.days}日間）／
                値下がり率の幅 {a.drop_stats?.min}% 〜 {a.drop_stats?.max}%
              </p>
              {a.count < 20 && (
                <p className="text-xs text-orange-600 mt-1">
                  ※ 件数が少ないため、以下の傾向は参考程度にご覧ください
                </p>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <h2 className="font-bold text-gray-900 mb-3">曜日別の検知件数</h2>
                <Bars data={a.by_weekday || []} labelKey="label" max={maxWd} />
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <h2 className="font-bold text-gray-900 mb-3">値下がり率の分布</h2>
                <Bars data={a.drop_distribution || []} labelKey="range" max={maxDrop} />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h2 className="font-bold text-gray-900 mb-3">時間帯別の検知件数</h2>
              <Bars
                data={(a.by_hour || []).filter((h) => h.count > 0).map((h) => ({ ...h, label: `${h.hour}時` }))}
                labelKey="label" max={maxHr}
              />
              <p className="text-xs text-gray-400 mt-2">
                ※ スキャン間隔の影響を受けます。検知した時刻＝値下がりが起きた時刻とは限りません
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h2 className="font-bold text-gray-900">繰り返し値下がりする商品</h2>
              <p className="text-xs text-gray-500 mt-1 mb-3">
                2回以上検知された商品。<b>周期的に下がって戻る</b>動きをしている可能性が高く、狙い目です
              </p>
              {(a.repeats || []).length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">
                  同じ商品が2回以上検知された記録はまだありません
                </p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {(a.repeats || []).map((r) => (
                    <div key={r.asin} className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-700 shrink-0">
                          {r.times}回
                        </span>
                        <p className="text-sm font-medium text-gray-900 truncate">{r.name}</p>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                        {r.history.map((h, i) => (
                          <span key={i}>
                            {h.date} <b className="text-red-500">-{h.drop}%</b> ¥{h.price?.toLocaleString()}
                          </span>
                        ))}
                      </div>
                      <a href={`https://keepa.com/#!product/5-${r.asin}`} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline">Keepaで価格推移を確認</a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h2 className="font-bold text-gray-900 mb-3">日別の検知件数</h2>
              <Bars
                data={(a.by_date || []).map((d) => ({ ...d, label: d.date.slice(5) }))}
                labelKey="label" max={Math.max(1, ...(a.by_date?.map((x) => x.count) || [1]))}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
