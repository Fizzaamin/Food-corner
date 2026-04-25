// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCHX0wLvpWo0VXDv6230H2EbQX62q7zJ_M",
    authDomain: "food-corner-98303.firebaseapp.com",
    projectId: "food-corner-98303",
    storageBucket: "food-corner-98303.firebasestorage.app",
    messagingSenderId: "981649256598",
    appId: "1:981649256598:web:2652366fa8b978ce1492b7"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Application State
let currentUser = null;
let products = [];
let cart = JSON.parse(localStorage.getItem('fc_cart')) || [];
let wishlist = JSON.parse(localStorage.getItem('fc_wishlist')) || [];

// Mock Products for initial load if DB is empty
const mockProducts = [
    { id: '1', name: 'Zinger Burger', price: 8.99, category: 'Fast Food', image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=400&q=80', description: 'Crispy fried chicken fillet with spicy mayo.' },
    { id: '2', name: 'Chicken Biryani', price: 12.50, category: 'Desi Food', image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=400&q=80', description: 'Aromatic basmati rice with tender chicken.' },
    { id: '3', name: 'Beef Seekh Kabab', price: 15.00, category: 'BBQ', image: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=400&q=80', description: 'Succulent grilled minced beef kebabs.' },
    { id: '4', name: 'Kung Pao Chicken', price: 11.99, category: 'Chinese', image: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=400&q=80', description: 'Spicy, stir-fried Chinese dish with peanuts.' },
    { id: '5', name: 'Pepperoni Pizza', price: 14.99, category: 'Fast Food', image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80', description: 'Classic pizza topped with beef pepperoni.' },
    { id: '6', name: 'Butter Chicken', price: 13.50, category: 'Desi Food', image: 'https://images.unsplash.com/photo-1603894584115-f73f2ec851a6?auto=format&fit=crop&w=400&q=80', description: 'Creamy tomato-based curry with grilled chicken.' }
];

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    updateCartUI();
    updateWishlistUI();

    // Auth Listener
    auth.onAuthStateChanged(user => {
        currentUser = user;
        const userBtn = document.getElementById('user-btn');
        if (user) {
            userBtn.innerHTML = `<i class="fas fa-user-circle"></i>`;
            userBtn.title = user.email;
        } else {
            userBtn.innerHTML = `<i class="far fa-user"></i>`;
        }
    });

    // Intersection Observer for animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('section').forEach(section => {
        observer.observe(section);
    });
});

// Navigation Logic
function showPage(pageId) {
    document.querySelectorAll('.page-section').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(`${pageId}-page`).classList.add('active');

    // Update nav links
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.classList.remove('active');
        if (link.textContent.toLowerCase() === pageId) link.classList.add('active');
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (pageId === 'cart') renderCart();
    if (pageId === 'wishlist') renderWishlist();
    if (pageId === 'checkout') renderCheckoutSummary();
}

// Data Handling
async function loadProducts() {
    try {
        const snapshot = await db.collection('products').get();
        if (snapshot.empty) {
            products = mockProducts;
            console.log('Using mock products');
        } else {
            products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
        renderProducts(products, 'featured-products', 4);
        renderProducts(products, 'menu-grid');
    } catch (error) {
        console.error('Error loading products:', error);
        products = mockProducts;
        renderProducts(products, 'featured-products', 4);
        renderProducts(products, 'menu-grid');
    }
}

function renderProducts(items, containerId, limit = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';
    const displayItems = limit ? items.slice(0, limit) : items;

    displayItems.forEach(product => {
        const isInWishlist = wishlist.find(item => item.id === product.id);
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <button class="wishlist-toggle ${isInWishlist ? 'active' : ''}" onclick="toggleWishlist('${product.id}')">
                <i class="fas fa-heart"></i>
            </button>
            <img src="${product.image}" alt="${product.name}" class="product-img">
            <div class="product-info">
                <h3>${product.name}</h3>
                <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 10px;">${product.description}</p>
                <div class="product-meta">
                    <span class="price">$${product.price.toFixed(2)}</span>
                    <button class="btn btn-primary" style="padding: 8px 16px; font-size: 0.9rem;" onclick="addToCart('${product.id}')">
                        <i class="fas fa-plus"></i> Add
                    </button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// Cart Logic
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    const existing = cart.find(item => item.id === productId);

    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }

    saveCart();
    updateCartUI();
    showToast(`${product.name} added to cart!`);
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCartUI();
    renderCart();
}

function updateQuantity(productId, delta) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) removeFromCart(productId);
        else {
            saveCart();
            updateCartUI();
            renderCart();
        }
    }
}

function saveCart() {
    localStorage.setItem('fc_cart', JSON.stringify(cart));
}

function updateCartUI() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cart-count').textContent = count;
}

function renderCart() {
    const container = document.getElementById('cart-items');
    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = '<div class="text-center" style="padding: 40px;"><i class="fas fa-shopping-basket" style="font-size: 3rem; color: #ccc; margin-bottom: 20px;"></i><p>Your cart is empty</p><button class="btn btn-primary" onclick="showPage(\'menu\')" style="margin-top: 20px;">Browse Menu</button></div>';
        updateCartTotals(0);
        return;
    }

    container.innerHTML = '';
    let subtotal = 0;

    cart.forEach(item => {
        subtotal += item.price * item.quantity;
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <img src="${item.image}" alt="${item.name}">
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <p style="color: var(--primary); font-weight: 700;">$${item.price.toFixed(2)}</p>
            </div>
            <div class="quantity-control">
                <button onclick="updateQuantity('${item.id}', -1)">-</button>
                <span>${item.quantity}</span>
                <button onclick="updateQuantity('${item.id}', 1)">+</button>
            </div>
            <button class="icon-btn" onclick="removeFromCart('${item.id}')" style="color: #ff4b4b;"><i class="fas fa-trash"></i></button>
        `;
        container.appendChild(div);
    });

    updateCartTotals(subtotal);
}

function updateCartTotals(subtotal) {
    const delivery = subtotal > 0 ? 5.00 : 0;
    const total = subtotal + delivery;
    document.getElementById('cart-subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('cart-total').textContent = `$${total.toFixed(2)}`;
}

// Wishlist Logic
function toggleWishlist(productId) {
    const product = products.find(p => p.id === productId);
    const index = wishlist.findIndex(item => item.id === productId);

    if (index > -1) {
        wishlist.splice(index, 1);
        showToast('Removed from wishlist');
    } else {
        wishlist.push(product);
        showToast('Added to wishlist!');
    }

    localStorage.setItem('fc_wishlist', JSON.stringify(wishlist));
    updateWishlistUI();
    renderProducts(products, 'featured-products', 4);
    renderProducts(products, 'menu-grid');
    if (document.getElementById('wishlist-page').classList.contains('active')) renderWishlist();
}

function updateWishlistUI() {
    document.getElementById('wishlist-count').textContent = wishlist.length;
}

function renderWishlist() {
    const container = document.getElementById('wishlist-grid');
    if (wishlist.length === 0) {
        container.innerHTML = '<p class="text-center" style="grid-column: 1/-1; padding: 40px;">No items in wishlist</p>';
        return;
    }
    renderProducts(wishlist, 'wishlist-grid');
}

// Auth Logic
async function handleAuth(type) {
    const email = document.getElementById(`${type}-email`).value;
    const password = document.getElementById(`${type}-password`).value;

    try {
        if (type === 'signup') {
            const name = document.getElementById('signup-name').value;
            const res = await auth.createUserWithEmailAndPassword(email, password);
            await db.collection('users').doc(res.user.uid).set({
                name, email, createdAt: new Date()
            });
            showToast('Account created successfully!');
        } else {
            await auth.signInWithEmailAndPassword(email, password);
            showToast('Welcome back!');
        }
        showPage('home');
    } catch (error) {
        alert(error.message);
    }
}

async function handleGoogleAuth() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        await auth.signInWithPopup(provider);
        showToast('Logged in with Google');
        showPage('home');
    } catch (error) {
        alert(error.message);
    }
}

function toggleAuthForm(form) {
    document.getElementById('login-form').classList.toggle('hidden', form === 'signup');
    document.getElementById('signup-form').classList.toggle('hidden', form === 'login');
}

// Checkout & Orders
function renderCheckoutSummary() {
    const container = document.getElementById('checkout-summary');
    let subtotal = 0;
    let html = '<h3>Order Summary</h3>';

    cart.forEach(item => {
        subtotal += item.price * item.quantity;
        html += `<div class="flex justify-between" style="margin: 10px 0;">
            <span>${item.name} x ${item.quantity}</span>
            <span>$${(item.price * item.quantity).toFixed(2)}</span>
        </div>`;
    });

    const delivery = 5.00;
    html += `<hr style="margin: 15px 0; opacity: 0.1;">
        <div class="flex justify-between"><span>Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
        <div class="flex justify-between"><span>Delivery</span><span>$5.00</span></div>
        <div class="flex justify-between" style="margin-top: 15px;"><strong>Total</strong><strong style="color: var(--primary); font-size: 1.2rem;">$${(subtotal + delivery).toFixed(2)}</strong></div>`;

    container.innerHTML = html;
}

async function placeOrder() {
    if (cart.length === 0) return alert('Cart is empty');
    if (!currentUser) {
        alert('Please login to place an order');
        showPage('auth');
        return;
    }

    const address = document.getElementById('order-address').value;
    const phone = document.getElementById('order-phone').value;

    if (!address || !phone) return alert('Please fill in all details');

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const orderData = {
        userId: currentUser.uid,
        items: cart,
        total: subtotal + 5,
        address,
        phone,
        status: 'Pending',
        createdAt: new Date()
    };

    try {
        await db.collection('orders').add(orderData);
        cart = [];
        saveCart();
        updateCartUI();
        alert('Order placed successfully! Thank you for choosing Food Corner.');
        showPage('home');
    } catch (error) {
        alert('Error placing order: ' + error.message);
    }
}

// Toast Notification
function showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--accent);
        color: white;
        padding: 12px 24px;
        border-radius: 30px;
        z-index: 2000;
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        font-weight: 600;
        animation: slideUp 0.3s ease-out;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = '0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Global Search
document.querySelector('.search-box button').onclick = () => {
    const query = prompt('Search for food:');
    if (query) {
        const filtered = products.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
        showPage('menu');
        renderProducts(filtered, 'menu-grid');
    }
};

// Filter Functions
function filterByCategory(category) {
    showPage('menu');
    const filtered = category === 'All' ? products : products.filter(p => p.category === category);
    renderProducts(filtered, 'menu-grid');
}

function sortProducts(criteria) {
    let sorted = [...products];
    if (criteria === 'price-low') sorted.sort((a, b) => a.price - b.price);
    if (criteria === 'price-high') sorted.sort((a, b) => b.price - a.price);
    renderProducts(sorted, 'menu-grid');
}
