// content.js — τρέχει στο skroutz.gr και σημαίνει blacklisted καταστήματα

let blacklist = [];

function normalizeShopName(name) {
  return name.trim().toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ');
}

function isBlacklisted(text) {
  if (!text) return false;
  const normalized = normalizeShopName(text);
  return blacklist.some(b => normalized.includes(b) || b.includes(normalized));
}

// Εξαγωγή shop name από URL: /shop/{id}/{ShopName}/
function getShopNameFromUrl() {
  const match = window.location.pathname.match(/^\/shop\/\d+\/([^/]+)/);
  if (!match) return null;
  // Decode URL encoding (π.χ. %20 → space)
  return decodeURIComponent(match[1]).replace(/-/g, ' ');
}

// ── Σελίδα καταστήματος (/shop/.../products) ──
function checkShopPage() {
  const shopFromUrl = getShopNameFromUrl();

  // Fallback: όνομα από το h1 της σελίδας
  const shopFromDom = (
    document.querySelector('h1') ||
    document.querySelector('[class*="shop-header"] [class*="name"]') ||
    document.querySelector('[class*="shop-title"]')
  )?.textContent?.trim();

  const shopName = shopFromUrl || shopFromDom;
  if (!shopName || !isBlacklisted(shopName)) return false;

  console.log('[Skroutz Blacklist] Shop page blacklisted:', shopName);

  // Βρες όλα τα product cards
  const selectors = [
    'li.card',
    'li[class*="card"]',
    '[class*="product-card"]',
    '[id^="sku"]',
    '.sku-list-item',
    'article',
  ];

  let cards = document.querySelectorAll(selectors.join(', '));

  if (cards.length === 0) {
    // Τελευταία λύση: σήμανε το product grid
    const grid =
      document.querySelector('ul.cards') ||
      document.querySelector('[class*="product-list"]') ||
      document.querySelector('[class*="products-container"]');
    if (grid) applyBlacklist(grid);
    return true;
  }

  cards.forEach(card => applyBlacklist(card));
  return true;
}

// ── Σελίδα αναζήτησης / κατηγορίας / προϊόντος ──
function checkGenericPage() {
  // Links που οδηγούν σε /shop/
  document.querySelectorAll('a[href*="/shop/"]').forEach(el => {
    const hrefMatch = el.getAttribute('href')?.match(/\/shop\/\d+\/([^/?#]+)/);
    const nameFromHref = hrefMatch ? decodeURIComponent(hrefMatch[1]).replace(/-/g, ' ') : null;
    const nameFromText = el.textContent.trim();
    if (isBlacklisted(nameFromHref) || isBlacklisted(nameFromText)) {
      applyBlacklist(findContainer(el));
    }
  });

  // data attributes
  document.querySelectorAll('[data-shop-name], [data-merchant-name], [data-shop]').forEach(el => {
    const name =
      el.getAttribute('data-shop-name') ||
      el.getAttribute('data-merchant-name') ||
      el.getAttribute('data-shop') || '';
    if (isBlacklisted(name)) applyBlacklist(findContainer(el));
  });

  // Selectors με shop/seller
  document.querySelectorAll(
    '[class*="shop-name"], [class*="seller-name"], [class*="store-name"]'
  ).forEach(el => {
    if (isBlacklisted(el.textContent)) applyBlacklist(findContainer(el));
  });
}

function findContainer(el) {
  return (
    el.closest('[id^="sku"]') ||
    el.closest('li.card') ||
    el.closest('li[class*="card"]') ||
    el.closest('[class*="product-card"]') ||
    el.closest('article') ||
    el.closest('tr') ||
    el.closest('li') ||
    el.parentElement
  );
}

function applyBlacklist(container) {
  if (!container || container.classList.contains('skroutz-blacklisted')) return;
  container.classList.add('skroutz-blacklisted');

  const badge = document.createElement('span');
  badge.className = 'skroutz-blacklist-badge';
  badge.textContent = '🚫 BLACKLIST';
  if (getComputedStyle(container).position === 'static') {
    container.style.position = 'relative';
  }
  container.appendChild(badge);
}

function markAll() {
  if (blacklist.length === 0) return;
  const onShopPage = checkShopPage();
  if (!onShopPage) checkGenericPage();
}

function reset() {
  document.querySelectorAll('.skroutz-blacklisted').forEach(el => {
    el.classList.remove('skroutz-blacklisted');
    el.querySelector('.skroutz-blacklist-badge')?.remove();
  });
}

function loadBlacklistAndMark() {
  chrome.storage.sync.get(['blacklist'], result => {
    blacklist = (result.blacklist || []).map(normalizeShopName);
    console.log('[Skroutz Blacklist] Loaded:', blacklist);
    markAll();
  });
}

loadBlacklistAndMark();

const observer = new MutationObserver(() => markAll());
observer.observe(document.body, { childList: true, subtree: true });

chrome.storage.onChanged.addListener((changes) => {
  if (changes.blacklist) {
    blacklist = (changes.blacklist.newValue || []).map(normalizeShopName);
    console.log('[Skroutz Blacklist] Updated:', blacklist);
    reset();
    markAll();
  }
});
