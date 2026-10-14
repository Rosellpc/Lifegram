import { test, expect } from "@playwright/test";

test("notificaciones: contador, filtros, error al marcar y lectura persistente", async ({ page }) => {
  test.skip(!process.env.SUPABASE_TEST_EMAIL || !process.env.SUPABASE_TEST_PASSWORD, "Requiere cuenta de prueba");
  const rows = [
    { id: "00000000-0000-4000-8000-000000000011", actor_id: "00000000-0000-4000-8000-000000000001", type: "follow", is_read: false, created_at: new Date().toISOString(), actor: { username: "persona_test", avatar_url: null } },
    { id: "00000000-0000-4000-8000-000000000012", actor_id: null, type: "like", is_read: true, created_at: new Date().toISOString(), actor: null }
  ];
  let rejectUpdate = true;
  await page.route("**/rest/v1/notifications*", async route => {
    const url = new URL(route.request().url());
    if (route.request().method() === "HEAD") return route.fulfill({
      status: 200, headers: { "access-control-expose-headers": "content-range", "content-range": "0-0/" + rows.filter(row => !row.is_read).length }, body: ""
    });
    if (route.request().method() === "PATCH") {
      expect(url.searchParams.get("recipient_id")).toMatch(/^eq\./);
      if (rejectUpdate) {
        rejectUpdate = false;
        return route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ code: "42501", message: "No se pudo actualizar la notificación" }) });
      }
      for (const row of rows) if (!url.searchParams.has("id") || url.searchParams.get("id") === "eq." + row.id) row.is_read = true;
      return route.fulfill({ status: 204, body: "" });
    }
    expect(url.searchParams.get("limit")).toBe("30");
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(url.searchParams.get("is_read") === "eq.false" ? rows.filter(row => !row.is_read) : rows) });
  });
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(process.env.SUPABASE_TEST_EMAIL!);
  await page.locator('input[type="password"]').fill(process.env.SUPABASE_TEST_PASSWORD!);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL("http://localhost:3112/");
  await page.goto("/notifications");
  await expect(page.getByRole("link", { name: "Actividad, 1 sin leer", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sin leer (1)", exact: true }).click();
  await expect(page.getByRole("listitem")).toHaveCount(1);
  await page.getByRole("button", { name: "Marcar como leída", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("No se pudo actualizar");
  await expect(page.getByRole("listitem")).toHaveCount(1);
  await page.getByRole("button", { name: "Marcar todas como leídas", exact: true }).click();
  await expect(page.getByText("Estás al día", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Actividad", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Sin leer (0)", exact: true })).toBeVisible();
  await expect(page.getByRole("listitem")).toHaveCount(2);
});
