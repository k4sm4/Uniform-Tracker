const API_BASE = 'http://localhost:3000/api';
let uniformItemsCache = [];

function showToast(msg, type = 'success') {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

async function fetchOfficers() { return await (await fetch(API_BASE + '/officers')).json(); }
async function fetchUniformItems() { return await (await fetch(API_BASE + '/uniform-items')).json(); }
async function fetchOrders() { return await (await fetch(API_BASE + '/orders')).json(); }
async function initOfficerSelect() {
    const select = document.getElementById('officer-select');
    const officers = await fetchOfficers();
    select.innerHTML = '<option value="">Select Officer</option>';
    officers.forEach(o => {
        const opt = document.createElement('option');
        opt.value = o.id; opt.textContent = o.surname + ', ' + o.firstName + ' (' + o.rollNumber + ')';
        if (o.archived) opt.disabled = true;
        select.appendChild(opt);
    });
}

function createOrderCard(order) {
    const card = document.createElement('div');
    card.className = 'order-card';
    card.dataset.orderId = order.id;
    let itemsHtml = '';
    order.items.forEach(item => {
        const ui = uniformItemsCache.find(i => i.id === item.uniformItemId);
        const sc = item.status.replace(/ /g, '_');
        itemsHtml += '<div class="order-item"><span>' + (ui ? ui.name : 'Unknown') + ' - ' + item.size + ' x' + item.quantity + '</span>';
        itemsHtml += '<span class="order-status ' + sc + '">' + item.status + '</span>';
        itemsHtml += '</div>';
    });
    const sc = order.overallStatus.replace(/ /g, '_');
    card.innerHTML = '<div class="order-card-header"><h3>' + order.officerName + '</h3><span class="order-status ' + sc + '">' + order.overallStatus + '</span></div>';
    card.innerHTML += '<div class="order-details"><div class="order-items">' + itemsHtml + '</div></div>';
    return card;
}

async function initOrdersDashboard() {
    const orders = await fetchOrders();
    const c = document.getElementById('orders-container');
    c.innerHTML = '';
    orders.forEach(order => { c.appendChild(createOrderCard(order)); });
}

async function initOfficersTab() {
    const officers = await fetchOfficers();
    const tb = document.querySelector('#officers-table tbody');
    tb.innerHTML = '';
    officers.forEach(o => {
        const r = document.createElement('tr');
        r.innerHTML = '<td>' + o.firstName + '</td><td>' + o.surname + '</td><td>' + o.rollNumber + '</td>';
        r.innerHTML += '<td><button class="action-btn delete-btn" data-id="' + o.id + '">Delete</button></td>';
        tb.appendChild(r);
    });
}

async function initUniformCatalog() {
    uniformItemsCache = await fetchUniformItems();
    const c = document.getElementById('uniform-items-container');
    c.innerHTML = '';
    uniformItemsCache.forEach(item => {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.dataset.itemId = item.id;
        card.innerHTML = '<h4>' + item.name + '</h4><div class="item-sizes">' + item.sizes.map(s => '<span class="size-item">' + s + '</span>').join('') + '</div>';
        card.innerHTML += '<button class="action-btn delete-item" data-id="' + item.id + '">Delete</button>';
        c.appendChild(card);
    });
}
// Order form handling
document.getElementById('order-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const officerId = document.getElementById('officer-select').value;
    const items = [];
    document.querySelectorAll('.cart-item').forEach(function(el) {
        const select = el.querySelector('select');
        const sizeInput = el.querySelector('.size-input');
        const qtyInput = el.querySelector('.qty-input');
        items.push({ uniformItemId: select.value, size: sizeInput.value, quantity: parseInt(qtyInput.value) || 1 });
    });
    if (!officerId || items.length === 0) { showToast('Please select an officer and add items', 'error'); return; }
    const res = await fetch(API_BASE + '/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ officerId: officerId, items: items }) });
    if (res.ok) { showToast('Order placed'); document.getElementById('order-form').reset(); document.getElementById('cart-items').innerHTML = ''; initOrdersDashboard(); }
    else { showToast('Failed to place order', 'error'); }
});

// Add item to cart
let cartItemCount = 0;
document.getElementById('add-item-btn').addEventListener('click', async function() {
    const items = await fetchUniformItems();
    const container = document.getElementById('cart-items');
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = '<select class="item-select" required><option value="">Select Item</option></select>';
    items.forEach(function(item) { const opt = document.createElement('option'); opt.value = item.id; opt.textContent = item.name; div.querySelector('.item-select').appendChild(opt); });
    div.innerHTML += '<select class="size-input" required><option value="">Select Size</option></select>';
    div.innerHTML += '<input type="number" class="qty-input" value="1" min="1" style="width:60px;"><button type="button" class="remove-item">X</button>';
    div.querySelector('.item-select').addEventListener('change', function(e) {
        const selectedItem = items.find(function(i) { return i.id === e.target.value; });
        const sizeSelect = div.querySelector('.size-input');
        sizeSelect.innerHTML = '<option value="">Select Size</option>';
        if (selectedItem) { selectedItem.sizes.forEach(function(s) { const opt = document.createElement('option'); opt.value = s; opt.textContent = s; sizeSelect.appendChild(opt); }); }
    });
    div.querySelector('.remove-item').addEventListener('click', function() { div.remove(); });
    div.querySelector('.item-select').dispatchEvent(new Event('change'));
    container.appendChild(div);
});

// Navigation
document.querySelectorAll('.nav-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
        const tab = e.target.dataset.tab;
        document.querySelectorAll('.nav-btn').forEach(function(b) { b.classList.remove('active'); });
        document.querySelectorAll('.tab-pane').forEach(function(t) { t.classList.remove('active'); });
        document.getElementById(tab + '-tab').classList.add('active');
        e.target.classList.add('active');
    });
});

// Theme toggle
document.getElementById('theme-toggle').addEventListener('click', function() {
    document.body.classList.toggle('dark');
    var btn = document.getElementById('theme-toggle');
    btn.textContent = document.body.classList.contains('dark') ? '☀️ Light Mode' : '🌙 Dark Mode';
});

// Initialize on load
document.addEventListener('DOMContentLoaded', async function() {
    initOfficerSelect();
    await initOrdersDashboard();
    await initOfficersTab();
    await initUniformCatalog();
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('delete-btn')) {
            var id = e.target.dataset.id;
            fetch(API_BASE + '/officers/' + id, { method: 'DELETE' })
                .then(function(r) { return r.json(); })
                .then(function(d) { showToast('Officer deleted'); initOfficersTab(); });
        }
        if (e.target.classList.contains('delete-item')) {
            var id = e.target.dataset.id;
            fetch(API_BASE + '/uniform-items/' + id, { method: 'DELETE' })
                .then(function(r) { return r.json(); })
                .then(function(d) { showToast('Item deleted'); initUniformCatalog(); });
        }
    });
});
// Modal handling
document.querySelectorAll('.modal .close').forEach(function(close) {
    close.addEventListener('click', function() { this.closest('.modal').classList.remove('active'); });
});

document.getElementById('add-officer-btn').addEventListener('click', function() {
    document.getElementById('officer-modal').classList.add('active');
    document.getElementById('officer-form').reset();
});

document.getElementById('add-uniform-btn').addEventListener('click', function() {
    document.getElementById('uniform-modal').classList.add('active');
    document.getElementById('uniform-form').reset();
});

document.getElementById('officer-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const firstName = document.getElementById('officer-first-name').value;
    const surname = document.getElementById('officer-surname').value;
    const rollNumber = document.getElementById('officer-roll-number').value;
    const res = await fetch(API_BASE + '/officers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ firstName, surname, rollNumber }) });
    if (res.ok) { showToast('Officer added'); document.getElementById('officer-modal').classList.remove('active'); initOfficersTab(); }
});

document.getElementById('uniform-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const name = document.getElementById('uniform-name').value;
    const sizes = document.getElementById('uniform-sizes').value.split(',').map(s => s.trim()).filter(s => s);
    const res = await fetch(API_BASE + '/uniform-items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, sizes }) });
    if (res.ok) { showToast('Item added'); document.getElementById('uniform-modal').classList.remove('active'); initUniformCatalog(); }
});

document.getElementById('add-item-btn-catalog').addEventListener('click', function() {
    document.getElementById('uniform-modal').classList.add('active');
    document.getElementById('uniform-modal-title').textContent = 'Add Uniform Item';
    document.getElementById('uniform-form').reset();
});
// Status filter
document.getElementById('status-filter').addEventListener('change', function() {
    const status = this.value;
    const cards = document.querySelectorAll('.order-card');
    cards.forEach(card => {
        const orderStatus = card.querySelector('.order-status').textContent;
        if (status === 'all' || orderStatus === status) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
});

// Export to CSV
document.getElementById('export-btn').addEventListener('click', function() {
    window.open(API_BASE + '/orders/export', '_blank');
});

// Search functionality
document.getElementById('search-input').addEventListener('input', function() {
    const query = this.value.toLowerCase();
    const cards = document.querySelectorAll('.order-card');
    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(query) ? 'block' : 'none';
    });
});
// Order modal
document.querySelectorAll('.order-card').forEach(function(card) {
    card.addEventListener('click', function() {
        const orderId = card.dataset.orderId;
        fetch(API_BASE + '/orders/' + orderId).then(r => r.json()).then(order => {
            document.getElementById('order-modal-title').textContent = 'Order Details - ' + order.id;
            let content = '<p><strong>Officer:</strong> ' + order.officerName + '</p>';
            content += '<p><strong>Placed:</strong> ' + new Date(order.placedAt).toLocaleString() + '</p>';
            content += '<p><strong>Status:</strong> ' + order.overallStatus + '</p><h4>Items:</h4><ul>';
            order.items.forEach(function(item) {
                const ui = uniformItemsCache.find(i => i.id === item.uniformItemId);
                content += '<li>' + (ui ? ui.name : 'Unknown') + ' - ' + item.size + ' x' + item.quantity + ' - ' + item.status;
            });
            content += '</ul>';
            document.getElementById('order-modal-content').innerHTML = content;
            document.getElementById('order-modal').classList.add('active');
        });
    });
});

document.getElementById('order-modal').querySelector('.close').addEventListener('click', function() {
    document.getElementById('order-modal').classList.remove('active');
});
