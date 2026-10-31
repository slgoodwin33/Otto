let sent;
globalThis.Deno={ env:{ get:(k)=>({ANTHROPIC_API_KEY:'k',SUPABASE_URL:'https://x.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'sr'})[k] }, serve:(h)=>{ globalThis.handler=h; } };
globalThis.fetch=async (url,opt={})=>{ sent=JSON.parse(opt.body); return new Response(JSON.stringify({content:[{type:'tool_use',name:'save_document',input:{name:"Massachusetts driver's license",kind:'license',issuer:'Massachusetts RMV',issued_on:'2024-03-15',expires_on:'2029-03-15',number_last4:'S123-45678',tags:['IDs','Car','Bogus'],content:'LICENSE ••••5678'}}]}),{status:200}); };
await import('/tmp/de.js');
for (const mt of ['image/jpeg','application/pdf']) {
  const r=await handler(new Request('https://f',{method:'POST',headers:{Authorization:'Bearer t','content-type':'application/json'},body:JSON.stringify({media_type:mt,data:'AAAA'})}));
  const j=await r.json(); console.log(mt, '→ block', sent.messages[0].content[0].type, '| forced tool', sent.tool_choice.name, '| last4', j.number_last4, '| tags', j.tags.join(','), '| dates', j.issued_on, j.expires_on);
}
