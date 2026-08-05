// ========== 小丑牌组件 ==========
(function() {
  function JokerCard({ joker, onClick, showPrice = false, disabled = false, small = false }) {
    const rarityColors = {
      common: { bg: 'white', fg: 'black', label: '普' },
      uncommon: { bg: 'var(--pop-green)', fg: 'black', label: '精' },
      rare: { bg: 'var(--pop-blue)', fg: 'white', label: '稀' },
      legendary: { bg: 'var(--pop-red)', fg: 'white', label: '传' },
    };

    const rarity = rarityColors[joker.rarity] || rarityColors.common;

    return (
      <div
        className={`joker-card ${disabled ? 'disabled' : ''} ${small ? 'joker-small' : ''}`}
        onClick={disabled ? undefined : onClick}
        style={disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
        title={joker.name + ' - ' + joker.desc}
      >
        <div className="joker-rarity" style={{ background: rarity.bg, color: rarity.fg }}>
          {rarity.label}
        </div>
        <div className="joker-emoji">{joker.emoji}</div>
        <div className="joker-name">{joker.name}</div>
        <div className="joker-effect">{joker.desc}</div>
        {showPrice && (
          <div style={{
            marginTop: '4px',
            fontSize: '10px',
            fontWeight: '900',
            color: 'var(--pop-red)',
            textTransform: 'uppercase',
          }}>
            ${joker.price}
          </div>
        )}
      </div>
    );
  }

  Object.assign(window, { JokerCard });
})();
