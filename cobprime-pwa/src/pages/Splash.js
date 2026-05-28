import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redireciona para o login após 3 segundos simulando a animação
    const timer = setTimeout(() => {
      navigate('/login');
    }, 3000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' }}>
      {/* Substitua pelo caminho real do seu logo */}
      <img src={process.env.PUBLIC_URL + '/LogoCobPrime2.png'} style={{ width: '200px' }} />
      <h2 style={{ color: '#072a5e', marginTop: '30px', fontWeight: 'light' }}>CobPrime</h2>
    </div>
  );
}