const express = require('express');
const axios = require('axios');
const tokenHelper = require('./token-helper');
const router = express.Router();

// Variables de entorno
const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID;
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET;
const INSTAGRAM_REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI || `http://localhost:${process.env.PORT || 3000}/instagram/callback`;

// ===================================================================
// INSTAGRAM BUSINESS LOGIN ENDPOINTS (Direct Instagram Login)
// ===================================================================

// Endpoint de debug para verificar configuración
router.get('/debug', (req, res) => {
    const scopes = [
        'instagram_business_basic',
        'instagram_business_content_publish',
        'instagram_business_manage_messages',
        'instagram_business_manage_comments'
    ].join(',');
    
    const debugInfo = {
        environment_variables: {
            INSTAGRAM_APP_ID: INSTAGRAM_APP_ID,
            INSTAGRAM_APP_SECRET: INSTAGRAM_APP_SECRET ? '***PRESENTE***' : 'AUSENTE',
            INSTAGRAM_REDIRECT_URI: INSTAGRAM_REDIRECT_URI,
            NODE_ENV: process.env.NODE_ENV,
            PORT: process.env.PORT
        },
        expected_values: {
            INSTAGRAM_APP_ID: '1923861315126759',
            INSTAGRAM_REDIRECT_URI_should_match: 'La configurada en App Dashboard'
        },
        scopes_to_use: scopes.split(','),
        authorization_url_parts: {
            base: 'https://www.instagram.com/oauth/authorize',
            client_id: INSTAGRAM_APP_ID,
            redirect_uri: INSTAGRAM_REDIRECT_URI,
            scope: scopes,
            response_type: 'code'
        },
        validation: {
            app_id_matches: INSTAGRAM_APP_ID === '1923861315126759',
            app_secret_present: !!INSTAGRAM_APP_SECRET,
            redirect_uri_present: !!INSTAGRAM_REDIRECT_URI,
            all_scopes_business: scopes.includes('instagram_business_basic')
        }
    };
    
    res.json({
        status: 'Instagram Business Login Debug Info',
        timestamp: new Date().toISOString(),
        debug_info: debugInfo,
        next_steps: [
            'Si app_id_matches es false, verifica tu .env',
            'Si redirect_uri no coincide con App Dashboard, actualízalo',
            'Si ves scopes antiguos en la autorización, hay un problema de configuración'
        ]
    });
});

// Endpoint para iniciar el flujo de autorización de Instagram
router.get('/login', (req, res) => {
    const scopes = [
        'instagram_business_basic',
        'instagram_business_manage_messages'
    ].join(',');
    
    // Obtener parámetros de la query string
    const forceReauth = req.query.force_reauth === 'true';
    const state = req.query.state || Date.now().toString();
    
    console.log('🚀 INICIANDO FLUJO DE INSTAGRAM LOGIN DIRECTO');
    console.log('📋 Variables de entorno:');
    console.log('   - INSTAGRAM_APP_ID:', INSTAGRAM_APP_ID);
    console.log('   - INSTAGRAM_APP_ID type:', typeof INSTAGRAM_APP_ID);
    console.log('   - INSTAGRAM_APP_ID length:', INSTAGRAM_APP_ID ? INSTAGRAM_APP_ID.length : 'undefined');
    console.log('   - INSTAGRAM_REDIRECT_URI:', INSTAGRAM_REDIRECT_URI);
    console.log('   - Scopes solicitados:', scopes);
    console.log('   - Force reauth:', forceReauth);
    console.log('   - State:', state);
    
    // Construir URL paso a paso para debugging
    const baseUrl = 'https://www.instagram.com/oauth/authorize';
    const params = new URLSearchParams({
        client_id: INSTAGRAM_APP_ID,
        redirect_uri: INSTAGRAM_REDIRECT_URI,
        scope: scopes,
        response_type: 'code',
        state: state
    });
    
    // Agregar force_reauth si se solicita
    if (forceReauth) {
        params.set('force_reauth', 'true');
    }
    
    const authUrl = `${baseUrl}?${params.toString()}`;
    
    console.log('🔧 CONSTRUCCIÓN DE URL DETALLADA:');
    console.log('   - Base URL:', baseUrl);
    console.log('   - client_id param:', params.get('client_id'));
    console.log('   - redirect_uri param:', params.get('redirect_uri'));
    console.log('   - scope param:', params.get('scope'));
    console.log('   - response_type param:', params.get('response_type'));
    console.log('   - state param:', params.get('state'));
    console.log('   - force_reauth param:', params.get('force_reauth'));
    console.log('🔗 URL de autorización final:', authUrl);
    
    console.log('⚠️  IMPORTANTE: Si ves scopes diferentes en la pantalla, hay un problema de configuración');
    console.log('   Scopes esperados: instagram_business_basic, instagram_business_content_publish, etc.');
    console.log('   Scopes NO esperados: instagram_basic, pages_show_list, etc.');
    
    // Verificar que no haya caracteres extraños o problemas de encoding
    console.log('🔍 VERIFICACIÓN DE ENCODING:');
    console.log('   - URL encoded:', encodeURIComponent(authUrl));
    console.log('   - URL length:', authUrl.length);
    
    if (forceReauth) {
        console.log('🔄 FORZANDO REAUTENTICACIÓN: El usuario deberá ingresar credenciales nuevamente');
    }
    
    res.redirect(authUrl);
});

// INSTAGRAM CALLBACK
router.get('/callback', async (req, res) => {
    const { code, state, error, error_description } = req.query;
    
    console.log('📸 ===== INSTAGRAM CALLBACK RECIBIDO =====');
    console.log('📊 Query parameters completos:', req.query);
    console.log('📋 Datos extraídos:');
    console.log('   - Code:', code ? 'presente' : 'ausente');
    console.log('   - State:', state);
    console.log('   - Error:', error);
    console.log('   - Error description:', error_description);
    console.log('   - Timestamp:', new Date().toISOString());
    console.log('🔍 VERIFICANDO: ¿Es este un callback de Instagram Login directo?');
    
    if (error) {
        console.error('❌ Error en autorización de Instagram:', { error, error_description });
        console.log('🚨 ANÁLISIS DEL ERROR:');
        console.log('   - Si el error es "access_denied", el usuario canceló la autorización');
        console.log('   - Si hay otros errores, podría ser un problema de configuración');
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
        console.error('❌ PROBLEMA: No se recibió código de autorización');
        console.log('🔍 Posibles causas:');
        console.log('   1. El usuario canceló la autorización');
        console.log('   2. Error en la configuración del redirect_uri');
        console.log('   3. Problema con el App ID de Instagram');
        return res.status(400).send('Código de autorización no recibido');
    }
    
    console.log('✅ Código de autorización recibido correctamente');
    console.log('🔄 Procediendo con el intercambio de token usando Instagram Business Login endpoints...');
    try {
        console.log('🔄 Paso 1: Intercambiando código por token...');
        // Usar el endpoint correcto de Instagram Business Login
        const tokenResponse = await axios.post('https://api.instagram.com/oauth/access_token', 
            new URLSearchParams({
                client_id: INSTAGRAM_APP_ID,
                client_secret: INSTAGRAM_APP_SECRET,
                grant_type: 'authorization_code',
                redirect_uri: INSTAGRAM_REDIRECT_URI,
                code: code
            }), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
        
        // Según la documentación, la respuesta tiene estructura: { data: [{ access_token, user_id, permissions }] }
        const tokenData = tokenResponse.data.data ? tokenResponse.data.data[0] : tokenResponse.data;
        const access_token = tokenData.access_token;
        const user_id = tokenData.user_id;
        const permissions = tokenData.permissions;
        
        console.log('✅ Token de acceso obtenido:', { 
            access_token: access_token ? 'presente' : 'ausente',
            user_id: user_id,
            permissions: permissions,
            all_token_data: tokenData
        });
        
        // Intercambiar por token de larga duración
        console.log('🔄 Paso 2: Intercambiando por token de larga duración...');
        const longLivedTokenResponse = await axios.get('https://graph.instagram.com/access_token', {
            params: {
                grant_type: 'ig_exchange_token',
                client_secret: INSTAGRAM_APP_SECRET,
                access_token: access_token
            }
        });
        
        const long_lived_token = longLivedTokenResponse.data.access_token;
        const expires_in = longLivedTokenResponse.data.expires_in;
        
        console.log('✅ Token de larga duración obtenido:', { 
            expires_in: expires_in,
            expires_in_days: Math.floor(expires_in / 86400),
            all_long_lived_data: longLivedTokenResponse.data
        });
        
        // Guardar el token en el sistema
        let businessAccountId = user_id; // fallback
        let username = 'N/A';
        
        try {
            // Primero obtener información básica del usuario
            const userResponse = await axios.get(`https://graph.instagram.com/me`, {
                params: { fields: 'id,username' },
                headers: { 'Authorization': `Bearer ${long_lived_token}` }
            });
            username = userResponse.data.username || 'N/A';
            
            // DEBUG: Ver qué devuelve /me
            console.log('🔍 DEBUG - Respuesta de /me:', JSON.stringify(userResponse.data, null, 2));
            
            // Obtener las páginas/cuentas de Instagram Business asociadas
            const accountsResponse = await axios.get(`https://graph.instagram.com/me/accounts`, {
                params: { fields: 'id,name,instagram_business_account' },
                headers: { 'Authorization': `Bearer ${long_lived_token}` }
            });
            
            // DEBUG: Ver qué devuelve /me/accounts
            console.log('🔍 DEBUG - Respuesta de /me/accounts:', JSON.stringify(accountsResponse.data, null, 2));
            
            // Buscar el Instagram Business Account ID
            if (accountsResponse.data && accountsResponse.data.data) {
                for (const account of accountsResponse.data.data) {
                    console.log('🔍 DEBUG - Procesando cuenta:', JSON.stringify(account, null, 2));
                    if (account.instagram_business_account && account.instagram_business_account.id) {
                        businessAccountId = account.instagram_business_account.id;
                        console.log('✅ ENCONTRADO Business Account ID:', businessAccountId);
                        break;
                    }
                }
            }
            
            // Si no encontramos nada diferente, intentar otra consulta
            if (businessAccountId === user_id) {
                console.log('⚠️ No se encontró Business Account ID diferente, intentando consulta directa...');
                
                // Intentar obtener información directa del usuario con más campos
                try {
                    const detailedUserResponse = await axios.get(`https://graph.instagram.com/me`, {
                        params: { fields: 'id,username,account_type,name' },
                        headers: { 'Authorization': `Bearer ${long_lived_token}` }
                    });
                    console.log('🔍 DEBUG - Usuario detallado:', JSON.stringify(detailedUserResponse.data, null, 2));
                } catch (detailedError) {
                    console.log('⚠️ Error en consulta detallada:', detailedError.response?.data);
                }
            }
            
        } catch (error) {
            // Si no se puede obtener, usar el user_id como fallback
            console.log('⚠️ Error completo:', error.response?.data);
            console.log('⚠️ No se pudo obtener Business Account ID, usando User ID como fallback');
        }
        
        // Guardar el token en el sistema
        const tokenSaved = tokenHelper.storeToken(long_lived_token, 'instagram_login', businessAccountId, expires_in);
        
        console.log('\n' + '='.repeat(60));
        console.log('🎯 INSTAGRAM LOGIN COMPLETADO - DATOS ESENCIALES');
        console.log('='.repeat(60));
        console.log(`📱 USER ID (original): ${user_id}`);
        console.log(`🏢 BUSINESS ACCOUNT ID (para mensajes): ${businessAccountId}`);
        console.log(`🔑 ACCESS TOKEN: ${long_lived_token}`);
        console.log(`👤 USERNAME: ${username}`);
        console.log(`⏰ EXPIRA EN: ${Math.floor(expires_in / 86400)} días`);
        console.log('='.repeat(60) + '\n');

        // Página de éxito simplificada
        res.send(`
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Instagram Login Exitoso</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: linear-gradient(135deg, #E4405F 0%, #C13584 100%); min-height: 100vh; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 15px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
        .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center; }
        .data-box { background: #f8f9fa; border: 1px solid #dee2e6; padding: 20px; border-radius: 10px; margin: 20px 0; }
        .btn { background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 10px 5px; transition: all 0.3s ease; }
        .btn:hover { background: #0056b3; }
        h1 { color: #333; text-align: center; }
        .data-item { margin: 10px 0; padding: 10px; background: #e7f3ff; border-radius: 5px; }
        .data-label { font-weight: bold; color: #0056b3; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎉 Instagram Conectado</h1>
        
        <div class="success">
            <h3>✅ Conexión Exitosa</h3>
            <p>Tu cuenta de Instagram Business ha sido conectada correctamente.</p>
        </div>
        
        <div class="data-box">
            <h4>📱 Datos para Mensajería</h4>
            <div class="data-item">
                <span class="data-label">📱 User ID:</span> ${user_id}
            </div>
            <div class="data-item">
                <span class="data-label">🏢 Business Account ID:</span> ${businessAccountId}
            </div>
            <div class="data-item">
                <span class="data-label">👤 Username:</span> ${username}
            </div>
            <div class="data-item">
                <span class="data-label">⏰ Token válido por:</span> ${Math.floor(expires_in / 86400)} días
            </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
            <a href="/" class="btn">🏠 Volver al inicio</a>
            <script>
                // Cerrar popup automáticamente después de 3 segundos
                setTimeout(() => {
                    if (window.opener) {
                        window.close();
                    }
                }, 3000);
            </script>
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
