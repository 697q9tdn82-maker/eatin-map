"use client";
import { useState } from "react";
import { db } from "../../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

// お問い合わせフォーム
// 送信内容はFirestoreの「contacts」コレクションに保存されます
// （Firebaseコンソール → Firestore Database → contacts で読めます。外部からは読めない設定）
const CATEGORIES = ["イートイン情報の誤り・追加", "不具合の報告", "ご意見・ご要望", "掲載・提携のご相談", "その他"];

const input = { width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #ddd", fontSize: "14px", fontFamily: "inherit", outline: "none" };
const label = { display: "block", fontSize: "13px", fontWeight: 700, color: "#444", margin: "14px 0 6px" };

export default function ContactForm() {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState("idle"); // idle | sending | done | error

  const submit = async e => {
    e.preventDefault();
    if (message.trim().length < 5) return;
    setState("sending");
    try {
      await addDoc(collection(db, "contacts"), {
        category,
        name: name.trim().slice(0, 100),
        email: email.trim().slice(0, 200),
        message: message.trim().slice(0, 2000),
        page: typeof document !== "undefined" ? document.referrer.slice(0, 300) : "",
        createdAt: serverTimestamp(),
      });
      setState("done");
    } catch {
      setState("error");
    }
  };

  if (state === "done") {
    return (
      <div style={{ textAlign: "center", padding: "20px 0" }}>
        <div style={{ fontSize: "32px" }}>✉️</div>
        <p style={{ fontSize: "14px", color: "#444", lineHeight: 1.9 }}>お問い合わせを受け付けました。<br />内容を確認のうえ、必要に応じてご連絡します。</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <label style={label}>お問い合わせの種類</label>
      <select value={category} onChange={e => setCategory(e.target.value)} style={input}>
        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
      </select>

      <label style={label}>お名前（任意）</label>
      <input value={name} onChange={e => setName(e.target.value)} maxLength={100} style={input} />

      <label style={label}>メールアドレス（返信が必要な場合）</label>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} maxLength={200} style={input} />

      <label style={label}>お問い合わせ内容（必須）</label>
      <textarea value={message} onChange={e => setMessage(e.target.value)} maxLength={2000} rows={6} required style={{ ...input, resize: "vertical" }} placeholder="店舗名やエリアが分かると対応がスムーズです" />

      {state === "error" && (
        <p style={{ fontSize: "13px", color: "#c0392b", margin: "10px 0 0" }}>
          送信できませんでした。お手数ですが、公式X（@Eatin_map）のDMからご連絡ください。
        </p>
      )}

      <button type="submit" disabled={state === "sending" || message.trim().length < 5} style={{ marginTop: 16, width: "100%", padding: "12px", borderRadius: 10, border: "none", background: state === "sending" || message.trim().length < 5 ? "#ddd" : "#e63946", color: "#fff", fontWeight: 800, fontSize: "14px", cursor: "pointer", fontFamily: "inherit" }}>
        {state === "sending" ? "送信中…" : "送信する"}
      </button>
      <p style={{ fontSize: "11.5px", color: "#999", margin: "10px 0 0", lineHeight: 1.7 }}>
        入力いただいた情報は、お問い合わせへの対応のみに使用します（<a href="/privacy" style={{ color: "#999" }}>プライバシーポリシー</a>）。
      </p>
    </form>
  );
}
