import EatInFinder from "./EatInFinder";

// トップページ（サーバー側でURLパラメータを読み、地図コンポーネントに渡す）
// 例: /?lat=35.68&lng=139.70&place=ChIJxxxx ← 共有リンクで開くと自動でその店を表示
export default async function Home({ searchParams }) {
  const params = await searchParams;
  const lat = parseFloat(params?.lat);
  const lng = parseFloat(params?.lng);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

  return (
    <EatInFinder
      initialLat={hasCoords ? lat : null}
      initialLng={hasCoords ? lng : null}
      initialPlace={typeof params?.place === "string" ? params.place : null}
    />
  );
}
