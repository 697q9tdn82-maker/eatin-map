import { getStoreStats } from "../../../lib/stats";

// 掲載店舗数の集計が正しく動いているか確認するための診断用API
//
// ブラウザで https://www.eatin-map.jp/api/stats を開くと、こう返ります:
//   {"count":615,"posts":615,"source":"live"}   ← 正常
//   {"count":null,"source":"failed"}            ← 集計に失敗している
//
// count  : 表示に使われる店舗数（同じ店への複数投稿は1店舗として数える）
// posts  : 投稿の総件数
// source : live=自動集計 / manual=手動固定 / failed=失敗
export async function GET() {
  const stats = await getStoreStats();
  return Response.json(stats);
}
