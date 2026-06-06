import axios from 'axios';

// [FIX]: Em producao, evita fallback para localhost quando REACT_APP_API_URL nao for definido.
const baseURL =
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'production'
    ? window.location.origin
    : 'http://localhost:3000');

const api = axios.create({
  baseURL,
  // [FIX]: Define timeout para evitar chamadas penduradas sem retorno ao usuario.
  timeout: 15000,
});

// [FIX]: Envia o IdCobrador salvo no login para o backend autorizar a baixa.
api.interceptors.request.use((config) => {
  const idCobrador = localStorage.getItem('idCobrador');

  if (idCobrador && /^\d+$/.test(idCobrador)) {
    config.headers['x-id-cobrador'] = idCobrador;
  }

  return config;
});

export default api;
