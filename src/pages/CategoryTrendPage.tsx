import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { api } from '../api/client';
import { Category } from '../types';
import { CategoryTrend } from '../utils/categoryTrend';
import { PageSnapshot, DASHBOARD_REVISION_KEY, isPreviewFresh } from '../utils/dashboardCache';
import { formatCurrency } from '../utils/formatters';

export const CategoryTrendPage: React.FC = () => {
  const { categoryId = '' } = useParams();
  const [params,setParams] = useSearchParams();
  const requestedYear = Number(params.get('year'));
  const year = Number.isInteger(requestedYear) && requestedYear >= 1900 && requestedYear <= 9999 ? requestedYear : new Date().getFullYear();
  const requestedMonth = Number(params.get('month'));
  const initialMonth = requestedMonth >= 1 && requestedMonth <= 12 ? requestedMonth : new Date().getMonth()+1;
  const [selectedMonth,setSelectedMonth] = useState(initialMonth);
  const [snapshot,setSnapshot] = useState<PageSnapshot<CategoryTrend> | null>(()=>api.getCachedCategoryTrend(categoryId,year));
  const [categories,setCategories] = useState<Category[]>(()=>api.getCachedCategories() || []);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const request = useRef(0), refreshing = useRef(false);
  const data = snapshot?.data.categoryId === categoryId && snapshot.data.year === year ? snapshot.data : null;
  const name = categories.find(c=>c.id === categoryId)?.name || categoryId;
  const load = async () => {
    const version = ++request.current;
    refreshing.current = true;
    setLoading(true); setError('');
    try {
      const [fresh,cats] = await Promise.all([api.getCategoryTrend(categoryId,year),api.getCategories()]);
      if (version !== request.current) return;
      setSnapshot(fresh); setCategories(cats);
    } catch (e) {
      if(version===request.current) setError(e instanceof Error ? e.message : 'Không thể tải biểu đồ.');
    } finally { if(version===request.current) {setLoading(false);refreshing.current=false;} }
  };
  useEffect(()=>{
    const cached=api.getCachedCategoryTrend(categoryId,year);
    setSnapshot(cached);
    setError('');
    if(isPreviewFresh(cached?.savedAt)) {setLoading(false);refreshing.current=false;} else void load();
    const resume=()=>{const latest=api.getCachedCategoryTrend(categoryId,year);if(document.visibilityState==='visible'&&!refreshing.current&&!isPreviewFresh(latest?.savedAt))void load();};
    const changed=(event:StorageEvent)=>{if(event.key===DASHBOARD_REVISION_KEY){setSnapshot(null);void load();}};
    window.addEventListener('online',resume);document.addEventListener('visibilitychange',resume);window.addEventListener('storage',changed);
    return ()=>{request.current++;window.removeEventListener('online',resume);document.removeEventListener('visibilitychange',resume);window.removeEventListener('storage',changed);};
  },[categoryId,year]);
  const maximum = Math.max(1,...(data?.months || []));
  const x = (i:number)=>15+i*30;
  const y = (amount:number)=>164-amount/maximum*136;
  return <div className="space-y-4">
    <Link to={`/reports?year=${year}&month=${initialMonth}`} className="inline-flex items-center gap-1 text-xs text-emerald-700 font-semibold"><ArrowLeft className="w-4 h-4" />Quay lại Báo cáo</Link>
    <section className="bg-white rounded-3xl p-4 border border-slate-200/80 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-bold text-slate-800 break-words min-w-0">{name}</h2>
        <div className="flex items-center shrink-0 gap-1 text-sm font-semibold">
          <button aria-label="Năm trước" disabled={year<=1900} onClick={()=>setParams({year:String(year-1),month:String(initialMonth)})} className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
          <span>{year}</span>
          <button aria-label="Năm sau" disabled={year>=9999} onClick={()=>setParams({year:String(year+1),month:String(initialMonth)})} className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>
      {data && <div><p className="text-xs text-slate-500">Tổng chi đã ghi trong năm {year}</p><p className="text-2xl font-bold text-rose-600">{formatCurrency(data.total)}</p></div>}
      <div className="flex justify-between gap-2 text-[11px] text-slate-500" role="status">
        <div><p>{error || (loading ? (data ? 'Đang cập nhật · bản đã lưu trên máy' : 'Đang tải chi tiêu…') : 'Đã cập nhật số liệu')}</p>
          {data && snapshot && <p>Lần cập nhật: {new Intl.DateTimeFormat('vi-VN',{dateStyle:'short',timeStyle:'short',hourCycle:'h23',timeZone:'Asia/Ho_Chi_Minh'}).format(snapshot.savedAt)}</p>}
        </div>
        <button disabled={loading} onClick={()=>load()} className="shrink-0 font-semibold text-emerald-700 disabled:opacity-50">Cập nhật</button>
      </div>
      {!data && loading && <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" aria-label="Đang tải" /></div>}
      {data && <>
        <div className="relative w-full">
          <svg viewBox="0 0 360 184" className="block w-full h-auto" role="img" aria-label={`Xu hướng chi tiêu ${name}, từ tháng 1 đến tháng 12 năm ${year}`}>
            <desc>{data.months.map((n,i)=>`Tháng ${i+1}: ${formatCurrency(n)}`).join('; ')}</desc>
            {[28,62,96,130,164].map(grid=><line key={grid} x1="15" x2="345" y1={grid} y2={grid} stroke="#e2e8f0" strokeDasharray="3 4" />)}
            <line x1={x(selectedMonth-1)} x2={x(selectedMonth-1)} y1="20" y2="170" stroke="#fda4af" strokeDasharray="3 3" />
            <polyline points={data.months.map((n,i)=>`${x(i)},${y(n)}`).join(' ')} fill="none" stroke="#e11d48" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            {data.months.map((n,i)=><circle key={i} cx={x(i)} cy={y(n)} r={selectedMonth===i+1?5:3} fill={selectedMonth===i+1?'#e11d48':'white'} stroke="#e11d48" strokeWidth="2" />)}
          </svg>
          <div className="absolute inset-0 grid grid-cols-12">
            {data.months.map((amount,i)=><button key={i} aria-label={`Tháng ${i+1}: ${formatCurrency(amount)}`} aria-pressed={selectedMonth===i+1} onClick={()=>setSelectedMonth(i+1)} className="rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600" />)}
          </div>
        </div>
        <div className="grid grid-cols-12 text-center text-[10px] text-slate-500" aria-hidden="true">{data.months.map((_,i)=><span key={i} className={selectedMonth===i+1?'font-bold text-rose-600':''}>T{i+1}</span>)}</div>
        <div className="rounded-2xl bg-rose-50 p-3 text-center" aria-live="polite">
          <p className="text-xs text-slate-600">Tháng {selectedMonth}/{year}</p>
          <p className="text-lg font-bold text-rose-600">{formatCurrency(data.months[selectedMonth-1])}</p>
        </div>
        <p className="text-[11px] text-slate-500 text-center">Chạm vào chấm hoặc vùng của tháng để xem số tiền.</p>
        {data.total===0 && <p className="text-xs text-center text-slate-500">Chưa có khoản chi nào của danh mục này trong năm {year}.</p>}
      </>}
    </section>
  </div>;
};
