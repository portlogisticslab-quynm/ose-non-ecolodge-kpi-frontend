/* V1.02m.8 - OSE backend selector: VPS (qua Worker ose-failover) -> may nha READ_ONLY.
   Worker tu chuyen VPS <-> may nha. Trinh duyet chi gui lai sang may nha khi khong toi duoc Worker
   (loi mang, 502, 504) va chi cho dung lan goi do. 503 (chi doc) khong phai loi may chu.
   ?api=home | render | local  ghim may chu;  ?api=auto  bo ghim. */
window.APP_CONFIG = { APP_VERSION: "1.0.2m.7" };
(function () {
  if (window.oseFetch) return; // already loaded
  const BACKENDS = {
    home:   "https://api-kpi.ose.vn",        // Worker ose-failover: VPS truoc, may nha sau
    render: "https://api-kpi-home.ose.vn",   // may nha (READ_ONLY), chi dung khi khong toi duoc Worker
    local:  "http://127.0.0.1:8000",
  };
  const DIRECT = { longJobs: "https://api-kpi-vps.ose.vn" };  // nhap Excel: thang VPS (co DB), khong qua gioi han 5 giay cua Worker
  window.OSE_BACKENDS = BACKENDS;
  window.OSE_DIRECT = DIRECT;
  let auto = false;
  const set = (base) => (window.OSE_API_BASE = base);
  try { sessionStorage.removeItem("ose_api_auto"); } catch (e) {}   // xoa lua chon cu cua ban truoc

  function resolve() {
    if (["localhost", "127.0.0.1"].includes(location.hostname)) { DIRECT.longJobs = BACKENDS.local; return Promise.resolve(set(BACKENDS.local)); }
    let forced = new URLSearchParams(location.search).get("api");
    try {
      if (forced === "auto") { localStorage.removeItem("ose_api"); forced = null; }
      else if (forced && BACKENDS[forced]) localStorage.setItem("ose_api", forced);
      else if (forced) forced = null;
      else forced = localStorage.getItem("ose_api");
    } catch (e) {}
    if (forced && BACKENDS[forced]) { if (forced === "local") DIRECT.longJobs = BACKENDS.local; return Promise.resolve(set(BACKENDS[forced])); }
    auto = true;
    return Promise.resolve(set(BACKENDS.home));
  }

  window.OSE_API_READY = resolve();

  window.oseFetch = async function (path, options) {
    const base = await window.OSE_API_READY;
    const canFailover = auto && base === BACKENDS.home;
    try {
      const res = await fetch(base + path, options);
      if (!canFailover || ![502, 504].includes(res.status)) return res;
    } catch (e) {
      if (!canFailover) throw e;
    }
    console.warn("[OSE] Khong toi duoc Worker, gui lai lan nay sang may nha (chi doc)");
    return fetch(BACKENDS.render + path, options);
  };
})();