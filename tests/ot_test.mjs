const seen=[];
globalThis.Deno={ env:{ get:(k)=>({ANTHROPIC_API_KEY:'k',SUPABASE_URL:'https://x.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'sr'})[k] }, serve:(h)=>{ globalThis.handler=h; } };
const R=(b,s=200)=>new Response(typeof b==='string'?b:JSON.stringify(b),{status:s});
globalThis.fetch=async (url,opt={})=>{ url=String(url); seen.push(url.split('?')[0]);
  if(url.includes('vpic')) return R({Results:[{ModelYear:'2014',Make:'VOLKSWAGEN',Model:'Jetta',Trim:'SE',DisplacementL:'1.8',EngineCylinders:'4',FuelTypePrimary:'Gasoline',ErrorCode:'0'}]});
  if(url.includes('recalls')) return R({Count:1,results:[{NHTSACampaignNumber:'X',Component:'AIR BAGS',Summary:'s',Remedy:'r',ReportReceivedDate:'d'}]});
  if(url.includes('zillow')) return R('blocked',403);
  if(url.includes('example.com')) return R('<html><head><meta property="og:title" content="2BR on Cabot St"></head><body>$1,850/mo 2 bd 1 ba</body></html>');
  if(url.includes('anthropic')){ const b=JSON.parse(opt.body); const n=b.tools[0].name;
    return R({content:[{type:'tool_use',name:n,input: n==='listing'?{title:'2BR on Cabot St',address:'Cabot St, Beverly',rent_dollars:1850,beds:2,baths:1}:{name:'Navy quarter-zip',category:'top',color:'navy',warmth:3,wears_before_wash:3}}]}); }
  return R({}); };
await import('/tmp/ot.js');
const call=async b=> (await handler(new Request('https://f',{method:'POST',headers:{Authorization:'Bearer t','content-type':'application/json'},body:JSON.stringify(b)}))).json();
console.log('vin:', JSON.stringify(await call({action:'vin', vin:'3vwdp7aj5em123456'})));
console.log('bad vin:', JSON.stringify(await call({action:'vin', vin:'123'})));
console.log('recalls:', JSON.stringify(await call({action:'recalls', make:'Volkswagen', model:'Jetta', year:2014})).slice(0,90));
console.log('listing ok:', JSON.stringify(await call({action:'listing', url:'https://example.com/apt'})));
console.log('listing blocked:', JSON.stringify(await call({action:'listing', url:'https://www.zillow.com/x'})));
console.log('clothing:', JSON.stringify(await call({action:'clothing', data:'AA', media_type:'image/jpeg'})));
