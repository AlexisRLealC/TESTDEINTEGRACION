// ===================================================================
// VARIABLES GLOBALES
// ===================================================================
let sdkReady = false;  // Flag para verificar si el SDK está listo

// ===================================================================
// SDK INITIALIZATION - Inicialización del Facebook JavaScript SDK
// ===================================================================
// Esta función se ejecuta automáticamente cuando el SDK termina de cargar
// Documentación: https://developers.facebook.com/docs/javascript/reference/FB.init
window.fbAsyncInit = function() {
    // Configuración del SDK según documentación oficial
    FB.init({
        appId: window.APP_CONFIG.APP_ID,         // ID de tu app de Meta/Facebook
        autoLogAppEvents: true,                   // Logging automático de eventos
        xfbml: true,                             // Habilitar parsing de XFBML
        version: 'v23.0'                        // Versión más reciente de Graph API
    });
    
    console.log('✅ Facebook SDK inicializado correctamente');
    sdkReady = true;
    
    // Actualizar UI
    const statusDiv = document.getElementById('sdk-status');
    statusDiv.className = 'sdk-status sdk-ready';
    statusDiv.innerHTML = '✅ Facebook SDK listo para usar';
    
    const signupBtn = document.getElementById('whatsapp-signup-btn');
    signupBtn.disabled = false;
    signupBtn.innerHTML = '📱 Iniciar WhatsApp Embedded Signup';
};

// ===================================================================
// SESSION LOGGING MESSAGE EVENT LISTENER
// ===================================================================
// Este listener captura mensajes enviados desde Facebook durante el flujo
// de Embedded Signup. Los mensajes contienen información crítica como:
// - WABA ID (WhatsApp Business Account ID)
// - Phone Number ID
// - Estado del flujo (CURRENT_STEP)
// - Información de abandono si el usuario cancela
// Documentación: https://developers.facebook.com/docs/whatsapp/embedded-signup/implementation
window.addEventListener('message', (event) => {
    if (!event.origin.endsWith('facebook.com')) return;
    
    try {
        const data = JSON.parse(event.data);
        if (data.type === 'WA_EMBEDDED_SIGNUP') {
            console.log('📱 Evento WhatsApp Embedded Signup:', data);
            
            const resultsDiv = document.getElementById('signup-results');
            resultsDiv.style.display = 'block';
            resultsDiv.innerHTML = `
                <div class="success">
                    <h3>📱 Datos de Sesión WhatsApp</h3>
                    <p>Se recibieron datos importantes del flujo de signup:</p>
                    <div class="json-display">${JSON.stringify(data, null, 2)}</div>
                    <p><small>💡 Estos datos incluyen WABA ID, Phone Number ID, y estado del flujo</small></p>
                </div>
            `;
            
            // Enviar al servidor para procesamiento
            fetch('/api/process-signup-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            }).catch(console.error);
        }
    } catch (error) {
        console.log('📨 Mensaje raw de Facebook:', event.data);
        
        const resultsDiv = document.getElementById('signup-results');
        resultsDiv.style.display = 'block';
        resultsDiv.innerHTML = `
            <div class="info-box">
                <h3>📨 Mensaje de Facebook</h3>
                <div class="json-display">${event.data}</div>
            </div>
        `;
    }
});

// ===================================================================
// RESPONSE CALLBACK - Manejo de respuesta de autenticación
// ===================================================================
// Esta función se ejecuta cuando el usuario completa o cancela el flujo
// de Embedded Signup. La respuesta contiene:
// - authResponse.code: Código intercambiable (TTL: 30 segundos)
// - Este código debe intercambiarse rápidamente por un token de acceso
// - Si no hay authResponse, significa error o cancelación del usuario
// Documentación: https://developers.facebook.com/docs/whatsapp/embedded-signup/implementation
const fbLoginCallback = (response) => {
    console.log('🔄 Respuesta completa del callback:', response);
    
    const resultsDiv = document.getElementById('results');
    resultsDiv.style.display = 'block';
    
    if (response.authResponse && response.authResponse.code) {
        const code = response.authResponse.code;
        console.log('🎯 Código intercambiable recibido:', code);
        
        resultsDiv.innerHTML = `
            <div class="success">
                <h3>🎉 ¡Embedded Signup Completado Exitosamente!</h3>
                <p><strong>✅ Código intercambiable:</strong> <code style="background: #f8f9fa; padding: 5px; border-radius: 3px;">${code}</code></p>
                <p><strong>⏰ TTL:</strong> 30 segundos (intercambiar rápidamente)</p>
                <p><strong>🔄 Estado:</strong> Enviando al servidor para intercambio por token...</p>
            </div>
        `;
        
        // Intercambiar código por token en el servidor
        fetch('/api/exchange-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: code })
        })
        .then(response => response.json())
        .then(data => {
            resultsDiv.innerHTML += `
                <div class="info-box">
                    <h3>🔄 Resultado del Intercambio de Token</h3>
                    <div class="json-display">${JSON.stringify(data, null, 2)}</div>
                </div>
            `;
        })
        .catch(error => {
            console.error('Error en intercambio:', error);
            resultsDiv.innerHTML += `
                <div class="error">
                    <h3>❌ Error en el Intercambio</h3>
                    <p>No se pudo intercambiar el código por el token: ${error.message}</p>
                    <p><small>Verifica que el servidor esté funcionando y que las credenciales sean correctas.</small></p>
                </div>
            `;
        });
    } else {
        console.log('❌ Error o cancelación del usuario:', response);
        resultsDiv.innerHTML = `
            <div class="warning">
                <h3>⚠️ Flujo Cancelado o Error</h3>
                <p>El usuario canceló el flujo o ocurrió un error:</p>
                <div class="json-display">${JSON.stringify(response, null, 2)}</div>
            </div>
        `;
    }
};

// ===================================================================
// LAUNCH METHOD - Iniciar el flujo de WhatsApp Embedded Signup
// ===================================================================
// Esta función lanza el flujo oficial de Embedded Signup usando FB.login()
// Parámetros importantes:
// - config_id: ID de configuración creado en Meta Developer Console
// - response_type: 'code' para recibir código intercambiable
// - override_default_response_type: true (requerido para WhatsApp)
// - extras.featureType: '' (vacío para flujo por defecto)
// - extras.sessionInfoVersion: '3' (versión actual)
// Documentación: https://developers.facebook.com/docs/whatsapp/embedded-signup/implementation
const launchWhatsAppSignup = () => {
    if (!sdkReady) {
        alert('⏳ El SDK de Facebook aún se está cargando. Espera un momento.');
        return;
    }
    
    console.log('🚀 Iniciando WhatsApp Embedded Signup...');
    
    // Limpiar resultados anteriores
    document.getElementById('results').style.display = 'none';
    document.getElementById('signup-results').style.display = 'none';
    
    FB.login(fbLoginCallback, {
        config_id: window.APP_CONFIG.CONFIGURATION_ID,  // ID de configuración de WhatsApp
        response_type: 'code',
        override_default_response_type: true,
        extras: {
            setup: {},
            featureType: '', // Vacío para flujo por defecto
            sessionInfoVersion: '3'
        }
    });
};

// ===================================================================
// INSTAGRAM LOGIN - Instagram API with Facebook Login (Oficial)
// ===================================================================
// Implementación basada en la documentación oficial de Meta:
// https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login
// https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/business-login-for-instagram
const launchInstagramLogin = () => {
    console.log('📸 Iniciando Instagram API with Facebook Login...');
    
    // Verificar configuración
    const instagramAppId = window.APP_CONFIG.INSTAGRAM_APP_ID;
    if (!instagramAppId) {
        alert('⚠️ Instagram no está configurado. Configura INSTAGRAM_APP_ID en .env');
        return;
    }
    
    // Generar state único para rastrear la sesión
    const state = 'ig_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // ===================================================================
    // PERMISOS COMPLETOS PARA PRODUCCIÓN - Instagram API with Facebook Login
    // ===================================================================
    // Documentación: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login
    // IMPORTANTE: Estos permisos requieren App Review para funcionar con cuentas de terceros
    
    const permissions = [
        // PERMISOS BÁSICOS (Automáticos - No requieren App Review)
        'public_profile',                    // Perfil público del usuario
        'email',                            // Email del usuario
        
        // PERMISOS ESTÁNDAR (Requieren App Review)
        'pages_show_list',                  // Listar páginas de Facebook del usuario
        'pages_read_engagement',            // Leer métricas de interacción de páginas
        'pages_manage_metadata',            // Gestionar metadatos de páginas
        'pages_messaging',                  // Enviar mensajes desde páginas
        
        // PERMISOS DE INSTAGRAM BUSINESS (Requieren App Review)
        'instagram_basic',                  // Acceso básico a perfil de Instagram Business
        'instagram_content_publish',        // Publicar contenido en Instagram
        'instagram_manage_comments',        // Gestionar comentarios de Instagram
        'instagram_manage_insights',        // Acceso a métricas e insights de Instagram
        'instagram_manage_messages',        // Enviar y recibir mensajes directos de Instagram
        
        // PERMISOS DE GESTIÓN COMERCIAL (Requieren App Review)
        'business_management',              // Gestión de activos comerciales
        'ads_management',                   // Gestión de anuncios (opcional)
        'leads_retrieval'                   // Recuperación de leads (opcional)
    ];
    
    // NOTA: Para testing durante desarrollo, comentar los permisos avanzados
    // y usar solo: ['public_profile', 'email', 'pages_show_list']
    
    // URL de autorización según documentación oficial
    const redirectUri = encodeURIComponent(window.APP_CONFIG.INSTAGRAM_REDIRECT_URI);
    const scope = permissions.join(',');
    
    // Usar Facebook Login Dialog (método recomendado)
    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${instagramAppId}&redirect_uri=${redirectUri}&state=${state}&scope=${scope}&response_type=code&display=popup`;
    
    console.log('🔗 Iniciando Facebook Login Dialog:', {
        app_id: instagramAppId,
        redirect_uri: window.APP_CONFIG.INSTAGRAM_REDIRECT_URI,
        state: state,
        permissions: permissions,
        api_version: 'v19.0'
    });
    
    // Mostrar información del proceso
    const resultsDiv = document.getElementById('results');
    resultsDiv.style.display = 'block';
    resultsDiv.innerHTML = `
        <div class="info-box">
            <h3>📸 Instagram API with Facebook Login</h3>
            <p>Iniciando proceso de autorización oficial de Meta...</p>
            <p><strong>Flujo:</strong> Instagram API with Facebook Login</p>
            <p><strong>Versión API:</strong> Graph API v19.0</p>
            
            <h4>🔐 Permisos Solicitados:</h4>
            <ul style="text-align: left;">
                <li><strong>instagram_basic:</strong> Acceso básico al perfil</li>
                <li><strong>instagram_content_publish:</strong> Publicar contenido</li>
                <li><strong>instagram_manage_comments:</strong> Gestionar comentarios</li>
                <li><strong>instagram_manage_insights:</strong> Acceso a métricas</li>
                <li><strong>pages_show_list:</strong> Listar páginas de Facebook</li>
                <li><strong>pages_read_engagement:</strong> Leer interacciones</li>
                <li><strong>business_management:</strong> Gestión comercial</li>
            </ul>
            
            <div style="background: #e7f3ff; padding: 10px; border-radius: 5px; margin: 10px 0;">
                <p><strong>📋 Estado de la Sesión:</strong> ${state}</p>
                <p><strong>🔄 Redirigiendo...</strong> Si no se redirige automáticamente, 
                <a href="${authUrl}" target="_blank" style="color: #007bff;">haz clic aquí</a></p>
            </div>
        </div>
    `;
    
    // Redirigir al usuario al Facebook Login Dialog
    setTimeout(() => {
        window.location.href = authUrl;
    }, 1500); // Pequeña pausa para mostrar la información
};

// Función de verificación de estado
function checkStatus() {
    fetch('/api/status')
        .then(response => response.json())
        .then(data => {
            const results = document.getElementById('results');
            results.style.display = 'block';
            results.innerHTML = `
                <div class="info-box">
                    <h3>📊 Estado del Servidor</h3>
                    <div class="json-display">${JSON.stringify(data, null, 2)}</div>
                </div>
            `;
        })
        .catch(error => {
            console.error('Error:', error);
            const results = document.getElementById('results');
            results.style.display = 'block';
            results.innerHTML = `
                <div class="error">
                    <h3>❌ Error de Conexión</h3>
                    <p>No se pudo obtener el estado del servidor: ${error.message}</p>
                </div>
            `;
        });
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    const signupBtn = document.getElementById('whatsapp-signup-btn');
    if (signupBtn) {
        signupBtn.addEventListener('click', launchWhatsAppSignup);
    }
});
