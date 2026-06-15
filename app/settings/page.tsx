"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSettings, updateSettings } from "@/lib/api";

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    min_profit_rate: 15,
    min_profit_amount: 500,
    min_drop_rate: 20,
    max_rank: 100000,
    amazon_fee_rate: 15.4,
    line_user_id: "",
    discord_webhook_url: "",
    notify_enabled: false,
  });

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.replace("/login"); return; }
    getSettings()
      .then((d) => {
        if (d) setForm({
          min_profit_rate: d.min_profit_rate ?? 15,
          min_profit_amount: d.min_profit_amount ?? 500,
          min_drop_rate: d.min_drop_rate ?? 20,
          max_rank: d.max_rank ?? 100000,
          amazon_fee_rate: d.amazon_fee_rate ?? 15.4,
          line_user_id: d.line_user_id || "",
          discord_webhook_url: d.discord_webhook_url || "",
          notify_enabled: d.notify_enabled ?? false,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSettings(form);
      setMessage("設定を保存しました ✅");
      setTimeout(() => setMessage(""), 3000);
    } catch {
      setMessage("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <h1 className="text-lg font-bold text-orange-500">設定</h1>
        <button onClick={() => router.push("/dashboard")} className="text-sm text-gray-500 hover:text-gray-900">
          ← ダッシュボードに戻る
        </button>
      </header>
      <main className="max-w-xl mx-auto px-4 py-8">
        {loading ? <p className="text-gray-500">読み込み中...</p> : (
          <form onSubmit={handleSave} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5 shadow-sm">

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">最低利益率（%）</label>
              <input type="number" value={form.min_profit_rate}
                onChange={(e) => setForm({ ...form, min_profit_rate: Number(e.target.value) })}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
                min={0} max={100} />
              <p className="text-xs text-gray-500 mt-1">この利益率以上の商品のみ表示・通知</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">最低利益額（円）</label>
              <input type="number" value={form.min_profit_amount}
                onChange={(e) => setForm({ ...form, min_profit_amount: Number(e.target.value) })}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
                min={0} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">最低値下がり率（%）</label>
              <input type="number" value={form.min_drop_rate}
                onChange={(e) => setForm({ ...form, min_drop_rate: Number(e.target.value) })}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
                min={5} max={90} />
              <p className="text-xs text-gray-500 mt-1">通常価格からこの割合以上下がった商品を検索</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">最大ランキング（売れ筋フィルター）</label>
              <input type="number" value={form.max_rank}
                onChange={(e) => setForm({ ...form, max_rank: Number(e.target.value) })}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
                min={1000} step={10000} />
              <p className="text-xs text-gray-500 mt-1">この順位以内の商品のみ対象（例: 100000 = 売れ筋10万位以内）</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Amazon手数料率（%）</label>
              <input type="number" value={form.amazon_fee_rate}
                onChange={(e) => setForm({ ...form, amazon_fee_rate: Number(e.target.value) })}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
                min={0} max={100} step={0.1} />
            </div>

            <div className="border-t border-gray-200 pt-4">
              <p className="text-xs font-bold text-orange-500 uppercase tracking-wide mb-3">通知設定</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Discord Webhook URL
                  </label>
                  <input type="url" value={form.discord_webhook_url}
                    onChange={(e) => setForm({ ...form, discord_webhook_url: e.target.value })}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="https://discord.com/api/webhooks/..." />
                  <p className="text-xs text-gray-500 mt-1">
                    Discordのサーバー設定 → 連携サービス → ウェブフックからURLを取得
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">LINE ユーザーID（通知先）</label>
                  <input type="text" value={form.line_user_id}
                    onChange={(e) => setForm({ ...form, line_user_id: e.target.value })}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
                  <p className="text-xs text-gray-500 mt-1">LINE Developers コンソールまたはLINE Botで取得</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input type="checkbox" id="notify" checked={form.notify_enabled}
                onChange={(e) => setForm({ ...form, notify_enabled: e.target.checked })}
                className="w-4 h-4 accent-orange-500" />
              <label htmlFor="notify" className="text-sm font-medium text-gray-700">
                刈り取り候補が見つかったらDiscord・LINEで即時通知する
              </label>
            </div>

            {message && <p className="text-sm font-medium text-green-600">{message}</p>}

            <button type="submit" disabled={saving}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-50 transition">
              {saving ? "保存中..." : "設定を保存"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
