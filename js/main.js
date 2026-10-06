(function () {
  'use strict';

  /* ---------- Плавная прокрутка колесом / тачпадом (Lenis) ---------- */
  // Без библиотеки или при «уменьшить движение» остаётся обычная прокрутка + CSS scroll-behavior для якорей.
  if (window.Lenis && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var headerEl = document.querySelector('.header--sticky');
    var lenis = new Lenis({
      lerp: 0.1,                 // чем меньше, тем «мягче» и дольше доезжает
      autoRaf: true,
      anchors: {                 // ссылки #about, #contact и т.п. — тоже плавно, с учётом закреплённой шапки и отступа над ней
        offset: -((headerEl ? headerEl.getBoundingClientRect().bottom : 0) + 16)
      }
    });
    window.lenis = lenis;
  }

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

  /* ---------- Шапка: красная, пока под ней блок «Найдём историю» (.focus), в остальное время зелёная ---------- */
  var stickyHeader = document.querySelector('.header--sticky');
  var redZone = document.querySelector('.focus');
  if (stickyHeader && redZone) {
    var headerTicking = false;
    var updateHeader = function () {
      headerTicking = false;
      var h = stickyHeader.getBoundingClientRect();
      var line = h.top + h.height / 2 + 80;          // середина шапки + 80px: цвет меняется чуть раньше, чем шапка дойдёт до края блока
      var z = redZone.getBoundingClientRect();
      stickyHeader.classList.toggle('header--dark', !(z.top <= line && z.bottom >= line));
    };
    window.addEventListener('scroll', function () {
      if (!headerTicking) { headerTicking = true; requestAnimationFrame(updateHeader); }
    }, { passive: true });
    window.addEventListener('resize', updateHeader);
    updateHeader();
  }

  /* ---------- Блог (#blog, пятый блок) «прилипает» к верху окна. С мышью/тачпадом прокрутка доводится сама:
     чуть прокрутили вниз — блок встаёт верхним краем к верху окна, ещё чуть — уезжает вверх целиком
     (и так же в обратную сторону). Переходы по якорям и прокрутку пальцем не трогаем ---------- */
  (function () {
    var block = document.getElementById('blog');
    var lenis = window.lenis;
    if (!block || !lenis || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    var busy = false;       // идёт доводка или пауза после неё
    var lastInput = 0;      // доводим только прокрутку самого человека
    var mark = function () { lastInput = Date.now(); };
    window.addEventListener('wheel', mark, { passive: true });
    window.addEventListener('keydown', mark);

    var snap = function (y) {
      busy = true;
      lenis.scrollTo(y, {
        duration: 0.9,
        easing: function (t) { return 1 - Math.pow(1 - t, 3); },
        lock: true,
        force: true,
        onComplete: function () {
          lenis.stop();                                   // гасим инерцию тачпада, чтобы блок не проскочил дальше
          setTimeout(function () { lenis.start(); busy = false; }, 450);
        }
      });
    };

    lenis.on('scroll', function (l) {
      if (busy || Date.now() - lastInput > 250) return;
      var vh = window.innerHeight;
      var r = block.getBoundingClientRect();
      var top = r.top + window.scrollY;
      var bottom = r.bottom + window.scrollY;
      var e = 2;
      if (l.direction > 0) {
        if (r.top > e && r.top < vh - e) snap(top);                                  // показался — встаёт к верху окна
        else if (r.top < -e && r.bottom > e && r.bottom <= vh + e) snap(bottom);     // дошли до низа — уезжает вверх
      } else if (l.direction < 0) {
        if (r.top > e && r.top < vh - e) snap(Math.max(0, top - vh));                // сдвинулся вниз — уезжает вниз целиком
        else if (r.top < -e && r.bottom > e && r.bottom < vh - e) snap(Math.max(top, bottom - vh));   // показался сверху — снова у верха окна
      }
    });
  })();

  /* ---------- Мобильное меню (в каждой шапке своё) ---------- */
  var burgers = document.querySelectorAll('.header__burger');

  function closeAll(except) {
    burgers.forEach(function (b) {
      var m = document.getElementById(b.getAttribute('aria-controls'));
      if (!m || m === except || m.hidden) return;
      m.hidden = true;
      b.setAttribute('aria-expanded', 'false');
      b.setAttribute('aria-label', 'Открыть меню');
    });
  }

  burgers.forEach(function (burger) {
    var menu = document.getElementById(burger.getAttribute('aria-controls'));
    if (!menu) return;
    burger.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = menu.hidden;
      closeAll(menu);
      menu.hidden = !open;
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeAll();
    });
  });

  document.addEventListener('click', function (e) {
    if (!e.target.closest('.mobile-menu')) closeAll();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAll();
  });
  window.addEventListener('resize', function () {
    if (window.innerWidth >= 1024) closeAll();
  });

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

  /* ---------- Появление при прокрутке ----------
     Текст с иерархией: заголовки и подзаголовки (шрифт больше 16px) — построчно снизу вверх,
     основной текст (16px и меньше) — целиком, спокойным проявлением. Карточки и форма — мягко снизу. */
  var motionOK = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (motionOK && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

    var prepare = function (el, cls) {
      el.style.transition = 'none';               // прячем сразу, без обратного «затухания» при загрузке
      el.classList.add(cls);
      io.observe(el);
    };

    // разбивка текста на строки — по тому, как браузер реально перенёс слова (с учётом <br> и ширины)
    var escapeHtml = function (s) {
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    };
    var splitLines = function (el) {
      el.innerHTML = el.getAttribute('data-text-src');
      // каждое слово — во временный span; пробелы обычные (неразрывные остаются внутри слова)
      var words = [];
      Array.prototype.slice.call(el.childNodes).forEach(function (node) {
        if (node.nodeType !== 3) return;           // <br> и прочее оставляем на месте для замера
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
      // слова с одинаковой высотой над краем — одна строка
      var lines = [], top = null;
      words.forEach(function (w) {
        var t = w.offsetTop;
        if (top === null || Math.abs(t - top) > 2) { lines.push([]); top = t; }
        lines[lines.length - 1].push(w.textContent);
      });
      el.innerHTML = lines.map(function (line, i) {
        return '<span class="tl"><span class="tl__in" style="--i:' + i + '">' + escapeHtml(line.join(' ')) + '</span></span>';
      }).join('');
    };

    // текст: заголовки, подзаголовки, абзацы и списки (первый экран анимируется отдельно, во вступлении)
    var textEls = Array.prototype.slice.call(document.querySelectorAll(
      '.h2, .h3, .section-head__text, .about__text, .about .dots, .contact__text, ' +
      '.russia__title, .russia__text, .russia__subtitle, .russia__list'
    )).filter(function (el, i, all) {
      return all.indexOf(el) === i && !el.closest('.opening, [hidden]');
    });
    var lineEls = [];
    textEls.forEach(function (el) {
      var big = parseFloat(getComputedStyle(el).fontSize) > 16;
      // построчно — только «чистый» текст (без вложенных блоков и ссылок); иначе — целиком
      var plain = !el.querySelector('*:not(br)');
      if (big && plain) {
        el.setAttribute('data-text-src', el.innerHTML);
        prepare(el, 'text-lines');                 // сначала прячем, потом размечаем строки — без мелькания
        splitLines(el);
        lineEls.push(el);
      } else {
        prepare(el, 'text-fade');
      }
    });
    // ширина окна изменилась — строки переносятся иначе: размечаем заново
    if (lineEls.length) {
      var lastW = window.innerWidth, splitTimer = 0;
      window.addEventListener('resize', function () {
        if (window.innerWidth === lastW) return;
        lastW = window.innerWidth;
        clearTimeout(splitTimer);
        splitTimer = setTimeout(function () { lineEls.forEach(splitLines); }, 150);
      });
      // шрифт догрузился позже — переносы могли сдвинуться
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { lineEls.forEach(splitLines); });
    }

    // карточки, форма, ссылки «Читать…»
    document.querySelectorAll(
      '.section-head .link-more, .svc__list, .directions__list, .tours__list, ' +
      '.reviews__list, .blog__grid, .contact .socials, .contact .form'
    ).forEach(function (el) { prepare(el, 'reveal'); });

    void document.body.offsetHeight;
    document.querySelectorAll('.text-lines, .text-fade, .reveal').forEach(function (el) { el.style.transition = ''; });
  }

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
