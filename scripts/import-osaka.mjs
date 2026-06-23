import Anthropic from "@anthropic-ai/sdk";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, where } from "firebase/firestore";

// Firebase設定
const firebaseConfig = {
  apiKey: "AIzaSyB5eSZLCsrCCuUKXdmKwZyUxqlNbPBpZoI",
  authDomain: "eatin-map-ee417.firebaseapp.com",
  projectId: "eatin-map-ee417",
  storageBucket: "eatin-map-ee417.firebasestorage.app",
  messagingSenderId: "850029980493",
  appId: "1:850029980093:web:bd2ea9a6e942b342220ad4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const PLACES_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

// 大阪市内主要エリアの座標
const OSAKA_AREAS = [
  { name: "梅田", lat: 34.7025, lng: 135.496 },
  { name: "難波", lat: 34.6687, lng: 135.501 },
  { name: "心斎橋", lat: 34.6753, lng: 135.5007 },
  { name: "天王寺", lat: 34.6464, lng: 135.5133 },
  { name: "本町", lat: 34.6836, lng: 135.501 },
  { name: "北浜", lat: 34.6883, lng: 135.5122 },
  { name: "福島", lat: 34.6947, lng: 135.4836 },
  { name: "京橋", lat: 34.6933, lng: 135.5383 },
  { name: "新大阪", lat: 34.7333, lng: 135.5 },
  { name: "江坂", lat: 34.7578, lng: 135.5056 },
];

// Places APIでコンビニ取得
async function fetchConvenienceStores(lat, lng, areaName) {
  console.log(`🔍 ${areaName} のコンビニを取得中...`);
  const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": PLACES_API_KEY,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.reviews",
    },
    body: JSON.stringify({
      includedTypes: ["convenience_store"],
      locationRestriction: {
        circle: { center: { latitude: lat, longitude: lng }, radius: 500 },
      },
      languageCode: "ja",
      maxResultCount: 20,
    }),
  });
  const data = await res.json();
  return (data.places || []).map(p => ({
    place_id: p.id,
    name: p.displayName?.text || "",
    address: p.formattedAddress || "",
    lat: p.location?.latitude,
    lng: p.location?.longitude,
    reviews: (p.reviews || []).map(r => r.text?.text || "").filter(Boolean),
  }));
}

// Claude APIで口コミ解析
async function analyzeWithClaude(storeName, reviews) {
  if (!reviews || reviews.length === 0) return null;
  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [{
        role: "user",
        content: `以下はコンビニ「${storeName}」の口コミです。イートインスペースがあるかどうかを判定してください。

口コミ：
${reviews.join("\n")}

以下のJSON形式のみで回答してください：
{"hasEatIn": true or false or null, "confidence": "high" or "medium" or "low", "reason": "判定理由20文字以内"}

イートインに関する言及がない場合はnullにしてください。`,
      }],
    });
    const text = message.content[0].type === "text" ? message.content[0].text : "";
    return JSON.parse(text);
  } catch (e) {
    console.error("Claude解析エラー:", e);
    return null;
  }
}

// Firestoreに保存（重複チェックあり）
async function saveToFirestore(place, analysis) {
  const q = query(collection(db, "verifications"), where("placeId", "==", place.place_id));
  const snap = await getDocs(q);
  if (!snap.empty) {
    console.log(`  ⏭️  スキップ（既存）: ${place.name}`);
    return;
  }
  await addDoc(collection(db, "verifications"), {
    placeId: place.place_id,
    placeName: place.name,
    placeAddress: place.address,
    lat: place.lat,
    lng: place.lng,
    hasEatIn: analysis.hasEatIn,
    confidence: analysis.confidence,
    reason: analysis.reason,
    outlet: false,
    wifi: false,
    seats: null,
    comment: analysis.reason,
    reportCount: 50, // AIによる自動判定は信頼度高めに設定
    isAiGenerated: true,
    createdAt: new Date(),
  });
  console.log(`  ✅ 保存: ${place.name} → ${analysis.hasEatIn ? "イートインあり" : analysis.hasEatIn === false ? "なし" : "不明"}`);
}

// メイン処理
async function main() {
  console.log("🚀 大阪市内コンビニデータ一括取得開始\n");
  let total = 0, saved = 0, skipped = 0;

  for (const area of OSAKA_AREAS) {
    const stores = await fetchConvenienceStores(area.lat, area.lng, area.name);
    console.log(`  📍 ${stores.length}件取得`);

    for (const store of stores) {
      total++;
      const analysis = await analyzeWithClaude(store.name, store.reviews);
      if (!analysis || analysis.hasEatIn === null) { skipped++; continue; }
      await saveToFirestore(store, analysis);
      saved++;
      await new Promise(r => setTimeout(r, 500)); // レート制限対策
    }
    console.log("");
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\n✨ 完了！ 合計${total}件 → 保存${saved}件 / スキップ${skipped}件`);
  process.exit(0);
}

main().catch(console.error);