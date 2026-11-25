(function () {
  "use strict";

  var PHONE = "923446504445";

  /* ---------- Lahore clock ---------- */
  var shortFmt = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Karachi", hour: "numeric", minute: "2-digit" });
  var longFmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  var hourFmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Karachi", hour: "2-digit", hourCycle: "h23" });

  function message(h) {
    if (h < 5) return "Most of Lahore is asleep. Our counter isn't.";
    if (h < 8) return "Early start on site? We're already open.";
    if (h < 18) return "Busy hours — call ahead and skip the wait.";
    if (h < 22) return "Shops around us are closing. We're not.";
    return "Late-night emergency? Come straight over.";
  }

  function tick() {
    var now = new Date();
    document.querySelectorAll('[data-clock="short"]').forEach(function (el) { el.textContent = shortFmt.format(now); });
    document.querySelectorAll('[data-clock="long"]').forEach(function (el) { el.textContent = longFmt.format(now); });
    var h = parseInt(hourFmt.format(now), 10);
    document.querySelectorAll("[data-clock-msg]").forEach(function (el) { el.textContent = message(h); });
  }
  tick();
  setInterval(tick, 10000);

  /* ---------- Light switch ---------- */
  var sw = document.getElementById("switch");
  if (sw) {
    sw.addEventListener("click", function () {
      var on = sw.getAttribute("aria-pressed") === "true";
      sw.setAttribute("aria-pressed", String(!on));
      sw.setAttribute("aria-label", "Light switch — currently " + (on ? "off" : "on"));
      document.body.classList.toggle("lights-off", on);
    });
  }

  /* ---------- Parts drawers ---------- */
  document.querySelectorAll(".drawer__front").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var drawer = btn.closest(".drawer");
      var open = drawer.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", String(open));
    });
  });

  /* ---------- Parchi → WhatsApp ---------- */
  var form = document.getElementById("parchi");
  if (form) {
    var err = document.getElementById("parchi-err");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = form.name.value.trim();
      var area = form.area.value.trim();
      var list = form.list.value.trim();
      if (!list) { err.hidden = false; form.list.focus(); return; }
      err.hidden = true;

      var lines = ["Assalam o Alaikum, I'd like to order:", "", list, ""];
      if (name) lines.push("Name: " + name);
      if (area) lines.push("Area: " + area);
      lines.push("(Sent from your website)");

      var url = "https://wa.me/" + PHONE + "?text=" + encodeURIComponent(lines.join("\n"));
      window.open(url, "_blank", "noopener");
    });
  }

  /* ---------- Online store links ----------
     Put your live online-shop address here once it is hosted,
     for example "https://shop.yourdomain.pk". While it still says
     localhost, the shop buttons only appear when you preview this
     site on your own computer, so visitors never see a broken link. */
  var STORE_URL = "http://localhost:3000";

  var here = location.hostname;
  var previewing = location.protocol === "file:" || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(here);
  var storeReady = !!STORE_URL && (previewing || !/\/\/(localhost|127\.0\.0\.1)/.test(STORE_URL));
  document.querySelectorAll("[data-store-path]").forEach(function (a) {
    if (storeReady) a.href = STORE_URL.replace(/\/$/, "") + a.getAttribute("data-store-path");
    else (a.closest("[data-store-wrap]") || a).hidden = true;
  });
  if (!storeReady) {
    document.querySelectorAll("[data-fallback-primary]").forEach(function (el) {
      el.classList.remove("btn--line"); el.classList.add("btn--yellow");
    });
  }

  var y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
})();
