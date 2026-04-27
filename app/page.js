"use client";

import { useState, useCallback, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, addDoc, getDocs, updateDoc, doc, increment, query, where, orderBy } from "firebase/firestore";

const RANKS = [
  { id: "newcomer",  label: "ビギナー",    min: 0,  max: 2,  icon: "🌱", color: "#aaa",    bg: "#f5f5f5",    trust: 1 },
  { id: "regular",   label: "レギュラー",  min: 3,  max: 9,  icon: "☕", color: "#795548", bg: "#efebe9",    trust: 2 },
  { id: "veteran",   label: "ベテラン",    min: 10, max: 24, icon: "⭐", color: "#f4a261", bg: "#fff3e0",    trust: 3 },
  { id: "expert",    label: "エキスパート",min: 25, max: 49, icon: "🏅", color: "#0077b6", bg: "#e3f2fd",    trust: 4 },
  { id: "master",    label: "マスター",    min: 50, max: 999,icon: "👑", color: "#e63946", bg: "#ffeaea",    trust: 5 },
];

function getRank(count) {
  return RANKS.find(r => count >= r.min && count <= r.max) || RANKS[0];
}

function getNextRank(count) {
  const idx = RANKS.findIndex(r => count >= r.min && count <= r.max);
  return idx < RANKS.length - 1 ? RANKS[idx + 1] : null;
}

function calcScore(reportCount, helpedCount) {
  return reportCount + Math.floor((helpedCount || 0) * 0.5);
}

// 距離計算（ハーバーサイン公式）
function calcDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// 大阪府・兵庫県 全駅座標（299駅）
const STATION_COORDS = {
  "さくら夙川": { lat: 34.7317, lng: 135.3283 },
  "だいどう豊里": { lat: 34.7397, lng: 135.5356 },
  "なかもず": { lat: 34.5583, lng: 135.4989 },
  "なんば": { lat: 34.6687, lng: 135.501 },
  "コスモスクエア": { lat: 34.6481, lng: 135.4356 },
  "ドーム前千代崎": { lat: 34.6678, lng: 135.4794 },
  "七道": { lat: 34.5786, lng: 135.4764 },
  "三ノ宮": { lat: 34.6942, lng: 135.1958 },
  "三国": { lat: 34.7506, lng: 135.4683 },
  "三宮": { lat: 34.6942, lng: 135.1958 },
  "三宮・花時計前": { lat: 34.6942, lng: 135.1958 },
  "上沢": { lat: 34.6822, lng: 135.1636 },
  "上牧": { lat: 34.8694, lng: 135.6361 },
  "中山観音": { lat: 34.8364, lng: 135.4311 },
  "中書島": { lat: 34.9375, lng: 135.7461 },
  "中津": { lat: 34.7028, lng: 135.4972 },
  "丹波橋": { lat: 34.9544, lng: 135.7647 },
  "久宝寺口": { lat: 34.6636, lng: 135.6019 },
  "久寿川": { lat: 34.7297, lng: 135.3494 },
  "九条": { lat: 34.6747, lng: 135.4883 },
  "二色浜": { lat: 34.4258, lng: 135.3386 },
  "五位堂": { lat: 34.5736, lng: 135.6583 },
  "井高野": { lat: 34.7608, lng: 135.5356 },
  "京橋": { lat: 34.6947, lng: 135.5289 },
  "今宮": { lat: 34.6528, lng: 135.4906 },
  "今宮戎": { lat: 34.6594, lng: 135.505 },
  "今川": { lat: 34.6133, lng: 135.5408 },
  "今津": { lat: 34.7331, lng: 135.3444 },
  "今福鶴見": { lat: 34.6978, lng: 135.5494 },
  "今里": { lat: 34.6692, lng: 135.5383 },
  "伊丹": { lat: 34.7803, lng: 135.4011 },
  "伊川谷": { lat: 34.6222, lng: 135.0756 },
  "伏見桃山": { lat: 34.9453, lng: 135.7631 },
  "住ノ江": { lat: 34.5978, lng: 135.4883 },
  "住之江公園": { lat: 34.5981, lng: 135.4844 },
  "住吉": { lat: 34.7194, lng: 135.2592 },
  "住吉大社": { lat: 34.6108, lng: 135.4917 },
  "俊徳道": { lat: 34.6708, lng: 135.5742 },
  "元町": { lat: 34.6906, lng: 135.1836 },
  "八尾": { lat: 34.6303, lng: 135.5994 },
  "八幡市": { lat: 34.8783, lng: 135.7167 },
  "六甲": { lat: 34.7194, lng: 135.2519 },
  "六甲道": { lat: 34.7172, lng: 135.2467 },
  "出屋敷": { lat: 34.7358, lng: 135.3997 },
  "出戸": { lat: 34.5628, lng: 135.5411 },
  "動物園前": { lat: 34.6544, lng: 135.5089 },
  "北加賀屋": { lat: 34.6194, lng: 135.4883 },
  "北助松": { lat: 34.5289, lng: 135.4442 },
  "北浜": { lat: 34.6883, lng: 135.5122 },
  "北田辺": { lat: 34.6233, lng: 135.5322 },
  "北花田": { lat: 34.5822, lng: 135.5206 },
  "北野田": { lat: 34.5642, lng: 135.5989 },
  "十三": { lat: 34.7197, lng: 135.4736 },
  "千林": { lat: 34.72, lng: 135.5378 },
  "千林大宮": { lat: 34.72, lng: 135.5394 },
  "千船": { lat: 34.7258, lng: 135.4519 },
  "千里中央": { lat: 34.8189, lng: 135.4989 },
  "南加賀屋": { lat: 34.6094, lng: 135.4856 },
  "南巽": { lat: 34.6528, lng: 135.5561 },
  "南森町": { lat: 34.6978, lng: 135.5133 },
  "南茨木": { lat: 34.7897, lng: 135.5539 },
  "古川橋": { lat: 34.7528, lng: 135.59 },
  "名谷": { lat: 34.6367, lng: 135.1222 },
  "吹田": { lat: 34.7647, lng: 135.5175 },
  "和泉大宮": { lat: 34.4628, lng: 135.3872 },
  "喜連瓜破": { lat: 34.5756, lng: 135.5394 },
  "四ツ橋": { lat: 34.6753, lng: 135.4958 },
  "四天王寺前夕陽ヶ丘": { lat: 34.6556, lng: 135.5156 },
  "土居": { lat: 34.7394, lng: 135.5456 },
  "堅下": { lat: 34.6194, lng: 135.6367 },
  "堺": { lat: 34.5733, lng: 135.483 },
  "堺市": { lat: 34.5733, lng: 135.483 },
  "堺筋本町": { lat: 34.6822, lng: 135.5083 },
  "塚口": { lat: 34.7494, lng: 135.3822 },
  "塚本": { lat: 34.7142, lng: 135.4756 },
  "売布神社": { lat: 34.8281, lng: 135.4439 },
  "夙川": { lat: 34.7458, lng: 135.3208 },
  "大倉山": { lat: 34.6906, lng: 135.1822 },
  "大和八木": { lat: 34.5133, lng: 135.7994 },
  "大和田": { lat: 34.7508, lng: 135.5981 },
  "大和西大寺": { lat: 34.6892, lng: 135.7878 },
  "大和高田": { lat: 34.5272, lng: 135.7289 },
  "大国町": { lat: 34.6569, lng: 135.4978 },
  "大宮": { lat: 35.0061, lng: 135.7508 },
  "大山崎": { lat: 34.8944, lng: 135.6681 },
  "大日": { lat: 34.7661, lng: 135.5578 },
  "大正": { lat: 34.6653, lng: 135.4667 },
  "大物": { lat: 34.7361, lng: 135.4125 },
  "大石": { lat: 34.7128, lng: 135.2394 },
  "大阪": { lat: 34.7025, lng: 135.496 },
  "大阪ビジネスパーク": { lat: 34.6833, lng: 135.5306 },
  "大阪上本町": { lat: 34.6647, lng: 135.52 },
  "大阪城公園": { lat: 34.6864, lng: 135.5267 },
  "大阪梅田": { lat: 34.7025, lng: 135.496 },
  "大阪港": { lat: 34.6536, lng: 135.4469 },
  "大阪阿部野橋": { lat: 34.6461, lng: 135.5131 },
  "大阪難波": { lat: 34.6642, lng: 135.5006 },
  "天下茶屋": { lat: 34.6397, lng: 135.5056 },
  "天満": { lat: 34.7056, lng: 135.5133 },
  "天満橋": { lat: 34.6872, lng: 135.5156 },
  "天王寺": { lat: 34.6464, lng: 135.5133 },
  "天神橋筋六丁目": { lat: 34.7197, lng: 135.5156 },
  "太子橋今市": { lat: 34.7297, lng: 135.5461 },
  "妙法寺": { lat: 34.6483, lng: 135.1344 },
  "姫島": { lat: 34.7189, lng: 135.4594 },
  "学園前": { lat: 34.6975, lng: 135.755 },
  "学園都市": { lat: 34.6144, lng: 135.0978 },
  "守口": { lat: 34.7494, lng: 135.5561 },
  "守口市": { lat: 34.7494, lng: 135.5561 },
  "安堂": { lat: 34.6131, lng: 135.6344 },
  "宝塚": { lat: 34.7997, lng: 135.3597 },
  "富田": { lat: 34.8289, lng: 135.5833 },
  "富雄": { lat: 34.6942, lng: 135.7242 },
  "寝屋川市": { lat: 34.7642, lng: 135.6317 },
  "寺田町": { lat: 34.6519, lng: 135.5261 },
  "尼崎": { lat: 34.7333, lng: 135.4064 },
  "尼崎センタープール前": { lat: 34.7339, lng: 135.39 },
  "山本": { lat: 34.8394, lng: 135.4222 },
  "岡本": { lat: 34.7292, lng: 135.2792 },
  "岡町": { lat: 34.7856, lng: 135.4697 },
  "岩屋": { lat: 34.7086, lng: 135.2231 },
  "岸和田": { lat: 34.4581, lng: 135.3722 },
  "岸里": { lat: 34.6428, lng: 135.495 },
  "岸里玉出": { lat: 34.6411, lng: 135.4917 },
  "崇禅寺": { lat: 34.7214, lng: 135.5089 },
  "川西能勢口": { lat: 34.8286, lng: 135.4175 },
  "布施": { lat: 34.6742, lng: 135.5644 },
  "庄内": { lat: 34.7428, lng: 135.4511 },
  "弁天町": { lat: 34.6653, lng: 135.4689 },
  "弥刀": { lat: 34.665, lng: 135.5942 },
  "御影": { lat: 34.7211, lng: 135.2683 },
  "心斎橋": { lat: 34.6753, lng: 135.5007 },
  "忠岡": { lat: 34.4875, lng: 135.4039 },
  "恩智": { lat: 34.6372, lng: 135.6333 },
  "恵美須町": { lat: 34.6622, lng: 135.5078 },
  "我孫子": { lat: 34.6028, lng: 135.5272 },
  "扇町": { lat: 34.7089, lng: 135.5156 },
  "打出": { lat: 34.7311, lng: 135.3153 },
  "摂津市": { lat: 34.7658, lng: 135.5597 },
  "摂津本山": { lat: 34.7228, lng: 135.2722 },
  "摩耶": { lat: 34.7178, lng: 135.2353 },
  "文の里": { lat: 34.6361, lng: 135.5183 },
  "新今宮": { lat: 34.6483, lng: 135.5006 },
  "新在家": { lat: 34.7144, lng: 135.2481 },
  "新大阪": { lat: 34.7333, lng: 135.5 },
  "新森古市": { lat: 34.7111, lng: 135.5394 },
  "新石切": { lat: 34.6994, lng: 135.6089 },
  "新神戸": { lat: 34.7036, lng: 135.1947 },
  "新金岡": { lat: 34.5711, lng: 135.5117 },
  "新長田": { lat: 34.6686, lng: 135.1494 },
  "新開地": { lat: 34.6894, lng: 135.1769 },
  "春日野道": { lat: 34.7053, lng: 135.2133 },
  "春木": { lat: 34.47, lng: 135.3936 },
  "昭和町": { lat: 34.6383, lng: 135.5183 },
  "曽根": { lat: 34.7789, lng: 135.4628 },
  "服部天神": { lat: 34.7686, lng: 135.4628 },
  "朝潮橋": { lat: 34.6578, lng: 135.4594 },
  "本町": { lat: 34.6836, lng: 135.501 },
  "杭瀬": { lat: 34.7333, lng: 135.4214 },
  "東三国": { lat: 34.7467, lng: 135.5028 },
  "東大阪": { lat: 34.6794, lng: 135.6011 },
  "東生駒": { lat: 34.6897, lng: 135.7022 },
  "松ノ浜": { lat: 34.5211, lng: 135.4361 },
  "松屋町": { lat: 34.6747, lng: 135.5167 },
  "板宿": { lat: 34.6597, lng: 135.1367 },
  "枚方公園": { lat: 34.8044, lng: 135.6436 },
  "枚方市": { lat: 34.8147, lng: 135.6508 },
  "桂": { lat: 34.9689, lng: 135.7217 },
  "桃山台": { lat: 34.8061, lng: 135.4972 },
  "桃谷": { lat: 34.6578, lng: 135.5344 },
  "桜ノ宮": { lat: 34.7022, lng: 135.5222 },
  "梅田": { lat: 34.7025, lng: 135.496 },
  "森ノ宮": { lat: 34.6778, lng: 135.5294 },
  "森小路": { lat: 34.7122, lng: 135.5372 },
  "樟葉": { lat: 34.8367, lng: 135.6561 },
  "横堤": { lat: 34.6978, lng: 135.5589 },
  "橋本": { lat: 34.8819, lng: 135.7239 },
  "橿原神宮前": { lat: 34.4939, lng: 135.7956 },
  "正雀": { lat: 34.7472, lng: 135.5386 },
  "武庫之荘": { lat: 34.7428, lng: 135.3689 },
  "武庫川": { lat: 34.7281, lng: 135.3803 },
  "水無瀬": { lat: 34.8806, lng: 135.6489 },
  "江坂": { lat: 34.7578, lng: 135.5056 },
  "池田": { lat: 34.8208, lng: 135.435 },
  "河内国分": { lat: 34.5994, lng: 135.6361 },
  "河内山本": { lat: 34.6508, lng: 135.6183 },
  "河原町": { lat: 35.0036, lng: 135.7706 },
  "河堀口": { lat: 34.6297, lng: 135.5283 },
  "泉大津": { lat: 34.5092, lng: 135.4158 },
  "法善寺": { lat: 34.6294, lng: 135.6356 },
  "浜寺公園": { lat: 34.5386, lng: 135.4511 },
  "淀": { lat: 34.9133, lng: 135.7153 },
  "淀屋橋": { lat: 34.6933, lng: 135.5006 },
  "淀川": { lat: 34.7089, lng: 135.4644 },
  "淡路": { lat: 34.7289, lng: 135.5133 },
  "深江": { lat: 34.7236, lng: 135.2897 },
  "深江橋": { lat: 34.6769, lng: 135.5511 },
  "清水": { lat: 34.7194, lng: 135.5411 },
  "清荒神": { lat: 34.8217, lng: 135.4456 },
  "湊": { lat: 34.5628, lng: 135.4706 },
  "湊川公園": { lat: 34.6886, lng: 135.1764 },
  "滝井": { lat: 34.7297, lng: 135.5417 },
  "灘": { lat: 34.7081, lng: 135.2239 },
  "烏丸": { lat: 35.0028, lng: 135.7589 },
  "玉造": { lat: 34.6758, lng: 135.5272 },
  "王子公園": { lat: 34.7108, lng: 135.2367 },
  "瑞光四丁目": { lat: 34.7483, lng: 135.5378 },
  "生駒": { lat: 34.6872, lng: 135.6817 },
  "田辺": { lat: 34.6256, lng: 135.5233 },
  "甲南山手": { lat: 34.7253, lng: 135.2847 },
  "甲子園": { lat: 34.7281, lng: 135.3594 },
  "甲子園口": { lat: 34.7278, lng: 135.3717 },
  "甲陽園": { lat: 34.7617, lng: 135.3133 },
  "相川": { lat: 34.7319, lng: 135.5219 },
  "県庁前": { lat: 34.6933, lng: 135.1908 },
  "矢田": { lat: 34.5878, lng: 135.5378 },
  "石屋川": { lat: 34.7181, lng: 135.2583 },
  "石橋阪大前": { lat: 34.8297, lng: 135.4411 },
  "石津川": { lat: 34.5547, lng: 135.4628 },
  "神崎川": { lat: 34.7342, lng: 135.4578 },
  "神戸": { lat: 34.6913, lng: 135.183 },
  "福島": { lat: 34.6947, lng: 135.4836 },
  "立花": { lat: 34.7258, lng: 135.3889 },
  "粉浜": { lat: 34.6178, lng: 135.4869 },
  "総合運動公園": { lat: 34.6211, lng: 135.1194 },
  "総持寺": { lat: 34.81, lng: 135.5714 },
  "緑地公園": { lat: 34.7958, lng: 135.49 },
  "緑橋": { lat: 34.6769, lng: 135.5394 },
  "羽倉崎": { lat: 34.4078, lng: 135.3211 },
  "肥後橋": { lat: 34.6922, lng: 135.4944 },
  "芦原橋": { lat: 34.6589, lng: 135.4783 },
  "芦屋": { lat: 34.7269, lng: 135.3011 },
  "芦屋川": { lat: 34.7339, lng: 135.2939 },
  "花園町": { lat: 34.6494, lng: 135.4978 },
  "花隈": { lat: 34.6936, lng: 135.1861 },
  "苦楽園口": { lat: 34.7531, lng: 135.3153 },
  "茨木市": { lat: 34.805, lng: 135.5589 },
  "萩ノ茶屋": { lat: 34.6519, lng: 135.4978 },
  "萱島": { lat: 34.7456, lng: 135.6103 },
  "蒲生四丁目": { lat: 34.6933, lng: 135.5383 },
  "蛸地蔵": { lat: 34.4508, lng: 135.3728 },
  "西三荘": { lat: 34.7531, lng: 135.5717 },
  "西中島南方": { lat: 34.7267, lng: 135.4983 },
  "西九条": { lat: 34.6806, lng: 135.4656 },
  "西元町": { lat: 34.6917, lng: 135.1883 },
  "西大橋": { lat: 34.6747, lng: 135.4944 },
  "西宮": { lat: 34.7342, lng: 135.3408 },
  "西宮北口": { lat: 34.7456, lng: 135.3378 },
  "西山天王山": { lat: 34.9258, lng: 135.6981 },
  "西本町": { lat: 34.6828, lng: 135.4944 },
  "西梅田": { lat: 34.7006, lng: 135.4939 },
  "西灘": { lat: 34.7106, lng: 135.2317 },
  "西田辺": { lat: 34.6294, lng: 135.5206 },
  "西神中央": { lat: 34.6403, lng: 135.0525 },
  "西神南": { lat: 34.6328, lng: 135.06 },
  "西長堀": { lat: 34.6733, lng: 135.4922 },
  "西院": { lat: 34.9978, lng: 135.7383 },
  "諏訪ノ森": { lat: 34.5456, lng: 135.4533 },
  "谷町九丁目": { lat: 34.6636, lng: 135.5183 },
  "谷町六丁目": { lat: 34.6736, lng: 135.5183 },
  "谷町四丁目": { lat: 34.6839, lng: 135.5156 },
  "豊中": { lat: 34.7908, lng: 135.4758 },
  "貝塚": { lat: 34.4394, lng: 135.3578 },
  "近鉄八尾": { lat: 34.6556, lng: 135.6094 },
  "近鉄奈良": { lat: 34.6839, lng: 135.8328 },
  "近鉄日本橋": { lat: 34.6672, lng: 135.5069 },
  "都島": { lat: 34.6961, lng: 135.5317 },
  "野江": { lat: 34.7033, lng: 135.5322 },
  "野江内代": { lat: 34.7, lng: 135.5369 },
  "野田": { lat: 34.6917, lng: 135.4717 },
  "野田阪神": { lat: 34.6917, lng: 135.4717 },
  "針中野": { lat: 34.5994, lng: 135.5339 },
  "長堀橋": { lat: 34.6714, lng: 135.5078 },
  "長居": { lat: 34.6133, lng: 135.5225 },
  "長岡天神": { lat: 34.9217, lng: 135.69 },
  "長瀬": { lat: 34.6678, lng: 135.5836 },
  "長田": { lat: 34.6736, lng: 135.1536 },
  "門真南": { lat: 34.7006, lng: 135.5844 },
  "門真市": { lat: 34.7528, lng: 135.5819 },
  "関目": { lat: 34.7056, lng: 135.5361 },
  "関目成育": { lat: 34.7033, lng: 135.5378 },
  "関目高殿": { lat: 34.7056, lng: 135.5361 },
  "阿倍野": { lat: 34.6444, lng: 135.5133 },
  "阿波座": { lat: 34.6828, lng: 135.4917 },
  "難波": { lat: 34.6687, lng: 135.501 },
  "雲雀丘花屋敷": { lat: 34.8361, lng: 135.415 },
  "青木": { lat: 34.7222, lng: 135.2794 },
  "香櫨園": { lat: 34.7344, lng: 135.3261 },
  "香里園": { lat: 34.7808, lng: 135.6333 },
  "駒川中野": { lat: 34.6122, lng: 135.5283 },
  "高井田": { lat: 34.6833, lng: 135.5706 },
  "高安": { lat: 34.6453, lng: 135.6278 },
  "高槻": { lat: 34.8494, lng: 135.6172 },
  "高槻市": { lat: 34.8494, lng: 135.6172 },
  "高速神戸": { lat: 34.69, lng: 135.1808 },
  "魚崎": { lat: 34.7183, lng: 135.2669 },
  "鳴尾・武庫川女子大前": { lat: 34.7269, lng: 135.3681 },
  "鶴橋": { lat: 34.6661, lng: 135.5344 },
  "鶴見緑地": { lat: 34.6994, lng: 135.5722 },
};

const SEARCH_RADIUS_METERS = 500;
const MAX_RESULTS = 20;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const searchCache = new Map();

function getCacheKey(area) { return area.trim().toLowerCase(); }

function getFromCache(area) {
  const key = getCacheKey(area);
  const cached = searchCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) { searchCache.delete(key); return null; }
  return cached.data;
}

function setToCache(area, data) {
  searchCache.set(getCacheKey(area), { data, timestamp: Date.now() });
}

const CONGESTION = [
  { id: "empty",   label: "空いてる", icon: "🟢", color: "#2d6a4f", bg: "#e8f5e9" },
  { id: "normal",  label: "普通",     icon: "🟡", color: "#b7950b", bg: "#fffbea" },
  { id: "crowded", label: "混んでる", icon: "🔴", color: "#c0392b", bg: "#ffeaea" },
];

const CHAIN_COLORS = {
  "セブン-イレブン": "#e63946",
  "ファミリーマート": "#00a040",
  "ローソン": "#0b5ea8",
  "ミニストップ": "#f4a261",
};
function getChainColor(name) {
  for (const [k, v] of Object.entries(CHAIN_COLORS)) if (name.includes(k)) return v;
  return "#888";
}

const MOCK_PLACES = [
  { place_id: "user_1", name: "デイリーヤマザキ 大阪博労町店", address: "〒541-0059 大阪府大阪市中央区博労町４丁目６−１０ ハニービル", lat: 34.6783678, lng: 135.4988962, congestion: null, helpedCount: 0, reviews: ["6席のイートインおよび複数のテラス席あり。"] },
  { place_id: "user_2", name: "ファミリーマート 江戸堀なにわ筋店", address: "〒550-0002 大阪府大阪市西区江戸堀１丁目２５−２２", lat: 34.6884323, lng: 135.4918853, congestion: null, helpedCount: 0, reviews: ["イートイン13席あり。コンセントもあり、綺麗。ドコモWi-Fiあり。トイレも広くて綺麗。"] },
  { place_id: "user_3", name: "ファミリーマート 四ツ橋北堀江一丁目店", address: "〒550-0014 大阪府大阪市西区北堀江１丁目３−２０", lat: 34.6732234, lng: 135.4959686, congestion: null, helpedCount: 0, reviews: ["イートインなし。"] },
  { place_id: "user_4", name: "セブン-イレブン 四ツ橋南堀江店", address: "〒550-0015 大阪府大阪市西区南堀江１丁目１１−１７", lat: 34.6723781, lng: 135.4958841, congestion: null, helpedCount: 0, reviews: ["イートインなし。"] },
  { place_id: "user_5", name: "セブン-イレブン 大阪流町３丁目店", address: "〒547-0032 大阪府大阪市平野区流町３丁目１２", lat: 34.6204947, lng: 135.5543871, congestion: null, helpedCount: 0, reviews: ["イートインなし"] },
  { place_id: "user_6", name: "ファミリーマート 平野南一丁目店", address: "〒547-0031 大阪府大阪市平野区平野南１丁目５−３１", lat: 34.6195682, lng: 135.5560811, congestion: null, helpedCount: 0, reviews: ["イートインなし"] },
  { place_id: "user_7", name: "ファミリーマート 南久宝寺町二丁目店", address: "〒541-0058 大阪府大阪市中央区南久宝寺町２丁目４−４", lat: 34.6792997, lng: 135.5053317, congestion: null, helpedCount: 0, reviews: ["イートインあり。"] },
  { place_id: "user_8", name: "ローソン 寝屋川豊里町店", address: "〒572-0071 大阪府寝屋川市豊里町３９−１６", lat: 34.7799954, lng: 135.6180098, congestion: null, helpedCount: 0, reviews: ["イートインなし。"] },
  { place_id: "user_9", name: "ローソン 東心斎橋二丁目店", address: "〒542-0083 大阪府大阪市中央区東心斎橋２丁目１−６", lat: 34.6713235, lng: 135.5060391, congestion: null, helpedCount: 0, reviews: ["イートインなし。"] },
  { place_id: "user_10", name: "ファミリーマート 小浦桜川一丁目店", address: "〒556-0022 大阪府大阪市浪速区桜川１丁目４−３", lat: 34.6657654, lng: 135.4937583, congestion: null, helpedCount: 0, reviews: ["イートイン11席あり。"] },
  { place_id: "user_11", name: "セブン-イレブン 大阪難波サンケイビル店", address: "〒556-0017 大阪府大阪市浪速区湊町２丁目１−５７ 難波サンケイビル 1F", lat: 34.6651971, lng: 135.4952994, congestion: null, helpedCount: 0, reviews: ["イートイン5席ほどあり。"] },
  { place_id: "user_12", name: "ローソン 上町店", address: "〒540-0005 大阪府大阪市中央区上町Ｃ３", lat: 34.6773188, lng: 135.520679, congestion: null, helpedCount: 0, reviews: ["イートインあり。5席"] },
  { place_id: "user_13", name: "ローソン 上町北店", address: "〒540-0005 大阪府大阪市中央区上町Ａ３", lat: 34.6784894, lng: 135.5211812, congestion: null, helpedCount: 0, reviews: ["イートインなし。"] },
  { place_id: "user_14", name: "ファミリーマート 大国町店", address: "〒556-0013 大阪府大阪市浪速区戎本町１丁目７−１９", lat: 34.6549415, lng: 135.4981844, congestion: null, helpedCount: 0, reviews: ["イートインなし。"] },
  { place_id: "user_15", name: "セブン-イレブン 大阪北加賀屋１丁目店", address: "〒559-0011 大阪府大阪市住之江区北加賀屋１丁目１２−２３", lat: 34.6245972, lng: 135.4787532, congestion: null, helpedCount: 0, reviews: ["イートイン閉鎖中"] },
  { place_id: "user_16", name: "ローソン 北加賀屋一丁目店", address: "〒559-0011 大阪府大阪市住之江区北加賀屋１丁目４−１７", lat: 34.6219596, lng: 135.4812484, congestion: null, helpedCount: 0, reviews: ["イートイン無し"] },
  { place_id: "user_17", name: "ファミリーマート 西中島七丁目店", address: "〒532-0011 大阪府大阪市淀川区西中島７丁目５−２０", lat: 34.7315217, lng: 135.497997, congestion: null, helpedCount: 0, reviews: ["イートインあり。6席"] },
  { place_id: "user_18", name: "セブン-イレブン 大阪清水駅前店", address: "〒535-0021 大阪府大阪市旭区清水４丁目１−７", lat: 34.7210025, lng: 135.5609547, congestion: null, helpedCount: 0, reviews: ["イートイン無し"] },
  { place_id: "user_19", name: "ファミリーマート 本町四丁目店", address: "〒541-0053 大阪府大阪市中央区本町４丁目２−１２", lat: 34.6833383, lng: 135.5002978, congestion: null, helpedCount: 0, reviews: ["イートインあり。6席"] },
  { place_id: "user_20", name: "セブン-イレブン 御堂筋本町店", address: "〒541-0054 大阪府大阪市中央区南本町４丁目２−５", lat: 34.68232, lng: 135.5002578, congestion: null, helpedCount: 0, reviews: ["イートインあり。8席ほど。 店舗きれい"] },
  { place_id: "user_21", name: "ファミリーマート 南森町駅前店", address: "〒530-0054 大阪府大阪市北区南森町２丁目３−３５", lat: 34.6988337, lng: 135.5107741, congestion: null, helpedCount: 0, reviews: ["イートインなし。"] },
  { place_id: "user_22", name: "セブン-イレブン 大阪南森町店", address: "〒530-0054 大阪府大阪市北区南森町１丁目３−１９", lat: 34.6973474, lng: 135.5106219, congestion: null, helpedCount: 0, reviews: ["イートインなし。"] },
  { place_id: "user_23", name: "セブン-イレブン 大阪天神橋１丁目店", address: "〒530-0041 大阪府大阪市北区天神橋１丁目５−１３", lat: 34.693483, lng: 135.5119714, congestion: null, helpedCount: 0, reviews: ["イートインなし。"] },
  { place_id: "user_24", name: "セブン-イレブン 豊中服部南町４丁目店", address: "〒561-0853 大阪府豊中市服部南町４丁目５−１３", lat: 34.7581388, lng: 135.4767878, congestion: null, helpedCount: 0, reviews: ["イートインなし。"] },
  { place_id: "user_25", name: "セブン-イレブン 大阪内本町２丁目店", address: "〒540-0026 大阪府大阪市中央区内本町２丁目３−１７", lat: 34.6832335, lng: 135.5129117, congestion: null, helpedCount: 0, reviews: ["イートインなし。"] },
  { place_id: "user_26", name: "ローソン 内本町二丁目店", address: "〒540-0026 大阪府大阪市中央区内本町２丁目４−１２", lat: 34.6836135, lng: 135.5121081, congestion: null, helpedCount: 0, reviews: ["イートインなし。"] },
  { place_id: "user_27", name: "ファミリーマート 内本町西店", address: "〒540-0029 大阪府大阪市中央区本町橋２−２８", lat: 34.6836854, lng: 135.5104411, congestion: null, helpedCount: 0, reviews: ["イートインなし。"] },
  { place_id: "user_28", name: "セブン-イレブン 吹田垂水町店", address: "〒564-0062 大阪府吹田市垂水町３丁目２３−３３", lat: 34.7607042, lng: 135.5016775, congestion: null, helpedCount: 0, reviews: ["イートインなし。"] },
  { place_id: "user_29", name: "ファミリーマート 大阪回生病院前店", address: "〒532-0003 大阪府大阪市淀川区宮原１丁目７−７", lat: 34.7359401, lng: 135.4991247, congestion: null, helpedCount: 0, reviews: ["イートイン有り。3席"] },
  { place_id: "user_30", name: "ファミリーマート 淀川宮原店", address: "〒532-0003 大阪府大阪市淀川区宮原１丁目１９−８ ノルデンタワー東大阪アネックス A2615", lat: 34.7366654, lng: 135.4989418, congestion: null, helpedCount: 0, reviews: ["イートイン有り。入り口付近に2席"] },
  { place_id: "user_31", name: "セブンイレブン大阪平野南1丁目店", address: "〒547-0031 大阪府大阪市平野区平野南１丁目１−１", lat: 34.6205795, lng: 135.5545587, congestion: null, helpedCount: 0, reviews: ["イートインなし"] },
  { place_id: "user_32", name: "ローソン 平野本町五丁目店", address: "〒547-0044 大阪府大阪市平野区平野本町５丁目９−２９", lat: 34.6209331, lng: 135.554231, congestion: null, helpedCount: 0, reviews: ["イートインあり。5席ほど"] },
  { place_id: "user_33", name: "セブン-イレブン 大阪中津南店", address: "〒531-0071 大阪府大阪市北区中津６丁目５−２２", lat: 34.7087033, lng: 135.4904181, congestion: null, helpedCount: 0, reviews: ["イートイン有り。2階にある。"] },
  { place_id: "user_34", name: "セブン-イレブン 尼崎浜田町２丁目店", address: "〒660-0062 兵庫県尼崎市浜田町２丁目８０", lat: 34.7304964, lng: 135.3980904, congestion: null, helpedCount: 0, reviews: ["イートインなし。"] },
  { place_id: "user_35", name: "ローソン 江坂店", address: "〒564-0051 大阪府吹田市豊津町２−１", lat: 34.761775, lng: 135.4959865, congestion: null, helpedCount: 0, reviews: ["イートインなし。"] },
  { place_id: "user_36", name: "セブン-イレブン ＪＲ放出駅西店", address: "〒538-0044 大阪府大阪市鶴見区放出東３丁目８−２０ ＳＥＶＥＮ＆ｉ ＨＯＬＤＩＮＧＳ", lat: 34.6886942, lng: 135.5619399, congestion: null, helpedCount: 0, reviews: ["イートインなし"] },
  { place_id: "user_37", name: "ファミリーマート 江坂駅北店", address: "〒564-0063 大阪府吹田市江坂町１丁目１３−４１", lat: 34.7607685, lng: 135.4975763, congestion: null, helpedCount: 0, reviews: ["イートイン有。20席ほど。広くて綺麗。"] },
  { place_id: "user_38", name: "セブン-イレブン 大阪高麗橋４丁目店", address: "〒541-0043 大阪府大阪市中央区高麗橋４丁目８−１０", lat: 34.6900741, lng: 135.4978492, congestion: null, helpedCount: 0, reviews: ["イートインなし。"] },
  { place_id: "user_39", name: "セブン-イレブン 大阪江戸堀１丁目店", address: "〒550-0002 大阪府大阪市西区江戸堀１丁目６−１７", lat: 34.689869, lng: 135.496985, congestion: null, helpedCount: 0, reviews: ["イートイン無し。"] },
  { place_id: "user_40", name: "ローソン 東心斎橋一丁目店", address: "〒542-0083 大阪府大阪市中央区東心斎橋１丁目８−２", lat: 34.6741862, lng: 135.5052175, congestion: null, helpedCount: 0, reviews: ["イートイン有り。2席"] },
  { place_id: "user_41", name: "ファミリーマート 東心斎橋店", address: "〒542-0083 大阪府大阪市中央区東心斎橋１丁目５−１", lat: 34.6726864, lng: 135.5060858, congestion: null, helpedCount: 0, reviews: ["イートイン無し"] },
  { place_id: "user_42", name: "ファミリーマート 長堀橋駅南店", address: "〒542-0082 大阪府大阪市中央区島之内１丁目２１−２２", lat: 34.6731983, lng: 135.5065066, congestion: null, helpedCount: 0, reviews: ["イートイン無し"] },
  { place_id: "user_43", name: "セブン-イレブン 大阪長堀心斎橋店", address: "〒542-0083 大阪府大阪市中央区東心斎橋１丁目１−１２ 1F", lat: 34.6748565, lng: 135.5056403, congestion: null, helpedCount: 0, reviews: ["イートイン無し"] },
  { place_id: "user_44", name: "セブン-イレブン 大阪境川１丁目店", address: "〒550-0024 大阪府大阪市西区境川１丁目１−３１", lat: 34.6693953, lng: 135.4725614, congestion: null, helpedCount: 0, reviews: ["イートイン無し"] },
  { place_id: "user_45", name: "デイリーヤマザキ フォレオドームシティ店", address: "〒550-0025 大阪府大阪市西区九条南１丁目１２−３３", lat: 34.6692504, lng: 135.4736359, congestion: null, helpedCount: 0, reviews: ["イートイン無し"] },
  { place_id: "user_46", name: "セブン-イレブン 大阪大淀南１丁目店", address: "〒531-0075 大阪府大阪市北区大淀南１丁目１０−１１ TDRbild", lat: 34.7022529, lng: 135.4875297, congestion: null, helpedCount: 0, reviews: ["イートイン無し"] },
  { place_id: "user_47", name: "ローソン 福島七丁目店", address: "〒553-0003 大阪府大阪市福島区福島７丁目２２−１７ ＢＲＡＶＩ 1F", lat: 34.7010002, lng: 135.4869167, congestion: null, helpedCount: 0, reviews: ["イートイン無し"] },
  { place_id: "user_48", name: "ファミリーマート 寝屋川香里南之町店", address: "〒572-0084 大阪府寝屋川市香里南之町３６−１２", lat: 34.7836243, lng: 135.6281016, congestion: null, helpedCount: 0, reviews: ["イートイン無し"] },
  { place_id: "user_49", name: "セブン-イレブン 寝屋川香里南之町店", address: "〒572-0084 大阪府寝屋川市香里南之町３０−２６ 秋ビル", lat: 34.7835948, lng: 135.6294286, congestion: null, helpedCount: 0, reviews: ["イートイン無し。"] },
  { place_id: "user_50", name: "セブン-イレブン 四ツ橋立売堀店", address: "〒550-0012 大阪府大阪市西区立売堀１丁目３−１１", lat: 34.6794015, lng: 135.4972331, congestion: null, helpedCount: 0, reviews: ["イートイン有。8席ほど"] },
  { place_id: "user_51", name: "ファミリーマート 立売堀一丁目店", address: "〒550-0012 大阪府大阪市西区立売堀１丁目６−１３ 南本町天祥ビル 2号館", lat: 34.6803525, lng: 135.4960789, congestion: null, helpedCount: 0, reviews: ["イートイン無し"] },
  { place_id: "user_52", name: "セブン-イレブン 大阪靱本町１丁目店", address: "〒550-0004 大阪府大阪市西区靱本町１丁目４−８", lat: 34.6838922, lng: 135.4975746, congestion: null, helpedCount: 0, reviews: ["イートイン有り。2階で広い。"] },
  { place_id: "user_53", name: "セブン-イレブン 東大阪荒本北２丁目店", address: "〒577-0011 大阪府東大阪市荒本北２丁目２−４ ＬＥＧＡＲＥ東野", lat: 34.6788757, lng: 135.6034082, congestion: null, helpedCount: 0, reviews: ["イートインあり。5.6席ほど"] },
  { place_id: "user_54", name: "セブン-イレブン 大阪今福西６丁目店", address: "〒596-0004 大阪府大阪市城東区今福西６丁目４−２０", lat: 34.704666, lng: 135.552354, congestion: null, helpedCount: 0, reviews: ["イートイン無し"] },
  { place_id: "user_55", name: "セブン-イレブン 大阪関目２丁目店", address: "〒536-0008 大阪府大阪市城東区関目２丁目２−６", lat: 34.7063219, lng: 135.5501055, congestion: null, helpedCount: 0, reviews: ["イートイン有 コロナで閉鎖中"] },
];
const OWNER_DATA = {
  "user_1": { hasEatIn: true, seats: 6, outlet: false, wifi: false },
  "user_2": { hasEatIn: true, seats: 13, outlet: true, wifi: true },
  "user_3": { hasEatIn: false, seats: null, outlet: false, wifi: false },
  "user_4": { hasEatIn: false, seats: null, outlet: false, wifi: false },
  "user_5": { hasEatIn: false, seats: null, outlet: false, wifi: false },
  "user_6": { hasEatIn: false, seats: null, outlet: false, wifi: false },
  "user_7": { hasEatIn: true, seats: null, outlet: false, wifi: false },
  "user_8": { hasEatIn: false, seats: null, outlet: false, wifi: false },
  "user_9": { hasEatIn: false, seats: null, outlet: false, wifi: false },
  "user_10": { hasEatIn: true, seats: 11, outlet: false, wifi: false },
  "user_11": { hasEatIn: true, seats: 5, outlet: false, wifi: false },
  "user_12": { hasEatIn: true, seats: 5, outlet: false, wifi: false },
  "user_13": { hasEatIn: false, seats: null, outlet: false, wifi: false },
  "user_14": { hasEatIn: false, seats: null, outlet: false, wifi: false },
  "user_15": { hasEatIn: true, seats: null, outlet: false, wifi: false },
  "user_16": { hasEatIn: true, seats: null, outlet: false, wifi: false },
  "user_17": { hasEatIn: true, seats: 6, outlet: false, wifi: false },
  "user_18": { hasEatIn: true, seats: null, outlet: false, wifi: false },
  "user_19": { hasEatIn: true, seats: 6, outlet: false, wifi: false },
  "user_20": { hasEatIn: true, seats: 8, outlet: false, wifi: false },
  "user_21": { hasEatIn: false, seats: null, outlet: false, wifi: false },
  "user_22": { hasEatIn: false, seats: null, outlet: false, wifi: false },
  "user_23": { hasEatIn: false, seats: null, outlet: false, wifi: false },
  "user_24": { hasEatIn: false, seats: null, outlet: false, wifi: false },
  "user_25": { hasEatIn: false, seats: null, outlet: false, wifi: false },
  "user_26": { hasEatIn: false, seats: null, outlet: false, wifi: false },
  "user_27": { hasEatIn: false, seats: null, outlet: false, wifi: false },
  "user_28": { hasEatIn: false, seats: null, outlet: false, wifi: false },
  "user_29": { hasEatIn: true, seats: 3, outlet: false, wifi: false },
  "user_30": { hasEatIn: true, seats: 2, outlet: false, wifi: false },
  "user_31": { hasEatIn: false, seats: null, outlet: false, wifi: false },
  "user_32": { hasEatIn: true, seats: 5, outlet: false, wifi: false },
  "user_33": { hasEatIn: true, seats: null, outlet: false, wifi: false },
  "user_34": { hasEatIn: false, seats: null, outlet: false, wifi: false },
  "user_35": { hasEatIn: false, seats: null, outlet: false, wifi: false },
  "user_36": { hasEatIn: false, seats: null, outlet: false, wifi: false },
  "user_37": { hasEatIn: true, seats: 20, outlet: false, wifi: false },
  "user_38": { hasEatIn: false, seats: null, outlet: false, wifi: false },
  "user_39": { hasEatIn: true, seats: null, outlet: false, wifi: false },
  "user_40": { hasEatIn: true, seats: 2, outlet: false, wifi: false },
  "user_41": { hasEatIn: true, seats: null, outlet: false, wifi: false },
  "user_42": { hasEatIn: true, seats: null, outlet: false, wifi: false },
  "user_43": { hasEatIn: true, seats: null, outlet: false, wifi: false },
  "user_44": { hasEatIn: true, seats: null, outlet: false, wifi: false },
  "user_45": { hasEatIn: true, seats: null, outlet: false, wifi: false },
  "user_46": { hasEatIn: true, seats: null, outlet: false, wifi: false },
  "user_47": { hasEatIn: true, seats: null, outlet: false, wifi: false },
  "user_48": { hasEatIn: true, seats: null, outlet: false, wifi: false },
  "user_49": { hasEatIn: true, seats: null, outlet: false, wifi: false },
  "user_50": { hasEatIn: true, seats: 8, outlet: false, wifi: false },
  "user_51": { hasEatIn: true, seats: null, outlet: false, wifi: false },
  "user_52": { hasEatIn: true, seats: null, outlet: false, wifi: false },
  "user_53": { hasEatIn: true, seats: 6, outlet: false, wifi: false },
  "user_54": { hasEatIn: true, seats: null, outlet: false, wifi: false },
  "user_55": { hasEatIn: true, seats: null, outlet: false, wifi: false },
};

async function analyzeEatIn(name, reviews) {
  await new Promise(r => setTimeout(r, 400 + Math.random() * 500));
  const text = reviews.join(" ");
  const pos = ["イートイン","席","テーブル","座","スペース","椅子"].filter(w => text.includes(w)).length;
  const neg = ["なし","ない","持ち帰りのみ","座る場所ない"].filter(w => text.includes(w)).length;
  const outlet = text.includes("コンセント") || text.includes("電源");
  const wifi = text.includes("Wi-Fi") || text.includes("wifi");
  const sm = text.match(/(\d+)席/);
  const seats = sm ? parseInt(sm[1]) : null;
  let hasEatIn, confidence, reason;
  if (pos >= 2 && neg === 0) { hasEatIn = true;  confidence = "high";   reason = "複数の口コミでイートイン言及あり"; }
  else if (pos >= 1 && neg === 0) { hasEatIn = true;  confidence = "medium"; reason = "口コミにイートイン記載あり"; }
  else if (neg >= 1) { hasEatIn = false; confidence = "high";   reason = "口コミにイートインなしの記載あり"; }
  else               { hasEatIn = false; confidence = "low";    reason = "口コミからは判断できず"; }
  return { hasEatIn, confidence, reason, outlet, wifi, seats };
}

const CONF_LABEL = { high: "確度：高", medium: "確度：中", low: "確度：低" };
const CONF_COLOR = { high: "#2d6a4f", medium: "#e67e00", low: "#aaa" };

function VerifiedBadge({ verifications }) {
  if (!verifications || verifications.length === 0) return null;
  const topRank = verifications.reduce((best, v) => {
    const r = getRank(v.reportCount);
    return r.trust > getRank(best.reportCount || 0).trust ? v : best;
  }, verifications[0]);
  const rank = getRank(topRank.reportCount || 0);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#fffbea", border: "1.5px solid #f4d03f", borderRadius: 20, padding: "3px 9px", fontSize: "11px", fontWeight: 700, color: "#b7950b" }}>
      ✅ ユーザー確認済み
      <span style={{ background: rank.bg, color: rank.color, borderRadius: 10, padding: "1px 6px", fontSize: "10px", fontWeight: 700 }}>{rank.icon} {rank.label}</span>
      {verifications.length > 1 && <span style={{ color: "#aaa", fontWeight: 400 }}>他{verifications.length - 1}名</span>}
    </span>
  );
}

function RankBadge({ count, large }) {
  const rank = getRank(count);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: large ? 6 : 4, background: rank.bg, color: rank.color, border: `1.5px solid ${rank.color}44`, borderRadius: large ? 12 : 20, padding: large ? "6px 14px" : "2px 8px", fontSize: large ? "14px" : "11px", fontWeight: 700 }}>
      {rank.icon} {rank.label}
      {large && <span style={{ opacity: 0.6, fontWeight: 400, fontSize: "12px" }}>（投稿{count}件）</span>}
    </span>
  );
}

export default function EatInFinder() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [searchArea, setSearchArea] = useState("");
  const [selected, setSelected] = useState(null);
  const [filterEatIn, setFilterEatIn] = useState(false);
  const [filterOutlet, setFilterOutlet] = useState(false);
  const [filterWifi, setFilterWifi] = useState(false);
  const [filterVerified, setFilterVerified] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const [myReportCount, setMyReportCount] = useState(4);
  const [myHelpedCount, setMyHelpedCount] = useState(3);
  const [showProfile, setShowProfile] = useState(false);
  const [showCongestion, setShowCongestion] = useState(null);
  const [congestionSubmitted, setCongestionSubmitted] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);
  const [reportStep, setReportStep] = useState(1);
  const [reportData, setReportData] = useState({ hasEatIn: null, outlet: false, wifi: false, seats: "", comment: "" });
  const [submitted, setSubmitted] = useState(false);
  const [cacheHit, setCacheHit] = useState(false);
  const [searchCenter, setSearchCenter] = useState(null);

  // Firestoreから確認済み投稿・混雑・助かったを読み込む
  const loadFirestoreData = useCallback(async (placeIds) => {
    try {
      const snap = await getDocs(collection(db, "verifications"));
      const verMap = {};
      snap.forEach(d => {
        const data = d.data();
        if (!verMap[data.placeId]) verMap[data.placeId] = [];
        verMap[data.placeId].push({ ...data, docId: d.id });
      });

      const congSnap = await getDocs(collection(db, "congestion"));
      const congMap = {};
      congSnap.forEach(d => {
        const data = d.data();
        congMap[data.placeId] = data.status;
      });

      const helpSnap = await getDocs(collection(db, "helped"));
      const helpMap = {};
      helpSnap.forEach(d => {
        const data = d.data();
        helpMap[data.placeId] = data.count || 0;
      });

      setStores(prev => prev.map(s => ({
        ...s,
        verifications: verMap[s.place_id] || s.verifications,
        congestion: congMap[s.place_id] || s.congestion,
        helpedCount: helpMap[s.place_id] ?? s.helpedCount,
      })));
    } catch (e) {
      console.error("Firestore読み込みエラー:", e);
    }
  }, []);

  // 店舗が表示されたらFirestoreデータを読み込む
  useEffect(() => {
    if (stores.length > 0) {
      loadFirestoreData(stores.map(s => s.place_id));
    }
  }, [stores.length]);

  const handleCongestion = async (store, status, e) => {
    e.stopPropagation();
    setStores(prev => prev.map(s => s.place_id === store.place_id ? { ...s, congestion: status } : s));
    setCongestionSubmitted(store.place_id);
    setShowCongestion(null);
    setTimeout(() => setCongestionSubmitted(null), 2500);
    // Firestoreに保存
    try {
      const q = query(collection(db, "congestion"), where("placeId", "==", store.place_id));
      const snap = await getDocs(q);
      if (snap.empty) {
        await addDoc(collection(db, "congestion"), { placeId: store.place_id, status, updatedAt: new Date() });
      } else {
        await updateDoc(doc(db, "congestion", snap.docs[0].id), { status, updatedAt: new Date() });
      }
    } catch (e) { console.error("混雑保存エラー:", e); }
  };

  const handleHelped = async (store, e) => {
    e.stopPropagation();
    setStores(prev => prev.map(s => s.place_id === store.place_id ? { ...s, helpedCount: (s.helpedCount || 0) + 1, helpedByMe: true } : s));
    setMyHelpedCount(c => c + 1);
    // Firestoreに保存
    try {
      const q = query(collection(db, "helped"), where("placeId", "==", store.place_id));
      const snap = await getDocs(q);
      if (snap.empty) {
        await addDoc(collection(db, "helped"), { placeId: store.place_id, count: 1 });
      } else {
        await updateDoc(doc(db, "helped", snap.docs[0].id), { count: increment(1) });
      }
    } catch (e) { console.error("助かった保存エラー:", e); }
  };

  const runSearch = useCallback(async (areaKey) => {
    setStores([]); setSelected(null); setCacheHit(false);
    const cached = getFromCache(areaKey);
    if (cached) { setCacheHit(true); setStores(cached); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 900));
    setLoading(false);
    // エリア絞り込み：住所に検索ワードが含まれる店舗のみ（GPS検索時はスキップ）
    const isGPS = areaKey === "現在地";
    const areaFiltered = isGPS ? MOCK_PLACES : MOCK_PLACES.filter(p => 
      p.address.includes(areaKey) || p.name.includes(areaKey) ||
      Object.keys(STATION_COORDS).some(k => areaKey.includes(k) && p.address.includes(k))
    );
    // 絞り込み結果がない場合は全件表示
    const places = (areaFiltered.length > 0 ? areaFiltered : MOCK_PLACES).slice(0, MAX_RESULTS);
    setAnalyzing(true);
    setProgress({ current: 0, total: places.length });
    const results = [];
    for (let i = 0; i < places.length; i++) {
      const place = places[i];
      const ai = await analyzeEatIn(place.name, place.reviews);
      const ownerInfo = OWNER_DATA[place.place_id];
      const aiResult = ownerInfo || ai;
      const verifications = ownerInfo
        ? [{ userId: "owner", reportCount: 50, comment: place.reviews[0] }]
        : [];
      results.push({ ...place, ...aiResult, verifications, congestion: place.congestion || null, helpedCount: place.helpedCount || 0 });
      setProgress({ current: i + 1, total: places.length });
      setStores([...results]);
    }
    // 検索中心点から距離順にソート
    if (searchCenter) {
      results.sort((a, b) => {
        const da = calcDistance(searchCenter.lat, searchCenter.lng, a.lat, a.lng);
        const db = calcDistance(searchCenter.lat, searchCenter.lng, b.lat, b.lng);
        return da - db;
      });
    }
    setStores([...results]);
    setToCache(areaKey, results);
    setAnalyzing(false);
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchArea.trim()) return;
    // 駅名から座標を探す
    const matched = Object.entries(STATION_COORDS).find(([k]) => searchArea.includes(k));
    if (matched) {
      setSearchCenter({ lat: matched[1].lat, lng: matched[1].lng });
    } else {
      setSearchCenter(null);
    }
    await runSearch(searchArea);
  }, [searchArea, runSearch]);

  const handleGPS = useCallback(() => {
    if (!navigator.geolocation) { setGpsError("このブラウザはGPS非対応です"); return; }
    setGpsError(""); setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setGpsLoading(false);
        setSearchArea(`現在地 (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
        runSearch("現在地");
      },
      (err) => {
        setGpsLoading(false);
        setGpsError(err.code === 1 ? "位置情報の許可が必要です" : "現在地を取得できませんでした");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [runSearch]);

  const handleSubmitReport = async () => {
    if (!reportTarget) return;
    setStores(prev => prev.map(s => {
      if (s.place_id !== reportTarget.place_id) return s;
      const newVerification = { userId: "me", reportCount: myReportCount + 1, comment: reportData.comment };
      return { ...s, hasEatIn: reportData.hasEatIn ?? s.hasEatIn, outlet: reportData.outlet || s.outlet, wifi: reportData.wifi || s.wifi, seats: reportData.seats ? parseInt(reportData.seats) : s.seats, verifications: [...(s.verifications || []), newVerification] };
    }));
    setMyReportCount(c => c + 1);
    setSubmitted(true);
    // Firestoreに保存
    try {
      await addDoc(collection(db, "verifications"), {
        placeId: reportTarget.place_id,
        placeName: reportTarget.name,
        hasEatIn: reportData.hasEatIn,
        outlet: reportData.outlet,
        wifi: reportData.wifi,
        seats: reportData.seats ? parseInt(reportData.seats) : null,
        comment: reportData.comment,
        reportCount: myReportCount + 1,
        createdAt: new Date(),
      });
    } catch (e) { console.error("投稿保存エラー:", e); }
    setTimeout(() => { setShowReport(false); setSubmitted(false); setReportStep(1); setReportData({ hasEatIn: null, outlet: false, wifi: false, seats: "", comment: "" }); }, 2200);
  };

  const openReport = (store, e) => { e.stopPropagation(); setReportTarget(store); setShowReport(true); };

  const filtered = stores.filter(s => {
    if (filterEatIn && !s.hasEatIn) return false;
    if (filterOutlet && !s.outlet) return false;
    if (filterWifi && !s.wifi) return false;
    if (filterVerified && (!s.verifications || s.verifications.length === 0)) return false;
    return true;
  });

  const myScore = calcScore(myReportCount, myHelpedCount);
  const myRank = getRank(myScore);
  const nextRank = getNextRank(myScore);

  return (
    <div style={{ fontFamily: "'Noto Sans JP','Hiragino Sans',sans-serif", background: "#f4f5f7", minHeight: "100vh", color: "#1a1a1a" }}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "2px solid #111", padding: "12px 16px", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 8px rgba(0,0,0,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div onClick={() => { setStores([]); setSearchArea(""); setSelected(null); }} style={{ fontWeight: 900, fontSize: "16px", letterSpacing: "-0.5px", cursor: "pointer" }}>
          🏪 <span style={{ color: "#e63946" }}>コンビニ</span>イートインマップ
        </div>
        <button onClick={() => setShowProfile(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: myRank.bg, border: `1.5px solid ${myRank.color}55`, borderRadius: 10, padding: "6px 10px", cursor: "pointer" }}>
          <span style={{ fontSize: "16px" }}>{myRank.icon}</span>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: myRank.color }}>{myRank.label}</div>
            <div style={{ fontSize: "10px", color: "#aaa" }}>{myScore}pt</div>
          </div>
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: "14px 16px", background: "#fff", borderBottom: "1px solid #eee" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={searchArea} onChange={e => setSearchArea(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSearch()} placeholder="駅名・エリアを入力（例：渋谷、新宿）"
            style={{ flex: 1, padding: "10px 14px", border: "1.5px solid #ddd", borderRadius: 10, fontSize: "14px", outline: "none", background: "#fafafa" }} />
          <button onClick={handleSearch} disabled={loading || analyzing} style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: loading || analyzing ? "#ddd" : "#e63946", color: "#fff", fontWeight: 700, fontSize: "14px", cursor: loading || analyzing ? "default" : "pointer", whiteSpace: "nowrap" }}>検索</button>
        </div>
        <button onClick={handleGPS} disabled={gpsLoading || loading || analyzing} style={{ width: "100%", marginTop: 8, padding: "10px", borderRadius: 10, border: "1.5px solid #ddd", background: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", color: "#333", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          {gpsLoading ? <><span>⏳</span> 現在地を取得中…</> : <><span>📡</span> 現在地から探す</>}
        </button>
        {gpsError && <div style={{ marginTop: 6, padding: "7px 12px", background: "#ffeaea", borderRadius: 8, fontSize: "12px", color: "#c0392b" }}>⚠️ {gpsError}</div>}
        {stores.length > 0 && (
          <div style={{ display: "flex", gap: 6, marginTop: 10, overflowX: "auto" }}>
            {[[filterEatIn, setFilterEatIn, "🪑 イートインあり", "#e63946", "#ffeaea"], [filterVerified, setFilterVerified, "✅ ユーザー確認済み", "#b7950b", "#fffbea"], [filterOutlet, setFilterOutlet, "🔌 コンセント", "#0077b6", "#e3f2fd"], [filterWifi, setFilterWifi, "📶 Wi-Fi", "#2d6a4f", "#e8f5e9"]].map(([active, setter, label, ac, ab]) => (
              <button key={label} onClick={() => setter(!active)} style={{ padding: "5px 11px", borderRadius: 20, border: `1.5px solid ${active ? ac : "#ddd"}`, background: active ? ab : "#fff", color: active ? ac : "#888", fontWeight: 700, fontSize: "11px", cursor: "pointer", whiteSpace: "nowrap" }}>{label}</button>
            ))}
          </div>
        )}
      </div>

      {/* Loading */}
      {(loading || analyzing) && (
        <div style={{ padding: "20px 16px" }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: "22px 18px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", textAlign: "center" }}>
            {loading ? (
              <><div style={{ fontSize: "30px", marginBottom: 10 }}>🗺️</div>
                <div style={{ fontWeight: 800, fontSize: "14px" }}>Google マップからコンビニを収集中…</div>
                <div style={{ color: "#aaa", fontSize: "11px", marginTop: 4 }}>📍 半径{(SEARCH_RADIUS_METERS / 1000).toFixed(1)}km以内 · 最大{MAX_RESULTS}件</div></>
            ) : (
              <><div style={{ fontSize: "30px", marginBottom: 10 }}>🤖</div>
                <div style={{ fontWeight: 800, fontSize: "14px" }}>AIが口コミを解析中…</div>
                <div style={{ color: "#aaa", fontSize: "12px", marginTop: 4, marginBottom: 12 }}>{progress.current} / {progress.total} 件完了</div>
                <div style={{ background: "#f0f0f0", borderRadius: 99, height: 8, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 99, background: "#e63946", width: `${(progress.current / progress.total) * 100}%`, transition: "width 0.4s ease" }} />
                </div>
                {stores.length > 0 && (
                  <div style={{ marginTop: 12, textAlign: "left" }}>
                    {stores.slice(-2).map(s => (
                      <div key={s.place_id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderTop: "1px solid #f5f5f5", fontSize: "12px" }}>
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: getChainColor(s.name), flexShrink: 0 }} />
                        <span style={{ flex: 1, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
                        <span style={{ color: s.hasEatIn ? "#2d6a4f" : "#ccc", fontWeight: 700 }}>{s.hasEatIn ? "🪑 あり" : "✗ なし"}</span>
                      </div>
                    ))}
                  </div>
                )}</>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {!loading && stores.length > 0 && (
        <div style={{ padding: "12px 16px" }}>
          <div style={{ fontSize: "12px", color: "#888", marginBottom: 10 }}>{filtered.length}件表示{(filterEatIn || filterOutlet || filterWifi || filterVerified) ? " （フィルター適用中）" : ""}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(store => {
              const isVerified = store.verifications && store.verifications.length > 0;
              const isOpen = selected?.place_id === store.place_id;
              return (
                <div key={store.place_id} onClick={() => setSelected(isOpen ? null : store)} style={{ background: "#fff", borderRadius: 12, overflow: "hidden", border: `1.5px solid ${isOpen ? "#e63946" : isVerified ? "#f4d03f" : "#eee"}`, boxShadow: isOpen ? "0 4px 16px rgba(230,57,70,0.10)" : isVerified ? "0 2px 10px rgba(244,208,63,0.15)" : "0 1px 4px rgba(0,0,0,0.04)", cursor: "pointer", transition: "all 0.2s" }}>
                  <div style={{ padding: "13px 14px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: getChainColor(store.name), flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: "13px", lineHeight: 1.4 }}>{store.name}</div>
                        <div style={{ fontSize: "11px", color: "#999", marginTop: 2 }}>📍 {store.address}</div>
                        {searchCenter && (() => {
                          const dist = calcDistance(searchCenter.lat, searchCenter.lng, store.lat, store.lng);
                          const label = dist < 1000 ? `${Math.round(dist)}m` : `${(dist/1000).toFixed(1)}km`;
                          return <div style={{ fontSize: "11px", color: "#0077b6", marginTop: 1 }}>🚶 {label}</div>;
                        })()}
                      </div>
                      <div style={{ padding: "4px 10px", borderRadius: 20, flexShrink: 0, background: store.hasEatIn ? "#e8f5e9" : "#f5f5f5", border: `1px solid ${store.hasEatIn ? "#a5d6a7" : "#eee"}`, color: store.hasEatIn ? "#2d6a4f" : "#ccc", fontSize: "12px", fontWeight: 700 }}>
                        {store.hasEatIn ? "🪑 あり" : "✗ なし"}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 5, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                      {store.hasEatIn && store.seats && <span style={{ fontSize: "11px", background: "#f0f0f0", borderRadius: 20, padding: "2px 8px", color: "#555" }}>🪑 {store.seats}席</span>}
                      {store.outlet && <span style={{ fontSize: "11px", background: "#e3f2fd", borderRadius: 20, padding: "2px 8px", color: "#0077b6" }}>🔌 コンセント</span>}
                      {store.wifi && <span style={{ fontSize: "11px", background: "#e8f5e9", borderRadius: 20, padding: "2px 8px", color: "#2d6a4f" }}>📶 Wi-Fi</span>}
                    </div>
                    {store.hasEatIn && (() => {
                      const cg = store.congestion ? CONGESTION.find(c => c.id === store.congestion) : null;
                      return (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 7 }}>
                          {cg ? <span style={{ fontSize: "11px", background: cg.bg, color: cg.color, borderRadius: 20, padding: "2px 9px", fontWeight: 700 }}>{cg.icon} {cg.label}</span> : <span style={{ fontSize: "11px", color: "#ccc" }}>混雑情報なし</span>}
                          <button onClick={e => { e.stopPropagation(); setShowCongestion(store.place_id); }} style={{ fontSize: "11px", color: "#0077b6", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 700 }}>更新する</button>
                          {congestionSubmitted === store.place_id && <span style={{ fontSize: "11px", color: "#2d6a4f", fontWeight: 700 }}>✓ 投稿しました！</span>}
                        </div>
                      );
                    })()}
                    <div style={{ marginTop: 7 }}>
                      {isVerified ? <VerifiedBadge verifications={store.verifications} /> : <span style={{ fontSize: "10px", color: CONF_COLOR[store.confidence] }}>🤖 AI判定 · {CONF_LABEL[store.confidence]}</span>}
                    </div>
                  </div>
                  {isOpen && (
                    <div style={{ borderTop: `1px solid ${isVerified ? "#fdebd0" : "#f0f0f0"}`, background: "#fafafa", padding: "12px 14px" }}>
                      <a href={`https://maps.google.com/?q=${encodeURIComponent(store.name + " " + store.address)}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                        style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1.5px solid #e0e0e0", borderRadius: 10, padding: "9px 12px", textDecoration: "none", marginBottom: 10 }}>
                        <span style={{ fontSize: "18px" }}>📍</span>
                        <div>
                          <div style={{ fontSize: "12px", color: "#333", fontWeight: 600 }}>{store.address}</div>
                          <div style={{ fontSize: "11px", color: "#0077b6", marginTop: 1 }}>タップしてマップで開く →</div>
                        </div>
                      </a>
                      <button onClick={e => handleHelped(store, e)} disabled={store.helpedByMe} style={{ width: "100%", padding: "10px", borderRadius: 10, border: `1.5px solid ${store.helpedByMe ? "#eee" : "#f4a261"}`, background: store.helpedByMe ? "#fafafa" : "#fff7f0", color: store.helpedByMe ? "#ccc" : "#e67e00", fontSize: "13px", fontWeight: 700, cursor: store.helpedByMe ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 10 }}>
                        {store.helpedByMe ? "👍 助かった！を送りました" : `👍 助かった！  ${store.helpedCount > 0 ? store.helpedCount + "人が役に立ったと言っています" : "最初に押してみよう"}`}
                      </button>
                      {isVerified && (
                        <div style={{ background: "#fffbea", border: "1.5px solid #f4d03f44", borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>
                          <div style={{ fontSize: "11px", color: "#b7950b", fontWeight: 700, marginBottom: 8 }}>✅ ユーザー確認情報</div>
                          {store.verifications.map((v, i) => (
                            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 0", borderTop: i > 0 ? "1px solid #fdebd0" : "none" }}>
                              <RankBadge count={v.reportCount || 0} />
                              <div style={{ flex: 1, fontSize: "12px", color: "#555" }}>{v.comment || "確認済み"}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ background: "#fff", border: "1.5px solid #f0f0f0", borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>
                        <div style={{ fontSize: "11px", color: "#aaa", fontWeight: 700, marginBottom: 6 }}>🤖 AI判定根拠（Google口コミより）</div>
                        {store.reviews.map((r, i) => (
                          <div key={i} style={{ fontSize: "12px", color: "#555", padding: "4px 0", borderTop: i > 0 ? "1px solid #f5f5f5" : "none" }}>「{r}」</div>
                        ))}
                        <div style={{ fontSize: "11px", color: CONF_COLOR[store.confidence], marginTop: 8, fontWeight: 700 }}>→ {store.reason}（{CONF_LABEL[store.confidence]}）</div>
                      </div>
                      <button onClick={e => openReport(store, e)} style={{ width: "100%", padding: "10px", borderRadius: 10, border: "none", background: "#111", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        ✅ 実際に確認した！投稿して確認済みにする
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !analyzing && stores.length === 0 && (
        <div style={{ textAlign: "center", padding: "50px 24px" }}>
          <div style={{ fontSize: "44px", marginBottom: 12 }}>🔍</div>
          <div style={{ fontWeight: 800, fontSize: "15px", color: "#777" }}>エリアを入力して検索</div>
          <div style={{ fontSize: "12px", marginTop: 8, lineHeight: 1.8, color: "#aaa" }}>Google マップからコンビニを自動収集し<br />AIが口コミを解析してイートインを判定します</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 20, flexWrap: "wrap" }}>
            {["🗺️ Places API", "→", "🤖 AI解析", "→", "✅ ユーザー確認"].map((s, i) => (
              <span key={i} style={{ fontSize: "11px", color: s === "→" ? "#ccc" : "#fff", background: s === "→" ? "transparent" : "#444", padding: s === "→" ? "0 2px" : "4px 10px", borderRadius: 20, fontWeight: s === "→" ? 400 : 600 }}>{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfile && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "flex-end" }} onClick={e => e.target === e.currentTarget && setShowProfile(false)}>
          <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", width: "100%", padding: "28px 20px 40px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div style={{ fontWeight: 900, fontSize: "17px" }}>あなたのランク</div>
              <button onClick={() => setShowProfile(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#aaa" }}>✕</button>
            </div>
            <div style={{ background: myRank.bg, borderRadius: 16, padding: "20px", textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: "48px" }}>{myRank.icon}</div>
              <div style={{ fontWeight: 900, fontSize: "22px", color: myRank.color, marginTop: 6 }}>{myRank.label}</div>
              <div style={{ fontSize: "13px", color: "#888", marginTop: 4 }}>投稿数：{myReportCount}件　👍 {myHelpedCount}件</div>
              <div style={{ fontSize: "11px", color: "#aaa", marginTop: 2 }}>スコア：{myScore}pt（投稿1pt + 助かった0.5pt）</div>
            </div>
            {nextRank && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#888", marginBottom: 6 }}>
                  <span>次のランク：{nextRank.icon} {nextRank.label}</span>
                  <span>あと{nextRank.min - myScore}pt</span>
                </div>
                <div style={{ background: "#f0f0f0", borderRadius: 99, height: 10, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 99, background: `linear-gradient(90deg, ${myRank.color}, ${nextRank.color})`, width: `${((myScore - myRank.min) / (nextRank.min - myRank.min)) * 100}%`, transition: "width 0.5s ease" }} />
                </div>
              </div>
            )}
            <div style={{ fontSize: "12px", color: "#888", marginBottom: 10, fontWeight: 700 }}>ランク一覧</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {RANKS.map(r => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: r.id === myRank.id ? r.bg : "#fafafa", border: `1.5px solid ${r.id === myRank.id ? r.color + "55" : "#eee"}`, borderRadius: 10 }}>
                  <span style={{ fontSize: "20px" }}>{r.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: "13px", color: r.color }}>{r.label}</div>
                    <div style={{ fontSize: "11px", color: "#aaa" }}>{r.min}pt〜{r.max < 999 ? r.max + "pt" : ""}</div>
                  </div>
                  <div style={{ fontSize: "11px", color: "#aaa" }}>信頼度 {"⭐".repeat(r.trust)}</div>
                  {r.id === myRank.id && <span style={{ fontSize: "11px", fontWeight: 700, color: r.color }}>← 現在</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Congestion Modal */}
      {showCongestion && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "flex-end" }} onClick={e => e.target === e.currentTarget && setShowCongestion(null)}>
          <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", width: "100%", padding: "24px 20px 40px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontWeight: 900, fontSize: "16px" }}>🟡 今の混雑状況を教えて</div>
              <button onClick={() => setShowCongestion(null)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#aaa" }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {CONGESTION.map(cg => {
                const store = stores.find(s => s.place_id === showCongestion);
                return (
                  <button key={cg.id} onClick={e => handleCongestion(store, cg.id, e)} style={{ padding: "16px", borderRadius: 14, border: `2px solid ${cg.color}44`, background: cg.bg, color: cg.color, fontWeight: 700, fontSize: "16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: "24px" }}>{cg.icon}</span>{cg.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReport && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "flex-end" }} onClick={e => e.target === e.currentTarget && setShowReport(false)}>
          <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", width: "100%", padding: "24px 20px 40px", maxHeight: "80vh", overflowY: "auto" }}>
            {submitted ? (
              <div style={{ textAlign: "center", padding: "28px 0" }}>
                <div style={{ fontSize: "52px" }}>🎉</div>
                <div style={{ fontWeight: 900, fontSize: "18px", marginTop: 10 }}>確認済み登録完了！</div>
                <div style={{ color: "#888", fontSize: "13px", marginTop: 4 }}>投稿数：{myReportCount + 1}件　スコア：{calcScore(myReportCount + 1, myHelpedCount)}pt</div>
                {getRank(calcScore(myReportCount + 1, myHelpedCount)).id !== myRank.id && (
                  <div style={{ marginTop: 12, background: getRank(calcScore(myReportCount + 1, myHelpedCount)).bg, borderRadius: 12, padding: "12px", display: "inline-block" }}>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: getRank(calcScore(myReportCount + 1, myHelpedCount)).color }}>
                      {getRank(calcScore(myReportCount + 1, myHelpedCount)).icon} ランクアップ！{getRank(calcScore(myReportCount + 1, myHelpedCount)).label}になりました
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontWeight: 900, fontSize: "16px" }}>{reportStep === 1 ? "✅ 実際に確認した情報を登録" : "✏️ コメント（任意）"}</div>
                  <button onClick={() => setShowReport(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#aaa" }}>✕</button>
                </div>
                {reportTarget && <div style={{ fontSize: "12px", color: "#888", marginBottom: 14 }}>📍 {reportTarget.name}</div>}
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: myRank.bg, borderRadius: 10, padding: "8px 12px", marginBottom: 16 }}>
                  <span style={{ fontSize: "18px" }}>{myRank.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: myRank.color }}>{myRank.label}として投稿</div>
                    <div style={{ fontSize: "11px", color: "#aaa" }}>信頼度 {"⭐".repeat(myRank.trust)} · {myScore}pt</div>
                  </div>
                  {nextRank && <div style={{ fontSize: "11px", color: "#aaa" }}>次まであと{nextRank.min - myScore - 1}pt</div>}
                </div>
                <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
                  {[1, 2].map(s => <div key={s} style={{ height: 4, flex: 1, borderRadius: 2, background: s <= reportStep ? "#e63946" : "#eee" }} />)}
                </div>
                {reportStep === 1 && (
                  <div>
                    <div style={{ fontSize: "13px", color: "#888", marginBottom: 12 }}>実際にイートインはありましたか？</div>
                    <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                      {[true, false].map(v => (
                        <button key={String(v)} onClick={() => setReportData({ ...reportData, hasEatIn: v })} style={{ flex: 1, padding: "14px", borderRadius: 12, border: `2px solid ${reportData.hasEatIn === v ? (v ? "#2d6a4f" : "#e63946") : "#eee"}`, background: reportData.hasEatIn === v ? (v ? "#e8f5e9" : "#ffeaea") : "#fff", fontWeight: 700, fontSize: "15px", cursor: "pointer", color: reportData.hasEatIn === v ? (v ? "#2d6a4f" : "#e63946") : "#888" }}>{v ? "🪑 あった" : "✗ なかった"}</button>
                      ))}
                    </div>
                    {reportData.hasEatIn && (
                      <>
                        <input value={reportData.seats} onChange={e => setReportData({ ...reportData, seats: e.target.value })} placeholder="席数（例：10）" type="number" style={{ width: "100%", boxSizing: "border-box", padding: "11px", borderRadius: 10, border: "1.5px solid #ddd", fontSize: "14px", outline: "none", marginBottom: 12 }} />
                        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                          {[["outlet", "🔌 コンセント"], ["wifi", "📶 Wi-Fi"]].map(([key, label]) => (
                            <button key={key} onClick={() => setReportData({ ...reportData, [key]: !reportData[key] })} style={{ flex: 1, padding: "11px", borderRadius: 12, border: `2px solid ${reportData[key] ? "#0077b6" : "#eee"}`, background: reportData[key] ? "#e3f2fd" : "#fff", fontWeight: 700, fontSize: "13px", cursor: "pointer", color: reportData[key] ? "#0077b6" : "#888" }}>{label}</button>
                          ))}
                        </div>
                      </>
                    )}
                    <button disabled={reportData.hasEatIn === null} onClick={() => setReportStep(2)} style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", background: reportData.hasEatIn !== null ? "#111" : "#eee", color: reportData.hasEatIn !== null ? "#fff" : "#aaa", fontWeight: 700, fontSize: "14px", cursor: reportData.hasEatIn !== null ? "pointer" : "default" }}>次へ →</button>
                  </div>
                )}
                {reportStep === 2 && (
                  <div>
                    <textarea value={reportData.comment} onChange={e => setReportData({ ...reportData, comment: e.target.value })} placeholder="例：2階に8席あり。窓際にコンセントあり" rows={4} style={{ width: "100%", boxSizing: "border-box", padding: "12px", borderRadius: 10, border: "1.5px solid #ddd", fontSize: "14px", outline: "none", resize: "none", marginBottom: 16, fontFamily: "inherit" }} />
                    <div style={{ display: "flex", gap: 10 }}>
                      <button onClick={() => setReportStep(1)} style={{ padding: "13px 18px", borderRadius: 12, border: "1.5px solid #ddd", background: "#fff", fontWeight: 700, fontSize: "13px", cursor: "pointer", color: "#888" }}>← 戻る</button>
                      <button onClick={handleSubmitReport} style={{ flex: 1, padding: "13px", borderRadius: 12, border: "none", background: "#e63946", color: "#fff", fontWeight: 700, fontSize: "14px", cursor: "pointer" }}>✅ 確認済みとして投稿</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
