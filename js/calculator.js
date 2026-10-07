/* Калькулятор стоимости родословной книги (rodoslovnaya-kniga.html).
   Цена одной фамильной линии = 100 000 ₽ × срок × эпоха × регион:
   — срок: 100 лет — ×1, 200 — ×2, 300 — ×3, свой вариант N лет — ×N/100;
   — предок родился до 1917 года: «Да» — ×1, «Нет» — ×1.2, «Не знаю» — ×1.2 (считаем как более сложный случай);
   — регион: малооцифрованный — ×1.3, средне — ×1.2, неоцифрованный — ×1.4, оцифрованный — ×1.
   Каждая добавленная фамильная линия считается так же, суммы складываются. */
(function () {
  'use strict';

  var form = document.querySelector('.calc__card');
  var tpl = document.getElementById('calc-line');
  if (!form || !tpl) return;

  var BASE = 100000;
  var LEVEL = { 'малооц': 1.3, 'сред': 1.2, 'неоц': 1.4, 'оциф': 1, 'оцифр': 1 };

  /* регионы России с уровнем оцифровки архивов */
  var RU = [
    'Адыгея|малооц', 'Алтай|малооц', 'Башкортостан|сред', 'Бурятия|малооц', 'Дагестан|малооц',
    'Донецкая Народная Республика|сред', 'Ингушетия|малооц', 'Кабардино-Балкария|малооц', 'Калмыкия|малооц',
    'Карачаево-Черкесия|малооц', 'Карелия|сред', 'Коми|малооц', 'Крым|малооц', 'Луганская Народная Республика|сред',
    'Марий Эл|оциф', 'Мордовия|оциф', 'Саха (Якутия)|оциф', 'Северная Осетия — Алания|неоц', 'Татарстан|оцифр',
    'Тыва|неоц', 'Удмуртия|оциф', 'Хакасия|сред', 'Чечня|неоц', 'Чувашия|оциф',
    'Алтайский край|сред', 'Забайкальский край|неоц', 'Камчатский край|неоц', 'Краснодарский край|сред',
    'Красноярский край|оциф', 'Пермский край|оциф', 'Приморский край|сред', 'Ставропольский край|неоц',
    'Хабаровский край|сред',
    'Амурская область|сред', 'Архангельская область|сред', 'Астраханская область|оциф', 'Белгородская область|неоц',
    'Брянская область|неоц', 'Владимирская область|оциф', 'Волгоградская область|неоц', 'Вологодская область|оциф',
    'Воронежская область|сред', 'Запорожская область|оциф', 'Ивановская область|сред', 'Иркутская область|оциф',
    'Калининградская область|неоц', 'Калужская область|сред', 'Кемеровская область — Кузбасс|сред',
    'Кировская область|сред', 'Костромская область|оциф', 'Курганская область|неоц', 'Курская область|сред',
    'Ленинградская область|оциф', 'Липецкая область|сред', 'Магаданская область|неоц', 'Московская область|оциф',
    'Мурманская область|сред', 'Нижегородская область|оциф', 'Новгородская область|сред',
    'Новосибирская область|оциф', 'Омская область|оциф', 'Оренбургская область|оциф', 'Орловская область|неоц',
    'Пензенская область|неоц', 'Псковская область|сред', 'Ростовская область|неоц', 'Рязанская область|сред',
    'Самарская область|оциф', 'Саратовская область|сред', 'Сахалинская область|неоц', 'Свердловская область|сред',
    'Смоленская область|сред', 'Тамбовская область|неоц', 'Тверская область|оциф', 'Томская область|оциф',
    'Тульская область|оциф', 'Тюменская область|оциф', 'Ульяновская область|оциф', 'Челябинская область|сред',
    'Ярославская область|оциф', 'Херсонская область|оциф',
    'Москва|оциф', 'Санкт-Петербург|оциф', 'Севастополь|неоц',
    'Еврейская автономная область|неоц',
    'Ненецкий автономный округ|неоц', 'Ханты-Мансийский автономный округ — Югра|оциф',
    'Чукотский автономный округ|неоц', 'Ямало-Ненецкий автономный округ|неоц'
  ];
  /* Беларусь и Украина — уровень оцифровки не задан, без надбавки (×1) */
  var OTHER = [
    'Брестская область', 'Витебская область', 'Гомельская область', 'Гродненская область', 'Минская область',
    'Могилёвская область', 'Минск',
    'Винницкая область', 'Волынская область', 'Днепропетровская область', 'Житомирская область',
    'Закарпатская область', 'Ивано-Франковская область', 'Киевская область', 'Кировоградская область',
    'Львовская область', 'Николаевская область', 'Одесская область', 'Полтавская область', 'Ровненская область',
    'Сумская область', 'Тернопольская область', 'Харьковская область', 'Хмельницкая область',
    'Черкасская область', 'Черниговская область', 'Черновицкая область', 'Киев'
  ];

  var norm = function (s) { return s.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim(); };
  var REGIONS = RU.map(function (r) {
    var p = r.split('|');
    return { name: p[0], k: LEVEL[p[1]] };
  }).concat(OTHER.map(function (name) { return { name: name, k: 1 }; }))
    .sort(function (a, b) { return a.name.localeCompare(b.name, 'ru'); });
  REGIONS.forEach(function (r) { r.key = norm(r.name); });
  var findRegion = function (value) {
    var key = norm(value);
    for (var i = 0; i < REGIONS.length; i++) if (REGIONS[i].key === key) return REGIONS[i];
    return null;
  };

  var linesBox = form.querySelector('.calc__lines');
  var addBtn = form.querySelector('.calc__add');
  var submit = form.querySelector('.calc__submit');
  var result = document.querySelector('.calc__result');
  var resultSum = result.querySelector('.calc__result-sum');
  var again = result.querySelector('.calc__again');
  var uid = 0;

  var money = function (n) { return Math.round(n).toLocaleString('ru-RU') + ' ₽'; };

  /* ---------- подсказки регионов ---------- */
  var setupCombo = function (line) {
    var input = line.querySelector('.combo__input');
    var list = line.querySelector('.combo__list');
    var items = [], active = -1;

    var close = function () {
      list.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      active = -1;
    };
    var highlight = function (i) {
      if (active >= 0 && list.children[active]) list.children[active].classList.remove('is-active');
      active = i;
      var li = list.children[active];
      if (!li) { input.removeAttribute('aria-activedescendant'); return; }
      li.classList.add('is-active');
      input.setAttribute('aria-activedescendant', li.id);
      li.scrollIntoView({ block: 'nearest' });
    };
    var pick = function (i) {
      if (!items[i]) return;
      input.value = items[i].name;
      close();
      input.dispatchEvent(new Event('change', { bubbles: true }));
    };
    var open = function () {
      var q = norm(input.value);
      items = q ? REGIONS.filter(function (r) { return r.key.indexOf(q) === 0; }) : [];
      list.innerHTML = '';
      items.forEach(function (r, i) {
        var li = document.createElement('li');
        li.id = list.id + '-' + i;
        li.className = 'combo__option';
        li.setAttribute('role', 'option');
        li.textContent = r.name;
        li.addEventListener('mousedown', function (e) { e.preventDefault(); pick(i); });   // до blur поля
        list.appendChild(li);
      });
      active = -1;
      var has = items.length > 0 && !(items.length === 1 && items[0].key === q);
      list.hidden = !has;
      input.setAttribute('aria-expanded', String(has));
    };

    input.addEventListener('input', open);
    input.addEventListener('focus', function () { if (input.value) open(); });
    input.addEventListener('blur', close);
    input.addEventListener('keydown', function (e) {
      if (list.hidden) { if (e.key === 'ArrowDown' && input.value) { open(); e.preventDefault(); } return; }
      if (e.key === 'ArrowDown') { highlight(Math.min(active + 1, items.length - 1)); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { highlight(Math.max(active - 1, 0)); e.preventDefault(); }
      else if (e.key === 'Enter') { if (active >= 0) { pick(active); e.preventDefault(); } }
      else if (e.key === 'Escape') { close(); }
    });
  };

  /* ---------- фамильные линии ---------- */
  var renumber = function () {
    linesBox.querySelectorAll('.calc-line').forEach(function (line, i) {
      line.querySelector('.calc-line__num').textContent = i + 1;
      line.classList.toggle('calc-line--extra', i > 0);   // у первой линии заголовка нет
    });
  };

  var addLine = function () {
    uid++;
    var line = tpl.content.firstElementChild.cloneNode(true);
    line.querySelectorAll('input[type="radio"]').forEach(function (r) { r.name = r.name + '-' + uid; });
    var input = line.querySelector('.combo__input');
    var list = line.querySelector('.combo__list');
    var label = line.querySelector('label[for="region"]');
    input.id = 'region-' + uid;
    list.id = 'region-list-' + uid;
    input.setAttribute('aria-controls', list.id);
    if (label) label.htmlFor = input.id;

    // в своё поле начали вписывать срок — выбираем «Свой вариант»
    var custom = line.querySelector('.calc-q__custom');
    var customRadio = line.querySelector('.radio--custom input[type="radio"]');
    custom.addEventListener('focus', function () { customRadio.checked = true; });
    custom.addEventListener('input', function () { customRadio.checked = true; });

    line.querySelector('.calc-line__remove').addEventListener('click', function () {
      line.remove();
      renumber();
    });
    setupCombo(line);
    linesBox.appendChild(line);
    renumber();
    return line;
  };

  /* ---------- расчёт ---------- */
  var readLine = function (line) {
    var errors = [];
    var years = line.querySelector('[data-q="years"] input[type="radio"]:checked');
    var kYears = null;
    if (years) {
      if (years.value === 'custom') {
        var n = parseFloat(line.querySelector('.calc-q__custom').value.replace(',', '.'));
        if (n > 0) kYears = n / 100;
      } else {
        kYears = parseInt(years.value, 10) / 100;
      }
    }
    if (kYears === null) errors.push('years');

    var era = line.querySelector('[data-q="before1917"] input[type="radio"]:checked');
    var kEra = era ? (era.value === 'yes' ? 1 : 1.2) : null;      // «Нет» и «Не знаю» — ×1.2
    if (kEra === null) errors.push('before1917');

    var regionValue = line.querySelector('.combo__input').value.trim();
    var region = regionValue ? findRegion(regionValue) : null;
    if (!regionValue) errors.push('region');

    // регион не из списка (опечатка, другая страна) — без надбавки
    return { errors: errors, price: errors.length ? 0 : BASE * kYears * kEra * (region ? region.k : 1) };
  };

  /* проверяем ответы; всё заполнено — возвращаем сумму по всем линиям, иначе подсвечиваем пропуски */
  var calculate = function () {
    var total = 0, ok = true;
    linesBox.querySelectorAll('.calc-line').forEach(function (line) {
      var r = readLine(line);
      line.querySelectorAll('.calc-q').forEach(function (q) {
        q.classList.toggle('is-invalid', r.errors.indexOf(q.getAttribute('data-q')) >= 0);
      });
      if (r.errors.length) ok = false; else total += r.price;
    });
    if (ok) return total;
    var first = form.querySelector('.calc-q.is-invalid');
    if (first) {
      var field = first.querySelector('input');
      if (field) field.focus({ preventScroll: true });
      first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return null;
  };

  // карточка ушла за верх экрана — подводим к ней начало (шапка учтена в scroll-padding-top)
  var bringIntoView = function (el) {
    if (el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (submit.classList.contains('is-loading')) return;
    var total = calculate();
    if (total === null) return;
    // считается мгновенно; короткая пауза со спиннером — чтобы было видно, что нажатие сработало
    submit.classList.add('is-loading');
    submit.setAttribute('aria-busy', 'true');
    setTimeout(function () {
      submit.classList.remove('is-loading');
      submit.removeAttribute('aria-busy');
      resultSum.textContent = money(total);
      form.hidden = true;
      result.hidden = false;
      result.focus({ preventScroll: true });
      bringIntoView(result);
    }, 600);
  });
  form.addEventListener('input', function (e) {
    var q = e.target.closest('.calc-q');
    if (q) q.classList.remove('is-invalid');
  });
  form.addEventListener('change', function (e) {
    var q = e.target.closest('.calc-q');
    if (q) q.classList.remove('is-invalid');
  });
  again.addEventListener('click', function () {
    result.hidden = true;
    form.hidden = false;
    bringIntoView(form);
    var first = form.querySelector('input');
    if (first) first.focus({ preventScroll: true });
  });
  addBtn.addEventListener('click', function () { addLine(); });

  addLine();
})();
