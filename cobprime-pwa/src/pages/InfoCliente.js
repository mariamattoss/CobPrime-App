import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { FaChevronLeft } from 'react-icons/fa';

export default function InfoCliente() {
  const { idcobranca, idcliente } = useParams();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState({ IdCliente: '', Nome: '', Fone1: '', CPF: '' });
  const [erro, setErro] = useState('');

  useEffect(() => {
    const buscarCliente = async () => {
      try {
        setErro('');
        const response = await api.get(`/cliente/${idcobranca}/${idcliente}`);
        if (response.data.sucesso) {
          setCliente(response.data.cliente);
        }
      } catch (err) {
        console.error("Erro ao buscar cliente:", err);
        setErro(err.response?.data?.mensagem || 'Nao foi possivel carregar os dados do cliente.');
      }
    };
    buscarCliente();
  }, [idcobranca, idcliente]);

  return (
    <div>
      <div className="top-header">
         <FaChevronLeft className="back-btn" onClick={() => navigate(-1)} />
         <img src={process.env.PUBLIC_URL + '/logoPVazul.png'}  alt="Paz no Vale" style={{ height: '40px' }} />
      </div>

      <div className="p-3">
        {erro && (
          <div className="alert alert-danger p-2">
            {erro}
          </div>
        )}

        <form>
          <div className="mb-3">
            <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Codigo do cliente:</label>
            <input type="text" className="form-control bg-light" value={cliente.IdCliente} readOnly />
          </div>
          <div className="mb-3">
            <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Nome:</label>
            <input type="text" className="form-control bg-light" value={cliente.Nome} readOnly />
          </div>
          <div className="mb-3">
  <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
    Telefone
  </label>

  <input
    type="text"
    className="form-control bg-light"
    value={
      cliente.Fone1
        ? cliente.Fone1.toString()
            .replace(/\D/g, '')
            .replace(
              /(\d{2})(\d{5})(\d{4})/,
              '($1) $2-$3'
            )
        : ''
    }
    readOnly
  />
</div>

<div className="mb-3">
  <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
    CPF:
  </label>

  <input
    type="text"
    className="form-control bg-light"
    value={
      cliente.CPF
        ? cliente.CPF.toString()
            .replace(/\D/g, '')
            .replace(
              /(\d{3})(\d{3})(\d{3})(\d{2})/,
              '$1.$2.$3-$4'
            )
        : ''
    }
    readOnly
  />
</div>
          <button type="button" className="btn-custom mt-2" onClick={() => navigate(`/pagamento/${idcobranca}/${cliente.IdCliente}`)}>
            Acessar parcelas do cliente
          </button>
        </form>
      </div>
    </div>
  );
}
