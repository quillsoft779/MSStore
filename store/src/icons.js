// Line illustrations in the same style as the shop website (32-unit grid).
export const ICONS = {
  wire: '<circle cx="16" cy="16" r="11"/><circle cx="16" cy="16" r="6.5"/><circle cx="16" cy="16" r="2"/><path d="M27 16h4"/>',
  switch: '<rect x="5" y="5" width="22" height="22" rx="3"/><rect x="12" y="9" width="8" height="14" rx="1.5"/><path d="M12 16h8"/>',
  breaker: '<rect x="9" y="3" width="14" height="26" rx="2"/><rect x="13" y="9" width="6" height="8" rx="1"/><path d="M16 21v4"/>',
  bulb: '<path d="M16 3a9 9 0 0 0-5.5 16.1V22h11v-2.9A9 9 0 0 0 16 3z"/><path d="M12 25.5h8M13.5 29h5"/>',
  tap: '<path d="M4 12h14a5 5 0 0 1 5 5v3"/><path d="M4 16h12a3 3 0 0 1 3 3v1"/><path d="M10 7h6M13 7v5"/><path d="M21 24.5c0 1.4 1 2.5 1 2.5s1-1.1 1-2.5-1-2.5-1-2.5-1 1.1-1 2.5z"/>',
  basin: '<path d="M3 13h26a13 9 0 0 1-26 0z"/><path d="M16 22v6M11 28h10"/><path d="M16 13V8h4"/>',
  pipe: '<path d="M4 7h11a10 10 0 0 1 10 10v11"/><path d="M4 14h11a3 3 0 0 1 3 3v11"/><path d="M4 5v11M16 28h11"/>',
  drop: '<path d="M16 4c5 7 8 11 8 15a8 8 0 0 1-16 0c0-4 3-8 8-15z"/><path d="M12.5 19a3.5 3.5 0 0 0 3.5 3.5"/>',
  wrench: '<path d="M21 3.5a6.5 6.5 0 0 0-6 8.9L4.5 23l4.5 4.5 10.6-10.5A6.5 6.5 0 0 0 28.5 11l-4.2 1.2-3-3L22.5 5z"/>',
  screw: '<path d="M11 3h10v5H11z"/><path d="M13 8v14l3 7 3-7V8"/><path d="M13 12l6 2M13 16.5l6 2"/>',
  tape: '<circle cx="15" cy="16" r="11"/><circle cx="15" cy="16" r="4.5"/><path d="M26 16h3v6"/>',
  lock: '<rect x="7" y="14" width="18" height="15" rx="2"/><path d="M11 14V9a5 5 0 0 1 10 0v5"/><path d="M16 20v4"/>',
  box: '<path d="M4 10l12-6 12 6v12l-12 6-12-6z"/><path d="M4 10l12 6 12-6M16 16v12"/>'
};

export const ICON_KEYS = Object.keys(ICONS);

export const icon = (key, cls = "ico") =>
  `<svg class="${cls}" viewBox="0 0 32 32" aria-hidden="true">${ICONS[key] || ICONS.box}</svg>`;

export const MARK = `<svg class="mark" viewBox="0 0 120 120" aria-hidden="true"><rect width="120" height="120" rx="28" fill="#16150f"/><circle cx="38" cy="88" r="10" fill="#ece6d8"/><circle cx="82" cy="88" r="10" fill="#ece6d8"/><path d="M60 22C60 22 44 41 44 53a16 16 0 0 0 32 0C76 41 60 22 60 22Z" fill="#f3c623"/></svg>`;
