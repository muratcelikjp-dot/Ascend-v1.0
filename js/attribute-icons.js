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
    strength: `<span class="attribute-glyph attribute-strength-glyph" aria-hidden="true"><img src="icons/attribute-strength-logo.jpg" alt=""></span>`,
    charisma: `<span class="attribute-glyph attribute-charisma-glyph" aria-hidden="true"><img src="icons/attribute-charisma-logo.png" alt=""></span>`,
    willpower: `<span class="attribute-glyph attribute-willpower-glyph" aria-hidden="true"><img src="icons/attribute-willpower-logo.png" alt=""></span>`
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
