import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { FaSearch, FaRegEdit } from 'react-icons/fa';

export default function Home() {

  const { idCobrador } = useParams();

  const navigate = useNavigate();

  const [dados, setDados] = useState({
    cobrador: {},
    cobranca: {},
    parcelas: []
  });

  const [busca, setBusca] = useState('');

  const [erro, setErro] = useState('');

  const [loading, setLoading] = useState(true);


  useEffect(() => {

    const carregarDados = async () => {

      try {

        setErro('');

        // pega id salvo
        const idSalvo = localStorage.getItem('idCobrador');

        // valida id da rota
        const cobradorAtual =
          /^\d+$/.test(idCobrador || '')
            ? idCobrador
            : idSalvo;

        // se não existir
        if (!/^\d+$/.test(cobradorAtual || '')) {

          localStorage.removeItem('idCobrador');

          navigate('/login');

          return;

        }

        // busca API
        const response = await api.get(
          `/home/${cobradorAtual}`
        );

        // sucesso
        if (response.data?.sucesso) {

          setDados({
            cobrador: response.data.cobrador || {},
            cobranca: response.data.cobranca || {},
            parcelas: response.data.parcelas || []
          });

        }

      } catch (err) {

        console.error('Erro ao buscar home:', err);

        setErro(
          err.response?.data?.mensagem ||
          'Não foi possível carregar os dados da home.'
        );

      } finally {

        setLoading(false);

      }

    };

    carregarDados();

  }, [idCobrador, navigate]);


  // filtro seguro
  const parcelasFiltradas =
    (dados.parcelas || []).filter((p) => {

      const nome =
        p.Nome?.toLowerCase() || '';

      const codigo =
        p.IdCliente?.toString() || '';

      return (
        nome.includes(busca.toLowerCase()) ||
        codigo.includes(busca)
      );

    });


  // loading
  if (loading) {

    return (

      <div className="p-3">

        Carregando...

      </div>

    );

  }


  return (

    <div>

      {/* HEADER */}
      <div className="top-header">

        <img
          src={process.env.PUBLIC_URL + '/logoPVazul.png'} 
          alt="Logo Paz no Vale"
          style={{ height: '50px' }}
        />

      </div>


      {/* CARD COBRADOR */}
      <div className="info-card">

        <div>

          <strong>Cobrador:</strong>

          {' '}

          {dados.cobrador?.IdCobrador}

          {'  '}

          {dados.cobrador?.Cobrador}

        </div>

        <div
          style={{
            fontSize: '0.8rem',
            marginTop: '5px'
          }}
        >

          <div>

            Data Inicial:

            {' '}

            {dados.cobranca?.DataInicial}

          </div>

          <div>

            Data Final:

            {' '}

            {dados.cobranca?.DataFinal || '--'}

          </div>

          <div>

            IdCobr:

            {' '}

            {dados.cobranca?.IdCobranca || '--'}

          </div>

        </div>

      </div>


      {/* ERRO */}
      {erro && (

        <div className="alert alert-danger mx-3 p-2">

          {erro}

        </div>

      )}


      {/* BUSCA */}
      <div className="px-3 mb-3 d-flex gap-2">

        <div className="input-group">

          <input
            type="text"
            className="form-control"
            placeholder="Pesquisar por nome ou código do cliente"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />

          <button
            className="btn btn-outline-secondary"
            type="button"
          >

            <FaSearch color="var(--btn-blue)" />

          </button>

        </div>

      </div>


      {/* TITULO */}
      <h6
        className="px-3"
        style={{
          color: 'var(--btn-blue)',
          fontWeight: 'semi-bold',
          marginBottom: '10px',
        }}
      >

        Listagem de Cobranças

      </h6>


      {/* LISTA */}
      <div className="pb-4">

        {parcelasFiltradas.length === 0 && (

          <div className="px-3">

            Nenhum cliente encontrado.

          </div>

        )}


        {parcelasFiltradas.map((cliente, index) => (

          <div
            className="client-card"
            key={index}
          >

            <div
              style={{
                fontSize: '0.85rem'
              }}
            >

              <div>

                <strong>Código:</strong>

                {' '}

                {cliente.IdCliente}

              </div>

              <div>

                <strong>Nome:</strong>

                {' '}

                {cliente.Nome}

              </div>

              <div>
  <strong>CPF:</strong>{' '}

  {
    cliente.CPF
      ? cliente.CPF.toString()
          .replace(/\D/g, '')
          .replace(
            /(\d{3})(\d{3})(\d{3})(\d{2})/,
            '$1.$2.$3-$4'
          )
      : '--'
  }
</div>

<div>
  <strong>Fone:</strong>{' '}

  {
    cliente.Fone1
      ? cliente.Fone1.toString()
          .replace(/\D/g, '')
          .replace(
            /(\d{2})(\d{5})(\d{4})/,
            '($1) $2-$3'
          )
      : '--'
  }
</div>

              <div>

                <strong>Qtd. parcelas:</strong>

                {' '}

                {cliente.TotalParcelas}

              </div>

            </div>


            {/* BOTÃO EDITAR */}
            <FaRegEdit
              className="edit-icon"
              onClick={() =>
                navigate(
                  `/cliente/${dados.cobranca.IdCobranca}/${cliente.IdCliente}`
                )
              }
            />

          </div>

        ))}

      </div>

    </div>

  );

}