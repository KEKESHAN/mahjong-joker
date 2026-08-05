// ========== MAHJONG JOKER - 游戏核心逻辑 ==========
// 麻将小丑牌 - 核心规则引擎
// 以麻将牌为表现形式，Balatro（小丑牌）为玩法框架

(function() {
  // ========== 牌库定义 ==========
  const SUITS = {
    wan:  { name: '万',  icon: '万', color: 'wan'  },
    tiao: { name: '条',  icon: '条', color: 'tiao' },
    tong: { name: '筒',  icon: '筒', color: 'tong' },
    feng: { name: '风',  icon: '风', color: 'feng' },
    jian: { name: '箭',  icon: '箭', color: 'jian' },
  };

  // 数值牌 1-9, 字牌用特殊值
  const NUMBER_TILES = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const FENG_TILES = ['东', '南', '西', '北']; // 东南西北风
  const JIAN_TILES = ['中', '发', '白']; // 中发白

  // 生成牌池（每种牌4张，标准麻将136张，这里简化用全牌库）
  function generateDeck() {
    const deck = [];
    let id = 0;
    // 万条筒 1-9 各4张
    ['wan', 'tiao', 'tong'].forEach(suit => {
      NUMBER_TILES.forEach(value => {
        for (let i = 0; i < 4; i++) {
          deck.push({
            id: `tile_${id++}`,
            suit,
            value,
            display: value + SUITS[suit].icon,
            rank: value, // 用于排序
          });
        }
      });
    });
    // 风牌 各4张
    FENG_TILES.forEach((name, idx) => {
      for (let i = 0; i < 4; i++) {
        deck.push({
          id: `tile_${id++}`,
          suit: 'feng',
          value: name,
          display: name,
          rank: 100 + idx,
        });
      }
    });
    // 箭牌 各4张
    JIAN_TILES.forEach((name, idx) => {
      for (let i = 0; i < 4; i++) {
        deck.push({
          id: `tile_${id++}`,
          suit: 'jian',
          value: name,
          display: name,
          rank: 200 + idx,
        });
      }
    });
    return deck;
  }

  // 洗牌
  function shuffleDeck(deck) {
    const arr = [...deck];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ========== 牌型判定 ==========
  // 返回 { type, name, baseScore, multiplier, tilesUsed }
  // 按 5 张组合判定麻将牌型（类似扑克的升级版本）

  // 辅助：获取牌的数值（数字牌返回数字，字牌返回null表示特殊）
  function getNumericValue(tile) {
    if (['wan', 'tiao', 'tong'].includes(tile.suit)) {
      return tile.value;
    }
    return null;
  }

  // 辅助：计算牌型key（用于分组统计）
  function tileKey(tile) {
    return `${tile.suit}:${tile.value}`;
  }

  // 判定牌型 - 输入5张已选牌
  function evaluateHand(tiles) {
    if (!tiles || tiles.length === 0) {
      return { type: 'none', name: '未选择', baseScore: 0, multiplier: 0 };
    }
    if (tiles.length < 2) {
      return { type: 'single', name: '散牌', baseScore: 5, multiplier: 1, tilesUsed: tiles.length };
    }

    const n = tiles.length;

    // === 按"点数"统计（对子/三条/四条只看数字，不管花色）===
    // 数字牌：value 1-9 作为点数
    // 字牌：value 本身（如 '东','中'）作为点数，仅与同名字牌配对
    const rankCount = {}; // 点数 -> 数量
    tiles.forEach(t => {
      const v = getNumericValue(t);
      const key = v !== null ? `n_${v}` : `h_${t.suit}_${t.value}`;
      rankCount[key] = (rankCount[key] || 0) + 1;
    });
    const counts = Object.values(rankCount).sort((a, b) => b - a);

    // 数字牌列表（用于顺子 / 同花判断）
    const numTiles = tiles.filter(t => getNumericValue(t) !== null);
    const uniqueValues = [...new Set(numTiles.map(t => t.value))].sort((a, b) => a - b);

    // 顺子检测（只看数字点数，不管花色；需要 5 张不同且连续的数字）
    let isStraight = false;
    let straightLen = 0;
    if (uniqueValues.length >= 5) {
      for (let i = 0; i <= uniqueValues.length - 5; i++) {
        if (uniqueValues[i + 4] - uniqueValues[i] === 4) {
          isStraight = true;
          straightLen = 5;
          break;
        }
      }
    }

    // 同花检测（所有牌都是同花色数字牌）
    let isFlush = false;
    let flushSuit = null;
    if (numTiles.length === n && n >= 5) {
      const suit = numTiles[0].suit;
      if (numTiles.every(t => t.suit === suit)) {
        isFlush = true;
        flushSuit = suit;
      }
    }

    // 字一色检测（全是字牌）
    const allHonor = tiles.every(t => t.suit === 'feng' || t.suit === 'jian');

    // === 牌型判定，优先级从高到低 ===
    // 仅当牌数足够时才判定对应牌型

    // --- 5 张牌型 ---
    if (n >= 5) {
      // 同花顺（清龙）
      if (isStraight && isFlush) {
        return { type: 'qing-long', name: '清龙', baseScore: 100, multiplier: 8, tilesUsed: 5 };
      }
      // 四条 / 字牌四杠
      if (counts[0] >= 4) {
        if (allHonor) {
          return { type: 'si-gang-honor', name: '字牌四杠', baseScore: 200, multiplier: 20, tilesUsed: 5 };
        }
        return { type: 'si-gang', name: '四杠', baseScore: 120, multiplier: 7, tilesUsed: 5 };
      }
      // 字一色（全字牌，倍率极高）
      if (allHonor) {
        // 字牌葫芦 / 字牌四杠（同花色概念中字牌算一类，优先级在葫芦之上）
        if (counts[0] >= 3 && counts[1] >= 2) {
          return { type: 'zi-yi-se-hulu', name: '字一色葫芦', baseScore: 150, multiplier: 15, tilesUsed: 5 };
        }
        return { type: 'zi-yi-se', name: '字一色', baseScore: 100, multiplier: 10, tilesUsed: 5 };
      }
      // 清一色 / 同花（优先级高于葫芦，参考 Balatro 同花 > 葫芦）
      if (isFlush) {
        return { type: 'qing-yi-se', name: '清一色', baseScore: 70, multiplier: 5, tilesUsed: 5 };
      }
      // 葫芦（3+2）
      if (counts[0] >= 3 && counts[1] >= 2) {
        return { type: 'hu-lu', name: '葫芦', baseScore: 60, multiplier: 4, tilesUsed: 5 };
      }
      // 顺子
      if (isStraight) {
        return { type: 'shun-zi', name: '顺子', baseScore: 30, multiplier: 4, tilesUsed: 5 };
      }
    }

    // --- 3+ 张牌型 ---
    if (n >= 3) {
      // 三条
      if (counts[0] >= 3) {
        return { type: 'san-ke', name: '三刻', baseScore: 30, multiplier: 3, tilesUsed: 5 };
      }
    }

    // --- 2+ 张牌型 ---
    if (n >= 4) {
      // 两对
      if (counts[0] >= 2 && counts[1] >= 2) {
        return { type: 'liang-dui', name: '两对', baseScore: 20, multiplier: 2, tilesUsed: 5 };
      }
    }

    if (counts[0] >= 2) {
      return { type: 'yi-dui', name: '一对', baseScore: 10, multiplier: 2, tilesUsed: Math.max(n, 2) };
    }

    // 散牌（高牌）
    return { type: 'san-pai', name: '散牌', baseScore: 5, multiplier: 1, tilesUsed: n };
  }

  // ========== 小丑牌定义 ==========
  // 每张小丑牌有独特效果，影响计分
  const JOKER_CARDS = [
    // ========== 普通（16种） ==========
    {
      id: 'joker_pairs_plus',
      name: '对子大师',
      emoji: '🀄',
      desc: '对子牌型 ×2 倍率',
      rarity: 'common',
      price: 4,
      effect: { type: 'multiply_hand', condition: 'pair', value: 2 },
    },
    {
      id: 'joker_triple_king',
      name: '三刻之王',
      emoji: '👑',
      desc: '三刻及以上 +5 倍率',
      rarity: 'common',
      price: 5,
      effect: { type: 'add_mult', condition: 'triple_or_better', value: 5 },
    },
    {
      id: 'joker_flower',
      name: '花牌',
      emoji: '🌸',
      desc: '每打出一张 +4 分',
      rarity: 'common',
      price: 3,
      effect: { type: 'add_score_per_tile', value: 4 },
    },
    {
      id: 'joker_lucky',
      name: '幸运牌',
      emoji: '🍀',
      desc: '基础分 +10',
      rarity: 'common',
      price: 4,
      effect: { type: 'add_base', value: 10 },
    },
    {
      id: 'joker_wan_suit',
      name: '万子专家',
      emoji: '万',
      desc: '含万字牌 +3 倍率',
      rarity: 'common',
      price: 4,
      effect: { type: 'add_mult_suit', suit: 'wan', value: 3 },
    },
    {
      id: 'joker_tong_suit',
      name: '筒子专家',
      emoji: '筒',
      desc: '含筒子牌 +3 倍率',
      rarity: 'common',
      price: 4,
      effect: { type: 'add_mult_suit', suit: 'tong', value: 3 },
    },
    {
      id: 'joker_feng_suit',
      name: '风牌达人',
      emoji: '风',
      desc: '含风牌 +4 倍率',
      rarity: 'common',
      price: 5,
      effect: { type: 'add_mult_suit', suit: 'feng', value: 4 },
    },
    {
      id: 'joker_double',
      name: '翻倍小牌',
      emoji: '✌️',
      desc: '打出2张牌时 ×2 倍率',
      rarity: 'common',
      price: 3,
      effect: { type: 'hand_size_mult', size: 2, value: 2 },
    },
    {
      id: 'joker_first_hand',
      name: '开门红',
      emoji: '🚩',
      desc: '每关首次出牌 ×2 倍率',
      rarity: 'common',
      price: 5,
      effect: { type: 'first_hand_mult', value: 2 },
    },
    {
      id: 'joker_discard_bonus',
      name: '弃牌礼',
      emoji: '🎁',
      desc: '每弃一张牌 +8 分',
      rarity: 'common',
      price: 4,
      effect: { type: 'add_base_per_discard', value: 8 },
    },
    {
      id: 'joker_low_value',
      name: '小三传奇',
      emoji: '🔻',
      desc: '含 1-3 点的牌 +2 倍率/张',
      rarity: 'common',
      price: 4,
      effect: { type: 'add_mult_per_low_tile', maxValue: 3, value: 2 },
    },
    {
      id: 'joker_late_game',
      name: '厚积薄发',
      emoji: '⏱️',
      desc: '每关最后一手 +6 倍率',
      rarity: 'common',
      price: 5,
      effect: { type: 'last_hand_mult', value: 6 },
    },
    {
      id: 'joker_odd',
      name: '奇数狂潮',
      emoji: '1️⃣',
      desc: '全是奇数牌 +5 倍率',
      rarity: 'common',
      price: 5,
      effect: { type: 'all_odd_bonus', value: 5 },
    },
    {
      id: 'joker_even',
      name: '偶数派对',
      emoji: '2️⃣',
      desc: '全是偶数牌 +5 倍率',
      rarity: 'common',
      price: 5,
      effect: { type: 'all_even_bonus', value: 5 },
    },
    {
      id: 'joker_economist',
      name: '经济学家',
      emoji: '💵',
      desc: '商店结束时 +$3',
      rarity: 'common',
      price: 6,
      effect: { type: 'shop_end_money', value: 3 },
    },
    {
      id: 'joker_cheapskate',
      name: '吝啬鬼',
      emoji: '🦝',
      desc: '商店价格 -$1（最低 $1）',
      rarity: 'common',
      price: 6,
      effect: { type: 'shop_discount', value: 1 },
    },

    // ========== 精良（18种） ==========
    {
      id: 'joker_straight',
      name: '顺子专家',
      emoji: '📏',
      desc: '顺子牌型 ×3 倍率',
      rarity: 'uncommon',
      price: 7,
      effect: { type: 'multiply_hand', condition: 'straight', value: 3 },
    },
    {
      id: 'joker_greed',
      name: '贪婪小丑',
      emoji: '💰',
      desc: '总倍率 ×1.5',
      rarity: 'uncommon',
      price: 8,
      effect: { type: 'multiply_total', value: 1.5 },
    },
    {
      id: 'joker_bamboo',
      name: '条子专家',
      emoji: '条',
      desc: '含条子牌 +5 倍率',
      rarity: 'uncommon',
      price: 6,
      effect: { type: 'add_mult_suit', suit: 'tiao', value: 5 },
    },
    {
      id: 'joker_dragon',
      name: '龙牌',
      emoji: '🐉',
      desc: '清一色牌型 ×2 倍率',
      rarity: 'uncommon',
      price: 8,
      effect: { type: 'multiply_hand', condition: 'flush', value: 2 },
    },
    {
      id: 'joker_combo',
      name: '连击',
      emoji: '⚡',
      desc: '连续出相同牌型 +2 倍率',
      rarity: 'uncommon',
      price: 7,
      effect: { type: 'combo_bonus', value: 2 },
    },
    {
      id: 'joker_hu_lu',
      name: '葫芦收藏家',
      emoji: '🫙',
      desc: '葫芦牌型 ×2.5 倍率',
      rarity: 'uncommon',
      price: 8,
      effect: { type: 'multiply_hand', condition: 'full_house', value: 2.5 },
    },
    {
      id: 'joker_five_tiles',
      name: '满手都是牌',
      emoji: '✋',
      desc: '打出5张牌时 ×1.5 倍率',
      rarity: 'uncommon',
      price: 7,
      effect: { type: 'hand_size_mult', size: 5, value: 1.5 },
    },
    {
      id: 'joker_green_fa',
      name: '发财',
      emoji: '发',
      desc: '每含一张发财 +12 倍率',
      rarity: 'uncommon',
      price: 7,
      effect: { type: 'add_mult_per_tile', tile: { suit: 'jian', value: '发' }, value: 12 },
    },
    {
      id: 'joker_white_dragon',
      name: '白板',
      emoji: '白',
      desc: '每含一张白板 +8 倍率',
      rarity: 'uncommon',
      price: 6,
      effect: { type: 'add_mult_per_tile', tile: { suit: 'jian', value: '白' }, value: 8 },
    },
    {
      id: 'joker_all_nines',
      name: '九莲宝灯',
      emoji: '9️⃣',
      desc: '含数字9的牌 +6 倍率/张',
      rarity: 'uncommon',
      price: 8,
      effect: { type: 'add_mult_per_value_tile', tileValue: 9, value: 6 },
    },
    {
      id: 'joker_ones',
      name: '幺鸡万岁',
      emoji: '①',
      desc: '含数字1的牌 +5 倍率/张',
      rarity: 'uncommon',
      price: 7,
      effect: { type: 'add_mult_per_value_tile', tileValue: 1, value: 5 },
    },
    {
      id: 'joker_same_value',
      name: '同心协力',
      emoji: '🔗',
      desc: '全是相同数字 +7 倍率',
      rarity: 'uncommon',
      price: 8,
      effect: { type: 'all_same_value_bonus', value: 7 },
    },
    {
      id: 'joker_ascending',
      name: '步步高升',
      emoji: '📈',
      desc: '基础分按回合数 × 1.2 倍',
      rarity: 'uncommon',
      price: 9,
      effect: { type: 'ante_scale_base', value: 1.2 },
    },
    {
      id: 'joker_iron_will',
      name: '钢铁意志',
      emoji: '🛡️',
      desc: '血量为 1 时 ×2 倍率',
      rarity: 'uncommon',
      price: 8,
      effect: { type: 'low_hp_mult', value: 2 },
    },
    {
      id: 'joker_hands_up',
      name: '快手',
      emoji: '🙌',
      desc: '每关 +1 次出牌机会',
      rarity: 'uncommon',
      price: 10,
      effect: { type: 'extra_hands', value: 1 },
    },
    {
      id: 'joker_extra_discard',
      name: '多摸两张',
      emoji: '🎴',
      desc: '每关 +1 次弃牌次数',
      rarity: 'uncommon',
      price: 9,
      effect: { type: 'extra_discards', value: 1 },
    },
    {
      id: 'joker_interest',
      name: '利滚利',
      emoji: '🪙',
      desc: '商店结束时 + 钱数的 25%（向下取整）',
      rarity: 'uncommon',
      price: 10,
      effect: { type: 'shop_end_interest', value: 0.25 },
    },
    {
      id: 'joker_reroll_free',
      name: '免费刷新',
      emoji: '🔄',
      desc: '商店每次首刷免费',
      rarity: 'uncommon',
      price: 8,
      effect: { type: 'free_reroll', value: 1 },
    },

    // ========== 稀有（12种） ==========
    {
      id: 'joker_quad_lover',
      name: '四杠狂热',
      emoji: '💎',
      desc: '四杠牌型 ×3 倍率',
      rarity: 'rare',
      price: 12,
      effect: { type: 'multiply_hand', condition: 'four_kind', value: 3 },
    },
    {
      id: 'joker_red_dragon',
      name: '红中',
      emoji: '中',
      desc: '每含一张中 +10 倍率',
      rarity: 'rare',
      price: 10,
      effect: { type: 'add_mult_per_tile', tile: { suit: 'jian', value: '中' }, value: 10 },
    },
    {
      id: 'joker_rainbow',
      name: '彩虹',
      emoji: '🌈',
      desc: '5张全不同花色 +8 倍率',
      rarity: 'rare',
      price: 10,
      effect: { type: 'rainbow_bonus', value: 8 },
    },
    {
      id: 'joker_house',
      name: '庄家',
      emoji: '🏠',
      desc: '总倍率 ×2，但每次 -2 弃牌',
      rarity: 'rare',
      price: 12,
      effect: { type: 'high_risk', multValue: 2, discardPenalty: 2 },
    },
    {
      id: 'joker_qing_long',
      name: '青龙偃月',
      emoji: '🐲',
      desc: '清龙（清一色顺子） ×4 倍率',
      rarity: 'rare',
      price: 14,
      effect: { type: 'multiply_hand', condition: 'qing_long', value: 4 },
    },
    {
      id: 'joker_pure_triple',
      name: '纯三刻',
      emoji: '🧲',
      desc: '三刻牌型的基础分 ×3',
      rarity: 'rare',
      price: 12,
      effect: { type: 'multiply_base_hand', condition: 'triple', value: 3 },
    },
    {
      id: 'joker_jian_lover',
      name: '箭牌大师',
      emoji: '🀄',
      desc: '含箭牌（中发白） +8 倍率/种',
      rarity: 'rare',
      price: 12,
      effect: { type: 'jian_type_bonus', value: 8 },
    },
    {
      id: 'joker_feng_lover',
      name: '四风齐聚',
      emoji: '🌪️',
      desc: '4 种风牌齐出 +10 倍率',
      rarity: 'rare',
      price: 13,
      effect: { type: 'all_four_winds_bonus', value: 10 },
    },
    {
      id: 'joker_chance',
      name: '赌徒',
      emoji: '🎲',
      desc: '50% 概率 ×4 倍率，否则 ×0.5',
      rarity: 'rare',
      price: 11,
      effect: { type: 'gamble_mult', winValue: 4, loseValue: 0.5 },
    },
    {
      id: 'joker_sell_back',
      name: '二手市场',
      emoji: '🏪',
      desc: '出售小丑多获得 50% 金钱',
      rarity: 'rare',
      price: 9,
      effect: { type: 'sell_bonus', value: 0.5 },
    },
    {
      id: 'joker_blue_moon',
      name: '蓝月亮',
      emoji: '🌕',
      desc: '没有对子时基础分 ×2',
      rarity: 'rare',
      price: 11,
      effect: { type: 'no_pair_base_mult', value: 2 },
    },
    {
      id: 'joker_flat_bonus',
      name: '保底达人',
      emoji: '🛟',
      desc: '每次出牌至少得 100 分',
      rarity: 'rare',
      price: 10,
      effect: { type: 'min_score', value: 100 },
    },

    // ========== 传说（6种） ==========
    {
      id: 'joker_mahjong_god',
      name: '麻将之神',
      emoji: '🀅',
      desc: '总倍率 ×3',
      rarity: 'legendary',
      price: 20,
      effect: { type: 'multiply_total', value: 3 },
    },
    {
      id: 'joker_zi_yi_se',
      name: '字圣',
      emoji: '✨',
      desc: '字一色 ×4 倍率',
      rarity: 'legendary',
      price: 18,
      effect: { type: 'multiply_hand', condition: 'all_honor', value: 4 },
    },
    {
      id: 'joker_golden',
      name: '黄金小丑',
      emoji: '🌟',
      desc: '每有一个小丑 +2 倍率',
      rarity: 'legendary',
      price: 16,
      effect: { type: 'joker_count_bonus', value: 2 },
    },
    {
      id: 'joker_philosopher',
      name: '哲学家',
      emoji: '🦉',
      desc: '打出单张牌时 ×10 倍率',
      rarity: 'legendary',
      price: 18,
      effect: { type: 'hand_size_mult', size: 1, value: 10 },
    },
    {
      id: 'joker_apotheosis',
      name: '封神',
      emoji: '💫',
      desc: '四杠以上牌型基础分 ×5',
      rarity: 'legendary',
      price: 22,
      effect: { type: 'multiply_base_hand', condition: 'four_kind', value: 5 },
    },
    {
      id: 'joker_tycoon',
      name: '商业大亨',
      emoji: '💼',
      desc: '商店结束时 + 钱数的 50%',
      rarity: 'legendary',
      price: 20,
      effect: { type: 'shop_end_interest', value: 0.5 },
    },
  ];

  // ========== 盲注/关卡系统 ==========
  // 10 大回合，每回合 3 小关（小盲 / 大盲 / Boss），最终目标 300,000
  const BLINDS = [
    // 回合一
    { id: 's1', ante: 1, name: '小盲 1-1', target: 100, type: 'small' },
    { id: 'b1', ante: 1, name: '大盲 1-2', target: 150, type: 'big' },
    { id: 'boss1', ante: 1, name: 'Boss 1-3', target: 200, type: 'boss' },
    // 回合二
    { id: 's2', ante: 2, name: '小盲 2-1', target: 300, type: 'small' },
    { id: 'b2', ante: 2, name: '大盲 2-2', target: 400, type: 'big' },
    { id: 'boss2', ante: 2, name: 'Boss 2-3', target: 500, type: 'boss' },
    // 回合三
    { id: 's3', ante: 3, name: '小盲 3-1', target: 700, type: 'small' },
    { id: 'b3', ante: 3, name: '大盲 3-2', target: 1000, type: 'big' },
    { id: 'boss3', ante: 3, name: 'Boss 3-3', target: 1300, type: 'boss' },
    // 回合四
    { id: 's4', ante: 4, name: '小盲 4-1', target: 1500, type: 'small' },
    { id: 'b4', ante: 4, name: '大盲 4-2', target: 2000, type: 'big' },
    { id: 'boss4', ante: 4, name: 'Boss 4-3', target: 2800, type: 'boss' },
    // 回合五
    { id: 's5', ante: 5, name: '小盲 5-1', target: 3500, type: 'small' },
    { id: 'b5', ante: 5, name: '大盲 5-2', target: 5000, type: 'big' },
    { id: 'boss5', ante: 5, name: 'Boss 5-3', target: 7000, type: 'boss' },
    // 回合六
    { id: 's6', ante: 6, name: '小盲 6-1', target: 8000, type: 'small' },
    { id: 'b6', ante: 6, name: '大盲 6-2', target: 12000, type: 'big' },
    { id: 'boss6', ante: 6, name: 'Boss 6-3', target: 16000, type: 'boss' },
    // 回合七
    { id: 's7', ante: 7, name: '小盲 7-1', target: 20000, type: 'small' },
    { id: 'b7', ante: 7, name: '大盲 7-2', target: 28000, type: 'big' },
    { id: 'boss7', ante: 7, name: 'Boss 7-3', target: 38000, type: 'boss' },
    // 回合八
    { id: 's8', ante: 8, name: '小盲 8-1', target: 45000, type: 'small' },
    { id: 'b8', ante: 8, name: '大盲 8-2', target: 60000, type: 'big' },
    { id: 'boss8', ante: 8, name: 'Boss 8-3', target: 80000, type: 'boss' },
    // 回合九
    { id: 's9', ante: 9, name: '小盲 9-1', target: 100000, type: 'small' },
    { id: 'b9', ante: 9, name: '大盲 9-2', target: 130000, type: 'big' },
    { id: 'boss9', ante: 9, name: 'Boss 9-3', target: 170000, type: 'boss' },
    // 回合十（最终）
    { id: 's10', ante: 10, name: '小盲 10-1', target: 200000, type: 'small' },
    { id: 'b10', ante: 10, name: '大盲 10-2', target: 250000, type: 'big' },
    { id: 'boss10', ante: 10, name: '最终 Boss', target: 300000, type: 'boss' },
  ];

  // ========== 计分：应用小丑牌效果 ==========
  function calculateScore(tiles, handResult, jokers, gameState) {
    let baseScore = handResult.baseScore;
    let multiplier = handResult.multiplier;

    if (!tiles || tiles.length === 0) return { baseScore, multiplier, total: 0 };

    jokers.forEach(joker => {
      const eff = joker.effect;
      switch (eff.type) {
        case 'add_base':
          baseScore += eff.value;
          break;
        case 'add_score_per_tile':
          baseScore += eff.value * tiles.length;
          break;
        case 'add_mult':
          if (matchCondition(handResult.type, eff.condition)) {
            multiplier += eff.value;
          }
          break;
        case 'add_mult_suit':
          if (tiles.some(t => t.suit === eff.suit)) {
            multiplier += eff.value;
          }
          break;
        case 'add_mult_per_tile':
          const count = tiles.filter(t => t.suit === eff.tile.suit && t.value === eff.tile.value).length;
          multiplier += eff.value * count;
          break;
        case 'add_mult_per_value_tile': {
          const c = tiles.filter(t => t.value === eff.tileValue).length;
          multiplier += eff.value * c;
          break;
        }
        case 'add_mult_per_low_tile': {
          const c = tiles.filter(t => typeof t.value === 'number' && t.value <= eff.maxValue).length;
          multiplier += eff.value * c;
          break;
        }
        case 'multiply_hand':
          if (matchCondition(handResult.type, eff.condition)) {
            multiplier *= eff.value;
          }
          break;
        case 'multiply_base_hand':
          if (matchCondition(handResult.type, eff.condition)) {
            baseScore *= eff.value;
          }
          break;
        case 'multiply_total':
          multiplier *= eff.value;
          break;
        case 'rainbow_bonus':
          const suits = new Set(tiles.map(t => t.suit));
          if (suits.size >= 4) {
            multiplier += eff.value;
          }
          break;
        case 'joker_count_bonus':
          multiplier += eff.value * jokers.length;
          break;
        case 'high_risk':
          multiplier *= eff.multValue;
          break;
        case 'combo_bonus':
          if (gameState && gameState.lastHandType === handResult.type && gameState.comboCount > 0) {
            multiplier += eff.value * gameState.comboCount;
          }
          break;
        case 'hand_size_mult':
          if (tiles.length === eff.size) {
            multiplier *= eff.value;
          }
          break;
        case 'first_hand_mult':
          if (gameState && gameState.isFirstHand) {
            multiplier *= eff.value;
          }
          break;
        case 'last_hand_mult':
          if (gameState && gameState.isLastHand) {
            multiplier += eff.value;
          }
          break;
        case 'all_odd_bonus': {
          const nums = tiles.filter(t => typeof t.value === 'number');
          if (nums.length === tiles.length && nums.length > 0 && nums.every(t => t.value % 2 === 1)) {
            multiplier += eff.value;
          }
          break;
        }
        case 'all_even_bonus': {
          const nums = tiles.filter(t => typeof t.value === 'number');
          if (nums.length === tiles.length && nums.length > 0 && nums.every(t => t.value % 2 === 0)) {
            multiplier += eff.value;
          }
          break;
        }
        case 'all_same_value_bonus': {
          const nums = tiles.filter(t => typeof t.value === 'number');
          if (nums.length === tiles.length && nums.length > 0 && nums.every(t => t.value === nums[0].value)) {
            multiplier += eff.value;
          }
          break;
        }
        case 'ante_scale_base':
          if (gameState && gameState.ante) {
            baseScore *= 1 + (eff.value - 1) * gameState.ante;
          }
          break;
        case 'low_hp_mult':
          if (gameState && gameState.lives === 1) {
            multiplier *= eff.value;
          }
          break;
        case 'jian_type_bonus': {
          const jianValues = new Set(tiles.filter(t => t.suit === 'jian').map(t => t.value));
          multiplier += eff.value * jianValues.size;
          break;
        }
        case 'all_four_winds_bonus': {
          const winds = new Set(tiles.filter(t => t.suit === 'feng').map(t => t.value));
          if (winds.size >= 4) multiplier += eff.value;
          break;
        }
        case 'gamble_mult': {
          const win = Math.random() < 0.5;
          multiplier *= win ? eff.winValue : eff.loseValue;
          break;
        }
        case 'no_pair_base_mult':
          if (handResult.type === 'dan-zhang' || handResult.type === 'shun-zi' || handResult.type === 'qing-yi-se' || handResult.type === 'qing-long') {
            baseScore *= eff.value;
          }
          break;
        case 'min_score': {
          // 最后在 total 前处理，这里暂记
          break;
        }
      }
    });

    // min_score 保底（取所有小丑里最大值）
    const minScoreJoker = jokers.find(j => j.effect.type === 'min_score');
    let total = Math.floor(baseScore * multiplier);
    if (minScoreJoker && total < minScoreJoker.effect.value) {
      total = minScoreJoker.effect.value;
    }
    return {
      baseScore: Math.floor(baseScore),
      multiplier: +multiplier.toFixed(1),
      total,
    };
  }

  function matchCondition(handType, condition) {
    const conditions = {
      pair: ['yi-dui', 'liang-dui', 'hu-lu', 'san-ke', 'si-gang', 'zi-yi-se-hulu', 'si-gang-honor'],
      triple_or_better: ['san-ke', 'hu-lu', 'si-gang', 'qing-long', 'zi-yi-se-hulu', 'si-gang-honor'],
      triple: ['san-ke'],
      straight: ['shun-zi', 'qing-long'],
      flush: ['qing-yi-se', 'qing-long'],
      four_kind: ['si-gang', 'si-gang-honor'],
      all_honor: ['zi-yi-se', 'zi-yi-se-hulu', 'si-gang-honor'],
      full_house: ['hu-lu', 'zi-yi-se-hulu'],
      qing_long: ['qing-long'],
    };
    return conditions[condition]?.includes(handType) || false;
  }

  // ========== 随机抽取商店小丑牌 ==========
  function getRandomJokers(count, excludeIds = []) {
    const excludeSet = new Set(excludeIds);
    const pool = JOKER_CARDS.filter(j => !excludeSet.has(j.id));
    // 按稀有度加权
    const weights = { common: 50, uncommon: 30, rare: 15, legendary: 5 };
    const weightedPool = [];
    pool.forEach(j => {
      const w = weights[j.rarity] || 10;
      for (let i = 0; i < w; i++) weightedPool.push(j);
    });

    const result = [];
    const usedIds = new Set();
    while (result.length < count && weightedPool.length > 0) {
      const idx = Math.floor(Math.random() * weightedPool.length);
      const joker = weightedPool[idx];
      if (!usedIds.has(joker.id)) {
        usedIds.add(joker.id);
        result.push({ ...joker, instanceId: `j_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` });
      }
      weightedPool.splice(idx, 1);
    }
    return result;
  }

  // ========== 导出到全局 ==========
  Object.assign(window, {
    MahjongGame: {
      SUITS,
      NUMBER_TILES,
      FENG_TILES,
      JIAN_TILES,
      JOKER_CARDS,
      BLINDS,
      generateDeck,
      shuffleDeck,
      evaluateHand,
      calculateScore,
      getRandomJokers,
      tileKey,
    },
  });
})();
