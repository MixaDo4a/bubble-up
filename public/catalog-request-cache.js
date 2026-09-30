(() => {
  const originalFetch = window.fetch.bind(window);
  let catalogRequest = null;

  window.fetch = (input, init) => {
    const method = init?.method || (input instanceof Request ? input.method : "GET");
    if (method.toUpperCase() !== "GET") return originalFetch(input, init);

    let url;
    try {
      url = new URL(typeof input === "string" ? input : input.url, location.href);
    } catch {
      return originalFetch(input, init);
    }
    if (url.origin !== location.origin || url.pathname !== "/api/catalog") return originalFetch(input, init);

    if (!catalogRequest) {
      catalogRequest = originalFetch("/api/catalog", { cache: "no-store" })
        .then(async response => ({ status: response.status, statusText: response.statusText, body: await response.text() }))
        .catch(error => {
          catalogRequest = null;
          throw error;
        });
    }
    return catalogRequest.then(result => new Response(result.body, {
      status: result.status,
      statusText: result.statusText,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    }));
  };
})();
