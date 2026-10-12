/*
 * Glansby Städ, cookiebanner med Google Consent Mode v2.
 * Laddas i <head> FÖRE GTM-koden, så att standardläget (nekat) är satt innan någon tagg körs.
 *
 * Kategorier:
 *   Nödvändiga     alltid på (security_storage)
 *   Statistik      analytics_storage
 *   Marknadsföring ad_storage, ad_user_data, ad_personalization
 *
 * Varje val skickar gtag('consent', 'update', ...) och händelsen
 * 'cookie_consent_update' till dataLayer, så att den kan användas som utlösare i GTM.
 */
(function () {
  var STORAGE_KEY = 'glansby_consent';
  var VERSION = 1;
  var MAX_AGE_DAYS = 365;

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  // 1. Standardläge: allt utom nödvändigt är nekat tills besökaren väljer.
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'denied',
    personalization_storage: 'denied',
    security_storage: 'granted',
    wait_for_update: 500
  });
  gtag('set', 'ads_data_redaction', true);

  function readChoice() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var c = JSON.parse(raw);
      var ageDays = (Date.now() - c.timestamp) / 86400000;
      if (c.version !== VERSION || ageDays > MAX_AGE_DAYS) return null;
      return c;
    } catch (e) { return null; }
  }

  function saveChoice(statistik, marknadsforing) {
    var c = { version: VERSION, timestamp: Date.now(), statistik: statistik, marknadsforing: marknadsforing };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); } catch (e) {}
    return c;
  }

  function g(v) { return v ? 'granted' : 'denied'; }

  function deleteCookies(prefixes) {
    var host = location.hostname;
    var domains = ['', host, '.' + host];
    document.cookie.split(';').forEach(function (part) {
      var name = part.split('=')[0].trim();
      if (!prefixes.some(function (p) { return name.indexOf(p) === 0; })) return;
      domains.forEach(function (d) {
        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + (d ? '; domain=' + d : '');
      });
    });
  }

  function applyChoice(c) {
    gtag('consent', 'update', {
      ad_storage: g(c.marknadsforing),
      ad_user_data: g(c.marknadsforing),
      ad_personalization: g(c.marknadsforing),
      analytics_storage: g(c.statistik)
    });
    // Tar bort cookies som redan satts om samtycket dras tillbaka.
    if (!c.marknadsforing) deleteCookies(['_gcl_']);
    if (!c.statistik) deleteCookies(['_ga']);
    window.dataLayer.push({
      event: 'cookie_consent_update',
      consent_statistik: g(c.statistik),
      consent_marknadsforing: g(c.marknadsforing)
    });
  }

  // 2. Har besökaren redan valt: skicka valet direkt, innan GTM hunnit köra taggar.
  var stored = readChoice();
  if (stored) applyChoice(stored);

  // 3. Bannern.
  var css =
    '#cc-banner{position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;max-width:560px;margin:0 auto;background:#fff;color:#1f2a2e;border:1px solid #c5d0d0;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.18);padding:20px;font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}' +
    '#cc-banner h2{margin:0 0 8px;font-size:1.1rem}' +
    '#cc-banner p{margin:0 0 14px}' +
    '#cc-banner .cc-row{display:flex;flex-wrap:wrap;gap:10px}' +
    '#cc-banner button{flex:1 1 140px;font:inherit;font-weight:600;padding:11px 14px;border-radius:6px;cursor:pointer;border:2px solid #0f6e6a}' +
    '#cc-banner .cc-solid{background:#0f6e6a;color:#fff}' +
    '#cc-banner .cc-link{flex:0 0 auto;background:none;border:none;color:#0f6e6a;text-decoration:underline;padding:11px 4px}' +
    '#cc-banner fieldset{border:none;margin:0 0 14px;padding:0}' +
    '#cc-banner label{display:flex;gap:10px;align-items:flex-start;margin:0 0 10px;font-weight:400}' +
    '#cc-banner label input{margin-top:4px;width:18px;height:18px}' +
    '#cc-banner small{display:block;color:#66767a}';

  function el(html) { var d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; }

  function closeBanner() { var b = document.getElementById('cc-banner'); if (b) b.remove(); }

  function choose(statistik, marknadsforing) {
    applyChoice(saveChoice(statistik, marknadsforing));
    closeBanner();
  }

  function showBanner(withSettings) {
    closeBanner();
    var cur = readChoice() || { statistik: false, marknadsforing: false };
    var b = el(
      '<div id="cc-banner" role="dialog" aria-modal="false" aria-labelledby="cc-title">' +
        '<h2 id="cc-title">Vi använder cookies</h2>' +
        '<p>Nödvändiga cookies behövs för att sajten ska fungera. Med ditt samtycke använder vi också cookies för statistik och för att mäta våra annonser i Google Ads. Du kan ändra ditt val när du vill via länken Cookieinställningar längst ner på sidan.</p>' +
        '<fieldset id="cc-settings"' + (withSettings ? '' : ' hidden') + '>' +
          '<label><input type="checkbox" checked disabled> <span><strong>Nödvändiga</strong><small>Krävs för att sajten ska fungera. Kan inte stängas av.</small></span></label>' +
          '<label><input type="checkbox" id="cc-stat"' + (cur.statistik ? ' checked' : '') + '> <span><strong>Statistik</strong><small>Hjälper oss förstå hur sajten används (Google Analytics, cookies _ga).</small></span></label>' +
          '<label><input type="checkbox" id="cc-mark"' + (cur.marknadsforing ? ' checked' : '') + '> <span><strong>Marknadsföring</strong><small>Mäter vilka annonser som leder till förfrågningar (Google Ads, cookies _gcl_au och _gcl_aw).</small></span></label>' +
        '</fieldset>' +
        '<div class="cc-row">' +
          '<button type="button" class="cc-solid" id="cc-accept">Acceptera alla</button>' +
          '<button type="button" class="cc-solid" id="cc-deny">Neka alla</button>' +
          '<button type="button" class="cc-link" id="cc-more"' + (withSettings ? ' hidden' : '') + '>Inställningar</button>' +
          '<button type="button" class="cc-link" id="cc-save"' + (withSettings ? '' : ' hidden') + '>Spara mina val</button>' +
        '</div>' +
      '</div>'
    );
    document.body.appendChild(b);
    document.getElementById('cc-accept').onclick = function () { choose(true, true); };
    document.getElementById('cc-deny').onclick = function () { choose(false, false); };
    document.getElementById('cc-more').onclick = function () {
      document.getElementById('cc-settings').hidden = false;
      this.hidden = true;
      document.getElementById('cc-save').hidden = false;
    };
    document.getElementById('cc-save').onclick = function () {
      choose(document.getElementById('cc-stat').checked, document.getElementById('cc-mark').checked);
    };
  }

  window.glansbyCookieSettings = function () { showBanner(true); };

  function init() {
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    document.querySelectorAll('[data-cookie-settings]').forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); showBanner(true); });
    });
    if (!stored) showBanner(false);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
