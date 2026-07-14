const AttributeIcons = (function () {
  const assets = {
    intelligence: `<svg class="attribute-glyph" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <g fill="none" stroke="#62ecff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
        <path d="M30 14c-3-5-12-4-14 2-6 0-9 8-5 12-5 5-2 13 4 15-1 7 8 11 13 6l4-4V18c0-2-1-3-2-4Z"/>
        <path d="M34 14c3-5 12-4 14 2 6 0 9 8 5 12 5 5 2 13-4 15 1 7-8 11-13 6l-4-4V18c0-2 1-3 2-4Z"/>
        <path d="M13 28h9l6 6M15 43h8l5-5M51 28h-9l-6 6M49 43h-8l-5-5"/>
      </g>
      <g fill="#c4f8ff">
        <circle cx="28" cy="34" r="2.7"/><circle cx="28" cy="38" r="2.7"/>
        <circle cx="36" cy="34" r="2.7"/><circle cx="36" cy="38" r="2.7"/>
      </g>
    </svg>`,
    strength: `<svg class="attribute-glyph" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <path fill="#4be0a7" stroke="#a9ffdf" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M9 48c5-8 9-16 12-25l2-10 9-4 8 5-2 10c8-4 17-1 20 7 4 11-7 22-21 24H17c-7 0-11-3-8-7Z"/>
      <g fill="#073b32" stroke="#baffea" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
        <path d="m20 25 9 5-8 9-7-3Z"/><path d="m29 30 9-6 8 5-8 8Z"/>
        <path d="m21 39 10-4 7 2-4 9H19Z"/><path d="m38 37 11-6 6 4-7 9-14 2Z"/>
      </g>
      <path fill="none" stroke="#e0fff3" stroke-width="2.5" stroke-linecap="round" d="M17 50h20c8-1 14-5 17-11"/>
    </svg>`
  };

  function markup(attributeId, fallbackIcon) {
    const asset = assets[attributeId];
    if (asset) {
      return asset;
    }
    return '<i class="ti ' + (fallbackIcon || "ti-bolt") + '" aria-hidden="true"></i>';
  }

  return { assets, markup };
})();

if (typeof window !== "undefined") window.AttributeIcons = AttributeIcons;
