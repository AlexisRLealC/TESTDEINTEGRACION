const express = require('express');
const router = express.Router();

// Variables de entorno
const APP_ID = process.env.APP_ID;
const APP_SECRET = process.env.APP_SECRET;
const CONFIGURATION_ID = process.env.CONFIGURATION_ID;
const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID;
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET;
const INSTAGRAM_REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI || `http://localhost:${process.env.PORT || 3000}/instagram/callback`;

// ===================================================================
// PÁGINA PRINCIPAL - Interfaz con Facebook JavaScript SDK oficial
// ===================================================================
router.get('/', (req, res) => {
    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WhatsApp Embedded Signup - Implementación Oficial</title>
    <link rel="stylesheet" href="/css/styles.css">
</head>
<body>
    <!-- SDK loading según documentación oficial -->
    <script async defer crossorigin="anonymous" src="https://connect.facebook.net/en_US/sdk.js"></script>
    
    <div class="container">
        <h1>🚀 WhatsApp Embedded Signup</h1>
        <p style="text-align: center; color: #666; font-size: 18px;">Implementación oficial con Facebook JavaScript SDK</p>
        
        <div id="sdk-status" class="sdk-status sdk-loading">
            ⏳ Cargando Facebook SDK...
        </div>
        
        <div class="status-box">
            <h3>📋 Estado de Configuración</h3>
            <strong>APP_ID:</strong> ${APP_ID ? '✅ Configurado (' + APP_ID + ')' : '❌ No configurado'}<br>
            <strong>APP_SECRET:</strong> ${APP_SECRET ? '✅ Configurado' : '❌ No configurado'}<br>
            <strong>CONFIGURATION_ID:</strong> ${CONFIGURATION_ID ? '✅ Configurado (' + CONFIGURATION_ID + ')' : '⚠️ Requerido para funcionar'}<br>
            <strong>WEBHOOK_TOKEN:</strong> ${WEBHOOK_VERIFY_TOKEN ? '✅ Configurado' : '❌ No configurado'}<br>
            <strong>WEBHOOK_URL:</strong> ${WEBHOOK_URL || 'No configurado'}<br><br>
            <strong>📸 INSTAGRAM BUSINESS LOGIN:</strong><br>
            <strong>INSTAGRAM_APP_ID:</strong> ${INSTAGRAM_APP_ID ? '✅ Configurado' : '❌ No configurado'}<br>
            <strong>INSTAGRAM_APP_SECRET:</strong> ${INSTAGRAM_APP_SECRET ? '✅ Configurado' : '❌ No configurado'}<br>
            <strong>INSTAGRAM_REDIRECT_URI:</strong> ${INSTAGRAM_REDIRECT_URI}
        </div>

        <div class="warning">
            <h4>⚙️ Configuración Requerida en Meta Developer Console:</h4>
            <ol>
                <li><strong>App Dashboard → Configuración → Básico:</strong>
                    <ul>
                        <li>Dominios de la app: <code>localhost</code></li>
                        <li>URL de eliminación de datos: <code>http://localhost:3000/data-deletion</code></li>
                    </ul>
                </li>
                <li><strong>Facebook Login for Business → Settings:</strong>
                    <ul>
                        <li>Client OAuth login: ✅ Yes</li>
                        <li>Web OAuth login: ✅ Yes</li>
                        <li>Enforce HTTPS: ✅ Yes (para producción)</li>
                        <li>Embedded Browser OAuth Login: ✅ Yes</li>
                        <li>Login with the JavaScript SDK: ✅ Yes</li>
                    </ul>
                </li>
                <li><strong>Facebook Login for Business → Configurations:</strong>
                    <ul>
                        <li>Crear configuración desde template "WhatsApp Embedded Signup Configuration"</li>
                        <li>Copiar el Configuration ID y agregarlo al .env como CONFIGURATION_ID</li>
                    </ul>
                </li>
            </ol>
        </div>

        <div style="margin: 30px 0; text-align: center;">
            <button id="whatsapp-signup-btn" class="btn whatsapp-btn" disabled>
                📱 Iniciar WhatsApp Embedded Signup
            </button>
            <br>
            <button onclick="launchInstagramLogin()" class="btn instagram-btn">
                📸 Conectar Instagram Business
            </button>
            <br>
            <a href="/messenger/test" class="btn" style="background: #1877f2; text-decoration: none;">
                📨 Probar Messenger API
            </a>
            <br>
            <a href="/psid/help" class="btn" style="background: #28a745; text-decoration: none;">
                🆔 Ayuda PSID
            </a>
            <br>
            <a href="/psid-lookup/test" class="btn" style="background: #6f42c1; text-decoration: none;">
                🔍 Buscar PSIDs
            </a>
            <br>
            <a href="/token/test" class="btn" style="background: #fd7e14; text-decoration: none;">
                🔑 Gestionar Tokens
            </a>
            <br>
            <a href="/token-debug/test" class="btn" style="background: #dc3545; text-decoration: none;">
                🔍 Debug Token
            </a>
            <br>
            <small style="color: #666; margin-top: 10px; display: block;">
                ⚠️ El botón de WhatsApp se habilitará cuando el SDK esté listo
            </small>
        </div>

        <div id="results"></div>
        <div id="signup-results"></div>

        <div class="info-box">
            <h3>ℹ️ Detalles Técnicos</h3>
            <p><strong>SDK:</strong> Facebook JavaScript SDK (Oficial)</p>
            <p><strong>Versión Graph API:</strong> v23.0 (Última versión estable)</p>
            <p><strong>Método:</strong> FB.login() con configuración WhatsApp</p>
            <p><strong>Respuesta:</strong> Código intercambiable (TTL: 30 segundos)</p>
            <p><strong>Eventos:</strong> Message listener para datos de sesión</p>
        </div>
    </div>

    <script>
        // Configurar variables globales desde el servidor
        window.APP_CONFIG = {
            APP_ID: '${APP_ID}',
            CONFIGURATION_ID: '${CONFIGURATION_ID}',
            INSTAGRAM_APP_ID: '${INSTAGRAM_APP_ID}',
            INSTAGRAM_REDIRECT_URI: '${INSTAGRAM_REDIRECT_URI}'
        };
    </script>
    <script src="/js/main.js"></script>
</body>
</html>
    `;
    res.send(html);
});

// ENDPOINT: /data-deletion
router.get('/data-deletion', (req, res) => {
    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Eliminación de Datos de Usuario</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .container { background: #f9f9f9; padding: 30px; border-radius: 10px; }
        h1 { color: #333; }
        .btn { background: #dc3545; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🗑️ Eliminación de Datos de Usuario</h1>
        <p>Si deseas eliminar tus datos personales de nuestra aplicación, puedes solicitarlo aquí.</p>
        
        <h3>Datos que almacenamos:</h3>
        <ul>
            <li>Información básica de perfil de Facebook</li>
            <li>ID de WhatsApp Business Account (WABA)</li>
            <li>Número de teléfono comercial</li>
            <li>Tokens de acceso (temporales)</li>
        </ul>
        
        <form action="/api/data-deletion-request" method="POST">
            <label>Email de contacto:</label><br>
            <input type="email" name="email" required style="width: 100%; padding: 10px; margin: 10px 0;"><br>
            
            <label>Razón de eliminación:</label><br>
            <textarea name="reason" style="width: 100%; padding: 10px; margin: 10px 0;" rows="4"></textarea><br>
            
            <button type="submit" class="btn">Solicitar Eliminación</button>
        </form>
        
        <p><small>Procesaremos tu solicitud en un plazo máximo de 30 días.</small></p>
    </div>
</body>
</html>
    `;
    res.send(html);
});

module.exports = router;
