import urllib.request
import urllib.parse
import json
import time

stations = [
    "梅田","東梅田","西梅田","なんば","難波","心斎橋","天王寺","新大阪",
    "本町","淀屋橋","北浜","天満橋","谷町四丁目","谷町六丁目","谷町九丁目",
    "四天王寺前夕陽ヶ丘","文の里","駒川中野","針中野","矢田","平野",
    "喜連瓜破","四ツ橋","西長堀","西大橋","肥後橋","渡辺橋","中之島",
    "天神橋筋六丁目","扇町","南森町","大阪天満宮","野田阪神","玉川",
    "海老江","野田","塚本","姫島","千船","江坂","東三国","三国","十三",
    "神崎川","庄内","服部天神","曽根","千里山","関大前","豊津","吹田",
    "岸辺","摂津市","南摂津","大日","守口","土居","滝井","千林","関目",
    "野江","蒲生四丁目","今福鶴見","横堤","鶴見緑地","門真南",
    "コスモスクエア","大阪港","朝潮橋","弁天町","九条","阿波座",
    "森ノ宮","緑橋","深江橋","高井田","長田","新石切",
    "大阪","福島","西九条","大正","芦原橋","今宮","新今宮",
    "寺田町","桃谷","鶴橋","玉造","大阪城公園","京橋","桜ノ宮","天満",
    "塚本","尼崎","立花","甲子園口","西宮","芦屋","摂津本山",
    "住吉","六甲道","灘","三ノ宮","元町","神戸",
    "十三","塚口","武庫之荘","西宮北口","夙川","芦屋川","岡本","御影",
    "六甲","王子公園","春日野道","三宮","花隈","高速神戸","新開地",
    "石橋阪大前","池田","川西能勢口","雲雀丘花屋敷","宝塚",
    "茨木市","高槻市","長岡天神","桂","烏丸","河原町",
    "杭瀬","大物","出屋敷","武庫川","甲子園","今津","香櫨園",
    "打出","深江","青木","魚崎","石屋川","新在家","大石","西灘","岩屋",
    "大阪上本町","布施","俊徳道","長瀬","弥刀","久宝寺口","近鉄八尾",
    "河内山本","生駒","学園前","大和西大寺","近鉄奈良",
    "大阪阿部野橋","北田辺","今川",
    "野江","森小路","守口市","西三荘","門真市","古川橋","大和田","萱島",
    "枚方公園","枚方市","樟葉","淀","中書島","丹波橋",
    "今宮戎","萩ノ茶屋","天下茶屋","岸里玉出","粉浜","住吉大社",
    "住ノ江","七道","堺","湊","石津川","諏訪ノ森","浜寺公園",
    "北助松","松ノ浜","泉大津","忠岡","春木","岸和田","貝塚",
    "新神戸","県庁前","大倉山","湊川公園","上沢","長田","新長田",
    "板宿","妙法寺","名谷","総合運動公園","学園都市","伊川谷","西神中央",
]

results = {}
failed = []

print(f"取得開始：{len(stations)}駅")

for i, name in enumerate(stations):
    query = name + "駅"
    url = "https://msearch.gsi.go.jp/address-search/AddressSearch?q=" + urllib.parse.quote(query)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=5) as res:
            data = json.loads(res.read())
            if data:
                coords = data[0]["geometry"]["coordinates"]
                results[name] = {"lat": round(coords[1], 6), "lng": round(coords[0], 6)}
                print(f"✓ ({i+1}/{len(stations)}) {name}: {coords[1]:.4f}, {coords[0]:.4f}")
            else:
                failed.append(name)
                print(f"✗ ({i+1}/{len(stations)}) {name}: データなし")
    except Exception as e:
        failed.append(name)
        print(f"✗ ({i+1}/{len(stations)}) {name}: エラー {e}")
    time.sleep(0.3)

# JS形式で出力
js = "const STATION_COORDS = {\n"
for name, coords in sorted(results.items()):
    js += f'  "{name}": {{ lat: {coords["lat"]}, lng: {coords["lng"]} }},\n'
js += "};"

with open("station_coords.js", "w", encoding="utf-8") as f:
    f.write(js)

print(f"\n完了！取得成功: {len(results)}駅 / 失敗: {len(failed)}駅")
print(f"失敗した駅: {failed}")
print("station_coords.js に保存しました")