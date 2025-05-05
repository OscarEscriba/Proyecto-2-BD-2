import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:4000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, contraseña: password })
      });
      
      const userData = await response.json();
      if (response.ok) {
        localStorage.setItem('currentUser', JSON.stringify(userData));
         // Redirección basada en el tipo de usuario
            if (userData.tipo === 'administrador') {
                navigate('/PaginaPrincipalAdministrador');
            } else {
                navigate('/PaginaPrincipal');
            }
      } 
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div style={styles.container}>
    <h2 style={styles.title}>Inicio de Sesión</h2>
    <form onSubmit={handleLogin} style={styles.form}>
      <input
        type="email"
        placeholder="Correo electrónico"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={styles.input}
        required
      />
      <input
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={styles.input}
        required
      />
      <button type="submit" style={styles.button}>
        Ingresar
      </button>
    </form>
  </div>
);
}

const styles = {
container: {
  maxWidth: '400px',
  margin: '2rem auto',
  padding: '20px',
  borderRadius: '8px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
},
title: {
  textAlign: 'center',
  color: '#2c3e50',
  marginBottom: '1.5rem'
},
form: {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem'
},
input: {
  padding: '10px',
  borderRadius: '4px',
  border: '1px solid #ddd',
  fontSize: '1rem'
},
button: {
  padding: '12px',
  backgroundColor: '#3498db',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '1rem',
  fontWeight: 'bold',
  ':hover': {
    backgroundColor: '#2980b9'
  }
}
}