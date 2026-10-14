import {test,expect} from "@playwright/test";
import {createClient} from "@supabase/supabase-js";

test("buscar otro usuario por @usuario y abrir su perfil",async({page})=>{
  test.skip(!process.env.SUPABASE_TEST_EMAIL_2||!process.env.SUPABASE_TEST_PASSWORD_2||!process.env.SUPABASE_TEST_EMAIL||!process.env.SUPABASE_TEST_PASSWORD,"Requiere las dos cuentas de prueba");
  const peerClient=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(15000)})}});
  try{
    const session=await peerClient.auth.signInWithPassword({email:process.env.SUPABASE_TEST_EMAIL_2!,password:process.env.SUPABASE_TEST_PASSWORD_2!});
    if(session.error)throw new Error("No se pudo preparar la segunda cuenta");
    const profile=await peerClient.from("profiles").select("id,username").eq("id",session.data.user.id).single();
    if(profile.error)throw new Error("No se pudo consultar el perfil de prueba");
    await page.goto("/login");
    await page.locator('input[type="email"]').fill(process.env.SUPABASE_TEST_EMAIL!);
    await page.locator('input[type="password"]').fill(process.env.SUPABASE_TEST_PASSWORD!);
    await page.getByRole("button",{name:"Ingresar",exact:true}).click();
    await expect(page).toHaveURL("http://localhost:3112/");
    let rankingRequests=0;
    page.on("request",request=>{if(request.url().includes("/rpc/ranked_post_ids"))rankingRequests++;});
    await page.goto("/search");
    await expect(page.getByRole("tab",{name:"Usuarios",exact:true})).toHaveAttribute("aria-selected","true");
    await page.getByRole("searchbox").fill(`@${profile.data.username}`);
    const result=page.getByRole("link",{name:`Ver perfil de ${profile.data.username}`,exact:true});
    await expect(result).toBeVisible();
    await expect(result).toHaveAttribute("href",`/profile/${profile.data.id}`);
    await page.getByRole("tab",{name:"Usuarios",exact:true}).click();
    await expect(result).toBeVisible();
    expect(rankingRequests).toBe(0);
    await result.click();
    await expect(page).toHaveURL(`http://localhost:3112/profile/${profile.data.id}`);
    await expect(page.getByRole("link",{name:"Mensaje",exact:true})).toBeVisible();
    await expect(page.getByRole("button",{name:/^(Seguir|Dejar de seguir)$/})).toBeVisible();
  }finally{await peerClient.auth.signOut({scope:"local"});}
});
