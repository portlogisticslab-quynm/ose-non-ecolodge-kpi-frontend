const _isLocal = ['127.0.0.1','localhost'].includes(window.location.hostname);
window.APP_CONFIG = {
  API_BASE_URL: _isLocal ? 'http://127.0.0.1:8000' : 'https://ose-non-ecolodge-kpi-api.onrender.com',
  APP_VERSION: '1.0.2h-google-calendar'
};
