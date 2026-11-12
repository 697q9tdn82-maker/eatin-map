// Cloudflare Workers で動かすための設定（@opennextjs/cloudflare）
// ページの作り置き（ISR）の保存先は Workers KV（無料枠内・クレジットカード登録不要）
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";

export default defineCloudflareConfig({
  incrementalCache: kvIncrementalCache,
});
