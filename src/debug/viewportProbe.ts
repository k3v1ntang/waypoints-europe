// TEMPORARY diagnostic overlay (2026-07-05) - remove after the iOS 26
// standalone bottom-inset investigation. Prints the viewport numbers the
// bottom-bar/attribution anchoring depends on, so we can tell whether
// env(safe-area-inset-bottom) is misreported by iOS in standalone mode or
// whether our two bottom anchors (fixed bar vs in-map attribution)
// resolve against different heights.

export function mountViewportProbe() {
  // env() can't be read from JS directly - stamp it onto a hidden probe
  // element as padding and read the computed pixel value back.
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;visibility:hidden;pointer-events:none;' +
    'padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);';

  const panel = document.createElement('div');
  panel.style.cssText =
    'position:fixed;top:80px;left:8px;z-index:99999;pointer-events:none;' +
    'background:rgba(0,0,0,0.78);color:#4ade80;font:11px/1.6 Menlo,monospace;' +
    'padding:8px 10px;border-radius:8px;white-space:pre;';

  document.body.append(probe, panel);

  const update = () => {
    const cs = getComputedStyle(probe);
    const moreButton = document.querySelector('[aria-label="More actions"]');
    const attrib = document.querySelector('.maplibregl-ctrl-attrib');
    const barRect = moreButton?.getBoundingClientRect();
    const attribRect = attrib?.getBoundingClientRect();
    const ih = window.innerHeight;
    panel.textContent = [
      `standalone : ${matchMedia('(display-mode: standalone)').matches}`,
      `env top/btm: ${cs.paddingTop} / ${cs.paddingBottom}`,
      `innerH     : ${ih}`,
      `html.clntH : ${document.documentElement.clientHeight}`,
      `screenH    : ${screen.height}   dpr ${devicePixelRatio}`,
      `vv h/top   : ${window.visualViewport?.height ?? '-'} / ${window.visualViewport?.offsetTop ?? '-'}`,
      `bar botGap : ${barRect ? (ih - barRect.bottom).toFixed(1) : '-'}  (⋯ btn → innerH bottom)`,
      `attr botGap: ${attribRect ? (ih - attribRect.bottom).toFixed(1) : '-'}  (ⓘ → innerH bottom)`
    ].join('\n');
  };

  update();
  setInterval(update, 1000);
}
