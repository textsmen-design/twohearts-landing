(function () {
  "use strict";

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------------
     Header: solid background after scrolling past hero
     ------------------------------------------------------------------ */
  var header = document.querySelector(".site-header");
  function onScrollHeader() {
    if (!header) return;
    if (window.scrollY > 40) header.classList.add("is-scrolled");
    else header.classList.remove("is-scrolled");
  }
  document.addEventListener("scroll", onScrollHeader, { passive: true });
  onScrollHeader();

  /* ------------------------------------------------------------------
     Scroll reveal
     ------------------------------------------------------------------ */
  var revealEls = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: "0px 0px -5% 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });

    // Safety net: IntersectionObserver can miss elements in edge cases
    // (very tall sections, resize during load, etc). Never let content
    // stay permanently invisible — reveal everything after a short delay.
    window.setTimeout(function () {
      revealEls.forEach(function (el) { el.classList.add("is-visible"); });
    }, 2500);
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ------------------------------------------------------------------
     Generative skyline windows (lit windows, gentle flicker)
     Pure decoration — keeps the "cinematic Moscow night" scene from
     looking static without using any raster imagery.
     ------------------------------------------------------------------ */
  function scatterWindows(svgRoot, count, seedOffset) {
    if (!svgRoot) return;
    var group = svgRoot.querySelector(".skyline-windows") || svgRoot.querySelector("#skylineWindows");
    if (!group) return;
    var viewBox = svgRoot.viewBox && svgRoot.viewBox.baseVal;
    var w = viewBox ? viewBox.width : 1600;
    var h = viewBox ? viewBox.height : 620;
    var frag = document.createDocumentFragment();

    for (var i = 0; i < count; i++) {
      var rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      var x = Math.random() * w;
      var y = h * 0.58 + Math.random() * (h * 0.36);
      var size = 3 + Math.random() * 4;
      rect.setAttribute("x", x.toFixed(1));
      rect.setAttribute("y", y.toFixed(1));
      rect.setAttribute("width", size.toFixed(1));
      rect.setAttribute("height", (size * 1.4).toFixed(1));
      var baseOpacity = 0.25 + Math.random() * 0.55;
      rect.setAttribute("opacity", baseOpacity.toFixed(2));
      if (!reduceMotion && Math.random() > 0.55) {
        var dur = (3 + Math.random() * 5).toFixed(1) + "s";
        var delay = (seedOffset + Math.random() * 6).toFixed(1) + "s";
        rect.style.animation = "windowFlicker " + dur + " ease-in-out " + delay + " infinite";
      }
      frag.appendChild(rect);
    }
    group.appendChild(frag);
  }

  var styleTag = document.createElement("style");
  styleTag.textContent =
    "@keyframes windowFlicker{0%,100%{opacity:.25}45%{opacity:.75}55%{opacity:.3}100%{opacity:.6}}";
  document.head.appendChild(styleTag);

  document.querySelectorAll(".hero__scene .scene__skyline").forEach(function (svg) {
    scatterWindows(svg, 70, 0);
  });

  /* ------------------------------------------------------------------
     Subtle parallax on hero scene (disabled for reduced motion)
     ------------------------------------------------------------------ */
  var heroScene = document.querySelector(".hero__scene");
  if (heroScene && !reduceMotion) {
    var ticking = false;
    window.addEventListener(
      "scroll",
      function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
          var y = window.scrollY;
          var shift = Math.min(y * 0.18, 90);
          heroScene.style.transform = "translateY(" + shift + "px)";
          ticking = false;
        });
      },
      { passive: true }
    );
  }

  /* ------------------------------------------------------------------
     Apply form — submits to Google Apps Script endpoint from config.js
     ------------------------------------------------------------------ */
  var form = document.getElementById("applyForm");
  var statusEl = document.getElementById("applyStatus");
  var submitBtn = document.getElementById("applySubmit");

  function setStatus(message, state) {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.setAttribute("data-state", state || "");
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var nameInput = document.getElementById("name");
      var emailInput = document.getElementById("email");
      var honeypot = document.getElementById("company");

      var name = (nameInput.value || "").trim();
      var email = (emailInput.value || "").trim();

      nameInput.classList.remove("is-invalid");
      emailInput.classList.remove("is-invalid");

      // silently ignore obvious bots
      if (honeypot && honeypot.value) {
        setStatus("Спасибо! Заявка отправлена.", "success");
        form.reset();
        return;
      }

      var valid = true;
      if (name.length < 2) { nameInput.classList.add("is-invalid"); valid = false; }
      if (!isValidEmail(email)) { emailInput.classList.add("is-invalid"); valid = false; }

      if (!valid) {
        setStatus("Проверьте, пожалуйста, имя и email.", "error");
        return;
      }

      var config = window.TWO_HEARTS_CONFIG || {};
      var endpoint = config.APPS_SCRIPT_URL;

      if (submitBtn) submitBtn.disabled = true;

      if (!endpoint) {
        // Backend not wired up yet — see config.js and backend/Code.gs
        setStatus(
          "Форма готова, но пока не подключена к таблице (см. config.js). Заявка не отправлена.",
          "error"
        );
        if (submitBtn) submitBtn.disabled = false;
        return;
      }

      var payload = new URLSearchParams();
      payload.append("name", name);
      payload.append("email", email);
      payload.append("source", "twohearts-landing");
      payload.append("submittedAt", new Date().toISOString());

      setStatus("Отправляем…", "");

      fetch(endpoint, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: payload.toString()
      })
        .then(function () {
          setStatus("Спасибо! Мы получили вашу заявку и скоро свяжемся.", "success");
          form.reset();
        })
        .catch(function () {
          setStatus("Не получилось отправить заявку. Попробуйте ещё раз чуть позже.", "error");
        })
        .finally(function () {
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }
})();
