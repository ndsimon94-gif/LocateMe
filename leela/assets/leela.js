/* LEELA — small, dependency-free enhancements. Every page reads fine without them. */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  /* Leela keeps Mountain Time; fall back to the visitor's clock if Intl can't. */
  function leelaNow() {
    try {
      var parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Denver", weekday: "long", hour: "numeric", minute: "numeric", hour12: false
      }).formatToParts(new Date());
      var get = function (t) { return (parts.find(function (p) { return p.type === t; }) || {}).value; };
      return { day: DAYS.indexOf(get("weekday")), minutes: (parseInt(get("hour"), 10) % 24) * 60 + parseInt(get("minute"), 10) };
    } catch (e) {
      var d = new Date();
      return { day: d.getDay(), minutes: d.getHours() * 60 + d.getMinutes() };
    }
  }

  /* ---- Mobile menu ---- */
  var toggle = document.querySelector(".menu-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.textContent = open ? "Close" : "Menu";
    });
  }

  /* ---- Hero: one word at a time catches the light ---- */
  var field = document.querySelector("[data-cycle]");
  if (field && !reduceMotion) {
    var words = field.querySelectorAll("span:not(.sep)");
    var i = 0;
    if (words.length) {
      words[0].classList.add("is-lit");
      setInterval(function () {
        words[i].classList.remove("is-lit");
        i = (i + 1 + Math.floor(Math.random() * 3)) % words.length;
        words[i].classList.add("is-lit");
      }, 2200);
    }
  }

  /* ---- Today at Leela ---- */
  var today = document.getElementById("today");
  if (today) {
    var now = leelaNow();
    var isRest = now.day === 1 || now.day === 2;
    var dayName = today.querySelector("[data-dayname]");
    if (dayName) dayName.textContent = DAYS[now.day];
    var open = today.querySelector("[data-log='open']");
    var rest = today.querySelector("[data-log='rest']");
    if (open && rest) {
      open.hidden = isRest;
      rest.hidden = !isRest;
    }
    var restNote = today.querySelector("[data-restnote]");
    if (restNote) restNote.hidden = !isRest;
    var log = isRest ? rest : open;
    if (log) {
      var items = log.querySelectorAll("li[data-t]");
      var current = null;
      items.forEach(function (li) {
        var t = li.getAttribute("data-t").split(":");
        if (parseInt(t[0], 10) * 60 + parseInt(t[1], 10) <= now.minutes) current = li;
      });
      if (current) current.classList.add("is-now");
    }
  }

  /* ---- Week strip ---- */
  document.querySelectorAll(".week").forEach(function (week) {
    var d = leelaNow().day;
    var idx = (d + 6) % 7; // strip starts on Monday
    var cell = week.children[idx];
    if (cell) {
      cell.classList.add("is-today");
      cell.setAttribute("aria-current", "date");
    }
  });

  /* ---- Stars ---- */
  function seeded(seed) {
    return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  }
  document.querySelectorAll(".rhythm__stars").forEach(function (box) {
    var rnd = seeded(7);
    for (var s = 0; s < 46; s++) {
      var star = document.createElement("i");
      star.style.left = (rnd() * 100).toFixed(2) + "%";
      star.style.top = (rnd() * 100).toFixed(2) + "%";
      star.style.opacity = (0.25 + rnd() * 0.7).toFixed(2);
      if (rnd() > 0.88) { star.style.width = "3px"; star.style.height = "3px"; }
      box.appendChild(star);
    }
  });

  document.querySelectorAll("canvas[data-stars]").forEach(function (canvas) {
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var rnd = seeded(42);
    var stars = [];
    for (var s = 0; s < 220; s++) stars.push({ x: rnd(), y: rnd(), r: rnd() * 1.2 + 0.2, p: rnd() * Math.PI * 2 });
    function draw(t) {
      var dpr = window.devicePixelRatio || 1;
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (canvas.width !== w * dpr) { canvas.width = w * dpr; canvas.height = h * dpr; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      var color = getComputedStyle(canvas).color || "#f3e9b8";
      ctx.fillStyle = color;
      stars.forEach(function (st) {
        ctx.globalAlpha = reduceMotion ? 0.7 : 0.35 + 0.5 * (0.5 + 0.5 * Math.sin(st.p + t / 1400));
        ctx.beginPath();
        ctx.arc(st.x * w, st.y * h, st.r, 0, Math.PI * 2);
        ctx.fill();
      });
      if (!reduceMotion) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
    window.addEventListener("resize", function () { canvas.width = 0; if (reduceMotion) draw(0); });
  });

  /* ---- Calendar filters ---- */
  var filterBar = document.querySelector("[data-filters]");
  if (filterBar) {
    var events = document.querySelectorAll(".event[data-kind]");
    var months = document.querySelectorAll(".month");
    var empty = document.querySelector(".events-empty");
    filterBar.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-filter]");
      if (!btn) return;
      filterBar.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", b === btn ? "true" : "false"); });
      var f = btn.getAttribute("data-filter");
      var shown = 0;
      events.forEach(function (ev) {
        var match = f === "all" || ev.getAttribute("data-kind").split(" ").indexOf(f) > -1;
        ev.hidden = !match;
        if (match) shown++;
      });
      months.forEach(function (m) {
        var list = m.nextElementSibling;
        m.hidden = list ? !list.querySelector(".event:not([hidden])") : false;
      });
      if (empty) empty.hidden = shown > 0;
    });
  }

  /* ---- Forms (not yet wired to a mailing service) ---- */
  document.querySelectorAll("form[data-signup]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var msg = form.querySelector(".form-msg");
      var input = form.querySelector("input[type=email]");
      if (!input || !input.value || !input.checkValidity()) {
        if (msg) msg.textContent = "That address doesn't look quite right. Check it and try again.";
        return;
      }
      if (msg) msg.textContent = "Thank you. The next letter from the land will find you.";
      form.reset();
    });
  });

  /* ---- Footer year ---- */
  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
