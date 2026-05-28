const express = require('express');
const ADODB = require('node-adodb');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
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

// USUARIOS
app.get('/Usuarios', async (req, res) => {

    try {

        const resultado = await connection.query(`
            SELECT * FROM Usuarios
        `);

        res.json(resultado);

    } catch (erro) {

        res.status(500).json({
            erro: erro.message
        });

    }

});


// LOGIN
app.post('/login', async (req, res) => {

    try {

        const { login, senha } = req.body;

        const resultado = await connection.query(`
            SELECT *
            FROM Usuarios
            WHERE login='${login}'
            AND senha='${senha}'
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

        res.status(500).json({
            erro: erro.message
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
                mensagem: 'Cobrador nao encontrado'
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
                mensagem: 'Cobrança nao encontrada'
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
                mensagem: 'Cobrança nao encontrada'
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
            erro: erro.message
        });

    }

});

// ROTA INFO CLIENTE
app.get('/cliente/:idcobranca/:idcliente', async (req, res) => {

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

        // consulta
        const cliente = await connection.query(`

            SELECT 

                IdCliente,
                Nome,
                Fone1,
                CPF

            FROM Clientes 

            WHERE IdCliente = ${idcliente}

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
            erro: erro.message
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
                IIF(ISNULL(DataPagamento), "EM ABERTO", "PAGO") AS statuspgto,
                Fone1,
                LinkQRCode,
                IdParcela,
                IdCobranca

            FROM CobrancasParcelas 


            WHERE IdCliente = ${idcliente}
            AND IdCobranca = ${idcobranca}
        `);

        // Parcelas não encontradas
        if(parcelas.length === 0) {

            return res.status(404).json({
                sucesso: false,
                mensagem: 'Parcelas não encontrado'
            });

        }

        // retorno
        res.json({

            sucesso: true,

            parcelas: parcelas

        });

    } catch (erro) {

        console.error(erro);

        res.status(500).json({
            erro: erro.message
        });

    }

});

// ROTA BAIXA PAGAMENTO
app.post('/baixa-pagamento', async (req, res) => {

    try {
        const {
            idcliente,
            idcobranca,
            idparcela
        } = req.body;

        // validações
        if (
            !numeroValido(idcliente) ||
            !numeroValido(idcobranca) ||
            !numeroValido(idparcela)
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Dados invalidos'
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

        if (parcela.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Parcela nao encontrada'
            });
        }

        // verifica se já foi paga
        if (parcela[0].DataPagamento) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Parcela ja esta paga'
            });
        }

        // BAIXA O PAGAMENTO
        // Mudança essencial: Usando Date() nativo do Access para evitar conflito de formatos de string
        await connection.execute(`
            UPDATE CobrancasParcelas
            SET
                DataPagamento = Date(),
                PagApp = True
            WHERE IdCliente = ${idcliente}
            AND IdCobranca = ${idcobranca}
            AND IdParcela = ${idparcela}
        `);

        res.json({
            sucesso: true,
            mensagem: 'Pagamento baixado com sucesso'
        });

    } catch (erro) {
        // Log detalhado no console do servidor para te ajudar no debug
        console.error("Erro interno na rota /baixa-pagamento:", erro);

        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro interno ao realizar a baixa no banco de dados.',
            erro: erro.message // Retorna a mensagem exata do driver OLEDB/Access
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
