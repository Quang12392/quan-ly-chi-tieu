import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fixture } from './storage.mjs';
const output=await build({entryPoints:['src/api/client.ts'],bundle:true,write:false,format:'esm',platform:'node',define:{'import.meta.env':'{}'}});
const store=new Map([['fam_exp_api_url','https://mock.invalid'],['family_auth_session','husband']]);
global.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
const {api}=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'));
const tx={id:'initial',date:'2026-09-12',amount:2000000,type:'expense',category_id:'food',member_id:'husband',created_at:'2026-09-12T02:00:00Z',updated_at:'2026-09-12T02:00:00Z',deleted:false};
const backend=fixture([tx]);backend.context.migrateToYearlyStorage();
const calls=[];
const fetchNormal=async(_url,opts)=>{const {action,payload}=JSON.parse(opts.body);calls.push({action,payload});return {ok:true,json:async()=>({ok:true,data:backend.api(action,payload)})};};
global.fetch=fetchNormal;
const duplicateStart=calls.length;
await Promise.all([api.getDashboardSnapshot(2026,8),api.getDashboardSnapshot(2026,8)]);
assert.equal(calls.length-duplicateStart,1,'Identical concurrent reads share one network request');
calls.length=0;
assert.equal(api.getCachedDashboard(2026,9),null);
await api.getDashboardSnapshot(2026,9);
assert.deepEqual(calls.map(c=>c.action),['getDashboardSummary'],'Cold startup is exactly one request');
assert.equal(api.getCachedDashboard(2026,9).summary.total_expense,2000000);
store.delete('fam_exp_category_preview_v1');
assert.equal(api.getCachedCategories(),null);
api.getCachedDashboard(2026,9);
assert.equal(api.getCachedCategories()?.find(category=>category.id==='food')?.name,'Ăn uống','Existing dashboard previews hydrate the add form without waiting for Sheets');
assert.equal(api.getCachedDashboard(2026,10),null);
store.set('family_auth_session','wife');assert.equal(api.getCachedDashboard(2026,9),null);store.set('family_auth_session','husband');
store.set('fam_exp_api_url','https://other.invalid');assert.equal(api.getCachedDashboard(2026,9),null);store.set('fam_exp_api_url','https://mock.invalid');
// Wife writes on another device while husband's displayed cache remains old.
backend.api('createTransaction',{...tx,amount:300000,member_id:'wife'});
assert.equal(api.getCachedDashboard(2026,9).summary.total_expense,2000000);
await api.createTransaction({...tx,amount:200000});
assert.equal(api.getCachedDashboard(2026,9),null,'Local write invalidates cached totals');
const fresh=await api.getDashboardSnapshot(2026,9);assert.equal(fresh.summary.total_expense,2500000);
assert.equal(calls.filter(c=>c.action==='createTransaction').length,1);
// Offline refresh retains the older snapshot for a clearly labelled preview.
global.fetch=async()=>{throw Error('Offline');};await assert.rejects(()=>api.getDashboardSnapshot(2026,9),/Offline/);
assert.equal(api.getCachedDashboard(2026,9).summary.total_expense,2500000);
// A slow request must never restore a cache invalidated by a newer write.
let release;global.fetch=async()=>({ok:true,json:()=>new Promise(resolve=>{release=resolve;})});
const pending=api.getDashboardSnapshot(2026,9);await new Promise(resolve=>setImmediate(resolve));
global.fetch=fetchNormal;await api.createTransaction({...tx,amount:50000});
release({ok:true,data:{...fresh.summary,categories:fresh.categories}});
await assert.rejects(()=>pending,/vừa thay đổi/);assert.equal(api.getCachedDashboard(2026,9),null);
// Invalid/corrupt data never crashes or becomes the cached financial report.
store.set('fam_exp_dashboard_preview_v1','{invalid');assert.equal(api.getCachedDashboard(2026,9),null);
global.fetch=async()=>({ok:true,json:async()=>({ok:true,data:{categories:[],year:2026,month:9}})});
await assert.rejects(()=>api.getDashboardSnapshot(2026,9),/không hợp lệ/);
// Read timeout is bounded, and performs no retry or write.
const originalTimeout=global.setTimeout;global.setTimeout=(fn,ms,...args)=>originalTimeout(fn,ms===60000?1:ms,...args);
let timeouts=0;global.fetch=async(_url,opts)=>{timeouts++;return new Promise((_resolve,reject)=>opts.signal.addEventListener('abort',()=>reject(Error('aborted'))));};
await assert.rejects(()=>api.getDashboardSnapshot(2026,9),/chưa phản hồi sau 60 giây/);assert.equal(timeouts,1);global.setTimeout=originalTimeout;
// A full browser storage cannot turn a valid server read into a failure.
global.fetch=fetchNormal;localStorage.setItem=()=>{throw Error('quota');};assert.equal((await api.getDashboardSnapshot(2026,9)).summary.total_expense,2550000);
console.log('Fast startup tests passed: single request, cache isolation, concurrent family writes, invalidation races, timeout, quota and offline.');
