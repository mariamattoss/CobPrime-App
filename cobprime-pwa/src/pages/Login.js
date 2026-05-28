import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Login() {

  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');

  const navigate = useNavigate();

  const handleLogin = async (e) => {

    e.preventDefault();

    setErro('');

    try {

      const response = await api.post(
        '/login',
        {
          login: usuario,
          senha: senha
        }
      );

      // LOGIN OK
      if (response.data.sucesso) {

        const dadosUsuario = response.data.cobrador;

        // salva usuário completo
        localStorage.setItem(
          'usuario',
          JSON.stringify(dadosUsuario)
        );

        // pega IdCobrador
        const idCobrador = dadosUsuario.IdCobrador;

        if (!idCobrador) {

          setErro(
            'Login validado, mas nenhum cobrador foi vinculado a este usuario.'
          );

          return;

        }

        localStorage.setItem(
          'idCobrador',
          idCobrador
        );

        // redireciona
        navigate(`/home/${idCobrador}`);

      }

    } catch (err) {

      console.error(err);

      setErro(
        err.response?.data?.mensagem ||
        'Usuario ou senha incorretos.'
      );

    }

  };

  return (

    <div className="login-screen">

      {/* CARD LOGIN */}
      <div className="login-card text-center">

        {/* LOGO */}
        <div className="mb-4 text-center">

          <img
            src="./LogoPVazul.png"
            alt="Paz no Vale"
            style={{
              width: '150px',
              marginBottom: '5px'
            }}
          />

        </div>

        {/* TITULO */}
        <h4
          className="mb-4"
          style={{ color: 'var(--btn-blue)' }}
        >
          Login
        </h4>

        {/* ERRO */}
        {erro && (

          <div className="alert alert-danger p-2">

            {erro}

          </div>

        )}

        {/* FORM */}
        <form onSubmit={handleLogin}>

          {/* USUARIO */}
          <div className="mb-3">

            <input
              type="text"
              className="form-control"
              placeholder="Usuário"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              required
            />

          </div>

          {/* SENHA */}
          <div className="mb-3">

            <input
              type="password"
              className="form-control"
              placeholder="Senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />

          </div>

          {/* BOTÃO */}
          <button
            type="submit"
            className="btn-custom mb-3"
          >
            Entrar
          </button>

        </form>

        {/* ESQUECI SENHA */}
        <button
          type="button"
          className="forgot-password-button"
        >
          Esqueceu a senha?
        </button>

      </div>

    </div>

  );

}