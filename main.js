/* ============================================================
   West Palm Conchas — cart + ordering
   Loaded on every page. Safely ignores elements that aren't there.
   ============================================================ */

/* ====== CONFIG ====== */
// Change this one line to change the number orders go to.
// Format: country code + number, digits only. 1 = USA.
const PHONE_NUMBER = "15615021743";
const BAKERY_NAME = "West Palm Conchas";

/* ====== CART STATE ====== */
let order = [];
try {
  order = JSON.parse(localStorage.getItem("cartOrder")) || [];
} catch (e) {
  order = [];
}

/* ====== ELEMENTS (may be null depending on the page) ====== */
const orderList = document.getElementById("order-list");
const orderTotal = document.getElementById("order-total");
const bubbleTotal = document.getElementById("bubble-total");
const cartBubble = document.getElementById("cart-bubble");

/* ====== SAVE ====== */
function saveCart() {
  try {
    localStorage.setItem("cartOrder", JSON.stringify(order));
  } catch (e) {
    console.warn("Could not save cart.", e);
  }
}

/* ====== TOTAL ====== */
function getTotal() {
  return order.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function getItemCount() {
  return order.reduce((sum, item) => sum + item.qty, 0);
}

/* ====== RENDER ====== */
function renderCart() {
  const total = getTotal();

  if (orderList) {
    orderList.innerHTML = "";

    if (order.length === 0) {
      const li = document.createElement("li");
      li.className = "empty-cart";
      li.textContent = "Nothing here yet. Head to the menu to add something.";
      orderList.appendChild(li);
    } else {
      order.forEach((item, index) => {
        const li = document.createElement("li");

        const label = document.createElement("span");
        label.textContent =
          item.qty + "x " + item.name + " — $" + (item.price * item.qty).toFixed(2);

        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "remove-item";
        remove.textContent = "✕";
        remove.setAttribute("aria-label", "Remove " + item.name);
        remove.addEventListener("click", function () {
          removeItem(index);
        });

        li.appendChild(label);
        li.appendChild(remove);
        orderList.appendChild(li);
      });
    }
  }

  if (orderTotal) orderTotal.textContent = total.toFixed(2);
  if (bubbleTotal) bubbleTotal.textContent = total.toFixed(2);

  // Hide the floating bubble when the cart is empty
  if (cartBubble) {
    cartBubble.style.display = order.length === 0 ? "none" : "inline-block";
  }
}

/* ====== ADD / REMOVE ====== */
function addItemToCart(name, price, qty) {
  const existing = order.find(function (i) {
    return i.name === name;
  });

  if (existing) {
    existing.qty += qty;
  } else {
    order.push({ name: name, price: price, qty: qty });
  }

  saveCart();
  renderCart();
}

function removeItem(index) {
  order.splice(index, 1);
  saveCart();
  renderCart();
}

/* ====== SMALL CONFIRMATION MESSAGE ====== */
let toastTimer;
function showToast(message) {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    toast.setAttribute("role", "status");
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    toast.classList.remove("show");
  }, 1800);
}

/* ====== "ADD TO ORDER" BUTTONS (menu page) ====== */
document.querySelectorAll(".add-to-order").forEach(function (btn) {
  btn.addEventListener("click", function () {
    let name = btn.dataset.item;
    let price = parseFloat(btn.dataset.price) || 0;
    let qty = 1;

    // Find the quantity box inside this product card
    const card = btn.closest(".menu-item");
    const qtyInput = card ? card.querySelector('input[type="number"]') : null;
    if (qtyInput) {
      qty = parseInt(qtyInput.value, 10) || 1;
      if (qty < 1) qty = 1;
    }

    // Flavor dropdown (croissants)
    if (btn.dataset.flavorSelect) {
      const select = document.getElementById(btn.dataset.flavorSelect);
      if (select) {
        const opt = select.options[select.selectedIndex];
        name = name + " (" + opt.value + ")";
        price = parseFloat(opt.dataset.price) || price;
      }
    }

    addItemToCart(name, price, qty);
    showToast("Added " + qty + "x " + name);
  });
});

/* ====== BUILD THE ORDER MESSAGE ====== */
function buildOrderMessage() {
  const nameInput = document.getElementById("customer-name");
  const customer = nameInput ? nameInput.value.trim() : "";

  const methodInput = document.querySelector('input[name="fulfillment"]:checked');
  const method = methodInput ? methodInput.value : "";

  let msg = "Hi " + BAKERY_NAME + "! I'd like to place an order:\n\n";

  order.forEach(function (item) {
    msg += "- " + item.qty + "x " + item.name +
           " ($" + (item.price * item.qty).toFixed(2) + ")\n";
  });

  msg += "\nTotal: $" + getTotal().toFixed(2);
  if (method) msg += "\nMethod: " + method;
  if (customer) msg += "\nName: " + customer;

  return msg;
}

/* ====== CART PAGE BUTTONS ====== */
const sendWhatsApp = document.getElementById("send-order");
const sendSMS = document.getElementById("send-sms");
const clearOrder = document.getElementById("clear-order");

if (sendWhatsApp) {
  sendWhatsApp.addEventListener("click", function () {
    if (order.length === 0) {
      showToast("Add something to your cart first.");
      return;
    }
    const url = "https://wa.me/" + PHONE_NUMBER +
                "?text=" + encodeURIComponent(buildOrderMessage());
    window.open(url, "_blank");
  });
}

if (sendSMS) {
  sendSMS.addEventListener("click", function () {
    if (order.length === 0) {
      showToast("Add something to your cart first.");
      return;
    }
    // iPhones and Androids expect slightly different SMS link formats
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const separator = isIOS ? "&" : "?";
    window.location.href = "sms:+" + PHONE_NUMBER + separator +
                           "body=" + encodeURIComponent(buildOrderMessage());
  });
}

if (clearOrder) {
  clearOrder.addEventListener("click", function () {
    if (order.length === 0) return;
    if (!confirm("Clear everything from your cart?")) return;
    order = [];
    saveCart();
    renderCart();
    showToast("Cart cleared");
  });
}

/* ====== CONTACT FORM ====== */
const contactForm = document.getElementById("contact-form");
if (contactForm) {
  contactForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const name = document.getElementById("contact-name").value.trim();
    const phone = document.getElementById("contact-phone").value.trim();
    const message = document.getElementById("contact-message").value.trim();

    if (!name || !phone || !message) {
      showToast("Please fill in all three fields.");
      return;
    }

    const text = "Message from the website:\n\n" + message +
                 "\n\nName: " + name + "\nPhone: " + phone;

    window.open(
      "https://wa.me/" + PHONE_NUMBER + "?text=" + encodeURIComponent(text),
      "_blank"
    );
    contactForm.reset();
    showToast("Opening WhatsApp to send your message");
  });
}

/* ====== KEEP TABS IN SYNC ====== */
window.addEventListener("storage", function (e) {
  if (e.key === "cartOrder") {
    try {
      order = JSON.parse(e.newValue) || [];
    } catch (err) {
      order = [];
    }
    renderCart();
  }
});

/* ====== START ====== */
renderCart();
