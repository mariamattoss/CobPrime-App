import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Splash from './pages/Splash';
import Login from './pages/Login';
import Home from './pages/Home';
import InfoCliente from './pages/InfoCliente';
import Pagamento from './pages/Pagamento';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/home/:idCobrador" element={<Home />} />
        <Route path="/cliente/:idcobranca/:idcliente" element={<InfoCliente />} />
        <Route path="/pagamento/:idcobranca/:idcliente" element={<Pagamento />} />
      </Routes>
    </Router>
  );
}

export default App;