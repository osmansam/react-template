import { test, expect, type Page, type WebSocketRoute } from "@playwright/test";
const config = (label: string) => ({
  schemaName: "users",
  isRegisterActive: true,
  isGoogleLoginActive: false,
  loginFields: [
    { name: "email", displayName: label },
    { name: "password", isHashed: true, displayName: "Password" },
  ],
  registerFields: [],
});
async function api(
  page: Page,
  session = () => ({ authenticated: true, user: { id: "alice" } }),
) {
  await page.route("**/api/v1/**", async (route) => {
    const url = route.request().url();
    if (url.includes("auth/login-config"))
      return route.fulfill({
        json: config(url.includes("/beta/") ? "Beta username" : "Alpha email"),
      });
    if (url.endsWith("auth/session")) return route.fulfill({ json: session() });
    if (url.includes("/pipeline"))
      return route.fulfill({
        json: [
          { category: "A", value: 3 },
          { category: "B", value: 5 },
        ],
      });
    if (url.includes("/export"))
      return route.fulfill({
        body: "fixture spreadsheet",
        contentType: "application/octet-stream",
      });
    if (url.includes("/branding")) return route.fulfill({ json: {} });
    return route.fulfill({ json: [] });
  });
}
test("tenant navigation never reuses the previous login configuration", async ({
  page,
}) => {
  await api(page);
  const requests: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("login-config")) requests.push(r.url());
  });
  await page.goto("/t/alpha/p/one/login");
  await expect(page.getByLabel("Alpha email")).toBeVisible();
  await page.evaluate(() => {
    history.pushState({}, "", "/t/beta/p/two/login");
    dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(page.getByLabel("Beta username")).toBeVisible();
  await expect(page.getByLabel("Alpha email")).toHaveCount(0);
  expect(requests.some((url) => url.includes("/beta/two/"))).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("login supplies labels/autofill and blocks duplicate submissions", async ({
  page,
}) => {
  await api(page);
  await page.route("**/auth/login", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 350));
    await route.fulfill({
      status: 401,
      json: { message: "Invalid credentials" },
    });
  });
  await page.goto("/t/alpha/p/one/login");
  await page.getByLabel("Alpha email").fill("alice@example.test");
  await page.getByLabel("Password", { exact: true }).fill("password");
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
    "autocomplete",
    "current-password",
  );
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sign In", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Sign In", exact: true }),
  ).toBeEnabled();
});
test("transient session failure can retry and actual expiry redirects to login", async ({
  page,
}) => {
  await api(page);
  let unavailable = true;
  await page.route("**/auth/session", (route) =>
    route.fulfill(
      unavailable
        ? { status: 503, json: { message: "Unavailable" } }
        : { json: { authenticated: false } },
    ),
  );
  await page.addInitScript(() => {
    localStorage.setItem(
      "project:alpha:one:user",
      JSON.stringify({ _id: "alice" }),
    );
    localStorage.setItem("project:alpha:one:loggedIn", "true");
  });
  await page.goto("/t/alpha/p/one/audit-logs");
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  expect(page.url()).toContain("audit-logs");
  unavailable = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByLabel("Alpha email")).toBeVisible();
});
test("socket reconnects and unmount cancels further reconnects", async ({
  page,
}) => {
  await api(page);
  const sockets: WebSocketRoute[] = [];
  await page.routeWebSocket("ws://127.0.0.1:3999/**", (socket) =>
    sockets.push(socket),
  );
  await page.goto("/tests/fixtures/runtime.html");
  await expect(
    page.getByRole("heading", { name: "Runtime regression fixture" }),
  ).toBeVisible();
  await expect.poll(() => sockets.length).toBeGreaterThan(0);
  const previous = sockets.length;
  await sockets.at(-1)!.close();
  await expect.poll(() => sockets.length).toBeGreaterThan(previous);
  await page.getByRole("button", { name: "Stop updates" }).click();
  const stopped = sockets.length;
  await page.waitForTimeout(1200);
  expect(sockets).toHaveLength(stopped);
});
test("table isolation, deferred features, export and section recovery work in production", async ({
  page,
}) => {
  await api(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => {
    if (!error.message.includes("Fixture render failure"))
      errors.push(error.message);
  });
  await page.goto("/tests/fixtures/runtime.html");
  await page.getByRole("button", {name:"Open confirmation"}).click();
  await expect(page.getByRole("dialog", {name:"Confirm fixture"})).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", {name:"Open confirmation"})).toBeFocused();
  const first = page.getByRole("region", { name: "First", exact: true }),
    second = page.getByRole("region", { name: "Second", exact: true });
  await first.getByPlaceholder("First search").fill("Alice");
  await expect(first.getByText("Bob", { exact: true })).toHaveCount(0);
  await expect(second.getByText("Bob", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Show visual" }).click();
  await expect(
    page.getByRole("heading", { name: "Runtime visual" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Show chart" }).click();
  await expect(
    page.getByRole("region", { name: "Chart" }).locator("svg"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Show date control" }).click();
  await expect(page.getByText("Event date", { exact: true })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export records" }).click();
  expect((await download).suggestedFilename()).toBe("export.xlsx");
  await page.getByRole("button", { name: "Break section" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(second.getByText("Bob", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Repair section" }).click();
  await expect(page.getByText("Section recovered")).toBeVisible();
  expect(errors).toEqual([]);
});
