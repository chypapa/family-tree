(() => {
  const dialog = document.querySelector('.review-photos');
  const image = dialog.querySelector('.review-photos__image');
  const thumbnails = dialog.querySelector('.review-photos__thumbs');
  const triggers = Array.from(document.querySelectorAll('[data-review-photo]'));
  let current = 0;
  let touchStart;

  const buttons = triggers.map((trigger, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', 'Фотография ' + (index + 1));
    button.append(trigger.querySelector('img').cloneNode());
    button.addEventListener('click', () => show(index));
    thumbnails.append(button);
    trigger.addEventListener('click', () => {
      show(index);
      dialog.showModal();
    });
    return button;
  });

  function show(index) {
    current = (index + buttons.length) % buttons.length;
    const photo = buttons[current].querySelector('img');
    image.src = photo.src;
    image.alt = photo.alt;
    buttons.forEach((button, number) => {
      button.setAttribute('aria-current', number === current ? 'true' : 'false');
    });
  }

  dialog.querySelectorAll('[data-photo-step]').forEach(button => {
    button.addEventListener('click', () => show(current + Number(button.dataset.photoStep)));
  });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      show(current + (event.key === 'ArrowLeft' ? -1 : 1));
    }
  });
  image.addEventListener('touchstart', event => { touchStart = event.changedTouches[0].clientX; }, { passive: true });
  image.addEventListener('touchend', event => {
    const distance = event.changedTouches[0].clientX - touchStart;
    if (Math.abs(distance) > 45) show(current + (distance < 0 ? 1 : -1));
  }, { passive: true });
})();
