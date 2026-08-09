// ============================================================
// 投稿データのバックアップスクリプト
//
// Firestoreに入っているユーザー投稿・混雑情報・「助かった」数を
// すべてJSONファイルに書き出して保存します。
// データが消えたときに復元できるよう、月1回の実行をおすすめします。
//
// 使い方（プロジェクトフォルダのターミナルで）:
//   node scripts/backup.mjs
//
// 保存先: backups/backup-2026-08-09.json のように日付つきで作られます
//
// 復元したくなったら:
//   node scripts/backup.mjs --restore backups/backup-2026-08-09.json
//   （既にあるデータは消さずに、足りない投稿だけを書き戻します）
// ============================================================

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, Timestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB5eSZLCsrCCuUKXdmKwZyUxqlNbPBpZoI",
  authDomain: "eatin-map-ee417.firebaseapp.com",
  projectId: "eatin-map-ee417",
  storageBucket: "eatin-map-ee417.firebasestorage.app",
  messagingSenderId: "850029980493",
  appId: "1:850029980093:web:bd2ea9a6e942b342220ad4",
};
const db = getFirestore(initializeApp(firebaseConfig));

const COLLECTIONS = ["verifications", "congestion", "helped"];
const restoreIdx = process.argv.indexOf("--restore");
const restorePath = restoreIdx >= 0 ? process.argv[restoreIdx + 1] : null;

// FirestoreのTimestampはそのままJSONにできないので文字列に変換する
function toPlain(value) {
  if (value && typeof value.toDate === "function") {
    return { __timestamp: value.toDate().toISOString() };
  }
  if (Array.isArray(value)) return value.map(toPlain);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = toPlain(v);
    return out;
  }
  return value;
}

// 書き戻すときは文字列をTimestampに戻す
function fromPlain(value) {
  if (value && typeof value === "object" && "__timestamp" in value) {
    return Timestamp.fromDate(new Date(value.__timestamp));
  }
  if (Array.isArray(value)) return value.map(fromPlain);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = fromPlain(v);
    return out;
  }
  return value;
}

// ---- バックアップ ----
async function backup() {
  const data = { exportedAt: new Date().toISOString(), collections: {} };
  let total = 0;

  for (const name of COLLECTIONS) {
    const snap = await getDocs(collection(db, name));
    data.collections[name] = snap.docs.map(d => ({ id: d.id, data: toPlain(d.data()) }));
    total += snap.size;
    console.log(`  ${name}: ${snap.size}件`);
  }

  // Windowsでも正しく動くようにパスを組み立てる
  const dirPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "backups");
  if (!existsSync(dirPath)) mkdirSync(dirPath, { recursive: true });

  const stamp = new Date().toISOString().slice(0, 10);
  const file = path.join(dirPath, `backup-${stamp}.json`);
  writeFileSync(file, JSON.stringify(data, null, 2), "utf8");

  console.log(`\n✅ 合計${total}件を保存しました`);
  console.log(`📁 ${file}`);
  console.log(`\n※ このファイルはUSBやクラウドドライブにもコピーしておくと安心です`);
}

// ---- 復元（不足分のみ書き戻す） ----
async function restore(path) {
  console.log(`🔄 ${path} から復元します`);
  const json = JSON.parse(readFileSync(path, "utf8"));

  for (const name of COLLECTIONS) {
    const rows = json.collections?.[name] || [];
    if (rows.length === 0) continue;

    // 今あるデータを確認して、重複を書き込まないようにする
    const snap = await getDocs(collection(db, name));
    const existing = new Set(snap.docs.map(d => JSON.stringify({ p: d.data().placeId, c: d.data().comment ?? null })));

    let added = 0;
    for (const row of rows) {
      const key = JSON.stringify({ p: row.data.placeId, c: row.data.comment ?? null });
      if (existing.has(key)) continue;
      await addDoc(collection(db, name), fromPlain(row.data));
      added++;
    }
    console.log(`  ${name}: ${added}件を書き戻しました（既存${snap.size}件はそのまま）`);
  }
  console.log("\n✅ 復元が完了しました");
}

async function main() {
  if (restorePath) await restore(restorePath);
  else await backup();
  process.exit(0);
}

main().catch(e => { console.error("❌ エラー:", e); process.exit(1); });
