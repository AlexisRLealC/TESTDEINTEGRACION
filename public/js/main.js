// ===================================================================
// VARIABLES GLOBALES
// ===================================================================
let sdkReady = false;  // Flag para verificar si el SDK está listo
let qrRefreshInterval = null; // Intervalo para regenerar QR

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
    signupBtn.innerHTML = '📱 Conectar WhatsApp Business';
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
const fbLoginCallback = (response) => {
    console.log('📱 Respuesta completa de FB.login:', JSON.stringify(response, null, 2));
    
    const resultsDiv = document.getElementById('results');
    resultsDiv.style.display = 'block';
    
    // Verificar si hay authResponse con código
    if (response.authResponse && response.authResponse.code) {
        const code = response.authResponse.code;
        console.log('✅ Código de autorización recibido:', code);
        
        resultsDiv.innerHTML = `
            <div class="success">
                <h3>✅ Autorización Exitosa</h3>
                <p>Se recibió el código de autorización. Procesando...</p>
                <div class="json-display">${JSON.stringify(response.authResponse, null, 2)}</div>
                <p><small>⏱️ El código expira en 30 segundos - Intercambiando automáticamente...</small></p>
            </div>
        `;
        
        // Enviar código al servidor para intercambio inmediato
        fetch('/api/exchange-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code: code })
        })
        .then(response => response.json())
        .then(data => {
            console.log('🔄 Respuesta del intercambio de token:', data);
            
            if (data.success) {
                resultsDiv.innerHTML = `
                    <div class="success">
                        <h3>🎉 Token Intercambiado Exitosamente</h3>
                        <p><strong>Estado:</strong> Cliente registrado correctamente</p>
                        <div class="json-display">${JSON.stringify(data, null, 2)}</div>
                        <p><small>✅ El cliente ya puede usar WhatsApp Business API</small></p>
                    </div>
                `;
            } else {
                resultsDiv.innerHTML = `
                    <div class="error">
                        <h3>❌ Error en Intercambio de Token</h3>
                        <p><strong>Error:</strong> ${data.error}</p>
                        <div class="json-display">${JSON.stringify(data, null, 2)}</div>
                        <p><small>Verifica que el servidor esté funcionando y que las credenciales sean correctas.</small></p>
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('❌ Error en intercambio de token:', error);
            resultsDiv.innerHTML = `
                <div class="error">
                    <h3>❌ Error de Conexión</h3>
                    <p>No se pudo intercambiar el token: ${error.message}</p>
                    <p><small>Verifica que el servidor esté funcionando y que las credenciales sean correctas.</small></p>
                </div>
            `;
        });
    } 
    // Verificar si es un estado "connected" sin authResponse (posible flujo exitoso)
    else if (response.status === 'connected' && !response.authResponse) {
        console.log('⚠️ Estado "connected" sin authResponse - posible flujo exitoso pero sin código');
        resultsDiv.innerHTML = `
            <div class="warning">
                <h3>⚠️ Flujo Completado sin Código</h3>
                <p>El flujo parece haberse completado (status: connected) pero no se recibió código de autorización.</p>
                <div class="json-display">${JSON.stringify(response, null, 2)}</div>
                <p><small>Esto puede indicar que el usuario ya está autorizado o hay un problema de configuración.</small></p>
                <button onclick="checkFBStatus()" class="btn btn-secondary">🔍 Verificar Estado de Facebook</button>
            </div>
        `;
    }
    // Verificar si el usuario canceló explícitamente
    else if (response.status === 'not_authorized' || response.status === 'unknown') {
        console.log('❌ Usuario no autorizado o estado desconocido:', response);
        
        // Distinguir entre cancelación real y error técnico
        const isCancellation = response.status === 'not_authorized';
        const isUnknownError = response.status === 'unknown' && !response.authResponse;
        
        if (isCancellation) {
            resultsDiv.innerHTML = `
                <div class="warning">
                    <h3>⚠️ Autorización Denegada</h3>
                    <p>El usuario no autorizó la aplicación o canceló el flujo.</p>
                    <div class="json-display">${JSON.stringify(response, null, 2)}</div>
                    <p><small>Para usar WhatsApp Business API, es necesario completar el proceso de autorización.</small></p>
                </div>
            `;
        } else if (isUnknownError) {
            resultsDiv.innerHTML = `
                <div class="error">
                    <h3>🔍 Estado Desconocido Detectado</h3>
                    <p>Se recibió un estado "unknown" con authResponse null. Esto puede indicar:</p>
                    <ul>
                        <li>El popup se cerró antes de completar el flujo</li>
                        <li>Problema de configuración en Meta Developer Console</li>
                        <li>Dominio no autorizado para la aplicación</li>
                        <li>El flujo se completó pero hubo un error en la comunicación</li>
                    </ul>
                    <div class="json-display">${JSON.stringify(response, null, 2)}</div>
                    <p><small><strong>Sugerencia:</strong> Verifica la configuración del dominio en Meta Developer Console y vuelve a intentar.</small></p>
                    <button onclick="checkFBStatus()" class="btn btn-secondary">🔍 Verificar Estado de Facebook</button>
                </div>
            `;
        }
    }
    // Cualquier otro caso no manejado
    else {
        console.log('❓ Respuesta no reconocida:', response);
        resultsDiv.innerHTML = `
            <div class="warning">
                <h3>❓ Respuesta No Reconocida</h3>
                <p>Se recibió una respuesta que no coincide con los patrones esperados:</p>
                <div class="json-display">${JSON.stringify(response, null, 2)}</div>
                <p><small>Por favor, reporta este caso para mejorar el manejo de errores.</small></p>
                <button onclick="checkFBStatus()" class="btn btn-secondary">🔍 Verificar Estado de Facebook</button>
            </div>
        `;
    }
};

// Nueva función para verificar el estado actual de Facebook
const checkFBStatus = () => {
    console.log('🔍 Verificando estado actual de Facebook...');
    
    // Verificar si FB está disponible
    if (typeof FB === 'undefined') {
        console.error('❌ Facebook SDK no está disponible');
        const statusDiv = document.createElement('div');
        statusDiv.className = 'error';
        statusDiv.innerHTML = `
            <h4>❌ Error: Facebook SDK No Disponible</h4>
            <p>El SDK de Facebook no se ha cargado correctamente. Esto puede deberse a:</p>
            <ul>
                <li>Bloqueador de anuncios o extensiones del navegador</li>
                <li>Problemas de conectividad</li>
                <li>Error en la carga del script de Facebook</li>
            </ul>
            <p><small>Intenta recargar la página o deshabilitar extensiones temporalmente.</small></p>
        `;
        document.getElementById('results').appendChild(statusDiv);
        return;
    }
    
    // Mostrar indicador de carga
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'info';
    loadingDiv.id = 'fb-status-loading';
    loadingDiv.innerHTML = `
        <h4>🔍 Verificando Estado de Facebook...</h4>
        <p>Consultando el estado actual del login...</p>
    `;
    document.getElementById('results').appendChild(loadingDiv);
    
    try {
        FB.getLoginStatus((response) => {
            console.log('📊 Estado actual de FB:', response);
            
            // Remover indicador de carga
            const loading = document.getElementById('fb-status-loading');
            if (loading) {
                loading.remove();
            }
            
            const statusDiv = document.createElement('div');
            statusDiv.className = 'info';
            
            // Interpretar el estado para el usuario
            let statusMessage = '';
            switch (response.status) {
                case 'connected':
                    statusMessage = '✅ Usuario conectado a Facebook';
                    break;
                case 'not_authorized':
                    statusMessage = '⚠️ Usuario no ha autorizado la aplicación';
                    break;
                case 'unknown':
                    statusMessage = '❓ Estado desconocido - Usuario no logueado o error';
                    break;
                default:
                    statusMessage = `❓ Estado no reconocido: ${response.status}`;
            }
            
            statusDiv.innerHTML = `
                <h4>📊 Estado Actual de Facebook</h4>
                <p><strong>${statusMessage}</strong></p>
                <div class="json-display">${JSON.stringify(response, null, 2)}</div>
                <p><small>Timestamp: ${new Date().toLocaleString()}</small></p>
            `;
            
            document.getElementById('results').appendChild(statusDiv);
        }, true); // true = forzar verificación desde servidor
        
    } catch (error) {
        console.error('❌ Error al verificar estado de FB:', error);
        
        // Remover indicador de carga
        const loading = document.getElementById('fb-status-loading');
        if (loading) {
            loading.remove();
        }
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.innerHTML = `
            <h4>❌ Error al Verificar Estado</h4>
            <p>No se pudo consultar el estado de Facebook: ${error.message}</p>
            <p><small>Verifica tu conexión a internet y que Facebook no esté bloqueado.</small></p>
        `;
        document.getElementById('results').appendChild(errorDiv);
    }
};

// Función para iniciar el flujo de WhatsApp Embedded Signup
// - Utiliza FB.login con configuración específica para WhatsApp Business
// - Maneja la UI durante el proceso y refresca el QR periódicamente
const startEmbeddedSignup = () => {
    console.log('🚀 Iniciando WhatsApp Embedded Signup...');
    
    // Actualizar UI para mostrar que el proceso está iniciando
    updateUI('Iniciando proceso de registro...', 'info');
    
    // Verificar si el SDK de Facebook está cargado
    if (typeof FB === 'undefined') {
        console.error('❌ Facebook SDK no está cargado');
        updateUI('Error: Facebook SDK no está disponible', 'error');
        return;
    }
    
    // Configurar el callback antes de iniciar el login
    let popupWindow = null;
    let callbackReceived = false;
    let timeoutId = null;
    
    // Timeout para detectar si el popup no responde
    timeoutId = setTimeout(() => {
        if (!callbackReceived) {
            console.log('⏰ Timeout: No se recibió respuesta del popup en 60 segundos');
            fbLoginCallback({
                status: 'timeout',
                authResponse: null,
                error: 'Timeout esperando respuesta del popup'
            });
        }
    }, 60000); // 60 segundos timeout
    
    // Wrapper del callback original para manejar timing
    const timedCallback = (response) => {
        callbackReceived = true;
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        
        // Agregar timestamp para debugging
        response._timestamp = new Date().toISOString();
        response._userAgent = navigator.userAgent;
        
        fbLoginCallback(response);
    };
    
    console.log('📱 Llamando FB.login con configuración:', {
        config_id: window.APP_CONFIG.CONFIGURATION_ID,
        response_type: 'code',
        override_default_response_type: true,
        display: "popup"
    });
    
    try {
        // Intentar abrir el popup de Facebook
        FB.login(timedCallback, {
            config_id: window.APP_CONFIG.CONFIGURATION_ID,
            response_type: 'code',
            override_default_response_type: true,
            display: "popup",
            extras: {
                setup: {},
                FeatureType: 'whatsapp_business_app_onboarding',
                sessionInfoVersion: '3'
            }
        });
        
        console.log('✅ FB.login llamado exitosamente, esperando respuesta...');
        
    } catch (error) {
        console.error('❌ Error al llamar FB.login:', error);
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        updateUI(`Error al iniciar el flujo: ${error.message}`, 'error');
    }
    
    // Limpiar intervalo anterior si existe
    if (qrRefreshInterval) {
        clearInterval(qrRefreshInterval);
    }
    
    // Limpiar resultados anteriores
    document.getElementById('results').style.display = 'none';
    document.getElementById('signup-results').style.display = 'none';
    
    // Auto-regenerar QR cada 5 minutos para evitar expiración
    qrRefreshInterval = setInterval(() => {
        console.log('🔄 Regenerando código QR para evitar expiración...');
        
        // Mostrar notificación al usuario
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #1877f2;
            color: white;
            padding: 15px;
            border-radius: 8px;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        notification.innerHTML = '🔄 Regenerando código QR...';
        document.body.appendChild(notification);
        
        // Reiniciar el flujo
        FB.login(timedCallback, {
            config_id: window.APP_CONFIG.CONFIGURATION_ID,
            response_type: 'code',
            override_default_response_type: true,
            scope: 'whatsapp_business_management,whatsapp_business_messaging',
            extras: {
                setup: {
                    // Configuración para flujo directo sin pantallas adicionales
                    'skip_confirmation': true,
                    'skip_business_selection': true
                }
            }
        });
        
        // Remover notificación después de 3 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
        
    }, 5 * 60 * 1000); // 5 minutos
};

// ===================================================================
// INSTAGRAM LOGIN - Instagram Business Login (Directo)
// ===================================================================
// Implementación actualizada para usar Instagram Business Login directo
// https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login
function launchInstagramLogin() {
    console.log('📸 Iniciando Instagram Business Login (Directo)...');
    
    if (!window.APP_CONFIG.INSTAGRAM_APP_ID) {
        alert('❌ Error: INSTAGRAM_APP_ID no configurado en el servidor');
        return;
    }
    
    // Generar estado único para seguridad
    const state = 'ig_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    console.log('🔗 Configuración de Instagram Business Login:', {
        app_id: window.APP_CONFIG.INSTAGRAM_APP_ID,
        redirect_uri: window.APP_CONFIG.INSTAGRAM_REDIRECT_URI,
        state: state,
        method: 'Instagram Business Login (Direct)'
    });
    
    // Mostrar información del proceso
    const resultsDiv = document.getElementById('results');
    resultsDiv.style.display = 'block';
    resultsDiv.innerHTML = `
        <div class="info-box">
            <h3>📸 Instagram Business Login (Directo)</h3>
            <p>Iniciando proceso de autorización oficial de Instagram...</p>
            <p><strong>Flujo:</strong> Instagram API with Instagram Login</p>
            <p><strong>Método:</strong> Business Login for Instagram</p>
            <p><strong>Endpoint:</strong> instagram.com/oauth/authorize</p>
            
            <h4>🔐 Permisos Solicitados (Nuevos Scopes 2025):</h4>
            <ul style="text-align: left;">
                <li><strong>instagram_business_basic:</strong> Acceso básico al perfil comercial</li>
                <li><strong>instagram_business_content_publish:</strong> Publicar contenido</li>
                <li><strong>instagram_business_manage_messages:</strong> Gestionar mensajes</li>
                <li><strong>instagram_business_manage_comments:</strong> Gestionar comentarios</li>
            </ul>
            
            <div style="background: #d1ecf1; padding: 10px; border-radius: 5px; margin: 10px 0; color: #0c5460;">
                <p><strong>✨ Nuevo:</strong> Instagram Login Directo en Popup</p>
                <p><strong>📋 Estado de la Sesión:</strong> ${state}</p>
                <p><strong>🪟 Abriendo ventana...</strong> Se abrirá una ventana pequeña para la autorización</p>
                <p><strong>🔄 Forzar login:</strong> Siempre pedirá credenciales de Instagram</p>
            </div>
            
            <div style="background: #fff3cd; padding: 10px; border-radius: 5px; margin: 10px 0; color: #856404;">
                <p><strong>⚠️ Nota:</strong> Si no se abre la ventana popup, verifica que no esté bloqueada por tu navegador.</p>
                <p><strong>🔒 Seguridad:</strong> La ventana se cerrará automáticamente al completar la autorización.</p>
            </div>
        </div>
    `;
    
    // URL del endpoint de Instagram con force_reauth para siempre pedir login
    const authUrl = `/instagram/login?force_reauth=true&state=${state}`;
    
    // Configuración de la ventana popup
    const popupFeatures = [
        'width=500',           // Ancho de la ventana
        'height=700',          // Alto de la ventana
        'left=' + (screen.width / 2 - 250),   // Centrar horizontalmente
        'top=' + (screen.height / 2 - 350),   // Centrar verticalmente
        'scrollbars=yes',      // Permitir scroll si es necesario
        'resizable=yes',       // Permitir redimensionar
        'status=no',           // Sin barra de estado
        'toolbar=no',          // Sin barra de herramientas
        'menubar=no',          // Sin barra de menú
        'location=no'          // Sin barra de dirección
    ].join(',');
    
    console.log('🪟 Abriendo popup de Instagram Login:', {
        url: authUrl,
        features: popupFeatures
    });
    
    // Abrir ventana popup
    const popup = window.open(authUrl, 'instagram_login', popupFeatures);
    
    // Verificar si la ventana se abrió correctamente
    if (!popup) {
        alert('❌ Error: No se pudo abrir la ventana popup. Verifica que no esté bloqueada por tu navegador.');
        return;
    }
    
    // Enfocar la ventana popup
    popup.focus();
    
    // Monitorear el estado de la ventana popup
    const checkClosed = setInterval(() => {
        if (popup.closed) {
            clearInterval(checkClosed);
            console.log('🪟 Ventana popup cerrada');
            
            // Actualizar la UI para mostrar que se cerró la ventana
            const statusDiv = resultsDiv.querySelector('.info-box');
            if (statusDiv) {
                statusDiv.innerHTML += `
                    <div style="background: #f8d7da; padding: 10px; border-radius: 5px; margin: 10px 0; color: #721c24;">
                        <p><strong>🪟 Ventana cerrada</strong></p>
                        <p>Si completaste la autorización, la página se actualizará automáticamente.</p>
                        <p>Si cancelaste, puedes intentar de nuevo haciendo clic en el botón.</p>
                    </div>
                `;
            }
        }
    }, 1000);
    
    // Timeout de seguridad para limpiar el interval después de 10 minutos
    setTimeout(() => {
        clearInterval(checkClosed);
    }, 600000); // 10 minutos
}

// ===================================================================
// TIENDA NUBE LOGIN - OAuth Integration
// ===================================================================
function launchTiendaNube() {
    console.log('🛍️ Iniciando integración OAuth de Tienda Nube...');
    
    // Mostrar información del proceso
    const resultsDiv = document.getElementById('results');
    resultsDiv.style.display = 'block';
    resultsDiv.innerHTML = `
        <div class="info-box">
            <h3>🛍️ Tienda Nube OAuth Integration</h3>
            <p>Iniciando proceso de autorización oficial de Tienda Nube...</p>
            <p><strong>Flujo:</strong> OAuth 2.0 Authorization Code</p>
            <p><strong>Método:</strong> Redirect al portal de autorización</p>
            <p><strong>Endpoint:</strong> tiendanube.com/apps/authorize/auth</p>
            
            <h4>🔐 Proceso de Autorización:</h4>
            <ul style="text-align: left;">
                <li><strong>1.</strong> Redirección a Tienda Nube para login</li>
                <li><strong>2.</strong> Usuario autoriza los permisos solicitados</li>
                <li><strong>3.</strong> Callback con código de autorización (TTL: 5 min)</li>
                <li><strong>4.</strong> Código listo para intercambio por access_token</li>
            </ul>
            
            <div style="background: #d1ecf1; padding: 10px; border-radius: 5px; margin: 10px 0; color: #0c5460;">
                <p><strong>✨ Flujo OAuth Completo</strong></p>
                <p><strong>🔄 Estado:</strong> Redirigiendo a Tienda Nube...</p>
                <p><strong>⏱️ TTL del código:</strong> 5 minutos</p>
                <p><strong>📋 Uso:</strong> El código se mostrará para usar en Postman</p>
            </div>
            
            <div style="background: #fff3cd; padding: 10px; border-radius: 5px; margin: 10px 0; color: #856404;">
                <p><strong>⚠️ Importante:</strong> Después de autorizar, recibirás un código que expira en 5 minutos.</p>
                <p><strong>🔒 Seguridad:</strong> Se incluye protección CSRF con parámetro state.</p>
            </div>
        </div>
    `;
    
    // Redirigir al endpoint de autorización
    console.log('🔗 Redirigiendo a /tiendanube/auth para iniciar OAuth...');
    window.location.href = '/tiendanube/auth';
}

// ===================================================================
// TIENDA NUBE LOGIN - Placeholder function
// ===================================================================
// function launchTiendaNube() {
//     console.log('🛍️ Tienda Nube button clicked - functionality to be implemented');
    
//     const resultsDiv = document.getElementById('results');
//     resultsDiv.style.display = 'block';
//     resultsDiv.innerHTML = `
//         <div class="info-box">
//             <h3>🛍️ Tienda Nube Integration</h3>
//             <p>Esta funcionalidad será implementada próximamente.</p>
//             <p><strong>Estado:</strong> Botón creado - Funcionalidad pendiente</p>
//         </div>
//     `;
// }

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
        signupBtn.addEventListener('click', startEmbeddedSignup);
    }
});
