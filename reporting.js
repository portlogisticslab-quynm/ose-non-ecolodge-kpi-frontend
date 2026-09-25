// One reporting scope for Staff, KPI, Bookings and Properties. Calendar stays shared.
let reportStaffId='';
function setReportMonth(value){staffMonth=value;kpiMonth=value}
function reportRows(rows){return rows.filter(b=>(!staffMonth||String(b.booking_date).slice(0,7)===staffMonth)&&(!reportStaffId||b.staff_id===reportStaffId))}
function reportControls(view){return `<div class="toolbar"><label>Tháng theo ngày đặt: <input type="month" value="${esc(staffMonth)}" onchange="setReportMonth(this.value);showView('${view}')"></label><button onclick="setReportMonth('');showView('${view}')">Tất cả tháng</button><label>Nhân viên: <select onchange="reportStaffId=this.value;showView('${view}')"><option value="">${me.role==='staff'?'Của tôi':'Tất cả nhân viên'}</option>${staff.map(s=>`<option value="${esc(s.staff_id)}" ${s.staff_id===reportStaffId?'selected':''}>${esc(s.staff_id)} — ${esc(s.staff_name)}</option>`).join('')}</select></label></div>`}
function reportScopeNote(){return `<div class="notice">Kỳ báo cáo: <strong>${esc(staffMonth||'Tất cả các tháng')}</strong> theo <strong>ngày đặt</strong>; nhân viên: <strong>${esc(reportStaffId||(me.role==='staff'?me.staff_id:'Tất cả'))}</strong>. Bộ lọc dùng chung cho Nhân viên, Bảng KPI, Quản lý đặt phòng và Cơ sở lưu trú. Số booking tính mọi trạng thái; doanh thu hợp lệ chỉ tính Đã xác nhận + Hoàn thành. Lịch phòng dùng ngày lưu trú và hiển thị chung để kiểm tra phòng trống.</div>`}
function reconcileBookingSets(rows,staffId,month){
 const own=rows.filter(b=>b.staff_id===staffId),start=month?month+'-01':null,end=start?addMonthsISO(start,1):null;
 const booked=own.filter(b=>!month||String(b.booking_date).slice(0,7)===month);
 const staying=own.filter(b=>b.status!=='cancelled'&&(!month||(b.check_in_date<end&&b.check_out_date>start)));
 const bookedIds=new Set(booked.map(b=>b.booking_id)),stayIds=new Set(staying.map(b=>b.booking_id));
 return {booked,staying,onlyBooked:booked.filter(b=>!stayIds.has(b.booking_id)),onlyStaying:staying.filter(b=>!bookedIds.has(b.booking_id))};
}
async function openStaffReconciliation(staffId){
 const month=staffMonth;
 try{
  const [rows,k]=await Promise.all([api('/api/bookings'),api('/api/kpi'+(month?'?month='+encodeURIComponent(month):''))]);
  const sets=reconcileBookingSets(rows,staffId,month),r=k.rows.find(x=>x.staff_id===staffId);
  const eligible=sets.booked.filter(b=>['confirmed','completed'].includes(b.status));
  const revenue=eligible.reduce((sum,b)=>sum+Number(b.revenue||0),0),properties=[...new Set(sets.booked.map(b=>b.property_id))].sort();
  const matches=r&&r.bookings===sets.booked.length&&JSON.stringify(r.property_ids)===JSON.stringify(properties)&&Math.abs(revenue-r.revenue)<0.01;
  const table=(title,bs)=>`<h3>${esc(title)} (${bs.length})</h3><div class="scroll"><table><thead><tr><th>Mã booking</th><th>Cơ sở</th><th>Ngày đặt</th><th>Nhận → Trả</th><th>Trạng thái</th><th>Doanh thu khai báo</th><th>Doanh thu vào KPI</th></tr></thead><tbody>${bs.map(b=>`<tr><td>${esc(b.booking_id)}</td><td>${esc(b.property_id)} — ${esc(b.property_name)}</td><td>${esc(b.booking_date)}</td><td>${esc(b.check_in_date)} → ${esc(b.check_out_date)}</td><td>${stVI(b.status)}</td><td>${fmtVND(b.revenue)}</td><td>${fmtVND(['confirmed','completed'].includes(b.status)?b.revenue:0)}</td></tr>`).join('')||'<tr><td colspan="7">Không có</td></tr>'}</tbody></table></div>`;
  document.getElementById('dynamic-modal').innerHTML=`<div class="modal-card" style="max-width:1150px"><div class="modal-head"><h2>Đối chiếu ${esc(staffId)} — ${esc(month||'Tất cả tháng')}</h2><span class="x" onclick="closeModal('dynamic-modal')">&times;</span></div><div class="notice ${matches?'successbox':'warning'}">${matches?'Khớp số booking, cơ sở và doanh thu giữa dữ liệu booking và API KPI.':r?.bookings==null?'Cần backend V1.02m để kiểm tra tự động số booking và cơ sở.':'Dữ liệu đối chiếu chưa khớp. Nếu vừa có thay đổi booking, đóng và mở lại để nạp dữ liệu mới.'}</div><p>Theo ngày đặt: <strong>${sets.booked.length} booking</strong>; cơ sở: ${esc(properties.join(', ')||'—')}. Đã xác nhận/Hoàn thành: ${eligible.length}; doanh thu hợp lệ: ${fmtVND(revenue)}.</p><p>Theo ngày lưu trú trong kỳ: <strong>${sets.staying.length} booking</strong> (không tính đã hủy). Một booking nhiều phòng hoặc qua hai tháng có thể xuất hiện thành nhiều thanh trên lịch, nhưng chỉ là một mã booking.</p><p>KPI doanh thu: ${score(r?.revenue_score)}; chỉ tiêu: ${r?.revenue_target==null?'Chưa có dữ liệu':fmtVND(r.revenue_target)}. KPI tổng hợp: ${score(r?.composite_kpi)}${r?.composite_kpi==null?' — thiếu: '+esc(missingKpiEvidence(r||{})):''}.</p>${eligible.some(b=>Number(b.revenue)===0)?'<div class="notice warning">Có booking Đã xác nhận/Hoàn thành đang khai báo doanh thu 0. Ứng dụng tính theo số tiền đã nhập; không tự suy ra giá phòng. Hãy kiểm tra các dòng bên dưới.</div>':''}${table('Booking thuộc kỳ theo ngày đặt',sets.booked)}${table('Có lưu trú trong kỳ nhưng đặt ở tháng khác',sets.onlyStaying)}${table('Đặt trong kỳ nhưng không chiếm phòng trong kỳ (khác ngày lưu trú hoặc đã hủy)',sets.onlyBooked)}</div>`;
  document.getElementById('dynamic-modal').style.display='block';
 }catch(e){alert(e.message)}
}
