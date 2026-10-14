import {test,expect} from "@playwright/test";

test("chat conserva el borrador tras un error, reintenta sin duplicar y muestra el historial",async({page})=>{
  test.skip(!process.env.SUPABASE_TEST_EMAIL||!process.env.SUPABASE_TEST_PASSWORD,"Requiere cuenta de prueba");
  const peer="00000000-0000-4000-8000-000000000001";
  const rows: Array<{id:string;sender_id:string;recipient_id:string;content:string;created_at:string}>=[];
  let fail=true;
  const sentIds:string[]=[];
  await page.route("**/rest/v1/profiles*",route=>{
    if(new URL(route.request().url()).searchParams.get("id")===`eq.${peer}`)return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({id:peer,username:"chat_test",avatar_url:null,full_name:null,bio:null,website:null})});
    return route.continue();
  });
  await page.route("**/rest/v1/direct_messages*",route=>{
    if(route.request().method()==="POST"){
      const row=route.request().postDataJSON();sentIds.push(row.id);
      if(fail){fail=false;return route.fulfill({status:403,contentType:"application/json",body:JSON.stringify({code:"42501",message:"Error de envío de prueba"})});}
      const message={...row,created_at:new Date().toISOString()};rows.push(message);
      return route.fulfill({status:201,contentType:"application/json",body:JSON.stringify(message)});
    }
    return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(rows)});
  });
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(process.env.SUPABASE_TEST_EMAIL!);
  await page.locator('input[type="password"]').fill(process.env.SUPABASE_TEST_PASSWORD!);
  await page.getByRole("button",{name:"Ingresar",exact:true}).click();
  await expect(page).toHaveURL("http://localhost:3112/");
  await page.goto(`/messages/${peer}`);
  await expect(page.getByRole("link",{name:"@chat_test",exact:true})).toBeVisible();
  const input=page.getByRole("textbox",{name:"Mensaje",exact:true});
  await input.fill("Hola desde la prueba");
  await page.getByRole("button",{name:"Enviar",exact:true}).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Error de envío de prueba");
  await expect(input).toHaveValue("Hola desde la prueba");
  await page.getByRole("button",{name:"Enviar",exact:true}).click();
  await expect(input).toHaveValue("");
  await expect(page.getByText("Hola desde la prueba",{exact:true})).toHaveCount(1);
  expect(sentIds.length).toBe(2);expect(sentIds[0]).toBe(sentIds[1]);
  await page.reload();
  await expect(page.getByText("Hola desde la prueba",{exact:true})).toHaveCount(1);
});
