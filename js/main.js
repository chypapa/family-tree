(function () {
  'use strict';

  /* ширина полосы прокрутки → --sbw: ленты во всю ширину окна считают ширину без неё (100vw её включает) */
  var setScrollbar = function () {
    var root = document.documentElement;
    root.style.setProperty('--sbw', Math.max(0, window.innerWidth - root.clientWidth) + 'px');
  };
  setScrollbar();
  window.addEventListener('resize', setScrollbar);

  /* плавная прокрутка колесом мыши и по якорям (Lenis); на телефоне и при «уменьшении движения» — обычная */
  if (window.Lenis && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var lenis = new window.Lenis({ duration: 1.1, anchors: { offset: -88 }, smoothWheel: true });
    window.lenis = lenis;
    var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    // открыто меню или окно консультации — страница под ними не прокручивается
    var rootEl = document.documentElement;
    new MutationObserver(function () {
      var locked = rootEl.classList.contains('is-menu-open') || rootEl.classList.contains('is-overlay-open');
      if (locked) lenis.stop(); else lenis.start();
    }).observe(rootEl, { attributes: true, attributeFilter: ['class'] });
  }

  /* переходы между страницами: браузеры с View Transitions сами плавно сменяют страницы (@view-transition в CSS);
     в остальных (класс fade-nav) страница растворяется перед переходом по ссылке на другую страницу сайта */
  if (document.documentElement.classList.contains('fade-nav')) {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if ((a.target && a.target !== '_self') || a.hasAttribute('download')) return;
      var url = new URL(a.href, location.href);
      if (url.origin !== location.origin || !/^https?:$/.test(url.protocol)) return;
      if (url.pathname === location.pathname && url.search === location.search) return;   // якорь на этой же странице
      e.preventDefault();
      document.documentElement.classList.add('is-leaving');
      setTimeout(function () { location.href = a.href; }, 250);
    });
    // вернулись кнопкой «Назад» (страница из кэша) — показываем её снова
    window.addEventListener('pageshow', function () { document.documentElement.classList.remove('is-leaving'); });
  }

  /* ---------- Вступление: на светлом экране (шапки не видно) рисуется знак, рядом с ним выезжает название
     «Древо предков» — знак сдвигается влево, и вместе с названием они стоят по центру экрана. Потом знак переезжает
     на своё место в шапке, а название растворяется вместе со светлым экраном; появляются меню и первый экран.
     Когда знак встал на место, появляется заливка шапки (если страница прокручена) ---------- */
  (function () {
    var root = document.documentElement;
    var pre = document.querySelector('.preloader');
    var word = pre && pre.querySelector('.preloader__name');
    var marks = Array.prototype.slice.call(document.querySelectorAll('.logo-mark'));
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var ready = function () {
      marks.forEach(function (m) {
        var svg = m.querySelector('.mark');
        svg.classList.remove('play');
        svg.classList.add('done');
      });
      root.classList.add('is-ready');
      setTimeout(function () { if (pre) pre.remove(); }, 980);
    };
    var finish = function () { root.classList.add('is-intro-done'); };   // знак на месте: заливка шапки
    var logo = marks.filter(function (m) { return m.offsetParent !== null; })[0];   // видимый знак: в шапке или в мобильной плашке
    // без вступления (на телефоне знака в шапке нет): заливка кнопок шапки появляется, когда растворится экран загрузки
    if (reduce || !pre || !logo || !window.Promise) { ready(); setTimeout(finish, reduce || !pre ? 0 : 500); return; }
    // название меряем только когда загрузился Manrope: иначе его размер берётся от запасного шрифта
    // и знак встаёт не на одну линию с названием
    var start = function () { if (start.done) return; start.done = true; run(); };
    if (word && document.fonts && document.fonts.load) {
      document.fonts.load('500 40px Manrope', word.textContent).then(start, start);
      setTimeout(start, 1500);
    } else start();
    function run() {
    try {
      var vw = window.innerWidth, vh = window.innerHeight;
      var r = logo.getBoundingClientRect();
      var size = Math.min(vh * 0.2, 180);                      // высота знака по центру экрана
      var s = size / r.height;
      var logoW = r.width * s;
      var gap = size * 0.28;                                   // знак → название
      var shift = 0;
      if (word) {
        word.style.fontSize = Math.round(size * 0.36) + 'px';
        var ww = word.offsetWidth, wh = word.offsetHeight;
        var scaleDown = Math.min(1, (vw - 48) / (logoW + gap + ww));   // узкий экран — всё чуть меньше
        if (scaleDown < 1) {
          size *= scaleDown; s = size / r.height; logoW = r.width * s; gap *= scaleDown;
          word.style.fontSize = Math.round(size * 0.36) + 'px';
          ww = word.offsetWidth; wh = word.offsetHeight;
        }
        shift = (gap + ww) / 2;                                // знак с названием — по центру экрана
        word.style.left = (vw / 2 - shift + logoW / 2 + gap) + 'px';
        word.style.top = (vh / 2 - wh / 2) + 'px';
      }
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var place = function (dx) { logo.style.transform = 'translate(' + (dx - cx) + 'px,' + (vh / 2 - cy) + 'px) scale(' + s + ')'; };
      logo.style.color = '#a53625';
      place(vw / 2);
      void logo.offsetWidth;
      logo.querySelector('.mark').classList.add('play');     // 1. рисуется контур, затем заливка (около 1,1 с)
      if (word) setTimeout(function () {                       // 2. знак сдвигается влево, рядом выезжает название
        logo.style.transition = 'transform .6s cubic-bezier(.4, 0, .2, 1)';
        place(vw / 2 - shift);
        word.classList.add('is-in');
      }, 150);

      var drawn = new Promise(function (res) { setTimeout(res, 1180); });
      var loaded = new Promise(function (res) {
        if (document.readyState === 'complete') res(); else window.addEventListener('load', res, { once: true });
        setTimeout(res, 5000);                                // медленный интернет — не ждём дольше 5 с
      });
      Promise.all([drawn, loaded]).then(function () {
        // 3. знак уезжает на своё место в шапке и становится белым, название растворяется вместе с экраном.
        //    Если страница прокручена (у шапки будет заливка), знак остаётся красным, пока едет, и белеет
        //    вместе с появлением заливки — на светлом фоне он не пропадает
        var header = document.querySelector('.header--sticky');
        var filled = !header || !header.classList.contains('is-top');
        logo.style.transition = 'transform .58s cubic-bezier(.75, 0, .2, 1), color ' + (filled ? '.3s ease .58s' : '.45s ease .09s');
        logo.style.transform = '';
        logo.style.color = '';
        ready();                                              // экран с названием растворяется, появляются меню и первый экран
        setTimeout(finish, 600);                              // 4. знак на месте
        setTimeout(function () { logo.style.transition = ''; }, 900);
      });
    } catch (e) { ready(); finish(); }
    }
  })();

  /* ---------- Политика конфиденциальности открывается в той же вкладке: «← Назад» возвращает на страницу,
     с которой пришли (например, к форме), а если пришли не с сайта — на главную (адрес в href) ---------- */
  var policyBack = document.querySelector('.policy__back');
  if (policyBack) {
    policyBack.addEventListener('click', function (e) {
      var ref = document.referrer;
      if (ref && ref.indexOf(location.origin) === 0 && history.length > 1) { e.preventDefault(); history.back(); }
    });
  }

  /* ---------- Шапка без заливки над первым экраном; при прокрутке заливка появляется.
     Прокрутка вниз — шапка уезжает вверх за край окна, прокрутка вверх — возвращается.
     Первый экран при прокрутке: фото чуть приближается, текст уходит вверх и гаснет ---------- */
  var topHeader = document.querySelector('.header--sticky');
  var opening = document.querySelector('.opening');
  if (topHeader) {
    var openingMotion = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var topTicking = false;
    var lastY = window.scrollY;
    var updateTop = function () {
      topTicking = false;
      var y = window.scrollY;
      topHeader.classList.toggle('is-top', !!opening && y <= 40);
      // в самом верху, при открытом меню и пока идёт заставка шапка всегда видна; мелкие подёргивания (до 6px) не считаем.
      // Заставка: знак сидит в шапке — если шапка уедет (страница открыта по ссылке на блок, например «О нас»,
      // и прокручивается к нему), знак уедет вместе с ней и встанет выше названия
      var rootCls = document.documentElement.classList;
      var introRunning = rootCls.contains('is-intro') && !rootCls.contains('is-intro-done');
      if (y <= 120 || rootCls.contains('is-menu-open') || introRunning) {
        topHeader.classList.remove('is-hidden');
        lastY = y;
      } else if (Math.abs(y - lastY) > 6) {
        topHeader.classList.toggle('is-hidden', y > lastY);
        lastY = y;
      }
      if (opening && openingMotion) {
        opening.style.setProperty('--hp', Math.min(1, Math.max(0, y / window.innerHeight)).toFixed(3));
      }
    };
    window.addEventListener('scroll', function () {
      if (!topTicking) { topTicking = true; requestAnimationFrame(updateTop); }
    }, { passive: true });
    window.addEventListener('resize', updateTop);
    topHeader.addEventListener('focusin', function () { topHeader.classList.remove('is-hidden'); });   // переход по Tab — шапка видна
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
      if (h.closest('[hidden], .opening, .overlay') || h.classList.contains('about-svc__chip')) return;
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

  /* ---------- «Этапы работы»: курсор над лентой — круг с подписью. Лента в начале — «вперёд», в конце — «назад»,
     посередине — «вперёд» на правых двух третях экрана и «назад» на левой трети. Подпись «вперёд» — текст круга
     в разметке (span.stages__bubble), «назад» — его атрибут data-back.
     В правой трети лента сама едет вперёд, в левой — назад; в средней трети ничего не происходит ---------- */
  document.querySelectorAll('.stages').forEach(function (section) {
    var strip = section.querySelector('.stages__viewport');
    var bubble = section.querySelector('.stages__bubble');
    if (!strip || !bubble || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    var x = 0, y = 0, over = false, dir = 0, raf = 0, last = 0;
    var SPEED = 0.9;                                    // px за мс (~900 px/с)
    var fwdText = bubble.textContent.trim() || 'Вперёд →';
    var backText = bubble.getAttribute('data-back') || '← Назад';

    // все карточки поместились (свиток на компьютере) — листать некуда: обычный курсор, круга нет
    var canScroll = function () { return strip.scrollWidth - strip.clientWidth > 1; };
    var sync = function () {
      var can = canScroll();
      section.classList.toggle('is-scrollable', can);
      if (!can) { section.classList.remove('is-cursor'); dir = 0; }
      return can;
    };
    sync();
    window.addEventListener('resize', sync);
    window.addEventListener('load', sync);
    var state = function () {
      if (!sync()) return;
      if (over) section.classList.add('is-cursor');
      var max = strip.scrollWidth - strip.clientWidth;
      var atStart = strip.scrollLeft <= 1, atEnd = strip.scrollLeft >= max - 1;
      var third = window.innerWidth / 3;
      var back = atEnd || (!atStart && x < third);
      bubble.textContent = back ? backText : fwdText;
      dir = x > 2 * third && !atEnd ? 1 : (x < third && !atStart ? -1 : 0);
      if (dir && !raf) { last = 0; raf = requestAnimationFrame(step); }
    };
    var step = function (t) {
      raf = 0;
      if (!over || !dir) return;
      var dt = last ? Math.min(40, t - last) : 16;
      last = t;
      strip.scrollLeft += dir * SPEED * dt;
      state();
      if (dir && !raf) raf = requestAnimationFrame(step);
    };
    var place = function () {
      var r = section.getBoundingClientRect();
      section.style.setProperty('--cx', (x - r.left).toFixed(1) + 'px');
      section.style.setProperty('--cy', (y - r.top).toFixed(1) + 'px');
    };
    strip.addEventListener('pointerenter', function (e) { over = true; x = e.clientX; y = e.clientY; place(); state(); });
    strip.addEventListener('pointermove', function (e) { x = e.clientX; y = e.clientY; place(); state(); });
    strip.addEventListener('pointerleave', function () { over = false; dir = 0; section.classList.remove('is-cursor'); });
    strip.addEventListener('scroll', function () { if (over) state(); }, { passive: true });
    window.addEventListener('scroll', function () { if (over) place(); }, { passive: true });
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

  /* ---------- Окна поверх страницы (видеоотзыв, «Получить консультацию»): страница под окном затемнена и размыта,
     прокрутка страницы выключена. Закрываются крестиком, кликом мимо окна и клавишей Esc ---------- */
  var pageWrap = document.querySelector('.page');
  var openOverlay = null;
  var makeOverlay = function (el, onClose) {
    var closeBtn = el.querySelector('.overlay__close');
    var opener = null;
    el.hidden = false;                                  // дальше окно прячут opacity / visibility — так оно плавно появляется
    if ('inert' in el) el.inert = true;
    var api = {
      open: function (from) {
        if (openOverlay) openOverlay.close();
        opener = from || null;
        var root = document.documentElement;
        root.classList.toggle('has-scrollbar', window.innerWidth > root.clientWidth);
        root.classList.add('is-overlay-open');
        el.scrollTop = 0;
        el.classList.add('is-open');
        if ('inert' in el) { el.inert = false; if (pageWrap) pageWrap.inert = true; }
        closeBtn.focus({ preventScroll: true });
        openOverlay = api;
      },
      close: function () {
        if (!el.classList.contains('is-open')) return;
        el.classList.remove('is-open');
        document.documentElement.classList.remove('is-overlay-open', 'has-scrollbar');
        if ('inert' in el) { el.inert = true; if (pageWrap) pageWrap.inert = false; }
        if (onClose) onClose();
        if (opener) opener.focus({ preventScroll: true });
        openOverlay = null;
      }
    };
    closeBtn.addEventListener('click', api.close);
    el.addEventListener('click', function (e) { if (e.target === el) api.close(); });   // клик по затемнению
    return api;
  };
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && openOverlay) openOverlay.close(); });

  /* видеоотзыв: по кнопке ▶ видео открывается почти на весь экран */
  var videoModal = document.getElementById('video-modal');
  if (videoModal) {
    var modalPlayer = videoModal.querySelector('.video-modal__player');
    var videoOverlay = makeOverlay(videoModal, function () {
      modalPlayer.pause();
      setTimeout(function () {                          // окно растаяло — выгружаем видео
        if (videoModal.classList.contains('is-open')) return;
        modalPlayer.removeAttribute('src');
        modalPlayer.load();
      }, 400);
    });
    // файла нет или он не открылся — вместо видео подпись «Видео скоро появится»
    var modalFail = function () { videoModal.classList.add('is-missing'); };
    modalPlayer.addEventListener('error', modalFail);
    document.querySelectorAll('.voice__video').forEach(function (box) {
      var video = box.querySelector('video');
      var play = box.querySelector('.voice__play');
      if (!video || !play) return;
      var source = video.querySelector('source');
      play.addEventListener('click', function () {
        videoModal.classList.remove('is-missing');
        modalPlayer.poster = video.getAttribute('poster') || '';
        modalPlayer.src = source ? source.getAttribute('src') : video.getAttribute('src');
        videoOverlay.open(play);
        var p = modalPlayer.play();
        if (p && p.catch) p.catch(function (err) { if (err && err.name === 'NotSupportedError') modalFail(); });
      });
    });
  }

  /* «Получить консультацию» не на главной: кнопка в шапке и в мобильном меню и ссылка «Можете связаться с нами»
     (атрибут data-consult) открывают окно с формой, как в последнем блоке главной. Без скрипта ссылки ведут на форму главной */
  var consultModal = document.getElementById('consult-modal');
  if (consultModal) {
    var consultOverlay = makeOverlay(consultModal);
    document.querySelectorAll('[data-consult]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        consultOverlay.open(link.closest('.mobile-menu') ? null : link);   // из мобильного меню фокус вернётся на страницу
      });
    });
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

  /* ---------- Форма (последний блок главной и окно «Получить консультацию») ---------- */
  document.querySelectorAll('.form').forEach(function (form) {
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
  });
})();
