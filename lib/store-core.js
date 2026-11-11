// ============================================================
// 店舗マスタの共通部品（サーバー・ブラウザ・scripts のどこからでも使える純粋な関数だけ）
//
// 店舗マスタ＝全国のコンビニの「店名・住所・位置」の一覧。
// コンビニ各社の公式の店舗検索をもとにしたオープンデータ「All The Places」（CC0）から
// 週1回、自動で作り直します（scripts/build-stores.mjs）。
// Google Places API は使いません（＝1日の上限も請求もなし）。
// ============================================================

// 対応チェーン。key が店舗IDの先頭になる（例: "seven:006379"）。
// ※ key は投稿データ（Firestore）に保存されるので、あとから変えないこと。
//   min は「これより少なかったら取得失敗とみなす」件数の目安。
export const CHAINS = {
  seven:    { spider: "seven_eleven_jp",   label: "セブン-イレブン",   min: 18000 },
  famima:   { spider: "familymart_jp",     label: "ファミリーマート",  min: 14000 },
  lawson:   { spider: "lawson_jp",         label: "ローソン",          min: 12000 },
  ministop: { spider: "ministop_jp",       label: "ミニストップ",      min: 1300 },
  daily:    { spider: "daily_yamazaki_jp", label: "デイリーヤマザキ",  min: 800 },
  newdays:  { spider: "jr_cross_jp",       label: "NewDays",           min: 400 },
  seico:    { spider: "seicomart_jp",      label: "セイコーマート",    min: 900 },
  poplar:   { spider: "poplar_jp",         label: "ポプラ",            min: 80 },
};

// ---- タイル（地図の表示範囲ぶんだけ読み込むための区切り） ----
// 緯度・経度とも0.05度（約5km四方）ごとに1ファイル。
const TILE_PER_DEGREE = 20;
export function tileKey(lat, lng) {
  return `${Math.floor(lat * TILE_PER_DEGREE)}_${Math.floor(lng * TILE_PER_DEGREE)}`;
}

// 中心(lat,lng)から半径radius(m)の円にかかるタイルのキー一覧
export function tileKeysAround(lat, lng, radius) {
  const dLat = radius / 111320;
  const dLng = radius / (111320 * Math.cos(lat * Math.PI / 180));
  const y0 = Math.floor((lat - dLat) * TILE_PER_DEGREE), y1 = Math.floor((lat + dLat) * TILE_PER_DEGREE);
  const x0 = Math.floor((lng - dLng) * TILE_PER_DEGREE), x1 = Math.floor((lng + dLng) * TILE_PER_DEGREE);
  const keys = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) keys.push(`${y}_${x}`);
  return keys;
}

export function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// タイルの1行 [id, 店名, 緯度, 経度, 住所, 旧ID(カンマ区切り) or 0] → 画面で使う形に変換
// place_id という名前は以前（Google Places時代）のまま使っている。中身は新しい店舗ID。
// legacy_ids は、以前の投稿にひもづいているGoogleの店舗ID（投稿を引き継ぐために使う）。
export function rowToStore(row) {
  return {
    place_id: row[0],
    name: row[1],
    lat: row[2],
    lng: row[3],
    address: row[4] || "",
    legacy_ids: row[5] ? String(row[5]).split(",") : [],
  };
}

// ---- 店名の照合（以前の投稿を新しい店舗IDに引き継ぐために使う） ----
// 全角/半角・空白・ハイフンや長音の表記ゆれをならす
const DASH = /[‐‑‒–—―ーｰ−－-]/g;
export function normText(s) {
  return (s || "").normalize("NFKC").replace(/[\s　]/g, "").replace(DASH, "-").toLowerCase();
}

// 店名（Googleマップでの表記など）からチェーンを判定。対応チェーン以外は null
export function chainKeyOfName(name) {
  const s = normText(name);
  if (/セブン-?イレブン|7-?eleven|7-11/.test(s)) return "seven";
  if (/ファミリ-マ-ト|ファミマ|familymart/.test(s)) return "famima";
  if (/ロ-ソン|lawson/.test(s)) return "lawson";
  if (/ミニストップ|ministop/.test(s)) return "ministop";
  if (/newdays|ニュ-デイズ/.test(s)) return "newdays";
  if (/デイリ-|ヤマザキ/.test(s)) return "daily";
  if (/セイコ-マ-ト|seicomart/.test(s)) return "seico";
  if (/ポプラ|生活彩家|スリ-エイト/.test(s)) return "poplar";
  return null;
}

// チェーン内の系列（同じ支店名の「ローソン」と「ローソンストア100」を区別するため）
export function subBrandOf(name) {
  const s = normText(name);
  if (/ロ-ソンストア100/.test(s)) return "store100";
  if (/ナチュラルロ-ソン/.test(s)) return "natural";
  return "";
}

// 店名から「支店名」だけを取り出して照合用の文字列にする
// 例: "セブン-イレブン 渋谷中央街店" → "渋谷中央街" / "外貨両替機 … セブン-イレブン 浅草馬道店" → "浅草馬道"
const BRAND_WORDS = /セブン-?イレブン|7-?eleven|7-11|ファミリ-マ-ト|ファミマ!!|ファミマ|familymart|ナチュラルロ-ソン|ロ-ソンストア100|ロ-ソン・スリ-エフ|グリ-ンロ-ソン|ロ-ソン|lawson|ミニストップ|ministop|newdays|ニュ-デイズ|ニュ-ヤマザキデイリ-ストア|デイリ-ヤマザキ|セイコ-マ-ト|seicomart|ポプラ|生活彩家|スリ-エイト/g;
export function branchKey(name) {
  const s = normText(name).replace(/\(.*?\)/g, "");
  // チェーン名より後ろを支店名とみなす（前に余計な言葉が付いている表記に対応）
  let last = -1, lastLen = 0;
  for (const m of s.matchAll(BRAND_WORDS)) { last = m.index; lastLen = m[0].length; }
  let b = last >= 0 ? s.slice(last + lastLen) : s;
  if (!b && last > 0) b = s.slice(0, last);
  return b.replace(/^[・+＋]/, "").replace(/店$/, "");
}

// ローソンの公式データは支店名の先頭に記号（H＝施設内、LTF＝ローソン・スリーエフ など）が付くことがある。
// それを外した形も返す（どちらの表記でも照合できるように）
export function branchKeyVariants(name) {
  const k = branchKey(name);
  const out = [k];
  const stripped = k.replace(/^(ltf|h|s)(?=[^\x00-\x7f])/, "");
  if (stripped !== k) out.push(stripped);
  return out;
}
