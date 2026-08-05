// ========== 麻将牌组件 ==========
(function() {
  const { useState } = React;

  function MahjongTile({ tile, selected, onClick, size = 'normal', inPlay = false }) {
    const sizeClass = size === 'small' ? 'tile-small' : '';
    const suitClass = `tile-${tile.suit}`;
    const selectedClass = selected ? 'selected' : '';
    const playClass = inPlay ? 'in-play' : '';

    // 获取显示内容
    const displayValue = getTileDisplay(tile);

    return (
      <div
        className={`mahjong-tile ${sizeClass} ${suitClass} ${selectedClass} ${playClass}`}
        onClick={onClick}
        data-tile-id={tile.id}
      >
        <div className="tile-value">{displayValue.symbol}</div>
        <div className={`tile-suit ${tile.suit}`}>{displayValue.label}</div>
      </div>
    );
  }

  function getTileDisplay(tile) {
    switch (tile.suit) {
      case 'wan':
        return { symbol: tile.value, label: '万' };
      case 'tiao':
        return { symbol: tile.value, label: '条' };
      case 'tong':
        return { symbol: tile.value, label: '筒' };
      case 'feng':
        return { symbol: tile.value, label: '风' };
      case 'jian':
        return { symbol: tile.value, label: '箭' };
      default:
        return { symbol: tile.value, label: '' };
    }
  }

  Object.assign(window, { MahjongTile });
})();
