let products = [];
let cart = [];

const productsContainer = document.getElementById('products-container');
const cartItemsContainer = document.getElementById('cart-items');
const cartCount = document.getElementById('cart-count');
const cartTotalAmount = document.getElementById('cart-total-amount');
const cartOverlay = document.getElementById('cart-overlay');
const cartBtn = document.getElementById('cart-btn');
const closeCartBtn = document.getElementById('close-cart');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const categoryBtns = document.querySelectorAll('.category-btn');
const checkoutBtn = document.getElementById('checkout-btn');

async function fetchProductsFromSheet() {
  const url = "https://script.google.com/macros/s/AKfycbxtYVLm7tXnR-r4ef5EgUh2yq004eZ34sUDSIRrAHM3bHTxf9Y-zcuXxVXrWcZe4f14/exec"; // 👈 REPLACE THIS

  try {
    const res = await fetch(url);
    products = await res.json();

    // Clean up and convert data types
    products.forEach(p => {
      p.id = parseInt(p.id);
      p.price = parseFloat(p.price);
      p.bulkPrice = parseFloat(p.bulkPrice);
      p.bulkQty = parseInt(p.bulkQty);
    });

    renderProducts(products);
    updateCart();
  } catch (err) {
    console.error("Error fetching products from Google Sheet:", err);
    productsContainer.innerHTML = '<p style="color:red;">Failed to load products.</p>';
  }
}

async function init() {
  autofillUserData();
  await fetchProductsFromSheet(); // fetch from Google Sheet
  setupEventListeners();
}

function renderProducts(productsToRender) {
  productsContainer.innerHTML = '';

  productsToRender.forEach(product => {
    const productCard = document.createElement('div');
    productCard.className = 'product-card';
    productCard.dataset.category = product.category;

    productCard.innerHTML = `
      <div class="product-image">
        <img src="${product.image}" alt="${product.name}" style="width: 150px; height: 150px; object-fit: cover;" />
      </div>
      <div class="product-info">
        <h3 class="product-name">${product.name}</h3>
        <p class="product-price">₹${product.price} <small>(Single)</small></p>
        <p class="product-price">₹${product.bulkPrice} <small>(Bulk: ${product.bulkQty} pcs)</small></p>
        <select class="price-type" data-id="${product.id}">
          <option value="single">Single</option>
          <option value="bulk">Bulk</option>
        </select>
        <div class="quantity-input-wrapper">
          <input type="number" class="quantity-input" data-id="${product.id}" value="0" min="0" />
          <button class="add-to-cart" data-id="${product.id}">Add</button>
        </div>
        
      </div>
    `;

    productsContainer.appendChild(productCard);
  });
}

function setupEventListeners() {
  cartBtn.addEventListener('click', () => cartOverlay.style.display = 'flex');
  closeCartBtn.addEventListener('click', () => cartOverlay.style.display = 'none');
  searchBtn.addEventListener('click', handleSearch);
  searchInput.addEventListener('keypress', e => { if (e.key === 'Enter') handleSearch(); });

  categoryBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      categoryBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterProductsByCategory(btn.dataset.category);
    });
  });

  checkoutBtn.addEventListener('click', sendWhatsAppOrder);
  productsContainer.addEventListener('click', handleProductAction);
}

function handleProductAction(e) {
  const target = e.target;
  const productId = parseInt(target.dataset.id);

  if (target.classList.contains('add-to-cart')) {
    const input = document.querySelector(`.quantity-input[data-id="${productId}"]`);
    const qty = parseInt(input.value) || 0;
    if (qty <= 0) return alert("Enter quantity greater than 0");

    const type = getPriceType(productId);
    const product = products.find(p => p.id === productId);
    const price = type === 'bulk' ? product.bulkPrice : product.price;
    const bulkQty = type === 'bulk' ? product.bulkQty : 1;

    const existingItem = cart.find(item => item.id === productId && item.type === type);
    if (existingItem) {
      existingItem.quantity += qty;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price,
        type,
        bulkQty,
        image: product.image,
        quantity: qty
      });
    }

    input.value = 0;
    updateCart();
  }
}

function getPriceType(productId) {
  const selector = document.querySelector(`.price-type[data-id="${productId}"]`);
  return selector?.value || 'single';
}

function updateCart() {
  cartItemsContainer.innerHTML = '';
  if (cart.length === 0) {
    cartItemsContainer.innerHTML = '<p>Your cart is empty</p>';
  } else {
    cart.forEach(item => {
      const div = document.createElement('div');
      div.className = 'cart-item';
      const totalPieces = item.quantity * (item.bulkQty || 1);
      div.innerHTML = `
        <div class="cart-item-info">
          <div class="cart-item-image">
            <img src="${item.image}" alt="${item.name}" style="width: 50px; height: 50px;" />
          </div>
          <div class="cart-item-details">
            <h4>${item.name} (${item.type}${item.type === 'bulk' ? `: ${item.bulkQty} pcs` : ''})</h4>
            <p>₹${item.price} each</p>
            <p>Subtotal: ₹${item.price * item.quantity}</p>
            <p>Total Pieces: ${totalPieces}</p>
          </div>
        </div>
        <div class="cart-item-actions">
          <input type="number" class="cart-qty-input" data-id="${item.id}" value="${item.quantity}" min="1" style="width: 60px; padding: 4px; text-align: center;" />
          <button class="remove-item" data-id="${item.id}">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `;
      cartItemsContainer.appendChild(div);
    });

    // Quantity change
    document.querySelectorAll('.cart-qty-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const id = parseInt(e.target.dataset.id);
        const item = cart.find(i => i.id === id);
        const newQty = parseInt(e.target.value);

        if (item && newQty >= 1) {
          item.quantity = newQty;
        } else if (item && newQty <= 0) {
          cart = cart.filter(i => i.id !== id);
        }

        updateCart();
      });
    });

    // Remove button
    document.querySelectorAll('.remove-item').forEach(btn => {
      btn.addEventListener('click', e => {
        const id = parseInt(btn.dataset.id);
        cart = cart.filter(i => i.id !== id);
        updateCart();
      });
    });
  }

  cartCount.textContent = cart.reduce((total, item) => total + item.quantity, 0);
  cartTotalAmount.textContent = cart.reduce((total, item) => total + item.price * item.quantity, 0);
}

function handleSearch() {
  const term = searchInput.value.toLowerCase().trim();
  if (!term) {
    renderProducts(products);
  } else {
    renderProducts(products.filter(p => p.name.toLowerCase().includes(term)));
  }
}

function filterProductsByCategory(category) {
  if (category === 'all') return renderProducts(products);
  renderProducts(products.filter(p => p.category === category));
}

function sendWhatsAppOrder() {
  if (cart.length === 0) return alert('Your cart is empty!');

  const name = document.getElementById("user-name").value;
  const phone = document.getElementById("user-phone").value;
  const address = document.getElementById("user-address").value;

  if (!name || !phone || !address) {
    alert("Please fill all details");
    return;
  }

 

  localStorage.setItem("user-name", name);
  localStorage.setItem("user-phone", phone);
  localStorage.setItem("user-address", address);

  let message = `*Order Details:*\n`;
   let counter = 1; // Declare counter outside the loop
   function nextNumber() {
  return counter++;
}
  cart.forEach(item => {
    const totalPieces = item.quantity * (item.bulkQty || 1);
    const number = nextNumber();

   message += `${number}.${item.name} (${item.type}),`;
   
    message += ` Qty: ${item.quantity},`;
    if (item.type === 'bulk') {
      message += ` 1 Bulk = ${item.bulkQty} pcs\n`;
      // message += `   Total Pieces: ${totalPieces}\n`;
    }
    // message += `   Price: ₹${item.price}\n`;
    message += ` S.total:₹${item.quantity * item.price}\n`;
  });

  message += `*Total Amount: ₹${cart.reduce((total, item) => total + item.price * item.quantity, 0)}*\n\n`;
  message += `*Customer Details:*\nName: ${name}\nPhone: ${phone}\nDelivery Address: ${address}\n\n`;

  const whatsappNumber = "917852919235";
  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/${whatsappNumber}?text=${encoded}`, '_blank');
}

function autofillUserData() {
  const name = localStorage.getItem("user-name");
  const phone = localStorage.getItem("user-phone");
  const address = localStorage.getItem("user-address");
  if (name) document.getElementById("user-name").value = name;
  if (phone) document.getElementById("user-phone").value = phone;
  if (address) document.getElementById("user-address").value = address;
}

init();
