// popup.js

const input = document.getElementById('shop-input');
const addBtn = document.getElementById('add-btn');
const shopList = document.getElementById('shop-list');
const statusMsg = document.getElementById('status-msg');

let blacklist = [];

function showStatus(msg) {
  statusMsg.textContent = msg;
  setTimeout(() => { statusMsg.textContent = ''; }, 1800);
}

function renderList() {
  shopList.innerHTML = '';

  if (blacklist.length === 0) {
    shopList.innerHTML = `
      <div class="empty-state">
        <span>🛒</span>
        Δεν έχεις προσθέσει κατάστημα ακόμα.
      </div>`;
    return;
  }

  blacklist.forEach((shop, index) => {
    const li = document.createElement('li');

    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = 'BLACKLIST';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'shop-name';
    nameSpan.textContent = shop;
    nameSpan.title = shop;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove';
    removeBtn.textContent = '×';
    removeBtn.title = 'Αφαίρεση';
    removeBtn.addEventListener('click', () => removeShop(index));

    li.appendChild(badge);
    li.appendChild(nameSpan);
    li.appendChild(removeBtn);
    shopList.appendChild(li);
  });
}

function saveAndRender() {
  chrome.storage.sync.set({ blacklist }, () => {
    renderList();
  });
}

function addShop() {
  const name = input.value.trim();
  if (!name) return;

  const normalized = name.toLowerCase();
  if (blacklist.map(s => s.toLowerCase()).includes(normalized)) {
    showStatus('Υπάρχει ήδη στη λίστα.');
    return;
  }

  blacklist.push(name);
  saveAndRender();
  input.value = '';
  showStatus('✓ Προστέθηκε!');
}

function removeShop(index) {
  blacklist.splice(index, 1);
  saveAndRender();
  showStatus('✓ Αφαιρέθηκε.');
}

// Init
chrome.storage.sync.get(['blacklist'], result => {
  blacklist = result.blacklist || [];
  renderList();
});

addBtn.addEventListener('click', addShop);
input.addEventListener('keydown', e => {
  if (e.key === 'Enter') addShop();
});
