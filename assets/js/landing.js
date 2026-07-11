/* Landing page interactions: ticker tape, live prices via CoinGecko, sparklines, reveal-on-scroll */
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const COINGECKO='https://api.coingecko.com/api/v3';
const REFRESH_MS=45000;

// header shadow
const hdr=document.getElementById('hdr');
addEventListener('scroll',()=>hdr.classList.toggle('scrolled',scrollY>8),{passive:true});

// reveal on scroll
const io=new IntersectionObserver(es=>es.forEach(e=>{
  if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}
}),{threshold:.15});
document.querySelectorAll('.rv:not(.in)').forEach(el=>io.observe(el));

// animate meters when visible
const mio=new IntersectionObserver(es=>es.forEach(e=>{
  if(e.isIntersecting){
    e.target.querySelectorAll('.meter i').forEach(i=>i.style.width=i.dataset.w);
    mio.unobserve(e.target);
  }
}),{threshold:.3});
document.querySelectorAll('.panel').forEach(p=>mio.observe(p));

// counters
function animCount(el){
  const to=parseFloat(el.dataset.to),dec=+(el.dataset.dec||0),t0=performance.now(),dur=1400;
  function tick(t){
    const k=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-k,3);
    el.textContent=(to*e).toFixed(dec);
    if(k<1)requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
document.querySelectorAll('.count').forEach(el=>{
  if(reduced){el.textContent=el.dataset.to;return;}
  animCount(el);
});

/* ---------- live token data (real CoinGecko prices) ---------- */
function logo(t,cls='sm'){
  if(t.img)return `<span class="ava ${cls}"><img src="${t.img}" alt="${t.s}" loading="lazy" onerror="this.outerHTML='&lt;span class=fb&gt;${t.s[0]}&lt;/span&gt;'"></span>`;
  return `<span class="ava ${cls}"><img src="https://www.google.com/s2/favicons?domain=${t.d}&sz=64" alt="${t.s}" loading="lazy" onerror="this.outerHTML='&lt;span class=fb&gt;${t.s[0]}&lt;/span&gt;'"></span>`;
}
const big=n=>!n?'—':n>=1e12?'$'+(n/1e12).toFixed(2)+'T':n>=1e9?'$'+(n/1e9).toFixed(2)+'B':n>=1e6?'$'+(n/1e6).toFixed(1)+'M':'$'+Math.round(n).toLocaleString('en-US');
const fmt=n=>n==null?'—':'$'+(n>=1?n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}):n.toFixed(4));
const pct=c=>c==null?'—':(c>=0?'+':'')+c.toFixed(2)+'%';

/* Price/change start empty on purpose: nothing is rendered until it has been read
   live from CoinGecko. A placeholder is shown instead of a plausible-looking
   number, so the page can never display a figure that isn't real. */
const TOKS=[
 {s:'BTC',n:'Bitcoin',d:'bitcoin.org',cg:'bitcoin',px:null,chg:null,vol:0,mcap:0,img:null,spark:null,inTable:true},
 {s:'ETH',n:'Ethereum',d:'ethereum.org',cg:'ethereum',px:null,chg:null,vol:0,mcap:0,img:null,spark:null,inTable:true},
 {s:'SOL',n:'Solana',d:'solana.com',cg:'solana',px:null,chg:null,vol:0,mcap:0,img:null,spark:null,inTable:true},
 {s:'XRP',n:'XRP',d:'ripple.com',cg:'ripple',px:null,chg:null,vol:0,mcap:0,img:null,spark:null,inTable:true},
 {s:'DOGE',n:'Dogecoin',d:'dogecoin.com',cg:'dogecoin',px:null,chg:null,vol:0,mcap:0,img:null,spark:null},
 {s:'ADA',n:'Cardano',d:'cardano.org',cg:'cardano',px:null,chg:null,vol:0,mcap:0,img:null,spark:null},
 {s:'AVAX',n:'Avalanche',d:'avax.network',cg:'avalanche-2',px:null,chg:null,vol:0,mcap:0,img:null,spark:null},
 {s:'LINK',n:'Chainlink',d:'chain.link',cg:'chainlink',px:null,chg:null,vol:0,mcap:0,img:null,spark:null,inTable:true},
 {s:'LTC',n:'Litecoin',d:'litecoin.org',cg:'litecoin',px:null,chg:null,vol:0,mcap:0,img:null,spark:null},
 {s:'UNI',n:'Uniswap',d:'uniswap.org',cg:'uniswap',px:null,chg:null,vol:0,mcap:0,img:null,spark:null,inTable:true},
 {s:'USDG',n:'Global Dollar',d:'paxos.com',cg:'global-dollar',px:null,chg:null,vol:0,mcap:0,img:null,spark:null},
 {s:'ARB',n:'Arbitrum',d:'arbitrum.io',cg:'arbitrum',px:null,chg:null,vol:0,mcap:0,img:null,spark:null},
];
const tape=document.getElementById('tape');
const tokTable=document.getElementById('tokTable');
const srcTag=document.querySelector('#vaults .panel .mono');
const pxEl=document.getElementById('livePx'),chgEl=document.getElementById('liveChg');
const heroTag=document.getElementById('heroTag');

function renderTape(){
  const html=TOKS.map(t=>{
    const arrow=t.chg==null?'':(t.chg>=0?'▲ ':'▼ ');
    const cls=t.chg==null?'':(t.chg>=0?'up':'dn');
    const move=t.chg==null?'—':arrow+Math.abs(t.chg).toFixed(2)+'%';
    return `<span class="tk">${logo(t)}<span class="sym">${t.s}</span><span>${fmt(t.px)}</span><span class="${cls}">${move}</span></span>`;
  }).join('');
  tape.innerHTML=html+html;
}
function drawSpark(cv,spark,up){
  const x=cv.getContext('2d');x.clearRect(0,0,86,26);
  if(!spark||spark.length<2){x.strokeStyle='rgba(19,21,32,.13)';x.beginPath();x.moveTo(0,13);x.lineTo(86,13);x.stroke();return;}
  const step=Math.max(1,Math.floor(spark.length/28));
  const pts=spark.filter((_,i)=>i%step===0);
  const min=Math.min(...pts),max=Math.max(...pts);
  x.strokeStyle=up?'#6E8A00':'#E5484D';x.lineWidth=1.7;x.lineJoin='round';x.beginPath();
  pts.forEach((v,i)=>{
    const px=i*(86/(pts.length-1)),py=23-((v-min)/(max-min||1))*20;
    i?x.lineTo(px,py):x.moveTo(px,py);
  });
  x.stroke();
}
function renderTable(){
  const rows=TOKS.filter(t=>t.inTable);
  tokTable.querySelector('tbody').innerHTML='';
  rows.forEach(t=>{
    const tr=document.createElement('tr');tr.className='row';
    tr.innerHTML=`<td><span class="asset">${logo(t,'')}<span><span class="sym">${t.s}</span><span class="nm">${t.n}</span></span></span></td>
    <td class="num">${fmt(t.px)}</td>
    <td><span class="pill ${t.chg==null?'':(t.chg>=0?'up':'dn')}">${pct(t.chg)}</span></td>
    <td class="num">${big(t.vol)}</td>
    <td class="num">${big(t.mcap)}</td>
    <td><canvas class="spark" width="86" height="26"></canvas></td>`;
    tokTable.querySelector('tbody').appendChild(tr);
    drawSpark(tr.querySelector('canvas'),t.spark,t.chg>=0);
  });
}
/* Declared before the first render below: drawHeroChart() reads it, and a `let`
   accessed ahead of its declaration would throw and halt the whole script. */
let heroKlines=null;
function renderHero(){
  const btc=TOKS.find(t=>t.s==='BTC');
  pxEl.textContent=fmt(btc.px);
  chgEl.textContent=btc.chg==null?'—':(btc.chg>=0?'▲ +':'▼ ')+Math.abs(btc.chg).toFixed(2)+'%';
  chgEl.style.color=btc.chg==null?'':(btc.chg>=0?'#6E8A00':'#E5484D');
  const foot=document.querySelectorAll('.term-foot b');
  if(foot[0])foot[0].textContent=big(btc.vol);
  if(foot[1])foot[1].textContent=big(btc.mcap);
  drawHeroChart();
}
renderTape();renderTable();renderHero();

let liveOK=false;
async function fetchLive(){
  try{
    const ids=TOKS.map(t=>t.cg).join(',');
    const r=await fetch(`${COINGECKO}/coins/markets?vs_currency=usd&ids=${ids}&sparkline=true&price_change_percentage=24h`);
    if(!r.ok)throw new Error('CoinGecko HTTP '+r.status);
    const j=await r.json();
    j.forEach(d=>{
      const t=TOKS.find(x=>x.cg===d.id);if(!t)return;
      t.px=d.current_price;t.chg=d.price_change_percentage_24h??t.chg;
      t.vol=d.total_volume||t.vol;t.mcap=d.market_cap||t.mcap;
      t.img=d.image||t.img;
      if(d.sparkline_in_7d&&d.sparkline_in_7d.price&&d.sparkline_in_7d.price.length>24){
        t.spark=d.sparkline_in_7d.price.slice(-24);
      }
    });
    liveOK=true;
    if(srcTag)srcTag.innerHTML='<i class="live-tag">LIVE · COINGECKO</i>';
    if(heroTag)heroTag.textContent='LIVE';
  }catch(e){
    // Surface the reason rather than silently leaving placeholders on screen.
    console.error('[landing] live price fetch failed:',e);
    if(!liveOK){
      if(srcTag)srcTag.innerHTML='<i class="sim-tag">COINGECKO UNREACHABLE</i>';
      if(heroTag)heroTag.textContent='UNAVAILABLE';
    }
  }
  // Render outside the fetch guard so a rendering bug can never be mistaken for
  // (or hidden by) a data outage.
  renderTape();renderTable();renderHero();
}
fetchLive();setInterval(fetchLive,REFRESH_MS);

/* ---------- hero card: real BTC candlesticks ----------
   Primary source is Binance market data (dense, true OHLC — same feed as the
   terminal). If it can't be reached, fall back to candles synthesized from the
   live CoinGecko sparkline so the card is never empty. */
const HERO_KLINE='https://data-api.binance.vision/api/v3/klines?symbol=BTCUSDT&interval=30m&limit=56';
async function loadHeroKlines(){
  try{
    const r=await fetch(HERO_KLINE);if(!r.ok)throw 0;
    const j=await r.json();
    if(Array.isArray(j)&&j.length>4){
      heroKlines=j.map(k=>[+k[1],+k[2],+k[3],+k[4]]); // [open,high,low,close]
      drawHeroChart();
    }
  }catch(e){/* keep sparkline fallback */}
}
function heroCandles(){
  const btc=TOKS.find(t=>t.s==='BTC');
  const spark=btc&&btc.spark;if(!spark||spark.length<4)return null;
  const src=spark.slice(-24),per=Math.max(1,Math.round(src.length/14)),out=[];
  for(let i=0;i<src.length;i+=per){const c=src.slice(i,i+per);if(!c.length)continue;out.push([c[0],Math.max(...c),Math.min(...c),c[c.length-1]]);}
  return out.length>1?out:null;
}
function drawHeroChart(){
  const cv=document.getElementById('heroChart');if(!cv)return;
  const dpr=Math.min(2,devicePixelRatio||1);
  const W=cv.clientWidth||500,H=190;
  cv.width=W*dpr;cv.height=H*dpr;
  const x=cv.getContext('2d');x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,W,H);
  const cs=getComputedStyle(document.documentElement);
  const UP=cs.getPropertyValue('--deep').trim()||'#7A9900',DN=cs.getPropertyValue('--loss').trim()||'#E5484D';
  const pad=8,padTop=12,padBot=12,plotH=H-padTop-padBot;
  x.strokeStyle='rgba(19,21,32,.07)';x.lineWidth=1;
  for(let i=0;i<=3;i++){const gy=padTop+plotH*i/3;x.beginPath();x.moveTo(pad,gy);x.lineTo(W-pad,gy);x.stroke();}
  const oh=heroKlines||heroCandles();if(!oh){return;}
  const highs=oh.map(c=>c[1]),lows=oh.map(c=>c[2]);
  let min=Math.min(...lows),max=Math.max(...highs);const pv=(max-min)*0.08||1;min-=pv;max+=pv;
  const Y=v=>padTop+plotH*(1-(v-min)/(max-min||1));
  const n=oh.length,cw=(W-pad*2)/n,bw=Math.max(2.5,Math.min(9,cw*0.6));
  oh.forEach((c,i)=>{
    const o=c[0],h=c[1],l=c[2],cl=c[3],cx=pad+i*cw+cw/2,up=cl>=o,col=up?UP:DN;
    x.strokeStyle=col;x.fillStyle=col;x.lineWidth=1.4;
    x.beginPath();x.moveTo(cx,Y(h));x.lineTo(cx,Y(l));x.stroke();
    const yo=Y(o),yc=Y(cl),top=Math.min(yo,yc),bh=Math.max(1.5,Math.abs(yc-yo));
    x.fillRect(cx-bw/2,top,bw,bh);
  });
}
addEventListener('resize',drawHeroChart);
loadHeroKlines();setInterval(loadHeroKlines,30000);
