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
    // Verificar conexión a MongoDB
    if (!db) {
      console.error('❌ ERROR CRÍTICO: No hay conexión a la base de datos');
      await client.connect();
      db = client.db('Proyecto2');
    }
    
    // Obtener todas las colecciones donde pueden estar los pedidos
    const colecciones = await db.listCollections().toArray();
    const nombreColecciones = colecciones.map(col => col.name);
    
    // Colecciones donde buscar pedidos (primero las más probables)
    const coleccionesPedidos = ['Pedidos', 'pedidos', 'PEDIDOS', 'orders', 'Pedidos2'];
    
    // Añadir otras colecciones que puedan existir
    for (const col of nombreColecciones) {
      if (!coleccionesPedidos.includes(col) && 
          col !== 'Usuario' && 
          col !== 'Resenas' && 
          col !== 'system.views') {
        coleccionesPedidos.push(col);
      }
    }
    
    // Buscar pedidos en todas las colecciones
    let todosPedidos = [];
    let totalPedidos = 0;
    
    for (const coleccion of coleccionesPedidos) {
      if (!nombreColecciones.includes(coleccion)) {
        continue;
      }
      
      try {
        // Obtener el total de pedidos en esta colección
        const countPedidos = await db.collection(coleccion).countDocuments();
        totalPedidos += countPedidos;
        
        // Si hay pedidos, obtener los pedidos para esta página
        if (countPedidos > 0) {
          const pedidosEnColeccion = await db.collection(coleccion)
            .find()
            .sort({ Fecha: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();
          
          // Formatear y añadir información de la colección
          const formateados = pedidosEnColeccion.map(p => ({
            ...p,
            _id: p._id.toString(),
            Usuario_id: typeof p.Usuario_id === 'object' ? p.Usuario_id.toString() : p.Usuario_id,
            _coleccion: coleccion
          }));
          
          todosPedidos = [...todosPedidos, ...formateados];
        }
      } catch (err) {
        console.error(`Error al buscar en colección "${coleccion}":`, err.message);
      }
    }
    
    // Ordenar todos los pedidos por fecha
    todosPedidos.sort((a, b) => {
      const fechaA = a.Fecha || a.fecha || a.date || '';
      const fechaB = b.Fecha || b.fecha || b.date || '';
      return new Date(fechaB) - new Date(fechaA); // Más recientes primero
    });
    
    // Limitar al número especificado para esta página
    todosPedidos = todosPedidos.slice(0, limit);
    
    // Eliminar el campo _coleccion antes de enviar
    todosPedidos = todosPedidos.map(p => {
      const { _coleccion, ...resto } = p;
      return resto;
    });

    res.json({
      pedidos: todosPedidos,
      currentPage: page,
      totalPages: Math.ceil(totalPedidos / limit),
      totalPedidos: totalPedidos
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
    // Verificar conexión a MongoDB
    if (!db) {
      console.error('❌ ERROR CRÍTICO: No hay conexión a la base de datos');
      await client.connect();
      db = client.db('Proyecto2');
    }
    
    const objectIds = ids.map(id => new ObjectId(id));
    
    // Obtener todas las colecciones
    const colecciones = await db.listCollections().toArray();
    const nombreColecciones = colecciones.map(col => col.name);
    
    // Colecciones donde buscar pedidos
    const coleccionesPedidos = ['Pedidos', 'pedidos', 'PEDIDOS'].filter(
      col => nombreColecciones.includes(col)
    );
    
    let totalEliminados = 0;
    
    // Intentar eliminar de todas las colecciones posibles
    for (const coleccion of coleccionesPedidos) {
      try {
        const result = await db.collection(coleccion).deleteMany({
          _id: { $in: objectIds }
        });
        
        totalEliminados += result.deletedCount;
      } catch (err) {
        console.error(`Error al eliminar de colección "${coleccion}":`, err.message);
      }
    }
    
    res.json({
      mensaje: `${totalEliminados} pedidos eliminados`
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
    // Verificar conexión a MongoDB
    if (!db) {
      console.error('❌ ERROR CRÍTICO: No hay conexión a la base de datos');
      await client.connect();
      db = client.db('Proyecto2');
    }
    
    const objectIds = ids.map(id => new ObjectId(id));
    
    // Obtener todas las colecciones
    const colecciones = await db.listCollections().toArray();
    const nombreColecciones = colecciones.map(col => col.name);
    
    // Colecciones donde buscar pedidos
    const coleccionesPedidos = ['Pedidos', 'pedidos', 'PEDIDOS', 'orders', 'Pedidos2'].filter(
      col => nombreColecciones.includes(col)
    );
    
    let totalActualizados = 0;
    
    for (const coleccion of coleccionesPedidos) {
      try {
        const result = await db.collection(coleccion).updateMany(
          { _id: { $in: objectIds } },
          { $set: { Estado: nuevoEstado } }
        );
        
        totalActualizados += result.modifiedCount;
      } catch (err) {
        console.error(`Error al actualizar en colección "${coleccion}":`, err.message);
      }
    }
    
    res.json({
      mensaje: `${totalActualizados} pedidos actualizados`
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
    // Verificar conexión a MongoDB
    if (!db) {
      console.error('❌ ERROR CRÍTICO: No hay conexión a la base de datos');
      await client.connect();
      db = client.db('Proyecto2');
    }
    
    // Obtener todas las colecciones
    const colecciones = await db.listCollections().toArray();
    const nombreColecciones = colecciones.map(col => col.name);
    
    // Colecciones donde buscar pedidos
    const coleccionesPedidos = ['Pedidos', 'pedidos', 'PEDIDOS', 'orders', 'Pedidos2'].filter(
      col => nombreColecciones.includes(col)
    );
    
    const pedidoId = new ObjectId(id);
    let totalEliminados = 0;
    
    for (const coleccion of coleccionesPedidos) {
      try {
        let filtro;
        if (usuarioId) {
          // Elimina solo si el pedido pertenece al usuario (cliente)
          if (!ObjectId.isValid(usuarioId)) {
            return res.status(400).json({ error: 'ID de usuario inválido' });
          }
          filtro = { 
            _id: pedidoId,
            $or: [
              { Usuario_id: new ObjectId(usuarioId) },
              { Usuario_id: usuarioId },
              { usuario_id: new ObjectId(usuarioId) },
              { usuario_id: usuarioId }
            ]
          };
        } else {
          // Elimina solo por ID (admin)
          filtro = { _id: pedidoId };
        }

        const result = await db.collection(coleccion).deleteOne(filtro);
        totalEliminados += result.deletedCount;
        
        if (result.deletedCount > 0) {
          break; // Si se elimina de una colección, no es necesario seguir
        }
      } catch (err) {
        console.error(`Error al eliminar de colección "${coleccion}":`, err.message);
      }
    }

    if (totalEliminados === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado o no autorizado' });
    }

    res.json({ mensaje: 'Pedido eliminado correctamente' });
  } catch (err) {
    console.error('Error al eliminar pedido:', err);
    res.status(500).json({ error: 'Error al eliminar el pedido' });
  }
});

// Eliminar todos los pedidos de un usuario
app.delete('/pedidos/usuario/:usuarioId', async (req, res) => {
  const { usuarioId } = req.params;
  if (!ObjectId.isValid(usuarioId)) {
    return res.status(400).json({ error: 'ID de usuario inválido' });
  }
  try {
    // Verificar conexión a MongoDB
    if (!db) {
      console.error('❌ ERROR CRÍTICO: No hay conexión a la base de datos');
      await client.connect();
      db = client.db('Proyecto2');
    }
    
    // Obtener todas las colecciones
    const colecciones = await db.listCollections().toArray();
    const nombreColecciones = colecciones.map(col => col.name);
    
    // Colecciones donde buscar pedidos
    const coleccionesPedidos = ['Pedidos', 'pedidos', 'PEDIDOS', 'orders', 'Pedidos2'].filter(
      col => nombreColecciones.includes(col)
    );
    
    let totalEliminados = 0;
    
    for (const coleccion of coleccionesPedidos) {
      try {
        const result = await db.collection(coleccion).deleteMany({
          $or: [
            { Usuario_id: new ObjectId(usuarioId) },
            { Usuario_id: usuarioId },
            { usuario_id: new ObjectId(usuarioId) },
            { usuario_id: usuarioId }
          ]
        });
        
        totalEliminados += result.deletedCount;
      } catch (err) {
        console.error(`Error al eliminar de colección "${coleccion}":`, err.message);
      }
    }
    
    res.json({ mensaje: `${totalEliminados} pedidos eliminados` });
  } catch (err) {
    console.error('Error al eliminar pedidos:', err);
    res.status(500).json({ error: 'Error al eliminar los pedidos' });
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

// Verificar colección Pedidos
async function verificarColeccionPedidos() {
  try {
    // Verificar si la colección existe
    const collections = await db.listCollections({name: 'Pedidos'}).toArray();
    if (collections.length === 0) {
      await db.createCollection('Pedidos');
      return false; // Indica que la colección no existía
    }
    return true; // Indica que la colección ya existía
  } catch (err) {
    console.error('❌ Error al verificar/crear colección Pedidos:', err);
    return false;
  }
}

// Obtener pedidos del usuario con filtro por estado
app.get('/pedidos', async (req, res) => {
  const { usuarioId, estado } = req.query;

  if (!usuarioId) {
    return res.status(400).json({ error: 'ID de usuario no proporcionado' });
  }

  if (!ObjectId.isValid(usuarioId)) {
    return res.status(400).json({ error: 'ID de usuario inválido' });
  }

  try {
    // Verificar conexión a MongoDB
    if (!db) {
      console.error('❌ ERROR CRÍTICO: No hay conexión a la base de datos');
      await client.connect();  // Intentar conectar de nuevo
      db = client.db('Proyecto2');
    }
    
    // Verificar y crear la colección si no existe
    const coleccionExiste = await verificarColeccionPedidos();
    
    // Obtener todas las colecciones donde pueden estar los pedidos
    const colecciones = await db.listCollections().toArray();
    const nombreColecciones = colecciones.map(col => col.name);
    
    // Colecciones donde buscar pedidos (primero las más probables)
    const coleccionesPedidos = ['Pedidos', 'pedidos', 'PEDIDOS', 'orders', 'Pedidos2'];
    
    // Añadir otras colecciones que puedan existir
    for (const col of nombreColecciones) {
      if (!coleccionesPedidos.includes(col) && 
          col !== 'Usuario' && 
          col !== 'Resenas' && 
          col !== 'system.views') {
        coleccionesPedidos.push(col);
      }
    }
    
    // Buscar en todas las colecciones
    let todosPedidos = [];
    
    for (const coleccion of coleccionesPedidos) {
      if (!nombreColecciones.includes(coleccion)) {
        continue;
      }
      
      try {
        // Buscar con ObjectId
        const filtroObjectId = {
          Usuario_id: new ObjectId(usuarioId),
          ...(estado && { Estado: estado })
        };
        
        const pedidosObjectId = await db.collection(coleccion)
          .find(filtroObjectId)
          .sort({ Fecha: -1 })
          .toArray();
        
        if (pedidosObjectId.length > 0) {
          // Formatear y añadir a la lista total
          const formateados = pedidosObjectId.map(p => ({
            ...p,
            _id: p._id.toString(),
            Usuario_id: typeof p.Usuario_id === 'object' ? p.Usuario_id.toString() : p.Usuario_id,
            _coleccion: coleccion // Añadir info de la colección
          }));
          
          todosPedidos = [...todosPedidos, ...formateados];
          continue; // Seguir con la siguiente colección
        }
        
        // Si no encontramos con ObjectId, probar como string
        const filtroString = {
          Usuario_id: usuarioId,
          ...(estado && { Estado: estado })
        };
        
        const pedidosString = await db.collection(coleccion)
          .find(filtroString)
          .sort({ Fecha: -1 })
          .toArray();
        
        if (pedidosString.length > 0) {
          // Formatear y añadir a la lista total
          const formateados = pedidosString.map(p => ({
            ...p,
            _id: p._id.toString(),
            Usuario_id: typeof p.Usuario_id === 'object' ? p.Usuario_id.toString() : p.Usuario_id,
            _coleccion: coleccion // Añadir info de la colección
          }));
          
          todosPedidos = [...todosPedidos, ...formateados];
          continue; // Seguir con la siguiente colección
        }
        
        // Último intento: buscar con patrones flexibles
        const filtroFlexible = {
          $or: [
            { Usuario_id: new ObjectId(usuarioId) },
            { Usuario_id: usuarioId },
            { usuario_id: new ObjectId(usuarioId) },
            { usuario_id: usuarioId },
            { user_id: new ObjectId(usuarioId) },
            { user_id: usuarioId }
          ]
        };
        
        if (estado) {
          filtroFlexible.$and = [{
            $or: [
              { Estado: estado },
              { estado: estado },
              { status: estado }
            ]
          }];
        }
        
        const pedidosFlexibles = await db.collection(coleccion)
          .find(filtroFlexible)
          .sort({ Fecha: -1 })
          .toArray();
        
        if (pedidosFlexibles.length > 0) {
          // Formatear y añadir a la lista total
          const formateados = pedidosFlexibles.map(p => ({
            ...p,
            _id: p._id.toString(),
            Usuario_id: typeof p.Usuario_id === 'object' ? 
                       p.Usuario_id.toString() : 
                       (p.Usuario_id || p.usuario_id || p.user_id || usuarioId),
            _coleccion: coleccion // Añadir info de la colección
          }));
          
          todosPedidos = [...todosPedidos, ...formateados];
        }
        
      } catch (err) {
        console.error(`Error al buscar en colección "${coleccion}":`, err.message);
      }
    }
    
    // Ordenar todos los pedidos por fecha
    todosPedidos.sort((a, b) => {
      const fechaA = a.Fecha || a.fecha || a.date || '';
      const fechaB = b.Fecha || b.fecha || b.date || '';
      return new Date(fechaB) - new Date(fechaA); // Más recientes primero
    });
    
    // Eliminar el campo _coleccion antes de enviar los datos
    todosPedidos = todosPedidos.map(p => {
      const { _coleccion, ...resto } = p;
      return resto;
    });
    
    res.json(todosPedidos);
    
  } catch (err) {
    console.error('Error al obtener pedidos:', err);
    res.status(500).json({ error: 'Error al obtener pedidos: ' + err.message });
  }
});


// Crear múltiples pedidos (tickets)
app.post('/pedidos/multiples', async (req, res) => {
  const { usuarioId, tickets } = req.body; // Recibimos ID directamente

  // Validar ID
  if (!usuarioId) {
    return res.status(400).json({ error: 'ID de usuario no proporcionado' });
  }
   
  if (!ObjectId.isValid(usuarioId)) {
    return res.status(400).json({ error: 'ID de usuario inválido' });
  }

  try {
    // Validar estructura
    if (!tickets || !Array.isArray(tickets)) {
      return res.status(400).json({ error: 'Se requiere un array de pedidos' });
    }
    
    // Verificar conexión a MongoDB
    if (!db) {
      console.error('❌ ERROR CRÍTICO: No hay conexión a la base de datos');
      await client.connect();  // Intentar conectar de nuevo
      db = client.db('Proyecto2');
    }
    
    // Verificar y crear la colección si no existe
    await verificarColeccionPedidos();
    
    const pedidosConMetadata = tickets.map(ticket => {
      // Asegurarnos de que los productos tengan toda la información necesaria
      const productosFormateados = Array.isArray(ticket.productos) 
        ? ticket.productos.map(producto => {
            // Garantizar que cada producto tenga los campos necesarios
            return {
              _id: producto._id || String(Math.random()).substring(2, 10),
              nombre: producto.nombre || producto.Nombre || 'Producto sin nombre',
              precio: producto.precio || producto.Precio || 0,
              cantidad: producto.cantidad || 1
            };
          })
        : [];
      
      // Estructura base del pedido
      const pedido = {
        Usuario_id: new ObjectId(usuarioId), // ID de usuario
        productos: productosFormateados, // Guardar con la p minúscula para consistencia
        total: ticket.total || 0,
        estado: "pendiente", // Guardar con la e minúscula para consistencia
        fecha: new Date().toISOString(), // Guardar con la f minúscula para consistencia
        tipo_entrega: ticket.tipo_entrega
      };
      
      // Si es entrega a domicilio, añadimos la información de ubicación
      if (ticket.tipo_entrega === 'domicilio' && ticket.ubicacion) {
        pedido.ubicacion = {
          coordenadas: ticket.ubicacion.coordenadas,
          direccion: ticket.ubicacion.direccion
        };
      }
      
      return pedido;
    });
    
    // Intentar diferentes nombres de colección para la inserción
    let result = null;
    let coleccionUsada = 'Pedidos';
    const opcionesEscritura = { writeConcern: { w: 1, j: true, wtimeout: 5000 } };
    
    try {
      result = await db.collection('Pedidos').insertMany(pedidosConMetadata, opcionesEscritura);
    } catch (errPedidos) {
      console.error('❌ Error al insertar en "Pedidos":', errPedidos);
      
      // Intentar con "pedidos" (minúsculas)
      try {
        result = await db.collection('pedidos').insertMany(pedidosConMetadata, opcionesEscritura);
        coleccionUsada = 'pedidos';
      } catch (errMinusculas) {
        console.error('❌ Error al insertar en "pedidos":', errMinusculas);
        
        // Último intento: crear colección "Pedidos2" y usar esa
        try {
          await db.createCollection('Pedidos2');
          result = await db.collection('Pedidos2').insertMany(pedidosConMetadata, opcionesEscritura);
          coleccionUsada = 'Pedidos2';
        } catch (errUltimo) {
          console.error('❌ Todos los intentos fallaron:', errUltimo);
          throw new Error('No se pudo insertar en ninguna colección: ' + errUltimo.message);
        }
      }
    }
    
    if (!result || !result.acknowledged) {
      throw new Error('La operación no fue reconocida por MongoDB');
    }
    
    const idsInsertados = Object.values(result.insertedIds).map(id => id.toString());
    
    res.json({
      mensaje: `${result.insertedCount} pedidos creados exitosamente`,
      ids: idsInsertados,
      coleccion: coleccionUsada // Devolver qué colección se usó
    });

  } catch (err) {
    console.error('Error creando pedidos:', err);
    res.status(500).json({ error: 'Error al crear pedidos: ' + err.message });
  }
});

// ===== ENDPOINTS PARA RESEÑAS =====

// 1. Obtener todas las reseñas del restaurante
app.get('/resenas/restaurante', async (req, res) => {
  try {
    const { orden } = req.query;
    
    let sortOption = { fecha: -1 }; // Por defecto, las más recientes primero
    
    if (orden === 'calificacion_desc') {
      sortOption = { calificacion: -1 };
    } else if (orden === 'calificacion_asc') {
      sortOption = { calificacion: 1 };
    }
    
    const resenas = await db.collection('Resenas')
      .find({ tipo: 'restaurante' })
      .sort(sortOption)
      .toArray();
      
    res.json(resenas);
  } catch (err) {
    console.error('Error al obtener reseñas del restaurante:', err);
    res.status(500).json({ error: 'Error al obtener reseñas' });
  }
});

// 2. Crear una reseña para el restaurante
app.post('/resenas/restaurante', async (req, res) => {
  console.log('Recibida solicitud POST a /resenas/restaurante');
  console.log('Cuerpo de la solicitud:', req.body);
  
  try {
    const { usuario_id, calificacion, comentario } = req.body;
    
    // Verificar datos recibidos
    console.log('ID de usuario recibido:', usuario_id);
    console.log('Calificación recibida:', calificacion);
    console.log('Comentario recibido:', comentario);
    
    if (!usuario_id) {
      console.error('Error: ID de usuario no proporcionado');
      return res.status(400).json({ error: 'ID de usuario no proporcionado' });
    }
    
    if (!ObjectId.isValid(usuario_id)) {
      console.error('Error: ID de usuario inválido');
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }
    
    if (!calificacion || calificacion < 1 || calificacion > 5) {
      console.error('Error: Calificación inválida');
      return res.status(400).json({ error: 'Calificación inválida (debe ser 1-5)' });
    }
    
    if (!comentario || comentario.trim() === '') {
      console.error('Error: Comentario no proporcionado');
      return res.status(400).json({ error: 'El comentario es requerido' });
    }
    
    // Obtener información del usuario
    console.log('Buscando usuario con ID:', usuario_id);
    const usuario = await db.collection('Usuario').findOne({ _id: new ObjectId(usuario_id) });
    if (!usuario) {
      console.error('Error: Usuario no encontrado para ID:', usuario_id);
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    console.log('Usuario encontrado:', usuario.email);
    
    const nuevaResena = {
      tipo: 'restaurante',
      usuario_id: new ObjectId(usuario_id),
      calificacion: parseInt(calificacion),
      comentario,
      fecha: new Date().toISOString(),
      usuario: {
        nombre: usuario.nombre || usuario.email.split('@')[0]
      }
    };
    
    console.log('Intentando insertar reseña:', nuevaResena);
    const result = await db.collection('Resenas').insertOne(nuevaResena);
    console.log('Reseña insertada con ID:', result.insertedId);
    
    res.status(201).json({
      _id: result.insertedId,
      mensaje: 'Reseña publicada con éxito'
    });
  } catch (err) {
    console.error('Error al crear reseña del restaurante:', err);
    res.status(500).json({ error: 'Error al crear reseña: ' + err.message });
  }
});

// 3. Eliminar una reseña del restaurante
app.delete('/resenas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario_id } = req.body;
    
    if (!id || !ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID de reseña inválido' });
    }
    
    if (!usuario_id || !ObjectId.isValid(usuario_id)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }
    
    // Solo permitir que el autor de la reseña la elimine
    const result = await db.collection('Resenas').deleteOne({
      _id: new ObjectId(id),
      usuario_id: new ObjectId(usuario_id)
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ 
        error: 'Reseña no encontrada o no tienes permiso para eliminarla' 
      });
    }
    
    res.json({ mensaje: 'Reseña eliminada correctamente' });
  } catch (err) {
    console.error('Error al eliminar reseña:', err);
    res.status(500).json({ error: 'Error al eliminar reseña' });
  }
});

// 4. Obtener reseñas de un producto específico
app.get('/resenas/producto/:productoId', async (req, res) => {
  try {
    const { productoId } = req.params;
    const { orden } = req.query;
    
    if (!productoId) {
      return res.status(400).json({ error: 'ID de producto es requerido' });
    }
    
    let sortOption = { fecha: -1 }; // Por defecto, las más recientes primero
    
    if (orden === 'calificacion_desc') {
      sortOption = { calificacion: -1 };
    } else if (orden === 'calificacion_asc') {
      sortOption = { calificacion: 1 };
    }
    
    const resenas = await db.collection('Resenas')
      .find({ 
        tipo: 'producto',
        producto_id: productoId 
      })
      .sort(sortOption)
      .toArray();
      
    res.json(resenas);
  } catch (err) {
    console.error('Error al obtener reseñas del producto:', err);
    res.status(500).json({ error: 'Error al obtener reseñas' });
  }
});

// 5. Crear una reseña para un producto
app.post('/resenas/producto', async (req, res) => {
  try {
    const { usuario_id, producto_id, calificacion, comentario } = req.body;
    
    if (!usuario_id || !ObjectId.isValid(usuario_id)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }
    
    if (!producto_id) {
      return res.status(400).json({ error: 'ID de producto es requerido' });
    }
    
    if (!calificacion || calificacion < 1 || calificacion > 5) {
      return res.status(400).json({ error: 'Calificación inválida (debe ser 1-5)' });
    }
    
    if (!comentario || comentario.trim() === '') {
      return res.status(400).json({ error: 'El comentario es requerido' });
    }
    
    // Obtener información del usuario
    const usuario = await db.collection('Usuario').findOne({ _id: new ObjectId(usuario_id) });
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    const nuevaResena = {
      tipo: 'producto',
      usuario_id: new ObjectId(usuario_id),
      producto_id,
      calificacion: parseInt(calificacion),
      comentario,
      fecha: new Date().toISOString(),
      usuario: {
        nombre: usuario.nombre || usuario.email.split('@')[0]
      }
    };
    
    const result = await db.collection('Resenas').insertOne(nuevaResena);
    
    res.status(201).json({
      _id: result.insertedId,
      mensaje: 'Reseña publicada con éxito'
    });
  } catch (err) {
    console.error('Error al crear reseña del producto:', err);
    res.status(500).json({ error: 'Error al crear reseña' });
  }
});

// Servidor corriendo
app.listen(PORT, () => {
  console.log(`🚀 Servidor Express corriendo en http://localhost:${PORT}`);
});
