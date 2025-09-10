const express = require('express');
const axios = require('axios');
const router = express.Router();

// Variables de entorno para Tienda Nube
const TIENDANUBE_CLIENT_ID = process.env.TIENDANUBE_CLIENT_ID;
const TIENDANUBE_CLIENT_SECRET = process.env.TIENDANUBE_CLIENT_SECRET;
const TIENDANUBE_REDIRECT_URI = process.env.TIENDANUBE_REDIRECT_URI || `http://localhost:${process.env.PORT || 3000}/tiendanube/callback`;

// ===================================================================
// TIENDA NUBE OAUTH - Iniciar flujo de autorización
// ===================================================================
router.get('/auth', (req, res) => {
    console.log('🛍️ Iniciando flujo OAuth de Tienda Nube...');
    
    if (!TIENDANUBE_CLIENT_ID) {
        return res.status(500).json({
            error: 'TIENDANUBE_CLIENT_ID no configurado',
            message: 'Configura TIENDANUBE_CLIENT_ID en las variables de entorno'
        });
    }
    
    // Generar estado único para seguridad CSRF
    const state = 'tn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // URL de autorización de Tienda Nube
    const authUrl = new URL('https://www.tiendanube.com/apps/authorize/auth');
    authUrl.searchParams.append('client_id', TIENDANUBE_CLIENT_ID);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('redirect_uri', TIENDANUBE_REDIRECT_URI);
    
    console.log('🔗 URL de autorización generada:', authUrl.toString());
    console.log('🔐 Estado CSRF:', state);
    
    // Redirigir al usuario a Tienda Nube para autorización
    res.redirect(authUrl.toString());
});

// ===================================================================
// TIENDA NUBE CALLBACK - Recibir código de autorización
// ===================================================================
router.get('/callback', async (req, res) => {
    console.log('🔄 Callback de Tienda Nube recibido');
    console.log('📋 Query parameters:', req.query);
    
    const { code, state, error } = req.query;
    
    // Verificar si hay error en la autorización
    if (error) {
        console.error('❌ Error en autorización:', error);
        return res.send(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Error - Tienda Nube</title>
                <link rel="stylesheet" href="/css/styles.css">
            </head>
            <body>
                <div class="container">
                    <div class="error">
                        <h2>❌ Error en la Autorización</h2>
                        <p><strong>Error:</strong> ${error}</p>
                        <p>El usuario canceló la autorización o ocurrió un error.</p>
                        <a href="/" class="btn">🏠 Volver al Inicio</a>
                    </div>
                </div>
            </body>
            </html>
        `);
    }
    
    // Verificar que se recibió el código
    if (!code) {
        console.error('❌ No se recibió código de autorización');
        return res.status(400).send(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Error - Tienda Nube</title>
                <link rel="stylesheet" href="/css/styles.css">
            </head>
            <body>
                <div class="container">
                    <div class="error">
                        <h2>❌ Código de Autorización No Recibido</h2>
                        <p>No se recibió el código de autorización de Tienda Nube.</p>
                        <a href="/" class="btn">🏠 Volver al Inicio</a>
                    </div>
                </div>
            </body>
            </html>
        `);
    }
    
    console.log('✅ Código de autorización recibido:', code);
    console.log('🔐 Estado verificado:', state);
    
    // Intercambiar código por access_token
    try {
        console.log('🔄 Intercambiando código por access_token...');
        
        const tokenResponse = await axios.post('https://www.tiendanube.com/apps/authorize/token', {
            client_id: TIENDANUBE_CLIENT_ID,
            client_secret: TIENDANUBE_CLIENT_SECRET,
            grant_type: 'authorization_code',
            code: code
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Token intercambiado exitosamente:', {
            access_token: tokenResponse.data.access_token ? 'Recibido' : 'No recibido',
            user_id: tokenResponse.data.user_id,
            store_id: tokenResponse.data.store_id,
            scope: tokenResponse.data.scope
        });
        
        const { access_token, user_id, store_id, scope, token_type } = tokenResponse.data;
        
        // Mostrar el access_token y user_id al usuario
        res.send(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Tienda Nube - Autorización Completada</title>
                <link rel="stylesheet" href="/css/styles.css">
            </head>
            <body>
                <div class="container">
                    <div class="success">
                        <h2>🎉 ¡Autorización Completada!</h2>
                        <p>Se ha obtenido el access_token y user_id de Tienda Nube.</p>
                        
                        <h3>🔑 Credenciales de Acceso:</h3>
                        <div class="json-display">
<strong>Access Token:</strong>
${access_token}

<strong>User ID (Store ID):</strong>
${user_id || store_id}

<strong>Token Type:</strong>
${token_type || 'bearer'}

<strong>Scope:</strong>
${scope || 'No especificado'}

<strong>Timestamp:</strong>
${new Date().toISOString()}
                        </div>
                        
                        <h3>📋 Información para APIs:</h3>
                        <div class="json-display">
<strong>Headers para requests:</strong>
Authorization: Authentication ${access_token}

<strong>Base URL API:</strong>
https://api.tiendanube.com/v1/${user_id || store_id}/

<strong>Ejemplo de uso en Postman:</strong>
GET https://api.tiendanube.com/v1/${user_id || store_id}/products
Headers:
  Authorization: Authentication ${access_token}
  Content-Type: application/json
                        </div>
                        
                        <div class="info-box">
                            <h4>ℹ️ Información Importante:</h4>
                            <ul style="text-align: left;">
                                <li><strong>Token permanente:</strong> No expira automáticamente</li>
                                <li><strong>Invalidación:</strong> Solo se invalida al obtener uno nuevo o desinstalar la app</li>
                                <li><strong>User ID:</strong> Es el ID de la tienda para hacer requests a la API</li>
                                <li><strong>Header correcto:</strong> "Authentication" (no "Authorization")</li>
                            </ul>
                        </div>
                        
                        <a href="/" class="btn">🏠 Volver al Inicio</a>
                    </div>
                </div>
                
                <script>
                    // Auto-copiar el access_token al portapapeles
                    const accessToken = '${access_token}';
                    if (navigator.clipboard) {
                        navigator.clipboard.writeText(accessToken).then(() => {
                            console.log('✅ Access token copiado al portapapeles');
                        });
                    }
                </script>
            </body>
            </html>
        `);
        
    } catch (error) {
        console.error('❌ Error intercambiando código por token:', error.response?.data || error.message);
        
        res.send(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Error - Tienda Nube</title>
                <link rel="stylesheet" href="/css/styles.css">
            </head>
            <body>
                <div class="container">
                    <div class="error">
                        <h2>❌ Error en el Intercambio de Token</h2>
                        <p>No se pudo intercambiar el código por el access_token.</p>
                        
                        <h3>📋 Detalles del Error:</h3>
                        <div class="json-display">
<strong>Código recibido:</strong> ${code}
<strong>Error:</strong> ${error.response?.data ? JSON.stringify(error.response.data, null, 2) : error.message}
<strong>Status:</strong> ${error.response?.status || 'No disponible'}
                        </div>
                        
                        <div class="warning">
                            <h4>🔧 Posibles Soluciones:</h4>
                            <ul style="text-align: left;">
                                <li>Verificar que TIENDANUBE_CLIENT_SECRET esté configurado correctamente</li>
                                <li>Confirmar que el código no haya expirado (TTL: 5 minutos)</li>
                                <li>Validar que la redirect_uri coincida exactamente</li>
                                <li>Revisar que el client_id sea correcto</li>
                            </ul>
                        </div>
                        
                        <a href="/" class="btn">🏠 Volver al Inicio</a>
                    </div>
                </div>
            </body>
            </html>
        `);
    }
});

// ===================================================================
// TIENDA NUBE WEBHOOK - Manejar eventos de la tienda
// ===================================================================
router.post('/webhook', (req, res) => {
    console.log('🔔 Webhook de Tienda Nube recibido');
    console.log('📋 Headers:', req.headers);
    console.log('📦 Body:', req.body);
    
    try {
        const event = req.body;
        
        // Verificar que el evento tenga la estructura esperada
        if (!event || !event.event) {
            console.log('⚠️ Evento sin estructura válida');
            return res.status(400).json({ error: 'Evento inválido' });
        }
        
        console.log(`📨 Evento recibido: ${event.event}`);
        console.log(`🏪 Store ID: ${event.store_id || 'No especificado'}`);
        
        // Manejar diferentes tipos de eventos
        switch (event.event) {
            case 'order/created':
                console.log('🛒 Nueva orden creada:', event.id);
                handleOrderCreated(event);
                break;
                
            case 'order/updated':
                console.log('📝 Orden actualizada:', event.id);
                handleOrderUpdated(event);
                break;
                
            case 'order/paid':
                console.log('💰 Orden pagada:', event.id);
                handleOrderPaid(event);
                break;
                
            case 'order/cancelled':
                console.log('❌ Orden cancelada:', event.id);
                handleOrderCancelled(event);
                break;
                
            case 'product/created':
                console.log('📦 Producto creado:', event.id);
                handleProductCreated(event);
                break;
                
            case 'product/updated':
                console.log('🔄 Producto actualizado:', event.id);
                handleProductUpdated(event);
                break;
                
            case 'app/uninstalled':
                console.log('🗑️ App desinstalada para store:', event.store_id);
                handleAppUninstalled(event);
                break;
                
            default:
                console.log(`❓ Evento no manejado: ${event.event}`);
                break;
        }
        
        // Responder con 200 OK para confirmar recepción
        res.status(200).json({ 
            status: 'received',
            event: event.event,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error procesando webhook:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ===================================================================
// FUNCIONES DE MANEJO DE EVENTOS
// ===================================================================

function handleOrderCreated(event) {
    console.log('🛒 Procesando nueva orden:', {
        order_id: event.id,
        store_id: event.store_id,
        timestamp: new Date().toISOString()
    });
    
    // Aquí puedes agregar lógica personalizada:
    // - Enviar notificaciones
    // - Actualizar inventario
    // - Sincronizar con otros sistemas
    // - Etc.
}

function handleOrderUpdated(event) {
    console.log('📝 Procesando actualización de orden:', {
        order_id: event.id,
        store_id: event.store_id,
        timestamp: new Date().toISOString()
    });
}

function handleOrderPaid(event) {
    console.log('💰 Procesando pago de orden:', {
        order_id: event.id,
        store_id: event.store_id,
        timestamp: new Date().toISOString()
    });
}

function handleOrderCancelled(event) {
    console.log('❌ Procesando cancelación de orden:', {
        order_id: event.id,
        store_id: event.store_id,
        timestamp: new Date().toISOString()
    });
}

function handleProductCreated(event) {
    console.log('📦 Procesando nuevo producto:', {
        product_id: event.id,
        store_id: event.store_id,
        timestamp: new Date().toISOString()
    });
}

function handleProductUpdated(event) {
    console.log('🔄 Procesando actualización de producto:', {
        product_id: event.id,
        store_id: event.store_id,
        timestamp: new Date().toISOString()
    });
}

function handleAppUninstalled(event) {
    console.log('🗑️ Procesando desinstalación de app:', {
        store_id: event.store_id,
        timestamp: new Date().toISOString()
    });
    
    // Aquí deberías:
    // - Limpiar tokens de acceso
    // - Eliminar datos de la tienda
    // - Cancelar suscripciones
    // - Etc.
}

// ===================================================================
// ENDPOINT DE PRUEBA - Información de configuración
// ===================================================================
router.get('/config', (req, res) => {
    res.json({
        message: 'Configuración de Tienda Nube',
        client_id: TIENDANUBE_CLIENT_ID ? 'Configurado' : 'No configurado',
        client_secret: TIENDANUBE_CLIENT_SECRET ? 'Configurado' : 'No configurado',
        redirect_uri: TIENDANUBE_REDIRECT_URI,
        auth_url: `https://www.tiendanube.com/apps/authorize/auth`,
        token_url: `https://www.tiendanube.com/apps/authorize/token`
    });
});

module.exports = router;