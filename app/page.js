"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { GoogleMap, useJsApiLoader, OverlayView } from "@react-google-maps/api";
import { db } from "../lib/firebase";
import { collection, addDoc, getDocs, updateDoc, doc, increment, query, where } from "firebase/firestore";

// ============================================================
// 定数・ユーティリティ
// ============================================================
const RANKS = [
  { id: "newcomer",  label: "ビギナー",     min: 0,   max: 20,  icon: "🌱", color: "#aaa",    bg: "#f5f5f5",    trust: 1 },
  { id: "regular",   label: "レギュラー",   min: 21,  max: 50,  icon: "☕", color: "#795548", bg: "#efebe9",    trust: 2 },
  { id: "veteran",   label: "ベテラン",     min: 51,  max: 150, icon: "⭐", color: "#f4a261", bg: "#fff3e0",    trust: 3 },
  { id: "expert",    label: "エキスパート", min: 151, max: 500, icon: "🏅", color: "#0077b6", bg: "#e3f2fd",    trust: 4 },
  { id: "master",    label: "マスター",     min: 501, max: 9999,icon: "👑", color: "#e63946", bg: "#ffeaea",    trust: 5 },
];
function getRank(count) { return RANKS.find(r => count >= r.min && count <= r.max) || RANKS[0]; }
function getNextRank(count) { const idx = RANKS.findIndex(r => count >= r.min && count <= r.max); return idx < RANKS.length - 1 ? RANKS[idx + 1] : null; }
function calcScore(reportCount, helpedCount) { return reportCount + Math.floor((helpedCount || 0) * 0.5); }
function calcDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function getReportedStores() { try { return JSON.parse(localStorage.getItem("reportedStores") || "{}"); } catch { return {}; } }
function markAsReported(placeId, storeName, hasEatIn) {
  const r = getReportedStores();
  r[placeId] = { date: new Date().toISOString(), storeName, hasEatIn };
  localStorage.setItem("reportedStores", JSON.stringify(r));
}
function isReported(placeId) { return !!getReportedStores()[placeId]; }

const CHAIN_COLORS = { "セブン-イレブン": "#e63946", "ファミリーマート": "#00a040", "ローソン": "#0b5ea8", "ミニストップ": "#f4a261" };
function getChainColor(name) { for (const [k,v] of Object.entries(CHAIN_COLORS)) if (name.includes(k)) return v; return "#888"; }

const CONGESTION = [
  { id: "empty",   label: "空いてる", icon: "🟢", color: "#2d6a4f", bg: "#e8f5e9" },
  { id: "normal",  label: "普通",     icon: "🟡", color: "#b7950b", bg: "#fffbea" },
  { id: "crowded", label: "混んでる", icon: "🔴", color: "#c0392b", bg: "#ffeaea" },
];

const MAX_RESULTS = 20;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const searchCache = new Map();
function getFromCache(key) {
  const c = searchCache.get(key);
  if (!c) return null;
  if (Date.now() - c.timestamp > CACHE_TTL_MS) { searchCache.delete(key); return null; }
  return c.data;
}
function setToCache(key, data) { searchCache.set(key, { data, timestamp: Date.now() }); }

// ピンカラー
function getPinColor(store) {
  if (store.hasEatIn === true) return "#2d6a4f";  // あり：緑
  if (store.hasEatIn === false) return "#aaa";     // なし：グレー
  return "#f4a261";                                // 未確認：オレンジ
}

function getPinEmoji(store) {
  if (store.hasEatIn === true) return "🪑";
  if (store.hasEatIn === false) return "✗";
  return "?";
}

// ============================================================
// カスタムピンコンポーネント
// ============================================================
function StorePin({ store, isSelected, onClick }) {
  const color = getPinColor(store);
  const emoji = getPinEmoji(store);
  return (
    <div onClick={onClick} style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      cursor: "pointer", transform: isSelected ? "scale(1.3)" : "scale(1)",
      transition: "transform 0.15s ease", zIndex: isSelected ? 100 : 1,
    }}>
      <div style={{
        background: color, color: "#fff", borderRadius: "50% 50% 50% 0",
        transform: "rotate(-45deg)", width: isSelected ? 36 : 28,
        height: isSelected ? 36 : 28, display: "flex", alignItems: "center",
        justifyContent: "center", border: `2px solid #fff`,
        boxShadow: isSelected ? "0 4px 12px rgba(0,0,0,0.3)" : "0 2px 6px rgba(0,0,0,0.2)",
        fontSize: isSelected ? "14px" : "11px",
      }}>
        <span style={{ transform: "rotate(45deg)" }}>{emoji}</span>
      </div>
      <div style={{
        width: 0, height: 0,
        borderLeft: `${isSelected ? 5 : 4}px solid transparent`,
        borderRight: `${isSelected ? 5 : 4}px solid transparent`,
        borderTop: `${isSelected ? 6 : 5}px solid ${color}`,
      }} />
    </div>
  );
}

// ============================================================
// RankBadge
// ============================================================
function RankBadge({ count, large }) {
  const rank = getRank(count);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: large ? 6 : 4, background: rank.bg, color: rank.color, border: `1.5px solid ${rank.color}44`, borderRadius: large ? 12 : 20, padding: large ? "6px 14px" : "2px 8px", fontSize: large ? "14px" : "11px", fontWeight: 700 }}>
      {rank.icon} {rank.label}
      {large && <span style={{ opacity: 0.6, fontWeight: 400, fontSize: "12px" }}>（投稿{count}件）</span>}
    </span>
  );
}

// ============================================================
// メインコンポーネント
// ============================================================
export default function EatInFinder() {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchArea, setSearchArea] = useState("");
  const [selected, setSelected] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 34.7025, lng: 135.496 }); // デフォルト：大阪
  const [mapZoom, setMapZoom] = useState(15);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const [filterEatIn, setFilterEatIn] = useState(false);
  const [filterVerified, setFilterVerified] = useState(false);
  const [filterOpenNow, setFilterOpenNow] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showCongestion, setShowCongestion] = useState(null);
  const [congestionSubmitted, setCongestionSubmitted] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);
  const [reportStep, setReportStep] = useState(1);
  const [reportData, setReportData] = useState({ hasEatIn: null, outlet: false, wifi: false, seats: "", comment: "" });
  const [submitted, setSubmitted] = useState(false);
  const [myReportCount, setMyReportCount] = useState(4);
  const [myHelpedCount, setMyHelpedCount] = useState(3);
  const [searchCenter, setSearchCenter] = useState(null);
  const mapRef = useRef(null);

  const myScore = calcScore(myReportCount, myHelpedCount);
  const myRank = getRank(myScore);
  const nextRank = getNextRank(myScore);

  // Firestoreデータ読み込み
  const loadFirestoreData = useCallback(async () => {
    try {
      const [verSnap, congSnap, helpSnap] = await Promise.all([
        getDocs(collection(db, "verifications")),
        getDocs(collection(db, "congestion")),
        getDocs(collection(db, "helped")),
      ]);
      const verMap = {}, congMap = {}, helpMap = {};
      verSnap.forEach(d => { const data = d.data(); if (!verMap[data.placeId]) verMap[data.placeId] = []; verMap[data.placeId].push({ ...data, docId: d.id }); });
      congSnap.forEach(d => { const data = d.data(); congMap[data.placeId] = data.status; });
      helpSnap.forEach(d => { const data = d.data(); helpMap[data.placeId] = data.count || 0; });
      setStores(prev => prev.map(s => ({
        ...s,
        verifications: verMap[s.place_id] || s.verifications || [],
        congestion: congMap[s.place_id] || s.congestion,
        helpedCount: helpMap[s.place_id] ?? s.helpedCount,
      })));
    } catch (e) { console.error("Firestore読み込みエラー:", e); }
  }, []);

  useEffect(() => { if (stores.length > 0) loadFirestoreData(); }, [stores.length]);

  // Places API検索
  const searchPlaces = useCallback(async (lat, lng) => {
    setLoading(true);
    setStores([]);
    setSelected(null);
    try {
      const cached = getFromCache(`${lat},${lng}`);
      if (cached) { setStores(cached); setLoading(false); return; }
      const res = await fetch(`/api/places?lat=${lat}&lng=${lng}&radius=500`);
      const data = await res.json();
      if (data.places && data.places.length > 0) {
        const places = data.places.map(p => ({
          ...p,
          verifications: [],
          congestion: null,
          helpedCount: 0,
          hasEatIn: null,
          outlet: false,
          wifi: false,
          seats: null,
        })).sort((a, b) => calcDistance(lat, lng, a.lat, a.lng) - calcDistance(lat, lng, b.lat, b.lng))
          .slice(0, MAX_RESULTS);
        setStores(places);
        setToCache(`${lat},${lng}`, places);
      }
    } catch (e) { console.error("検索エラー:", e); }
    setLoading(false);
  }, []);

  // GPS
  const handleGPS = useCallback(() => {
    if (!navigator.geolocation) { setGpsError("このブラウザはGPS非対応です"); return; }
    setGpsError(""); setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setGpsLoading(false);
        setMapCenter({ lat, lng });
        setMapZoom(16);
        setSearchCenter({ lat, lng });
        searchPlaces(lat, lng);
      },
      (err) => {
        setGpsLoading(false);
        setGpsError(err.code === 1 ? "位置情報の許可が必要です" : "現在地を取得できませんでした");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [searchPlaces]);

  // 地図移動後に再検索
  const handleMapIdle = useCallback(() => {
    if (!mapRef.current) return;
    const center = mapRef.current.getCenter();
    if (!center) return;
    const lat = center.lat();
    const lng = center.lng();
    setSearchCenter({ lat, lng });
    searchPlaces(lat, lng);
  }, [searchPlaces]);

  // 混雑投稿
  const handleCongestion = async (store, status, e) => {
    e.stopPropagation();
    setStores(prev => prev.map(s => s.place_id === store.place_id ? { ...s, congestion: status } : s));
    setCongestionSubmitted(store.place_id);
    setShowCongestion(null);
    setTimeout(() => setCongestionSubmitted(null), 2500);
    try {
      const q = query(collection(db, "congestion"), where("placeId", "==", store.place_id));
      const snap = await getDocs(q);
      if (snap.empty) await addDoc(collection(db, "congestion"), { placeId: store.place_id, status, updatedAt: new Date() });
      else await updateDoc(doc(db, "congestion", snap.docs[0].id), { status, updatedAt: new Date() });
    } catch (e) { console.error(e); }
  };

  // 助かった
  const handleHelped = async (store, e) => {
    e.stopPropagation();
    setStores(prev => prev.map(s => s.place_id === store.place_id ? { ...s, helpedCount: (s.helpedCount||0)+1, helpedByMe: true } : s));
    setMyHelpedCount(c => c+1);
    try {
      const q = query(collection(db, "helped"), where("placeId", "==", store.place_id));
      const snap = await getDocs(q);
      if (snap.empty) await addDoc(collection(db, "helped"), { placeId: store.place_id, count: 1 });
      else await updateDoc(doc(db, "helped", snap.docs[0].id), { count: increment(1) });
    } catch (e) { console.error(e); }
  };

  // 投稿
  const handleSubmitReport = async () => {
    if (!reportTarget) return;
    if (isReported(reportTarget.place_id)) return;
    setStores(prev => prev.map(s => {
      if (s.place_id !== reportTarget.place_id) return s;
      const newVer = { userId: "me", reportCount: myReportCount+1, comment: reportData.comment };
      return { ...s, hasEatIn: reportData.hasEatIn ?? s.hasEatIn, outlet: reportData.outlet||s.outlet, wifi: reportData.wifi||s.wifi, seats: reportData.seats ? parseInt(reportData.seats) : s.seats, verifications: [...(s.verifications||[]), newVer] };
    }));
    setMyReportCount(c => c+1);
    setSelected(prev => prev?.place_id === store.place_id ? {
  ...prev,
  hasEatIn,
  verifications: [...(prev.verifications||[]), { userId: "me", reportCount: myReportCount+1, comment: hasEatIn ? "イートインあり" : "イートインなし" }]
} : prev);
    markAsReported(reportTarget.place_id, reportTarget.name, reportData.hasEatIn);
    setSubmitted(true);
    try {
      await addDoc(collection(db, "verifications"), {
        placeId: reportTarget.place_id, placeName: reportTarget.name,
        hasEatIn: reportData.hasEatIn, outlet: reportData.outlet, wifi: reportData.wifi,
        seats: reportData.seats ? parseInt(reportData.seats) : null,
        comment: reportData.comment, reportCount: myReportCount+1, createdAt: new Date(),
      });
    } catch (e) { console.error(e); }
    setTimeout(() => { setShowReport(false); setSubmitted(false); setReportStep(1); setReportData({ hasEatIn: null, outlet: false, wifi: false, seats: "", comment: "" }); }, 2200);
  };

  const handleQuickReport = async (store, hasEatIn, e) => {
    e.stopPropagation();
    if (isReported(store.place_id)) return;
    setStores(prev => prev.map(s => {
      if (s.place_id !== store.place_id) return s;
      const newVer = { userId: "me", reportCount: myReportCount+1, comment: hasEatIn ? "イートインあり" : "イートインなし" };
      return { ...s, hasEatIn, verifications: [...(s.verifications||[]), newVer] };
    }));
    setMyReportCount(c => c+1);
    markAsReported(store.place_id, store.name, hasEatIn);
    try {
      await addDoc(collection(db, "verifications"), {
        placeId: store.place_id, placeName: store.name, hasEatIn,
        outlet: false, wifi: false, seats: null,
        comment: hasEatIn ? "イートインあり" : "イートインなし",
        reportCount: myReportCount+1, createdAt: new Date(),
      });
    } catch (e) { console.error(e); }
  };

  const filtered = stores.filter(s => {
    if (filterEatIn && !s.hasEatIn) return false;
    if (filterVerified && (!s.verifications || s.verifications.length === 0)) return false;
    if (filterOpenNow && s.isOpenNow === false) return false;
    return true;
  });

  const mapContainerStyle = { width: "100%", height: "100%" };
  const mapOptions = {
    disableDefaultUI: true,
    zoomControl: false,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    clickableIcons: false,
    styles: [
      { featureType: "poi", stylers: [{ visibility: "off" }] },
      { featureType: "transit", stylers: [{ visibility: "simplified" }] },
    ],
  };

  return (
    <div style={{ fontFamily: "'Noto Sans JP','Hiragino Sans',sans-serif", height: "100dvh", display: "flex", flexDirection: "column", background: "#f4f5f7", color: "#1a1a1a", overflow: "hidden" }}>

      {/* ヘッダー */}
      <div style={{ background: "#fff", borderBottom: "2px solid #111", padding: "10px 14px", zIndex: 100, boxShadow: "0 2px 8px rgba(0,0,0,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ fontWeight: 900, fontSize: "15px", letterSpacing: "-0.5px" }}>
          🏪 <span style={{ color: "#e63946" }}>コンビニ</span>イートインマップ
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => setShowHistory(true)} style={{ background: "#f5f5f5", border: "none", borderRadius: 10, padding: "6px 10px", cursor: "pointer", fontSize: "11px", fontWeight: 700, color: "#555" }}>投稿履歴</button>
          <button onClick={() => setShowProfile(true)} style={{ display: "flex", alignItems: "center", gap: 5, background: myRank.bg, border: `1.5px solid ${myRank.color}55`, borderRadius: 10, padding: "5px 10px", cursor: "pointer" }}>
            <span style={{ fontSize: "15px" }}>{myRank.icon}</span>
            <div>
              <div style={{ fontSize: "10px", fontWeight: 700, color: myRank.color }}>{myRank.label}</div>
              <div style={{ fontSize: "9px", color: "#aaa" }}>{myScore}pt</div>
            </div>
          </button>
        </div>
      </div>

      {/* 検索バー */}
      <div style={{ background: "#fff", padding: "10px 14px", borderBottom: "1px solid #eee", flexShrink: 0, zIndex: 50 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button onClick={handleGPS} disabled={gpsLoading || loading} style={{ flex: 1, padding: "9px", borderRadius: 10, border: "1.5px solid #ddd", background: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", color: "#333", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            {gpsLoading ? <><span>⏳</span>取得中…</> : <><span>📡</span>現在地から探す</>}
          </button>
          <button onClick={handleMapIdle} disabled={loading} style={{ padding: "9px 14px", borderRadius: 10, border: "none", background: loading ? "#ddd" : "#e63946", color: "#fff", fontWeight: 700, fontSize: "13px", cursor: loading ? "default" : "pointer", whiteSpace: "nowrap" }}>
            {loading ? "検索中…" : "この地図で探す"}
          </button>
        </div>
        {gpsError && <div style={{ padding: "6px 10px", background: "#ffeaea", borderRadius: 8, fontSize: "11px", color: "#c0392b", marginBottom: 6 }}>⚠️ {gpsError}</div>}
        {/* フィルター */}
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
          {[[filterOpenNow, setFilterOpenNow, "🟢 営業中", "#2d6a4f"], [filterEatIn, setFilterEatIn, "🪑 イートインあり", "#e63946"], [filterVerified, setFilterVerified, "✅ 確認済み", "#b7950b"]].map(([active, setter, label, ac]) => (
            <button key={label} onClick={() => setter(!active)} style={{ padding: "4px 10px", borderRadius: 20, border: `1.5px solid ${active ? ac : "#ddd"}`, background: active ? `${ac}18` : "#fff", color: active ? ac : "#888", fontWeight: 700, fontSize: "11px", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>{label}</button>
          ))}
        </div>
      </div>

      {/* 地図エリア */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={mapCenter}
            zoom={mapZoom}
            options={mapOptions}
            onLoad={map => { mapRef.current = map; }}
          >
            {filtered.map(store => (
              <OverlayView
                key={store.place_id}
                position={{ lat: store.lat, lng: store.lng }}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              >
                <StorePin
                  store={store}
                  isSelected={selected?.place_id === store.place_id}
                  onClick={() => setSelected(selected?.place_id === store.place_id ? null : store)}
                />
              </OverlayView>
            ))}
          </GoogleMap>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#aaa", fontSize: "14px" }}>地図を読み込み中…</div>
        )}

        {/* ローディングオーバーレイ */}
        {loading && (
          <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", background: "#fff", borderRadius: 20, padding: "8px 18px", boxShadow: "0 4px 16px rgba(0,0,0,0.15)", fontSize: "13px", fontWeight: 700, color: "#333", display: "flex", alignItems: "center", gap: 8, zIndex: 10 }}>
            <span>⏳</span>コンビニを検索中…
          </div>
        )}

        {/* 凡例 */}
        <div style={{ position: "absolute", bottom: selected ? 320 : 16, right: 12, background: "#fff", borderRadius: 12, padding: "8px 12px", boxShadow: "0 2px 10px rgba(0,0,0,0.12)", fontSize: "11px", zIndex: 5, transition: "bottom 0.3s ease" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}><div style={{ width: 12, height: 12, borderRadius: "50%", background: "#2d6a4f" }} /><span>イートインあり</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}><div style={{ width: 12, height: 12, borderRadius: "50%", background: "#aaa" }} /><span>イートインなし</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 12, height: 12, borderRadius: "50%", background: "#f4a261" }} /><span>未確認</span></div>
        </div>

        {/* 件数バッジ */}
        {stores.length > 0 && (
          <div style={{ position: "absolute", top: 12, left: 12, background: "#fff", borderRadius: 20, padding: "6px 14px", boxShadow: "0 2px 10px rgba(0,0,0,0.12)", fontSize: "12px", fontWeight: 700, zIndex: 5 }}>
            📍 {filtered.length}件
          </div>
        )}
      </div>

      {/* 店舗詳細パネル（下から出てくる） */}
      {selected && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderRadius: "20px 20px 0 0", boxShadow: "0 -4px 20px rgba(0,0,0,0.15)", zIndex: 200, maxHeight: "65vh", overflowY: "auto" }}>
          {/* ドラッグハンドル */}
          <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "#ddd" }} />
          </div>
          <button onClick={() => setSelected(null)} style={{ position: "absolute", top: 12, right: 14, background: "#f5f5f5", border: "none", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", fontSize: "14px", color: "#888", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>

          <div style={{ padding: "0 16px 32px" }}>
            {/* 店舗名・基本情報 */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: getChainColor(selected.name), flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: "14px", lineHeight: 1.4 }}>{selected.name}</div>
                <div style={{ fontSize: "11px", color: "#999", marginTop: 2 }}>📍 {selected.address}</div>
                {selected.isOpenNow !== null && (
                  <div style={{ fontSize: "11px", marginTop: 2, fontWeight: 700, color: selected.isOpenNow ? "#2d6a4f" : "#e63946" }}>
                    {selected.isOpenNow ? "🟢 営業中" : "🔴 営業時間外"}
                  </div>
                )}
                {searchCenter && (
                  <div style={{ fontSize: "11px", color: "#0077b6", marginTop: 1 }}>
                    🚶 {(() => { const d = calcDistance(searchCenter.lat, searchCenter.lng, selected.lat, selected.lng); return d < 1000 ? `${Math.round(d)}m` : `${(d/1000).toFixed(1)}km`; })()}
                  </div>
                )}
              </div>
              <div style={{ padding: "5px 10px", borderRadius: 20, flexShrink: 0, background: selected.hasEatIn ? "#e8f5e9" : selected.hasEatIn === false ? "#f5f5f5" : "#fff7f0", border: `1px solid ${selected.hasEatIn ? "#a5d6a7" : selected.hasEatIn === false ? "#eee" : "#fcd5a0"}`, color: selected.hasEatIn ? "#2d6a4f" : selected.hasEatIn === false ? "#ccc" : "#f4a261", fontSize: "12px", fontWeight: 700 }}>
                {selected.hasEatIn ? "🪑 あり" : selected.hasEatIn === false ? "✗ なし" : "? 未確認"}
              </div>
            </div>

            {/* タグ */}
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
              {selected.hasEatIn && selected.seats && <span style={{ fontSize: "11px", background: "#f0f0f0", borderRadius: 20, padding: "2px 8px", color: "#555" }}>🪑 {selected.seats}席</span>}
              {selected.outlet && <span style={{ fontSize: "11px", background: "#e3f2fd", borderRadius: 20, padding: "2px 8px", color: "#0077b6" }}>🔌 コンセント</span>}
              {selected.wifi && <span style={{ fontSize: "11px", background: "#e8f5e9", borderRadius: 20, padding: "2px 8px", color: "#2d6a4f" }}>📶 Wi-Fi</span>}
            </div>

            {/* 混雑情報 */}
            {selected.hasEatIn && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                {selected.congestion ? (() => { const cg = CONGESTION.find(c => c.id === selected.congestion); return <span style={{ fontSize: "11px", background: cg.bg, color: cg.color, borderRadius: 20, padding: "2px 9px", fontWeight: 700 }}>{cg.icon} {cg.label}</span>; })() : <span style={{ fontSize: "11px", color: "#ccc" }}>混雑情報なし</span>}
                <button onClick={e => { e.stopPropagation(); setShowCongestion(selected.place_id); }} style={{ fontSize: "11px", color: "#0077b6", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 700 }}>更新する</button>
                {congestionSubmitted === selected.place_id && <span style={{ fontSize: "11px", color: "#2d6a4f", fontWeight: 700 }}>✓ 投稿しました！</span>}
              </div>
            )}

            {/* 確認済みバッジ */}
            {selected.verifications && selected.verifications.length > 0 ? (
              <div style={{ background: "#fffbea", border: "1.5px solid #f4d03f44", borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>
                <div style={{ fontSize: "11px", color: "#b7950b", fontWeight: 700, marginBottom: 6 }}>✅ ユーザー確認情報</div>
                {selected.verifications.slice(0, 2).map((v, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "4px 0", borderTop: i > 0 ? "1px solid #fdebd0" : "none" }}>
                    <RankBadge count={v.reportCount || 0} />
                    <div style={{ flex: 1, fontSize: "12px", color: "#555" }}>{v.comment || "確認済み"}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ background: "#f5f5f5", border: "1.5px dashed #ddd", borderRadius: 10, padding: "8px 12px", marginBottom: 10, fontSize: "11px", color: "#aaa", fontWeight: 700 }}>
                🔍 情報募集中 — 最初に投稿してみよう！
              </div>
            )}

            {/* Googleマップで開く */}
            <a href={`https://maps.google.com/?q=${encodeURIComponent(selected.name + " " + selected.address)}`} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1.5px solid #e0e0e0", borderRadius: 10, padding: "9px 12px", textDecoration: "none", marginBottom: 10 }}>
              <span style={{ fontSize: "16px" }}>📍</span>
              <div style={{ flex: 1, fontSize: "12px", color: "#0077b6", fontWeight: 600 }}>Googleマップで開く →</div>
            </a>

            {/* 助かった */}
            <button onClick={e => handleHelped(selected, e)} disabled={selected.helpedByMe} style={{ width: "100%", padding: "10px", borderRadius: 10, border: `1.5px solid ${selected.helpedByMe ? "#eee" : "#f4a261"}`, background: selected.helpedByMe ? "#fafafa" : "#fff7f0", color: selected.helpedByMe ? "#ccc" : "#e67e00", fontSize: "13px", fontWeight: 700, cursor: selected.helpedByMe ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 10 }}>
              {selected.helpedByMe ? "👍 助かった！を送りました" : `👍 助かった！ ${selected.helpedCount > 0 ? `${selected.helpedCount}人が役に立ったと言っています` : "最初に押してみよう"}`}
            </button>

            {/* ワンタップ投稿 */}
            {isReported(selected.place_id) ? (
              <div style={{ padding: "12px", borderRadius: 12, background: "#f5f5f5", textAlign: "center", fontSize: "13px", color: "#aaa", fontWeight: 700 }}>✅ 投稿済みです（1店舗1回まで）</div>
            ) : (
              <>
                <div style={{ fontSize: "12px", color: "#888", marginBottom: 8, fontWeight: 700 }}>📝 実際に行った方は教えてください！</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <button onClick={e => handleQuickReport(selected, true, e)} style={{ flex: 1, padding: "12px", borderRadius: 12, border: "2px solid #a5d6a7", background: "#e8f5e9", color: "#2d6a4f", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}>🪑 イートインあった！</button>
                  <button onClick={e => handleQuickReport(selected, false, e)} style={{ flex: 1, padding: "12px", borderRadius: 12, border: "2px solid #ffcdd2", background: "#ffeaea", color: "#c0392b", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}>✗ なかった</button>
                </div>
                <button onClick={e => { e.stopPropagation(); setReportTarget(selected); setShowReport(true); }} style={{ width: "100%", padding: "8px", borderRadius: 10, border: "1.5px solid #ddd", background: "#fff", fontSize: "12px", color: "#888", cursor: "pointer", fontWeight: 600 }}>席数・コンセント・Wi-Fiも詳しく登録する →</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* 初期状態 */}
      {!loading && stores.length === 0 && (
        <div style={{ position: "absolute", bottom: 80, left: "50%", transform: "translateX(-50%)", background: "#fff", borderRadius: 16, padding: "16px 20px", boxShadow: "0 4px 20px rgba(0,0,0,0.12)", zIndex: 10, textAlign: "center", width: "calc(100% - 40px)", maxWidth: 340 }}>
          <div style={{ fontSize: "28px", marginBottom: 6 }}>📡</div>
          <div style={{ fontWeight: 800, fontSize: "14px" }}>現在地から探してみよう！</div>
          <div style={{ fontSize: "12px", color: "#aaa", marginTop: 4 }}>「現在地から探す」ボタンを押すか<br />地図を動かして「この地図で探す」を押してください</div>
        </div>
      )}

      {/* プロフィールモーダル */}
      {showProfile && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "flex-end" }} onClick={e => e.target === e.currentTarget && setShowProfile(false)}>
          <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", width: "100%", padding: "28px 20px 40px", maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div style={{ fontWeight: 900, fontSize: "17px" }}>あなたのランク</div>
              <button onClick={() => setShowProfile(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#aaa" }}>✕</button>
            </div>
            <div style={{ background: myRank.bg, borderRadius: 16, padding: "20px", textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: "48px" }}>{myRank.icon}</div>
              <div style={{ fontWeight: 900, fontSize: "22px", color: myRank.color, marginTop: 6 }}>{myRank.label}</div>
              <div style={{ fontSize: "13px", color: "#888", marginTop: 4 }}>投稿数：{myReportCount}件　👍 {myHelpedCount}件</div>
              <div style={{ fontSize: "11px", color: "#aaa", marginTop: 2 }}>スコア：{myScore}pt</div>
            </div>
            {nextRank && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#888", marginBottom: 6 }}>
                  <span>次のランク：{nextRank.icon} {nextRank.label}</span><span>あと{nextRank.min - myScore}pt</span>
                </div>
                <div style={{ background: "#f0f0f0", borderRadius: 99, height: 10, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 99, background: `linear-gradient(90deg, ${myRank.color}, ${nextRank.color})`, width: `${((myScore - myRank.min) / (nextRank.min - myRank.min)) * 100}%`, transition: "width 0.5s ease" }} />
                </div>
              </div>
            )}
            <div style={{ fontSize: "12px", color: "#888", marginBottom: 10, fontWeight: 700 }}>ランク一覧</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {RANKS.map(r => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: r.id === myRank.id ? r.bg : "#fafafa", border: `1.5px solid ${r.id === myRank.id ? r.color+"55" : "#eee"}`, borderRadius: 10 }}>
                  <span style={{ fontSize: "20px" }}>{r.icon}</span>
                  <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: "13px", color: r.color }}>{r.label}</div><div style={{ fontSize: "11px", color: "#aaa" }}>{r.min}pt〜</div></div>
                  <div style={{ fontSize: "11px", color: "#aaa" }}>信頼度 {"⭐".repeat(r.trust)}</div>
                  {r.id === myRank.id && <span style={{ fontSize: "11px", fontWeight: 700, color: r.color }}>← 現在</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 投稿履歴モーダル */}
      {showHistory && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "flex-end" }} onClick={e => e.target === e.currentTarget && setShowHistory(false)}>
          <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", width: "100%", padding: "24px 20px 40px", maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontWeight: 900, fontSize: "17px" }}>📋 投稿履歴</div>
              <button onClick={() => setShowHistory(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#aaa" }}>✕</button>
            </div>
            {(() => {
              const entries = Object.entries(getReportedStores()).sort((a,b) => new Date(b[1].date||b[1]) - new Date(a[1].date||a[1]));
              if (entries.length === 0) return <div style={{ textAlign: "center", padding: "32px 0", color: "#aaa" }}><div style={{ fontSize: "40px" }}>📭</div><div style={{ marginTop: 8, fontWeight: 700 }}>まだ投稿がありません</div></div>;
              return <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {entries.map(([placeId, data]) => (
                  <div key={placeId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px", background: "#fafafa", borderRadius: 10, border: "1px solid #eee" }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: "#111", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", flexShrink: 0 }}>{data.hasEatIn ? "🪑" : "✗"}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{data.storeName || "店舗名不明"}</div>
                      <div style={{ fontSize: "11px", color: data.hasEatIn ? "#2d6a4f" : "#e63946", marginTop: 1, fontWeight: 700 }}>{data.hasEatIn ? "イートインあり" : "イートインなし"}</div>
                    </div>
                    <div style={{ fontSize: "10px", color: "#aaa" }}>{new Date(data.date).toLocaleDateString("ja-JP")}</div>
                  </div>
                ))}
              </div>;
            })()}
          </div>
        </div>
      )}

      {/* 混雑モーダル */}
      {showCongestion && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "flex-end" }} onClick={e => e.target === e.currentTarget && setShowCongestion(null)}>
          <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", width: "100%", padding: "24px 20px 40px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontWeight: 900, fontSize: "16px" }}>🟡 今の混雑状況を教えて</div>
              <button onClick={() => setShowCongestion(null)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#aaa" }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {CONGESTION.map(cg => {
                const store = stores.find(s => s.place_id === showCongestion);
                return <button key={cg.id} onClick={e => store && handleCongestion(store, cg.id, e)} style={{ padding: "16px", borderRadius: 14, border: `2px solid ${cg.color}44`, background: cg.bg, color: cg.color, fontWeight: 700, fontSize: "16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: "24px" }}>{cg.icon}</span>{cg.label}</button>;
              })}
            </div>
          </div>
        </div>
      )}

      {/* 投稿モーダル */}
      {showReport && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "flex-end" }} onClick={e => e.target === e.currentTarget && setShowReport(false)}>
          <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", width: "100%", padding: "24px 20px 40px", maxHeight: "80vh", overflowY: "auto" }}>
            {submitted ? (
              <div style={{ textAlign: "center", padding: "28px 0" }}>
                <div style={{ fontSize: "52px" }}>🎉</div>
                <div style={{ fontWeight: 900, fontSize: "18px", marginTop: 10 }}>確認済み登録完了！</div>
                <div style={{ color: "#888", fontSize: "13px", marginTop: 4 }}>投稿数：{myReportCount}件</div>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontWeight: 900, fontSize: "16px" }}>{reportStep === 1 ? "✅ 実際に確認した情報を登録" : "✏️ コメント（任意）"}</div>
                  <button onClick={() => setShowReport(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#aaa" }}>✕</button>
                </div>
                {reportTarget && <div style={{ fontSize: "12px", color: "#888", marginBottom: 14 }}>📍 {reportTarget.name}</div>}
                <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
                  {[1,2].map(s => <div key={s} style={{ height: 4, flex: 1, borderRadius: 2, background: s <= reportStep ? "#e63946" : "#eee" }} />)}
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
                          {[["outlet","🔌 コンセント"],["wifi","📶 Wi-Fi"]].map(([key,label]) => (
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
