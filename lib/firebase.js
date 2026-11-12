// Firebase（投稿の読み書き）の入口
//
// Firebaseの部品は、ブラウザで必要になったときに初めて読み込みます。
// サーバー側（ページを作る段階）で読み込むと、Cloudflare Workers では動かない書き方が
// 含まれているため（文字列からコードを作る処理）、ここでまとめて遅らせています。
//
// 使い方: const F = await firestore();  → F.db と F.collection / F.getDocs などが使える

const firebaseConfig = {
  apiKey: "AIzaSyB5eSZLCsrCCuUKXdmKwZyUxqlNbPBpZoI",
  authDomain: "eatin-map-ee417.firebaseapp.com",
  projectId: "eatin-map-ee417",
  storageBucket: "eatin-map-ee417.firebasestorage.app",
  messagingSenderId: "850029980493",
  appId: "1:850029980093:web:bd2ea9a6e942b342220ad4"
};

let loading = null;
export function firestore() {
  if (!loading) {
    loading = Promise.all([import("firebase/app"), import("firebase/firestore")])
      .then(([appMod, fs]) => {
        const app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(firebaseConfig);
        return { ...fs, db: fs.getFirestore(app) };
      })
      .catch(e => { loading = null; throw e; }); // 失敗したら次回もう一度試す
  }
  return loading;
}
