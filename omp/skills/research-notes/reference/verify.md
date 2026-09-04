# Verifying a research notebook

Run all four. Report the numbers, not "it works". Each of these caught a real bug the first time
this page was built.

Open the file once and reuse the tab:

```json
{"action":"open","name":"nb","url":"file:///ABSOLUTE/PATH.html","viewport":{"width":1280,"height":900}}
```

## 1. Reference integrity

The single most valuable check. It proves the citation apparatus is real rather than decorative.

```js
const errs=[]; page.on('pageerror',e=>errs.push(String(e)));
await tab.goto('file:///ABSOLUTE/PATH.html');
const r = await tab.evaluate(() => {
  const sups=[...document.querySelectorAll('sup.ref a')];
  const items=[...document.querySelectorAll('#refs li')];
  const broken = sups.filter(a=>!document.querySelector(a.getAttribute('href')));
  const uncited = items.filter(li=>!document.querySelector('sup.ref a[href="#'+li.id+'"]'));
  const nums = sups.map(a=>+a.textContent);
  let seq=true, seen=new Set(), expect=1;
  for (const n of nums) { if(!seen.has(n)){ if(n!==expect) seq=false; seen.add(n); expect++; } }
  return { markers: sups.length, footnotes: items.length, broken: broken.length,
           uncited: uncited.map(l=>l.id), sequential: seq,
           leftovers: document.querySelectorAll('[data-fn]').length };
});
display({ r, pageErrors: errs });
```

Required: `broken: 0`, `uncited: []`, `sequential: true`, `leftovers: 0`, `pageErrors: []`.

`leftovers` catches a `data-fn` key that has no entry in `NOTES`, which otherwise fails silently by
deleting the marker.

## 2. Contrast, rasterised

**Do not parse colour strings.** `getComputedStyle` returns `oklch(...)` and naive regex parsing
reads the components as RGB and reports a meaningless ratio of `1.0` for everything. Paint the
colour to a canvas and read the pixel back.

```js
const audit = await tab.evaluate(() => {
  const cv=document.createElement('canvas'); cv.width=cv.height=1;
  const ctx=cv.getContext('2d',{willReadFrequently:true});
  const toRGB=(c,u)=>{ctx.clearRect(0,0,1,1); if(u){ctx.fillStyle=u;ctx.fillRect(0,0,1,1);}
    ctx.fillStyle=c; ctx.fillRect(0,0,1,1);
    const d=ctx.getImageData(0,0,1,1).data; return [d[0],d[1],d[2]];};
  const lum=([r,g,b])=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};
    return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b);};
  const cr=(a,b)=>{const A=lum(a),B=lum(b);return (Math.max(A,B)+0.05)/(Math.min(A,B)+0.05);};
  const probe=(sel,label)=>{const el=document.querySelector(sel); if(!el) return null;
    const cs=getComputedStyle(el);
    let n=el,bg='rgba(0, 0, 0, 0)';
    while(n&&(bg==='rgba(0, 0, 0, 0)'||bg==='transparent')){bg=getComputedStyle(n).backgroundColor;n=n.parentElement;}
    const px=parseFloat(cs.fontSize), w=parseInt(cs.fontWeight)||400;
    const large = px>=18 || (px>=14 && w>=700);
    const ratio = cr(toRGB(cs.color,bg), toRGB(bg,'#fff'));
    return {label, px:+px.toFixed(1), ratio:+ratio.toFixed(2), need:large?3:4.5,
            pass: ratio >= (large?3:4.5)};};
  return [
    ['body p','body'], ['.note','note'], ['.standfirst','standfirst'],
    ['.wlabel','widget label'], ['.wfoot .cap','caption'], ['.count','counter'],
    ['sup.ref a[data-kind="doc"]','marker green'],
    ['sup.ref a[data-kind="inference"]','marker blue'],
    ['sup.ref a[data-kind="assumption"]','marker amber'],
    ['.integrity .legend','integrity legend'],
    ['ol.refs .kind','reference kind'], ['ol.refs .where','reference source'],
    ['.sl .hint','slider hint'], ['footer','footer']
  ].map(([s,l])=>probe(s,l)).filter(Boolean);
});
display({ fails: audit.filter(a=>!a.pass), min: Math.min(...audit.map(a=>a.ratio)), n: audit.length });
```

Required: `fails: []`. Expect `min` around 4.7 on the documented palette. Anything reporting exactly
`1` means the parser broke, not that contrast is perfect.

## 3. No horizontal overflow at 390px

```js
await page.setViewport({width:390,height:844,deviceScaleFactor:2});
await tab.goto('file:///ABSOLUTE/PATH.html');
const mob = await tab.evaluate(()=>{const de=document.documentElement;
  return {scrollW:de.scrollWidth, clientW:de.clientWidth,
    offenders:[...document.querySelectorAll('*')]
      .filter(el=>el.getBoundingClientRect().right>de.clientWidth+1)
      .map(el=>el.tagName+'.'+(el.className||'').toString().slice(0,30)).slice(0,8)};});
display(mob);
```

Required: `scrollW === clientW`. Wide tables are the usual offender; wrap them in an
`overflow-x: auto` container rather than shrinking type. Elements overflowing *inside* that
container are fine, the page is what must not scroll sideways.

## 4. State survives reload, and leave it clean

```js
await tab.evaluate(()=>{ document.querySelector('#tasks input[type=checkbox]').click();
  const s=document.getElementById('cps'); s.value=12;
  s.dispatchEvent(new Event('input',{bubbles:true}));
  s.dispatchEvent(new Event('change',{bubbles:true}));
  const n=document.getElementById('notes'); n.value='probe';
  n.dispatchEvent(new Event('input',{bubbles:true})); });
await new Promise(r=>setTimeout(r,700));
await tab.goto('file:///ABSOLUTE/PATH.html');
const kept = await tab.evaluate(()=>({done:document.querySelector('#tasks .task').classList.contains('done'),
  cps:document.getElementById('cps').value, notes:document.getElementById('notes').value}));
await tab.evaluate(()=>localStorage.removeItem('research-notes-v1'));
display(kept);
```

Required: all three preserved, **then cleared** so the user opens a fresh page.

## 5. Motion is real, and reduced motion is honoured

Three failures here are invisible to the eye: a transition bound to elements that get replaced
every render, a JS reveal that ignores the reduced-motion preference, and a reveal that never
lands because `requestAnimationFrame` is starved. **Headless Chromium fires zero rAF callbacks**,
so a reveal without a timeout fallback renders permanently empty and the check below catches it.

```js
// (a) the bar must reach its final widths, with or without rAF
await tab.goto('file:///ABSOLUTE/PATH.html');
await new Promise(r=>setTimeout(r,600));
const widths = await tab.evaluate(()=>[...document.querySelectorAll('#i-bar i')]
  // Compare numerically: the browser rounds style.width read-back (28.57142857% -> 28.5714%).
  .map(i=>({ ok: Math.abs(parseFloat(i.style.width) - parseFloat(i.dataset.w)) < 0.01,
             set: i.style.width, want: i.dataset.w+'%' })));

// (b) SVG nodes must survive a step, or no transition can fire
const before = await tab.evaluate(()=>{const r=document.querySelector('#pipe-svg rect.box');
  if(!r) return false; r.dataset.probe='1'; return true;});
await tab.evaluate(()=>document.getElementById('pipe-next').click());
const survived = await tab.evaluate(()=>!!document.querySelector('#pipe-svg rect.box[data-probe="1"]'));

// (c) nothing animates a layout property except the sanctioned bar
const layoutAnim = await tab.evaluate(()=>[...document.styleSheets]
  .flatMap(s=>{try{return [...s.cssRules]}catch(e){return []}})
  .filter(r=>r.style && r.style.transitionProperty)
  .map(r=>r.selectorText+' :: '+r.style.transitionProperty)
  .filter(s=>/\b(width|height|top|left|margin|padding)\b/.test(s) && !/#i-bar|\.integrity/.test(s)));

// (d) a reference jump marks where it landed
await tab.evaluate(()=>document.querySelector('sup.ref a').click());
const flashed = await tab.evaluate(()=>!!document.querySelector('.flash'));

display({ widths, svgNodesSurvivedStep: before && survived, layoutAnim, flashed });
```

Required: every `widths` entry has `ok: true`, `svgNodesSurvivedStep: true`, `layoutAnim: []`,
`flashed: true`. The integrity bar is the one sanctioned `width` transition, since it has no
siblings to reflow.


Then confirm the reduced-motion branch paints immediately rather than flickering:

```js
await page.emulateMediaFeatures([{name:'prefers-reduced-motion', value:'reduce'}]);
await tab.goto('file:///ABSOLUTE/PATH.html');
const instant = await tab.evaluate(()=>[...document.querySelectorAll('#i-bar i')].map(i=>i.style.width));
await page.emulateMediaFeatures([]);
display({ instant });
```

Required: widths are already their final percentages on the first frame, not `""` or `0%`.

## Also worth doing

- Step the stepper to its most interesting frame and screenshot `#pipe-svg` alone. If the diagram
  does not make the argument without its caption, the diagram is decoration.
- Toggle the highlight button and confirm the count of highlighted markers equals
  `inference + assumption` citations, not distinct references.
- Drive any slider to the value that inverts the conclusion and confirm the verdict actually flips
  and turns red. A model that only ever shows a win is not a model.
