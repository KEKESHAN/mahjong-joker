// ========== 商店组件 ==========
(function() {
  const { useState, useEffect } = React;

  function Shop({ money, onBuy, onSell, onReroll, rerollPrice, onClose, availableJokers, ownedJokers, shopDiscount = 0, freeRerolls = 0, sellBonus = 0 }) {
    const [activeTab, setActiveTab] = useState('jokers');
    const ownedJokerIds = (ownedJokers || []).map(j => j.id);

    const getPrice = (base) => Math.max(1, base - shopDiscount);
    const freeRerollText = freeRerolls > 0 && rerollPrice <= 0 ? '免费' : `${rerollPrice}`;

    return (
      <div className="shop-overlay" onClick={onClose}>
        <div className="shop-container" onClick={e => e.stopPropagation()}>
          <div className="shop-header">
            <div className="shop-title">商 店</div>
            <button className="shop-close" onClick={() => { window.SoundFX?.playClick(); onClose(); }}>×</button>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '12px',
              marginTop: '8px',
              flexWrap: 'wrap',
            }}>
              <div className="stat-pill yellow" style={{ fontSize: '11px' }}>
                💰 <span className="stat-value">${money}</span>
              </div>
               <button
                 className="pop-btn purple btn-small"
                 onClick={() => { window.SoundFX?.playClick(); onReroll(); }}
                 disabled={money < rerollPrice}
                 style={{ fontSize: '11px', padding: '4px 10px', margin: 0 }}
               >
                 🔄 重抽 {freeRerollText}
               </button>
            </div>
          </div>

          <div className="shop-tabs">
            <div
              className={`shop-tab ${activeTab === 'jokers' ? 'active' : ''}`}
              onClick={() => { window.SoundFX?.playClick(); setActiveTab('jokers'); }}
            >
              购买
            </div>
            <div
              className={`shop-tab ${activeTab === 'owned' ? 'active' : ''}`}
              onClick={() => { window.SoundFX?.playClick(); setActiveTab('owned'); }}
            >
              我的 ({ownedJokers.length})
            </div>
            <div
              className={`shop-tab ${activeTab === 'consumables' ? 'active' : ''}`}
              onClick={() => { window.SoundFX?.playClick(); setActiveTab('consumables'); }}
            >
              消耗品
            </div>
            <div
              className={`shop-tab ${activeTab === 'packs' ? 'active' : ''}`}
              onClick={() => { window.SoundFX?.playClick(); setActiveTab('packs'); }}
            >
              卡包
            </div>
          </div>

          <div className="shop-content">
            {activeTab === 'jokers' && (
              <div>
                 {availableJokers.map((joker, idx) => {
                   const owned = ownedJokerIds.includes(joker.id);
                   const price = getPrice(joker.price);
                   const canAfford = money >= price;
                   return (
                     <div key={joker.instanceId || idx} className="shop-item">
                       <div className="shop-item-icon" style={{
                         background: getRarityBg(joker.rarity),
                       }}>
                         {joker.emoji}
                       </div>
                       <div className="shop-item-info">
                         <div className="shop-item-name" style={{
                           color: getRarityColor(joker.rarity),
                         }}>
                           {joker.name}
                           <span style={{
                              marginLeft: '8px',
                              fontSize: '9px',
                              fontWeight: '900',
                              padding: '2px 6px',
                              border: '2px solid var(--pop-ink)',
                              borderRadius: '9999px',
                              background: getRarityBg(joker.rarity),
                              color: getRarityTextColor(joker.rarity),
                              verticalAlign: 'middle',
                            }}>
                              {rarityLabel(joker.rarity)}
                            </span>
                         </div>
                         <div className="shop-item-desc">{joker.desc}</div>
                       </div>
                       <button
                         className="shop-item-buy"
                         disabled={owned || !canAfford}
                          onClick={() => { window.SoundFX?.playClick(); onBuy({ ...joker, _displayPrice: price }); }}
                       >
                         {owned ? '已拥有' : `$${price}`}
                       </button>
                     </div>
                   );
                 })}
                {availableJokers.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 20px', opacity: 0.5 }}>
                    <div style={{ fontSize: '48px', marginBottom: '8px' }}>🎴</div>
                    <div style={{ fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      暂无商品
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'owned' && (
              <div>
                {ownedJokers.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 20px', opacity: 0.5 }}>
                    <div style={{ fontSize: '48px', marginBottom: '8px' }}>🃏</div>
                    <div style={{ fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      还没有小丑牌
                    </div>
                  </div>
                )}
                {ownedJokers.map((joker, idx) => {
                   const sellPrice = Math.max(1, Math.floor((joker.price || 4) / 2) * (1 + sellBonus));
                  return (
                    <div key={joker.instanceId || idx} className="shop-item">
                      <div className="shop-item-icon" style={{
                        background: getRarityBg(joker.rarity),
                      }}>
                        {joker.emoji}
                      </div>
                      <div className="shop-item-info">
                        <div className="shop-item-name" style={{
                          color: getRarityColor(joker.rarity),
                        }}>
                          {joker.name}
                          <span style={{
                             marginLeft: '8px',
                             fontSize: '9px',
                             fontWeight: '900',
                             padding: '2px 6px',
                             border: '2px solid var(--pop-ink)',
                             borderRadius: '9999px',
                             background: getRarityBg(joker.rarity),
                             color: getRarityTextColor(joker.rarity),
                             verticalAlign: 'middle',
                           }}>
                             {rarityLabel(joker.rarity)}
                           </span>
                        </div>
                        <div className="shop-item-desc">{joker.desc}</div>
                      </div>
                      <button
                        className="shop-item-buy"
                        style={{ background: 'var(--pop-red)', color: 'white' }}
                        onClick={() => { window.SoundFX?.playClick(); onSell(joker); }}
                      >
                        出售 ${sellPrice}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'consumables' && (
              <div>
                 {CONSUMABLES.map((item, idx) => {
                   const price = getPrice(item.price);
                   const canAfford = money >= price;
                   return (
                     <div key={idx} className="shop-item">
                       <div className="shop-item-icon" style={{ background: 'var(--pop-surface-warm)' }}>
                         {item.emoji}
                       </div>
                       <div className="shop-item-info">
                         <div className="shop-item-name">{item.name}</div>
                         <div className="shop-item-desc">{item.desc}</div>
                       </div>
                       <button
                         className="shop-item-buy"
                         style={{ background: 'var(--pop-blue)', color: 'white' }}
                         disabled={!canAfford}
                         onClick={() => { window.SoundFX?.playClick(); onBuy({ ...item, consumable: true, itemId: item.id, instanceId: `c_${Date.now()}_${idx}`, _displayPrice: price }); }}
                       >
                         ${price}
                       </button>
                     </div>
                   );
                 })}
              </div>
            )}

            {activeTab === 'packs' && (
              <div>
                 {PACKS.map((pack, idx) => {
                   const price = getPrice(pack.price);
                   const canAfford = money >= price;
                   return (
                     <div key={idx} className="shop-item">
                       <div className="shop-item-icon" style={{ background: 'var(--pop-yellow)' }}>
                         {pack.emoji}
                       </div>
                       <div className="shop-item-info">
                         <div className="shop-item-name">{pack.name}</div>
                         <div className="shop-item-desc">{pack.desc}</div>
                       </div>
                       <button
                         className="shop-item-buy"
                         style={{ background: 'var(--pop-red)', color: 'white' }}
                         disabled={!canAfford}
                         onClick={() => { window.SoundFX?.playClick(); onBuy({ ...pack, pack: true, packId: pack.id, instanceId: `p_${Date.now()}_${idx}`, _displayPrice: price }); }}
                       >
                         ${price}
                       </button>
                     </div>
                   );
                 })}
              </div>
            )}
          </div>

          <div className="shop-footer">
            <button className="pop-btn green" onClick={() => { window.SoundFX?.playClick(); onClose(); }} style={{ flex: 1 }}>
              下一关 →
            </button>
          </div>
        </div>
      </div>
    );
  }

  const CONSUMABLES = [
    { id: 'con_skip', name: '跳过牌', emoji: '⏭️', desc: '跳过下一个盲注', price: 5 },
    { id: 'con_reroll', name: '重抽牌', emoji: '🔄', desc: '重抽本回合手牌', price: 3 },
    { id: 'con_interest', name: '高利贷', emoji: '🏦', desc: '本关结束+5元利息', price: 2 },
    { id: 'con_heal', name: '续命符', emoji: '❤️', desc: '恢复一条生命', price: 8 },
  ];

  const PACKS = [
    { id: 'pack_basic', name: '基础卡包', emoji: '🎁', desc: '随机1张小丑牌', price: 6 },
    { id: 'pack_mega', name: '豪华卡包', emoji: '🎊', desc: '随机2张小丑牌', price: 12 },
    { id: 'pack_legend', name: '传说卡包', emoji: '👑', desc: '保底稀有以上', price: 20 },
  ];

  function getRarityBg(rarity) {
    const map = {
      common: 'white',
      uncommon: 'var(--pop-green)',
      rare: 'var(--pop-blue)',
      legendary: 'var(--pop-red)',
    };
    return map[rarity] || 'white';
  }

  function getRarityColor(rarity) {
    const map = {
      common: 'black',
      uncommon: 'green',
      rare: 'var(--pop-blue)',
      legendary: 'var(--pop-red)',
    };
    return map[rarity] || 'black';
  }

  function getRarityTextColor(rarity) {
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

  Object.assign(window, { Shop, CONSUMABLES, PACKS });
})();
