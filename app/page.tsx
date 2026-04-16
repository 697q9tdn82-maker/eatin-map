"use client";
"use client";

import { useState, useCallback } from "react";

const RANKS = [
  { id: "newcomer",  label: "ビギナー",    min: 0,  max: 2,  icon: "🌱", color: "#aaa",    bg: "#f5f5f5",    trust: 1 },
  { id: "regular",   label: "レギュラー",  min: 3,  max: 9,  icon: "☕", color: "#795548", bg: "#efebe9",    trust: 2 },
  { id: "veteran",   label: "ベテラン",    min: 10, max: 24, icon: "⭐", color: "#f4a261", bg: "#fff3e0",    trust: 3 },
  { id: "expert",    label: "エキスパート",min: 25, max: 49, icon: "🏅", color: "#0077b6", bg: "#e3f2fd",    trust: 4 },
  { id: "master",    label: "マスター",    min: 50, max: 999,icon: "👑", color: "#e63946", bg: "#ffeaea",    trust: 5 },
];

function getRank(count) {
  return RANKS.find(r => count >= r.min && count <= r.max) || RANKS[0];
}

function getNextRank(count) {
  const idx = RANKS.findIndex(r => count >= r.min && count <= r.max);
  return idx < RANKS.length - 1 ? RANKS[idx + 1] : null;
}

function calcScore(reportCount, helpedCount) {
  return reportCount + Math.floor((helpedCount || 0) * 0.5);
}

const SEARCH_RADIUS_METERS = 500;
const MAX_RESULTS = 20;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const searchCache = new Map();

function getCacheKey(area) { return area.trim().toLowerCase(); }

function getFromCache(area) {
  const key = getCacheKey(area);
  const cached = searchCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) { searchCache.delete(key); return null; }
  return cached.data;
}

function setToCache(area, data) {
  searchCache.set(getCacheKey(area), { data, timestamp: Date.now() });
}

const CONGESTION = [
  { id: "empty",   label: "空いてる", icon: "🟢", color: "#2d6a4f", bg: "#e8f5e9" },
  { id: "normal",  label: "普通",     icon: "🟡", color: "#b7950b", bg: "#fffbea" },
  { id: "crowded", label: "混んでる", icon: "🔴", color: "#c0392b", bg: "#ffeaea" },
];

const CHAIN_COLORS = {
  "セブン-イレブン": "#e63946",
  "ファミリーマート": "#00a040",
  "ローソン": "#0b5ea8",
  "ミニストップ": "#f4a261",
};
function getChainColor(name) {
  for (const [k, v] of Object.entries(CHAIN_COLORS)) if (name.includes(k)) return v;
  return "#888";
}

const MOCK_PLACES = [
  { place_id: "p1", name: "セブン-イレブン 渋谷道玄坂店", address: "東京都渋谷区道玄坂1-2-3", congestion: "normal", helpedCount: 4,
    reviews: ["2階にイートインスペースあり。テーブル8席くらい", "コンセントもあって便利。仕事でよく使う", "席少なめだけど静かで集中できる"] },
  { place_id: "p2", name: "ファミリーマート 新宿三丁目店", address: "東京都新宿区新宿3-1-1", congestion: null, helpedCount: 1,
    reviews: ["イートインなし。持ち帰りのみ", "店内狭くて座る場所ない", "品揃えはいい"] },
  { place_id: "p3", name: "ローソン 池袋東口店", address: "東京都豊島区東池袋1-5-8", congestion: "crowded", helpedCount: 12,
    reviews: ["広いイートインあり！20席くらい", "Wi-Fiも使えるし電源もある。神スポット", "ランチタイムは混むけど夜は空いてる"] },
  { place_id: "p4", name: "セブン-イレブン 上野駅前店", address: "東京都台東区上野7-2-1", congestion: "empty", helpedCount: 2,
    reviews: ["イートインスペースあり。駅近で便利", "椅子とテーブルが数席ある", "コンセントは見当たらなかった"] },
  { place_id: "p5", name: "ミニストップ 秋葉原店", address: "東京都千代田区外神田1-8-3", congestion: null, helpedCount: 0,
    reviews: ["ソフトクリーム食べるためのイートインあり", "そんなに広くはないが使える", "Wi-Fiなし"] },
  { place_id: "p6", name: "ファミリーマート 大手町駅前店", address: "東京都千代田区大手町1-9-2", congestion: "empty", helpedCount: 8,
    reviews: ["地下にイートイン！かなり広い", "コンセント完備、テレワーカーも多い", "朝早くから開いてて助かる"] },
];

async function analyzeEatIn(name, reviews) {
  await new Promise(r => setTimeout(r, 400 + Math.random() * 500));
  const text = reviews.join(" ");
  const pos = ["イートイン","席","テーブル","座","スペース","椅子"].filter(w => text.includes(w)).length;
  const neg = ["なし","ない","持ち帰りのみ","座る場所ない"].filter(w => text.includes(w)).length;
  const outlet = text.includes("コンセント") || text.includes("電源");
  const wifi = text.includes("Wi-Fi") || text.includes("wifi");
  const sm = text.match(/(\d+)席/);
  const seats = sm ? parseInt(sm[1]) : null;
  let hasEatIn, confidence, reason;
  if (pos >= 2 && neg === 0) { hasEatIn = true;  confidence = "high";   reason = "複数の口コミでイートイン言及あり"; }
  else if (pos >= 1 && neg === 0) { hasEatIn = true;  confidence = "medium"; reason = "口コミにイートイン記載あり"; }
  else if (neg >= 1) { hasEatIn = false; confidence = "high";   reason = "口コミにイートインなしの記載あり"; }
  else               { hasEatIn = false; confidence = "low";    reason = "口コミからは判断できず"; }
  return { hasEatIn, confidence, reason, outlet, wifi, seats };
}

const CONF_LABEL = { high: "確度：高", medium: "確度：中", low: "確度：低" };
const CONF_COLOR = { high: "#2d6a4f", medium: "#e67e00", low: "#aaa" };

function VerifiedBadge({ verifications }) {
  if (!verifications || verifications.length === 0) return null;
  const topRank = verifications.reduce((best, v) => {
    const r = getRank(v.reportCount);
    return r.trust > getRank(best.reportCount || 0).trust ? v : best;
  }, verifications[0]);
  const rank = getRank(topRank.reportCount || 0);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#fffbea", border: "1.5px solid #f4d03f", borderRadius: 20, padding: "3px 9px", fontSize: "11px", fontWeight: 700, color: "#b7950b" }}>
      ✅ ユーザー確認済み
      <span style={{ background: rank.bg, color: rank.color, borderRadius: 10, padding: "1px 6px", fontSize: "10px", fontWeight: 700 }}>{rank.icon} {rank.label}</span>
      {verifications.length > 1 && <span style={{ color: "#aaa", fontWeight: 400 }}>他{verifications.length - 1}名</span>}
    </span>
  );
}

function RankBadge({ count, large }) {
  const rank = getRank(count);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: large ? 6 : 4, background: rank.bg, color: rank.color, border: `1.5px solid ${rank.color}44`, borderRadius: large ? 12 : 20, padding: large ? "6px 14px" : "2px 8px", fontSize: large ? "14px" : "11px", fontWeight: 700 }}>
      {rank.icon} {rank.label}
      {large && <span style={{ opacity: 0.6, fontWeight: 400, fontSize: "12px" }}>（投稿{count}件）</span>}
    </span>
  );
}

export default function EatInFinder() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [searchArea, setSearchArea] = useState("");
  const [selected, setSelected] = useState(null);
  const [filterEatIn, setFilterEatIn] = useState(false);
  const [filterOutlet, setFilterOutlet] = useState(false);
  const [filterWifi, setFilterWifi] = useState(false);
  const [filterVerified, setFilterVerified] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const [myReportCount, setMyReportCount] = useState(4);
  const [myHelpedCount, setMyHelpedCount] = useState(3);
  const [showProfile, setShowProfile] = useState(false);
  const [showCongestion, setShowCongestion] = useState(null);
  const [congestionSubmitted, setCongestionSubmitted] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);
  const [reportStep, setReportStep] = useState(1);
  const [reportData, setReportData] = useState({ hasEatIn: null, outlet: false, wifi: false, seats: "", comment: "" });
  const [submitted, setSubmitted] = useState(false);
  const [cacheHit, setCacheHit] = useState(false);

  const handleCongestion = (store, status, e) => {
    e.stopPropagation();
    setStores(prev => prev.map(s => s.place_id === store.place_id ? { ...s, congestion: status } : s));
    setCongestionSubmitted(store.place_id);
    setShowCongestion(null);
    setTimeout(() => setCongestionSubmitted(null), 2500);
  };

  const handleHelped = (store, e) => {
    e.stopPropagation();
    setStores(prev => prev.map(s => s.place_id === store.place_id ? { ...s, helpedCount: (s.helpedCount || 0) + 1, helpedByMe: true } : s));
    setMyHelpedCount(c => c + 1);
  };

  const runSearch = useCallback(async (areaKey) => {
    setStores([]); setSelected(null); setCacheHit(false);
    const cached = getFromCache(areaKey);
    if (cached) { setCacheHit(true); setStores(cached); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 900));
    setLoading(false);
    const places = MOCK_PLACES.slice(0, MAX_RESULTS);
    setAnalyzing(true);
    setProgress({ current: 0, total: places.length });
    const results = [];
    for (let i = 0; i < places.length; i++) {
      const place = places[i];
      const ai = await analyzeEatIn(place.name, place.reviews);
      const verifications = place.place_id === "p3"
        ? [{ userId: "u1", reportCount: 12, comment: "確認しました。20席以上あります" }]
        : place.place_id === "p6"
        ? [{ userId: "u2", reportCount: 28, comment: "地下にかなり広いスペースあり" }, { userId: "u3", reportCount: 5, comment: "コンセント多め" }]
        : [];
      results.push({ ...place, ...ai, verifications, congestion: place.congestion || null, helpedCount: place.helpedCount || 0 });
      setProgress({ current: i + 1, total: places.length });
      setStores([...results]);
    }
    setToCache(areaKey, results);
    setAnalyzing(false);
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchArea.trim()) return;
    await runSearch(searchArea);
  }, [searchArea, runSearch]);

  const handleGPS = useCallback(() => {
    if (!navigator.geolocation) { setGpsError("このブラウザはGPS非対応です"); return; }
    setGpsError(""); setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setGpsLoading(false);
        setSearchArea(`現在地 (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
        runSearch(`現在地_${latitude.toFixed(3)}_${longitude.toFixed(3)}`);
      },
      (err) => {
        setGpsLoading(false);
        setGpsError(err.code === 1 ? "位置情報の許可が必要です" : "現在地を取得できませんでした");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [runSearch]);

  const handleSubmitReport = () => {
    if (!reportTarget) return;
    setStores(prev => prev.map(s => {
      if (s.place_id !== reportTarget.place_id) return s;
      const newVerification = { userId: "me", reportCount: myReportCount + 1, comment: reportData.comment };
      return { ...s, hasEatIn: reportData.hasEatIn ?? s.hasEatIn, outlet: reportData.outlet || s.outlet, wifi: reportData.wifi || s.wifi, seats: reportData.seats ? parseInt(reportData.seats) : s.seats, verifications: [...(s.verifications || []), newVerification] };
    }));
    setMyReportCount(c => c + 1);
    setSubmitted(true);
    setTimeout(() => { setShowReport(false); setSubmitted(false); setReportStep(1); setReportData({ hasEatIn: null, outlet: false, wifi: false, seats: "", comment: "" }); }, 2200);
  };

  const openReport = (store, e) => { e.stopPropagation(); setReportTarget(store); setShowReport(true); };

  const filtered = stores.filter(s => {
    if (filterEatIn && !s.hasEatIn) return false;
    if (filterOutlet && !s.outlet) return false;
    if (filterWifi && !s.wifi) return false;
    if (filterVerified && (!s.verifications || s.verifications.length === 0)) return false;
    return true;
  });

  const myScore = calcScore(myReportCount, myHelpedCount);
  const myRank = getRank(myScore);
  const nextRank = getNextRank(myScore);

  return (
    <div style={{ fontFamily: "'Noto Sans JP','Hiragino Sans',sans-serif", background: "#f4f5f7", minHeight: "100vh", color: "#1a1a1a" }}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "2px solid #111", padding: "12px 16px", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 8px rgba(0,0,0,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div onClick={() => { setStores([]); setSearchArea(""); setSelected(null); }} style={{ fontWeight: 900, fontSize: "16px", letterSpacing: "-0.5px", cursor: "pointer" }}>
          🏪 <span style={{ color: "#e63946" }}>コンビニ</span>イートインマップ
        </div>
        <button onClick={() => setShowProfile(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: myRank.bg, border: `1.5px solid ${myRank.color}55`, borderRadius: 10, padding: "6px 10px", cursor: "pointer" }}>
          <span style={{ fontSize: "16px" }}>{myRank.icon}</span>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: myRank.color }}>{myRank.label}</div>
            <div style={{ fontSize: "10px", color: "#aaa" }}>{myScore}pt</div>
          </div>
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: "14px 16px", background: "#fff", borderBottom: "1px solid #eee" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={searchArea} onChange={e => setSearchArea(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSearch()} placeholder="駅名・エリアを入力（例：渋谷、新宿）"
            style={{ flex: 1, padding: "10px 14px", border: "1.5px solid #ddd", borderRadius: 10, fontSize: "14px", outline: "none", background: "#fafafa" }} />
          <button onClick={handleSearch} disabled={loading || analyzing} style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: loading || analyzing ? "#ddd" : "#e63946", color: "#fff", fontWeight: 700, fontSize: "14px", cursor: loading || analyzing ? "default" : "pointer", whiteSpace: "nowrap" }}>検索</button>
        </div>
        <button onClick={handleGPS} disabled={gpsLoading || loading || analyzing} style={{ width: "100%", marginTop: 8, padding: "10px", borderRadius: 10, border: "1.5px solid #ddd", background: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", color: "#333", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          {gpsLoading ? <><span>⏳</span> 現在地を取得中…</> : <><span>📡</span> 現在地から探す</>}
        </button>
        {gpsError && <div style={{ marginTop: 6, padding: "7px 12px", background: "#ffeaea", borderRadius: 8, fontSize: "12px", color: "#c0392b" }}>⚠️ {gpsError}</div>}
        {stores.length > 0 && (
          <div style={{ display: "flex", gap: 6, marginTop: 10, overflowX: "auto" }}>
            {[[filterEatIn, setFilterEatIn, "🪑 イートインあり", "#e63946", "#ffeaea"], [filterVerified, setFilterVerified, "✅ ユーザー確認済み", "#b7950b", "#fffbea"], [filterOutlet, setFilterOutlet, "🔌 コンセント", "#0077b6", "#e3f2fd"], [filterWifi, setFilterWifi, "📶 Wi-Fi", "#2d6a4f", "#e8f5e9"]].map(([active, setter, label, ac, ab]) => (
              <button key={label} onClick={() => setter(!active)} style={{ padding: "5px 11px", borderRadius: 20, border: `1.5px solid ${active ? ac : "#ddd"}`, background: active ? ab : "#fff", color: active ? ac : "#888", fontWeight: 700, fontSize: "11px", cursor: "pointer", whiteSpace: "nowrap" }}>{label}</button>
            ))}
          </div>
        )}
      </div>

      {/* Loading */}
      {(loading || analyzing) && (
        <div style={{ padding: "20px 16px" }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: "22px 18px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", textAlign: "center" }}>
            {loading ? (
              <><div style={{ fontSize: "30px", marginBottom: 10 }}>🗺️</div>
                <div style={{ fontWeight: 800, fontSize: "14px" }}>Google マップからコンビニを収集中…</div>
                <div style={{ color: "#aaa", fontSize: "11px", marginTop: 4 }}>📍 半径{(SEARCH_RADIUS_METERS / 1000).toFixed(1)}km以内 · 最大{MAX_RESULTS}件</div></>
            ) : (
              <><div style={{ fontSize: "30px", marginBottom: 10 }}>🤖</div>
                <div style={{ fontWeight: 800, fontSize: "14px" }}>AIが口コミを解析中…</div>
                <div style={{ color: "#aaa", fontSize: "12px", marginTop: 4, marginBottom: 12 }}>{progress.current} / {progress.total} 件完了</div>
                <div style={{ background: "#f0f0f0", borderRadius: 99, height: 8, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 99, background: "#e63946", width: `${(progress.current / progress.total) * 100}%`, transition: "width 0.4s ease" }} />
                </div>
                {stores.length > 0 && (
                  <div style={{ marginTop: 12, textAlign: "left" }}>
                    {stores.slice(-2).map(s => (
                      <div key={s.place_id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderTop: "1px solid #f5f5f5", fontSize: "12px" }}>
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: getChainColor(s.name), flexShrink: 0 }} />
                        <span style={{ flex: 1, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
                        <span style={{ color: s.hasEatIn ? "#2d6a4f" : "#ccc", fontWeight: 700 }}>{s.hasEatIn ? "🪑 あり" : "✗ なし"}</span>
                      </div>
                    ))}
                  </div>
                )}</>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {!loading && stores.length > 0 && (
        <div style={{ padding: "12px 16px" }}>
          <div style={{ fontSize: "12px", color: "#888", marginBottom: 10 }}>{filtered.length}件表示{(filterEatIn || filterOutlet || filterWifi || filterVerified) ? " （フィルター適用中）" : ""}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(store => {
              const isVerified = store.verifications && store.verifications.length > 0;
              const isOpen = selected?.place_id === store.place_id;
              return (
                <div key={store.place_id} onClick={() => setSelected(isOpen ? null : store)} style={{ background: "#fff", borderRadius: 12, overflow: "hidden", border: `1.5px solid ${isOpen ? "#e63946" : isVerified ? "#f4d03f" : "#eee"}`, boxShadow: isOpen ? "0 4px 16px rgba(230,57,70,0.10)" : isVerified ? "0 2px 10px rgba(244,208,63,0.15)" : "0 1px 4px rgba(0,0,0,0.04)", cursor: "pointer", transition: "all 0.2s" }}>
                  <div style={{ padding: "13px 14px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: getChainColor(store.name), flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: "13px", lineHeight: 1.4 }}>{store.name}</div>
                        <div style={{ fontSize: "11px", color: "#999", marginTop: 2 }}>📍 {store.address}</div>
                      </div>
                      <div style={{ padding: "4px 10px", borderRadius: 20, flexShrink: 0, background: store.hasEatIn ? "#e8f5e9" : "#f5f5f5", border: `1px solid ${store.hasEatIn ? "#a5d6a7" : "#eee"}`, color: store.hasEatIn ? "#2d6a4f" : "#ccc", fontSize: "12px", fontWeight: 700 }}>
                        {store.hasEatIn ? "🪑 あり" : "✗ なし"}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 5, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                      {store.hasEatIn && store.seats && <span style={{ fontSize: "11px", background: "#f0f0f0", borderRadius: 20, padding: "2px 8px", color: "#555" }}>🪑 {store.seats}席</span>}
                      {store.outlet && <span style={{ fontSize: "11px", background: "#e3f2fd", borderRadius: 20, padding: "2px 8px", color: "#0077b6" }}>🔌 コンセント</span>}
                      {store.wifi && <span style={{ fontSize: "11px", background: "#e8f5e9", borderRadius: 20, padding: "2px 8px", color: "#2d6a4f" }}>📶 Wi-Fi</span>}
                    </div>
                    {store.hasEatIn && (() => {
                      const cg = store.congestion ? CONGESTION.find(c => c.id === store.congestion) : null;
                      return (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 7 }}>
                          {cg ? <span style={{ fontSize: "11px", background: cg.bg, color: cg.color, borderRadius: 20, padding: "2px 9px", fontWeight: 700 }}>{cg.icon} {cg.label}</span> : <span style={{ fontSize: "11px", color: "#ccc" }}>混雑情報なし</span>}
                          <button onClick={e => { e.stopPropagation(); setShowCongestion(store.place_id); }} style={{ fontSize: "11px", color: "#0077b6", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 700 }}>更新する</button>
                          {congestionSubmitted === store.place_id && <span style={{ fontSize: "11px", color: "#2d6a4f", fontWeight: 700 }}>✓ 投稿しました！</span>}
                        </div>
                      );
                    })()}
                    <div style={{ marginTop: 7 }}>
                      {isVerified ? <VerifiedBadge verifications={store.verifications} /> : <span style={{ fontSize: "10px", color: CONF_COLOR[store.confidence] }}>🤖 AI判定 · {CONF_LABEL[store.confidence]}</span>}
                    </div>
                  </div>
                  {isOpen && (
                    <div style={{ borderTop: `1px solid ${isVerified ? "#fdebd0" : "#f0f0f0"}`, background: "#fafafa", padding: "12px 14px" }}>
                      <a href={`https://maps.google.com/?q=${encodeURIComponent(store.name + " " + store.address)}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                        style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1.5px solid #e0e0e0", borderRadius: 10, padding: "9px 12px", textDecoration: "none", marginBottom: 10 }}>
                        <span style={{ fontSize: "18px" }}>📍</span>
                        <div>
                          <div style={{ fontSize: "12px", color: "#333", fontWeight: 600 }}>{store.address}</div>
                          <div style={{ fontSize: "11px", color: "#0077b6", marginTop: 1 }}>タップしてマップで開く →</div>
                        </div>
                      </a>
                      <button onClick={e => handleHelped(store, e)} disabled={store.helpedByMe} style={{ width: "100%", padding: "10px", borderRadius: 10, border: `1.5px solid ${store.helpedByMe ? "#eee" : "#f4a261"}`, background: store.helpedByMe ? "#fafafa" : "#fff7f0", color: store.helpedByMe ? "#ccc" : "#e67e00", fontSize: "13px", fontWeight: 700, cursor: store.helpedByMe ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 10 }}>
                        {store.helpedByMe ? "👍 助かった！を送りました" : `👍 助かった！  ${store.helpedCount > 0 ? store.helpedCount + "人が役に立ったと言っています" : "最初に押してみよう"}`}
                      </button>
                      {isVerified && (
                        <div style={{ background: "#fffbea", border: "1.5px solid #f4d03f44", borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>
                          <div style={{ fontSize: "11px", color: "#b7950b", fontWeight: 700, marginBottom: 8 }}>✅ ユーザー確認情報</div>
                          {store.verifications.map((v, i) => (
                            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 0", borderTop: i > 0 ? "1px solid #fdebd0" : "none" }}>
                              <RankBadge count={v.reportCount || 0} />
                              <div style={{ flex: 1, fontSize: "12px", color: "#555" }}>{v.comment || "確認済み"}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ background: "#fff", border: "1.5px solid #f0f0f0", borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>
                        <div style={{ fontSize: "11px", color: "#aaa", fontWeight: 700, marginBottom: 6 }}>🤖 AI判定根拠（Google口コミより）</div>
                        {store.reviews.map((r, i) => (
                          <div key={i} style={{ fontSize: "12px", color: "#555", padding: "4px 0", borderTop: i > 0 ? "1px solid #f5f5f5" : "none" }}>「{r}」</div>
                        ))}
                        <div style={{ fontSize: "11px", color: CONF_COLOR[store.confidence], marginTop: 8, fontWeight: 700 }}>→ {store.reason}（{CONF_LABEL[store.confidence]}）</div>
                      </div>
                      <button onClick={e => openReport(store, e)} style={{ width: "100%", padding: "10px", borderRadius: 10, border: "none", background: "#111", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        ✅ 実際に確認した！投稿して確認済みにする
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !analyzing && stores.length === 0 && (
        <div style={{ textAlign: "center", padding: "50px 24px" }}>
          <div style={{ fontSize: "44px", marginBottom: 12 }}>🔍</div>
          <div style={{ fontWeight: 800, fontSize: "15px", color: "#777" }}>エリアを入力して検索</div>
          <div style={{ fontSize: "12px", marginTop: 8, lineHeight: 1.8, color: "#aaa" }}>Google マップからコンビニを自動収集し<br />AIが口コミを解析してイートインを判定します</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 20, flexWrap: "wrap" }}>
            {["🗺️ Places API", "→", "🤖 AI解析", "→", "✅ ユーザー確認"].map((s, i) => (
              <span key={i} style={{ fontSize: "11px", color: s === "→" ? "#ccc" : "#fff", background: s === "→" ? "transparent" : "#444", padding: s === "→" ? "0 2px" : "4px 10px", borderRadius: 20, fontWeight: s === "→" ? 400 : 600 }}>{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfile && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "flex-end" }} onClick={e => e.target === e.currentTarget && setShowProfile(false)}>
          <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", width: "100%", padding: "28px 20px 40px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div style={{ fontWeight: 900, fontSize: "17px" }}>あなたのランク</div>
              <button onClick={() => setShowProfile(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#aaa" }}>✕</button>
            </div>
            <div style={{ background: myRank.bg, borderRadius: 16, padding: "20px", textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: "48px" }}>{myRank.icon}</div>
              <div style={{ fontWeight: 900, fontSize: "22px", color: myRank.color, marginTop: 6 }}>{myRank.label}</div>
              <div style={{ fontSize: "13px", color: "#888", marginTop: 4 }}>投稿数：{myReportCount}件　👍 {myHelpedCount}件</div>
              <div style={{ fontSize: "11px", color: "#aaa", marginTop: 2 }}>スコア：{myScore}pt（投稿1pt + 助かった0.5pt）</div>
            </div>
            {nextRank && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#888", marginBottom: 6 }}>
                  <span>次のランク：{nextRank.icon} {nextRank.label}</span>
                  <span>あと{nextRank.min - myScore}pt</span>
                </div>
                <div style={{ background: "#f0f0f0", borderRadius: 99, height: 10, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 99, background: `linear-gradient(90deg, ${myRank.color}, ${nextRank.color})`, width: `${((myScore - myRank.min) / (nextRank.min - myRank.min)) * 100}%`, transition: "width 0.5s ease" }} />
                </div>
              </div>
            )}
            <div style={{ fontSize: "12px", color: "#888", marginBottom: 10, fontWeight: 700 }}>ランク一覧</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {RANKS.map(r => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: r.id === myRank.id ? r.bg : "#fafafa", border: `1.5px solid ${r.id === myRank.id ? r.color + "55" : "#eee"}`, borderRadius: 10 }}>
                  <span style={{ fontSize: "20px" }}>{r.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: "13px", color: r.color }}>{r.label}</div>
                    <div style={{ fontSize: "11px", color: "#aaa" }}>{r.min}pt〜{r.max < 999 ? r.max + "pt" : ""}</div>
                  </div>
                  <div style={{ fontSize: "11px", color: "#aaa" }}>信頼度 {"⭐".repeat(r.trust)}</div>
                  {r.id === myRank.id && <span style={{ fontSize: "11px", fontWeight: 700, color: r.color }}>← 現在</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Congestion Modal */}
      {showCongestion && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "flex-end" }} onClick={e => e.target === e.currentTarget && setShowCongestion(null)}>
          <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", width: "100%", padding: "24px 20px 40px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontWeight: 900, fontSize: "16px" }}>🟡 今の混雑状況を教えて</div>
              <button onClick={() => setShowCongestion(null)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#aaa" }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {CONGESTION.map(cg => {
                const store = stores.find(s => s.place_id === showCongestion);
                return (
                  <button key={cg.id} onClick={e => handleCongestion(store, cg.id, e)} style={{ padding: "16px", borderRadius: 14, border: `2px solid ${cg.color}44`, background: cg.bg, color: cg.color, fontWeight: 700, fontSize: "16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: "24px" }}>{cg.icon}</span>{cg.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReport && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "flex-end" }} onClick={e => e.target === e.currentTarget && setShowReport(false)}>
          <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", width: "100%", padding: "24px 20px 40px", maxHeight: "80vh", overflowY: "auto" }}>
            {submitted ? (
              <div style={{ textAlign: "center", padding: "28px 0" }}>
                <div style={{ fontSize: "52px" }}>🎉</div>
                <div style={{ fontWeight: 900, fontSize: "18px", marginTop: 10 }}>確認済み登録完了！</div>
                <div style={{ color: "#888", fontSize: "13px", marginTop: 4 }}>投稿数：{myReportCount + 1}件　スコア：{calcScore(myReportCount + 1, myHelpedCount)}pt</div>
                {getRank(calcScore(myReportCount + 1, myHelpedCount)).id !== myRank.id && (
                  <div style={{ marginTop: 12, background: getRank(calcScore(myReportCount + 1, myHelpedCount)).bg, borderRadius: 12, padding: "12px", display: "inline-block" }}>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: getRank(calcScore(myReportCount + 1, myHelpedCount)).color }}>
                      {getRank(calcScore(myReportCount + 1, myHelpedCount)).icon} ランクアップ！{getRank(calcScore(myReportCount + 1, myHelpedCount)).label}になりました
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontWeight: 900, fontSize: "16px" }}>{reportStep === 1 ? "✅ 実際に確認した情報を登録" : "✏️ コメント（任意）"}</div>
                  <button onClick={() => setShowReport(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#aaa" }}>✕</button>
                </div>
                {reportTarget && <div style={{ fontSize: "12px", color: "#888", marginBottom: 14 }}>📍 {reportTarget.name}</div>}
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: myRank.bg, borderRadius: 10, padding: "8px 12px", marginBottom: 16 }}>
                  <span style={{ fontSize: "18px" }}>{myRank.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: myRank.color }}>{myRank.label}として投稿</div>
                    <div style={{ fontSize: "11px", color: "#aaa" }}>信頼度 {"⭐".repeat(myRank.trust)} · {myScore}pt</div>
                  </div>
                  {nextRank && <div style={{ fontSize: "11px", color: "#aaa" }}>次まであと{nextRank.min - myScore - 1}pt</div>}
                </div>
                <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
                  {[1, 2].map(s => <div key={s} style={{ height: 4, flex: 1, borderRadius: 2, background: s <= reportStep ? "#e63946" : "#eee" }} />)}
                </div>
                {reportStep === 1 && (
                  <div>
                    <div style={{ fontSize: "13px", color: "#888", marginBottom: 12 }}>実際にイートインはありましたか？</div>
                    <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                      {[true, false].map(v => (
                        <button key={String(v)} onClick={() => setReportData({ ...reportData, hasEatIn: v })} style={{ flex: 1, padding: "14px", borderRadius: 12, border: `2px solid ${reportData.hasEatIn === v ? (v ? "#2d6a4f" : "#e63946") : "#eee"}`, background: reportData.hasEatIn === v ? (v ? "#e8f5e9" : "#ffeaea") : "#fff", fontWeight: 700, fontSize: "15px", cursor: "pointer", color: reportData.hasEatIn === v ? (v ? "#2d6a4f" : "#e63946") : "#888" }}>{v ? "🪑 あった" : "✗ なかった"}</button>
                      ))}
                    </div>
                    {reportData.hasEatIn && (
                      <>
                        <input value={reportData.seats} onChange={e => setReportData({ ...reportData, seats: e.target.value })} placeholder="席数（例：10）" type="number" style={{ width: "100%", boxSizing: "border-box", padding: "11px", borderRadius: 10, border: "1.5px solid #ddd", fontSize: "14px", outline: "none", marginBottom: 12 }} />
                        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                          {[["outlet", "🔌 コンセント"], ["wifi", "📶 Wi-Fi"]].map(([key, label]) => (
                            <button key={key} onClick={() => setReportData({ ...reportData, [key]: !reportData[key] })} style={{ flex: 1, padding: "11px", borderRadius: 12, border: `2px solid ${reportData[key] ? "#0077b6" : "#eee"}`, background: reportData[key] ? "#e3f2fd" : "#fff", fontWeight: 700, fontSize: "13px", cursor: "pointer", color: reportData[key] ? "#0077b6" : "#888" }}>{label}</button>
                          ))}
                        </div>
                      </>
                    )}
                    <button disabled={reportData.hasEatIn === null} onClick={() => setReportStep(2)} style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", background: reportData.hasEatIn !== null ? "#111" : "#eee", color: reportData.hasEatIn !== null ? "#fff" : "#aaa", fontWeight: 700, fontSize: "14px", cursor: reportData.hasEatIn !== null ? "pointer" : "default" }}>次へ →</button>
                  </div>
                )}
                {reportStep === 2 && (
                  <div>
                    <textarea value={reportData.comment} onChange={e => setReportData({ ...reportData, comment: e.target.value })} placeholder="例：2階に8席あり。窓際にコンセントあり" rows={4} style={{ width: "100%", boxSizing: "border-box", padding: "12px", borderRadius: 10, border: "1.5px solid #ddd", fontSize: "14px", outline: "none", resize: "none", marginBottom: 16, fontFamily: "inherit" }} />
                    <div style={{ display: "flex", gap: 10 }}>
                      <button onClick={() => setReportStep(1)} style={{ padding: "13px 18px", borderRadius: 12, border: "1.5px solid #ddd", background: "#fff", fontWeight: 700, fontSize: "13px", cursor: "pointer", color: "#888" }}>← 戻る</button>
                      <button onClick={handleSubmitReport} style={{ flex: 1, padding: "13px", borderRadius: 12, border: "none", background: "#e63946", color: "#fff", fontWeight: 700, fontSize: "14px", cursor: "pointer" }}>✅ 確認済みとして投稿</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}