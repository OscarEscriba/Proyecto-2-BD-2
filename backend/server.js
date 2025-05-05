const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Variables de entorno
const PORT = process.env.PORT || 4000;
const client = new MongoClient(process.env.MONGODB_URI);
let db;

// Conectar a MongoDB
client.connect().then(() => {
  db = client.db('Proyecto2');
  console.log('✅ Conectado a MongoDB Atlas');
});

/* Middleware para verificar autenticación
function verificarToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(403).json({ error: 'Token inválido' });
  }
} 
*/

// Registro de usuario (Crear un nuevo usuario)
// Se espera que el body contenga nombre, email, contraseña, telefono y tipo (admin o cliente) 
app.post('/auth/register', async (req, res) => {
  const { nombre, email, contraseña, telefono, tipo } = req.body;
  const existe = await db.collection('Usuario').findOne({ email });
  if (existe) return res.status(400).json({ error: 'Usuario ya existe' });

  const hash = await bcrypt.hash(contraseña, 10);
  await db.collection('Usuario').insertOne({ nombre, email, contraseña: hash, telefono, tipo });
  res.json({ mensaje: 'Usuario creado' });
});

// Login de usuario
app.post('/auth/login', async (req, res) => {
  const { email, contraseña } = req.body;
  const usuario = await db.collection('Usuario').findOne({ email });
  
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
  if (!await bcrypt.compare(contraseña, usuario.contraseña)) {
    return res.status(403).json({ error: 'Contraseña incorrecta' });
  }

  // Enviar datos básicos del usuario
  res.json({
    id: usuario._id,
    email: usuario.email,
    tipo: usuario.tipo
  });
});

// Crear restaurante (solo admin)
app.post('/restaurantes', async (req, res) => {
  if (req.user.tipo !== 'admin') return res.status(403).json({ error: 'Solo admin puede crear' });
  const nuevo = req.body;
  const result = await db.collection('restaurantes').insertOne(nuevo);
  res.json(result);
});

// Obtener todos los restaurantes
app.get('/restaurantes', async (req, res) => {
  const filtros = {};
  if (req.query.nombre) filtros.nombre = { $regex: req.query.nombre, $options: 'i' };
  if (req.query.ubicacion) filtros.ubicacion = { $regex: req.query.ubicacion, $options: 'i' };

  const restaurantes = await db.collection('restaurantes').find(filtros).toArray();
  res.json(restaurantes);
});

// Obtener menú de un restaurante
app.get('/restaurantes/:id/menu', async (req, res) => {
  const { id } = req.params;
  const restaurante = await db.collection('restaurantes').findOne({ _id: new ObjectId(id) });
  if (!restaurante) return res.status(404).json({ error: 'Restaurante no encontrado' });
  res.json(restaurante.menu_resumido || []);
});

// NUEVOS ENDPOINTS
// PARA USUARIO ADMININSTRADOR 
// Obtener todos los pedidos (admin)
app.get('/pedidos/admin', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 15;
  const skip = (page - 1) * limit;

  try {
    const [pedidos, total] = await Promise.all([
      db.collection('Pedidos')
        .find()
        .sort({ Fecha: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      
      db.collection('Pedidos').countDocuments()
    ]);

    res.json({
      pedidos,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalPedidos: total
    });

  } catch (err) {
    console.error('Error al obtener pedidos:', err);
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
});

// Eliminar múltiples pedidos
app.delete('/pedidos/multiples', async (req, res) => {
  const { ids } = req.body;
  
  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json({ error: 'IDs inválidos' });
  }

  try {
    const objectIds = ids.map(id => new ObjectId(id));
    const result = await db.collection('Pedidos').deleteMany({
      _id: { $in: objectIds }
    });
    
    res.json({
      mensaje: `${result.deletedCount} pedidos eliminados`
    });
    
  } catch (err) {
    console.error('Error eliminando pedidos:', err);
    res.status(500).json({ error: 'Error al eliminar pedidos' });
  }
});

// Actualizar estado de múltiples pedidos
app.put('/pedidos/actualizar-estado', async (req, res) => {
  const { ids, nuevoEstado } = req.body;

  if (!ids || !Array.isArray(ids) || !nuevoEstado) {
    return res.status(400).json({ error: 'Parámetros inválidos' });
  }

  try {
    const objectIds = ids.map(id => new ObjectId(id));
    const result = await db.collection('Pedidos').updateMany(
      { _id: { $in: objectIds } },
      { $set: { Estado: nuevoEstado } }
    );
    
    res.json({
      mensaje: `${result.modifiedCount} pedidos actualizados`
    });
    
  } catch (err) {
    console.error('Error actualizando pedidos:', err);
    res.status(500).json({ error: 'Error al actualizar pedidos' });
  }
});

// Eliminar un pedido por parte del cliente
app.delete('/pedidos/:id', async (req, res) => {
  const { id } = req.params;
  const { usuarioId } = req.body || {};

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'ID de pedido inválido' });
  }

  try {
    let filtro;
    if (usuarioId) {
      // Elimina solo si el pedido pertenece al usuario (cliente)
      if (!ObjectId.isValid(usuarioId)) {
        return res.status(400).json({ error: 'ID de usuario inválido' });
      }
      filtro = { _id: new ObjectId(id), Usuario_id: new ObjectId(usuarioId) };
    } else {
      // Elimina solo por ID (admin)
      filtro = { _id: new ObjectId(id) };
    }

    const result = await db.collection('Pedidos').deleteOne(filtro);

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado o no autorizado' });
    }

    res.json({ mensaje: 'Pedido eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar el pedido' });
  }
});

// PARA CLIENTE 

// ENDPOINTS PARA MOSTRAR
// Filtrar productos por tipo y ordenar por precio
// Proyeccion (no se muestran toods los campos), Filtro y Ordenar 
app.get('/productos', async (req, res) => {
  const { Categoría, ordenar } = req.query;

  const filtro = {};
  if (Categoría) filtro.Categoría = Categoría; // ejemplo: "Plato", "Entrante", etc.

  const proyeccion = {
    Nombre: 1,
    Descripción: 1,
    Precio: 1,
    Ingredientes: 1,
    _id: 0
  };

  const orden = ordenar === 'desc' ? -1 : 1;

  try {
    const productos = await db.collection('Productos')
      .find(filtro)
      .project(proyeccion)
      .sort({ Precio: orden })
      .toArray();

    res.json(productos);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener productos', detalles: err });
  }
});

// Obtener pedidos del usuario con filtro por estado
app.get('/pedidos', async (req, res) => {
  const { usuarioId, estado } = req.query;

  if (!usuarioId || !ObjectId.isValid(usuarioId)) {
    return res.status(400).json({ error: 'ID de usuario inválido' });
  }

  try {
    const filtro = { 
      Usuario_id: new ObjectId(usuarioId), // Campo corregido
      ...(estado && { Estado: estado })
    };

    const pedidos = await db.collection('Pedidos')
      .find(filtro)
      .sort({ Fecha: -1 })
      .project({ Usuario_id: 0 }) // Excluir campo de usuario
      .toArray();

    res.json(pedidos);
    
  } catch (err) {
    console.error('Error al obtener pedidos:', err);
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
});


// Crear múltiples pedidos (tickets) LISTO
app.post('/pedidos/multiples', async (req, res) => {
  const { usuarioId, tickets } = req.body; // Recibimos ID directamente

   // Validar ID
   if (!usuarioId || !ObjectId.isValid(usuarioId)) {
    return res.status(400).json({ error: 'ID de usuario inválido' });
  }


  try {
    // Validar estructura
    if (!Array.isArray(tickets)) {
      return res.status(400).json({ error: 'Se requiere un array de pedidos' });
    }

    const pedidosConMetadata = tickets.map(ticket => ({
      ...ticket,
      Usuario_id: new ObjectId(usuarioId), // ID de usuario
      Estado: 'pendiente',
      Fecha: new Date().toISOString()
    }));

    const result = await db.collection('Pedidos').insertMany(pedidosConMetadata);
    
    res.json({
      mensaje: `${result.insertedCount} pedidos creados exitosamente`,
      ids: Object.values(result.insertedIds)
    });

  } catch (err) {
    console.error('Error creando pedidos:', err);
    res.status(500).json({ error: 'Error al crear pedidos' });
  }
});

// Servidor corriendo
app.listen(PORT, () => {
  console.log(`🚀 Servidor Express corriendo en http://localhost:${PORT}`);
});
