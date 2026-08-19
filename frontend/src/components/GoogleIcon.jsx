import React from 'react';

/**
 * GoogleIcon Component
 * Renders high-quality Google Material Symbols (Rounded / Outlined)
 * 
 * @param {string} name - Material Symbol icon name (e.g., 'payments', 'account_balance')
 * @param {'rounded'|'outlined'} variant - Icon style variant
 * @param {number} size - Font size in pixels (default: 20)
 * @param {boolean} filled - Whether icon is solid filled (default: false)
 * @param {number} weight - Font weight 100-700 (default: 500)
 * @param {string} className - Additional Tailwind or CSS classes
 * @param {object} style - Inline styles
 */
export default function GoogleIcon({
  name,
  variant = 'rounded',
  size = 20,
  filled = false,
  weight = 500,
  className = '',
  style = {},
  ...props
}) {
  const fontClass = variant === 'outlined' ? 'material-symbols-outlined' : 'material-symbols-rounded';

  const variationStyles = {
    fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' ${Math.min(48, Math.max(20, size))}`,
    fontSize: `${size}px`,
    width: `${size}px`,
    height: `${size}px`,
    ...style,
  };

  return (
    <span
      className={`${fontClass} inline-flex items-center justify-center select-none shrink-0 ${className}`}
      style={variationStyles}
      aria-hidden="true"
      {...props}
    >
      {name}
    </span>
  );
}
