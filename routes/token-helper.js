const express = require('express');
const router = express.Router();

// Almacén temporal de tokens (en producción usar base de datos segura)
let storedTokens = [];

// Función para guardar token
function storeToken(token, source, pageId = null, expiresIn = null) {
    const tokenData = {
        token: token,
        source: source, // 'instagram_login', 'manual', etc.
        page_id: pageId,
        created_at: new Date().toISOString(),
        expires_in: expiresIn,
        expires_at: expiresIn ? new Date(Date.now() + (expiresIn * 1000)).toISOString() : null
    };
    
    // Remover tokens anteriores del mismo source
    storedTokens = storedTokens.filter(t => t.source !== source);
    
    // Agregar nuevo token
    storedTokens.push(tokenData);
    
    // Mantener solo los últimos 10 tokens
    if (storedTokens.length > 10) {
        storedTokens = storedTokens.slice(-10);
    }
    
    console.log('🔑 Token guardado:', {
        source: source,
        token_length: token.length,
        page_id: pageId,
        expires_in: expiresIn
    });
}

// ENDPOINT: /token/list
// Listar tokens guardados
router.get('/list', (req, res) => {
    const tokensToShow = storedTokens.map(token => ({
        source: token.source,
        page_id: token.page_id,
        created_at: token.created_at,
        expires_at: token.expires_at,
        token_preview: token.token.substring(0, 20) + '...',
        token_length: token.token.length,
        is_expired: token.expires_at ? new Date() > new Date(token.expires_at) : false
    }));
    
    res.json({
        success: true,
        tokens: tokensToShow,
        count: tokensToShow.length
    });
});

// ENDPOINT: /token/get
// Obtener token específico
router.get('/get', (req, res) => {
    const { source } = req.query;
    
    if (!source) {
        return res.status(400).json({
            error: 'Se requiere el parámetro "source"'
        });
    }
    
    const token = storedTokens.find(t => t.source === source);
    
    if (!token) {
        return res.status(404).json({
            error: `No se encontró token para source: ${source}`
        });
    }
    
    // Verificar si está expirado
    const isExpired = token.expires_at ? new Date() > new Date(token.expires_at) : false;
    
    res.json({
        success: true,
        token: token.token,
        source: token.source,
        page_id: token.page_id,
        created_at: token.created_at,
        expires_at: token.expires_at,
        is_expired: isExpired
    });
});

// ENDPOINT: /token/test
// Página web para ver y gestionar tokens
router.get('/test', (req, res) => {
    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gestión de Tokens - Access Tokens</title>
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
        .token-item {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            padding: 20px;
            margin: 15px 0;
            border-radius: 8px;
            border-left: 4px solid #1877f2;
        }
        .token-expired {
            border-left-color: #dc3545;
            background: #f8d7da;
        }
        .token-valid {
            border-left-color: #28a745;
            background: #d4edda;
        }
        .btn {
            background: #1877f2;
            color: white;
            padding: 8px 16px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            margin: 5px;
            text-decoration: none;
            display: inline-block;
        }
        .btn:hover {
            background: #166fe5;
        }
        .btn-success {
            background: #28a745;
        }
        .btn-danger {
            background: #dc3545;
        }
        .token-preview {
            font-family: 'Courier New', monospace;
            background: #f1f3f4;
            padding: 8px;
            border-radius: 4px;
            font-size: 12px;
            word-break: break-all;
            margin: 10px 0;
        }
        .info {
            background: #e7f3ff;
            border: 1px solid #b8daff;
            color: #004085;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
        }
        .warning {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔑 Gestión de Access Tokens</h1>
        
        <div class="info">
            <h3>ℹ️ Tokens Disponibles</h3>
            <p>Aquí puedes ver todos los tokens que tu aplicación ha capturado:</p>
            <ul>
                <li><strong>Instagram Login:</strong> Tokens obtenidos del flujo de Instagram Business Login</li>
                <li><strong>Manual:</strong> Tokens que agregues manualmente</li>
                <li><strong>Estado:</strong> Válido/Expirado basado en la fecha de expiración</li>
            </ul>
        </div>

        <div class="warning">
            <h4>⚠️ Problema Actual</h4>
            <p>Si ves el error <strong>"Invalid OAuth access token"</strong>, significa que:</p>
            <ul>
                <li>El token está expirado</li>
                <li>El token no tiene los permisos correctos</li>
                <li>El formato del token es incorrecto</li>
            </ul>
        </div>

        <div style="text-align: center; margin: 20px 0;">
            <button onclick="loadTokens()" class="btn">🔄 Actualizar Lista</button>
            <a href="https://developers.facebook.com/tools/explorer" target="_blank" class="btn btn-success">🔧 Graph API Explorer</a>
        </div>

        <div id="tokens-list">
            <p>⏳ Cargando tokens...</p>
        </div>

        <div class="info">
            <h4>🔧 Cómo Generar Token Válido:</h4>
            <ol>
                <li>Ve a <a href="https://developers.facebook.com/tools/explorer" target="_blank">Graph API Explorer</a></li>
                <li>Selecciona tu app en "Meta App"</li>
                <li>Selecciona tu página en "User or Page"</li>
                <li>Haz clic en "Generate Access Token"</li>
                <li>Selecciona permisos: pages_messaging, pages_read_engagement, instagram_basic</li>
                <li>Copia el token generado</li>
                <li>Úsalo en la herramienta de búsqueda PSID</li>
            </ol>
        </div>

        <div style="text-align: center; margin-top: 30px;">
            <a href="/" class="btn">🏠 Volver al Inicio</a>
            <a href="/psid-lookup/test" class="btn">🔍 Buscar PSIDs</a>
        </div>
    </div>

    <script>
        async function loadTokens() {
            try {
                const response = await fetch('/token/list');
                const data = await response.json();
                
                const listElement = document.getElementById('tokens-list');
                
                if (data.tokens && data.tokens.length > 0) {
                    listElement.innerHTML = '<h3>📋 Tokens Capturados:</h3>' + 
                        data.tokens.map(token => {
                            const statusClass = token.is_expired ? 'token-expired' : 'token-valid';
                            const statusText = token.is_expired ? '❌ Expirado' : '✅ Válido';
                            
                            return \`
                                <div class="token-item \${statusClass}">
                                    <strong>Fuente:</strong> \${token.source}<br>
                                    <strong>Page ID:</strong> \${token.page_id || 'N/A'}<br>
                                    <strong>Estado:</strong> \${statusText}<br>
                                    <strong>Creado:</strong> \${new Date(token.created_at).toLocaleString()}<br>
                                    <strong>Expira:</strong> \${token.expires_at ? new Date(token.expires_at).toLocaleString() : 'No especificado'}<br>
                                    <strong>Longitud:</strong> \${token.token_length} caracteres<br>
                                    <div class="token-preview">\${token.token_preview}</div>
                                    <button onclick="copyToken('\${token.source}')" class="btn">📋 Copiar Token Completo</button>
                                    <button onclick="testToken('\${token.source}')" class="btn btn-success">🧪 Probar Token</button>
                                </div>
                            \`;
                        }).join('');
                } else {
                    listElement.innerHTML = \`
                        <p>📭 No hay tokens capturados aún.</p>
                        <p><strong>Para obtener tokens:</strong></p>
                        <ol>
                            <li>Realiza el flujo de Instagram Login</li>
                            <li>O genera uno manualmente en Graph API Explorer</li>
                        </ol>
                    \`;
                }
            } catch (error) {
                document.getElementById('tokens-list').innerHTML = \`
                    <p style="color: red;">❌ Error cargando tokens: \${error.message}</p>
                \`;
            }
        }
        
        async function copyToken(source) {
            try {
                const response = await fetch(\`/token/get?source=\${encodeURIComponent(source)}\`);
                const data = await response.json();
                
                if (data.success) {
                    navigator.clipboard.writeText(data.token).then(() => {
                        alert('✅ Token copiado al portapapeles');
                    }).catch(() => {
                        prompt('📋 Copia este token:', data.token);
                    });
                } else {
                    alert('❌ Error obteniendo token: ' + data.error);
                }
            } catch (error) {
                alert('❌ Error: ' + error.message);
            }
        }
        
        async function testToken(source) {
            alert('🧪 Función de prueba en desarrollo. Por ahora, copia el token y úsalo en la herramienta de búsqueda PSID.');
        }
        
        // Cargar tokens al cargar la página
        loadTokens();
        
        // Auto-actualizar cada 30 segundos
        setInterval(loadTokens, 30000);
    </script>
</body>
</html>
    `;
    res.send(html);
});

// Exportar función para usar en otros módulos
router.storeToken = storeToken;

module.exports = router;
