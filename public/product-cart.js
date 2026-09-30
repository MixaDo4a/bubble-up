(() => {
  const key = "krmbl.cart.v1";

  document.addEventListener("click", event => {
    const back = event.target instanceof Element ? event.target.closest(".top .circle:not(.dots)") : null;
    if (!back || window.parent === window) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.parent.postMessage({ type: "krmbl-close-product-flow" }, location.origin);
  }, true);

  const read = () => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  };
  const write = items => {
    try {
      localStorage.setItem(key, JSON.stringify(items));
      return true;
    } catch {
      return false;
    }
  };

  async function resolveProduct() {
    if (window.__referenceAddonPickerEnabled && window.__krmblCartReady) {
      const state = await window.__krmblCartReady;
      if (!state?.product) throw new Error("Не удалось загрузить товар и добавки");
      return state.product;
    }

    const state = window.__krmblCartState;
    if (state?.product) return state.product;
    const id = new URLSearchParams(location.search).get("product");
    if (!id) throw new Error("Не удалось определить товар");
    const response = await fetch(`/api/catalog?addons=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Не удалось загрузить товар");
    const data = await response.json();
    const product = (data.campaigns || []).flatMap(campaign => campaign.menus || []).flatMap(menu => menu.products || []).find(item => item.id === id);
    if (!product) throw new Error("Товар не найден");
    return product;
  }

  function selectedRows(product) {
    const state = window.__krmblCartState;
    if (state?.productId !== product.id) return [];
    if (typeof state.getSelectedAddons === "function") {
      return state.getSelectedAddons().map(addon => ({
        id: addon.id,
        name: addon.name,
        price: Number(addon.price) || 0,
        quantity: Math.max(1, Math.floor(Number(addon.quantity) || 1)),
      }));
    }
    const ids = typeof state.getSelectedAddonIds === "function" ? state.getSelectedAddonIds() : [];
    return (product.addon_groups || []).flatMap(group => group.addons || []).filter(addon => ids.includes(addon.id)).map(addon => ({
      id: addon.id,
      name: addon.name,
      price: Number(addon.price) || 0,
      quantity: 1,
    }));
  }

  const button = document.querySelector(".add");
  if (!button) return;
  button.type = "button";
  const originalLabel = button.textContent;
  button.addEventListener("click", async event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (button.dataset.adding === "true") return;

    button.dataset.adding = "true";
    button.disabled = true;
    button.textContent = "Добавляем…";
    try {
      const product = await resolveProduct();
      const selected = selectedRows(product);
      const selectedIds = new Set(selected.map(addon => addon.id));
      const missing = (product.addon_groups || []).find(group => group.is_required && !(group.addons || []).some(addon => selectedIds.has(addon.id)));
      if (missing) throw new Error(`Выберите добавку: ${missing.name}`);

      const addonIds = [...selectedIds].sort();
      const addonQuantities = Object.fromEntries(selected.map(addon => [addon.id, addon.quantity]));
      const addonTotal = selected.reduce((sum, addon) => sum + addon.price * addon.quantity, 0);
      const signature = `${product.id}:${selected.map(addon => `${addon.id}x${addon.quantity}`).sort().join(",")}`;
      const items = read();
      const current = items.find(row => row.signature === signature);
      if (current) current.quantity = Math.min(99, Number(current.quantity || 1) + 1);
      else items.push({
        signature,
        productId: product.id,
        name: product.name,
        image: product.image_url || "",
        price: Number(product.price) || 0,
        addonIds,
        addonQuantities,
        addonNames: selected.map(addon => addon.quantity > 1 ? `${addon.name} × ${addon.quantity}` : addon.name),
        addonTotal,
        quantity: 1,
      });

      if (!write(items)) throw new Error("Не удалось сохранить корзину на этом устройстве");
      location.assign("/cart.html");
    } catch (error) {
      button.dataset.adding = "false";
      button.disabled = false;
      button.textContent = error instanceof Error ? error.message : "Не удалось добавить товар";
      window.setTimeout(() => {
        if (button.dataset.adding === "false") button.textContent = originalLabel;
      }, 2600);
    }
  });
})();
