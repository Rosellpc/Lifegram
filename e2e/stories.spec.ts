import {test,expect} from "@playwright/test";
import {createClient} from "@supabase/supabase-js";

test("crear historia desde el feed, previsualizar y publicar durante 24 horas",async({page})=>{
  test.skip(!process.env.SUPABASE_TEST_EMAIL||!process.env.SUPABASE_TEST_PASSWORD,"Requiere cuenta de prueba");
  const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(15000)})}});
  const login=await client.auth.signInWithPassword({email:process.env.SUPABASE_TEST_EMAIL!,password:process.env.SUPABASE_TEST_PASSWORD!});
  if(login.error)throw new Error("No se pudo preparar la prueba");
  let created:{id:string;media_url:string}|undefined;
  page.on("request",request=>{if(request.method()==="POST"&&new URL(request.url()).pathname==="/rest/v1/stories")created=request.postDataJSON();});
  try{
    await page.goto("/login");
    await page.locator('input[type="email"]').fill(process.env.SUPABASE_TEST_EMAIL!);
    await page.locator('input[type="password"]').fill(process.env.SUPABASE_TEST_PASSWORD!);
    await page.getByRole("button",{name:"Ingresar",exact:true}).click();
    await expect(page).toHaveURL("http://localhost:3112/");
    await page.getByRole("link",{name:"Crear historia",exact:true}).click();
    const input=page.getByLabel("Archivo de la historia",{exact:true});
    await input.setInputFiles({name:"invalid.txt",mimeType:"text/plain",buffer:Buffer.from("invalid")});
    await expect(page.getByRole("main").getByRole("alert")).toContainText("hasta 20 MB");
    await input.setInputFiles("img/1.png");
    await expect(page.getByRole("img",{name:"Vista previa de la historia",exact:true})).toBeVisible();
    await page.getByRole("button",{name:"Cancelar selección",exact:true}).click();
    await expect(page.getByRole("button",{name:"Publicar historia",exact:true})).toBeDisabled();
    await input.setInputFiles("img/1.png");
    await page.getByRole("button",{name:"Publicar historia",exact:true}).click();
    await expect(page.getByRole("status")).toContainText("Historia publicada");
    const result=await client.from("stories").select("id,user_id,media_url,media_type,created_at,expires_at").eq("id",created!.id).single();
    if(result.error)throw new Error("La historia no persistió");
    expect(result.data.user_id).toBe(login.data.user.id);
    expect(result.data.media_type).toBe("image");
    const duration=new Date(result.data.expires_at).getTime()-new Date(result.data.created_at).getTime();
    expect(duration).toBeGreaterThan(23*3600000);expect(duration).toBeLessThan(25*3600000);
    await page.reload();
    await expect(page.locator(`img[src*="${encodeURIComponent(result.data.media_url)}"]`)).toBeVisible();
    await page.locator(`img[src*="${encodeURIComponent(result.data.media_url)}"]`).click();
    const viewer=page.getByRole("dialog",{name:"Visor de historias",exact:true});
    await expect(viewer).toBeVisible();
    await viewer.getByRole("button",{name:"Pausar historia",exact:true}).click();
    await expect(viewer.getByRole("button",{name:"Reanudar historia",exact:true})).toBeVisible();
    await expect(viewer.getByRole("status")).not.toBeVisible();
    await expect(viewer.getByRole("alert")).toHaveCount(0);
    await page.screenshot({path:"test-results/story-viewer.png",animations:"disabled"});
    await page.keyboard.press("Escape");
    await expect(viewer).not.toBeVisible();
    expect(await page.evaluate(()=>document.body.style.overflow)).not.toBe("hidden");
  }finally{
    if(created){
      const deleted=await client.from("stories").delete().eq("id",created.id).eq("user_id",login.data.user.id);
      if(deleted.error)throw new Error("No se pudo limpiar la historia de prueba");
      const path=new URL(created.media_url).pathname.split("/storage/v1/object/public/images/")[1];
      if(path&&path.startsWith(`stories/${login.data.user.id}/`)){
        const removed=await client.storage.from("images").remove([decodeURIComponent(path)]);
        if(removed.error)throw new Error("No se pudo limpiar el archivo temporal");
      }
    }
    await client.auth.signOut({scope:"local"});
  }
});
