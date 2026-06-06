import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { FaChevronLeft } from 'react-icons/fa';

function somenteDigitos(valor) {
  return String(valor || '').replace(/\D/g, '');
}

function formatarTelefone(valor) {
  const digitos = somenteDigitos(valor).slice(0, 11);

  if (digitos.length <= 10) {
    return digitos.replace(/(\d{2})(\d{4})(\d{0,4})/, (_, ddd, parte1, parte2) =>
      parte2 ? `(${ddd}) ${parte1}-${parte2}` : `(${ddd}) ${parte1}`
    );
  }

  return digitos.replace(/(\d{2})(\d{5})(\d{0,4})/, (_, ddd, parte1, parte2) =>
    parte2 ? `(${ddd}) ${parte1}-${parte2}` : `(${ddd}) ${parte1}`
  );
}

function formatarCpf(valor) {
  return somenteDigitos(valor)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export default function InfoCliente() {
  const { idcobranca, idcliente } = useParams();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState({ IdCliente: '', Nome: '', Fone1: '', CPF: '' });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const buscarCliente = async () => {
      try {
        setErro('');
        const response = await api.get(`/cliente/${idcobranca}/${idcliente}`);

        if (response.data.sucesso) {
          setCliente(response.data.cliente);
        }
      } catch (err) {
        console.error('Erro ao buscar cliente:', err);
        setErro(err.response?.data?.mensagem || 'Nao foi possivel carregar os dados do cliente.');
      }
    };

    buscarCliente();
  }, [idcobranca, idcliente]);

  const voltarParaHome = () => {
    const idCobrador = localStorage.getItem('idCobrador');

    if (idCobrador && /^\d+$/.test(idCobrador)) {
      navigate(`/home/${idCobrador}`);
      return;
    }

    navigate(-1);
  };

  const salvarCliente = async () => {
    try {
      setErro('');
      setSalvando(true);

      const response = await api.put(`/cliente/${idcobranca}/${idcliente}`, {
        fone1: somenteDigitos(cliente.Fone1),
        cpf: somenteDigitos(cliente.CPF)
      });

      if (!response.data?.sucesso) {
        setErro(response.data?.mensagem || 'Nao foi possivel salvar os dados do cliente.');
        return;
      }

      navigate(`/pagamento/${idcobranca}/${idcliente}`);
    } catch (err) {
      console.error('Erro ao salvar cliente:', err);
      setErro(err.response?.data?.mensagem || 'Erro ao salvar os dados do cliente.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div>
      <div className="top-header">
        <FaChevronLeft className="back-btn" onClick={voltarParaHome} />
        <img src={process.env.PUBLIC_URL + '/logoPVazul.png'} alt="Paz no Vale" style={{ height: '40px' }} />
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
            <input type="text" className="form-control bg-light" value={cliente.IdCliente || ''} readOnly />
          </div>

          <div className="mb-3">
            <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Nome:</label>
            <input type="text" className="form-control bg-light" value={cliente.Nome || ''} readOnly />
          </div>

          <div className="mb-3">
            <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Telefone:</label>
            <input
              type="tel"
              className="form-control"
              value={formatarTelefone(cliente.Fone1)}
              onChange={(event) =>
                setCliente((atual) => ({
                  ...atual,
                  Fone1: somenteDigitos(event.target.value).slice(0, 11)
                }))
              }
            />
          </div>

          <div className="mb-3">
            <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>CPF:</label>
            <input
              type="text"
              className="form-control"
              value={formatarCpf(cliente.CPF)}
              onChange={(event) =>
                setCliente((atual) => ({
                  ...atual,
                  CPF: somenteDigitos(event.target.value).slice(0, 11)
                }))
              }
            />
          </div>

          <div className="d-flex gap-2 mt-2">
            <button type="button" className="btn btn-outline-secondary flex-fill" onClick={voltarParaHome}>
              Voltar
            </button>

            <button type="button" className="btn-custom flex-fill" onClick={salvarCliente} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
