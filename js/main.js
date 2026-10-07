(function () {
  'use strict';

  /* ---------- Вступление: знак рисуется по центру экрана → переезжает на своё место в шапке →
     экран загрузки растворяется, появляются меню и первый экран ---------- */
  (function () {
    var root = document.documentElement;
    var pre = document.querySelector('.preloader');
    var marks = Array.prototype.slice.call(document.querySelectorAll('.logo-mark'));
    var ready = function () {
      marks.forEach(function (m) {
        var svg = m.querySelector('.mark');
        svg.classList.remove('play');
        svg.classList.add('done');
      });
      root.classList.add('is-ready');
      setTimeout(function () { if (pre) pre.remove(); }, 1470);
    };
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var logo = marks.filter(function (m) { return m.offsetParent !== null; })[0];   // видимый знак: в шапке или в мобильной плашке
    if (reduce || !pre || !logo || !window.Promise) { ready(); return; }
    try {
      var r = logo.getBoundingClientRect();
      var size = Math.min(window.innerWidth * 0.42, window.innerHeight * 0.34, 260);  // высота знака по центру экрана
      var s = size / r.height;
      var dx = window.innerWidth / 2 - (r.left + r.width / 2);
      var dy = window.innerHeight / 2 - (r.top + r.height / 2);
      logo.style.color = '#a53625';
      logo.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')';
      void logo.offsetWidth;
      logo.querySelector('.mark').classList.add('play');     // 1. рисуется контур, затем заливка (около 1,7 с)

      var drawn = new Promise(function (res) { setTimeout(res, 1770); });
      var loaded = new Promise(function (res) {
        if (document.readyState === 'complete') res(); else window.addEventListener('load', res, { once: true });
        setTimeout(res, 5000);                                // медленный интернет — не ждём дольше 5 с
      });
      Promise.all([drawn, loaded]).then(function () {
        // 2. знак уезжает вверх-в сторону на своё место и становится белым
        logo.style.transition = 'transform .87s cubic-bezier(.75, 0, .2, 1), color .67s ease .13s';
        logo.style.transform = '';
        logo.style.color = '';
        ready();                                              // 3. экран растворяется, появляются меню и первый экран
        setTimeout(function () { logo.style.transition = ''; }, 940);
      });
    } catch (e) { ready(); }
  })();

  /* ---------- Шапка без заливки над первым экраном; при прокрутке заливка появляется.
     Первый экран при прокрутке: фото чуть приближается, текст уходит вверх и гаснет ---------- */
  var topHeader = document.querySelector('.header--sticky');
  var opening = document.querySelector('.opening');
  if (topHeader) {
    var openingMotion = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var topTicking = false;
    var updateTop = function () {
      topTicking = false;
      var y = window.scrollY;
      topHeader.classList.toggle('is-top', !!opening && y <= 40);
      if (opening && openingMotion) {
        opening.style.setProperty('--hp', Math.min(1, Math.max(0, y / window.innerHeight)).toFixed(3));
      }
    };
    window.addEventListener('scroll', function () {
      if (!topTicking) { topTicking = true; requestAnimationFrame(updateTop); }
    }, { passive: true });
    window.addEventListener('resize', updateTop);
    updateTop();
  }

  /* ---------- Мобильное меню: бургер превращается в крестик, панель выезжает справа ---------- */
  var burger = document.querySelector('.header__burger');
  var drawer = burger && document.getElementById(burger.getAttribute('aria-controls'));
  if (burger && drawer) {
    var setMenu = function (open) {
      document.documentElement.classList.toggle('is-menu-open', open);
      drawer.classList.toggle('is-open', open);
      drawer.setAttribute('aria-hidden', String(!open));
      if ('inert' in drawer) drawer.inert = !open;
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    };
    setMenu(false);
    burger.addEventListener('click', function (e) {
      e.stopPropagation();
      setMenu(!drawer.classList.contains('is-open'));
    });
    drawer.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);              // перешли по пункту — меню закрывается
    });
    document.addEventListener('click', function (e) {
      if (drawer.classList.contains('is-open') && !drawer.contains(e.target)) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setMenu(false);
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 1024) setMenu(false);
    });
  }

  /* ---------- Бегущая лента: едет сама, можно тянуть мышкой / пальцем ---------- */
  var marquee = document.querySelector('.marquee');
  if (marquee) {
    var track = marquee.querySelector('.marquee__track');
    var cards = track.children;
    var half = cards.length / 2;                 // вторая половина — копия набора
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var period = 0, autoV = 0, x = 0, v = 0;
    var dragging = false, lastX = 0, lastT = 0, dragV = 0, prevT = performance.now();

    var measure = function () {
      period = cards[half].offsetLeft - cards[0].offsetLeft;
      var duration = parseFloat(getComputedStyle(marquee).getPropertyValue('--duration')) || 102;
      autoV = reduceMotion.matches ? 0 : -period / duration;   // px/с, минус — влево
    };

    var frame = function (t) {
      var dt = Math.min((t - prevT) / 1000, 0.05);
      prevT = t;
      if (!dragging) {
        v += (autoV - v) * Math.min(1, dt * 1.5);  // после броска плавно возвращаемся к обычной скорости
        x += v * dt;
      }
      if (period > 0) x = ((x % period) - period) % period;  // держим x в (-period, 0] — бесшовный круг
      track.style.transform = 'translate3d(' + x + 'px, 0, 0)';
      requestAnimationFrame(frame);
    };

    marquee.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      dragging = true;
      lastX = e.clientX;
      lastT = e.timeStamp;
      dragV = 0;
      marquee.setPointerCapture(e.pointerId);
      marquee.classList.add('is-dragging');
    });
    marquee.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - lastX;
      var dt = (e.timeStamp - lastT) / 1000;
      x += dx;
      if (dt > 0) dragV = dragV * 0.5 + (dx / dt) * 0.5;
      lastX = e.clientX;
      lastT = e.timeStamp;
    });
    var release = function (e) {
      if (!dragging) return;
      dragging = false;
      marquee.classList.remove('is-dragging');
      if (e.timeStamp - lastT > 100) dragV = 0;  // палец остановился перед отпусканием — без броска
      v = Math.max(-4000, Math.min(4000, dragV));
    };
    marquee.addEventListener('pointerup', release);
    marquee.addEventListener('pointercancel', release);

    measure();
    v = autoV;
    window.addEventListener('resize', measure);
    marquee.classList.add('marquee--js');
    requestAnimationFrame(frame);
  }

  /* ---------- Фото с ореолом фокуса («Найдём историю»): фото чёткое;
     курсор над фото — оно размывается, а вокруг курсора остаётся в фокусе ---------- */
  var smoothFocus = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.focus__card').forEach(function (focusCard) {
    var fx = 0, fy = 0, tx = 0, ty = 0, lastX = 0, lastY = 0, fRaf = 0, hideTimer = 0;
    var place = function () {
      focusCard.style.setProperty('--mx', fx.toFixed(1) + 'px');
      focusCard.style.setProperty('--my', fy.toFixed(1) + 'px');
    };
    // ореол догоняет курсор с лёгкой задержкой — движение мягче
    var follow = function () {
      fx += (tx - fx) * 0.2;
      fy += (ty - fy) * 0.2;
      place();
      fRaf = (Math.abs(tx - fx) > 0.5 || Math.abs(ty - fy) > 0.5) ? requestAnimationFrame(follow) : 0;
    };
    var aim = function () {
      var r = focusCard.getBoundingClientRect();
      tx = lastX - r.left;
      ty = lastY - r.top;
      if (!focusCard.classList.contains('is-focus') || !smoothFocus) {   // ореол появляется сразу под курсором
        fx = tx; fy = ty; place();
        focusCard.classList.add('is-focus');
        return;
      }
      if (!fRaf) fRaf = requestAnimationFrame(follow);
    };
    var onMove = function (e) {
      clearTimeout(hideTimer);
      lastX = e.clientX;
      lastY = e.clientY;
      aim();
    };
    focusCard.addEventListener('pointerenter', onMove);
    focusCard.addEventListener('pointermove', onMove);
    focusCard.addEventListener('pointerdown', onMove);
    focusCard.addEventListener('pointerleave', function (e) {
      // на телефоне палец «уходит» сразу после касания — даём ореолу побыть секунду
      var delay = e.pointerType === 'touch' ? 1200 : 0;
      hideTimer = setTimeout(function () { focusCard.classList.remove('is-focus'); }, delay);
    });
    // страницу прокрутили, а курсор стоит на месте — ореол остаётся под курсором
    window.addEventListener('scroll', function () {
      if (focusCard.classList.contains('is-focus')) aim();
    }, { passive: true });
  });

  /* ---------- Карточки-ссылки (.has-cursor: услуги и первый блог): курсор над карточкой — красный круг ---------- */
  // только для мыши: на телефоне круга нет, карточка — обычная ссылка
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.has-cursor').forEach(function (card) {
      var lastX = 0, lastY = 0;
      var put = function () {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--cx', (lastX - r.left).toFixed(1) + 'px');
        card.style.setProperty('--cy', (lastY - r.top).toFixed(1) + 'px');
      };
      var onMove = function (e) { lastX = e.clientX; lastY = e.clientY; put(); };
      card.addEventListener('pointerenter', function (e) {
        onMove(e);                                // круг появляется в точке входа и плавно вырастает
        card.classList.add('is-cursor');
      });
      card.addEventListener('pointermove', onMove);
      card.addEventListener('pointerleave', function () { card.classList.remove('is-cursor'); });
      // страницу прокрутили, а мышь стоит на месте — круг остаётся под курсором
      window.addEventListener('scroll', function () {
        if (card.classList.contains('is-cursor')) put();
      }, { passive: true });
    });
  }

  /* ---------- Древо: при прокрутке листва «заливает» голые ветви сверху вниз, край неровный, как чернила ---------- */
  var ink = document.querySelector('.inkswap__frame');
  if (ink) {
    var inkSvg = ink.querySelector('.inkswap__svg');
    var inkImage = inkSvg.querySelector('image');
    var inkFill = inkSvg.querySelector('.inkswap__fill');
    var inkEdge = inkSvg.querySelector('.inkswap__edge');
    var inkFilter = inkSvg.querySelector('filter');
    var inkMask = inkSvg.querySelector('mask');
    var INK_EXT = 200;                                 // маска шире рисунка — по бокам края не видно

    var inkW = 3881, inkP = 0, inkTarget = 0, inkRaf = 0;

    // p: 0 — видны только голые ветви, 1 — рисунок полностью в листве
    var drawInk = function (p) {
      var y = -150 + p * 1280;                         // край по бокам: от −150 (за верхом) до 1130 (ниже низа)
      var c = y * 1.25;                                // посередине край выгнут вниз, как в образце
      // шум сдвигает край максимум на 110 единиц, поэтому фильтр считаем только в полосе у края,
      // а всё, что выше, заливаем сплошным прямоугольником без фильтра — так эффект не тормозит
      var top = y - 240;
      var L = -INK_EXT, R = inkW + INK_EXT;
      inkFill.setAttribute('height', Math.max(0, y - 120 + 400).toFixed(1));
      inkEdge.setAttribute('d', 'M ' + L + ' ' + y.toFixed(1) + ' Q ' + (inkW / 2) + ' ' + c.toFixed(1) + ' ' + R + ' ' + y.toFixed(1) +
        ' L ' + R + ' ' + top.toFixed(1) + ' L ' + L + ' ' + top.toFixed(1) + ' Z');
      inkFilter.setAttribute('y', (top - 120).toFixed(0));
      inkFilter.setAttribute('height', ((y + c) / 2 - top + 250).toFixed(0));
    };

    // система координат маски повторяет пропорции блока: высота всегда 1000, ширина — по размеру блока
    var layoutInk = function () {
      var r = ink.getBoundingClientRect();
      if (!r.width || !r.height) return;
      inkW = Math.round(1000 * r.width / r.height);
      inkSvg.setAttribute('viewBox', '0 0 ' + inkW + ' 1000');
      inkImage.setAttribute('width', inkW);
      [inkMask, inkFill].forEach(function (el) {
        el.setAttribute('x', -INK_EXT);
        el.setAttribute('width', inkW + 2 * INK_EXT);
      });
      inkFilter.setAttribute('x', -130);               // по бокам фильтру хватает запаса на сдвиг шумом
      inkFilter.setAttribute('width', inkW + 260);
      drawInk(inkP);
    };

    // заливка начинается, когда рисунок наполовину показался снизу, и заканчивается,
    // когда он поднялся до четверти высоты окна (или страница докручена до конца)
    var inkProgress = function () {
      var r = ink.getBoundingClientRect();
      var vh = window.innerHeight;
      var maxScroll = document.documentElement.scrollHeight - vh;
      var topAtEnd = r.top + window.scrollY - maxScroll;      // где будет верх рисунка в самом низу страницы
      var startTop = vh - r.height * 0.5;
      var endTop = Math.max(topAtEnd + 20, vh * 0.25);
      if (startTop - endTop < 80) endTop = startTop - 80;
      return Math.max(0, Math.min(1, (startTop - r.top) / (startTop - endTop)));
    };

    var inkFrame = function () {
      inkP += (inkTarget - inkP) * 0.25;                       // лёгкое сглаживание — край «течёт», а не прыгает
      if (Math.abs(inkTarget - inkP) < 0.001) inkP = inkTarget;
      drawInk(inkP);
      inkRaf = inkP !== inkTarget ? requestAnimationFrame(inkFrame) : 0;
    };
    var inkUpdate = function () {
      inkTarget = inkProgress();
      if (!inkRaf) inkRaf = requestAnimationFrame(inkFrame);
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      inkP = inkTarget = 1;                                   // без анимации — сразу рисунок в листве
      layoutInk();
      window.addEventListener('resize', layoutInk);
    } else {
      inkP = inkTarget = inkProgress();
      layoutInk();
      window.addEventListener('scroll', inkUpdate, { passive: true });
      window.addEventListener('resize', function () { layoutInk(); inkUpdate(); });
    }
  }

  /* ---------- Заголовки H2: каждая строка выезжает снизу из-под своей нижней границы, когда заголовок
     появляется на экране (один раз). Строки размечаются по тому, как браузер реально перенёс слова,
     и заново — при смене ширины окна. На прокрутку не влияет; при «уменьшить движение» всё видно сразу ---------- */
  (function () {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    // у заголовка блока «О нас» два варианта текста (для широкого экрана и для телефона) — размечаем каждый
    var targets = [];
    document.querySelectorAll('h2').forEach(function (h) {
      if (h.closest('[hidden], .opening')) return;
      var parts = h.querySelectorAll(':scope > span');
      if (parts.length) parts.forEach(function (p) { targets.push({ el: p, root: h }); });
      else targets.push({ el: h, root: h });
    });
    if (!targets.length) return;

    var esc = function (t) { return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
    var split = function (el) {
      el.innerHTML = el.getAttribute('data-text-src');
      var words = [];
      Array.prototype.slice.call(el.childNodes).forEach(function (node) {
        if (node.nodeType !== 3) return;
        var frag = document.createDocumentFragment();
        node.nodeValue.split(/([ \t\n\r]+)/).forEach(function (part) {
          if (!part) return;
          if (/^[ \t\n\r]+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          var w = document.createElement('span');
          w.textContent = part;
          frag.appendChild(w);
          words.push(w);
        });
        el.replaceChild(frag, node);
      });
      if (!words.length || !words[0].offsetParent) return;          // скрыт (другой вариант заголовка) — разметим при показе
      var lines = [], top = null;
      words.forEach(function (w) {
        var t = w.offsetTop;
        if (top === null || Math.abs(t - top) > 2) { lines.push([]); top = t; }
        lines[lines.length - 1].push(w.textContent);
      });
      el.innerHTML = lines.map(function (line, i) {
        return '<span class="tl"><span class="tl__in" style="--i:' + i + '">' + esc(line.join(' ')) + '</span></span>';
      }).join('');
    };

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.2 });

    targets.forEach(function (t) {
      t.el.setAttribute('data-text-src', t.el.innerHTML);
      t.el.classList.add('text-lines');
      split(t.el);
      io.observe(t.root === t.el ? t.el : t.root);
    });
    // у составного заголовка класс is-in ставится на сам h2 — передаём его частям
    targets.forEach(function (t) {
      if (t.root === t.el) return;
      new MutationObserver(function () {
        if (t.root.classList.contains('is-in')) t.el.classList.add('is-in');
      }).observe(t.root, { attributes: true, attributeFilter: ['class'] });
    });

    var lastW = window.innerWidth, timer = 0;
    var resplit = function () { targets.forEach(function (t) { split(t.el); }); };
    window.addEventListener('resize', function () {
      if (window.innerWidth === lastW) return;
      lastW = window.innerWidth;
      clearTimeout(timer);
      timer = setTimeout(resplit, 150);
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(resplit);   // шрифт догрузился — переносы могли сдвинуться
  })();

  /* ---------- «Этапы работы»: когда блок доходит до экрана, он останавливается и занимает весь экран под шапкой
     (position: sticky, лента по центру по высоте) — остальная страница в это время стоит на месте. Прокрутка вниз
     сдвигает карточки вбок ровно на столько, на сколько прокрутили; после последней карточки страница снова
     прокручивается как обычно. Не помещается в экран по высоте — обычная лента с прокруткой вбок ---------- */
  document.querySelectorAll('.stages').forEach(function (section) {
    var pin = section.querySelector('.stages__pin');
    var track = section.querySelector('.stages__track');
    if (!pin || !track) return;
    var top = 0, shift = 0, active = false, ticking = false;

    var layout = function () {
      section.style.height = '';
      pin.style.height = '';
      pin.style.top = '';
      track.style.transform = '';
      section.classList.remove('is-pinned');
      var vh = window.innerHeight;
      var hdr = document.querySelector('.header--sticky');
      top = hdr ? Math.max(0, hdr.getBoundingClientRect().height + (parseFloat(getComputedStyle(hdr).top) || 0)) : 0;
      var avail = vh - top;                               // экран под шапкой
      shift = Math.max(0, track.scrollWidth - section.clientWidth);
      active = shift > 0 && pin.offsetHeight + 32 <= avail;
      if (!active) return;
      section.classList.add('is-pinned');
      pin.style.top = top + 'px';
      pin.style.height = avail + 'px';
      section.style.height = (avail + shift) + 'px';
      update();
    };
    var update = function () {
      ticking = false;
      if (!active) return;
      var p = Math.min(1, Math.max(0, (top - section.getBoundingClientRect().top) / shift));
      track.style.transform = 'translate3d(' + (-p * shift).toFixed(1) + 'px,0,0)';
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', layout);
    window.addEventListener('load', layout);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
    layout();
  });

  /* ---------- Видео на первом экране: при «уменьшить движение» не крутим, показываем первый кадр ---------- */
  document.querySelectorAll('.opening__video').forEach(function (v) {
    var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    var apply = function () {
      if (mq.matches) { v.pause(); v.removeAttribute('autoplay'); }
      else { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    };
    apply();
    if (mq.addEventListener) mq.addEventListener('change', apply);
  });

  /* ---------- Видеоотзыв: по кнопке ▶ видео запускается в карточке со своими кнопками управления ---------- */
  document.querySelectorAll('.voice__video').forEach(function (box) {
    var video = box.querySelector('video');
    var play = box.querySelector('.voice__play');
    if (!video || !play) return;
    // файла ещё нет или он не открылся — возвращаем обложку с подписью «Видео скоро появится»
    var fail = function () { box.classList.remove('is-playing'); video.controls = false; box.classList.add('is-missing'); };
    var source = video.querySelector('source');
    if (source) source.addEventListener('error', fail);
    video.addEventListener('error', fail);
    play.addEventListener('click', function () {
      box.classList.add('is-playing');
      video.controls = true;
      var p = video.play();
      if (p && p.catch) p.catch(function (err) { if (err && err.name !== 'AbortError') fail(); });
    });
  });

  /* ---------- Блог: последние посты из группы ВКонтакте ---------- */
  // лент с постами может быть несколько (основной блог и вариант с карточками) — заполняем каждую,
  // а один и тот же адрес запрашиваем один раз
  var vkRequests = {};
  if (window.fetch && /^https?:$/.test(location.protocol)) {
    document.querySelectorAll('[data-vk-blog]').forEach(function (blog) {
      var blogCards = blog.querySelectorAll('.post');
      blog.classList.add('is-loading');

      var fillCard = function (card, post, isMain) {
        var img = card.querySelector('.post__img');
        var title = card.querySelector('.post__title');
        var desc = card.querySelector('.post__desc');
        var link = card.querySelector('.post__link');
        img.src = isMain ? post.image : (post.image_small || post.image);
        img.alt = post.title;
        img.referrerPolicy = 'no-referrer';
        title.textContent = post.title;
        desc.textContent = post.text || '';
        desc.hidden = !post.text;
        link.href = post.url;
        link.target = '_blank';
        link.rel = 'noopener';
      };

      var vkUrl = blog.getAttribute('data-vk-blog');
      vkRequests[vkUrl] = vkRequests[vkUrl] || fetch(vkUrl, { headers: { Accept: 'application/json' } })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); });
      vkRequests[vkUrl]
        .then(function (data) {
          var posts = (data && data.posts) || [];
          if (!posts.length) return;                 // постов нет — оставляем заготовки
          blogCards.forEach(function (card, i) {
            if (posts[i]) fillCard(card, posts[i], i === 0);
            else card.hidden = true;                 // постов меньше, чем карточек
          });
        })
        .catch(function (err) {
          if (window.console) console.warn('Блог ВК: посты не загрузились (' + err + '), показаны заготовки');
        })
        .then(function () { blog.classList.remove('is-loading'); });
    });
  }

  /* ---------- Форма ---------- */
  var form = document.querySelector('.form');
  if (form) {
    var contact = form.querySelector('[name="contact"]');
    var agree = form.querySelector('[name="agree"]');
    var note = form.querySelector('.form__note');

    [contact, agree].forEach(function (el) {
      el.addEventListener('input', function () { el.classList.remove('is-invalid'); });
      el.addEventListener('change', function () { el.classList.remove('is-invalid'); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      if (!contact.value.trim()) { contact.classList.add('is-invalid'); ok = false; }
      if (!agree.checked) { agree.classList.add('is-invalid'); ok = false; }

      if (!ok) {
        note.textContent = !contact.value.trim()
          ? 'Укажите телефон, почту или мессенджер.'
          : 'Подтвердите согласие с политикой конфиденциальности.';
        return;
      }

      // Здесь подключается отправка на сервер (fetch / CRM / почта).
      note.textContent = 'Спасибо! Мы свяжемся с вами в ближайшее время.';
      form.reset();
    });
  }
})();
