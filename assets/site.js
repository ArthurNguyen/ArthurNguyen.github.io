// Small interactive bits. Everything still reads fine without JS.
(function () {
  var FR = (document.documentElement.lang || "").slice(0, 2) === "fr";
  function t(en, fr) { return FR ? fr : en; }
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* ---------- Day / night toggle ---------- */
  var root = document.documentElement;
  var toggle = document.querySelector("[data-theme-toggle]");
  function currentTheme() {
    var t = root.getAttribute("data-theme");
    if (t) return t;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  function paintToggle() {
    if (!toggle) return;
    var dark = currentTheme() === "dark";
    toggle.setAttribute("aria-label", dark ? t("Switch to the light theme", "Passer au thème clair") : t("Switch to the dark theme", "Passer au thème sombre"));
    toggle.setAttribute("title", dark ? t("Light theme", "Thème clair") : t("Dark theme", "Thème sombre"));
    toggle.dataset.mode = dark ? "dark" : "light";
  }
  if (toggle) {
    toggle.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
      paintToggle();
    });
    paintToggle();
  }

  /* ---------- Three-Card Monte ---------- */
  var monte = document.querySelector("[data-monte]");
  if (monte) {
    var cards = Array.prototype.slice.call(monte.querySelectorAll(".pcard"));
    var btn = monte.querySelector("[data-deal]");
    var msg = monte.querySelector(".msg");
    var studyLink = monte.getAttribute("data-study") || "#";
    var hasWon = false, rigged = false, conned = 0, busy = false;
    var FLIP = reduce ? 0 : 160;

    var RED = '<span class="corner">A<br>♥</span>♥';
    var BLACK = ['<span class="corner">8<br>♣</span>♣', '<span class="corner">9<br>♣</span>♣'];

    function setFace(card, red, i) {
      var face = card.querySelector(".face");
      face.innerHTML = red ? RED : BLACK[i === 0 ? 0 : 1];
      face.classList.toggle("red", red);
      card.dataset.red = red ? "1" : "0";
    }
    function swapIdentity(a, b) {
      var fa = a.querySelector(".face"), fb = b.querySelector(".face"), tmp = fa.innerHTML;
      fa.innerHTML = fb.innerHTML; fb.innerHTML = tmp;
      var ra = fa.classList.contains("red"), rb = fb.classList.contains("red");
      fa.classList.toggle("red", rb); fb.classList.toggle("red", ra);
      var d = a.dataset.red; a.dataset.red = b.dataset.red; b.dataset.red = d;
    }
    function slotOf(c) { return +c.dataset.slot; }
    function bySlot(s) { return cards.filter(function (c) { return slotOf(c) === s; })[0]; }
    function say(html) { msg.innerHTML = html; }
    function link() { return " <a href='" + studyLink + "'>" + t("What my study tested →", "Ce que mon étude a testé →") + "</a>"; }

    // A flat card turn: squash to a sliver, switch sides, open again. The card keeps its height.
    async function flip(card, down) {
      if (card.classList.contains("down") === down) return;
      var inner = card.querySelector(".inner");
      inner.style.transition = "transform " + FLIP + "ms ease-in";
      inner.style.transform = "scaleX(0.02)";
      await wait(FLIP);
      card.classList.toggle("down", down);
      inner.style.transition = "transform " + FLIP + "ms ease-out";
      inner.style.transform = "";
      await wait(FLIP);
      inner.style.transition = "";
    }
    function flipAll(down) { return Promise.all(cards.map(function (c) { return flip(c, down); })); }

    cards.forEach(function (c, i) { c.dataset.slot = i; setFace(c, i === 1, i); c.disabled = true; c.setAttribute("aria-label", t("Card", "Carte")); });

    async function deal() {
      if (busy) return;
      busy = true; btn.disabled = true;
      monte.classList.remove("picking");
      rigged = hasWon; // once you've won, the dealer starts throwing
      say(t("Watch the red card…", "Suivez la carte rouge…"));
      await flipAll(false);
      await wait(reduce ? 100 : 900);
      await flipAll(true);
      await wait(reduce ? 100 : 400);
      var n = reduce ? 3 : 6;
      var fakeAt = rigged ? 2 + Math.floor(Math.random() * (n - 3)) : -1;
      for (var k = 0; k < n; k++) {
        var a, b;
        if (k === fakeAt) {
          // The fake throw: the red card seems to travel, but stays where it was.
          a = slotOf(cards.filter(function (c) { return c.dataset.red === "1"; })[0]);
          b = a === 0 ? 1 : a === 2 ? 1 : (Math.random() < 0.5 ? 0 : 2);
        } else {
          a = Math.floor(Math.random() * 2); b = a + 1;
        }
        var ca = bySlot(a), cb = bySlot(b);
        ca.classList.add("lift"); cb.classList.add("lift");
        ca.dataset.slot = b; cb.dataset.slot = a;
        if (k === fakeAt) { await wait(reduce ? 20 : 230); swapIdentity(ca, cb); await wait(reduce ? 20 : 290); }
        else { await wait(reduce ? 40 : 520); }
        ca.classList.remove("lift"); cb.classList.remove("lift");
      }
      monte.classList.add("picking");
      cards.forEach(function (c) { c.disabled = false; c.setAttribute("aria-label", t("Card in position ", "Carte en position ") + (slotOf(c) + 1)); });
      say(t("Where’s the red card? Pick one.", "Où est la carte rouge ? Choisissez."));
      busy = false;
    }

    async function pick(card) {
      if (busy || !monte.classList.contains("picking")) return;
      busy = true;
      monte.classList.remove("picking");
      cards.forEach(function (c) { c.disabled = true; });
      var won = card.dataset.red === "1";
      await flip(card, false);
      await wait(reduce ? 50 : 350);
      await flipAll(false);

      if (!rigged) {
        if (won) { hasWon = true; say(t("Found it. Well followed. Feeling confident? Go again.", "Trouvée. Bien suivi. En confiance ? Rejouez.")); }
        else { say(t("Not this one. Another go?", "Pas celle-ci. On rejoue ?")); }
      } else if (won) {
        say(t("Found it! Either you spotted the switch mid-shuffle, or luck was on your side. On the street, that’s usually when the dealer stops the game.", "Trouvée ! Soit vous avez repéré l’échange en plein mélange, soit la chance était de votre côté. Dans la rue, c’est souvent là que le donneur arrête la partie.") + link());
      } else {
        conned++;
        say(conned === 1
          ? t("Not this time. Once you feel confident, that’s when the switch happens. On the street it’s rarely one dealer: there are shills winning to lure you in, sometimes a pickpocket. Never a good idea to play. Does the dealer’s talk stop you from seeing what’s in front of you?", "Pas cette fois. C’est quand vous êtes en confiance que l’échange se fait. Dans la rue, le donneur est rarement seul : des complices gagnent pour vous appâter, parfois un pickpocket. Ne jouez jamais. Le boniment du donneur vous empêche-t-il de voir ce que vous avez sous les yeux ?") + link()
          : t("Still not. The game was decided before you chose.", "Toujours pas. La partie était jouée avant votre choix.") + link());
      }
      btn.textContent = t("Deal again", "Redistribuer");
      btn.disabled = false;
      busy = false;
    }

    btn.addEventListener("click", deal);
    cards.forEach(function (c) { c.addEventListener("click", function () { pick(c); }); });
  }

  /* ---------- Flow: lower vs higher flow ---------- */
  var flow = document.querySelector("[data-flow]");
  if (flow) {
    var buttons = Array.prototype.slice.call(flow.querySelectorAll("[data-level]"));
    var notice = flow.querySelector("[data-notice] i");
    var text = flow.querySelector("[data-state-text]");
    var copy = {
      lower: t("Lower flow: the brain registers the rare sounds in the background.", "Flow plus faible : le cerveau enregistre les sons rares en arrière-plan."),
      higher: t("Higher flow: the brain’s automatic response to the rare sounds is larger, yet there’s no sign of attention turning towards them.", "Flow plus élevé : la réponse automatique du cerveau aux sons rares est plus grande, sans signe que l’attention se tourne vers eux.")
    };
    function set(level) {
      buttons.forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.level === level ? "true" : "false"); });
      notice.style.width = level === "higher" ? "78%" : "46%";
      text.textContent = copy[level];
    }
    // Reserve the height of the longer text, so the controls never jump.
    function reserve() {
      text.style.minHeight = "";
      var keep = text.textContent, h = 0;
      ["lower", "higher"].forEach(function (k) { text.textContent = copy[k]; h = Math.max(h, text.offsetHeight); });
      text.textContent = keep;
      text.style.minHeight = h + "px";
    }
    buttons.forEach(function (b) { b.addEventListener("click", function () { set(b.dataset.level); }); });
    set("higher");
    reserve();
    window.addEventListener("resize", reserve);
  }

  /* ---------- Highlight the current room in the nav ---------- */
  var links = Array.prototype.slice.call(document.querySelectorAll('nav a[href^="#"]'));
  if (links.length && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) { a.classList.toggle("here", a.getAttribute("href") === "#" + e.target.id); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    links.forEach(function (a) { var t = document.querySelector(a.getAttribute("href")); if (t) io.observe(t); });
  }
})();
