import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { performance } from 'node:perf_hooks';
const source=fs.readFileSync('apps-script/Code_AllInOne.gs','utf8');
const headers=['id','date','type','amount','category_id','member_id','account_id','note','created_at','updated_at','deleted'];
export function fixture(transactions=[]) {
 const metrics={reads:[],writes:0,backups:0,failOn:null};
 class Range {
  constructor(sheet,r,c,n=1,m=1){Object.assign(this,{sheet,r,c,n,m});}
  getValues(){return Array.from({length:this.n},(_,i)=>Array.from({length:this.m},(_,j)=>this.sheet.rows[this.r+i-1]?.[this.c+j-1]??''));}
  setValues(values){metrics.writes++;if(metrics.failOn===this.sheet.name){metrics.failOn=null;throw Error('simulated write failure');}values.forEach((row,i)=>row.forEach((v,j)=>{this.sheet.rows[this.r+i-1]??=[];this.sheet.rows[this.r+i-1][this.c+j-1]=v;}));return this;}
  setValue(v){return this.setValues([[v]]);}
  setFontWeight(){return this;}setBackground(){return this;}setFontColor(){return this;}setNumberFormat(){return this;}
  getSheet(){return this.sheet;}getRow(){return this.r;}getLastRow(){return this.r+this.n-1;}
 }
 class Sheet {
  constructor(name,rows=[]){this.name=name;this.rows=rows;this.max=1000;}
  getName(){return this.name;}getLastRow(){return this.rows.length;}getLastColumn(){return this.rows[0]?.length||0;}
  getDataRange(){metrics.reads.push(this.name);return new Range(this,1,1,Math.max(1,this.getLastRow()),Math.max(1,this.getLastColumn()));}
  getRange(...args){return new Range(this,...args);}appendRow(row){this.getRange(this.rows.length+1,1,1,row.length).setValues([row]);}
  getMaxRows(){return this.max;}insertRowsAfter(_r,n){this.max+=n;}setFrozenRows(){}
 }
 const sheets=new Map();const add=(name,rows)=>{const s=new Sheet(name,rows);sheets.set(name,s);return s;};
 add('Transactions',[headers,...transactions.map(t=>headers.map(k=>t[k]??''))]);
 add('Categories',[['id','name','type','active'],['food','Ăn uống','expense',true],['salary','Lương','income',true]]);
 add('Budgets',[['id','year','month','category_id','amount'],['b1',2026,1,'food',1000000]]);
 add('Members',[['id','name'],['husband','Chồng'],['wife','Vợ']]);
 add('Settings',[['key','value'],['schema_version',1]]);
 const props=new Map(),triggers=[];
 const ss={getSheetByName:n=>sheets.get(n),getSheets:()=>[...sheets.values()],insertSheet:n=>add(n,[]),getId:()=> 'test-id',getName:()=> 'Test',copy:()=>{metrics.backups++;return {getUrl:()=> 'https://docs.google.com/spreadsheets/d/backup'};}};
 const p={getProperty:k=>props.get(k)||null,setProperty:(k,v)=>{props.set(k,String(v));return p;},deleteProperty:k=>props.delete(k)};
 let locked=false;
 const context=vm.createContext({console,Date,Map,Set,JSON,Math,Number,String,Object,Array,Error,
  PropertiesService:{getScriptProperties:()=>p},SpreadsheetApp:{getActiveSpreadsheet:()=>ss,flush(){}},
  LockService:{getScriptLock:()=>({waitLock(){assert.equal(locked,false);locked=true;},releaseLock(){locked=false;}})},
  Utilities:{getUuid:()=>crypto.randomUUID(),newBlob:t=>({getBytes:()=>Buffer.from(t)}),DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(_,t)=>crypto.createHash('sha256').update(t).digest(),base64Encode:b=>Buffer.from(b).toString('base64'),formatDate:d=>d.toISOString().slice(0,10)},
  Session:{getScriptTimeZone:()=> 'Asia/Bangkok'},Logger:{log(){}},DriveApp:{getFileById:()=>({makeCopy:()=>{metrics.backups++;return {getUrl:()=> 'https://drive.google.com/backup'};}})},
  ScriptApp:{getProjectTriggers:()=>triggers.map(n=>({getHandlerFunction:()=>n})),newTrigger:n=>{const t={forSpreadsheet:()=>t,onEdit:()=>t,onChange:()=>t,create:()=>triggers.push(n)};return t;}},
  ContentService:{MimeType:{JSON:'application/json'},createTextOutput:text=>({setMimeType:()=>text})}
 });
 vm.runInContext(source,context);
 return {context,metrics,sheets,props,api:(action,payload={})=>JSON.parse(JSON.stringify(context.dispatchStorageApi(action,payload)))};
}
const tx=(id,date,amount=1000,type='expense')=>({id,date,amount,type,category_id:type==='expense'?'food':'salary',member_id:'wife',created_at:date+'T02:13:00Z',updated_at:date+'T02:13:00Z',deleted:false});
const f=fixture([tx('a','2026-09-12',260000),tx('b','2026-12-31',100000),tx('c','2027-01-01',1000000,'income'),{...tx('deleted','2026-09-01'),deleted:true}]);
assert.equal(f.api('getReportBundle',{year:2026,month:9}).summary.total_expense,260000);
f.context.migrateToYearlyStorage();
assert.equal(f.metrics.backups,1);assert.equal(f.props.get('storage_version'),'2');
f.context.migrateToYearlyStorage();assert.equal(f.metrics.backups,1);
assert.equal(f.sheets.get('Transactions').rows.length,5);
f.metrics.reads=[];
const report=f.api('getReportBundle',{year:2027,month:1});
assert.equal(report.previous.total_expense,100000);assert.equal(report.summary.total_income,1000000);
assert.equal(report.trend.length,12);assert.equal(report.years.length,2);
assert.equal(f.metrics.reads.filter(n=>n.startsWith('Transactions')).length,0,'Warm reports never scan detail');
f.metrics.reads=[];
assert.equal(f.api('getTransactionsPage',{from:'2026-09-01',through:'2026-09-30'}).items.length,1);
assert.deepEqual(f.metrics.reads.filter(n=>n.startsWith('Transactions')),['Transactions_2026']);
// Cross-year move, then soft deletion: both months and years must be accurate.
f.api('updateTransaction',{id:'a',original_year:2026,date:'2027-02-03',amount:300000});
assert.equal(f.api('getReportBundle',{year:2026,month:9}).summary.total_expense,0);
assert.equal(f.api('getReportBundle',{year:2027,month:2}).summary.total_expense,300000);
f.api('deleteTransaction',{id:'a',original_year:2027});
assert.equal(f.api('getReportBundle',{year:2027,month:2}).summary.total_expense,0);
// Write failure after destination append: durable intent repairs the duplicate on next read.
f.metrics.failOn='Transactions_2026';
assert.throws(()=>f.api('updateTransaction',{id:'b',original_year:2026,date:'2027-03-01'}),/simulated/);
assert.ok(f.props.get('pending_transaction'));
assert.equal(f.api('getReportBundle',{year:2027,month:3}).summary.total_expense,100000);
assert.equal(f.api('getReportBundle',{year:2026,month:12}).summary.total_expense,0);
assert.equal(f.props.has('pending_transaction'),false);
const zero=f.api('getReportBundle',{year:2033,month:9});assert.equal(zero.trend.length,12);assert.ok(zero.trend.every(t=>t.expense===0));
// Direct sheet edit is detected and summaries recomputed; timestamp survives migration.
const sh=f.sheets.get('Transactions_2027');const idx=sh.rows.findIndex(r=>r[0]==='c');sh.rows[idx][3]=2000000;
f.context.summarySheetEdited({range:sh.getRange(idx+1,4)});
assert.equal(f.api('getReportBundle',{year:2027,month:1}).summary.total_income,2000000);
assert.equal(f.api('getTransactionsPage',{from:'2027-01-01',through:'2027-01-31'}).items[0].created_at,'2027-01-01T02:13:00Z');
const duplicate=fixture([tx('dup','2026-01-01'),tx('dup','2026-01-02')]);assert.throws(()=>duplicate.context.migrateToYearlyStorage(),/Trùng/);assert.equal(duplicate.metrics.backups,0);
// Migration interrupted during batch copy: retry resumes without duplicating.
const retry=fixture([tx('a','2026-01-01'),tx('b','2027-01-01')]);retry.metrics.failOn='Transactions_2027';assert.throws(()=>retry.context.migrateToYearlyStorage());assert.notEqual(retry.props.get('storage_version'),'2');retry.context.migrateToYearlyStorage();assert.equal(retry.metrics.backups,1);assert.equal(retry.api('getTransactionsPage').items.length,2);
// Representative multi-year dataset: 30k records, first history page reads newest year only.
const many=Array.from({length:30000},(_,i)=>tx('t'+i,`${2026+i%7}-${String(1+i%12).padStart(2,'0')}-${String(1+i%28).padStart(2,'0')}`,1000+i));
const big=fixture(many);const start=performance.now();big.context.migrateToYearlyStorage();big.metrics.reads=[];
const page=big.api('getTransactionsPage',{limit:100});assert.equal(page.items.length,100);assert.ok(page.next_cursor);
assert.equal(big.metrics.reads.filter(n=>n.startsWith('Transactions')).length,1);
const next=big.api('getTransactionsPage',{limit:100,cursor:page.next_cursor});assert.equal(new Set(page.items.concat(next.items).map(t=>t.id)).size,200);
big.metrics.reads=[];big.api('getReportBundle',{year:2032,month:9});assert.equal(big.metrics.reads.filter(n=>n.startsWith('Transactions')).length,0);
big.api('createTransaction',tx('unused','2032-09-12'));assert.throws(()=>big.api('getTransactionsPage',{cursor:page.next_cursor}),/STALE_PAGE/);
console.log(`Storage regression suite passed; 30,000-record in-memory migration + reads: ${(performance.now()-start).toFixed(0)}ms (not Google server timing).`);

const exported=f.api('exportData');assert.equal(exported.transactions.length,new Set(exported.transactions.map(t=>t.id)).size);
assert.equal(exported.settings.schema_version,1);
// Cross-year direct edit is rehomed by the simple bound-sheet trigger.
const movedSheet=f.sheets.get('Transactions_2027');const moveIndex=movedSheet.rows.findIndex(r=>r[0]==='c');movedSheet.rows[moveIndex][1]='2028-04-01';
f.context.onEdit({range:movedSheet.getRange(moveIndex+1,2)});
assert.equal(f.api('getReportBundle',{year:2027,month:1}).summary.total_income,0);
assert.equal(f.api('getReportBundle',{year:2028,month:4}).summary.total_income,2000000);
// Structural row deletion is detected by row count without installing extra triggers.
const detail2028=f.sheets.get('Transactions_2028');detail2028.rows.splice(1,1);
assert.equal(f.api('getReportBundle',{year:2028,month:4}).summary.total_income,0);
console.log('Export deduplication and direct-sheet-edit checks passed.');
