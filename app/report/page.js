import Link from "next/link";
import PageShell, { card, h2, p, linkStyle } from "../components/PageShell";
import { fetchAllVerifications, aggregateEatIn, chainOf, MAJOR_CHAINS, formatJaDate } from "../../lib/eatin-data";

// ============================================================
// データレポート：コンビニのイートインはどれくらいある？
// サイトに集まった投稿データを毎日自動集計する、このサイトだけの独自コンテンツ。
// ============================================================

export const revalidate = 86400; // 1日1回作り直す

export const metadata = {
  title: "コンビニのイートイン設置率レポート｜チェーン別・投稿データで調査｜コンビニイートインマップ",
  description: "コンビニイートインマップに集まった投稿データを集計し、コンビニのイートイン設置率をチェーン別（セブン-イレブン・ファミリーマート・ローソン・ミニストップ）に調べました。毎日自動更新。",
  alternates: { canonical: "https://www.eatin-map.jp/report" },
};

const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);

function buildStats(rows) {
  const byPlace = {};
  for (const r of rows) {
    if (!r.placeId || typeof r.hasEatIn !== "boolean") continue;
    (byPlace[r.placeId] ||= []).push(r);
  }

  const stores = Object.values(byPlace).map(vers => {
    const { status, aiOnly } = aggregateEatIn(vers);
    const name = vers.find(v => v.placeName)?.placeName || "";
    const human = vers.filter(v => v.source !== "ai");
    const ai = vers.filter(v => v.source === "ai");
    // 人の投稿だけで判定した結果（AIとの比較用）
    const humanStatus = human.length ? aggregateEatIn(human).status : null;
    const aiStatus = ai.length ? aggregateEatIn(ai).status : null;
    return { status, aiOnly, chain: chainOf(name), humanStatus, aiStatus, hasHuman: human.length > 0 };
  });

  const known = stores.filter(s => s.status !== null);
  const yes = known.filter(s => s.status === true);
  const humanStores = stores.filter(s => s.hasHuman && s.humanStatus !== null);
  const humanYes = humanStores.filter(s => s.humanStatus === true);

  const chains = [...MAJOR_CHAINS, "その他"].map(c => {
    const list = known.filter(s => (MAJOR_CHAINS.includes(s.chain) ? s.chain : "その他") === c);
    const hum = list.filter(s => s.hasHuman && s.humanStatus !== null);
    return {
      chain: c,
      total: list.length,
      yes: list.filter(s => s.status === true).length,
      humanTotal: hum.length,
      humanYes: hum.filter(s => s.humanStatus === true).length,
    };
  }).filter(c => c.total > 0);

  // 人とAIの両方の情報がある店で、判定が一致した割合
  const both = stores.filter(s => s.humanStatus !== null && s.aiStatus !== null);
  const agree = both.filter(s => s.humanStatus === s.aiStatus).length;

  // 席数
  const seatList = rows.filter(r => r.source !== "ai" && typeof r.seats === "number" && r.seats > 0 && r.seats < 200).map(r => r.seats).sort((a, b) => a - b);
  const median = seatList.length ? seatList[Math.floor(seatList.length / 2)] : null;

  // 月別の投稿数（人の投稿のみ）
  const monthly = {};
  for (const r of rows) {
    if (r.source === "ai" || !r.createdAt) continue;
    const m = String(r.createdAt).slice(0, 7);
    monthly[m] = (monthly[m] || 0) + 1;
  }

  return {
    totalPosts: rows.length,
    humanPosts: rows.filter(r => r.source !== "ai").length,
    aiPosts: rows.filter(r => r.source === "ai").length,
    storeCount: known.length,
    yesCount: yes.length,
    humanStoreCount: humanStores.length,
    humanYesCount: humanYes.length,
    chains,
    bothCount: both.length,
    agreeCount: agree,
    seatCount: seatList.length,
    seatMedian: median,
    seatMin: seatList[0] ?? null,
    seatMax: seatList[seatList.length - 1] ?? null,
    outletPosts: rows.filter(r => r.source !== "ai" && r.outlet === true).length,
    monthly: Object.entries(monthly).sort(([a], [b]) => a.localeCompare(b)),
  };
}

const th = { fontSize: "12px", fontWeight: 800, color: "#777", textAlign: "left", padding: "8px 6px", borderBottom: "2px solid #eee" };
const td = { fontSize: "13px", color: "#333", padding: "9px 6px", borderBottom: "1px solid #f2f2f2" };

export default async function ReportPage() {
  let s = null;
  try {
    s = buildStats(await fetchAllVerifications());
  } catch {
    s = null;
  }
  const today = formatJaDate(new Date().toISOString());

  if (!s || s.storeCount === 0) {
    return (
      <PageShell title="コンビニのイートイン設置率レポート" subtitle="投稿データから見るイートインの実態">
        <div style={card}><p style={{ ...p, margin: 0 }}>現在データを集計中です。しばらくしてから再度ご覧ください。</p></div>
      </PageShell>
    );
  }

  const overall = pct(s.yesCount, s.storeCount);
  const humanRate = pct(s.humanYesCount, s.humanStoreCount);
  const maxMonthly = Math.max(...s.monthly.map(([, n]) => n), 1);
  const majorRows = s.chains.filter(c => c.chain !== "その他" && c.humanTotal >= 10);
  const bestHuman = [...majorRows].sort((a, b) => pct(b.humanYes, b.humanTotal) - pct(a.humanYes, a.humanTotal))[0];

  return (
    <PageShell
      title="コンビニのイートイン設置率レポート"
      subtitle="サイトに集まった投稿データで「座れるコンビニ」の実態を調べました"
      meta={`データ更新日：${today}（毎日自動更新）｜調査・執筆：コンビニイートインマップ運営`}
    >
      <div style={card}>
        <h2 style={h2}>この記事の結論</h2>
        <ul style={{ ...p, paddingLeft: 20, listStyleType: "disc", margin: 0 }}>
          <li>イートイン有無の情報がある<strong>{s.storeCount.toLocaleString()}店舗</strong>のうち、イートインありは<strong>{s.yesCount.toLocaleString()}店（{overall}%）</strong>。</li>
          <li>ただし、利用者が実際に訪れて確認した{s.humanStoreCount.toLocaleString()}店に限ると、イートインありは<strong>{humanRate}%</strong>。{humanRate < 50 ? "都市部の駅前では「コンビニなら座れる」とは言えない。" : "利用者確認ベースでも半数以上の店で座れる。"}</li>
          {bestHuman && <li>利用者確認ベースで設置率が最も高かったのは<strong>{bestHuman.chain}（{pct(bestHuman.humanYes, bestHuman.humanTotal)}%）</strong>。ただしチェーンより店舗ごとの差が大きい。</li>}
          {s.seatMedian && <li>席数の投稿があった店の中央値は<strong>約{s.seatMedian}席</strong>。昼どきは満席になりやすい規模感。</li>}
        </ul>
      </div>

      <div style={card}>
        <h2 style={h2}>調査の方法</h2>
        <p style={p}>
          コンビニイートインマップには、利用者が店舗を訪れて「イートインあった／なかった」を投稿する仕組みがあります。
          このレポートは、その投稿{s.humanPosts.toLocaleString()}件と、投稿がない店舗について公開クチコミをAIが分析した推定{s.aiPosts.toLocaleString()}件、
          合計{s.totalPosts.toLocaleString()}件のデータを店舗ごとにまとめて集計したものです。
        </p>
        <p style={{ ...p, margin: 0 }}>
          1つの店舗に複数の投稿がある場合は多数決で判定し、利用者の投稿がある店舗ではAI推定よりも利用者の投稿を優先しています。
          対象は東京・大阪のオフィス街を中心とした都市部の店舗で、全国のコンビニ全体を代表する数字ではない点にご注意ください。
        </p>
      </div>

      <div style={card}>
        <h2 style={h2}>全体：イートインがあるのは{overall}%</h2>
        <div style={{ display: "flex", height: 26, borderRadius: 8, overflow: "hidden", margin: "6px 0 10px" }}>
          <div style={{ width: `${overall}%`, background: "#0077b6", color: "#fff", fontSize: "12px", fontWeight: 800, display: "flex", alignItems: "center", paddingLeft: 8 }}>あり {overall}%</div>
          <div style={{ flex: 1, background: "#ddd", color: "#555", fontSize: "12px", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 8 }}>なし {100 - overall}%</div>
        </div>
        <p style={p}>
          全体ではイートインありが{s.yesCount.toLocaleString()}店、なしが{(s.storeCount - s.yesCount).toLocaleString()}店でした。
          一方、利用者が実際に確認した店舗だけで見ると、イートインありは{s.humanYesCount.toLocaleString()}店／{s.humanStoreCount.toLocaleString()}店（{humanRate}%）まで下がります。
        </p>
        <p style={{ ...p, margin: 0 }}>
          この差が生まれるのは、AI推定が「クチコミでイートインに触れられている店」を拾いやすく、イートインがある店ほど推定データに入りやすいためと考えられます。
          実態に近いのは利用者確認ベースの数字で、{humanRate < 50 ? <><strong>駅前のコンビニに入っても、座れる店は半分以下</strong>というのが当サイトのデータから見える姿です。</> : <>当サイトのデータでは<strong>半数以上の店で座れる</strong>結果になっていますが、店舗による差は大きいままです。</>}
          小型の駅前店やオフィスビル内の店は売り場面積が限られ、イートインを置かない（または撤去した）ケースが多いことも背景にありそうです。
        </p>
      </div>

      <div style={card}>
        <h2 style={h2}>チェーン別のイートイン設置率</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 420 }}>
            <thead>
              <tr>
                <th style={th}>チェーン</th>
                <th style={th}>調査店舗</th>
                <th style={th}>イートインあり</th>
                <th style={th}>利用者確認のみ</th>
              </tr>
            </thead>
            <tbody>
              {s.chains.map(c => (
                <tr key={c.chain}>
                  <td style={{ ...td, fontWeight: 700 }}>{c.chain}</td>
                  <td style={td}>{c.total}店</td>
                  <td style={td}>{c.yes}店（{pct(c.yes, c.total)}%）</td>
                  <td style={td}>{c.humanTotal > 0 ? `${c.humanYes}/${c.humanTotal}店（${pct(c.humanYes, c.humanTotal)}%）` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ ...p, marginTop: 12 }}>
          「利用者確認のみ」は、AI推定を除き、実際に訪れた人の投稿がある店舗だけで計算した設置率です。調査店舗が少ないチェーンは誤差が大きいため参考程度に見てください。
        </p>
        <p style={{ ...p, margin: 0 }}>
          チェーンによって多少の差はあるものの、どのチェーンでも「ある店」と「ない店」が混在しています。
          イートインの有無は本部の方針だけでなく、店舗の広さや立地、オーナーの判断で決まるため、
          <strong>チェーン名で選ぶより、店舗単位で確認するのが確実</strong>です。チェーンごとの傾向は<Link href="/guide/chains" style={linkStyle}>セブン・ファミマ・ローソン イートイン比較</Link>でも解説しています。
        </p>
      </div>

      {s.bothCount >= 10 && (
        <div style={card}>
          <h2 style={h2}>AI推定はどれくらい当たる？</h2>
          <p style={{ ...p, margin: 0 }}>
            AI推定と利用者の投稿の両方がある{s.bothCount}店舗で判定を比べると、一致したのは{s.agreeCount}店（{pct(s.agreeCount, s.bothCount)}%）でした。
            クチコミは数年前の情報を含むことがあり、イートインを撤去・休止した店では推定が外れやすくなります。
            当サイトがAI推定に「（AI推定）」と明記し、利用者の投稿があればそちらを優先しているのはこのためです。
            AI推定の店に行ったら、ぜひ実際の状況を投稿してください。
          </p>
        </div>
      )}

      {(s.seatCount >= 5 || s.outletPosts > 0) && (
        <div style={card}>
          <h2 style={h2}>席数とコンセント</h2>
          {s.seatCount >= 5 && (
            <p style={p}>
              席数の投稿があった{s.seatCount}件では、最小{s.seatMin}席〜最大{s.seatMax}席、中央値は約{s.seatMedian}席でした。
              コンビニのイートインは窓際のカウンター数席という店が多く、12時台は満席になりがちです。
              昼どきに確実に座りたいなら、11時台や13時半以降にずらすのがおすすめです。
            </p>
          )}
          <p style={{ ...p, margin: 0 }}>
            コンセントが使えるという投稿は{s.outletPosts}件と、まだ少数です。充電目的なら、マップの🔌フィルターで投稿のある店を探すか、
            <Link href="/guide/work-in-eatin" style={linkStyle}>イートインで作業・充電するときのルール</Link>もあわせて読んでみてください。
          </p>
        </div>
      )}

      {s.monthly.length > 1 && (
        <div style={card}>
          <h2 style={h2}>月別の投稿数（利用者の投稿）</h2>
          {s.monthly.map(([m, n]) => (
            <div key={m} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{ width: 64, fontSize: "12px", color: "#777" }}>{`${m.slice(0, 4)}年${parseInt(m.slice(5), 10)}月`}</div>
              <div style={{ flex: 1, background: "#f3f3f3", borderRadius: 4 }}>
                <div style={{ width: `${Math.max(2, (n / maxMonthly) * 100)}%`, background: "#e63946", height: 14, borderRadius: 4 }} />
              </div>
              <div style={{ width: 44, fontSize: "12px", color: "#333", textAlign: "right" }}>{n}件</div>
            </div>
          ))}
        </div>
      )}

      <div style={card}>
        <h2 style={h2}>データの使い方と注意点</h2>
        <p style={p}>
          このレポートの数字は、当サイトの利用者が訪れた店舗に偏っており、都市部・オフィス街の比率が高くなっています。
          郊外のロードサイド店は売り場が広くイートインを置く店が多いとされるため、全国平均はこの数字より高い可能性があります。
        </p>
        <p style={{ ...p, margin: 0 }}>
          引用していただく場合は「コンビニイートインマップ調べ」と出典を明記してください。
          近くのイートインがあるコンビニは<Link href="/" style={linkStyle}>マップ</Link>や<Link href="/area" style={linkStyle}>エリア一覧</Link>から探せます。
        </p>
      </div>
    </PageShell>
  );
}
