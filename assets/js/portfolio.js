/* Portfolio: DeBank-style wallet tracker (RPC + Blockscout) */
/* ============ PORTFOLIO (DeBank-style) ============ */
const COLORS=['#7A9900','#A9C400','#556F00','#4C6200','#8FB300','#C2D96B','#B0B48A'];
const usd=n=>'$'+n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const shortA=a=>a.slice(0,6)+'…'+a.slice(-4);
const TOKMAP={BTC:'bitcoin.org',ADA:'cardano.org',AVAX:'avax.network',LTC:'litecoin.org',WBTC:'bitcoin.org',WETH:'ethereum.org',ETH:'ethereum.org',USDG:'paxos.com',PAXG:'paxos.com',USDC:'circle.com',LINK:'chain.link',ARB:'arbitrum.io',UNI:'uniswap.org',SOL:'solana.com',AAVE:'aave.com',DOGE:'dogecoin.com',XRP:'ripple.com',MORPHO:'morpho.org'};
/* Tokenized-equity tickers (see EQUITY_DOMAIN in core.js) get their real company
   favicon; everything else tries the crypto icon set first, then a domain favicon
   if one is known, then a letter avatar as a last resort. */
function tokLogo(sym){
  const s=(sym||'?').toUpperCase();
  if(EQUITY_DOMAIN[s])return logo(EQUITY_DOMAIN[s],sym);
  const key=Object.keys(TOKMAP).find(k=>sym&&s.startsWith(k));
  return tokenIcon(sym,key?TOKMAP[key]:null);
}
function pfStatus(msg,err=false){const s=$('#pfStatus');s.textContent=msg;s.className=err?'err':'';}
$('#pfGo').addEventListener('click',()=>pfTrack($('#pfAddr').value.trim()));
$('#pfAddr').addEventListener('keydown',e=>{if(e.key==='Enter')pfTrack($('#pfAddr').value.trim())});
$('#pfDemo').addEventListener('click',pfDemo);

function pfShow(addr,isDemo){
  $('#pfWho').style.display='flex';
  $('#pfCards').style.display='grid';
  $('#pfGrid').style.display='grid';
  $('#pfWhoAddr').textContent=shortA(addr);
  $('#pfWhoSub').textContent=(isDemo?'DEMO WALLET · ':'')+'Robinhood Chain · 4663';
  $('#pfExp').href=`${SCAN}/address/${addr}`;
  $('#pfAvz').style.background=`linear-gradient(135deg,hsl(${parseInt(addr.slice(2,6),16)%360} 70% 45%),#131520)`;
  $('#pfSrc').textContent=isDemo?'DEMO DATA':'LIVE ONCHAIN';
  $('#pfSrc').className=isDemo?'sim-tag':'live-tag';
  $('#pfAssetSrc').textContent=isDemo?'DEMO DATA':'BLOCKSCOUT API';
}
function pfSkel(){
  $('#pfTokList').innerHTML='<div class="skel"></div><div class="skel"></div><div class="skel"></div>';
  $('#pfTxList').innerHTML='<div class="skel"></div><div class="skel"></div>';
  $('#pfLegend').innerHTML='';$('#pfWorth').textContent='…';$('#pfCount').textContent='…';$('#pfTxN').textContent='…';
  drawDonut([]);
}

async function pfTrack(addr){
  if(!/^0x[0-9a-fA-F]{40}$/.test(addr)){pfStatus('Invalid address — must be 0x followed by 40 hex characters.',true);return;}
  pfStatus('Reading on-chain data…');
  pfShow(addr,false);pfSkel();
  try{
    const balHex=await rpc('eth_getBalance',[addr,'latest']);
    const eth=parseInt(balHex||'0x0',16)/1e18;
    $('#pfEth').textContent=eth.toFixed(5)+' ETH';

    let tokens=[];
    try{const r=await fetch(`${SCAN}/api/v2/addresses/${addr}/token-balances`);if(r.ok)tokens=await r.json();}catch(e){}
    let txs=[];
    try{const r=await fetch(`${SCAN}/api/v2/addresses/${addr}/transactions`);if(r.ok){const j=await r.json();txs=(j.items||[]).slice(0,10);}}catch(e){}

    pfRender(addr,eth,Array.isArray(tokens)?tokens:[],txs);
    pfStatus('');
  }catch(e){
    pfStatus('Could not read the chain (RPC/API may be rate-limited or the address has no activity). Try again, or view the demo.',true);
  }
}

function pfRender(addr,eth,tokens,txs){
  const assets=[];
  tokens.forEach(t=>{
    const info=t.token||{};
    const dec=+(info.decimals||18);
    const amt=Number(t.value||0)/Math.pow(10,dec);
    const px=info.exchange_rate?parseFloat(info.exchange_rate):null;
    if(amt>0)assets.push({sym:info.symbol||'?',name:info.name||'Unknown token',amt,px,val:px?amt*px:null});
  });
  assets.sort((a,b)=>(b.val||0)-(a.val||0));
  const worth=assets.reduce((s,a)=>s+(a.val||0),0);
  $('#pfWorth').textContent=usd(worth)+(assets.some(a=>a.val===null)?' +':'');
  $('#pfCount').textContent=assets.length+(eth>0?1:0);
  $('#pfTxN').textContent=txs.length;

  const rows=[];
  if(eth>0)rows.push({sym:'ETH',name:'Ether (gas token)',amt:eth,val:null,px:null});
  rows.push(...assets);
  $('#pfTokList').innerHTML=rows.length?rows.map(a=>`
    <div class="tok">${tokLogo(a.sym)}
      <div class="t"><b>${a.sym}</b><span>${a.name}</span></div>
      <div class="r"><b>${a.amt.toLocaleString('en-US',{maximumFractionDigits:5})}</b><span>${a.val!==null?usd(a.val):(a.px===null?'no price feed':'')}</span></div>
    </div>`).join('')
    :'<div class="empty">This wallet holds no tokens on Robinhood Chain yet. The chain is still very new — try another address or click Demo wallet.</div>';

  $('#pfTxList').innerHTML=txs.length?txs.map(tx=>{
    const isOut=(tx.from?.hash||'').toLowerCase()===addr.toLowerCase();
    const val=Number(tx.value||0)/1e18;
    const label=(tx.method||(tx.tx_types&&tx.tx_types[0])||'transfer').replace(/_/g,' ');
    return `<div class="txp">
      <span class="ic ${isOut?'out':''}">${isOut?'↗':'↘'}</span>
      <div class="t"><b>${label}</b><span>${tx.hash}</span></div>
      <span class="amt ${isOut?'dn':'up'}">${isOut?'-':'+'}${val.toFixed(4)} ETH</span>
    </div>`;
  }).join(''):'<div class="empty">No transactions recorded for this address yet.</div>';

  const priced=assets.filter(a=>a.val);
  drawDonut(priced.length?priced:[]);
}

function pfDemo(){
  const addr='0xF1e7c40DEA7bE1FA53E4a1C0e8f3B9d2A4C5E6F7';
  pfShow(addr,true);
  const assets=[
    {sym:'WETH',name:'Wrapped Ether',amt:2.31,val:7882.88},
    {sym:'USDG',name:'Global Dollar',amt:5210.44,val:5210.44},
    {sym:'WBTC',name:'Wrapped Bitcoin',amt:0.0371,val:3888.82},
    {sym:'LINK',name:'Chainlink',amt:112.4,val:2717.83},
    {sym:'ETH',name:'Ether (gas token)',amt:0.4821,val:1645.37},
    {sym:'ARB',name:'Arbitrum',amt:695,val:989.00},
  ];
  const worth=assets.reduce((s,a)=>s+a.val,0);
  $('#pfWorth').textContent=usd(worth);
  $('#pfEth').textContent='0.48210 ETH';
  $('#pfCount').textContent=assets.length;
  $('#pfTxN').textContent=5;
  $('#pfTokList').innerHTML=assets.map(a=>`
    <div class="tok">${tokLogo(a.sym)}
      <div class="t"><b>${a.sym}</b><span>${a.name}</span></div>
      <div class="r"><b>${a.amt.toLocaleString('en-US')}</b><span>${usd(a.val)}</span></div>
    </div>`).join('');
  const acts=[['swap','+0.85 WETH',0],['deposit','-2,000.00 USDG',1],['transfer','+0.2500 ETH',0],['approve','USDG → Morpho vault',1],['swap','+38.0 LINK',0]];
  $('#pfTxList').innerHTML=acts.map(([m,v,out])=>`
    <div class="txp"><span class="ic ${out?'out':''}">${out?'↗':'↘'}</span>
    <div class="t"><b>${m}</b><span>0x${Math.random().toString(16).slice(2,14)}… · a few minutes ago</span></div>
    <span class="amt ${out?'dn':'up'}">${v}</span></div>`).join('');
  drawDonut(assets);
  pfStatus('');
}

function drawDonut(items){
  const cv=$('#donut');if(!cv)return;
  const x=cv.getContext('2d'),dpr=devicePixelRatio||1;
  cv.width=140*dpr;cv.height=140*dpr;x.scale(dpr,dpr);x.clearRect(0,0,140,140);
  const total=items.reduce((s,i)=>s+(i.val||0),0);
  const leg=$('#pfLegend');
  if(!total){x.strokeStyle='#ECEFEC';x.lineWidth=17;x.beginPath();x.arc(70,70,54,0,7);x.stroke();leg.innerHTML='<div class="li" style="color:var(--mute)">No price data</div>';return;}
  let a=-Math.PI/2;
  const top=items.slice(0,6);
  top.forEach((it,i)=>{
    const frac=(it.val||0)/total,end=a+frac*Math.PI*2;
    x.strokeStyle=COLORS[i%COLORS.length];x.lineWidth=17;
    x.beginPath();x.arc(70,70,54,a+0.02,end-0.02);x.stroke();a=end;
  });
  leg.innerHTML=top.map((it,i)=>`<div class="li"><span class="sw" style="background:${COLORS[i%COLORS.length]}"></span>${it.sym}<b>${(((it.val||0)/total)*100).toFixed(1)}%</b></div>`).join('');
}
