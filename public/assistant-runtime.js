(() => {
  const prompts = [
    "Хочется чего-нибудь уютного и сладкого.",
    "Нужно немного взбодриться перед важной встречей.",
    "Сегодня хочется маленького праздника.",
    "Хочу вкус тёплого вечера дома.",
    "После прогулки хочется чего-нибудь освежающего.",
    "Сегодня всё получилось — хочется себя порадовать.",
    "Немного грустно, хочется чего-нибудь шоколадного.",
    "Хочется необычного вкуса, но без перебора.",
    "Хочется чего-нибудь лёгкого для спокойного утра.",
    "Сегодня творческое настроение и хочется ярких вкусов.",
    "Хочется кофе и чего-нибудь для хорошего настроения.",
    "Я замёрз, хочется чего-нибудь согревающего и нежного.",
    "После тренировки хочется вкусный маленький приз.",
    "Хочется нежного сливочного вкуса и чего-нибудь хрустящего.",
    "За окном солнце — хочется чего-нибудь яркого.",
    "Сегодня хочется чего-то простого и знакомого.",
    "Нужен сладкий перерыв посреди дня.",
    "Хочется напиток с характером, но не слишком сладкий.",
    "Хочется чего-нибудь вкусного для прогулки по городу.",
    "Устал выбирать — хочется чего-нибудь на твой вкус.",
    "Хочется ванили и мягкого вкуса.",
    "Хочется чего-нибудь ягодного и праздничного.",
    "Сегодня вечер кино — хочется вкусного напитка.",
    "Хочется уютного кофейного вкуса с маленьким сюрпризом.",
    "Настроение экспериментировать с разными вкусами.",
    "Нужен маленький повод улыбнуться прямо сейчас.",
    "Хочется десертный напиток и что-нибудь к нему.",
    "С утра хочется чего-нибудь бодрящего.",
    "Сегодня хочется чего-нибудь мягкого и воздушного.",
    "Хочется нежную основу и яркую добавку.",
    "Мы встречаемся с другом — хочется чего-нибудь вкусного.",
    "День был насыщенным — хочется вкусно передохнуть.",
    "Хочется шоколада и интересного дополнения.",
    "Хочется чего-нибудь прохладного и освежающего.",
    "Хочется любимую классику с новым вкусом.",
    "Сегодня хочется чего-нибудь красивого и необычного.",
    "Хочется сладкого для хорошего настроения.",
    "Хочется мягкого кофе с десертным вкусом.",
    "Для неспешного утра хочется чего-нибудь нежного.",
    "Сегодня хочется маленьких радостей.",
    "Нужен напиток для короткого перерыва.",
    "Хочется фруктового вкуса и нежной основы.",
    "На холодный вечер хочется чего-нибудь насыщенного.",
    "Хочется взять вкусный напиток на прогулку.",
    "Настроение игривое — хочется неожиданного сочетания.",
    "Хочется сладкого, но чтобы вкус был сбалансированным.",
    "Хочется чего-нибудь вкусного из нашего меню.",
    "Хочется чего-нибудь сливочного и уютного.",
    "Хочется интересный напиток и маленький десерт.",
    "День был насыщенным — хочется вкусно его завершить.",
    "Хочется радости.",
  ];

  const style = document.createElement("style");
  style.textContent = `
    .agreed-assistant .assistant-result{position:relative;z-index:2;flex:1 1 auto;min-height:100px;overflow:auto;margin:0 0 10px;padding:14px 16px;border-radius:20px;background:rgba(45,72,105,.48);color:#fff}
    .agreed-assistant .assistant-result[hidden]{display:none!important}
    body .agreed-panel.agreed-assistant .quick[hidden]{display:none!important}
    .agreed-assistant .assistant-result h2{margin:0 0 8px;font-size:18px;font-weight:600;line-height:1.25}
    .agreed-assistant .assistant-result-copy{margin:0;font-size:15px;line-height:1.4;white-space:pre-wrap}
    body .agreed-assistant .assistant-result-copy{color:rgba(255,255,255,.96)!important}
    .agreed-assistant .assistant-result-link{display:inline-flex;align-items:center;justify-content:center;margin-top:12px;padding:11px 15px;border-radius:999px;background:rgba(16,39,66,.5);color:#fff;text-decoration:none;font-weight:600}
    .agreed-assistant .assistant-input button:disabled{opacity:.55;cursor:wait}
    body .agreed-panel.agreed-assistant.assistant-has-answer .assistant-input{box-sizing:border-box!important;align-self:center!important;width:min(100%,420px)!important;min-height:48px!important;height:48px!important;flex:0 0 48px!important;margin:auto auto 0!important;padding:3px 6px 3px 14px!important;border-radius:24px!important}
    body .agreed-panel.agreed-assistant.assistant-has-answer .assistant-input input{font-size:15px!important}
    body .agreed-panel.agreed-assistant.assistant-has-answer .assistant-input button{width:38px!important;height:38px!important;flex:0 0 38px!important;font-size:22px!important}
    body .agreed-panel.agreed-assistant.assistant-has-answer .assistant-machine{flex:0 0 16%!important;height:16%!important;min-height:105px!important;margin:10px 0 0!important}
    body .agreed-panel.agreed-assistant.assistant-has-answer .assistant-prompt{flex:0 0 auto!important;height:auto!important;min-height:0!important;margin:0!important;padding:8px 0!important;font-size:21px!important}
    body .agreed-panel.agreed-assistant.assistant-has-answer .assistant-result{flex:0 0 auto!important;min-height:0!important;max-height:25vh!important}
  `;
  document.head.appendChild(style);

  const wire = () => {
    const panel = document.querySelector(".agreed-assistant");
    if (!panel || panel.dataset.recommendationWired === "true") return;
    const form = panel.querySelector(".assistant-input");
    const input = form?.querySelector("input");
    const submit = form?.querySelector('button[type="submit"],button:not([type])');
    const quick = panel.querySelector(".quick");
    const dice = quick?.querySelector("button");
    const machine = panel.querySelector(".assistant-machine");
    const image = panel.querySelector(".assistant-shaker-gif");
    const status = document.createElement("section");
    status.className = "assistant-result";
    status.hidden = true;
    status.setAttribute("aria-live", "polite");
    status.innerHTML = '<h2></h2><p class="assistant-result-copy"></p><a class="assistant-result-link" hidden></a>';
    form?.before(status);
    if (!form || !input || !submit || !quick) return;
    panel.dataset.recommendationWired = "true";

    let busy = false;
    let animationTimer = 0;
    const showStatus = (title, copy, recommendation = null) => {
      status.querySelector("h2").textContent = title;
      status.querySelector(".assistant-result-copy").textContent = copy;
      const link = status.querySelector(".assistant-result-link");
      const productId = recommendation?.productId;
      const addonIds = Array.isArray(recommendation?.addonIds) ? recommendation.addonIds : [];
      link.hidden = !productId;
      link.textContent = productId ? "Хочу такую! 🍪" : "";
      link.href = productId ? `/product-options.html?product=${encodeURIComponent(productId)}&addons=${encodeURIComponent(addonIds.join(","))}` : "#";
      link.onclick = event => {
        if (!productId) return;
        event.preventDefault();
        const openEvent = new CustomEvent("krmbl-open-product", { detail: { productId, addonIds }, cancelable: true });
        document.dispatchEvent(openEvent);
        if (!openEvent.defaultPrevented) window.location.assign(link.href);
      };
      status.hidden = false;
    };
    const resetResult = () => {
      status.hidden = true;
      quick.hidden = false;
      panel.classList.remove("assistant-has-answer");
    };
    const animateOnce = () => new Promise(resolve => {
      if (!machine || !image) return resolve();
      window.clearTimeout(animationTimer);
      machine.classList.add("is-playing");
      image.src = `/shaker_pouring.gif?run=${Date.now()}`;
      animationTimer = window.setTimeout(() => {
        machine.classList.remove("is-playing");
        resolve();
      }, 3800);
    });

    document.addEventListener("click", event => {
      const button = event.target instanceof Element ? event.target.closest(".agreed-assistant .quick button:first-child") : null;
      if (!button || !panel.contains(button)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      input.value = prompts[Math.floor(Math.random() * prompts.length)];
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.focus({ preventScroll: true });
    }, true);

    input.addEventListener("input", () => { if (!busy) resetResult(); });
    document.addEventListener("submit", async event => {
      if (event.target !== form) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (busy) return;
      const request = input.value.trim();
      if (!request) {
        input.focus({ preventScroll: true });
        return;
      }

      busy = true;
      panel.classList.remove("assistant-has-answer");
      quick.hidden = true;
      showStatus("Смешиваем для тебя…", "Подбираю вкус по твоему настроению.");
      submit.disabled = true;
      form.setAttribute("aria-busy", "true");
      const animation = animateOnce();
      try {
        const responsePromise = fetch("/api/assistant/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ request }),
        }).then(async response => {
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.error || "Помощник пока не смог ответить. Попробуй ещё раз.");
          return data;
        });
        const [data] = await Promise.all([responsePromise, animation]);
        panel.classList.add("assistant-has-answer");
        showStatus("Твоя вкусняшка готова!", data.response, data);
      } catch (error) {
        panel.classList.add("assistant-has-answer");
        showStatus("Давай попробуем ещё раз", error instanceof Error ? error.message : "Не получилось подобрать вкус.");
      } finally {
        busy = false;
        submit.disabled = false;
        form.removeAttribute("aria-busy");
      }
    }, true);
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire, { once: true });
  else wire();
  new MutationObserver(wire).observe(document.documentElement, { childList: true, subtree: true });
})();
