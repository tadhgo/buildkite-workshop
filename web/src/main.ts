import "./styles.css";
import { kiteArt } from "./art";
import { Cart } from "./cart";
import { catalog } from "./catalog";
import { formatPrice } from "./price";

const cart = new Cart();

const productList = document.querySelector<HTMLUListElement>("#products")!;
const productCount = document.querySelector<HTMLElement>("#product-count")!;
const cartPanel = document.querySelector<HTMLElement>("#cart")!;
const cartToggle = document.querySelector<HTMLButtonElement>("#cart-toggle")!;
const cartCount = document.querySelector<HTMLElement>("#cart-count")!;
const cartTotal = document.querySelector<HTMLElement>("#cart-total")!;
const cartItems = document.querySelector<HTMLUListElement>("#cart-items")!;
const cartEmpty = document.querySelector<HTMLElement>("#cart-empty")!;

function renderProducts(): void {
  productCount.textContent = `${catalog.length} kites`;
  productList.innerHTML = catalog
    .map(
      (product) => `
      <li class="product" data-testid="product">
        <div class="art">${kiteArt(product.id)}</div>
        <div class="info">
          <div>
            <h3>${product.name}</h3>
            <p class="price">${formatPrice(product.priceCents)}</p>
          </div>
          <button class="add" data-add="${product.id}" aria-label="Add ${product.name} to cart">Add to cart</button>
        </div>
      </li>`,
    )
    .join("");
}

function renderCart(): void {
  cartCount.textContent = String(cart.count);
  cartTotal.textContent = formatPrice(cart.totalCents);
  cartEmpty.hidden = cart.count > 0;
  cartItems.innerHTML = cart.items
    .map(
      (line) => `
      <li>
        <span class="thumb">${kiteArt(line.product.id)}</span>
        <span class="line-name">${line.product.name}<br /><span class="muted">${line.quantity} × ${formatPrice(line.product.priceCents)}</span></span>
        <button class="icon-button" data-remove="${line.product.id}" aria-label="Remove one ${line.product.name}">−</button>
      </li>`,
    )
    .join("");
}

function setCartOpen(open: boolean): void {
  cartPanel.hidden = !open;
  cartToggle.setAttribute("aria-expanded", String(open));
}

document.addEventListener("click", (event) => {
  const target = (event.target as HTMLElement).closest("button");
  if (!target) {
    return;
  }
  if (target.dataset.add) {
    cart.add(target.dataset.add);
    cartCount.classList.remove("pulse");
    void cartCount.offsetWidth;
    cartCount.classList.add("pulse");
  } else if (target.dataset.remove) {
    cart.remove(target.dataset.remove);
  } else if (target.id === "cart-toggle") {
    setCartOpen(cartPanel.hidden);
  } else if (target.id === "cart-close") {
    setCartOpen(false);
  }
  renderCart();
});

renderProducts();
renderCart();
