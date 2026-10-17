// Flash-free theme: apply the stored theme before first paint (plans/01 §5.1).
// A classic blocking script (not inline) so the CSP can forbid inline scripts.
try {
  const t = localStorage.getItem('code-nybbles:theme')
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t
} catch {}
