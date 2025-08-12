const express = require('express');
const axios = require('axios');
const tokenHelper = require('./token-helper');
const router = express.Router();

// Variables de entorno
const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID;
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET;
const INSTAGRAM_REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI || `http://localhost:${process.env.PORT || 3000}/instagram/callback`;

// ===================================================================
// INSTAGRAM BUSINESS LOGIN ENDPOINTS
// ===================================================================

// INSTAGRAM CALLBACK
router.get('/callback', async (req, res) => {
    const { code, state, error, error_description } = req.query;
    
    console.log('📸 Instagram API Callback recibido:', { 
        code: code ? 'presente' : 'ausente', 
        state, 
        error,
        timestamp: new Date().toISOString()
    });
    
    if (error) {
        console.error('❌ Error en autorización de Instagram:', { error, error_description });
        return res.send(`
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error - Instagram Login</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
        .error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 20px; border-radius: 10px; }
        .btn { background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="error">
        <h2>❌ Error en Instagram Login</h2>
        <p><strong>Error:</strong> ${error}</p>
        <p><strong>Descripción:</strong> ${error_description}</p>
        <a href="/" class="btn">🔙 Volver al inicio</a>
    </div>
</body>
</html>
        `);
    }
    
    if (!code) {
        return res.status(400).send('Código de autorización no recibido');
    }
    
    try {
        console.log('🔄 Paso 1: Intercambiando código por token...');
        const tokenResponse = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
            params: {
                client_id: INSTAGRAM_APP_ID,
                client_secret: INSTAGRAM_APP_SECRET,
                redirect_uri: INSTAGRAM_REDIRECT_URI,
                code: code
            }
        });
        
        const access_token = tokenResponse.data.access_token;
        const tokenType = tokenResponse.data.token_type || 'bearer';
        const expiresIn = tokenResponse.data.expires_in;
        
        console.log('✅ Token de acceso obtenido:', { 
            access_token: access_token,
            token_type: tokenType,
            expires_in: expiresIn
        });
        
        // Guardar token automáticamente para uso posterior
        tokenHelper.storeToken(access_token, 'instagram_login', null, expiresIn);
        
        console.log('👤 Obteniendo información del usuario...');
        let userInfo = { id: 'N/A', name: 'N/A', email: 'N/A' };
        
        try {
            const userInfoResponse = await axios.get('https://graph.facebook.com/v19.0/me', {
                params: {
                    fields: 'id,name,email'
                },
                headers: { 
                    'Authorization': `Bearer ${access_token}` 
                }
            });
            
            userInfo = userInfoResponse.data;
            console.log('✅ Información del usuario obtenida:', userInfo);
        } catch (userInfoError) {
            console.log('⚠️ No se pudo obtener información del usuario:', userInfoError.response?.data?.error?.message);
        }
        
        // Obtener información de la página asociada
        try {
            console.log('📄 Obteniendo información de la página asociada...');
            const pageResponse = await axios.get(`https://graph.facebook.com/v18.0/${userInfo.id}/accounts`, {
                params: {
                    access_token: access_token,
                    fields: 'id,name,access_token'
                }
            });
            
            if (pageResponse.data.data && pageResponse.data.data.length > 0) {
                const pageInfo = pageResponse.data.data[0];
                console.log('📄 Información de página obtenida:', {
                    page_id: pageInfo.id,
                    page_name: pageInfo.name,
                    page_token_length: pageInfo.access_token ? pageInfo.access_token.length : 0
                });
                
                // Actualizar información con datos de página
                userInfo.page_id = pageInfo.id;
                userInfo.page_name = pageInfo.name;
                userInfo.page_access_token = pageInfo.access_token;
                
                // Guardar también el token de página si está disponible
                if (pageInfo.access_token) {
                    tokenHelper.storeToken(pageInfo.access_token, 'page_token', pageInfo.id, null);
                }
            }
        } catch (pageError) {
            console.log('⚠️ No se pudo obtener información de página:', pageError.response?.data || pageError.message);
        }
        
        // Página de éxito con información del token
        res.send(`
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Instagram Login Exitoso</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: linear-gradient(135deg, #E4405F 0%, #C13584 100%); min-height: 100vh; }
        .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 15px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
        .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 20px; border-radius: 10px; margin: 20px 0; }
        .info-box { background: #e7f3ff; border: 1px solid #b8daff; color: #004085; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .json-display { background: #f8f9fa; border: 1px solid #dee2e6; padding: 15px; border-radius: 5px; font-family: 'Courier New', monospace; white-space: pre-wrap; font-size: 12px; max-height: 300px; overflow-y: auto; }
        .btn { background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 10px 5px; transition: all 0.3s ease; }
        .btn:hover { background: #0056b3; transform: translateY(-2px); }
        h1 { color: #333; text-align: center; }
        .user-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
        .user-card { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #E4405F; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎉 Instagram Business Login Exitoso</h1>
        
        <div class="success">
            <h3>✅ Autorización Completada</h3>
            <p>Tu cuenta de Instagram Business ha sido conectada exitosamente.</p>
        </div>
        
        <div class="user-info">
            <div class="user-card">
                <h4>👤 Información de Usuario</h4>
                <p><strong>ID:</strong> ${userInfo.id}</p>
                <p><strong>Nombre:</strong> ${userInfo.name}</p>
                <p><strong>Email:</strong> ${userInfo.email}</p>
            </div>
            
            <div class="user-card">
                <h4>🔑 Token de Acceso</h4>
                <p><strong>Tipo:</strong> ${tokenType}</p>
                <p><strong>Duración:</strong> ${expiresIn ? Math.floor(expiresIn / 86400) + ' días' : 'No especificada'}</p>
                <p><strong>Estado:</strong> Activo</p>
            </div>
        </div>
        
        <div class="info-box">
            <h4>🔧 Datos Técnicos</h4>
            <div class="json-display">${JSON.stringify({
                user_info: userInfo,
                token_info: {
                    type: tokenType || 'bearer',
                    expires_in: expiresIn || 'No especificado',
                    expires_at: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : 'No especificado'
                },
                callback_time: new Date().toISOString()
            }, null, 2)}</div>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
            <a href="/" class="btn">🏠 Volver al inicio</a>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; color: #856404;">
            <h5>⚠️ Importante para Producción:</h5>
            <ul>
                <li>Guarda el token de acceso de forma segura</li>
                <li>Implementa renovación automática antes del vencimiento</li>
                <li>Configura webhooks para recibir mensajes en tiempo real</li>
                <li>Cumple con las políticas de privacidad de Instagram</li>
            </ul>
        </div>
    </div>
</body>
</html>
        `);
        
    } catch (error) {
        console.error('❌ Error en callback de Instagram:', error.response?.data || error.message);
        res.status(500).send(`
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Error - Instagram Login</title>
    <style>body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }</style>
</head>
<body>
    <h2>❌ Error en Instagram Login</h2>
    <p>Ocurrió un error al procesar la autorización de Instagram:</p>
    <pre style="background: #f8f9fa; padding: 15px; border-radius: 5px; text-align: left;">${JSON.stringify(error.response?.data || { message: error.message }, null, 2)}</pre>
    <a href="/" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px;">🔙 Volver al inicio</a>
</body>
</html>
        `);
    }
});

module.exports = router;
