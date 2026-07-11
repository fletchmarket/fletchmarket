/* Core: helpers, navigation, live chain status, wallet connect */
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const $=s=>document.querySelector(s);

/* ---------- helpers ---------- */
function logo(domain,sym,cls=''){
  return `<span class="ava ${cls}"><img src="https://www.google.com/s2/favicons?domain=${domain}&sz=64" alt="${sym}" loading="lazy" onerror="this.outerHTML='&lt;span class=fb&gt;${sym[0]}&lt;/span&gt;'"></span>`;
}
/* Real per-symbol crypto icon set (jsdelivr/npm CDN, ~500 coins) used as the primary
   source for token logos, with a company-favicon then letter-avatar fallback chain
   so a real icon shows up even when a specific API doesn't return one. */
const ICON_CDN='https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/128/color/';
function tokenIcon(sym,domain,cls=''){
  const s=(sym||'?').toLowerCase();
  domain=domain||EQUITY_DOMAIN[(sym||'').toUpperCase()]||null;
  const fb=domain
    ? `this.onerror=null;this.src='https://www.google.com/s2/favicons?domain=${domain}&sz=64';this.onerror=function(){this.outerHTML='&lt;span class=fb&gt;${(sym||'?')[0]}&lt;/span&gt;'}`
    : `this.outerHTML='&lt;span class=fb&gt;${(sym||'?')[0]}&lt;/span&gt;'`;
  return `<span class="ava ${cls}"><img src="${ICON_CDN}${s}.png" alt="${sym}" loading="lazy" onerror="${fb}"></span>`;
}
/* Robinhood Chain also lists tokenized real-world equities/ETFs. Blockscout's icon_url
   for these points at cdn.robinhood.com, which some networks can't reach — so map each
   ticker to its real company/issuer domain as a favicon fallback before the letter avatar. */
const EQUITY_DOMAIN={
  NVDA:'nvidia.com',AMD:'amd.com',TSLA:'tesla.com',SNDK:'sandisk.com',MU:'micron.com',
  GOOGL:'abc.xyz',PLTR:'palantir.com',META:'meta.com',AAPL:'apple.com',COIN:'coinbase.com',
  USO:'uscfinvestments.com',MSFT:'microsoft.com',CRCL:'circle.com',QQQ:'invesco.com',
  AMZN:'amazon.com',SPCX:'spacex.com',SLV:'ishares.com',SGOV:'ishares.com',SPY:'ssga.com',
  ORCL:'oracle.com',CRWV:'coreweave.com',INTC:'intel.com',USAR:'usrareearth.com',
  BABA:'alibaba.com',TSM:'tsmc.com',NBIS:'nebius.com',MSTR:'strategy.com',RGTI:'rigetti.com',
  HOOD:'robinhood.com',RKLB:'rocketlabusa.com',EWY:'ishares.com',ASML:'asml.com',
  IONQ:'ionq.com',GME:'gamestop.com',CLSK:'cleanspark.com',
};
/* Same idea, but for onchain tokens that come with their own icon_url (Blockscout) —
   try that real icon first, then a known equity domain, then the crypto icon set,
   then a letter avatar. */
function chainTokenIcon(sym,iconUrl,cls=''){
  const domain=EQUITY_DOMAIN[(sym||'').toUpperCase()]||null;
  const s=(sym||'?').toLowerCase();
  const letter=`this.outerHTML='&lt;span class=fb&gt;${(sym||'?')[0].toUpperCase()}&lt;/span&gt;'`;
  // Every tokenized real-world equity on the chain ships the same generic issuer
  // badge as its Blockscout icon_url, so they'd all look identical. For a known
  // ticker, show the real company logo instead; fall back to the crypto icon set
  // then a letter avatar.
  if(domain){
    const next=`this.onerror=null;this.src='${ICON_CDN}${s}.png';this.onerror=function(){${letter}}`;
    return `<span class="ava ${cls}"><img src="https://www.google.com/s2/favicons?domain=${domain}&sz=64" alt="${sym}" loading="lazy" onerror="${next}"></span>`;
  }
  if(!iconUrl)return tokenIcon(sym,null,cls);
  const next=`this.onerror=null;this.src='${ICON_CDN}${s}.png';this.onerror=function(){${letter}}`;
  return `<span class="ava ${cls}"><img src="${iconUrl}" alt="${sym}" loading="lazy" onerror="${next}"></span>`;
}
const fmt=n=>'$'+(n>=1?n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}):n.toFixed(4));

/* ---------- navigation + lazy per-view loading ----------
   Heavy data sources (Stocks, Chain activity, Vaults) only start fetching the
   first time their tab is opened, so we don't burst the explorer on page load. */
const _viewInit={};
function whenView(name,fn){
  _viewInit[name]=fn;
  if(document.querySelector('#v-'+name+'.on')){fn();delete _viewInit[name];} // already visible
}
function activateView(name){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('on'));
  const view=$('#v-'+name);if(view)view.classList.add('on');
  if(name==='markets')requestAnimationFrame(()=>renderChart());
  if(_viewInit[name]){_viewInit[name]();delete _viewInit[name];}
}
document.querySelectorAll('.navlink').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('.navlink').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  const v=b.dataset.view;
  activateView(v);
  // Reflect the active tab in the URL so it's shareable/bookmarkable and the
  // address bar matches what's on screen. Markets is the default → keep it clean.
  history.replaceState(null,'',v==='markets'?location.pathname:'#'+v);
  closeDrawer();
}));
/* Open the view named in the URL hash (e.g. /terminal#docs from the landing page). */
function routeHash(){
  const name=location.hash.replace('#','');
  if(!name)return;
  const nav=document.querySelector('.navlink[data-view="'+name+'"]');
  if(!nav)return;
  document.querySelectorAll('.navlink').forEach(x=>x.classList.remove('active'));
  nav.classList.add('active');
  activateView(name);
}
routeHash();
addEventListener('hashchange',routeHash);

/* ---------- mobile drawer (hamburger) ---------- */
const _sidebar=$('#sidebar'),_overlay=$('#navOverlay'),_ham=$('#hamburger');
function openDrawer(){if(!_sidebar)return;_sidebar.classList.add('open');_overlay.classList.add('on');requestAnimationFrame(()=>_overlay.classList.add('show'));}
function closeDrawer(){if(!_sidebar)return;_sidebar.classList.remove('open');_overlay.classList.remove('show');setTimeout(()=>_overlay.classList.remove('on'),300);}
if(_ham)_ham.addEventListener('click',()=>_sidebar.classList.contains('open')?closeDrawer():openDrawer());
if(_overlay)_overlay.addEventListener('click',closeDrawer);

/* ---------- LIVE chain data (real JSON-RPC) ---------- */
let rpcOK=false;
async function rpc(method,params=[]){
  const r=await fetch(RPC,{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});
  const j=await r.json();return j.result;
}
async function pollChain(){
  try{
    const [bn,gp]=await Promise.all([rpc('eth_blockNumber'),rpc('eth_gasPrice')]);
    const block=parseInt(bn,16).toLocaleString('en-US');
    const gwei=(parseInt(gp,16)/1e9).toFixed(3)+' gwei';
    $('#blockNum').textContent=block;$('#statBlock').textContent=block;
    $('#gasPrice').textContent=gwei;$('#statGas').textContent=gwei;
    if(!rpcOK){rpcOK=true;$('#netDot').classList.add('live');$('#netLabel').textContent='Mainnet · Live';}
  }catch(e){
    if(!rpcOK){
      $('#netLabel').textContent='RPC unreachable';
      $('#netLabel').title='Could not reach the Robinhood Chain RPC from this network. Retrying automatically.';
      $('#blockNum').textContent='offline';$('#statBlock').textContent='—';
      $('#liveTag1').textContent='OFFLINE';$('#liveTag2').textContent='OFFLINE';
    }
  }
  // Back off while unreachable so a dead RPC doesn't get hammered forever;
  // resume the normal 6s cadence the moment it responds.
  pollDelay=rpcOK?6000:Math.min(pollDelay*1.6,60000);
  setTimeout(pollChain,pollDelay);
}
let pollDelay=6000;
pollChain();

/* ---------- connect wallet (adds Robinhood Chain) ---------- */
$('#connectBtn').addEventListener('click',async()=>{
  if(!window.ethereum){toast('WALLET','No browser wallet detected. Install MetaMask to connect.');return;}
  try{
    const acc=await ethereum.request({method:'eth_requestAccounts'});
    await ethereum.request({method:'wallet_addEthereumChain',params:[{
      chainId:'0x1237', // 4663
      chainName:'Robinhood Chain',
      nativeCurrency:{name:'Ether',symbol:'ETH',decimals:18},
      rpcUrls:[RPC],
      blockExplorerUrls:['https://robinhoodchain.blockscout.com']
    }]});
    const a=acc[0];
    const btn=$('#connectBtn');btn.classList.add('connected');
    btn.textContent=a.slice(0,6)+'…'+a.slice(-4);
    const pf=$('#pfAddr');if(pf)pf.value=a;
    toast('CONNECTED','Wallet connected. Open the Portfolio tab to view your balances & activity.');
  }catch(e){toast('WALLET','Connection was cancelled or rejected.');}
});
