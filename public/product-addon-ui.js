/* Reference-style add-on picker. Catalog values and media remain constructor-owned. */
window.__referenceAddonPickerEnabled = true;
(() => {
  const safeText = value => String(value ?? '').replace(/[<>]/g, '');
  const mediaOf = item => item?.image_url || item?.imageUrl || item?.icon_url || item?.iconUrl || item?.photo_url || item?.image || item?.icon || '';
  const soldOut = item => item?.sold_out === true || item?.is_sold_out === true || item?.is_available === false || item?.available === false || item?.status === 'sold_out';
  const esc = value => safeText(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  async function init() {
    const productId = new URLSearchParams(location.search).get('product');
    const bar = document.querySelector('.addons');
    const pop = document.querySelector('.popover');
    const choices = document.querySelector('#choices');
    const title = document.querySelector('#popTitle');
    const priceButton = document.querySelector('.add');
    if (!productId || !bar || !pop || !choices || !title || !priceButton) return;

    try {
      const response = await fetch('/api/catalog?addons=' + Date.now(), { cache: 'no-store' });
      if (!response.ok) throw new Error('Catalog request failed: ' + response.status);
      const catalog = await response.json();
      const product = (catalog.campaigns || []).flatMap(c => c.menus || []).flatMap(m => m.products || []).find(p => p.id === productId);
      if (!product) return;
      const groups = product.addon_groups || [];
      const selected = {};
      const presetIds = new Set((new URLSearchParams(location.search).get('addons') || '').split(',').filter(Boolean));
      groups.forEach(group => {
        const cap = Number(group.max_quantity) > 0 ? Number(group.max_quantity) : Infinity;
        const preset = (group.addons || []).filter(addon => presetIds.has(addon.id)).slice(0, cap);
        if (preset.length) selected[group.id] = preset.map(addon => ({ addon, quantity: 1 }));
        else if (group.is_required && group.addons?.[0] && !soldOut(group.addons[0])) selected[group.id] = [{ addon: group.addons[0], quantity: 1 }];
      });

      const productPrice = Number(product.price) || 0;
      let currentGroup = null;
      let lastIndex = -1;
      let closeTimer = null;
      const listFor = group => selected[group.id] || (selected[group.id] = []);
      const rowFor = (group, addon) => listFor(group).find(row => row.addon.id === addon.id);
      const isMulti = addon => addon.selection_mode === 'multiple' || addon.selection_mode === 'multi' || addon.allow_multiple === true;
      const total = () => productPrice + Object.values(selected).flat().reduce((sum, row) => sum + (Number(row.addon.price) || 0) * row.quantity, 0);

      function refreshPrice() {
        priceButton.textContent = '+ ' + total() + ' ₽';
      }

      function updateCart() {
        const rows = Object.values(selected).flat();
        window.__krmblCartState = {
          productId: product.id,
          product,
          getSelectedAddonIds: () => Object.values(selected).flat().map(row => row.addon.id),
          getSelectedAddons: () => Object.values(selected).flat().map(row => ({ ...row.addon, quantity: row.quantity })),
          getTotalPrice: total
        };
        return rows;
      }

      function imageMarkup(url, className) {
        return url ? '<img class="' + className + '" src="' + esc(url) + '" alt="" loading="lazy">' : '<span class="' + className + ' addon-image-fallback" aria-hidden="true">✦</span>';
      }

      function updateGroupTile(group) {
        const button = bar.querySelector('[data-addon-group="' + CSS.escape(String(group.id)) + '"]');
        if (!button) return;
        const rows = listFor(group);
        const media = rows.map(row => mediaOf(row.addon)).filter(Boolean);
        const groupMedia = mediaOf(group);
        const icon = button.querySelector('.addon-group-media');
        icon.innerHTML = '';
        icon.classList.toggle('has-multiple', media.length > 1);
        if (media.length) {
          media.slice(0, 4).forEach(url => icon.insertAdjacentHTML('beforeend', imageMarkup(url, 'addon-group-thumb')));
          if (media.length > 4) icon.insertAdjacentHTML('beforeend', '<span class="addon-count">+' + (media.length - 4) + '</span>');
        } else if (groupMedia) {
          icon.insertAdjacentHTML('beforeend', imageMarkup(groupMedia, 'addon-group-thumb'));
        } else {
          icon.innerHTML = '<span class="addon-group-plus" aria-hidden="true">+</span>';
        }
        button.classList.toggle('has-selection', rows.length > 0);
        const count = rows.reduce((n, row) => n + row.quantity, 0);
        const badge = button.querySelector('.addon-selection-count');
        badge.textContent = count > 1 ? String(count) : '';
        badge.hidden = count <= 1;
      }

      function updateAllTiles() { groups.forEach(updateGroupTile); }

      function closeChoices() {
        if (closeTimer) clearTimeout(closeTimer);
        currentGroup = null;
        bar.querySelectorAll('.addon').forEach(button => button.classList.remove('is-active-group'));
        pop.className = 'popover slide-out-down';
        pop.style.pointerEvents = 'none';
        closeTimer = setTimeout(() => {
          pop.style.display = 'none';
          pop.className = 'popover';
          pop.style.pointerEvents = '';
        }, 300);
      }

      function centerGroup(button) {
        bar.style.setProperty('padding-left', Math.max(0, bar.clientWidth / 2 - button.offsetWidth / 2) + 'px', 'important');
        bar.style.setProperty('padding-right', Math.max(0, bar.clientWidth / 2 - button.offsetWidth / 2) + 'px', 'important');
        bar.style.setProperty('scroll-behavior', 'smooth', 'important');
        const barRect = bar.getBoundingClientRect();
        const buttonRect = button.getBoundingClientRect();
        const target = bar.scrollLeft + buttonRect.left - barRect.left - (bar.clientWidth - buttonRect.width) / 2;
        bar.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
      }

      function renderChoices(group, motion = 'up') {
        currentGroup = group;
        if (closeTimer) clearTimeout(closeTimer);
        bar.querySelectorAll('.addon').forEach(button => button.classList.toggle('is-active-group', button.dataset.addonGroup === String(group.id)));
        title.textContent = safeText(group.name);
        const addons = group.addons || [];
      choices.className = 'choices addon-options-grid count-' + Math.min(addons.length, 7);
        choices.innerHTML = addons.map(addon => {
          const row = rowFor(group, addon);
          const unavailable = soldOut(addon);
          const image = mediaOf(addon);
          const quantityControl = row && isMulti(addon)
            ? '<span class="addon-quantity" data-addon-quantity><span role="button" tabindex="0" data-quantity="minus" aria-label="Уменьшить">−</span><span class="addon-quantity-value">' + row.quantity + '</span><span role="button" tabindex="0" data-quantity="plus" aria-label="Добавить ещё">+</span></span>'
            : '<span class="addon-choice-mark">' + (row ? '✓' : '+') + '</span>';
          return '<div role="button" tabindex="0" aria-pressed="' + (row ? 'true' : 'false') + '" class="addon-choice' + (row ? ' is-selected' : '') + (unavailable ? ' is-sold-out' : '') + '" data-addon-id="' + esc(addon.id) + '"' + (unavailable ? ' aria-disabled="true"' : '') + '>' +
            imageMarkup(image, 'addon-choice-image') +
            '<span class="addon-choice-name">' + esc(addon.name) + '</span>' +
            '<small class="addon-choice-price">' + (unavailable ? 'Раскупили' : (Number(addon.price) > 0 ? '+' + Number(addon.price) + ' ₽' : '0 ₽')) + '</small>' + quantityControl +
            '</div>';
        }).join('');

        choices.querySelectorAll('.addon-choice').forEach(card => card.addEventListener('keydown', event => {
          if (event.target !== card || (event.key !== 'Enter' && event.key !== ' ')) return;
          event.preventDefault(); card.click();
        }));
        choices.querySelectorAll('[data-quantity]').forEach(control => {
          control.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); control.click(); }
          });
          // Handle the quantity control before the parent tile's click handler.
          // This prevents +/- from being interpreted as selecting/deselecting the add-on.
          control.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            const card = control.closest('.addon-choice');
            const addon = addons.find(item => String(item.id) === card?.dataset.addonId);
            const row = addon && rowFor(group, addon);
            if (!addon || !row) return;
            if (control.dataset.quantity === 'plus') row.quantity++;
            else if (control.dataset.quantity === 'minus') {
              if (row.quantity > 1) row.quantity--;
              else selected[group.id] = listFor(group).filter(item => item.addon.id !== row.addon.id);
            }
            refreshPrice();
            updateGroupTile(group);
            updateCart();
            renderChoices(group);
          }, true);
        });

        pop.style.display = 'block';
        pop.style.pointerEvents = 'auto';
        pop.classList.toggle('has-many', addons.length > 6);
        pop.setAttribute('aria-label', safeText(group.name));
        requestAnimationFrame(() => requestAnimationFrame(() => {
          const barTop = bar.getBoundingClientRect().top;
          const height = Math.max(pop.getBoundingClientRect().height, choices.getBoundingClientRect().height);
          const top = Math.max(12, Math.min(barTop - height - 12, window.innerHeight - height - 12));
          pop.style.setProperty('top', top + 'px', 'important');
          pop.style.setProperty('bottom', 'auto', 'important');
          pop.className = 'popover is-open slide-in-' + motion + (addons.length > 6 ? ' has-many' : '');
        }));
        choices.querySelectorAll('.addon-choice').forEach(button => {
          button.addEventListener('click', event => {
            event.stopPropagation();
            const addon = addons.find(item => String(item.id) === button.dataset.addonId);
            if (!addon || soldOut(addon)) return;
            const row = rowFor(group, addon);
            const pointAction = [...button.querySelectorAll('[data-quantity]')].find(control => {
              const rect = control.getBoundingClientRect();
              return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
            });
            const actionControl = event.target.closest('[data-quantity]') || pointAction;
            if (actionControl) {
              if (actionControl.dataset.quantity === 'minus') {
                if (row.quantity > 1) row.quantity--;
                else selected[group.id] = listFor(group).filter(item => item.addon.id !== addon.id);
              } else if (actionControl.dataset.quantity === 'plus') row.quantity++;
              else return;
              refreshPrice(); updateGroupTile(group); updateCart(); renderChoices(group);
              return;
            }
            if (event.target.closest('[data-addon-quantity]')) return;
            if (row) {
              selected[group.id] = listFor(group).filter(item => item.addon.id !== addon.id);
            } else {
              listFor(group).push({ addon, quantity: 1 });
            }
            refreshPrice();
            updateGroupTile(group);
            updateCart();
            renderChoices(group);
          });
        });
      }

      const renderGroupBar = () => {
        bar.innerHTML = groups.map(group => '<button type="button" class="addon" data-addon-group="' + esc(group.id) + '" aria-label="' + esc(group.name) + '"><span class="addon-group-media"></span><span class="addon-group-name">' + esc(group.name) + '</span><span class="addon-selection-count" hidden></span></button>').join('');
        bar.querySelectorAll('.addon').forEach((button, index) => button.addEventListener('click', event => {
          event.stopPropagation();
          const group = groups[index];
          if (currentGroup?.id === group.id && pop.style.display === 'block') {
            closeChoices();
            return;
          }
          const barRect = bar.getBoundingClientRect();
          const buttonRect = button.getBoundingClientRect();
          const wasCentered = Math.abs((buttonRect.left + buttonRect.width / 2) - (barRect.left + barRect.width / 2)) < 14;
          const motion = wasCentered ? 'up' : (index >= lastIndex ? 'right' : 'left');
          lastIndex = index;
          centerGroup(button);
          renderChoices(group, motion);
        }));
        updateAllTiles();
      };
      renderGroupBar();
      // The older catalog hydrator can finish later and replace this row; restore the live picker if it does.
      const observer = new MutationObserver(() => {
        if (!bar.querySelector('[data-addon-group]')) requestAnimationFrame(renderGroupBar);
      });
      observer.observe(bar, { childList: true });
      document.addEventListener('click', event => {
        if (!event.target.closest('.popover') && !event.target.closest('.addons')) {
          if (pop.style.display === 'block') closeChoices();
        }
      });
      window.addEventListener('resize', () => { if (currentGroup && pop.style.display === 'block') renderChoices(currentGroup); });
      refreshPrice();
      updateCart();
    } catch (error) {
      console.error('Reference add-on picker', error);
    }
  }

  if (document.readyState === 'complete') setTimeout(init, 350);
  else window.addEventListener('load', () => setTimeout(init, 350), { once: true });
})();
