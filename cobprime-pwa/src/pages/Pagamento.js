import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import {
  FaChevronLeft,
  FaWhatsapp,
  FaCoins
} from 'react-icons/fa';

export default function Pagamento() {

  const { idcobranca, idcliente } = useParams();
  const navigate = useNavigate();

  const URL_PAZ_NO_VALE = 'https://paznovale.com.br/pagamento-pix/?idPix=';

  const [parcelas, setParcelas] = useState([]);
  const [cliente, setCliente] = useState({ IdCliente: '', Nome: '', Fone1: '', CPF: '' });
  const [cobranca, setCobranca] = useState({ IdCobranca: '', DataInicial: '', DataFinal: '' });
  const [cobrador, setCobrador] = useState({ IdCobrador: '', Cobrador: '' });
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
// LINK DE PAGAMENTO
 const enviarWhatsApp = (parcela) => {

  if (!cliente.Fone1) {
    alert('WhatsApp indisponível: telefone do cliente não encontrado.');
    return;
  }

  if (!parcela.LinkQRCode) {
    alert('Link de pagamento não disponível para esta parcela.');
    return;
  }

  const idPix = parcela.LinkQRCode.slice(-32);

  const linkPagamento = `${URL_PAZ_NO_VALE}?idPix=${idPix}`;

  const valorFormatado = Number(parcela.ValorVencimento)
    .toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  const codigoCliente = cliente.Codigo || cliente.IdCliente || '--';
  const dataVencimento = parcela.DataVencimento
    ? new Date(parcela.DataVencimento).toLocaleDateString('pt-BR')
    : '--';

  const mensagem = `*Segue seu link de pagamento PIX*

Cód: ${codigoCliente} - ${cliente.Nome}

Parcela: ${parcela.Numero} - Vencimento: ${dataVencimento}

Valor: ${valorFormatado}

${linkPagamento}`;

  const urlWhatsApp =
    `https://wa.me/55${cliente.Fone1.replace(/\D/g, '')}?text=${encodeURIComponent(mensagem)}`;

  window.open(urlWhatsApp, '_blank');
}

// BAIXA DE PAGAMENTO
const realizarBaixa = async (parcela) => {

  // Confirmação
  const confirmar = window.confirm(
    `Deseja realizar a baixa da parcela ${parcela.Numero}?`
  );

  if (!confirmar) return;

  try {

    const response = await api.post(
      '/baixa-pagamento',
      {
        idcliente: cliente.IdCliente,
        idcobranca: parcela.IdCobranca,
        idparcela: parcela.IdParcela
      }
    );

    if (response.data?.sucesso) {

      alert(`Baixa realizada com sucesso! ${response.data?.mensagem}`);

      // Atualiza lista usando o identificador único da parcela
      setParcelas((prev) =>
        prev.map((p) =>
          p.IdParcela === parcela.IdParcela
            ? {
                ...p,
                statuspgto: 'PAGO'
              }
            : p
        )
      );

    } else {

      alert(
        response.data?.mensagem ||
        'Erro ao realizar baixa'
      );

    }

  } catch (error) {
    console.error(error);
    
    // Captura a mensagem de erro detalhada enviada pelo backend
    const mensagemErro = error.response?.data?.erro || error.response?.data?.mensagem || error.message;

    alert(`Erro ao realizar baixa: ${mensagemErro}`);
  }
};



  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);
      setErro('');

      try {
        const idCobradorSalvo = localStorage.getItem('idCobrador');

        if (idCobradorSalvo && /^\d+$/.test(idCobradorSalvo)) {
          const responseHome = await api.get(`/home/${idCobradorSalvo}`);
          if (responseHome.data?.sucesso) {
            setCobrador(responseHome.data.cobrador || {});
            setCobranca(responseHome.data.cobranca || {});
          }
        } else {
          const dadosUsuario = localStorage.getItem('usuario');
          if (dadosUsuario) {
            const usuario = JSON.parse(dadosUsuario);
            setCobrador({
              IdCobrador: usuario.IdCobrador || '',
              Cobrador: usuario.Cobrador || ''
            });
            setCobranca({
              IdCobranca: idcobranca || '',
              DataInicial: '',
              DataFinal: ''
            });
          }
        }

        if (!/^\d+$/.test(idcliente || '') || !/^\d+$/.test(idcobranca || '')) {
          setErro('Dados de cobrança ou cliente inválidos.');
          return;
        }

        const [responseCliente, responseParcelas] = await Promise.all([
          api.get(`/cliente/${idcobranca}/${idcliente}`),
          api.get(`/parcelas/${idcobranca}/${idcliente}`)
        ]);

        if (responseCliente.data?.sucesso) {
          setCliente(responseCliente.data.cliente || {});
        } else {
          setErro(responseCliente.data?.mensagem || 'Não foi possível carregar os dados do cliente.');
        }

        if (responseParcelas.data?.sucesso) {
          setParcelas(responseParcelas.data.parcelas || []);
        } else {
          setErro(responseParcelas.data?.mensagem || 'Não foi possível carregar as parcelas.');
        }
      } catch (err) {
        console.error('Erro ao buscar dados:', err);
        setErro(err.response?.data?.mensagem || 'Erro ao carregar dados de pagamento.');
      } finally {
        setLoading(false);
      }
    };

    carregarDados();
  }, [idcobranca, idcliente]);

  if (loading) {
    return <div className="p-3">Carregando pagamento...</div>;
  }

  return (
    <div>
      <div className="top-header">
        <FaChevronLeft
          className="back-btn"
          onClick={() => navigate(-1)}
        />

        <img
          src={process.env.PUBLIC_URL + '/logoPVazul.png'} 
          alt="Paz no Vale"
          style={{ height: '40px' }}
        />
      </div>

      {erro && (
        <div className="alert alert-danger mx-3 p-2">
          {erro}
        </div>
      )}

      <div className="info-card mb-2">
        <div>
          <strong>Cobrador:</strong> {cobrador.IdCobrador}  {cobrador.Cobrador || '--'}
        </div>

        <div
          style={{
            fontSize: '0.9rem',
            marginTop: '6px'
          }}
        >
          <div>Data inicial: {cobranca.DataInicial || '--'}</div>
          <div>Data final: {cobranca.DataFinal || '--'}</div>
          <div>IdCobrança: {cobranca.IdCobranca || idcobranca || '--'}</div>
        </div>
      </div>

      <div className="info-card mb-2">
        <div>
          <strong>Código:</strong> {cliente.IdCliente || '--'}
        </div>

        <div>
          <strong>Nome:</strong> {cliente.Nome || '--'}
        </div>

        <div
          style={{
            fontSize: '0.9rem',
            marginTop: '2px'
          }}
        >
          <div>
            <strong>Telefone:</strong> {' '}
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
            <strong>CPF:</strong> {' '}
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
        </div>
      </div>
      <h6
        className="px-3 mt-3"
        style={{
          color: 'var(--btn-blue)',
          fontWeight: 'bold'
        }}
      >
        Parcelas pendentes
      </h6>

      {parcelas.length === 0 ? (
        <div className="px-3">Nenhuma parcela encontrada para este cliente.</div>
      ) : (
        parcelas.map((parcela, index) => (
          <div className="client-card" key={parcela.IdParcela || `${parcela.Numero}-${index}`}>
            <div style={{ fontSize: '0.85rem' }}>
              <div>
                <strong>Tipo:</strong> {parcela.Descricao}
              </div>
              <div>
                <strong>Número:</strong> {parcela.Numero}
              </div>
             <div>
  <strong>Vencto:</strong>{' '}

  {
    parcela.DataVencimento
      ? new Date(parcela.DataVencimento).toLocaleDateString('pt-BR')
      : '--'
  }
</div>

<div>
  <strong>Valor:</strong>{' '}

  {
    parcela.ValorVencimento
      ? Number(parcela.ValorVencimento).toLocaleString(
          'pt-BR',
          {
            style: 'currency',
            currency: 'BRL'
          }
        )
      : 'R$ 0,00'
  }
</div>
              <div>
                <strong>Pagto:</strong> {parcela.statuspgto}
              </div>
            </div>

          
            <div className="action-icons">
              <FaWhatsapp 
                className="icon-whatsapp" 
                onClick={() => enviarWhatsApp(parcela)}
              />
              <FaCoins
                className="icon-coin"
                onClick={() => realizarBaixa(parcela)}
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
}
