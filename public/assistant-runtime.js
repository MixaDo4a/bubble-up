(() => {
  const prompts = [
    "День выдался длинным, хочу что-то уютное и сладкое.",
    "Нужно немного взбодриться перед важной встречей.",
    "У меня сегодня маленький повод порадоваться — собери праздничный стак.",
    "Хочу вкус, который напоминает тёплый вечер дома.",
    "После прогулки хочется чего-то освежающего и нежного.",
    "Сегодня всё получилось, придумай награду для меня.",
    "Немного грустно, хочется чего-то шоколадного и обнимающего.",
    "Хочу попробовать необычное сочетание, но без перебора.",
    "Собери что-нибудь лёгкое для спокойного утра.",
    "У меня творческое настроение — удиви интересной комбинацией.",
    "Хочется кофе и чего-то, что поднимет настроение.",
    "Я замёрз, предложи что-нибудь уютное и согревающее по вкусу.",
    "После тренировки хочется вкусный маленький приз.",
    "Хочу нежный сливочный вкус с чем-то хрустящим.",
    "Подбери яркое сочетание для солнечного дня.",
    "Сегодня хочется чего-то простого, знакомого и вкусного.",
    "Сделай мне сладкий перерыв посреди рабочего дня.",
    "Хочу напиток с характером, не слишком приторный.",
    "Придумай вкусный спутник к прогулке по городу.",
    "Я устал выбирать — реши за меня и красиво назови напиток.",
    "Хочется ванильного настроения и мягкого вкуса.",
    "Собери что-то ягодное и немного праздничное.",
    "У меня вечер кино, придумай вкусное сопровождение.",
    "Хочу уютный кофейный вкус с маленьким сюрпризом.",
    "Настроение экспериментировать: смешай подходящие вкусы из меню.",
    "Нужен маленький повод улыбнуться прямо сейчас.",
    "Хочется десертного вкуса в стакане и чего-нибудь к нему.",
    "Собери бодрый вариант для раннего старта.",
    "Сегодня хочется чего-то мягкого и воздушного.",
    "Хочу контраст: нежная основа и яркая добавка.",
    "Подбери вкус для встречи с другом.",
    "Я много работал, придумай вкусную паузу без лишней суеты.",
    "Хочется чего-то шоколадного, но с интересным дополнением.",
    "Собери прохладное и освежающее сочетание.",
    "Хочу попробовать любимую классику по-новому.",
    "Мне хочется чего-то красивого и необычного сегодня.",
    "Придумай сладкий стак для хорошего настроения.",
    "Хочется кофе, но чтобы вкус был мягким и десертным.",
    "Собери сочетание, которое подойдёт для неспешного утра.",
    "Сегодня у меня режим маленьких радостей — удиви меня.",
    "Подбери напиток и дополнение для короткого перерыва.",
    "Хочется фруктового оттенка и нежной основы.",
    "Придумай насыщенный вкус для холодного вечера.",
    "Нужен вкусный компаньон к моей прогулке.",
    "Собери что-нибудь игривое, с неожиданным сочетанием.",
    "Хочется сладкого, но пусть вкус остаётся сбалансированным.",
    "Подари мне вкусное настроение из того, что есть в меню.",
    "Выбери за меня что-нибудь сливочное и уютное.",
    "Хочу интересный напиток и маленький десерт к нему.",
    "Сегодня нужен вкусный финал насыщенного дня.",
    "Собери свой авторский вариант под моё настроение: хочется радости.",
  ];

  const style = document.createElement("style");
  style.textContent = `
    .agreed-assistant .assistant-result{position:relative;z-index:2;flex:1 1 auto;min-height:100px;overflow:auto;margin:0 0 10px;padding:14px 16px;border-radius:20px;background:rgba(45,72,105,.48);color:#fff}
    .agreed-assistant .assistant-result[hidden]{display:none!important}
    .agreed-assistant .quick[hidden]{display:none!important}
    .agreed-assistant .assistant-result h2{margin:0 0 8px;font-size:18px;font-weight:600;line-height:1.25}
    .agreed-assistant .assistant-result-copy{margin:0;font-size:15px;line-height:1.4;white-space:pre-wrap}
    body .agreed-assistant .assistant-result-copy{color:rgba(255,255,255,.96)!important}
    .agreed-assistant .assistant-result-link{display:inline-flex;align-items:center;justify-content:center;margin-top:12px;padding:11px 15px;border-radius:999px;background:rgba(16,39,66,.5);color:#fff;text-decoration:none;font-weight:600}
    .agreed-assistant .assistant-input button:disabled{opacity:.55;cursor:wait}
    body .agreed-panel.agreed-assistant.assistant-has-answer .assistant-machine{flex:0 0 16%!important;height:16%!important;min-height:105px!important;margin:10px 0 0!important}
    body .agreed-panel.agreed-assistant.assistant-has-answer .assistant-prompt{flex:0 0 auto!important;height:auto!important;min-height:0!important;margin:0!important;padding:8px 0!important;font-size:21px!important}
    body .agreed-panel.agreed-assistant.assistant-has-answer .assistant-result{flex:1 1 auto!important}
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
      link.textContent = productId ? "Открыть готовую вкусняшку и оплатить →" : "";
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
