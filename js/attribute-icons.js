const AttributeIcons = (function () {
  const assets = {
    intelligence: "icons/attribute-intelligence.svg",
    strength: "icons/attribute-strength.svg"
  };

  function markup(attributeId, fallbackIcon) {
    const asset = assets[attributeId];
    if (asset) {
      return '<img class="attribute-glyph" src="' + asset + '" alt="" aria-hidden="true">';
    }
    return '<i class="ti ' + (fallbackIcon || "ti-bolt") + '" aria-hidden="true"></i>';
  }

  return { assets, markup };
})();

if (typeof window !== "undefined") window.AttributeIcons = AttributeIcons;
