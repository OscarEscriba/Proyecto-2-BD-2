import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

  const Registro = () => {
    const [userData, setUserData] = useState({
      nombre: '',
      email: '',
      contraseña: '',
      telefono: '',
      tipo: 'cliente'
    });
  
    const navigate = useNavigate();
  
    const handleRegister = async (e) => {
      e.preventDefault();
      try {
        await fetch('http://localhost:4000/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData)
        });
        alert('Usuario registrado!');
        navigate('/Login'); // Redirigir a la página de login
      } catch (error) {
        alert('Error al registrar');
      }
    };
  
    return (
      <div>
        <h1>Registro</h1>
        <form onSubmit={handleRegister}>
          <input placeholder="Nombre" value={userData.nombre} 
            onChange={(e) => setUserData({...userData, nombre: e.target.value})} />
          <input type="email" placeholder="Email" 
            onChange={(e) => setUserData({...userData, email: e.target.value})} />
          <input type="password" placeholder="Contraseña" 
            onChange={(e) => setUserData({...userData, contraseña: e.target.value})} />
          <input placeholder="Teléfono"
            onChange={(e) => setUserData({...userData, telefono: e.target.value})} /> 
          <button type="submit">Registrarse</button>
        </form>
      {/* Nuevo botón "Sign In" */}
      <div>
        <label>Ya tienes cuenta? </label>
      <Link to="/Login">
        <button>Sign In</button>
      </Link>
      </div>
      </div>
    );
  };
  
  export default Registro;
