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
    var hasWon = false, conned = 0, busy = false;

    var RED = '<span class="corner">A<br>♥</span>♥';
    var BLACK = ['<span class="corner">8<br>♣</span>♣', '<span class="corner">9<br>♣</span>♣'];

    function setFace(card, red, i) {
      var face = card.querySelector(".face");
      face.innerHTML = red ? RED : BLACK[i === 0 ? 0 : 1];
      face.classList.toggle("red", red);
      card.dataset.red = red ? "1" : "0";
    }
    function slotOf(c) { return +c.dataset.slot; }
    function bySlot(s) { return cards.filter(function (c) { return slotOf(c) === s; })[0]; }
    function say(html) { msg.innerHTML = html; }

    cards.forEach(function (c, i) { c.dataset.slot = i; setFace(c, i === 1, i); c.disabled = true; c.setAttribute("aria-label", t("Card", "Carte")); });

    async function deal() {
      if (busy) return;
      busy = true; btn.disabled = true;
      monte.classList.remove("picking");
      say(t("Watch the red card…", "Suivez la carte rouge…"));
      cards.forEach(function (c) { c.classList.remove("down"); });
      await wait(reduce ? 100 : 1000);
      cards.forEach(function (c) { c.classList.add("down"); });
      await wait(reduce ? 100 : 600);
      // Fair, followable moves: adjacent swaps only, at a human pace.
      var n = reduce ? 3 : 6;
      for (var k = 0; k < n; k++) {
        var a = Math.floor(Math.random() * 2), b = a + 1;
        var ca = bySlot(a), cb = bySlot(b);
        ca.classList.add("lift");
        ca.dataset.slot = b; cb.dataset.slot = a;
        await wait(reduce ? 40 : 520);
        ca.classList.remove("lift");
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

      if (hasWon && card.dataset.red === "1") {
        // The con: once you're confident, the switch happens.
        var others = cards.filter(function (c) { return c !== card; });
        var target = others[Math.floor(Math.random() * 2)];
        var a = card.querySelector(".face"), b = target.querySelector(".face"), tmp = a.innerHTML;
        a.innerHTML = b.innerHTML; b.innerHTML = tmp;
        a.classList.remove("red"); b.classList.add("red");
        card.dataset.red = "0"; target.dataset.red = "1";
      }
      var won = card.dataset.red === "1";

      card.classList.remove("down");
      await wait(reduce ? 50 : 700);
      cards.forEach(function (c) { c.classList.remove("down"); });

      if (won) {
        hasWon = true;
        say(t("Found it. Well followed. Feeling confident? Go again.", "Trouvée. Bien suivi. En confiance ? Rejouez."));
      } else if (!hasWon) {
        say(t("Not this one. Another go?", "Pas celle-ci. On rejoue ?"));
      } else {
        conned++;
        say(conned === 1
          ? t("Not this time. Once you feel confident, that’s when the switch happens. On the street it’s rarely one dealer: there are shills winning to lure you in, sometimes a pickpocket. Never a good idea to play.", "Pas cette fois. C’est quand vous êtes en confiance que l’échange se fait. Dans la rue, le donneur est rarement seul : des complices gagnent pour vous appâter, parfois un pickpocket. Ne jouez jamais.") + " <a href='" + studyLink + "'>" + t("The research behind it →", "La recherche derrière →") + "</a>"
          : t("Still not. The game was decided before you chose.", "Toujours pas. La partie était jouée avant votre choix.") + " <a href='" + studyLink + "'>" + t("The research behind it →", "La recherche derrière →") + "</a>");
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
