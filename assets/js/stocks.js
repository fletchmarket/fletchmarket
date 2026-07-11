/* Stocks: tokenized real-world equities & ETFs on Robinhood Chain (live · Blockscout).
   The explorer can be slow / rate-limited, so we render progressively: the first
   page shows immediately and later pages append as they arrive. */
const STOCKS_REFRESH_MS=300000;
let stRetries=0;
async function fetchPage(url,tries){
  for(let a=0;a<tries;a++){
    try{const r=await fetch(url);if(r.ok)return await r.json();}catch(e){}
    await new Promise(r=>setTimeout(r,700*(a+1)));
  }
  return null;
}
function renderStocks(items){
  const tb=document.querySelector('#stocksTable tbody');
  items.sort((a,b)=>parseFloat(b.circulating_market_cap||0)-parseFloat(a.circulating_market_cap||0));
  tb.innerHTML=items.map(t=>{
    const name=(t.name||'').replace(/\s*•\s*Robinhood Token$/,'');
    const sym=t.symbol||'?';
    const holders=parseInt(t.holders_count||0).toLocaleString('en-US');
    const px=t.exchange_rate?fmt(parseFloat(t.exchange_rate)):'—';
    const mcap=t.circulating_market_cap?big(parseFloat(t.circulating_market_cap)):'—';
    const addr=t.address_hash||t.address||'';
    const icon=chainTokenIcon(sym,t.icon_url,'sm');
    return `<tr class="row" onclick="window.open('${SCAN}/token/${addr}','_blank','noopener')">
      <td><span class="asset">${icon}<span><span class="sym">${name}</span></span></span></td>
      <td class="num">${sym}</td>
      <td class="num">${px}</td>
      <td class="num">${mcap}</td>
      <td class="num">${holders}</td>
      <td class="num" style="color:var(--deep);font-size:11px">explorer ↗</td>
    </tr>`;
  }).join('');
  $('#stocksCount').textContent=items.length;
  $('#stocksMcap').textContent=big(items.reduce((s,t)=>s+parseFloat(t.circulating_market_cap||0),0));
  $('#stocksSrc').innerHTML='<i class="live-tag">LIVE · BLOCKSCOUT</i>';
}
async function loadStocks(){
  let url=`${SCAN}/api/v2/tokens?type=ERC-20`;
  let items=[],rendered=false;
  for(let page=0;page<9&&url;page++){
    if(page)await new Promise(r=>setTimeout(r,300)); // gentle pacing
    const j=await fetchPage(url,2);
    if(!j)break;                                     // explorer failed → keep what we have
    items.push(...(j.items||[]).filter(t=>/Robinhood Token/.test(t.name||'')));
    url=j.next_page_params?`${SCAN}/api/v2/tokens?type=ERC-20&${new URLSearchParams(j.next_page_params)}`:null;
    if(items.length){renderStocks(items);rendered=true;} // show results as they load
  }
  if(!rendered){
    if(stRetries<3){stRetries++;$('#stocksSrc').innerHTML='<i class="sim-tag">RETRYING…</i>';setTimeout(loadStocks,3000*stRetries);return;}
    document.querySelector('#stocksTable tbody').innerHTML='<tr><td colspan="6"><div class="empty">Explorer is slow or rate-limited right now — try again in a moment.</div></td></tr>';
    $('#stocksSrc').innerHTML='<i class="sim-tag">OFFLINE</i>';
  }else{stRetries=0;}
}
whenView('stocks',()=>{loadStocks();setInterval(loadStocks,STOCKS_REFRESH_MS);});
