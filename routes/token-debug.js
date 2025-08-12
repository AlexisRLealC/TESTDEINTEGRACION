const express = require('express');
const axios = require('axios');
const router = express.Router();

// ENDPOINT: /token-debug/verify
// Verificar permisos y validez de un token
router.get('/verify', async (req, res) => {
    try {
        const { access_token } = req.query;
        
        if (!access_token) {
            return res.status(400).json({
                error: 'Se requiere el parámetro access_token'
            });
        }
        
        console.log('🔍 Verificando token:', access_token.substring(0, 20) + '...');
        
        // Verificar información básica del token
        const debugResponse = await axios.get('https://graph.facebook.com/debug_token', {
            params: {
                input_token: access_token,
                access_token: access_token
            }
        });
        
        const tokenInfo = debugResponse.data.data;
        
        // Obtener permisos del token
        let permissions = [];
        try {
            const permissionsResponse = await axios.get('https://graph.facebook.com/me/permissions', {
                params: {
                    access_token: access_token
                }
            });
            permissions = permissionsResponse.data.data;
        } catch (permError) {
            console.log('⚠️ No se pudieron obtener permisos:', permError.response?.data);
        }
        
        // Obtener información del usuario/página
        let userInfo = {};
        try {
            const userResponse = await axios.get('https://graph.facebook.com/me', {
                params: {
                    access_token: access_token,
                    fields: 'id,name,email'
                }
            });
            userInfo = userResponse.data;
        } catch (userError) {
            console.log('⚠️ No se pudo obtener info del usuario:', userError.response?.data);
        }
        
        // Verificar si puede acceder a páginas
        let pages = [];
        try {
            const pagesResponse = await axios.get('https://graph.facebook.com/me/accounts', {
                params: {
                    access_token: access_token,
                    fields: 'id,name,access_token,tasks'
                }
            });
            pages = pagesResponse.data.data || [];
        } catch (pagesError) {
            console.log('⚠️ No se pudieron obtener páginas:', pagesError.response?.data);
        }
        
        console.log('✅ Verificación de token completada');
        
        res.json({
            success: true,
            token_info: {
                app_id: tokenInfo.app_id,
                type: tokenInfo.type,
                application: tokenInfo.application,
                expires_at: tokenInfo.expires_at,
                is_valid: tokenInfo.is_valid,
                scopes: tokenInfo.scopes || []
            },
            user_info: userInfo,
            permissions: permissions,
            pages: pages.map(page => ({
                id: page.id,
                name: page.name,
                has_token: !!page.access_token,
                tasks: page.tasks || []
            })),
            recommendations: generateRecommendations(tokenInfo, permissions, pages)
        });
        
    } catch (error) {
        console.error('❌ Error verificando token:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Error verificando token',
            details: error.response?.data || error.message
        });
    }
});

// Función para generar recomendaciones
function generateRecommendations(tokenInfo, permissions, pages) {
    const recommendations = [];
    
    // Verificar permisos necesarios para Messenger
    const requiredPermissions = ['pages_messaging', 'pages_manage_metadata'];
    const grantedPermissions = permissions.filter(p => p.status === 'granted').map(p => p.permission);
    
    const missingPermissions = requiredPermissions.filter(perm => !grantedPermissions.includes(perm));
    
    if (missingPermissions.length > 0) {
        recommendations.push({
            type: 'missing_permissions',
            message: `Faltan permisos: ${missingPermissions.join(', ')}`,
            action: 'Genera un nuevo token con estos permisos en Graph API Explorer'
        });
    }
    
    // Verificar si tiene acceso a páginas
    if (pages.length === 0) {
        recommendations.push({
            type: 'no_pages',
            message: 'No se encontraron páginas asociadas',
            action: 'Asegúrate de que tu cuenta tenga acceso a páginas de Facebook'
        });
    }
    
    // Verificar tokens de página
    const pagesWithoutTokens = pages.filter(page => !page.has_token);
    if (pagesWithoutTokens.length > 0) {
        recommendations.push({
            type: 'missing_page_tokens',
            message: 'Algunas páginas no tienen tokens de acceso',
            action: 'Genera tokens de página específicos para enviar mensajes'
        });
    }
    
    return recommendations;
}

// ENDPOINT: /token-debug/test-page
// Página web para verificar tokens
router.get('/test', (req, res) => {
    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verificación de Token - Debug</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
        }
        .container {
            max-width: 1000px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        h1 {
            color: #1877f2;
            text-align: center;
            margin-bottom: 30px;
        }
        .form-group {
            margin: 20px 0;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
            color: #333;
        }
        input[type="text"] {
            width: 100%;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 16px;
            box-sizing: border-box;
        }
        .btn {
            background: #1877f2;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            margin: 10px 5px;
        }
        .btn:hover {
            background: #166fe5;
        }
        .results {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            max-height: 600px;
            overflow-y: auto;
        }
        .info-item {
            background: white;
            padding: 15px;
            margin: 10px 0;
            border-radius: 8px;
            border-left: 4px solid #1877f2;
        }
        .error-item {
            border-left-color: #dc3545;
            background: #f8d7da;
        }
        .success-item {
            border-left-color: #28a745;
            background: #d4edda;
        }
        .warning-item {
            border-left-color: #ffc107;
            background: #fff3cd;
        }
        .code {
            font-family: 'Courier New', monospace;
            background: #f1f3f4;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 Verificación de Token - Debug</h1>
        
        <div class="form-group">
            <label for="access-token">Access Token a Verificar:</label>
            <input type="text" id="access-token" placeholder="Pega tu access token aquí">
            <button onclick="verifyToken()" class="btn">🔍 Verificar Token</button>
        </div>

        <div id="results" class="results" style="display: none;">
            <h3>📊 Resultados de Verificación</h3>
            <div id="results-content"></div>
        </div>

        <div style="text-align: center; margin-top: 30px;">
            <a href="/" class="btn">🏠 Volver al Inicio</a>
            <a href="https://developers.facebook.com/tools/explorer" target="_blank" class="btn">🔧 Graph API Explorer</a>
        </div>
    </div>

    <script>
        async function verifyToken() {
            const accessToken = document.getElementById('access-token').value;
            
            if (!accessToken) {
                showError('Por favor ingresa un access token');
                return;
            }
            
            try {
                showLoading('Verificando token...');
                
                const response = await fetch(\`/token-debug/verify?access_token=\${encodeURIComponent(accessToken)}\`);
                const data = await response.json();
                
                if (data.success) {
                    showResults(data);
                } else {
                    showError('Error: ' + (data.error || 'Error desconocido'));
                }
            } catch (error) {
                showError('Error de conexión: ' + error.message);
            }
        }
        
        function showResults(data) {
            const resultsDiv = document.getElementById('results');
            const contentDiv = document.getElementById('results-content');
            
            let html = '';
            
            // Información del token
            html += \`
                <div class="info-item \${data.token_info.is_valid ? 'success-item' : 'error-item'}">
                    <h4>🔑 Información del Token</h4>
                    <strong>Válido:</strong> \${data.token_info.is_valid ? '✅ Sí' : '❌ No'}<br>
                    <strong>Tipo:</strong> \${data.token_info.type}<br>
                    <strong>App ID:</strong> <span class="code">\${data.token_info.app_id}</span><br>
                    <strong>Expira:</strong> \${data.token_info.expires_at ? new Date(data.token_info.expires_at * 1000).toLocaleString() : 'No especificado'}<br>
                    <strong>Scopes:</strong> \${data.token_info.scopes.join(', ') || 'No especificado'}
                </div>
            \`;
            
            // Información del usuario
            if (data.user_info.id) {
                html += \`
                    <div class="info-item">
                        <h4>👤 Usuario/Página</h4>
                        <strong>ID:</strong> <span class="code">\${data.user_info.id}</span><br>
                        <strong>Nombre:</strong> \${data.user_info.name}<br>
                        <strong>Email:</strong> \${data.user_info.email || 'No disponible'}
                    </div>
                \`;
            }
            
            // Permisos
            if (data.permissions.length > 0) {
                const grantedPerms = data.permissions.filter(p => p.status === 'granted');
                const declinedPerms = data.permissions.filter(p => p.status === 'declined');
                
                html += \`
                    <div class="info-item">
                        <h4>🔐 Permisos</h4>
                        <strong>Concedidos (\${grantedPerms.length}):</strong><br>
                        \${grantedPerms.map(p => \`<span class="code">\${p.permission}</span>\`).join(', ')}<br>
                        \${declinedPerms.length > 0 ? \`<strong>Denegados (\${declinedPerms.length}):</strong><br>\${declinedPerms.map(p => \`<span class="code">\${p.permission}</span>\`).join(', ')}\` : ''}
                    </div>
                \`;
            }
            
            // Páginas
            if (data.pages.length > 0) {
                html += \`
                    <div class="info-item">
                        <h4>📄 Páginas Asociadas</h4>
                        \${data.pages.map(page => \`
                            <div style="margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 5px;">
                                <strong>ID:</strong> <span class="code">\${page.id}</span><br>
                                <strong>Nombre:</strong> \${page.name}<br>
                                <strong>Token de página:</strong> \${page.has_token ? '✅ Disponible' : '❌ No disponible'}<br>
                                <strong>Tareas:</strong> \${page.tasks.join(', ') || 'Ninguna'}
                            </div>
                        \`).join('')}
                    </div>
                \`;
            }
            
            // Recomendaciones
            if (data.recommendations.length > 0) {
                html += \`<div class="warning-item"><h4>💡 Recomendaciones</h4>\`;
                data.recommendations.forEach(rec => {
                    html += \`
                        <div style="margin: 10px 0;">
                            <strong>\${rec.message}</strong><br>
                            <em>Acción: \${rec.action}</em>
                        </div>
                    \`;
                });
                html += \`</div>\`;
            }
            
            contentDiv.innerHTML = html;
            resultsDiv.style.display = 'block';
        }
        
        function showLoading(message) {
            const resultsDiv = document.getElementById('results');
            const contentDiv = document.getElementById('results-content');
            
            contentDiv.innerHTML = \`<p>⏳ \${message}</p>\`;
            resultsDiv.style.display = 'block';
        }
        
        function showError(message) {
            const resultsDiv = document.getElementById('results');
            const contentDiv = document.getElementById('results-content');
            
            contentDiv.innerHTML = \`<div class="error-item">❌ \${message}</div>\`;
            resultsDiv.style.display = 'block';
        }
    </script>
</body>
</html>
    `;
    res.send(html);
});

module.exports = router;
