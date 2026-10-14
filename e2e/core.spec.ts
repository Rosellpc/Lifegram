import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

test("foto de perfil: validación, vista previa, subida y persistencia", async ({ page }) => {
  const email = process.env.SUPABASE_TEST_EMAIL;
  const password = process.env.SUPABASE_TEST_PASSWORD;
  test.skip(!email || !password,"Requiere cuenta de prueba");
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{
    auth:{persistSession:false,autoRefreshToken:false},
    global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(15000)})},
  });
  const login = await client.auth.signInWithPassword({email:email!,password:password!});
  if (login.error) throw new Error("No se pudo preparar la prueba de avatar");
  const userId = login.data.user.id;
  const original = await client.from("profiles").select("avatar_url").eq("id",userId).single();
  if (original.error) throw new Error("No se pudo leer el avatar original");
  let uploadedUrl: string | undefined;
  try {
    await page.goto("/login");
    await page.locator('input[type="email"]').fill(email!);
    await page.locator('input[type="password"]').fill(password!);
    await page.getByRole("button",{name:"Ingresar",exact:true}).click();
    await expect(page).toHaveURL("http://localhost:3112/");
    await page.goto("/profile");
    const input = page.getByLabel("Seleccionar foto de perfil",{exact:true});
    await input.setInputFiles({name:"invalid.txt",mimeType:"text/plain",buffer:Buffer.from("invalid")});
    await expect(page.getByText("Selecciona una imagen JPG, PNG o WebP de hasta 5 MB.",{exact:true})).toBeVisible();
    await input.setInputFiles("img/1.png");
    await expect(page.getByRole("img",{name:"Vista previa de tu foto de perfil",exact:true})).toBeVisible();
    await page.getByRole("button",{name:"Cancelar",exact:true}).click();
    await expect(page.getByRole("button",{name:"Guardar foto",exact:true})).not.toBeVisible();
    await input.setInputFiles("img/1.png");
    await page.getByRole("button",{name:"Guardar foto",exact:true}).click();
    await expect(page.getByText("Foto de perfil actualizada.",{exact:true})).toBeVisible();
    const saved = await client.from("profiles").select("avatar_url").eq("id",userId).single();
    if (saved.error) throw new Error("No se pudo verificar el avatar guardado");
    uploadedUrl = saved.data.avatar_url;
    expect(uploadedUrl).toContain(`/avatars/${userId}/`);
    expect(uploadedUrl).toMatch(/\.webp$/);
    await expect(page.getByRole("navigation").getByRole("img", { name: "Tu foto de perfil", exact: true })).toHaveAttribute("src", new RegExp(encodeURIComponent(uploadedUrl!)));
    await page.reload();
    await expect(page.getByRole("img",{name:"Foto de perfil",exact:true})).toHaveAttribute("src", new RegExp(encodeURIComponent(uploadedUrl!)));
    await page.screenshot({path:"test-results/profile-updated.png",fullPage:true});
    await page.setViewportSize({width:390,height:844});
    await expect(page.getByRole("navigation",{name:"Navegación principal"})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await page.screenshot({path:"test-results/profile-mobile.png",fullPage:true});
    await page.emulateMedia({colorScheme:"dark"});
    await page.screenshot({path:"test-results/profile-mobile-dark.png",fullPage:true,animations:"disabled"});
  } finally {
    const current = await client.from("profiles").select("avatar_url").eq("id",userId).single();
    const candidate = uploadedUrl || (current.data?.avatar_url !== original.data.avatar_url ? current.data?.avatar_url : null);
    if (candidate && candidate.includes(`/avatars/${userId}/`)) {
      const restore = await client.from("profiles").update({avatar_url:original.data.avatar_url}).eq("id",userId).eq("avatar_url",candidate).select("id");
      if (restore.error) throw new Error("No se pudo restaurar el avatar de prueba");
      if (restore.data?.length) {
        const path = decodeURIComponent(new URL(candidate).pathname.split("/storage/v1/object/public/images/")[1]);
        const removed = await client.storage.from("images").remove([path]);
        if (removed.error) throw new Error("No se pudo limpiar la foto de prueba");
      }
    }
    await client.auth.signOut({scope:"local"});
  }
});

test("registro y gestión de cuenta muestran formularios accesibles", async ({ page }) => {
  await page.goto("/register");
  await expect(page.getByRole("button",{name:"Crear cuenta"})).toBeVisible();
  await page.goto("/account");
  await expect(page.getByLabel("Nueva contraseña",{exact:true})).toBeVisible();
  await page.getByLabel("Nueva contraseña",{exact:true}).fill("short");
  await page.getByLabel("Repite la contraseña").fill("different");
  await page.getByRole("button",{name:"Guardar contraseña"}).click();
  await expect(page.getByRole("status")).toContainText("deben coincidir");
});

test("registro, confirmación y recuperación manejan errores sin bloquear el formulario", async ({ page }) => {
  await page.route("**/auth/v1/signup*", route => route.fulfill({status:400,contentType:"application/json",body:JSON.stringify({msg:"No se pudo crear la cuenta de prueba",code:"validation_failed"})}));
  await page.goto("/register");
  await page.getByLabel("Usuario",{exact:true}).fill("qa_user");
  await page.locator('input[type="email"]').fill("qa@example.test");
  await page.locator('input[type="password"]').fill("Test-password-123");
  await page.getByRole("button",{name:"Crear cuenta",exact:true}).click();
  await expect(page.getByText("No se pudo crear la cuenta de prueba",{exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Crear cuenta",exact:true})).toBeEnabled();
  await page.goto("/account");
  await page.getByLabel("Correo electrónico",{exact:true}).fill("qa@example.test");
  for (const endpoint of ["recover","resend"]) {
    await page.route(`**/auth/v1/${endpoint}*`, route => {
      expect(route.request().postDataJSON().email).toBe("qa@example.test");
      return route.fulfill({status:200,contentType:"application/json",body:"{}"});
    });
  }
  await page.getByRole("button",{name:"Recuperar contraseña",exact:true}).click();
  await expect(page.getByRole("status")).toContainText("Solicitud enviada");
  await page.getByRole("button",{name:"Reenviar confirmación",exact:true}).click();
  await expect(page.getByRole("status")).toContainText("Solicitud enviada");
  await page.goto("/account?error_description=expired");
  await expect(page.getByRole("status")).toContainText("ha caducado");
});

test("login, publicación, like, guardado, comentario, edición, eliminación y logout", async ({ page }) => {
  const email = process.env.SUPABASE_TEST_EMAIL;
  const password = process.env.SUPABASE_TEST_PASSWORD;
  test.skip(!email || !password, "Requiere cuenta de prueba en .env.local");
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
  const caption = `e2e-${crypto.randomUUID()}`;
  let postId: string | undefined;
  let imagePath: string | undefined;
  try {
    await page.goto("/login");
    await page.locator('input[type="email"]').fill(email!);
    await page.locator('input[type="password"]').fill(password!);
    await page.getByRole("button",{name:"Ingresar",exact:true}).click();
    await expect(page).toHaveURL("http://localhost:3112/");
    console.log("E2E: login completado");
    await page.goto("/post");
    await page.locator('input[type="file"]').setInputFiles("img/1.png");
    await page.locator("textarea").fill(caption);
    await page.getByRole("button",{name:"Publicar",exact:true}).click();
    await expect(page).toHaveURL("http://localhost:3112/");
    const image = page.getByRole("img",{name:caption,exact:true});
    await expect(image).toBeVisible();
    const href = await image.locator("..").getAttribute("href");
    expect(href).toMatch(/^\/posts\//);
    postId = href!.split("/").pop();
    console.log("E2E: publicación creada");
    const source = new URL((await image.getAttribute("src"))!, "http://localhost:3112");
    const originalImage = new URL(source.searchParams.get("url") || source.href);
    imagePath = originalImage.pathname.split("/storage/v1/object/public/images/")[1];
    await page.goto(href!);
    await page.getByRole("button",{name:"Dar like",exact:true}).click();
    await expect(page.getByRole("button",{name:"Quitar like",exact:true})).toBeEnabled();
    await page.getByRole("button",{name:"Guardar publicación",exact:true}).click();
    await expect(page.getByRole("button",{name:"Quitar guardado",exact:true})).toBeEnabled();
    await page.getByLabel("Comentario",{exact:true}).fill(caption);
    await page.getByRole("button",{name:"Publicar comentario",exact:true}).click();
    await expect(page.getByLabel("Comentario",{exact:true})).toHaveValue("");
    await expect(page.locator("aside").getByText(caption,{exact:true})).toBeVisible();
    await page.reload();
    await expect(page.locator("aside").getByText(caption,{exact:true})).toBeVisible();
    await expect(page.getByRole("button",{name:"Quitar like",exact:true})).toBeVisible();
    await expect(page.getByRole("button",{name:"Quitar guardado",exact:true})).toBeVisible();
    await page.getByRole("button",{name:"Editar publicación",exact:true}).click();
    console.log("E2E: like, guardado y comentario persisten");
    await page.getByRole("textbox",{name:"Descripción",exact:true}).fill(`${caption} editada`);
    await page.getByRole("button",{name:"Guardar cambios",exact:true}).click();
    await expect(page.getByRole("textbox",{name:"Descripción",exact:true})).not.toBeVisible();
    await page.reload();
    await expect(page.locator("section").getByText(`${caption} editada`,{exact:true})).toBeVisible();
    await page.getByRole("button",{name:"Eliminar publicación",exact:true}).click();
    await page.getByRole("button",{name:"Sí, eliminar",exact:true}).click();
    await expect(page).toHaveURL(/\/profile$/);
    await page.getByRole("button",{name:"Cerrar sesión",exact:true}).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/saved");
    await expect(page).toHaveURL(/\/login$/);
  } finally {
    const login = await client.auth.signInWithPassword({email:email!,password:password!});
    if (login.error) throw new Error("No se pudo iniciar la limpieza de E2E");
    const rows = await client.from("posts").select("id,image_url").eq("user_id",login.data.user.id).like("caption",`${caption}%`);
    for (const row of rows.data ?? []) {
      const result = await client.from("posts").delete().eq("id",row.id);
      if (result.error) throw new Error("No se pudo limpiar la publicación E2E");
      const path = new URL(row.image_url).pathname.split("/storage/v1/object/public/images/")[1];
      if (path) await client.storage.from("images").remove([decodeURIComponent(path)]);
    }
    // Posts deleted in the UI are checked separately; only temporary IDs are inspected.
    if (postId) {
      const result = await client.from("posts").select("id").eq("id",postId);
      expect(result.data?.length).toBe(0);
    }
    if (imagePath) {
      const removed = await client.storage.from("images").remove([decodeURIComponent(imagePath)]);
      if (removed.error) throw new Error("No se pudo limpiar la imagen E2E");
    }
    await client.auth.signOut({scope:"local"});
  }
});
