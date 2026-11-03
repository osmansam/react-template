// Load with playwright-cli run-code --filename. All API data stays in memory.
async (page) => {
  const document = {
    version: 2, id: "fixture-document", name: "Inventory visual",
    root: { id: "fixture-root", type: "section", style: { spacing: { paddingX: "lg", paddingY: "lg" } }, children: [
      { id: "fixture-heading", type: "heading", level: 2, text: "Fixture products" },
      { id: "fixture-card", type: "card", element: "article", style: { spacing: { paddingX: "md", paddingY: "md" }, border: { radius: "lg" } }, children: [
        { id: "fixture-text", type: "text", text: "One reusable card design" },
        { id: "fixture-image", type: "image", src: "/visual-builder/placeholder.svg", alt: "Fixture product", style: { custom: { width: "180px", height: "100px" } } },
      ] },
    ] },
  };
  const first = {
    id: "111111111111111111111111", name: "Inventory", slug: "inventory", isAuthenticated: true,
    isAuthorized: true, authorizeRole: ["admin"], variables: [{ id: "search", key: "search", type: "string", initialValue: "preserve-me" }],
    sections: [
      { id: "existing", type: "component", order: 0, component: { id: "existing-text", type: "text", props: { text: "Existing application content" } } },
      { id: "visual-section", type: "component", order: 1, component: { id: "fixture-visual", type: "custom", title: "Inventory visual", props: { visualBuilder: { document } } } },
    ],
  };
  page.__visualFixture = { pages: [first, { id: "222222222222222222222222", name: "Overview", slug: "overview", sections: [] }], requests: [], saves: [], readStatus: 200, writeStatus: 200, refreshStatus: 200, saveDelay: 0 };
  await page.routeWebSocket("**/*", socket => {
    const url = new URL(socket.url());
    if (url.hostname === "127.0.0.1" && url.port === "3015") socket.connectToServer();
    else socket.close();
  });
  await page.route("**/*", async route => {
    const request = route.request(); const url = new URL(request.url());
    const fixture = page.__visualFixture;
    if (!url.pathname.includes("/api/v1/")) {
      if (url.hostname === "127.0.0.1" && url.port === "3015") return route.continue();
      return route.abort();
    }
    fixture.requests.push({ method: request.method(), path: url.pathname });
    const reply = (data, status = 200) => route.fulfill({ status, contentType: "application/json", headers: { "access-control-allow-origin": "http://127.0.0.1:3015", "access-control-allow-credentials": "true", "access-control-allow-headers": "content-type", "access-control-allow-methods": "GET,POST,PATCH,OPTIONS" }, body: JSON.stringify(data) });
    if (request.method() === "OPTIONS") return reply({});
    if (url.pathname.endsWith("/tenant-auth/refresh")) return reply({}, fixture.refreshStatus);
    if (url.pathname.includes("/admin/page")) {
      if (request.method() === "PATCH") {
        if (fixture.saveDelay) await new Promise(resolve => setTimeout(resolve, fixture.saveDelay));
        if (fixture.writeStatus !== 200) return reply({ message: "Fixture write rejection" }, fixture.writeStatus);
        const payload = request.postDataJSON(); const id = url.pathname.split("/").at(-1);
        fixture.saves.push(payload); fixture.pages = fixture.pages.map(page => page.id === id ? { ...payload, id } : page);
        return reply({ data: { data: { matchedCount: 1 } } });
      }
      if (fixture.readStatus !== 200) return reply({ message: "Fixture read rejection" }, fixture.readStatus);
      if (url.pathname.endsWith("/admin/page/")) return reply(fixture.pages);
      const found = fixture.pages.find(page => page.id === url.pathname.split("/").at(-1));
      return found ? reply({ data: { data: found } }) : reply({}, 404);
    }
    if (url.pathname.endsWith("/auth/session")) return reply({ authenticated: true, user: { id: "fixture-user", role: "admin" } });
    if (url.pathname.endsWith("/page")) return reply(fixture.pages);
    if (url.pathname.includes("branding")) return reply({});
    return reply([]);
  });
  await page.goto("http://127.0.0.1:3015/t/fixture/p/inventory/_builder?page=111111111111111111111111&component=fixture-visual");
}
