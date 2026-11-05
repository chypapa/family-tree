(() => {
  const card = document.querySelector('.review--expandable');
  if (!card) return;
  const text = card.querySelector('.review__text');
  const button = card.querySelector('.review__toggle');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let expanded = false;
  let animation;

  function collapsedHeight() {
    return parseFloat(getComputedStyle(text).lineHeight) * 7;
  }

  function updateHeight() {
    text.style.height = (expanded ? text.scrollHeight : collapsedHeight()) + 'px';
  }

  button.hidden = false;
  updateHeight();
  button.addEventListener('click', () => {
    const from = text.getBoundingClientRect().height;
    if (animation) animation.cancel();
    expanded = !expanded;
    button.setAttribute('aria-expanded', String(expanded));
    button.textContent = expanded ? 'Свернуть' : 'Читать далее';
    updateHeight();
    if (!reducedMotion.matches) {
      animation = text.animate(
        [{ height: from + 'px' }, { height: text.style.height }],
        { duration: 280, easing: 'cubic-bezier(.2, .75, .15, 1)' }
      );
    }
  });
  new ResizeObserver(updateHeight).observe(card);
  document.fonts.ready.then(updateHeight);
})();
