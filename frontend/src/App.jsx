import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Login from './Login'; // Ahora será .jsx
import Register from './Registro';
import Principal from './Principal';
import EstadoPedidos from './EstadoPedidos';
import CrearPedidos from './CrearPedidos';
import PaginaPrincipalAdministrador from './PaginaPrincipalAdminstrador';
function App() {
  const isAdmin = () => {
    const token = localStorage.getItem('token');
    if (!token) return false;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.tipo === 'admin';
  };

  return (
    <Router>
      <Routes>
        <Route path="/Login" element={<Login />} />
        <Route path="/" element={<Register />} />
        <Route path="/PaginaPrincipal" element={<Principal />} />
        <Route path="/EstadoPedidos" element={<EstadoPedidos />} />
        <Route path="/CrearPedidos" element={<CrearPedidos />} />
        <Route path="/PaginaPrincipalAdministrador" element={<PaginaPrincipalAdministrador />} />
      </Routes>
    </Router>
  );
}

export default App;