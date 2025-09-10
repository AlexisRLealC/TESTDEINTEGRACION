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
const TIENDANUBE_CLIENT_ID = process.env.TIENDANUBE_CLIENT_ID;
const TIENDANUBE_CLIENT_SECRET = process.env.TIENDANUBE_CLIENT_SECRET;
const TIENDANUBE_REDIRECT_URI = process.env.TIENDANUBE_REDIRECT_URI || `http://localhost:${process.env.PORT || 3000}/tiendanube/callback`;

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
    <title>MVP - Integration Platform</title>
    <link rel="stylesheet" href="/css/styles.css">
</head>
<body>
    <!-- SDK loading según documentación oficial con soporte para ngrok -->
    <script>
        // Detectar si estamos en ngrok
        const isNgrok = window.location.hostname.includes('ngrok') || window.location.hostname.includes('ngrok-free.app');
        console.log('🌐 Entorno detectado:', isNgrok ? 'ngrok' : 'localhost');
        
        // Función para cargar SDK con reintentos
        function loadFacebookSDK() {
            return new Promise((resolve, reject) => {
                // Si ya está cargado, resolver inmediatamente
                if (window.FB) {
                    resolve();
                    return;
                }
                
                const script = document.createElement('script');
                script.async = true;
                script.defer = true;
                script.crossOrigin = 'anonymous';
                script.src = 'https://connect.facebook.net/en_US/sdk.js';
                
                script.onload = () => {
                    console.log('✅ Facebook SDK cargado desde CDN');
                    resolve();
                };
                
                script.onerror = () => {
                    console.warn('⚠️ Error cargando SDK desde CDN, intentando fallback...');
                    reject(new Error('CDN failed'));
                };
                
                document.head.appendChild(script);
                
                // Timeout específico para ngrok (más tiempo)
                const timeout = isNgrok ? 15000 : 10000;
                setTimeout(() => {
                    if (!window.FB) {
                        reject(new Error('Timeout'));
                    }
                }, timeout);
            });
        }
        
        // Cargar SDK con manejo de errores
        loadFacebookSDK()
            .then(() => {
                console.log('🎯 SDK listo para inicializar');
            })
            .catch((error) => {
                console.error('❌ Error cargando Facebook SDK:', error.message);
                const statusDiv = document.getElementById('sdk-status');
                if (statusDiv) {
                    statusDiv.className = 'sdk-status sdk-error';
                    statusDiv.innerHTML = '❌ Error: Facebook SDK no disponible' + (isNgrok ? ' (problema común en ngrok)' : '');
                }
                const signupBtn = document.getElementById('whatsapp-signup-btn');
                if (signupBtn) {
                    signupBtn.disabled = true;
                    signupBtn.innerHTML = '❌ SDK no disponible';
                }
            });
    </script>
    
    <div class="container">
        <h1>🚀 MVP - Integration Platform</h1>
        <p class="subtitle">Plataforma de integración con WhatsApp Business Cloud API</p>
        
        <div id="sdk-status" class="sdk-status sdk-loading">
            ⏳ Cargando Facebook SDK...
        </div>
        
        <div class="status-box">
            <h3>📋 Estado de Configuración</h3>
            <strong>APP_ID:</strong> ${APP_ID ? '\\u2705 Configurado (' + APP_ID + ')' : '\\u274C No configurado'}<br>
            <strong>APP_SECRET:</strong> ${APP_SECRET ? '\\u2705 Configurado' : '\\u274C No configurado'}<br>
            <strong>CONFIGURATION_ID:</strong> ${CONFIGURATION_ID ? '\\u2705 Configurado (' + CONFIGURATION_ID + ')' : '\\u26A0 Requerido para funcionar'}<br>
            <strong>WEBHOOK_TOKEN:</strong> ${WEBHOOK_VERIFY_TOKEN ? '\\u2705 Configurado' : '\\u274C No configurado'}<br>
            <strong>WEBHOOK_URL:</strong> ${WEBHOOK_URL || 'No configurado'}<br><br>
            <strong>\\u1F4F7 INSTAGRAM BUSINESS LOGIN:</strong><br>
            <strong>INSTAGRAM_APP_ID:</strong> ${INSTAGRAM_APP_ID ? '\\u2705 Configurado' : '\\u274C No configurado'}<br>
            <strong>INSTAGRAM_APP_SECRET:</strong> ${INSTAGRAM_APP_SECRET ? '\\u2705 Configurado' : '\\u274C No configurado'}<br>
            <strong>INSTAGRAM_REDIRECT_URI:</strong> ${INSTAGRAM_REDIRECT_URI}<br><br>
            <strong>\\u1F6D2 TIENDA NUBE:</strong><br>
            <strong>TIENDANUBE_CLIENT_ID:</strong> ${TIENDANUBE_CLIENT_ID ? '\\u2705 Configurado' : '\\u274C No configurado'}<br>
            <strong>TIENDANUBE_CLIENT_SECRET:</strong> ${TIENDANUBE_CLIENT_SECRET ? '\\u2705 Configurado' : '\\u274C No configurado'}<br>
            <strong>TIENDANUBE_REDIRECT_URI:</strong> ${TIENDANUBE_REDIRECT_URI}
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
                        <li>Usar template: <code>"WhatsApp Embedded Signup Configuration With 60 Expiration Token"</code></li>
                        <li>Verificar assets: WhatsApp Business Accounts, Business Phone Numbers, Business Portfolios</li>
                        <li>Permisos: whatsapp_business_management, whatsapp_business_messaging, business_management</li>
                        <li>Copiar el Configuration ID y agregarlo al .env como CONFIGURATION_ID</li>
                    </ul>
                </li>
            </ol>
            
            <h4>📱 Para ver opción "Conectar número existente":</h4>
            <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 10px 0; color: #856404;">
                <p><strong>Requisitos del usuario:</strong></p>
                <ul>
                    <li>✅ Tener WhatsApp Business Account existente</li>
                    <li>✅ Ser administrador de la cuenta (no colaborador)</li>
                    <li>✅ Tener números de WhatsApp Business configurados</li>
                    <li>✅ Configuración debe incluir todos los assets necesarios</li>
                </ul>
                <p><strong>⚠️ Importante:</strong> Si no aparece la opción, revisar la configuración del template en Meta Console.</p>
            </div>
        </div>

        <div style="margin: 30px 0; text-align: center;">
            <button id="whatsapp-signup-btn" class="btn whatsapp-btn" disabled>
                📱 Conectar WhatsApp Business
            </button>
            <br>
            <button onclick="launchInstagramLogin()" class="btn instagram-btn">
                📸 Conectar Instagram Business
            </button>
            <br>
            <a href="/messenger/test" class="btn" style="background: #1877f2; text-decoration: none;">
                📱 Probar Messenger API
            </a>
            <br>
            <a href="/whatsapp-messenger/test" class="btn" style="background: #25d366; text-decoration: none;">
                💬 Probar WhatsApp API
            </a>
            <br>
            <button onclick="launchTiendaNube()" class="btn tiendanube-btn">
                🛍️ Conectar Tienda Nube
            </button>
            <br>
            <a href="/psid/help" class="btn" style="background: #28a745; text-decoration: none;">
                📝 Ayuda PSID
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
            <h3>📚 Detalles Técnicos</h3>
            <p><strong>SDK:</strong> Facebook JavaScript SDK (Oficial)</p>
            <p><strong>Versión Graph API:</strong> v23.0 (Última versión estable)</p>
            <p><strong>Método:</strong> FB.login() con configuración de integración</p>
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
            INSTAGRAM_REDIRECT_URI: '${INSTAGRAM_REDIRECT_URI}',
            TIENDANUBE_CLIENT_ID: '${TIENDANUBE_CLIENT_ID}',
            TIENDANUBE_REDIRECT_URI: '${TIENDANUBE_REDIRECT_URI}'
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
        <h1>📁 Eliminación de Datos de Usuario</h1>
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
