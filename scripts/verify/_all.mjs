import { chromium } from "playwright";
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire(import.meta.url);
const axeSource = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const src = fs.readFileSync("src/lib/page-photos.ts","utf8");
const keys=[...src.matchAll(/^\s+"([^"]*)":/gm)].map(m=>m[1]);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
let bad=0, n=0;
for (const u of keys) for (const [w,h] of [[1440,900],[390,844]]) {
  const p = await b.newPage({ viewport:{width:w,height:h} });
  const r = await p.goto("http://localhost:3101"+u,{waitUntil:"networkidle"});
  if (r.status()!==200){ console.log("STATUS",u,r.status()); await p.close(); continue; }
  await p.waitForTimeout(1500);
  const hasBackdrop = await p.evaluate(()=>!!document.querySelector("section img.-z-20"));
  await p.addScriptTag({content: axeSource});
  const ax = await p.evaluate(()=>window.axe.run(document,{runOnly:["wcag2a","wcag2aa","best-practice"]}));
  const ov = await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  const broken = await p.evaluate(()=>[...document.images].filter(i=>i.complete&&i.naturalWidth===0).length);
  n++;
  if(!hasBackdrop||ax.violations.length||ov||broken){bad++;console.log("PROBLEM",u,w,{hasBackdrop,ax:ax.violations.map(v=>v.id),ov,broken});}
  if (w===1440 && ["/about","/products","/hardware","/contact","/brands","/adobe-licensing","/microsoft-365/business-standard","/industries"].includes(u)) await p.screenshot({path:`/tmp/claude-0/shots/o-${u.replace(/\//g,"_")}.png`});
  await p.close();
}
console.log("checked",n,"problems",bad);
await b.close();
