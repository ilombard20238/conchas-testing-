/* ============================================================
   West Palm Conchas — Cart + Ordering + Google Sheets
   ============================================================ */

/* ====== CONFIG ====== */

const PHONE_NUMBER = "15615021743";
const BAKERY_NAME = "West Palm Conchas";

const SHEET_MONKEY_URL =
  "https://api.sheetmonkey.io/form/duC6wDcsSZP8xFX6pam5JE";


/* ====== CART STATE ====== */

let order = [];

try {
  order = JSON.parse(localStorage.getItem("cartOrder")) || [];
} catch (e) {
  order = [];
}


/* ====== ELEMENTS ====== */

const orderList = document.getElementById("order-list");
const orderTotal = document.getElementById("order-total");
const bubbleTotal = document.getElementById("bubble-total");
const cartBubble = document.getElementById("cart-bubble");


/* ====== SAVE CART ====== */

function saveCart() {
  try {
    localStorage.setItem("cartOrder", JSON.stringify(order));
  } catch (e) {
    console.warn("Could not save cart.", e);
  }
}


/* ====== TOTALS ====== */

function getTotal() {
  return order.reduce(function (sum, item) {
    return sum + item.price * item.qty;
  }, 0);
}

function getItemCount() {
  return order.reduce(function (sum, item) {
    return sum + item.qty;
  }, 0);
}


/* ====== RENDER CART ====== */

function renderCart() {
  const total = getTotal();

  if (orderList) {
    orderList.innerHTML = "";

    if (order.length === 0) {
      const li = document.createElement("li");

      li.className = "empty-cart";
      li.textContent =
        "Nothing here yet. Head to the menu to add something.";

      orderList.appendChild(li);

    } else {
      order.forEach(function (item, index) {
        const li = document.createElement("li");

        const label = document.createElement("span");

        label.textContent =
          item.qty +
          "x " +
          item.name +
          " — $" +
          (item.price * item.qty).toFixed(2);

        const remove = document.createElement("button");

        remove.type = "button";
        remove.className = "remove-item";
        remove.textContent = "✕";

        remove.setAttribute(
          "aria-label",
          "Remove " + item.name
        );

        remove.addEventListener("click", function () {
          removeItem(index);
        });

        li.appendChild(label);
        li.appendChild(remove);

        orderList.appendChild(li);
      });
    }
  }

  if (orderTotal) {
    orderTotal.textContent = total.toFixed(2);
  }

  if (bubbleTotal) {
    bubbleTotal.textContent = total.toFixed(2);
  }

  if (cartBubble) {
    cartBubble.style.display =
      order.length === 0 ? "none" : "inline-block";
  }
}


/* ====== ADD / REMOVE ITEMS ====== */

function addItemToCart(name, price, qty) {
  const existing = order.find(function (item) {
    return item.name === name;
  });

  if (existing) {
    existing.qty += qty;
  } else {
    order.push({
      name: name,
      price: price,
      qty: qty
    });
  }

  saveCart();
  renderCart();
}

function removeItem(index) {
  order.splice(index, 1);

  saveCart();
  renderCart();
}


/* ====== TOAST MESSAGE ====== */

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


/* ====== ADD TO ORDER BUTTONS ====== */

document.querySelectorAll(".add-to-order").forEach(function (btn) {
  btn.addEventListener("click", function () {
    let name = btn.dataset.item;
    let price = parseFloat(btn.dataset.price) || 0;
    let qty = 1;

    const card = btn.closest(".menu-item");

    const qtyInput = card
      ? card.querySelector('input[type="number"]')
      : null;

    if (qtyInput) {
      qty = parseInt(qtyInput.value, 10) || 1;

      if (qty < 1) {
        qty = 1;
      }
    }

    /* Flavor dropdown */
    if (btn.dataset.flavorSelect) {
      const select = document.getElementById(
        btn.dataset.flavorSelect
      );

      if (select) {
        const opt = select.options[select.selectedIndex];

        name = name + " (" + opt.value + ")";

        price =
          parseFloat(opt.dataset.price) || price;
      }
    }

    addItemToCart(name, price, qty);

    showToast("Added " + qty + "x " + name);
  });
});


/* ====== CUSTOMER INFORMATION ====== */

function getCustomerInformation() {
  const nameInput =
    document.getElementById("customer-name");

  const phoneInput =
    document.getElementById("customer-phone");

  const methodInput =
    document.querySelector(
      'input[name="fulfillment"]:checked'
    );

  return {
    name: nameInput
      ? nameInput.value.trim()
      : "",

    phone: phoneInput
      ? phoneInput.value.trim()
      : "",

    fulfillment: methodInput
      ? methodInput.value
      : ""
  };
}


/* ====== BUILD WHATSAPP MESSAGE ====== */

function buildOrderMessage() {
  const customer = getCustomerInformation();

  let msg =
    "Hi " +
    BAKERY_NAME +
    "! I'd like to place an order:\n\n";

  order.forEach(function (item) {
    msg +=
      "- " +
      item.qty +
      "x " +
      item.name +
      " ($" +
      (item.price * item.qty).toFixed(2) +
      ")\n";
  });

  msg +=
    "\nTotal: $" +
    getTotal().toFixed(2);

  if (customer.fulfillment) {
    msg +=
      "\nMethod: " +
      customer.fulfillment;
  }

  if (customer.name) {
    msg +=
      "\nName: " +
      customer.name;
  }

  if (customer.phone) {
    msg +=
      "\nPhone: " +
      customer.phone;
  }

  return msg;
}


/* ====== SEND ORDER TO GOOGLE SHEETS ====== */

async function submitOrderToSheet() {
  const customer = getCustomerInformation();

  const items = order.map(function (item) {
    return (
      item.qty +
      "x " +
      item.name
    );
  }).join(", ");

  const itemDetails = order.map(function (item) {
    return {
      product: item.name,
      quantity: item.qty,
      unitPrice: item.price,
      productTotal:
        (item.price * item.qty).toFixed(2)
    };
  });

  const orderData = {
    "Order Date": new Date().toLocaleDateString(),
    "Order Time": new Date().toLocaleTimeString(),

    "Customer Name": customer.name,
    "Phone Number": customer.phone,

    "Fulfillment": customer.fulfillment,

    "Products": items,

    "Item Details": JSON.stringify(itemDetails),

    "Order Total": getTotal().toFixed(2),

    "Order Status": "New",

    "Payment Status": "Pending",

    "Order Method": "Website"
  };

  const response = await fetch(SHEET_MONKEY_URL, {
    method: "POST",

    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify(orderData)
  });

  if (!response.ok) {
    throw new Error(
      "Could not save order to Google Sheets."
    );
  }

  return true;
}


/* ====== CART PAGE BUTTONS ====== */

const sendWhatsApp =
  document.getElementById("send-order");

const sendSMS =
  document.getElementById("send-sms");

const clearOrder =
  document.getElementById("clear-order");


/* ====== WHATSAPP ORDER ====== */

if (sendWhatsApp) {
  sendWhatsApp.addEventListener(
    "click",
    async function () {
      if (order.length === 0) {
        showToast("Add something to your cart first.");
        return;
      }

      sendWhatsApp.disabled = true;

      const originalText =
        sendWhatsApp.textContent;

      sendWhatsApp.textContent =
        "Saving order...";

      try {
        await submitOrderToSheet();

        showToast(
          "Order saved! Opening WhatsApp..."
        );

        const url =
          "https://wa.me/" +
          PHONE_NUMBER +
          "?text=" +
          encodeURIComponent(
            buildOrderMessage()
          );

        window.open(url, "_blank");

      } catch (error) {
        console.error(
          "Order submission failed:",
          error
        );

        showToast(
          "Could not save order. Please try again."
        );

      } finally {
        sendWhatsApp.disabled = false;

        sendWhatsApp.textContent =
          originalText;
      }
    }
  );
}


/* ====== SMS ORDER ====== */

if (sendSMS) {
  sendSMS.addEventListener(
    "click",
    async function () {
      if (order.length === 0) {
        showToast("Add something to your cart first.");
        return;
      }

      sendSMS.disabled = true;

      const originalText =
        sendSMS.textContent;

      sendSMS.textContent =
        "Saving order...";

      try {
        await submitOrderToSheet();

        const isIOS =
          /iPad|iPhone|iPod/.test(
            navigator.userAgent
          );

        const separator =
          isIOS ? "&" : "?";

        const smsURL =
          "sms:+" +
          PHONE_NUMBER +
          separator +
          "body=" +
          encodeURIComponent(
            buildOrderMessage()
          );

        window.location.href = smsURL;

      } catch (error) {
        console.error(
          "Order submission failed:",
          error
        );

        showToast(
          "Could not save order. Please try again."
        );

      } finally {
        sendSMS.disabled = false;

        sendSMS.textContent =
          originalText;
      }
    }
  );
}


/* ====== CLEAR ORDER ====== */

if (clearOrder) {
  clearOrder.addEventListener(
    "click",
    function () {
      if (order.length === 0) {
        return;
      }

      if (
        !confirm(
          "Clear everything from your cart?"
        )
      ) {
        return;
      }

      order = [];

      saveCart();
      renderCart();

      showToast("Cart cleared");
    }
  );
}


/* ====== CONTACT FORM ====== */

const contactForm =
  document.getElementById("contact-form");

if (contactForm) {
  contactForm.addEventListener(
    "submit",
    function (e) {
      e.preventDefault();

      const name =
        document.getElementById(
          "contact-name"
        ).value.trim();

      const phone =
        document.getElementById(
          "contact-phone"
        ).value.trim();

      const message =
        document.getElementById(
          "contact-message"
        ).value.trim();

      if (!name || !phone || !message) {
        showToast(
          "Please fill in all three fields."
        );

        return;
      }

      const text =
        "Message from the website:\n\n" +
        message +
        "\n\nName: " +
        name +
        "\nPhone: " +
        phone;

      window.open(
        "https://wa.me/" +
        PHONE_NUMBER +
        "?text=" +
        encodeURIComponent(text),
        "_blank"
      );

      contactForm.reset();

      showToast(
        "Opening WhatsApp to send your message"
      );
    }
  );
}


/* ====== KEEP TABS IN SYNC ====== */

window.addEventListener(
  "storage",
  function (e) {
    if (e.key === "cartOrder") {
      try {
        order =
          JSON.parse(e.newValue) || [];
      } catch (err) {
        order = [];
      }

      renderCart();
    }
  }
);


/* ====== START ====== */

renderCart();
