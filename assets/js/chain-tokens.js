/* Live tokens on Robinhood Chain via Blockscout (auto-refresh) */
/* ============ LIVE TOKENS ON CHAIN (real Blockscout data) ============ */
let ctRetries=0;
async function loadChainTokens(){
  const tb=document.querySelector('#chainTokTable tbody');
  try{
    const r=await fetch(`${SCAN}/api/v2/tokens?type=ERC-20`);
    if(!r.ok)throw new Error('http '+r.status);
    const j=await r.json();
    let items=(j.items||[]);
    // sort by holders desc when available
    items.sort((a,b)=>(parseInt(b.holders||b.holders_count||0))-(parseInt(a.holders||a.holders_count||0)));
    items=items.slice(0,15);
    if(!items.length){tb.innerHTML='<tr><td colspan="6"><div class="empty">No ERC-20 tokens indexed on the explorer yet — the chain is still very new.</div></td></tr>';return;}
    tb.innerHTML=items.map(t=>{
      const sym=t.symbol||'?',name=t.name||'Unknown token';
      const holders=parseInt(t.holders||t.holders_count||0).toLocaleString('en-US');
      const px=t.exchange_rate?('$'+parseFloat(t.exchange_rate).toLocaleString('en-US',{maximumFractionDigits:4})):'—';
      const addr=t.address_hash||t.address||'';
      const icon=chainTokenIcon(sym,t.icon_url,'sm');
      return `<tr class="row" onclick="window.open('${SCAN}/token/${addr}','_blank','noopener')">
        <td><span class="asset">${icon}<span><span class="sym">${name}</span></span></span></td>
        <td class="num">${sym}</td>
        <td><span class="pill up">${t.type||'ERC-20'}</span></td>
        <td class="num">${holders}</td>
        <td class="num">${px}</td>
        <td class="num" style="color:var(--deep);font-size:11px">explorer ↗</td>
      </tr>`;
    }).join('');
    ctRetries=0;
    $('#chainTokSrc').innerHTML='<i class="live-tag">LIVE · BLOCKSCOUT</i> <span style="margin-left:6px">updated '+new Date().toLocaleTimeString()+'</span>';
  }catch(e){
    // transient rate-limit: retry a few times with backoff before showing offline
    if(ctRetries<4){ctRetries++;$('#chainTokSrc').innerHTML='<i class="sim-tag">RETRYING…</i>';setTimeout(loadChainTokens,2500*ctRetries);return;}
    tb.innerHTML='<tr><td colspan="6"><div class="empty">Explorer API unreachable (rate-limited or offline). Try refreshing in a moment.</div></td></tr>';
    $('#chainTokSrc').innerHTML='<i class="sim-tag">OFFLINE</i>';
  }
}
loadChainTokens();setInterval(loadChainTokens,CHAIN_TOKENS_REFRESH_MS);
