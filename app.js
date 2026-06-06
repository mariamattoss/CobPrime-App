const express = require('express');
const ADODB = require('node-adodb');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
// [FIX]: Restringe CORS em vez de aceitar qualquer origem; CORS_ORIGIN permite configurar producao.
const origensPermitidas = [
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    process.env.CORS_ORIGIN
].filter(Boolean);

app.use(cors({
    origin(origin, callback) {
        if (!origin || origensPermitidas.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error('Origem nao permitida pelo CORS'));
    }
}));
app.use(express.json());

const banco = path.join(__dirname, 'banco', 'banco_dev.mdb');

const connection = ADODB.open(
    `Provider=Microsoft.ACE.OLEDB.12.0;Data Source=${banco};`
);

function escaparTextoSql(valor) {
    return String(valor || '').replace(/'/g, "''");
}

function numeroValido(valor) {
    return /^\d+$/.test(String(valor || ''));
}

// [FIX]: Exige identificacao do cobrador no backend para impedir baixa sem vinculo minimo com o usuario logado.
function exigirCobrador(req, res, next) {
    const idcobrador = req.headers['x-id-cobrador'];

    if (!numeroValido(idcobrador)) {
        return res.status(401).json({
            sucesso: false,
            mensagem: 'Cobrador nao autenticado'
        });
    }

    req.idcobrador = idcobrador;
    next();
}

// USUARIOS
app.get('/Usuarios', async (req, res) => {

    try {

        const resultado = await connection.query(`
            SELECT * FROM Usuarios
        `);

        res.json(resultado);

    } catch (erro) {

        console.error('[USUARIOS][ERRO_INTERNO]', erro);

        res.status(500).json({
            // [FIX]: Nao expoe detalhes internos do banco para o cliente.
            mensagem: 'Erro interno ao carregar usuarios.'
        });

    }

});


// LOGIN
app.post('/login', async (req, res) => {

    try {

        const { login, senha } = req.body;
        // [FIX]: Escapa aspas simples antes de interpolar credenciais no SQL do Access.
        const loginSeguro = escaparTextoSql(login);
        const senhaSegura = escaparTextoSql(senha);

        const resultado = await connection.query(`
            SELECT *
            FROM Usuarios
            WHERE login='${loginSeguro}'
            AND senha='${senhaSegura}'
        `);

        if(resultado.length === 0) {

            return res.status(401).json({
                sucesso: false
            });

        }

        const usuario = resultado[0];
        const idusuario = usuario.IdUsuario;

        const cobrador = await connection.query(`
            SELECT
                IdCobrador,
                Cobrador
            FROM Cobradores
            WHERE IdUsuario = ${idusuario}
        `);

        if(cobrador.length === 0) {

            return res.status(404).json({
                sucesso: false,
                mensagem: 'Usuario validado, mas nenhum cobrador foi encontrado para este login.'
            });

        }

        const cobradorDados = cobrador[0];

        res.json({
            sucesso: true,
            cobrador: cobradorDados
        });

    } catch (erro) {

        console.error('[LOGIN][ERRO_INTERNO]', erro);

        res.status(500).json({
            // [FIX]: Nao expoe detalhes internos do banco para o cliente.
            mensagem: 'Erro interno ao realizar login.'
        });

    }

});


// HOME
app.get('/home/:idcobrador', async (req, res) => {

    try {

        const idcobrador = req.params.idcobrador;

        if(!numeroValido(idcobrador)) {

            return res.status(400).json({
                sucesso: false,
                mensagem: 'IdCobrador invalido'
            });

        }

        const cobrador = await connection.query(`

            SELECT

                Cobrador

            FROM Cobradores

            WHERE IdCobrador = ${idcobrador}

        `);

        if(cobrador.length === 0) {

            return res.status(404).json({
                sucesso: false,
                mensagem: 'Cobrador não encontrado'
            });

        }

        const ultimacobranca = await connection.query(`

            SELECT

                Max(IdCobranca) AS UltimaCobranca

            FROM Cobrancas

            WHERE IdCobrador = ${idcobrador}

        `);

        if(ultimacobranca.length === 0) {

            return res.status(404).json({
                sucesso: false,
                mensagem: 'Cobrança não encontrada'
            });

        }

        const idcobranca = ultimacobranca[0].UltimaCobranca;
        const cobranca = await connection.query(`

            SELECT

                IdCobranca, Format(DataInicial,'dd/mm/yyyy') AS DataInicial, Format(DataFinal,'dd/mm/yyyy') AS  DataFinal

            FROM Cobrancas

            WHERE IdCobranca = ${idcobranca}

        `);

        if(cobranca.length === 0) {

            return res.status(404).json({
                sucesso: false,
                mensagem: 'Cobrança não encontrada'
            });

        }

        const parcelas = await connection.query(`

            SELECT

                cp.IdCliente,
                cp.Nome,
                c.CPF,
                cp.Fone1,
                COUNT(cp.IdParcela) AS TotalParcelas

            FROM CobrancasParcelas AS cp

            INNER JOIN Clientes AS c
                ON cp.IdCliente = c.IdCliente

            WHERE cp.IdCobranca = ${idcobranca}
            GROUP BY cp.IdCliente, cp.Nome, c.CPF, cp.Fone1

        `);

        res.json({

            sucesso: true,

            cobrador: cobrador[0],

            cobranca: cobranca[0],

            parcelas: parcelas

        });

    } catch (erro) {

        console.error(erro);

        res.status(500).json({
            // [FIX]: Nao expoe detalhes internos do banco para o cliente.
            mensagem: 'Erro interno ao carregar home.'
        });

    }

});

// ROTA INFO CLIENTE
app.get('/cliente/:idcobranca/:idcliente', async (req, res) => {

    try {

        // pega id da URL
        const idcliente = req.params.idcliente;
        const idcobranca = req.params.idcobranca;

        // [FIX]: Valida tambem IdCobranca para nao carregar cliente fora do contexto da cobranca.
        if(!numeroValido(idcliente) || !numeroValido(idcobranca)) {

            return res.status(400).json({
                sucesso: false,
                mensagem: 'IdCliente ou IdCobranca invalido'
            });

        }

        // [FIX]: Consulta o cliente somente se existir parcela dele na cobranca informada.
        const cliente = await connection.query(`

            SELECT DISTINCT

                c.IdCliente,
                c.Nome,
                c.Fone1,
                c.CPF

            FROM Clientes AS c
            INNER JOIN CobrancasParcelas AS cp
                ON cp.IdCliente = c.IdCliente

            WHERE c.IdCliente = ${idcliente}
            AND cp.IdCobranca = ${idcobranca}

        `);

        // cliente não encontrado
        if(cliente.length === 0) {

            return res.status(404).json({
                sucesso: false,
                mensagem: 'Cliente não encontrado'
            });

        }

        // retorno
        res.json({

            sucesso: true,

            cliente: cliente[0],
            cobranca: idcobranca

        });

    } catch (erro) {

        console.error(erro);

        res.status(500).json({
            // [FIX]: Nao expoe detalhes internos do banco para o cliente.
            mensagem: 'Erro interno ao carregar cliente.'
        });

    }

});

// ROTA ATUALIZA INFO CLIENTE
app.put('/cliente/:idcobranca/:idcliente', exigirCobrador, async (req, res) => {

    try {

        const idcliente = req.params.idcliente;
        const idcobranca = req.params.idcobranca;
        const { fone1, cpf } = req.body;

        if(!numeroValido(idcliente) || !numeroValido(idcobranca)) {

            return res.status(400).json({
                sucesso: false,
                mensagem: 'IdCliente ou IdCobranca invalido'
            });

        }

        const cobrancaAutorizada = await connection.query(`
            SELECT IdCobranca
            FROM Cobrancas
            WHERE IdCobranca = ${idcobranca}
            AND IdCobrador = ${req.idcobrador}
        `);

        if (cobrancaAutorizada.length === 0) {
            return res.status(403).json({
                sucesso: false,
                mensagem: 'Cobranca nao autorizada para este cobrador'
            });
        }

        const clienteExiste = await connection.query(`
            SELECT DISTINCT c.IdCliente
            FROM Clientes AS c
            INNER JOIN CobrancasParcelas AS cp
                ON cp.IdCliente = c.IdCliente
            WHERE c.IdCliente = ${idcliente}
            AND cp.IdCobranca = ${idcobranca}
        `);

        if (clienteExiste.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Cliente nao encontrado nesta cobranca'
            });
        }

        const foneSeguro = escaparTextoSql(String(fone1 || '').replace(/\D/g, ''));
        const cpfSeguro = escaparTextoSql(String(cpf || '').replace(/\D/g, ''));

        await connection.execute(`
            UPDATE Clientes
            SET
                Fone1 = '${foneSeguro}',
                CPF = '${cpfSeguro}'
            WHERE IdCliente = ${idcliente}
        `);

        await connection.execute(`
            UPDATE CobrancasParcelas
            SET
                Fone1 = '${foneSeguro}'
            WHERE IdCliente = ${idcliente}
            AND IdCobranca = ${idcobranca}
        `);

        const clienteAtualizado = await connection.query(`
            SELECT DISTINCT
                c.IdCliente,
                c.Nome,
                c.Fone1,
                c.CPF
            FROM Clientes AS c
            INNER JOIN CobrancasParcelas AS cp
                ON cp.IdCliente = c.IdCliente
            WHERE c.IdCliente = ${idcliente}
            AND cp.IdCobranca = ${idcobranca}
        `);

        if (clienteAtualizado.length === 0) {
            return res.status(500).json({
                sucesso: false,
                mensagem: 'Cliente atualizado nao foi localizado'
            });
        }

        return res.json({
            sucesso: true,
            mensagem: 'Cliente atualizado com sucesso',
            cliente: clienteAtualizado[0]
        });

    } catch (erro) {

        console.error('[CLIENTE_UPDATE][ERRO_INTERNO]', erro);

        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro interno ao atualizar cliente.'
        });

    }

});

// ROTA PAGAMENTO
app.get('/parcelas/:idcobranca/:idcliente', async (req, res) => {

        try {

        // pega id da URL
        const idcliente = req.params.idcliente;
        const idcobranca = req.params.idcobranca;


        if(!numeroValido(idcliente)) {

            return res.status(400).json({
                sucesso: false,
                mensagem: 'IdCliente invalido'
            });

        }

         if(!numeroValido(idcobranca)) {

            return res.status(400).json({
                sucesso: false,
                mensagem: 'IdCobranca invalido'
            });

        }

        // consulta
        const parcelas = await connection.query(`

            SELECT

                IdCliente,
                Nome,
                Descricao,
                Numero,
                DataVencimento,
                ValorVencimento,
                DataPagamento,
                Fone1,
                LinkQRCode,
                IdParcela,
                IdCobranca

            FROM CobrancasParcelas 


            WHERE IdCliente = ${idcliente}
            AND IdCobranca = ${idcobranca}
        `);

        const parcelasNormalizadas = parcelas.map((p) => {
          const dataPagamento = p.DataPagamento;
          const estaPaga = dataPagamento && new Date(dataPagamento).getTime() !== 0;

          return {
            ...p,
            statuspgto: estaPaga ? 'PAGO' : 'EM ABERTO'
          };
        });

        // Parcelas não encontradas
        if(parcelasNormalizadas.length === 0) {

            return res.status(404).json({
                sucesso: false,
                mensagem: 'Parcelas não encontradas'
            });

        }

        // retorno
        res.json({

            sucesso: true,

            parcelas: parcelasNormalizadas

        });

    } catch (erro) {

        console.error(erro);

        res.status(500).json({
            // [FIX]: Nao expoe detalhes internos do banco para o cliente.
            mensagem: 'Erro interno ao carregar parcelas.'
        });

    }

});

// ROTA BAIXA PAGAMENTO
app.post('/baixa-pagamento', exigirCobrador, async (req, res) => {

    const auditoria = {
        rota: '/baixa-pagamento',
        inicio: new Date().toISOString()
    };

    try {
        const {
            idcliente,
            idcobranca,
            idparcela
        } = req.body;

        auditoria.payload = { idcliente, idcobranca, idparcela };
        auditoria.idcobrador = req.idcobrador;
        console.log('[BAIXA_PAGAMENTO][INICIO]', auditoria);

        // validações
        if (
            !numeroValido(idcliente) ||
            !numeroValido(idcobranca) ||
            !numeroValido(idparcela)
        ) {
            console.warn('[BAIXA_PAGAMENTO][PARAMETROS_INVALIDOS]', auditoria);

            return res.status(400).json({
                sucesso: false,
                mensagem: 'Dados invalidos'
            });
        }

        // [FIX]: Confirma que a cobranca pertence ao cobrador autenticado antes de permitir a baixa.
        const cobrancaAutorizada = await connection.query(`
            SELECT IdCobranca
            FROM Cobrancas
            WHERE IdCobranca = ${idcobranca}
            AND IdCobrador = ${req.idcobrador}
        `);

        if (cobrancaAutorizada.length === 0) {
            console.warn('[BAIXA_PAGAMENTO][COBRANCA_NAO_AUTORIZADA]', auditoria);

            return res.status(403).json({
                sucesso: false,
                mensagem: 'Cobranca nao autorizada para este cobrador'
            });
        }

        // verifica se parcela existe
        const parcela = await connection.query(`
            SELECT
                Numero,
                DataPagamento
            FROM CobrancasParcelas
            WHERE IdCliente = ${idcliente}
            AND IdCobranca = ${idcobranca}
            AND IdParcela = ${idparcela}
        `);

        console.log('[BAIXA_PAGAMENTO][PARCELA_ANTES_UPDATE]', {
            ...auditoria,
            parcelaEncontrada: parcela.length > 0,
            parcela: parcela[0] || null
        });

        if (parcela.length === 0) {
            console.warn('[BAIXA_PAGAMENTO][PARCELA_NAO_ENCONTRADA]', auditoria);

            return res.status(404).json({
                sucesso: false,
                mensagem: 'Parcela não encontrada'
            });
        }

        // verifica se já foi paga
        const dataPagamento = parcela[0]. DataPagamento;
        const parcelaEstaPaga = dataPagamento && new Date(dataPagamento).getTime() !== 0;

        if (parcelaEstaPaga) {
            console.warn('[BAIXA_PAGAMENTO][PARCELA_JA_PAGA]', {
                ...auditoria,
                dataPagamento
            });

            return res.status(400).json({
                sucesso: false,
                mensagem: 'Parcela ja está paga'
            });
        }

        // BAIXA O PAGAMENTO
        // Uso Date() nativo do Access

        // [FIX]: O UPDATE exige parcela em aberto para reduzir sucesso indevido em corrida.
        const sqlUpdate = `
            UPDATE CobrancasParcelas
            SET
                DataPagamento = Date(),
                PagApp = -1
            WHERE IdCliente = ${idcliente}
            AND IdCobranca = ${idcobranca}
            AND IdParcela = ${idparcela}
            AND (DataPagamento IS NULL OR DataPagamento = 0)
        `;

        console.log('[BAIXA_PAGAMENTO][ANTES_UPDATE]', {
            ...auditoria,
            sql: sqlUpdate
        });

        await connection.execute(sqlUpdate);

        console.log('[BAIXA_PAGAMENTO][DEPOIS_UPDATE]', auditoria);

        // Verifica se a atualização foi aplicada e retorna a parcela atualizada
        const parcelaAtualizada = await connection.query(`
            SELECT IdParcela, DataPagamento, PagApp
            FROM CobrancasParcelas
            WHERE IdCliente = ${idcliente}
            AND IdCobranca = ${idcobranca}
            AND IdParcela = ${idparcela}
        `);

        console.log('[BAIXA_PAGAMENTO][PARCELA_APOS_UPDATE]', {
            ...auditoria,
            parcelaEncontrada: parcelaAtualizada.length > 0,
            parcela: parcelaAtualizada[0] || null
        });

        if (parcelaAtualizada.length === 0) {
            console.error('[BAIXA_PAGAMENTO][PARCELA_SUMIU_APOS_UPDATE]', auditoria);

            return res.status(404).json({
                sucesso: false,
                mensagem: 'Parcela atualizada não encontrada'
            });
        }
        
        const baixaConfirmada = parcelaAtualizada[0];
        // [FIX]: Confirma persistencia real no MDB em vez de confiar em rowsAffected do node-adodb.
        const dataPagamentoConfirmada =
            baixaConfirmada.DataPagamento &&
            new Date(baixaConfirmada.DataPagamento).getTime() !== 0;

        const pagAppConfirmado =
            baixaConfirmada.PagApp === true ||
            baixaConfirmada.PagApp === -1 ||
            baixaConfirmada.PagApp === 'True' ||
            baixaConfirmada.PagApp === 'true';

        if (!dataPagamentoConfirmada || !pagAppConfirmado) {
            console.error('[BAIXA_PAGAMENTO][PERSISTENCIA_NAO_CONFIRMADA]', {
                ...auditoria,
                dataPagamentoConfirmada,
                pagAppConfirmado,
                parcela: baixaConfirmada
            });

            return res.status(500).json({
                sucesso: false,
                mensagem: 'Baixa nao confirmada no banco de dados.',
                parcela: baixaConfirmada
            });
        }

        console.log('[BAIXA_PAGAMENTO][SUCESSO_CONFIRMADO]', {
            ...auditoria,
            parcela: baixaConfirmada,
            fim: new Date().toISOString()
        });

        res.json({
            sucesso: true,
            mensagem: `Baixa realizada com sucesso ${idcliente}...`,
            parcela: baixaConfirmada
        });

    } catch (erro) {
        // Log detalhado no console do servidor para te ajudar no debug
        console.error("[BAIXA_PAGAMENTO][ERRO_INTERNO]", {
            ...auditoria,
            erro: erro.message,
            stack: erro.stack,
            fim: new Date().toISOString()
        });

        res.status(500).json({
            sucesso: false,
            // [FIX]: Nao expoe detalhes internos do driver OLEDB/Access para o cliente.
            mensagem: 'Erro interno ao realizar a baixa no banco de dados.'
        });
    }
});

// SERVIDOR
const server = app.listen(PORT, () => {

    console.log(`Servidor rodando em http://localhost:${PORT}`);

});

server.on('error', (erro) => {

    if (erro.code === 'EADDRINUSE') {

        console.error(`A porta ${PORT} ja esta em uso. Feche o outro servidor ou rode com outra porta:`);
        console.error(`$env:PORT=3002; npm start`);
        process.exit(1);

    }

    throw erro;

});
