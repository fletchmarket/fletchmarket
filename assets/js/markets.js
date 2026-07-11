/* Markets: live CoinGecko prices, table, movers, big chart */
/* ---------- token universe (demo prices) ---------- */
const T=[
 {s:'BTC',n:'Bitcoin',d:'bitcoin.org',cg:'bitcoin',px:104820.00,spot:104510.00,v:'$24.6M'},
 {s:'ETH',n:'Ethereum',d:'ethereum.org',cg:'ethereum',px:3412.50,spot:3405.80,v:'$19.8M'},
 {s:'SOL',n:'Solana',d:'solana.com',cg:'solana',px:218.36,spot:219.90,v:'$8.4M'},
 {s:'XRP',n:'XRP',d:'ripple.com',cg:'ripple',px:2.8600,spot:2.8820,v:'$7.7M'},
 {s:'DOGE',n:'Dogecoin',d:'dogecoin.com',cg:'dogecoin',px:0.3182,spot:0.3151,v:'$6.9M'},
 {s:'ADA',n:'Cardano',d:'cardano.org',cg:'cardano',px:1.0240,spot:1.0180,v:'$5.3M'},
 {s:'AVAX',n:'Avalanche',d:'avax.network',cg:'avalanche-2',px:41.25,spot:40.90,v:'$4.8M'},
 {s:'LINK',n:'Chainlink',d:'chain.link',cg:'chainlink',px:24.18,spot:23.95,v:'$4.4M'},
 {s:'LTC',n:'Litecoin',d:'litecoin.org',cg:'litecoin',px:128.40,spot:127.75,v:'$3.6M'},
 {s:'UNI',n:'Uniswap',d:'uniswap.org',cg:'uniswap',px:12.84,spot:12.70,v:'$3.1M'},
];
T.forEach(t=>{t.hist={};t.chg24=null;t.mcap=0;t.vol=0;t.img=null;t.spark=null;t.live=false;t.alerted=false});

const big=n=>!n?'—':n>=1e12?'$'+(n/1e12).toFixed(2)+'T':n>=1e9?'$'+(n/1e9).toFixed(2)+'B':n>=1e6?'$'+(n/1e6).toFixed(1)+'M':'$'+Math.round(n).toLocaleString('en-US');
const BOLT='<svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor" style="vertical-align:-1px;margin-right:3px" aria-hidden="true"><path d="M13.5 2 5 13.2h5.1l-1.6 8.8L19 10h-5.6z"/></svg>';
function coinLogo(t,cls=''){
  if(t.img)return `<span class="ava ${cls}"><img src="${t.img}" alt="${t.s}" loading="lazy" onerror="this.outerHTML='&lt;span class=fb&gt;${t.s[0]}&lt;/span&gt;'"></span>`;
  return tokenIcon(t.s,t.d,cls);
}

/* ---- ALL market data LIVE via CoinGecko /coins/markets (prices, 24h, mcap, volume, 7d sparkline) ---- */
let mktLiveOK=false;
async function fetchMarkets(){
  try{
    const ids=T.map(t=>t.cg).join(',');
    const r=await fetch(`${COINGECKO}/coins/markets?vs_currency=usd&ids=${ids}&sparkline=true&price_change_percentage=24h`);
    if(!r.ok)throw 0;
    const j=await r.json();
    j.forEach(d=>{
      const t=T.find(x=>x.cg===d.id);if(!t)return;
      t.px=d.current_price;t.chg24=d.price_change_percentage_24h??t.chg24;
      t.mcap=d.market_cap||t.mcap;t.vol=d.total_volume||t.vol;
      t.img=d.image||t.img;
      if(d.sparkline_in_7d&&d.sparkline_in_7d.price&&d.sparkline_in_7d.price.length>24)t.spark=d.sparkline_in_7d.price;
      t.live=true;
      if(t.chg24!==null&&Math.abs(t.chg24)>=MOVE&&!t.alerted){t.alerted=true;pushAlert(t,t.chg24);}
    });
    mktLiveOK=true;
    const tag=$('#spotTag');if(tag){tag.textContent='ALL PRICES LIVE';tag.className='live-tag';}
    $('#statVol').textContent=big(T.reduce((a,t)=>a+(t.vol||0),0));
    $('#statArb').textContent=T.filter(t=>t.chg24!==null&&Math.abs(t.chg24)>=MOVE).length;
    renderTable($('#q').value);renderGapList();renderChart();
  }catch(e){
    const tag=$('#spotTag');if(tag&&!mktLiveOK){tag.textContent='API RATE-LIMITED · RETRYING';tag.className='sim-tag';}
  }
}
setTimeout(fetchMarkets,0);setInterval(fetchMarkets,MARKET_REFRESH_MS);
let sel=T[0];
const MOVE=5;
const alerts=[];
const chg=t=>t.chg24===null?0:t.chg24;

/* ---------- table ---------- */
function renderTable(filter=''){
  const tb=$('#tokTable tbody');tb.innerHTML='';
  T.filter(t=>(t.s+t.n).toLowerCase().includes(filter.toLowerCase())).forEach(t=>{
    const c=chg(t);
    const tr=document.createElement('tr');
    tr.className='row'+(t===sel?' sel':'');
    tr.innerHTML=`
      <td><span class="asset">${coinLogo(t)}<span><span class="sym">${t.s}</span><span class="nm">${t.n}</span></span></span></td>
      <td class="num">${fmt(t.px)}</td>
      <td><span class="pill ${c>=0?'up':'dn'}">${c>=0?'+':''}${c.toFixed(2)}%</span></td>
      <td class="num">${big(t.mcap)}</td>
      <td class="num">${big(t.vol)}</td>
      <td><canvas class="spk" width="86" height="26"></canvas></td>`;
    tr.addEventListener('click',()=>{sel=t;loadKlines(t);renderChart();renderTable($('#q').value);});
    tb.appendChild(tr);
    drawSpk(tr.querySelector('.spk'),t.spark,c>=0);
  });
}
function drawSpk(cv,data,up){
  const x=cv.getContext('2d');x.clearRect(0,0,86,26);
  if(!data||data.length<2){x.strokeStyle='rgba(19,21,32,.13)';x.beginPath();x.moveTo(0,13);x.lineTo(86,13);x.stroke();return;}
  const step=Math.max(1,Math.floor(data.length/28));
  const pts=data.filter((_,i)=>i%step===0);
  const min=Math.min(...pts),max=Math.max(...pts);
  x.strokeStyle=up?'#6E8A00':'#E5484D';x.lineWidth=1.6;x.lineJoin='round';x.beginPath();
  pts.forEach((v,i)=>{
    const px=i*(86/(pts.length-1)),py=23-((v-min)/(max-min||1))*20;
    i?x.lineTo(px,py):x.moveTo(px,py);
  });
  x.stroke();
}
$('#q').addEventListener('input',e=>renderTable(e.target.value));

/* ---------- gap radar (side panel) ---------- */
function renderGapList(){
  const el=$('#gapList');
  const sorted=[...T].sort((a,b)=>Math.abs(chg(b))-Math.abs(chg(a))).slice(0,6);
  el.innerHTML=sorted.map(t=>{
    const c=chg(t),mover=Math.abs(c)>=MOVE;
    return `<div class="fx">
      ${coinLogo(t,'sm')}
      <div class="t"><b>${t.s}</b><span>${fmt(t.px)} · mcap ${big(t.mcap)}</span></div>
      <span class="pill ${mover?'arb':(c>=0?'up':'dn')}">${mover?BOLT:''}${c>=0?'+':''}${c.toFixed(2)}%</span>
    </div>`;
  }).join('');
}

/* ---------- big chart — real OHLC candlesticks from Binance (TradingView-style
   timeframes). Uses Binance's public data mirror (no key, CORS-enabled). Falls
   back to sparkline-derived candles for any symbol without a Binance pair. ---------- */
let tf='1H';
const BN={BTC:'BTCUSDT',ETH:'ETHUSDT',SOL:'SOLUSDT',XRP:'XRPUSDT',DOGE:'DOGEUSDT',ADA:'ADAUSDT',AVAX:'AVAXUSDT',LINK:'LINKUSDT',LTC:'LTCUSDT',UNI:'UNIUSDT',ARB:'ARBUSDT'};
const BN_TF={'1m':['1m',90],'15m':['15m',96],'1H':['1h',96],'4H':['4h',90],'1D':['1d',90],'1W':['1w',100]};
const KLINE='https://data-api.binance.vision/api/v3/klines';
const klineCache={};   // `${sym}|${tf}` -> [[o,h,l,c],...]
const klineReq={};
async function loadKlines(t,force){
  const sym=BN[t.s];if(!sym)return;                 // no pair → sparkline fallback
  const key=t.s+'|'+tf;
  if(!force&&(klineCache[key]||klineReq[key]))return;
  klineReq[key]=1;
  try{
    const [iv,lim]=BN_TF[tf];
    const r=await fetch(`${KLINE}?symbol=${sym}&interval=${iv}&limit=${lim}`);
    if(r.ok){const j=await r.json();if(Array.isArray(j)&&j.length>1){klineCache[key]=j.map(k=>[+k[1],+k[2],+k[3],+k[4]]);if(sel===t)renderChart();}}
  }catch(e){}finally{klineReq[key]=0;}
}
function sparkCandles(spark){
  if(!spark||spark.length<4)return null;
  const per=Math.max(1,Math.round(spark.length/40)),out=[];
  for(let i=0;i<spark.length;i+=per){const c=spark.slice(i,i+per);if(!c.length)continue;out.push([c[0],Math.max(...c),Math.min(...c),c[c.length-1]]);}
  return out.length>1?out:null;
}
document.querySelectorAll('#tf button').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('#tf button').forEach(x=>x.classList.remove('on'));
  b.classList.add('on');tf=b.dataset.tf;loadKlines(sel);renderChart();
}));
function renderChart(){
  const t=sel;
  $('#chAva').outerHTML=t.img?`<span class="ava" id="chAva"><img src="${t.img}" alt="${t.s}"></span>`:tokenIcon(t.s,t.d).replace('class="ava','id="chAva" class="ava');
  $('#chSym').textContent=t.s+' / USD';
  $('#chPx').textContent=fmt(t.px);
  const c=chg(t);$('#chChg').textContent=(c>=0?'▲ +':'▼ ')+Math.abs(c).toFixed(2)+'%';
  $('#chChg').className='chg '+(c>=0?'up':'dn');
  const gc=$('#chGap');gc.textContent='MCAP '+big(t.mcap);gc.className='gap-chip ok';

  const cv=$('#bigChart'),dpr=devicePixelRatio||1;
  const W=cv.clientWidth,H=250;
  if(W<10)return; // view hidden — skip, will re-render when visible
  cv.width=W*dpr;cv.height=H*dpr;
  const x=cv.getContext('2d');x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,W,H);
  const cs=getComputedStyle(document.documentElement);
  const UP=cs.getPropertyValue('--deep').trim()||'#7A9900';
  const DN=cs.getPropertyValue('--loss').trim()||'#E5484D';
  const pad=16,padTop=18,padBot=22,plotH=H-padTop-padBot;
  // grid
  x.strokeStyle='rgba(19,21,32,.07)';x.lineWidth=1;
  for(let i=0;i<=4;i++){const gy=padTop+plotH*i/4;x.beginPath();x.moveTo(pad,gy);x.lineTo(W-pad,gy);x.stroke();}

  const oh=klineCache[t.s+'|'+tf]||sparkCandles(t.spark);
  if(!oh){return;} // no data yet — grid only
  const highs=oh.map(c=>c[1]),lows=oh.map(c=>c[2]);
  let min=Math.min(...lows),max=Math.max(...highs);
  const pv=(max-min)*0.08||Math.abs(max)*0.01||1;min-=pv;max+=pv;
  const Y=v=>padTop+plotH*(1-(v-min)/(max-min||1));
  const n=oh.length,cw=(W-pad*2)/n,bodyW=Math.max(2.5,Math.min(11,cw*0.6));
  oh.forEach((c,i)=>{
    const o=c[0],h=c[1],l=c[2],cl=c[3];
    const cx=pad+i*cw+cw/2,up=cl>=o,col=up?UP:DN;
    x.strokeStyle=col;x.fillStyle=col;x.lineWidth=1.4;
    x.beginPath();x.moveTo(cx,Y(h));x.lineTo(cx,Y(l));x.stroke();                 // wick
    const yo=Y(o),yc=Y(cl),top=Math.min(yo,yc),bh=Math.max(1.5,Math.abs(yc-yo));
    x.fillRect(cx-bodyW/2,top,bodyW,bh);                                          // body
  });
}
/* keep the active chart live: re-pull the current symbol+timeframe periodically */
loadKlines(sel);
setInterval(()=>loadKlines(sel,true),15000);
addEventListener('resize',()=>renderChart());
