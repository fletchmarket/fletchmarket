/* Widgets: vaults (live · DefiLlama), whale feed (live · Blockscout), toasts & alerts */
/* ---------- vaults — real APY & TVL from the DefiLlama yields API ---------- */
const VAULT_DEFS=[
 {n:'Morpho Blue · Prime USDC',d:'morpho.org',project:'morpho-blue',match:s=>/USDC/i.test(s),desc:'Curated USDC lending vault on Morpho Blue — the same vault architecture behind Robinhood Earn.'},
 {n:'Steakhouse Financial',d:'steakhouse.financial',project:'steakhouse-financial',match:null,desc:'Curated by Steakhouse Financial across blue-chip collateral markets.'},
 {n:'Spark Protocol',d:'spark.fi',project:'sparklend',match:s=>/USDS/i.test(s),desc:'Spark stablecoin lending market. Supply APY floats with pool utilization.'},
 {n:'Maple · USDG',d:'maple.finance',project:'maple',match:s=>/USDG/i.test(s),desc:'Institution-grade USDG credit pool with KYC\'d borrowers and monthly attestation reports.'},
];
async function loadVaults(){
  try{
    const r=await fetch('https://yields.llama.fi/pools');
    if(!r.ok)throw 0;
    const j=await r.json();
    const picks=VAULT_DEFS.map(def=>{
      const pools=j.data.filter(p=>p.project===def.project&&p.tvlUsd>0);
      const pool=(def.match&&pools.find(p=>def.match(p.symbol)))||pools.sort((a,b)=>b.tvlUsd-a.tvlUsd)[0];
      return {...def,pool};
    }).filter(v=>v.pool);
    if(!picks.length)throw 0;
    const maxTvl=Math.max(...picks.map(v=>v.pool.tvlUsd));
    $('#vaultGrid').innerHTML=picks.map(v=>`
      <div class="vault">
        <div class="top"><b>${logo(v.d,v.n,'sm')}${v.n}</b><span class="apy">${v.pool.apy.toFixed(2)}%</span></div>
        <div class="meter"><i style="width:${Math.max(6,v.pool.tvlUsd/maxTvl*100)}%"></i></div>
        <div class="meta"><span>${v.pool.symbol} · ${v.pool.chain}</span><span>TVL ${big(v.pool.tvlUsd)}</span></div>
        <p>${v.desc}</p>
        <a class="vault-src" href="https://defillama.com/yields/pool/${v.pool.pool}" target="_blank" rel="noopener">source: defillama ↗</a>
      </div>`).join('');
    const tag=$('#vaultSrc');if(tag)tag.innerHTML='<i class="live-tag">LIVE · DEFILLAMA</i>';
  }catch(e){
    const tag=$('#vaultSrc');if(tag)tag.innerHTML='<i class="sim-tag">YIELD API UNREACHABLE</i>';
  }
}
whenView('vaults',()=>{loadVaults();setInterval(loadVaults,300000);});

/* ---------- activity feed — real token transfers from Blockscout ---------- */
const seenTx=new Set();
function relTime(iso){
  const s=Math.max(1,Math.round((Date.now()-new Date(iso).getTime())/1000));
  if(s<60)return s+'s ago';
  if(s<3600)return Math.round(s/60)+'m ago';
  return Math.round(s/3600)+'h ago';
}
const fmtUsd=n=>n<0.01?'<$0.01':big(n);
function addActivity(x){
  const el=document.createElement('div');el.className='fx';
  const verb=x.to==='0x0000000000000000000000000000000000000000'?'burned':(x.from==='0x0000000000000000000000000000000000000000'?'minted':'transferred');
  el.innerHTML=`${chainTokenIcon(x.sym,x.icon,'sm')}
    <div class="t"><b>${x.amt.toLocaleString('en-US',{maximumFractionDigits:4})} ${x.sym} ${verb}</b><span>${x.hash.slice(0,10)}…${x.hash.slice(-6)} · ${relTime(x.ts)}</span></div>
    <span class="amt">${x.usd!==null?fmtUsd(x.usd):'no price feed'}</span>
    <a href="${SCAN}/tx/${x.hash}" target="_blank" rel="noopener">explorer ↗</a>`;
  const f=$('#whaleFeed');f.prepend(el);
  while(f.children.length>14)f.lastChild.remove();
}
async function loadActivity(){
  try{
    const r=await fetch(`${SCAN}/api/v2/token-transfers`);
    if(!r.ok)throw 0;
    const j=await r.json();
    const items=(j.items||[]).map(t=>{
      const dec=+(t.token&&t.token.decimals||18);
      const amt=Number(t.total&&t.total.value||0)/Math.pow(10,dec);
      const rate=t.token&&t.token.exchange_rate?parseFloat(t.token.exchange_rate):null;
      return {
        key:t.transaction_hash+':'+t.log_index,hash:t.transaction_hash,ts:t.timestamp,
        sym:(t.token&&t.token.symbol)||'?',icon:t.token&&t.token.icon_url,
        from:(t.from&&t.from.hash||'').toLowerCase(),to:(t.to&&t.to.hash||'').toLowerCase(),
        amt,usd:rate?amt*rate:null,
      };
    }).filter(t=>t.amt>0&&!seenTx.has(t.key));
    items.sort((a,b)=>new Date(a.ts)-new Date(b.ts));
    items.slice(-8).forEach(t=>{seenTx.add(t.key);addActivity(t);});
    const tag=$('#whaleSrc');if(tag)tag.innerHTML='<i class="live-tag">LIVE · BLOCKSCOUT</i>';
  }catch(e){
    const tag=$('#whaleSrc');if(tag)tag.innerHTML='<i class="sim-tag">EXPLORER UNREACHABLE</i>';
  }
}
whenView('whales',()=>{loadActivity();setInterval(loadActivity,60000);});

/* ---------- alerts & toasts ---------- */
function toast(title,msg){
  const el=document.createElement('div');el.className='toast';
  el.innerHTML=`<img src="assets/brand/logo-mark-full.svg" width="22" height="22" style="flex:0 0 22px;margin-top:1px;border-radius:5px" alt="">
  <div><b>${title}</b>${msg}</div>`;
  $('#toasts').appendChild(el);
  setTimeout(()=>{el.classList.add('out');setTimeout(()=>el.remove(),450);},5200);
}
function pushAlert(t,g){
  alerts.unshift({s:t.s,d:t.d,img:t.img,g,tm:new Date().toLocaleTimeString()});
  $('#alertCount').textContent=alerts.length;
  $('#alertList').innerHTML=alerts.slice(0,20).map(a=>`
    <div class="alert-item">
      <span class="ic">${a.img?`<span class="ava sm"><img src="${a.img}" alt="${a.s}"></span>`:logo(a.d,a.s,'sm')}</span>
      <div><b><svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" style="vertical-align:-2px;margin-right:4px" aria-hidden="true"><path d="M13.5 2 5 13.2h5.1l-1.6 8.8L19 10h-5.6z"/></svg>Big move on ${a.s}</b><p>${a.s} is ${a.g>=0?'up':'down'} ${Math.abs(a.g).toFixed(2)}% in the last 24 hours — live market data via CoinGecko.</p></div>
      <span class="tm">${a.tm}</span>
    </div>`).join('');
  toast('BIG MOVE · '+t.s,`${t.s} ${a2(g)} in 24h. See Markets for details.`);
}
const a2=g=>(g>=0?'+':'')+g.toFixed(2)+'%';

renderTable();renderGapList();renderChart();
