"use client";
import { useEffect, useState } from "react";

// エリアページのタイトル・店舗一覧を包む部品。
// 初回表示はサーバー側で描画されるのでSEOには影響なし。
// ユーザーが地図で別の場所を検索したら（eatinmap:usersearchイベント）、
// 古いエリアの情報が残らないように自分を非表示にする。
export default function AreaInfo({ children }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const hide = () => setHidden(true);
    window.addEventListener("eatinmap:usersearch", hide);
    return () => window.removeEventListener("eatinmap:usersearch", hide);
  }, []);
  if (hidden) return null;
  return children;
}
