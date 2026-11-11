"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { GoogleMap, useJsApiLoader, OverlayView } from "@react-google-maps/api";
import { db } from "../lib/firebase";
import { collection, addDoc, getDocs, updateDoc, doc, increment, query, where, orderBy, limit } from "firebase/firestore";
import { AREAS } from "../lib/areas";
import { storesNear } from "../lib/store-tiles";
import SupportLink from "./components/SupportLink";

// ============================================================
// 定数・ユーティリティ
// ============================================================
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
// 投稿済みかどうか（以前の店舗IDで投稿した店も「投稿済み」とみなす）
function isReported(store) {
  const r = getReportedStores();
  return !!r[store.place_id] || (store.legacy_ids || []).some(id => r[id]);
}

const CHAIN_COLORS = { "セブン-イレブン": "#e63946", "ファミリーマート": "#00a040", "ローソン": "#0b5ea8", "ミニストップ": "#f4a261" };
function getChainColor(name) { for (const [k,v] of Object.entries(CHAIN_COLORS)) if (name.includes(k)) return v; return "#888"; }

// 一度に地図へ出す店の上限（近い順）。多すぎると地図が重く・見づらくなるため
const MAX_RESULTS = 80;

// 店舗マスタの店（lib/store-tiles.js）に、投稿情報の入れ物を付けて画面用の形にする
function blankStore(p) {
  // 投稿がまだない店は、チェーンの公式サイトに「イートインあり」と出ていればそれを仮の答えにする
  // （投稿が1件でも入れば、投稿のほうを優先する）
  return { ...p, legacy_ids: p.legacy_ids || [], verifications: [], helpedCount: 0, hasEatIn: p.official_eatin ? true : null, outlet: false, wifi: false, seats: null };
}

// その店の投稿を探すときに使うID（今の店舗ID＋以前のGoogleの店舗ID）
function queryIdsOf(store) {
  return [store.place_id, ...(store.legacy_ids || [])];
}

// 前回見ていた地図の位置（次に開いたときにそこから表示する）
const LAST_VIEW_KEY = "lastMapViewV1";
function readLastView() {
  try {
    const v = JSON.parse(localStorage.getItem(LAST_VIEW_KEY) || "null");
    if (v && Number.isFinite(v.lat) && Number.isFinite(v.lng)) return v;
  } catch { /* 読めなくても問題なし */ }
  return null;
}
function saveLastView(lat, lng, zoom) {
  try { localStorage.setItem(LAST_VIEW_KEY, JSON.stringify({ lat, lng, zoom })); } catch { /* 保存できなくても問題なし */ }
}

// 距離の表示（120m / 1.2km）
function formatDistance(d) {
  return d < 1000 ? `${Math.round(d / 10) * 10}m` : `${(d / 1000).toFixed(1)}km`;
}

// 投稿を古い順に並べる（createdAtはFirestoreのTimestamp）
function sortByCreated(vers) {
  return [...vers].sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
}

// 複数の投稿から「イートインあり/なし」を多数決で決める
// （1件のイタズラ投稿で正しい情報が上書きされるのを防ぐ）
function aggregateEatIn(vers, fallback) {
  if (!vers || vers.length === 0) return fallback ?? null;
  // 人の投稿を優先し、なければAI推定を使う
  const human = vers.filter(v => v.source !== "ai");
  const use = human.length > 0 ? human : vers;
  const yes = use.filter(v => v.hasEatIn === true).length;
  const no = use.filter(v => v.hasEatIn === false).length;
  if (yes > no) return true;
  if (no > yes) return false;
  // 同数なら最新の投稿を採用
  const sorted = sortByCreated(use);
  return sorted[sorted.length - 1]?.hasEatIn ?? fallback ?? null;
}

// AI推定のみ（人の確認がまだない）かどうか
function isAiOnly(store) {
  return (store.verifications?.length || 0) > 0 && store.verifications.every(v => v.source === "ai");
}

// 公式サイトの情報だけ（投稿がまだない）かどうか
function isOfficialOnly(store) {
  return !!store.official_eatin && (store.verifications?.length || 0) === 0;
}

// 人の確認がまだない「仮の情報」（AI推定だけ、または公式サイトの情報だけ）かどうか
function isEstimate(store) {
  return isAiOnly(store) || isOfficialOnly(store);
}

// 人の確認がない（未確認 or 仮の情報だけ）＝「要確認」の店
function needsCheck(store) {
  return store.hasEatIn === null || store.hasEatIn === undefined || isEstimate(store);
}

// ピンカラー
function getPinColor(store) {
  const ai = isEstimate(store);
  if (store.hasEatIn === true) return ai ? "#90caf9" : "#1e88e5"; // あり：青（AI推定は薄い青）
  if (store.hasEatIn === false) return ai ? "#cfcfcf" : "#9e9e9e"; // なし：グレー（AI推定は薄いグレー）
  return "#f57c00";                                               // 未確認：濃いオレンジ（目立たせる）
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
  const unknown = store.hasEatIn === null || store.hasEatIn === undefined;
  const ai = isEstimate(store);
  return (
    <div onClick={onClick} className={unknown && !isSelected ? "eatin-pin-unknown" : undefined} style={{
      display: "flex", flexDirection: "column", alignItems: "center", position: "relative",
      cursor: "pointer", transform: isSelected ? "scale(1.3)" : "scale(1)",
      transition: "transform 0.15s ease", zIndex: isSelected ? 100 : 1,
    }}>
      <div style={{
        background: color, color: "#fff", borderRadius: "50% 50% 50% 0",
        transform: "rotate(-45deg)", width: isSelected ? 36 : 28,
        height: isSelected ? 36 : 28, display: "flex", alignItems: "center",
        justifyContent: "center", border: ai ? "2px dashed #fff" : "2px solid #fff",
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

// 投稿のあとに「近くの要確認の店」を提案する小さな部品
function NextStoreSuggest({ list, origin, onPick }) {
  if (!list || list.length === 0) return null;
  return (
    <div style={{ background: "#fff3e0", border: "1.5px solid #ffcc80", borderRadius: 12, padding: "10px 12px", marginBottom: 8 }}>
      <div style={{ fontSize: "12px", fontWeight: 800, color: "#e65100", marginBottom: 6 }}>🙏 近くにまだ確認されていない店があります</div>
      {list.map(s => (
        <button key={s.place_id} onClick={() => onPick(s)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #ffe0b2", borderRadius: 10, padding: "8px 10px", marginTop: 6, cursor: "pointer", fontFamily: "inherit" }}>
          <span style={{ fontSize: "12.5px", fontWeight: 700, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "left" }}>{s.name}</span>
          <span style={{ fontSize: "11px", color: "#e65100", fontWeight: 700, flexShrink: 0 }}>{origin ? formatDistance(calcDistance(origin.lat, origin.lng, s.lat, s.lng)) : ""} 教える →</span>
        </button>
      ))}
    </div>
  );
}

// ============================================================
// メインコンポーネント
// initialLat / initialLng: URLやエリアページから渡される初期地点（自動検索する）
// initialPlace: 共有リンクで開いたときに自動選択する店舗のplace_id
// ============================================================
// initialStores: エリアページから渡される作り置きの店舗リスト（あればGoogleを呼ばずに表示する）
export default function EatInFinder({ initialLat = null, initialLng = null, initialPlace = null, initialStores = null, storeCount = null, totalStores = null }) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchArea, setSearchArea] = useState("");
  const [selected, setSelected] = useState(null);
  const [mapCenter, setMapCenter] = useState(
    // 初めての人のデフォルトは東京駅（掲載エリアが最も多い）。前回の位置や現在地があれば開いた直後にそちらへ移動する
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : { lat: 35.6812, lng: 139.7671 }
  );
  const [mapZoom, setMapZoom] = useState(initialLat ? 16 : 15);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const [infoMsg, setInfoMsg] = useState("");   // 「更新しました」などの控えめな通知
  const [filterEatIn, setFilterEatIn] = useState(false);
  const [filterVerified, setFilterVerified] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);
  const [reportStep, setReportStep] = useState(1);
  const [reportData, setReportData] = useState({ hasEatIn: null, outlet: false, wifi: false, seats: "", comment: "" });
  const [submitted, setSubmitted] = useState(false);
  const [searchCenter, setSearchCenter] = useState(null);
  const [myLocation, setMyLocation] = useState(null);
  const [recentPosts, setRecentPosts] = useState([]);
  const [justReported, setJustReported] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [textSearching, setTextSearching] = useState(false);
  const [filterOutlet, setFilterOutlet] = useState(false);
  const [filterWifi, setFilterWifi] = useState(false);
  const [filterNeedsCheck, setFilterNeedsCheck] = useState(false);
  const [showList, setShowList] = useState(false);      // 近い順の一覧
  const [showMenu, setShowMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showPosts, setShowPosts] = useState(false);
  const [areaKeyword, setAreaKeyword] = useState("");
  const mapRef = useRef(null);
  const pendingSelectRef = useRef(initialPlace); // 共有リンクからの自動選択待ち
  const [refreshTick, setRefreshTick] = useState(0); // 同じ場所でもう一度探したときに、投稿情報を読み直す合図
  const storesRef = useRef([]);                  // 最新の店舗一覧（コールバック内から参照する用）

  // 投稿（イートイン有無など）をFirestoreから読み込む。表示中の店舗分だけをまとめて取得する
  // 以前の投稿はGoogleの店舗IDにひもづいているので、今の店舗IDと以前のIDの両方で探して1店にまとめる
  const loadFirestoreData = useCallback(async (targets) => {
    if (!targets || targets.length === 0) return;
    try {
      const owner = {}; // 問い合わせに使うID → 店舗ID
      for (const s of targets) for (const id of queryIdsOf(s)) owner[id] = s.place_id;
      const ids = Object.keys(owner);
      // Firestoreの"in"検索は一度に30件までなので分割する
      const chunks = [];
      for (let i = 0; i < ids.length; i += 30) chunks.push(ids.slice(i, i + 30));
      const snaps = await Promise.all(chunks.map(chunk =>
        getDocs(query(collection(db, "verifications"), where("placeId", "in", chunk)))
      ));
      const verMap = {};
      for (const snap of snaps) {
        snap.forEach(d => {
          const data = d.data();
          const storeId = owner[data.placeId];
          if (!storeId) return;
          (verMap[storeId] ||= []).push({ ...data, docId: d.id });
        });
      }
      setStores(prev => prev.map(s => {
        const vers = sortByCreated(verMap[s.place_id] || s.verifications || []);
        return {
          ...s,
          verifications: vers,
          hasEatIn: aggregateEatIn(vers, s.official_eatin ? true : s.hasEatIn),
          outlet: s.outlet || vers.some(v => v.outlet === true),
          wifi: s.wifi || vers.some(v => v.wifi === true),
          seats: s.seats ?? [...vers].reverse().find(v => v.seats != null)?.seats ?? null,
        };
      }));
    } catch (e) { console.error("Firestore読み込みエラー:", e); }
  }, []);

  useEffect(() => { storesRef.current = stores; }, [stores]);

  // 店舗情報が更新されたら（投稿・読み込み完了など）、開いている詳細パネルも最新の内容にする
  useEffect(() => {
    if (!selected) return;
    const latest = stores.find(s => s.place_id === selected.place_id);
    if (latest && latest !== selected) setSelected(latest);
  }, [stores, selected]);

  // 表示する店の顔ぶれが変わったら（または同じ場所を探し直したら）、その店の投稿を読み込む
  const storeIdsKey = stores.map(s => s.place_id).sort().join("|");
  useEffect(() => {
    if (storesRef.current.length > 0) loadFirestoreData(storesRef.current);
  }, [storeIdsKey, refreshTick, loadFirestoreData]);

  // 店を選んだら、その店の「助かった！」の数を読み込む（詳細パネルでしか使わないので、選んだ店の分だけ）
  const selectedId = selected?.place_id || null;
  useEffect(() => {
    if (!selectedId) return;
    const store = storesRef.current.find(s => s.place_id === selectedId);
    if (!store) return;
    let cancelled = false;
    getDocs(query(collection(db, "helped"), where("placeId", "in", queryIdsOf(store).slice(0, 30))))
      .then(snap => {
        if (cancelled) return;
        let count = 0;
        snap.forEach(d => { count += d.data().count || 0; });
        setStores(prev => prev.map(s => (s.place_id === selectedId && !s.helpedByMe ? { ...s, helpedCount: count } : s)));
      })
      .catch(e => console.error(e));
    return () => { cancelled = true; };
  }, [selectedId]);

  // 共有リンクで開いたとき、該当店舗を自動で選択する
  useEffect(() => {
    if (!pendingSelectRef.current || stores.length === 0) return;
    const want = pendingSelectRef.current; // 以前の共有リンクはGoogleの店舗IDなので、そちらでも探す
    const target = stores.find(s => s.place_id === want || (s.legacy_ids || []).includes(want));
    if (target) {
      setSelected(target);
      pendingSelectRef.current = null;
    }
  }, [stores]);

  const loadRecentPosts = useCallback(async () => {
    try {
      const q = query(collection(db, "verifications"), orderBy("createdAt", "desc"), limit(5));
      const snap = await getDocs(q);
      setRecentPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { loadRecentPosts(); }, [loadRecentPosts]);

  const shareOnX = (storeName, hasEatIn) => {
    const text = hasEatIn
      ? `「${storeName}」にイートインスペースがありました！ #コンビニイートインマップ`
      : `「${storeName}」のイートイン情報を確認しました。 #コンビニイートインマップ`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent("https://www.eatin-map.jp")}`,
      "_blank"
    );
  };

  // 店舗の共有リンクをコピー（「この店イートインあるよ」とURLで共有できる）
  const copyStoreLink = (store) => {
    const url = `${window.location.origin}/?lat=${store.lat.toFixed(6)}&lng=${store.lng.toFixed(6)}&place=${store.place_id}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      }).catch(() => {});
    }
  };

  // 近くのコンビニを店舗マスタから探して表示する
  // （店舗マスタはサイト内のファイルなので、何回探しても料金はかからず、1日の上限もない）
  const searchPlaces = useCallback(async (lat, lng, radius = 500) => {
    setLoading(true);
    setGpsError("");
    setInfoMsg("");
    try {
      const found = await storesNear(lat, lng, radius, MAX_RESULTS);
      if (found.length === 0) {
        setStores([]);
        setSelected(null);
        setGpsError("このあたりにコンビニが見つかりませんでした。少し移動して試してください");
      } else {
        // すでに表示中の店は、読み込み済みの投稿情報をそのまま引き継ぐ（ピンがちらつかない）
        const known = new Map(storesRef.current.map(s => [s.place_id, s]));
        setStores(found.map(p => known.get(p.place_id) || blankStore(p)));
        setSelected(sel => (sel && found.some(p => p.place_id === sel.place_id) ? sel : null));
        setRefreshTick(t => t + 1); // 投稿情報を最新にする
      }
    } catch (e) {
      console.error("検索エラー:", e);
      setGpsError("店舗情報を読み込めませんでした。通信状況を確認して、もう一度お試しください");
    }
    setLoading(false);
  }, []);

  // URL付きで開いた場合（共有リンク・エリアページ）は自動で検索する
  useEffect(() => {
    if (initialLat && initialLng) {
      setSearchCenter({ lat: initialLat, lng: initialLng });
      // エリアページ：ページと一緒に届いた店舗リスト（駅から600m以内の全店）をそのまま表示
      // 投稿情報（イートイン有無など）は店舗がセットされた後に自動でFirestoreから読み込まれる
      if (Array.isArray(initialStores) && initialStores.length > 0) {
        setStores(initialStores.map(blankStore)
          .sort((a, b) => calcDistance(initialLat, initialLng, a.lat, a.lng) - calcDistance(initialLat, initialLng, b.lat, b.lng)));
        return;
      }
      searchPlaces(initialLat, initialLng);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // URL指定なしで開いたとき：
  //   ① 位置情報を「すでに許可済み」の人 → 現在地へ移動（許可の確認画面は出さない）
  //   ② それ以外 → 前回見ていた場所へ移動
  //   どちらも、その場所のコンビニをすぐ表示する（店舗マスタから読むだけなので料金はかからない）
  //   初めての人（前回の場所がない）は、何も表示せず検索を待つ
  useEffect(() => {
    // 以前の仕組み（Googleの検索結果を端末に保存）の残りを片付ける
    try { localStorage.removeItem("placesCacheV1"); } catch { /* 消せなくても問題なし */ }
    if (initialLat && initialLng) return;
    let cancelled = false;

    const showAround = (lat, lng) => {
      setSearchCenter({ lat, lng });
      searchPlaces(lat, lng);
    };
    const goLastView = () => {
      const v = readLastView();
      if (!v || cancelled) return;
      setMapCenter({ lat: v.lat, lng: v.lng });
      setMapZoom(v.zoom || 15);
      showAround(v.lat, v.lng);
    };

    (async () => {
      let granted = false;
      try {
        const status = await navigator.permissions?.query({ name: "geolocation" });
        granted = status?.state === "granted";
      } catch { /* 確認できないブラウザでは前回の位置を使う */ }
      if (cancelled) return;
      if (!granted || !navigator.geolocation) { goLastView(); return; }
      navigator.geolocation.getCurrentPosition(
        pos => {
          if (cancelled) return;
          const { latitude: lat, longitude: lng } = pos.coords;
          setMapCenter({ lat, lng });
          setMapZoom(16);
          setMyLocation({ lat, lng });
          showAround(lat, lng);
        },
        () => goLastView(),
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 }
      );
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 地図を動かし終わったら、その位置を覚えておく（次回はここから表示）
  // いま地図に表示している範囲（中心と、表示範囲に合わせた検索半径）
  const getViewArea = useCallback(() => {
    const map = mapRef.current;
    const center = map?.getCenter();
    if (!center) return null;
    const lat = center.lat();
    const lng = center.lng();
    let radius = 500;
    const bounds = map.getBounds();
    if (bounds) {
      const ne = bounds.getNorthEast();
      radius = Math.round(Math.min(1500, Math.max(300, calcDistance(lat, lng, ne.lat(), ne.lng()) * 0.7)));
    }
    return { lat, lng, radius };
  }, []);

  // 地図が止まったとき：位置を覚えておく（次回はここから表示）
  const handleIdle = useCallback(() => {
    const view = getViewArea();
    if (view) saveLastView(view.lat, view.lng, mapRef.current.getZoom());
  }, [getViewArea]);

  // 店舗を選んで地図をその店へ移動する（一覧・おすすめから使う）
  const focusStore = useCallback((store) => {
    setSelected(store);
    setShowList(false);
    mapRef.current?.panTo({ lat: store.lat, lng: store.lng });
  }, []);

  // エリアページ用: ユーザーが手動で別の場所を検索したことをページ側に知らせる
  // （エリアページのタイトルや店舗一覧が古い場所のまま残らないようにするため）
  const notifyUserSearch = () => {
    if (typeof window !== "undefined") window.dispatchEvent(new Event("eatinmap:usersearch"));
  };

  // 駅名・エリア名のテキスト検索（/api/search が座標に変換する）
  const handleTextSearch = useCallback(async () => {
    const q = searchArea.trim();
    if (!q || textSearching) return;
    setGpsError("");
    setTextSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.lat && data.lng) {
        notifyUserSearch();
        setMapCenter({ lat: data.lat, lng: data.lng });
        setMapZoom(16);
        setSearchCenter({ lat: data.lat, lng: data.lng });
        searchPlaces(data.lat, data.lng);
      } else {
        setGpsError(data.userMessage || "場所が見つかりませんでした。駅名やエリア名で試してください");
      }
    } catch {
      setGpsError("検索に失敗しました。時間をおいて再度お試しください");
    }
    setTextSearching(false);
  }, [searchArea, textSearching, searchPlaces]);

  // GPS
  const handleGPS = useCallback(() => {
    if (!navigator.geolocation) { setGpsError("このブラウザはGPS非対応です"); return; }
    setGpsError(""); setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        notifyUserSearch();
        setGpsLoading(false);
        setMapCenter({ lat, lng });
        setMapZoom(16);
        setSearchCenter({ lat, lng });
        setMyLocation({ lat, lng });
        searchPlaces(lat, lng);
      },
      (err) => {
        setGpsLoading(false);
        setGpsError(err.code === 1 ? "位置情報の許可が必要です" : "現在地を取得できませんでした");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [searchPlaces]);

  // 地図移動後に再検索（表示範囲に合わせて検索半径を自動調整）
  const handleMapIdle = useCallback(() => {
    const view = getViewArea();
    if (!view) return;
    const { lat, lng, radius } = view;
    notifyUserSearch();
    setSearchCenter({ lat, lng });
    searchPlaces(lat, lng, radius);
  }, [searchPlaces, getViewArea]);

  // 助かった
  const handleHelped = async (store, e) => {
    e.stopPropagation();
    setStores(prev => prev.map(s => s.place_id === store.place_id ? { ...s, helpedCount: (s.helpedCount||0)+1, helpedByMe: true } : s));
    try {
      // 以前のIDで記録が残っていればそこに足す。なければ今の店舗IDで新しく作る
      const q = query(collection(db, "helped"), where("placeId", "in", queryIdsOf(store).slice(0, 30)));
      const snap = await getDocs(q);
      if (snap.empty) await addDoc(collection(db, "helped"), { placeId: store.place_id, count: 1 });
      else await updateDoc(doc(db, "helped", snap.docs[0].id), { count: increment(1) });
    } catch (e) { console.error(e); }
  };

  // 投稿
  const handleSubmitReport = async () => {
    if (!reportTarget) return;
    if (isReported(reportTarget)) return;
    setStores(prev => prev.map(s => {
      if (s.place_id !== reportTarget.place_id) return s;
      const newVer = { userId: "me", comment: reportData.comment, hasEatIn: reportData.hasEatIn };
      const vers = [...(s.verifications||[]), newVer];
      return { ...s, hasEatIn: aggregateEatIn(vers, s.hasEatIn), outlet: reportData.outlet||s.outlet, wifi: reportData.wifi||s.wifi, seats: reportData.seats ? parseInt(reportData.seats) : s.seats, verifications: vers };
    }));
    markAsReported(reportTarget.place_id, reportTarget.name, reportData.hasEatIn);
    setSubmitted(true);
    try {
      await addDoc(collection(db, "verifications"), {
        placeId: reportTarget.place_id, placeName: reportTarget.name,
        hasEatIn: reportData.hasEatIn, outlet: reportData.outlet, wifi: reportData.wifi,
        seats: reportData.seats ? parseInt(reportData.seats) : null,
        comment: reportData.comment, createdAt: new Date(),
      });
      loadRecentPosts();
    } catch (e) { console.error(e); }
  };

  const handleQuickReport = async (store, hasEatIn, e) => {
    e.stopPropagation();
    if (isReported(store)) return;
    setStores(prev => prev.map(s => {
      if (s.place_id !== store.place_id) return s;
      const newVer = { userId: "me", comment: hasEatIn ? "イートインあり" : "イートインなし", hasEatIn };
      const vers = [...(s.verifications||[]), newVer];
      return { ...s, hasEatIn: aggregateEatIn(vers, s.hasEatIn), verifications: vers };
    }));
    markAsReported(store.place_id, store.name, hasEatIn);
    setJustReported({ storeId: store.place_id, storeName: store.name, hasEatIn });
    try {
      await addDoc(collection(db, "verifications"), {
        placeId: store.place_id, placeName: store.name, hasEatIn,
        outlet: false, wifi: false, seats: null,
        comment: hasEatIn ? "イートインあり" : "イートインなし",
        createdAt: new Date(),
      });
    } catch (e) { console.error(e); }
  };

  const filtered = stores.filter(s => {
    if (filterEatIn && !s.hasEatIn) return false;
    if (filterVerified && (!s.verifications || s.verifications.length === 0)) return false;
    if (filterOutlet && !s.outlet) return false;
    if (filterWifi && !s.wifi) return false;
    if (filterNeedsCheck && !needsCheck(s)) return false;
    return true;
  });

  // 距離の基準（現在地 → 検索した地点 → 地図の中心）
  const origin = myLocation || searchCenter || mapCenter;
  const byDistance = [...filtered].sort((a, b) => calcDistance(origin.lat, origin.lng, a.lat, a.lng) - calcDistance(origin.lat, origin.lng, b.lat, b.lng));
  const nearestSeat = byDistance.find(s => s.hasEatIn === true);
  const needsCheckCount = stores.filter(needsCheck).length;

  // 投稿のあとに出す「近くの要確認の店」（自分がまだ投稿していない店を近い順に2件）
  const suggestNext = (base) => {
    if (!base) return [];
    return stores
      .filter(s => s.place_id !== base.place_id && needsCheck(s) && !isReported(s))
      .sort((a, b) => calcDistance(base.lat, base.lng, a.lat, a.lng) - calcDistance(base.lat, base.lng, b.lat, b.lng))
      .slice(0, 2);
  };

  const mapContainerStyle = { width: "100%", height: "100%" };
  const mapOptions = {
    disableDefaultUI: true,
    zoomControl: false,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    clickableIcons: false,
    // 地図の下に読みものがあってページがスクロールできても、地図は1本指で動かせるようにする
    gestureHandling: "greedy",
    styles: [
      { featureType: "poi", stylers: [{ visibility: "off" }] },
      { featureType: "transit", stylers: [{ visibility: "simplified" }] },
    ],
  };

  return (
    <div style={{ fontFamily: "'Noto Sans JP','Hiragino Sans',sans-serif", height: "100dvh", display: "flex", flexDirection: "column", background: "#f4f5f7", color: "#1a1a1a", overflow: "hidden" }}>
      {/* 未確認ピンをふわっと点滅させて目立たせる */}
      <style>{`
        @keyframes eatinPulse { 0% { transform: scale(1); opacity: .55 } 100% { transform: scale(2.2); opacity: 0 } }
        .eatin-pin-unknown::before { content: ""; position: absolute; top: 2px; left: 50%; width: 24px; height: 24px; margin-left: -12px; border-radius: 50%; background: #f57c00; animation: eatinPulse 1.8s ease-out infinite; pointer-events: none; }
        @media (prefers-reduced-motion: reduce) { .eatin-pin-unknown::before { animation: none; opacity: .25 } }
      `}</style>

      {/* ヘッダー */}
      <div style={{ background: "#fff", borderBottom: "2px solid #111", padding: "10px 14px", zIndex: 100, boxShadow: "0 2px 8px rgba(0,0,0,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <Link href="/" onClick={() => { setStores([]); setSelected(null); setMyLocation(null); setSearchArea(""); setGpsError(""); }} style={{ fontWeight: 900, fontSize: "15px", letterSpacing: "-0.5px", textDecoration: "none", color: "inherit", fontFamily: "inherit" }}>
          🏪 <span style={{ color: "#e63946" }}>コンビニ</span>イートインマップ
        </Link>
        <button onClick={() => setShowMenu(true)} aria-label="メニュー" style={{ background: "#fff", border: "1.5px solid #ddd", borderRadius: 10, padding: "5px 11px", fontSize: "15px", cursor: "pointer", color: "#333", lineHeight: 1 }}>☰</button>
      </div>

      {/* 検索バー */}
      <div style={{ background: "#fff", padding: "10px 14px", borderBottom: "1px solid #eee", flexShrink: 0, zIndex: 50 }}>
        {/* 駅名・エリア名検索 */}
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input
            value={searchArea}
            onChange={e => setSearchArea(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleTextSearch(); }}
            placeholder="駅名・エリア名で検索（例：新宿駅）"
            style={{ flex: 1, minWidth: 0, padding: "9px 12px", borderRadius: 10, border: "1.5px solid #ddd", fontSize: "13px", outline: "none", fontFamily: "inherit" }}
          />
          <button onClick={handleTextSearch} disabled={textSearching || loading} style={{ padding: "9px 16px", borderRadius: 10, border: "none", background: textSearching ? "#ddd" : "#111", color: "#fff", fontWeight: 700, fontSize: "13px", cursor: textSearching ? "default" : "pointer", whiteSpace: "nowrap" }}>
            {textSearching ? "…" : "🔍 検索"}
          </button>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button onClick={handleGPS} disabled={gpsLoading || loading} style={{ flex: 1, padding: "9px", borderRadius: 10, border: "1.5px solid #ddd", background: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", color: "#333", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            {gpsLoading ? <><span>⏳</span>取得中…</> : <><span>📡</span>現在地から探す</>}
          </button>
          <button onClick={handleMapIdle} disabled={loading} style={{ padding: "9px 14px", borderRadius: 10, border: "none", background: loading ? "#ddd" : "#e63946", color: "#fff", fontWeight: 700, fontSize: "13px", cursor: loading ? "default" : "pointer", whiteSpace: "nowrap" }}>
            {loading ? "検索中…" : "この地図で探す"}
          </button>
        </div>
        {gpsError && <div style={{ padding: "6px 10px", background: "#ffeaea", borderRadius: 8, fontSize: "11px", color: "#c0392b", marginBottom: 6 }}>⚠️ {gpsError}</div>}
        {infoMsg && <div style={{ padding: "6px 10px", background: "#e8f5e9", borderRadius: 8, fontSize: "11px", color: "#2d6a4f", marginBottom: 6 }}>✓ {infoMsg}</div>}
        {/* フィルター（普段は折りたたんで地図を広く使う） */}
        {(() => {
          const FILTERS = [[filterEatIn, setFilterEatIn, "🪑 イートインあり", "#e63946"], [filterVerified, setFilterVerified, "✅ 確認済み", "#b7950b"], [filterOutlet, setFilterOutlet, "🔌 コンセント", "#0077b6"], [filterWifi, setFilterWifi, "📶 Wi-Fi", "#6a4c93"], [filterNeedsCheck, setFilterNeedsCheck, "❓ 要確認（投稿募集中）", "#f57c00"]];
          const activeCount = FILTERS.filter(f => f[0]).length;
          return (
            <>
              <button onClick={() => setShowFilters(!showFilters)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 20, border: `1.5px solid ${activeCount > 0 ? "#e63946" : "#ddd"}`, background: activeCount > 0 ? "#ffeaea" : "#fff", color: activeCount > 0 ? "#e63946" : "#888", fontWeight: 700, fontSize: "11px", cursor: "pointer" }}>
                <span>🔎 絞り込み{activeCount > 0 ? `（${activeCount}）` : ""}</span>
                <span style={{ fontSize: "9px" }}>{showFilters ? "▲" : "▼"}</span>
              </button>
              {showFilters && (
                <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2, marginTop: 6 }}>
                  {FILTERS.map(([active, setter, label, ac]) => (
                    <button key={label} onClick={() => setter(!active)} style={{ padding: "4px 10px", borderRadius: 20, border: `1.5px solid ${active ? ac : "#ddd"}`, background: active ? `${ac}18` : "#fff", color: active ? ac : "#888", fontWeight: 700, fontSize: "11px", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>{label}</button>
                  ))}
                </div>
              )}
            </>
          );
        })()}
        {storeCount && stores.length === 0 && !loading && (
          <div style={{ fontSize: "10.5px", color: "#999", marginTop: 6, textAlign: "center", letterSpacing: "0.2px" }}>
            🗾 {totalStores ? `全国${totalStores.toLocaleString()}店のうち ` : ""}<span style={{ color: "#e63946", fontWeight: 800 }}>{storeCount.toLocaleString()}店舗</span>のイートイン情報を掲載中
          </div>
        )}
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
            onIdle={handleIdle}
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
            {myLocation && (
              <OverlayView
                position={myLocation}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: "50%",
                  background: "#4285f4", border: "3px solid #fff",
                  boxShadow: "0 2px 8px rgba(66,133,244,0.6)",
                  transform: "translate(-50%, -50%)",
                }} />
              </OverlayView>
            )}
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

        {/* 凡例（1行のコンパクト表示） */}
        {!selected && (
          <div style={{ position: "absolute", bottom: "calc(40px + env(safe-area-inset-bottom, 0px))", left: "50%", transform: "translateX(-50%)", background: "rgba(255,255,255,0.92)", borderRadius: 14, padding: "4px 10px", boxShadow: "0 1px 6px rgba(0,0,0,0.12)", fontSize: "10px", color: "#555", zIndex: 5, display: "flex", gap: 9, whiteSpace: "nowrap" }}>
            {[["#1e88e5", "あり"], ["#90caf9", "たぶんあり"], ["#9e9e9e", "なし"], ["#f57c00", "未確認"]].map(([c, l]) => (
              <span key={l} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: c, display: "inline-block" }} />{l}
              </span>
            ))}
          </div>
        )}

        {/* 件数バッジ＋一覧ボタン */}
        {stores.length > 0 && (
          <div style={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 6, zIndex: 5 }}>
            <div style={{ background: "#fff", borderRadius: 20, padding: "6px 12px", boxShadow: "0 2px 10px rgba(0,0,0,0.12)", fontSize: "12px", fontWeight: 700 }}>
              📍 {filtered.length}件{needsCheckCount > 0 && <span style={{ color: "#e65100" }}>（要確認{needsCheckCount}）</span>}
            </div>
            <button onClick={() => { setShowList(true); setSelected(null); }} style={{ background: "#111", color: "#fff", border: "none", borderRadius: 20, padding: "6px 12px", boxShadow: "0 2px 10px rgba(0,0,0,0.15)", fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              📋 近い順
            </button>
          </div>
        )}

        {/* いちばん近い座れる店（ワンタップで選択） */}
        {stores.length > 0 && !selected && !showList && nearestSeat && (
          <button onClick={() => focusStore(nearestSeat)} style={{ position: "absolute", top: 52, left: 12, maxWidth: "calc(100% - 24px)", background: "#1e88e5", color: "#fff", border: "none", borderRadius: 20, padding: "7px 14px", boxShadow: "0 2px 10px rgba(30,136,229,0.35)", fontSize: "12px", fontWeight: 700, cursor: "pointer", zIndex: 5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "inherit" }}>
            🪑 いちばん近い座れる店：{nearestSeat.name}（{formatDistance(calcDistance(origin.lat, origin.lng, nearestSeat.lat, nearestSeat.lng))}）
          </button>
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

          <div style={{ padding: "0 16px", paddingBottom: "calc(32px + env(safe-area-inset-bottom, 0px))" }}>
            {/* 店舗名・基本情報 */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: getChainColor(selected.name), flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: "14px", lineHeight: 1.4 }}>{selected.name}</div>
                <div style={{ fontSize: "11px", color: "#999", marginTop: 2 }}>📍 {selected.address}</div>
                {searchCenter && (
                  <div style={{ fontSize: "11px", color: "#0077b6", marginTop: 1 }}>
                    🚶 {(() => { const d = calcDistance(searchCenter.lat, searchCenter.lng, selected.lat, selected.lng); return d < 1000 ? `${Math.round(d)}m` : `${(d/1000).toFixed(1)}km`; })()}
                  </div>
                )}
              </div>
              <div style={{ padding: "5px 10px", marginRight: 30, borderRadius: 20, flexShrink: 0, background: selected.hasEatIn ? "#e8f5e9" : selected.hasEatIn === false ? "#f5f5f5" : "#fff7f0", border: `1px solid ${selected.hasEatIn ? "#a5d6a7" : selected.hasEatIn === false ? "#eee" : "#fcd5a0"}`, color: selected.hasEatIn ? "#2d6a4f" : selected.hasEatIn === false ? "#ccc" : "#f4a261", fontSize: "12px", fontWeight: 700 }}>
                {selected.hasEatIn ? (isEstimate(selected) ? "🪑 たぶんあり（要確認）" : "🪑 あり") : selected.hasEatIn === false ? (isAiOnly(selected) ? "✗ たぶんなし（要確認）" : "✗ なし") : "? 未確認"}
              </div>
            </div>

            {/* タグ */}
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
              {selected.hasEatIn && selected.seats && <span style={{ fontSize: "11px", background: "#f0f0f0", borderRadius: 20, padding: "2px 8px", color: "#555" }}>🪑 {selected.seats}席</span>}
              {selected.outlet && <span style={{ fontSize: "11px", background: "#e3f2fd", borderRadius: 20, padding: "2px 8px", color: "#0077b6" }}>🔌 コンセント</span>}
              {selected.wifi && <span style={{ fontSize: "11px", background: "#e8f5e9", borderRadius: 20, padding: "2px 8px", color: "#2d6a4f" }}>📶 Wi-Fi</span>}
            </div>

            {/* ワンタップ投稿（スクロールせずに押せるよう上部に配置） */}
            <div style={{ marginBottom: 12 }}>
            {isReported(selected) ? (
              <div>
                <div style={{ padding: "12px", borderRadius: 12, background: "#f5f5f5", textAlign: "center", fontSize: "13px", color: "#aaa", fontWeight: 700, marginBottom: 8 }}>✅ 投稿済みです（1店舗1回まで）</div>
                {justReported?.storeId === selected.place_id && (
                  <>
                    <NextStoreSuggest list={suggestNext(selected)} origin={selected} onPick={focusStore} />
                    <button onClick={() => shareOnX(justReported.storeName, justReported.hasEatIn)} style={{ width: "100%", padding: "11px", borderRadius: 12, border: "none", background: "#000", color: "#fff", fontWeight: 700, fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      𝕏 Xでシェアする
                    </button>
                  </>
                )}
              </div>
            ) : (
              <>
                <div style={{ fontSize: "12px", color: needsCheck(selected) ? "#e65100" : "#888", marginBottom: 8, fontWeight: 700 }}>
                  {selected.hasEatIn === null || selected.hasEatIn === undefined
                    ? "📝 まだ誰も確認していません。行ったら教えてください！"
                    : isOfficialOnly(selected)
                      ? "📝 公式サイトでは「イートインあり」の店です。実際どうだったか教えてください！"
                    : isAiOnly(selected)
                      ? "📝 AIの推定です。実際どうだったか教えてください！"
                      : "📝 実際に行った方は教えてください！"}
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <button onClick={e => handleQuickReport(selected, true, e)} style={{ flex: 1, borderRadius: 12, border: "2px solid #a5d6a7", background: "#e8f5e9", color: "#2d6a4f", fontSize: "13.5px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", padding: "12px 6px" }}>🪑 イートインあった！</button>
                  <button onClick={e => handleQuickReport(selected, false, e)} style={{ flex: 1, borderRadius: 12, border: "2px solid #ffcdd2", background: "#ffeaea", color: "#c0392b", fontSize: "13.5px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", padding: "12px 6px" }}>✗ なかった</button>
                </div>
                <button onClick={e => { e.stopPropagation(); setReportTarget(selected); setShowReport(true); }} style={{ width: "100%", padding: "8px", borderRadius: 10, border: "1.5px solid #ddd", background: "#fff", fontSize: "12px", color: "#888", cursor: "pointer", fontWeight: 600 }}>席数・コンセント・Wi-Fiも詳しく登録する →</button>
              </>
            )}
            </div>

            {/* 確認済みバッジ */}
            {selected.verifications && selected.verifications.length > 0 ? (
              <div style={{ background: "#fffbea", border: "1.5px solid #f4d03f44", borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>
                <div style={{ fontSize: "11px", color: "#b7950b", fontWeight: 700, marginBottom: 6 }}>{isAiOnly(selected) ? "🤖 クチコミからのAI推定（実際に行ったら教えてください）" : `✅ ユーザー確認情報（${selected.verifications.length}件）`}</div>
                {selected.verifications.slice(-2).reverse().map((v, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "4px 0", borderTop: i > 0 ? "1px solid #fdebd0" : "none" }}>
                    <div style={{ flex: 1, fontSize: "12px", color: "#555" }}>{v.comment || "確認済み"}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ background: "#f5f5f5", border: "1.5px dashed #ddd", borderRadius: 10, padding: "8px 12px", marginBottom: 10, fontSize: "11px", color: "#aaa", fontWeight: 700 }}>
                🔍 情報募集中 — 最初に投稿してみよう！
              </div>
            )}

            {/* Googleマップで開く・リンクコピー */}
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <a href={`https://maps.google.com/?q=${encodeURIComponent(selected.name + " " + selected.address)}`} target="_blank" rel="noopener noreferrer" style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1.5px solid #e0e0e0", borderRadius: 10, padding: "9px 12px", textDecoration: "none" }}>
                <span style={{ fontSize: "16px" }}>📍</span>
                <div style={{ fontSize: "12px", color: "#0077b6", fontWeight: 600, lineHeight: 1.3 }}>Googleマップ →<div style={{ fontSize: "10px", color: "#999", fontWeight: 500 }}>道順・営業時間</div></div>
              </a>
              <button onClick={() => copyStoreLink(selected)} style={{ display: "flex", alignItems: "center", gap: 6, background: linkCopied ? "#e8f5e9" : "#fff", border: `1.5px solid ${linkCopied ? "#a5d6a7" : "#e0e0e0"}`, borderRadius: 10, padding: "9px 12px", cursor: "pointer", fontSize: "12px", fontWeight: 600, color: linkCopied ? "#2d6a4f" : "#555", whiteSpace: "nowrap" }}>
                {linkCopied ? "✓ コピーしました" : "🔗 この店を共有"}
              </button>
            </div>

            {/* 助かった */}
            <button onClick={e => handleHelped(selected, e)} disabled={selected.helpedByMe} style={{ width: "100%", padding: "10px", borderRadius: 10, border: `1.5px solid ${selected.helpedByMe ? "#eee" : "#f4a261"}`, background: selected.helpedByMe ? "#fafafa" : "#fff7f0", color: selected.helpedByMe ? "#ccc" : "#e67e00", fontSize: "13px", fontWeight: 700, cursor: selected.helpedByMe ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 10 }}>
              {selected.helpedByMe ? "👍 助かった！を送りました" : `👍 助かった！ ${selected.helpedCount > 0 ? `${selected.helpedCount}人が役に立ったと言っています` : "最初に押してみよう"}`}
            </button>

          </div>
        </div>
      )}

      {/* 最近の投稿（下端のバー。たたんでおくと地図が広く使える） */}
      {!loading && stores.length === 0 && recentPosts.length > 0 && (
        <div style={{ background: "#fff", borderTop: "1px solid #eee", flexShrink: 0, paddingBottom: "calc(40px + env(safe-area-inset-bottom, 0px))" }}>
          <button onClick={() => setShowPosts(!showPosts)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", padding: "8px 16px", cursor: "pointer", fontFamily: "inherit" }}>
            <span style={{ fontSize: "11px", fontWeight: 800, color: "#888", letterSpacing: "0.5px" }}>🕐 みんなの最近の投稿</span>
            <span style={{ fontSize: "10px", color: "#bbb" }}>{showPosts ? "▼ 閉じる" : "▲ 見る"}</span>
          </button>
          {showPosts && (
            <div style={{ maxHeight: 170, overflowY: "auto" }}>
              {recentPosts.map((post, i) => (
                <div key={post.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", borderTop: i === 0 ? "1px solid #f0f0f0" : "1px solid #f0f0f0" }}>
                  <span style={{ fontSize: "18px", flexShrink: 0 }}>{post.hasEatIn ? "🪑" : "✗"}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{post.placeName}</div>
                    <div style={{ fontSize: "11px", color: post.hasEatIn ? "#2d6a4f" : "#999", fontWeight: 600 }}>{post.hasEatIn ? "イートインあり" : "イートインなし"}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* メニュー（エリア一覧・各ページへのリンク） */}
      {showMenu && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 400, display: "flex", justifyContent: "flex-end" }} onClick={e => e.target === e.currentTarget && setShowMenu(false)}>
          <div style={{ background: "#fff", width: "88%", maxWidth: 340, height: "100%", overflowY: "auto", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 16px 12px", borderBottom: "1px solid #eee", position: "sticky", top: 0, background: "#fff", zIndex: 2 }}>
              <div style={{ fontWeight: 900, fontSize: "15px" }}>🗾 エリアから探す</div>
              <button onClick={() => setShowMenu(false)} aria-label="閉じる" style={{ background: "#f5f5f5", border: "none", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", fontSize: "14px", color: "#888" }}>✕</button>
            </div>

            <div style={{ padding: "12px 16px 0" }}>
              <input
                value={areaKeyword}
                onChange={e => setAreaKeyword(e.target.value)}
                placeholder="エリア名で絞り込む（例：新宿）"
                style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 10, border: "1.5px solid #ddd", fontSize: "13px", outline: "none", fontFamily: "inherit" }}
              />
            </div>

            <div style={{ padding: "12px 16px 20px", flex: 1 }}>
              {(() => {
                const kw = areaKeyword.trim();
                const list = Object.entries(AREAS).filter(([slug, a]) => !kw || a.name.includes(kw) || (a.pref || "").includes(kw) || slug.includes(kw.toLowerCase()));
                if (list.length === 0) return <div style={{ fontSize: "12px", color: "#aaa", padding: "12px 0" }}>該当するエリアがありません</div>;
                // 都道府県ごとにまとめて表示
                const byPref = {};
                for (const [slug, a] of list) (byPref[a.pref || "その他"] ||= []).push([slug, a]);
                return Object.entries(byPref).map(([pref, items]) => (
                  <div key={pref} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: "11px", fontWeight: 800, color: "#aaa", marginBottom: 6 }}>{pref}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {items.map(([slug, a]) => (
                        <Link key={slug} href={`/area/${slug}`} onClick={() => setShowMenu(false)} style={{ fontSize: "12px", fontWeight: 700, color: "#0077b6", background: "#e3f2fd", borderRadius: 20, padding: "5px 11px", textDecoration: "none" }}>{a.name}</Link>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>

            <div style={{ borderTop: "1px solid #eee", padding: "14px 16px 28px", background: "#fafafa" }}>
              <div style={{ fontSize: "11px", fontWeight: 800, color: "#aaa", marginBottom: 8 }}>メニュー</div>
              {[["/", "🗺️ マップ トップ"], ["/area", "🗾 エリア一覧"], ["/guide", "📖 イートイン活用ガイド"], ["/report", "📊 イートイン設置率レポート"], ["/about", "ℹ️ このサイトについて"], ["/contact", "✉️ お問い合わせ"]].map(([href, label]) => (
                <Link key={href} href={href} onClick={() => setShowMenu(false)} style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#333", textDecoration: "none", padding: "8px 0" }}>{label}</Link>
              ))}
              <SupportLink compact />
              <a href="https://x.com/Eatin_map" target="_blank" rel="noopener noreferrer" style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#333", textDecoration: "none", padding: "8px 0" }}>𝕏 公式アカウント</a>
            </div>
          </div>
        </div>
      )}

      {/* 近い順の一覧（下から出てくる） */}
      {showList && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 300, display: "flex", alignItems: "flex-end" }} onClick={e => e.target === e.currentTarget && setShowList(false)}>
          <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", width: "100%", maxHeight: "70vh", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 18px 10px", borderBottom: "1px solid #eee" }}>
              <div style={{ fontWeight: 900, fontSize: "15px" }}>📋 近い順（{byDistance.length}件）</div>
              <button onClick={() => setShowList(false)} aria-label="閉じる" style={{ background: "#f5f5f5", border: "none", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", fontSize: "14px", color: "#888" }}>✕</button>
            </div>
            <div style={{ display: "flex", gap: 6, padding: "8px 18px", borderBottom: "1px solid #f3f3f3" }}>
              <button onClick={() => setFilterEatIn(!filterEatIn)} style={{ padding: "4px 10px", borderRadius: 20, border: `1.5px solid ${filterEatIn ? "#1e88e5" : "#ddd"}`, background: filterEatIn ? "#e3f2fd" : "#fff", color: filterEatIn ? "#1e88e5" : "#888", fontWeight: 700, fontSize: "11px", cursor: "pointer" }}>🪑 座れる店だけ</button>
              <button onClick={() => setFilterNeedsCheck(!filterNeedsCheck)} style={{ padding: "4px 10px", borderRadius: 20, border: `1.5px solid ${filterNeedsCheck ? "#f57c00" : "#ddd"}`, background: filterNeedsCheck ? "#fff3e0" : "#fff", color: filterNeedsCheck ? "#e65100" : "#888", fontWeight: 700, fontSize: "11px", cursor: "pointer" }}>❓ 要確認だけ</button>
            </div>
            <div style={{ overflowY: "auto", padding: "0 18px", paddingBottom: "calc(40px + env(safe-area-inset-bottom, 0px))" }}>
              {byDistance.length === 0 && <div style={{ fontSize: "12px", color: "#aaa", padding: "20px 0", textAlign: "center" }}>条件に合う店がありません</div>}
              {byDistance.map(s => {
                const st = s.hasEatIn === true
                  ? (isEstimate(s) ? ["たぶんあり", "#e3f2fd", "#64b5f6"] : ["イートインあり", "#e3f2fd", "#1e88e5"])
                  : s.hasEatIn === false
                    ? (isAiOnly(s) ? ["たぶんなし", "#f5f5f5", "#aaa"] : ["なし", "#f5f5f5", "#888"])
                    : ["未確認", "#fff3e0", "#e65100"];
                return (
                  <button key={s.place_id} onClick={() => focusStore(s)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "11px 0", border: "none", borderBottom: "1px solid #f3f3f3", background: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
                    <div style={{ width: 52, flexShrink: 0, fontSize: "12px", fontWeight: 800, color: "#333" }}>{formatDistance(calcDistance(origin.lat, origin.lng, s.lat, s.lng))}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                      <div style={{ fontSize: "11px", color: "#999", marginTop: 1 }}>
                        {[s.seats ? `🪑${s.seats}席` : "", s.outlet ? "🔌" : "", s.wifi ? "📶" : ""].filter(Boolean).join("　")}
                      </div>
                    </div>
                    <span style={{ fontSize: "10.5px", fontWeight: 800, background: st[1], color: st[2], borderRadius: 10, padding: "3px 8px", flexShrink: 0 }}>{st[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 投稿モーダル */}
      {showReport && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "flex-end" }} onClick={e => e.target === e.currentTarget && setShowReport(false)}>
          <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", width: "100%", padding: "24px 20px", paddingBottom: "calc(40px + env(safe-area-inset-bottom, 0px))", maxHeight: "80vh", overflowY: "auto" }}>
            {submitted ? (
              <div style={{ textAlign: "center", padding: "28px 0" }}>
                <div style={{ fontSize: "52px" }}>🎉</div>
                <div style={{ fontWeight: 900, fontSize: "18px", marginTop: 10 }}>確認済み登録完了！</div>
                <div style={{ color: "#888", fontSize: "13px", marginTop: 4 }}>ありがとうございます！</div>
                <div style={{ textAlign: "left", marginTop: 16 }}>
                  <NextStoreSuggest
                    list={suggestNext(reportTarget)}
                    origin={reportTarget}
                    onPick={st => { setShowReport(false); setSubmitted(false); setReportStep(1); setReportData({ hasEatIn: null, outlet: false, wifi: false, seats: "", comment: "" }); focusStore(st); }}
                  />
                </div>
                <button onClick={() => shareOnX(reportTarget?.name, reportData.hasEatIn)} style={{ marginTop: 20, padding: "12px 28px", borderRadius: 30, border: "none", background: "#000", color: "#fff", fontWeight: 700, fontSize: "14px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
                  𝕏 Xでシェアする
                </button>
                <button onClick={() => { setShowReport(false); setSubmitted(false); setReportStep(1); setReportData({ hasEatIn: null, outlet: false, wifi: false, seats: "", comment: "" }); }} style={{ display: "block", margin: "12px auto 0", padding: "8px 24px", borderRadius: 20, border: "1px solid #ddd", background: "#fff", color: "#aaa", fontSize: "12px", cursor: "pointer" }}>閉じる</button>
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
