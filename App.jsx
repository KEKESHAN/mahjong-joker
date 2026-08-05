// ========== 麻将小丑牌 - 主应用 ==========
(function() {
  const { useState, useEffect, useCallback, useMemo, useRef } = React;
  const {
    JOKER_CARDS, BLINDS,
    generateDeck, shuffleDeck,
    evaluateHand, calculateScore,
    getRandomJokers,
  } = window.MahjongGame;

  function App() {
    const [gameState, setGameState] = useState('start'); // start, playing, shop, blindResult, gameOver, victory
    const [money, setMoney] = useState(10);
    const [lives, setLives] = useState(3);
    const [currentBlindIndex, setCurrentBlindIndex] = useState(0);
    const [jokers, setJokers] = useState([]);
    const [deck, setDeck] = useState([]);
    const [hand, setHand] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [roundScore, setRoundScore] = useState(0);
    const [handsRemaining, setHandsRemaining] = useState(4);
    const [discardsRemaining, setDiscardsRemaining] = useState(3);
    const [lastScore, setLastScore] = useState(0);
    const [lastHandResult, setLastHandResult] = useState(null);
    const [lastScoreDetails, setLastScoreDetails] = useState(null);
    const [shopJokers, setShopJokers] = useState([]);
    const [rerollPrice, setRerollPrice] = useState(3);
    const [toast, setToast] = useState(null);
    const [comboCount, setComboCount] = useState(0);
    const [lastHandType, setLastHandType] = useState(null);
    const [blindResult, setBlindResult] = useState(null);
    const [activeTab, setActiveTab] = useState('play'); // play, jokers, help
    const [scoringAnimation, setScoringAnimation] = useState(false);
    const [helpView, setHelpView] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [muteTick, setMuteTick] = useState(0);

    // 计算小丑提供的额外属性
    const extraHands = jokers.reduce((s, j) => s + (j.effect?.type === 'extra_hands' ? j.effect.value : 0), 0);
    const extraDiscards = jokers.reduce((s, j) => s + (j.effect?.type === 'extra_discards' ? j.effect.value : 0), 0);
    const shopDiscount = jokers.reduce((m, j) => Math.max(m, j.effect?.type === 'shop_discount' ? j.effect.value : 0), 0);
    const freeRerolls = jokers.reduce((s, j) => s + (j.effect?.type === 'free_reroll' ? j.effect.value : 0), 0);
    const sellBonus = jokers.reduce((m, j) => Math.max(m, j.effect?.type === 'sell_bonus' ? j.effect.value : 0), 0);

    // 商店显示价格（含折扣）
    const getDisplayPrice = (basePrice) => Math.max(1, basePrice - shopDiscount);

    const currentBlind = BLINDS[currentBlindIndex];
    const selectedTiles = useMemo(() =>
      hand.filter(t => selectedIds.includes(t.id)), [hand, selectedIds]);

    const handResult = useMemo(() =>
      evaluateHand(selectedTiles), [selectedTiles]);

    const scoreDetails = useMemo(() =>
      calculateScore(selectedTiles, handResult, jokers, {
        lastHandType,
        comboCount,
        isFirstHand: handsRemaining === (4 + extraHands),
        isLastHand: handsRemaining === 1,
        ante: currentBlind?.ante || 1,
        lives,
      }),
      [selectedTiles, handResult, jokers, lastHandType, comboCount, handsRemaining, currentBlind, lives, extraHands]);

    // ========== 显示 Toast ==========
    const showToast = useCallback((msg) => {
      setToast(msg);
      setTimeout(() => setToast(null), 1500);
    }, []);

    // ========== 开始新游戏 ==========
    const startGame = useCallback(() => {
      window.SoundFX?.ensureCtx();
      window.SoundFX?.startBGM();
      window.SoundFX?.playClick();
      const newDeck = shuffleDeck(generateDeck());
      const initialHand = newDeck.slice(0, 8);
      setDeck(newDeck.slice(8));
      setHand(sortHand(initialHand, sortMode));
      setSelectedIds([]);
      setMoney(10);
      setLives(3);
      setCurrentBlindIndex(0);
      setJokers([]);
      setRoundScore(0);
      setHandsRemaining(4 + extraHands);
      setDiscardsRemaining(3 + extraDiscards);
      setComboCount(0);
      setLastHandType(null);
      setGameState('playing');
      setActiveTab('play');
    }, [sortMode, extraHands, extraDiscards]);

    // ========== 切换牌的选中 ==========
    const toggleTile = useCallback((tileId) => {
      setSelectedIds(prev => {
        if (prev.includes(tileId)) {
          window.SoundFX?.playTileSelect();
          return prev.filter(id => id !== tileId);
        } else {
          if (prev.length >= 5) {
            window.SoundFX?.playError();
            showToast('最多选5张牌');
            return prev;
          }
          window.SoundFX?.playTileSelect();
          return [...prev, tileId];
        }
      });
    }, [showToast]);

    // ========== 出牌 ==========
    const playHand = useCallback(() => {
      if (selectedTiles.length === 0) {
        window.SoundFX?.playError();
        showToast('请选择要出的牌');
        return;
      }
      if (handsRemaining <= 0) return;

      window.SoundFX?.playPlay();
      const result = calculateScore(selectedTiles, handResult, jokers, { lastHandType, comboCount });
      const newTotal = roundScore + result.total;

      // 连击判断
      if (lastHandType === handResult.type) {
        setComboCount(c => c + 1);
      } else {
        setComboCount(1);
      }
      setLastHandType(handResult.type);

      setLastScore(result.total);
      setLastHandResult(handResult);
      setLastScoreDetails(result);
      setRoundScore(newTotal);
      setScoringAnimation(true);

      // 从手牌中移除已出的牌
      const newHand = hand.filter(t => !selectedIds.includes(t.id));
      // 从牌库抽牌补足
      const drawCount = Math.min(selectedIds.length, deck.length);
      const drawn = deck.slice(0, drawCount);
      setHand(sortHand([...newHand, ...drawn], sortMode));
      setDeck(deck.slice(drawCount));
      setSelectedIds([]);

      // 减少出牌次数
      const newHandsLeft = handsRemaining - 1;
      setHandsRemaining(newHandsLeft);

      setTimeout(() => {
        setScoringAnimation(false);
      }, 600);

      // 检查是否达成目标（达标或用完次数都结算）
      if (newHandsLeft <= 0 || newTotal >= currentBlind.target) {
        setTimeout(() => {
          checkBlindResult(newTotal);
        }, 500);
      }
    }, [selectedTiles, handResult, jokers, roundScore, handsRemaining,
        deck, hand, selectedIds, lastHandType, comboCount, sortMode, showToast]);

    // ========== 弃牌重抽 ==========
    const discardAndDraw = useCallback(() => {
      if (discardsRemaining <= 0) {
        showToast('没有弃牌次数了');
        return;
      }
      if (selectedIds.length === 0) {
        showToast('选择要弃掉的牌');
        return;
      }

      const discardCount = selectedIds.length;
      const newHand = hand.filter(t => !selectedIds.includes(t.id));
      const drawCount = Math.min(discardCount, deck.length);
      const drawn = deck.slice(0, drawCount);
      setHand(sortHand([...newHand, ...drawn], sortMode));
      setDeck(deck.slice(drawCount));
      setSelectedIds([]);
      setDiscardsRemaining(d => d - 1);
      showToast(`弃掉 ${discardCount} 张，抽了 ${drawCount} 张`);
      window.SoundFX?.playClick();

      // 检查高风险小丑
      const hasHighRisk = jokers.some(j => j.effect?.type === 'high_risk');
      if (hasHighRisk) {
        setDiscardsRemaining(d => Math.max(0, d - 2));
      }
    }, [selectedIds, hand, deck, discardsRemaining, jokers, sortMode, showToast]);

    // ========== 检查盲注结果 ==========
    const checkBlindResult = useCallback((finalScore) => {
      const won = finalScore >= currentBlind.target;
      if (won) {
        window.SoundFX?.playWin();
      } else {
        window.SoundFX?.playError();
      }
      setBlindResult({
        won,
        score: finalScore,
        target: currentBlind.target,
        remainingBonus: won ? (handsRemaining + discardsRemaining) : 0,
      });
      setGameState('blindResult');
    }, [currentBlind, handsRemaining, discardsRemaining]);

    // ========== 盲注结算后继续 ==========
    const continueAfterBlind = useCallback(() => {
      if (blindResult.won) {
        // 基础奖励
        const baseReward = blindResult.score >= currentBlind.target * 1.5 ? 8 : 5;
        // 剩余次数奖励（出牌 + 弃牌）1:1
        const remainingReward = blindResult.remainingBonus || 0;
        setMoney(m => m + baseReward + remainingReward);

        if (currentBlindIndex >= BLINDS.length - 1) {
          // 通关
          setGameState('victory');
          return;
        }
        // 下一关
        setCurrentBlindIndex(i => i + 1);
        // 进商店
        setShopJokers(getRandomJokers(4, jokers.map(j => j.id)));
        setRerollPrice(Math.max(0, 3 - freeRerolls));
        setGameState('shop');
      } else {
        // 输一条命
        const newLives = lives - 1;
        setLives(newLives);
        if (newLives <= 0) {
          setGameState('gameOver');
        } else {
          // 继续下一个盲注
          if (currentBlindIndex >= BLINDS.length - 1) {
            setGameState('gameOver');
            return;
          }
          setCurrentBlindIndex(i => i + 1);
          setShopJokers(getRandomJokers(4, jokers.map(j => j.id)));
          setRerollPrice(Math.max(0, 3 - freeRerolls));
          setGameState('shop');
        }
      }
    }, [blindResult, currentBlind, currentBlindIndex, lives]);

    // ========== 离开商店进入下一关 ==========
    const leaveShop = useCallback(() => {
      // 商店结束经济效果
      let bonus = 0;
      jokers.forEach(j => {
        if (j.effect?.type === 'shop_end_money') bonus += j.effect.value;
        if (j.effect?.type === 'shop_end_interest') {
          bonus += Math.floor((money + bonus) * j.effect.value);
        }
      });
      if (bonus > 0) {
        setMoney(m => m + bonus);
        showToast(`商店利息 +${bonus}`);
      }
      // 重置本关状态
      const newDeck = shuffleDeck(generateDeck());
      const initialHand = newDeck.slice(0, 8);
      setDeck(newDeck.slice(8));
      setHand(sortHand(initialHand, sortMode));
      setSelectedIds([]);
      setRoundScore(0);
      setHandsRemaining(4 + extraHands);
      setDiscardsRemaining(3 + extraDiscards);
      setComboCount(0);
      setLastHandType(null);
      setBlindResult(null);
      setGameState('playing');
    }, [extraHands, extraDiscards, sortMode, jokers, money, showToast]);

    // ========== 购买小丑牌 ==========
    const buyJoker = useCallback((item) => {
      const price = item._displayPrice != null ? item._displayPrice : item.price;
      if (money < price) return;

      if (item.consumable) {
        // 消耗品
        setMoney(m => m - price);
        if (item.itemId === 'con_heal') {
          setLives(l => Math.min(l + 1, 5));
          showToast('恢复一条生命！');
        } else if (item.itemId === 'con_reroll') {
          // 重抽当前手牌
          const newDeck = shuffleDeck(generateDeck());
          setHand(newDeck.slice(0, 8));
          setDeck(newDeck.slice(8));
          setSelectedIds([]);
          showToast('手牌已重抽！');
        } else if (item.itemId === 'con_interest') {
          setMoney(m => m + 5);
          showToast('获得 $5 利息！');
        } else {
          showToast('购买成功！');
        }
        return;
      }

      if (item.pack) {
        setMoney(m => m - price);
        // 开卡包
        const count = item.packId === 'pack_mega' ? 2 : 1;
        const rarityFilter = item.packId === 'pack_legend'
          ? j => j.rarity !== 'common'
          : null;
        let pool = rarityFilter ? JOKER_CARDS.filter(rarityFilter) : JOKER_CARDS;
        // 从池子里随机
        const newJokers = [];
        for (let i = 0; i < count; i++) {
          const j = pool[Math.floor(Math.random() * pool.length)];
          newJokers.push({ ...j, instanceId: `pk_${Date.now()}_${i}_${Math.random().toString(36).slice(2,6)}` });
        }
        setJokers(prev => [...prev, ...newJokers].slice(0, 8));
        showToast(`获得 ${count} 张小丑牌！`);
        return;
      }

      // 小丑牌
      if (jokers.length >= 8) {
        showToast('小丑槽已满（8个）');
        return;
      }
      if (jokers.some(j => j.id === item.id)) {
        showToast('已拥有此小丑');
        return;
      }
      setMoney(m => m - price);
      setJokers(prev => [...prev, { ...item, instanceId: `b_${Date.now()}` }]);
      showToast(`购买了 ${item.name}！`);
      window.SoundFX?.playCoin();
    }, [money, jokers, showToast]);

    // ========== 出售小丑牌 ==========
    const sellJoker = useCallback((joker) => {
      const basePrice = Math.max(1, Math.floor((joker.price || 4) / 2));
      const sellPrice = Math.max(1, Math.floor(basePrice * (1 + sellBonus)));
      setJokers(prev => prev.filter(j => j.instanceId !== joker.instanceId));
      setMoney(m => m + sellPrice);
      showToast(`出售了 ${joker.name}，获得 ${sellPrice}`);
      window.SoundFX?.playCoin();
    }, [showToast, sellBonus]);

    // ========== 商店重抽 ==========
    const rerollShop = useCallback(() => {
      if (money < rerollPrice) {
        showToast('金币不足');
        return;
      }
      setMoney(m => m - rerollPrice);
      setShopJokers(getRandomJokers(4, jokers.map(j => j.id)));
      setRerollPrice(p => p + 1);
      showToast('重新刷新了奖池！');
      window.SoundFX?.playClick();
      window.SoundFX?.playClick();
    }, [money, rerollPrice, showToast]);
    const [sortMode, setSortMode] = useState('suit'); // suit | value

    // ========== 排序工具 ==========
    const suitOrder = { wan: 0, tiao: 1, tong: 2, feng: 3, jian: 4 };
    const sortHand = (tiles, mode) => {
      const arr = [...tiles];
      if (mode === 'value') {
        arr.sort((a, b) => {
          const av = typeof a.value === 'number' ? a.value : 100;
          const bv = typeof b.value === 'number' ? b.value : 100;
          if (av !== bv) return av - bv;
          return suitOrder[a.suit] - suitOrder[b.suit];
        });
      } else {
        arr.sort((a, b) => {
          if (suitOrder[a.suit] !== suitOrder[b.suit]) return suitOrder[a.suit] - suitOrder[b.suit];
          const av = typeof a.value === 'number' ? a.value : 100;
          const bv = typeof b.value === 'number' ? b.value : 100;
          return av - bv;
        });
      }
      return arr;
    };

    const sortBySuit = () => {
      setSortMode('suit');
      setHand(sortHand(hand, 'suit'));
    };

    const sortByValue = () => {
      setSortMode('value');
      setHand(sortHand(hand, 'value'));
    };

    if (gameState === 'start') {
      return (
        <div className="screen-overlay">
          <div className="screen-content">
            {/* 波普色块标题 */}
            <div style={{
              position: 'relative',
              marginBottom: '24px',
            }}>
              <div style={{
                display: 'inline-block',
                background: 'var(--pop-ink)',
                color: 'var(--pop-yellow)',
                padding: '12px 28px',
                border: '5px solid var(--pop-ink)',
                boxShadow: '6px 6px 0 0 var(--pop-red)',
                transform: 'rotate(-2deg)',
                marginLeft: '-8px',
              }}>
                <span className="pop-font" style={{
                  fontSize: '42px',
                  fontWeight: '900',
                  lineHeight: 1,
                  letterSpacing: '0.05em',
                  display: 'block',
                  fontFamily: '"Noto Sans SC", sans-serif',
                }}>麻 将</span>
              </div>
              <div style={{
                display: 'inline-block',
                background: 'var(--pop-red)',
                color: 'white',
                padding: '12px 28px',
                border: '5px solid var(--pop-ink)',
                boxShadow: '6px 6px 0 0 var(--pop-ink)',
                transform: 'rotate(2deg)',
                marginTop: '4px',
                marginLeft: '8px',
              }}>
                <span className="pop-font" style={{
                  fontSize: '42px',
                  fontWeight: '900',
                  lineHeight: 1,
                  letterSpacing: '0.05em',
                  display: 'block',
                  fontFamily: '"Noto Sans SC", sans-serif',
                }}>小 丑 牌</span>
              </div>
            </div>

            <div className="screen-subtitle">MAHJONG JOKER · 波普风</div>

            {/* 波普风格麻将牌展示（统一描边风格） */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '12px',
              marginBottom: '32px',
              transform: 'rotate(-2deg)',
            }}>
              <StartTile value="中" suit="jian" />
              <StartTile value="发" suit="jian" styleOverride={{ transform: 'translateY(-12px) rotate(3deg)' }} />
              <StartTile value="白" suit="jian" />
            </div>

            <button className="screen-btn green" onClick={() => { window.SoundFX?.playClick(); startGame(); }}>
              开 始 游 戏
            </button>
            <button className="screen-btn blue" onClick={() => {
            window.SoundFX?.ensureCtx();
            window.SoundFX?.startBGM();
            window.SoundFX?.playClick();
            setHelpView(true);
          }}>
              游 戏 说 明
            </button>
          </div>

          {helpView && <HelpModal onClose={() => setHelpView(false)} />}

        </div>
      );
    }

    // ========== 渲染游戏结束 ==========
    if (gameState === 'gameOver') {
      return (
        <div className="screen-overlay" style={{ background: 'var(--pop-red)' }}>
          <div className="screen-content">
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <span className="pop-font" style={{
                display: 'inline-block',
                fontSize: '44px',
                fontWeight: '400',
                color: 'white',
                background: 'var(--pop-ink)',
                padding: '8px 24px',
                border: '5px solid var(--pop-ink)',
                boxShadow: '5px 5px 0 0 var(--pop-yellow)',
                transform: 'rotate(-2deg)',
              }}>游戏结束</span>
            </div>
            <div className="screen-subtitle" style={{ color: 'white', opacity: 0.9 }}>
              GAME OVER
            </div>

            <div className="result-stats">
              <div className="result-stat">
                <span className="result-stat-label">到达关卡</span>
                <span className="result-stat-value">{currentBlindIndex + 1} / {BLINDS.length}</span>
              </div>
              <div className="result-stat">
                <span className="result-stat-label">本局得分</span>
                <span className="result-stat-value">{roundScore}</span>
              </div>
              <div className="result-stat">
                <span className="result-stat-label">拥有金钱</span>
                <span className="result-stat-value">${money}</span>
              </div>
              <div className="result-stat">
                <span className="result-stat-label">小丑数量</span>
                <span className="result-stat-value">{jokers.length}</span>
              </div>
            </div>

            <button className="screen-btn yellow" onClick={() => { window.SoundFX?.playClick(); startGame(); }}
              style={{ background: 'var(--pop-button-yellow)' }}>
              再 来 一 局
            </button>
            <button className="screen-btn black" onClick={() => { window.SoundFX?.playClick(); setGameState('start'); }}
              style={{ background: 'black', color: 'white' }}>
              返 回 主 菜 单
            </button>
          </div>
        </div>
      );
    }

    // ========== 渲染胜利界面 ==========
    if (gameState === 'victory') {
      return (
        <div className="screen-overlay" style={{ background: 'var(--pop-green)' }}>
          <div className="screen-content">
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <span className="pop-font" style={{
                display: 'inline-block',
                fontSize: '44px',
                fontWeight: '400',
                color: 'var(--pop-yellow)',
                background: 'var(--pop-ink)',
                padding: '8px 24px',
                border: '5px solid var(--pop-ink)',
                boxShadow: '5px 5px 0 0 var(--pop-red)',
                transform: 'rotate(-2deg)',
              }}>通关啦！</span>
              <br />
              <span className="pop-font" style={{
                display: 'inline-block',
                fontSize: '28px',
                fontWeight: '400',
                color: 'white',
                background: 'var(--pop-red)',
                padding: '4px 16px',
                border: '4px solid var(--pop-ink)',
                boxShadow: '4px 4px 0 0 var(--pop-ink)',
                transform: 'rotate(1deg)',
                marginTop: '8px',
              }}>VICTORY</span>
            </div>
            <div className="screen-subtitle">恭喜通过 10 个回合的所有挑战！</div>

            <div className="result-stats">
              <div className="result-stat">
                <span className="result-stat-label">最终分数</span>
                <span className="result-stat-value">{roundScore}</span>
              </div>
              <div className="result-stat">
                <span className="result-stat-label">剩余生命</span>
                <span className="result-stat-value">{'❤️'.repeat(lives)}</span>
              </div>
              <div className="result-stat">
                <span className="result-stat-label">金钱</span>
                <span className="result-stat-value">${money}</span>
              </div>
              <div className="result-stat">
                <span className="result-stat-label">收集小丑</span>
                <span className="result-stat-value">{jokers.length} 张</span>
              </div>
            </div>

            <button className="screen-btn red" onClick={() => { window.SoundFX?.playClick(); startGame(); }}>
              再 来 一 局
            </button>
            <button className="screen-btn white" onClick={() => { window.SoundFX?.playClick(); setGameState('start'); }}
              style={{ background: 'white', color: 'black' }}>
              返 回 主 菜 单
            </button>
          </div>
        </div>
      );
    }

    // ========== 渲染主游戏界面 ==========
    return (
      <div className="game-container">
        <div className="halftone-bg"></div>

        {/* 全局确认弹窗 */}
        {showConfirm && (
          <ConfirmModal
            title="返回首页"
            message="确定要返回首页吗？当前进度将丢失。"
            confirmText="返 回"
            cancelText="取 消"
            onConfirm={() => {
              setShowConfirm(false);
              setGameState('start');
              window.SoundFX?.playClick();
            }}
            onCancel={() => {
              setShowConfirm(false);
              window.SoundFX?.playClick();
            }}
          />
        )}

        {/* 顶部状态栏 */}
        <div className="top-bar">
          <div className="top-bar-row">
            <button
              className="back-home-btn"
              onClick={() => {
                window.SoundFX?.playClick();
                setShowConfirm(true);
              }}
              title="返回首页"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <div className="stat-pill red">
              <span>❤️</span>
              <span className="stat-value">{lives}</span>
            </div>
            <div className="stat-pill yellow">
              <span>💰</span>
              <span className="stat-value">${money}</span>
            </div>
            <div className="stat-pill green">
              <span>🃏</span>
              <span className="stat-value">{jokers.length}/8</span>
            </div>
            <button
              className="sound-toggle-btn"
              onClick={() => {
                window.SoundFX?.playClick();
                const muted = window.SoundFX?.toggleMute();
                if (!muted) {
                  window.SoundFX?.startBGM();
                } else {
                  window.SoundFX?.stopBGM();
                }
                // 强制重渲染
                setMuteTick(t => t + 1);
              }}
              title="静音切换"
            >
              {window.SoundFX?.isMuted() ? (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              )}
            </button>
          </div>
          <div className="game-title pop-font">{currentBlind.name}</div>
          <div className="game-subtitle">回合 {currentBlind.ante} / 10</div>
          <div className="blind-bar">
            <div className="blind-track">
              <div
                className="blind-fill"
                style={{
                  width: `${Math.min(100, (roundScore / currentBlind.target) * 100)}%`,
                  background: roundScore >= currentBlind.target ? 'var(--pop-green)' : 'var(--pop-yellow)',
                }}
              />
              <span className="blind-label">
                {roundScore} / {currentBlind.target}
              </span>
            </div>
          </div>
        </div>

        {/* 主游戏区 */}
        <div className="game-main">
          {activeTab === 'play' && (
            <>
              {/* 小丑牌区 */}
              <div className="jokers-section">
                <div className="section-label">
                  小丑牌 ({jokers.length}/8)
                </div>
                <div className="jokers-row">
                  {jokers.map(joker => (
                    <JokerCard key={joker.instanceId} joker={joker} small />
                  ))}
                  {jokers.length === 0 && (
                    <div className="joker-slot">+</div>
                  )}
                </div>
              </div>

              {/* 出牌区 */}
              <div className={`play-area ${scoringAnimation ? 'scoring' : ''}`}>
                <div className="play-area-title">出 牌 区</div>
                <div className="play-tiles">
                  {selectedTiles.length > 0 ? (
                    selectedTiles.map(tile => (
                      <MahjongTile
                        key={tile.id}
                        tile={tile}
                        inPlay
                        onClick={() => toggleTile(tile.id)}
                      />
                    ))
                  ) : (
                    <div style={{
                      fontSize: '11px',
                      fontWeight: '900',
                      textTransform: 'uppercase',
                      letterSpacing: '0.15em',
                      opacity: 0.4,
                    }}>
                      从手牌选择 1-5 张
                    </div>
                  )}
                </div>

                {selectedTiles.length > 0 && (
                  <div className={`hand-type-result ${handResult && handResult.type && handResult.type !== 'none' && handResult.type !== 'single' && handResult.type !== 'san-pai' ? 'has-type' : 'no-type'}`}>
                    {handResult && handResult.type && handResult.type !== 'none'
                      ? <>
                          <span className="ht-name">{handResult.name}</span>
                          <span className="score-pop">×{scoreDetails.multiplier}</span>
                          <span className="ht-count">{selectedTiles.length}张</span>
                        </>
                      : <span className="ht-name">选牌中…</span>
                    }
                  </div>
                )}
              </div>

              {/* 手牌区 */}
              <div className="hand-section">
                <div className="section-label">
                  手牌 · {hand.length} 张
                </div>
                <div className="hand-tiles">
                  {hand.map(tile => (
                    <MahjongTile
                      key={tile.id}
                      tile={tile}
                      selected={selectedIds.includes(tile.id)}
                      onClick={() => toggleTile(tile.id)}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'jokers' && (
            <JokersView jokers={jokers} />
          )}

          {activeTab === 'help' && (
            <HelpView />
          )}
        </div>

        {/* 操作按钮区 */}
        {activeTab === 'play' && gameState === 'playing' && (
          <div className="action-bar">
            <button
              className="pop-btn blue btn-small"
              onClick={discardAndDraw}
              disabled={discardsRemaining <= 0 || selectedIds.length === 0}
            >
              弃牌 ({discardsRemaining})
            </button>
            <div style={{
              display: 'flex',
              background: 'rgba(0,0,0,0.1)',
              border: '2.5px solid var(--pop-ink)',
              borderRadius: '9999px',
              padding: '3px',
              boxShadow: '2px 2px 0 0 var(--pop-ink)',
              overflow: 'hidden',
            }}>
              <button
                onClick={() => { window.SoundFX?.playClick(); sortBySuit(); }}
                style={{
                  flex: 1,
                  padding: '4px 12px',
                  fontSize: '11px',
                  fontWeight: '900',
                  border: 'none',
                  borderRadius: '9999px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  letterSpacing: '0.05em',
                  transition: 'all 0.15s ease',
                  background: sortMode === 'suit' ? 'var(--pop-red)' : 'transparent',
                  color: sortMode === 'suit' ? 'white' : 'var(--pop-ink)',
                  boxShadow: sortMode === 'suit' ? 'inset 0 -2px 0 rgba(0,0,0,0.25)' : 'none',
                }}
                title="按花色排序"
              >
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: '4px' }}>
                  <path d="M3 7h13" />
                  <path d="M3 12h9" />
                  <path d="M3 17h5" />
                </svg>
                花色
              </button>
              <button
                onClick={() => { window.SoundFX?.playClick(); sortByValue(); }}
                style={{
                  flex: 1,
                  padding: '4px 12px',
                  fontSize: '11px',
                  fontWeight: '900',
                  border: 'none',
                  borderRadius: '9999px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  letterSpacing: '0.05em',
                  transition: 'all 0.15s ease',
                  background: sortMode === 'value' ? 'var(--pop-red)' : 'transparent',
                  color: sortMode === 'value' ? 'white' : 'var(--pop-ink)',
                  boxShadow: sortMode === 'value' ? 'inset 0 -2px 0 rgba(0,0,0,0.25)' : 'none',
                }}
                title="按数字排序"
              >
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: '4px' }}>
                  <path d="M4 18V6" />
                  <path d="M8 18V4" />
                  <path d="M12 18V8" />
                  <path d="M16 18V10" />
                </svg>
                大小
              </button>
            </div>
            <button
              className="pop-btn green"
              onClick={playHand}
              disabled={handsRemaining <= 0 || selectedTiles.length === 0}
            >
              出牌 ({handsRemaining})
            </button>
          </div>
        )}

        {/* 底部导航 */}
        <div className="bottom-nav">
          <div
            className={`bottom-nav-item ${activeTab === 'play' ? 'active' : ''}`}
            onClick={() => { window.SoundFX?.playClick(); setActiveTab('play'); }}
          >
            <span className="bottom-nav-icon">🎴</span>
            <span>出牌</span>
          </div>
          <div
            className={`bottom-nav-item ${activeTab === 'jokers' ? 'active' : ''}`}
            onClick={() => { window.SoundFX?.playClick(); setActiveTab('jokers'); }}
          >
            <span className="bottom-nav-icon">🃏</span>
            <span>小丑</span>
          </div>
          <div
            className={`bottom-nav-item ${activeTab === 'help' ? 'active' : ''}`}
            onClick={() => { window.SoundFX?.playClick(); setActiveTab('help'); }}
          >
            <span className="bottom-nav-icon">📖</span>
            <span>牌谱</span>
          </div>
        </div>

        {/* 商店 */}
        {gameState === 'shop' && (
          <Shop
            money={money}
            onBuy={buyJoker}
            onSell={sellJoker}
            onReroll={rerollShop}
            rerollPrice={rerollPrice}
            onClose={leaveShop}
            availableJokers={shopJokers}
            ownedJokers={jokers}
            shopDiscount={shopDiscount}
            freeRerolls={freeRerolls}
          />
        )}

        {/* 盲注结算 */}
        {gameState === 'blindResult' && blindResult && (
          <div className="blind-result">
            <div className="blind-result-card">
              <div className={`blind-result-title ${blindResult.won ? 'win' : 'lose'}`}>
                {blindResult.won ? '胜利！' : '失败...'}
              </div>
              <div className="blind-result-sub">
                {currentBlind.name}
              </div>
              <div className="blind-result-score">
                <div className="blind-result-score-row">
                  <span>你的分数</span>
                  <span className="val">{blindResult.score}</span>
                </div>
                <div className="blind-result-score-row">
                  <span>目标分数</span>
                  <span className="val" style={{ color: 'var(--pop-blue)' }}>{blindResult.target}</span>
                </div>
                {blindResult.won && (
                  <div style={{
                    borderTop: '3px dashed rgba(0,0,0,0.1)',
                    paddingTop: '8px',
                    marginTop: '4px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}>
                    <div className="blind-result-score-row">
                      <span>通关奖励</span>
                      <span className="val" style={{ color: 'var(--pop-green)' }}>
                        +${blindResult.score >= blindResult.target * 1.5 ? 8 : 5}
                      </span>
                    </div>
                    {blindResult.remainingBonus > 0 && (
                      <div className="blind-result-score-row">
                        <span>剩余次数奖励</span>
                        <span className="val" style={{ color: 'var(--pop-green)' }}>
                          +${blindResult.remainingBonus}
                        </span>
                      </div>
                    )}
                    <div className="blind-result-score-row" style={{
                      borderTop: '2px solid rgba(0,0,0,0.15)',
                      paddingTop: '4px',
                      marginTop: '2px',
                      fontWeight: '900',
                    }}>
                      <span>合计</span>
                      <span className="val" style={{ color: 'var(--pop-red)' }}>
                        +${(blindResult.score >= blindResult.target * 1.5 ? 8 : 5) + (blindResult.remainingBonus || 0)}
                      </span>
                    </div>
                  </div>
                )}
                {!blindResult.won && (
                  <div className="blind-result-score-row" style={{
                    borderTop: '3px dashed rgba(0,0,0,0.1)',
                    paddingTop: '8px',
                    marginTop: '4px',
                  }}>
                    <span>失去生命</span>
                    <span className="val" style={{ color: 'var(--pop-red)' }}>-1 ❤️</span>
                  </div>
                )}
              </div>
              <button
                className="pop-btn yellow"
                onClick={() => { window.SoundFX?.playClick(); continueAfterBlind(); }}
                style={{ width: '100%' }}
              >
                {blindResult.won ? '前往商店' : '继续挑战'}
              </button>
            </div>
          </div>
        )}


        {/* Toast 提示 */}
        {toast && <div className="float-toast">{toast}</div>}
      </div>
    );
  }

  // ========== 小丑牌列表 ==========
  function JokersView({ jokers }) {
    if (jokers.length === 0) {
      return (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          opacity: 0.5,
        }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🃏</div>
          <div style={{ fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            还没有小丑牌
          </div>
          <div style={{ fontSize: '11px', marginTop: '4px', fontWeight: '700', opacity: 0.7 }}>
            在商店购买获得
          </div>
        </div>
      );
    }

    return (
      <div>
        <div className="section-label">我的小丑牌</div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '10px',
        }}>
          {jokers.map(joker => (
            <div key={joker.instanceId} style={{
              background: 'white',
              border: '4px solid var(--pop-ink)',
              borderRadius: '1rem',
              padding: '12px',
              boxShadow: '4px 4px 0 0 var(--pop-ink)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '36px', marginBottom: '4px' }}>{joker.emoji}</div>
              <div style={{
                fontSize: '13px',
                fontWeight: '900',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '4px',
                color: getRarityTextColor(joker.rarity),
              }}>
                {joker.name}
              </div>
              <div style={{
                fontSize: '10px',
                fontWeight: '700',
                opacity: 0.7,
                lineHeight: 1.3,
              }}>
                {joker.desc}
              </div>
              <div style={{
                display: 'inline-block',
                marginTop: '6px',
                padding: '2px 8px',
                border: '2px solid var(--pop-ink)',
                borderRadius: '9999px',
                fontSize: '9px',
                fontWeight: '900',
                textTransform: 'uppercase',
                background: getRarityBg(joker.rarity),
                color: getRarityFg(joker.rarity),
              }}>
                {rarityLabel(joker.rarity)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ========== 帮助/牌谱 ==========
  function HelpView() {
    const [expanded, setExpanded] = useState(null);

    const ranks = [
      {
        name: '字一色四杠', mult: '×20', base: '200', rank: '1',
        desc: '5张全是字牌，且有4张完全相同',
        tiles: [
          { suit: 'jian', value: '中', display: '中' },
          { suit: 'jian', value: '中', display: '中' },
          { suit: 'jian', value: '中', display: '中' },
          { suit: 'jian', value: '中', display: '中' },
          { suit: 'jian', value: '发', display: '发' },
        ],
      },
      {
        name: '字一色葫芦', mult: '×15', base: '150', rank: '2',
        desc: '5张全是字牌，3张相同 + 2张相同',
        tiles: [
          { suit: 'jian', value: '中', display: '中' },
          { suit: 'jian', value: '中', display: '中' },
          { suit: 'jian', value: '中', display: '中' },
          { suit: 'jian', value: '发', display: '发' },
          { suit: 'jian', value: '发', display: '发' },
        ],
      },
      {
        name: '字一色', mult: '×10', base: '100', rank: '3',
        desc: '5张全是字牌（风牌/箭牌）',
        tiles: [
          { suit: 'feng', value: '东', display: '东' },
          { suit: 'feng', value: '南', display: '南' },
          { suit: 'jian', value: '中', display: '中' },
          { suit: 'jian', value: '发', display: '发' },
          { suit: 'jian', value: '白', display: '白' },
        ],
      },
      {
        name: '清龙', mult: '×10', base: '100', rank: '4',
        desc: '同花色的5张连续数字',
        tiles: [
          { suit: 'wan', value: 1, display: '1万' },
          { suit: 'wan', value: 2, display: '2万' },
          { suit: 'wan', value: 3, display: '3万' },
          { suit: 'wan', value: 4, display: '4万' },
          { suit: 'wan', value: 5, display: '5万' },
        ],
      },
      {
        name: '四杠', mult: '×12', base: '120', rank: '5',
        desc: '4张完全相同的牌（类似扑克四条）',
        tiles: [
          { suit: 'wan', value: 3, display: '3万' },
          { suit: 'wan', value: 3, display: '3万' },
          { suit: 'wan', value: 3, display: '3万' },
          { suit: 'wan', value: 3, display: '3万' },
          { suit: 'tiao', value: 5, display: '5条' },
        ],
      },
      {
        name: '清一色', mult: '×7', base: '70', rank: '6',
        desc: '5张数字牌全是同一花色',
        tiles: [
          { suit: 'tong', value: 2, display: '2筒' },
          { suit: 'tong', value: 5, display: '5筒' },
          { suit: 'tong', value: 6, display: '6筒' },
          { suit: 'tong', value: 8, display: '8筒' },
          { suit: 'tong', value: 9, display: '9筒' },
        ],
      },
      {
        name: '葫芦', mult: '×6', base: '60', rank: '7',
        desc: '3张相同 + 2张相同（类似扑克Full House）',
        tiles: [
          { suit: 'tong', value: 2, display: '2筒' },
          { suit: 'tong', value: 2, display: '2筒' },
          { suit: 'tong', value: 2, display: '2筒' },
          { suit: 'wan', value: 5, display: '5万' },
          { suit: 'wan', value: 5, display: '5万' },
        ],
      },
      {
        name: '三刻', mult: '×4', base: '30', rank: '8',
        desc: '3张完全相同的牌（类似扑克三条）',
        tiles: [
          { suit: 'tiao', value: 7, display: '7条' },
          { suit: 'tiao', value: 7, display: '7条' },
          { suit: 'tiao', value: 7, display: '7条' },
          { suit: 'wan', value: 3, display: '3万' },
          { suit: 'tong', value: 8, display: '8筒' },
        ],
      },
      {
        name: '两对', mult: '×3', base: '20', rank: '9',
        desc: '两对不同的对子（类似扑克两对）',
        tiles: [
          { suit: 'wan', value: 3, display: '3万' },
          { suit: 'wan', value: 3, display: '3万' },
          { suit: 'tong', value: 8, display: '8筒' },
          { suit: 'tong', value: 8, display: '8筒' },
          { suit: 'tiao', value: 5, display: '5条' },
        ],
      },
      {
        name: '一对', mult: '×2', base: '10', rank: '10',
        desc: '2张完全相同的牌（类似扑克一对）',
        tiles: [
          { suit: 'wan', value: 5, display: '5万' },
          { suit: 'wan', value: 5, display: '5万' },
          { suit: 'tiao', value: 3, display: '3条' },
          { suit: 'tong', value: 7, display: '7筒' },
          { suit: 'feng', value: '东', display: '东' },
        ],
      },
      {
        name: '散牌', mult: '×1', base: '5', rank: '11',
        desc: '凑不出任何牌型的杂牌',
        tiles: [
          { suit: 'wan', value: 1, display: '1万' },
          { suit: 'tiao', value: 3, display: '3条' },
          { suit: 'tong', value: 5, display: '5筒' },
          { suit: 'feng', value: '东', display: '东' },
          { suit: 'jian', value: '中', display: '中' },
        ],
      },
    ];

    const toggleExpand = (idx) => {
      setExpanded(expanded === idx ? null : idx);
    };

    return (
      <div>
        <div className="section-label">麻将牌型 · 点击看说明</div>
        <div className="hand-rank-list">
          {ranks.map((r, i) => (
            <div key={i}>
              <div
                className={`hand-rank-item ${expanded === i ? 'expanded' : ''}`}
                onClick={() => { window.SoundFX?.playClick(); toggleExpand(i); }}
                style={{ cursor: 'pointer' }}
              >
                <div className="rank-name">
                  <span className="rank-num">{r.rank}</span>
                  <span>{r.name}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', opacity: 0.6 }}>{r.base}分</span>
                  <span className="rank-mult">{r.mult}</span>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: '900',
                    transition: 'transform 0.2s',
                    transform: expanded === i ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}>▼</span>
                </div>
              </div>
              {expanded === i && (
                <div style={{
                  padding: '10px 12px 12px',
                  marginTop: '-6px',
                  background: 'white',
                  border: '3px solid var(--pop-ink)',
                  borderTop: 'none',
                  borderRadius: '0 0 8px 8px',
                  boxShadow: '3px 3px 0 0 var(--pop-ink)',
                  animation: 'handExpand 0.25s var(--pop-easing)',
                  transformOrigin: 'top center',
                }}>
                  {/* 示例牌面 */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '4px',
                    marginBottom: '8px',
                  }}>
                    {r.tiles.map((t, ti) => (
                      <div
                        key={ti}
                        className={`tile-${t.suit}`}
                        style={{
                          width: '32px',
                          height: '44px',
                          background: 'var(--pop-surface)',
                          border: '3px solid var(--pop-ink)',
                          borderRadius: '6px',
                          boxShadow: '2px 2px 0 0 var(--pop-ink)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          backgroundImage: 'radial-gradient(rgba(0,0,0,0.05) 1px, transparent 1px)',
                          backgroundSize: '6px 6px',
                          pointerEvents: 'none',
                        }} />
                        <span style={{
                          fontFamily: t.suit === 'feng' || t.suit === 'jian' ? "'ZCOOL KuaiLe', 'Noto Sans SC', sans-serif" : '"Noto Sans SC", sans-serif',
                          fontSize: '14px',
                          fontWeight: (t.suit === 'feng' || t.suit === 'jian') ? '400' : '900',
                          lineHeight: 1,
                          color: t.suit === 'wan' ? 'var(--pop-red)'
                            : t.suit === 'tiao' ? 'var(--pop-green)'
                            : t.suit === 'tong' ? 'var(--pop-blue)'
                            : 'var(--pop-ink)',
                        }}>
                          {t.value}
                        </span>
                        <span style={{
                          fontSize: '7px',
                          fontWeight: '900',
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          marginTop: '2px',
                          color: t.suit === 'wan' ? 'var(--pop-red)'
                            : t.suit === 'tiao' ? 'var(--pop-green)'
                            : t.suit === 'tong' ? 'var(--pop-blue)'
                            : 'var(--pop-ink)',
                          opacity: 0.8,
                        }}>
                          {t.suit === 'wan' ? '万' : t.suit === 'tiao' ? '条' : t.suit === 'tong' ? '筒' : t.suit === 'feng' ? '风' : '箭'}
                        </span>
                      </div>
                    ))}
                  </div>
                  {/* 文字说明 */}
                  <div style={{
                    fontSize: '10px',
                    fontWeight: '700',
                    lineHeight: 1.5,
                    color: 'var(--pop-ink)',
                    textAlign: 'center',
                    opacity: 0.75,
                  }}>
                    {r.desc}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ height: '16px' }}></div>

        <div className="help-panel">
          <div className="help-title">游戏规则</div>
          <div className="help-text">
            <p style={{ marginBottom: '8px' }}>🧩 <b>目标：</b>每关选择麻将牌组成牌型，达成目标分数。</p>
            <p style={{ marginBottom: '8px' }}>🎴 <b>出牌：</b>每回合可选 1-5 张牌打出，共 4 次出牌机会。</p>
            <p style={{ marginBottom: '8px' }}>🔄 <b>弃牌：</b>选择要弃的牌点弃牌，可重抽新牌，共 3 次。</p>
            <p style={{ marginBottom: '8px' }}>🃏 <b>小丑牌：</b>在商店购买，增加得分倍率或基础分。</p>
            <p style={{ marginBottom: '8px' }}>❤️ <b>生命：</b>3 条生命，未达标扣一条，归零游戏结束。</p>
            <p>💰 <b>金钱：</b>每关胜利获得金钱，用于商店消费。</p>
          </div>
        </div>

        <div className="help-panel">
          <div className="help-title">小丑品质</div>
          <div className="help-text">
            <p style={{ marginBottom: '4px' }}>⚪ 普通 - 基础效果，价格低</p>
            <p style={{ marginBottom: '4px' }}>🟢 精良 - 中等效果，性价比高</p>
            <p style={{ marginBottom: '4px' }}>🔵 稀有 - 强力效果，价格较高</p>
            <p>🔴 传说 - 顶级效果，极其珍贵</p>
          </div>
        </div>
      </div>
    );
  }

  // ========== 帮助弹窗（开始界面用）==========
  function ConfirmModal({ title, message, confirmText = '确 定', cancelText = '取 消', onConfirm, onCancel }) {
    return (
      <div className="shop-overlay" onClick={onCancel}>
        <div className="shop-container confirm-box" onClick={e => e.stopPropagation()}>
          <div className="shop-header">
            <div className="shop-title">{title}</div>
          </div>
          <div className="shop-content" style={{ textAlign: 'center', fontSize: '15px', lineHeight: 1.7 }}>
            {message}
          </div>
          <div className="shop-footer" style={{ gap: '12px' }}>
            <button className="pop-btn white" onClick={() => { window.SoundFX?.playClick(); onCancel(); }} style={{ flex: 1 }}>
              {cancelText}
            </button>
            <button className="pop-btn red" onClick={() => { window.SoundFX?.playClick(); onConfirm(); }} style={{ flex: 1 }}>
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    );
  }

  function HelpModal({ onClose }) {
    return (
      <div className="shop-overlay" onClick={onClose}>
        <div className="shop-container" onClick={e => e.stopPropagation()}>
          <div className="shop-header">
            <div className="shop-title">游戏说明</div>
            <button className="shop-close" onClick={() => { window.SoundFX?.playClick(); onClose(); }}>×</button>
          </div>
          <div className="shop-content">
            <HelpView />
          </div>
          <div className="shop-footer">
            <button className="pop-btn green" onClick={() => { window.SoundFX?.playClick(); onClose(); }} style={{ flex: 1 }}>
              知 道 了
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ========== 开始界面用麻将牌组件 ==========
  function StartTile({ value, suit, styleOverride = {} }) {
    const suitColors = {
      wan: 'var(--pop-red)',
      tiao: 'var(--pop-green)',
      tong: 'var(--pop-blue)',
      feng: 'var(--pop-ink)',
      jian: 'var(--pop-ink)',
    };
    const textColor = suitColors[suit] || 'var(--pop-ink)';

    return (
      <div style={{
        width: '72px',
        height: '96px',
        background: 'var(--pop-surface)',
        border: '5px solid var(--pop-ink)',
        borderRadius: '10px',
        boxShadow: '5px 5px 0 0 var(--pop-ink)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        ...styleOverride,
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(rgba(0,0,0,0.06) 1.5px, transparent 1.5px)',
          backgroundSize: '8px 8px',
          pointerEvents: 'none',
        }} />
        <span style={{
          fontSize: (suit === 'feng' || suit === 'jian') ? '40px' : '36px',
          fontWeight: (suit === 'feng' || suit === 'jian') ? '400' : '900',
          lineHeight: 1,
          color: textColor,
          fontFamily: (suit === 'feng' || suit === 'jian') ? "'ZCOOL KuaiLe', 'Noto Sans SC', sans-serif" : '"Noto Sans SC", sans-serif',
        }}>
          {value}
        </span>
        <span style={{
          fontSize: '10px',
          fontWeight: '900',
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          marginTop: '4px',
          color: textColor,
          opacity: 0.7,
        }}>
          {suit === 'jian' ? '箭' : suit === 'feng' ? '风' : suit === 'wan' ? '万' : suit === 'tiao' ? '条' : '筒'}
        </span>
      </div>
    );
  }

  // ========== 辅助函数 ==========
  function getRarityTextColor(rarity) {
    const map = {
      common: 'black',
      uncommon: 'green',
      rare: 'var(--pop-blue)',
      legendary: 'var(--pop-red)',
    };
    return map[rarity] || 'black';
  }

  function getRarityBg(rarity) {
    const map = {
      common: 'white',
      uncommon: 'var(--pop-green)',
      rare: 'var(--pop-blue)',
      legendary: 'var(--pop-red)',
    };
    return map[rarity] || 'white';
  }

  function getRarityFg(rarity) {
    const map = {
      common: 'black',
      uncommon: 'black',
      rare: 'white',
      legendary: 'white',
    };
    return map[rarity] || 'black';
  }

  function rarityLabel(rarity) {
    const map = {
      common: '普通',
      uncommon: '精良',
      rare: '稀有',
      legendary: '传说',
    };
    return map[rarity] || '普通';
  }

  // ========== 渲染 ==========
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(<App />);
})();
