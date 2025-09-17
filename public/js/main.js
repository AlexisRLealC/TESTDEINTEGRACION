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
    console.log('🔥 === CALLBACK COMPLETO DE WHATSAPP ===');
    console.log('📊 Respuesta completa recibida:', response);
    console.log('🔍 Tipo de respuesta:', typeof response);
    console.log('📋 Propiedades disponibles:', Object.keys(response));
    
    // Log detallado de cada propiedad importante
    if (response.status) {
        console.log('📌 Status:', response.status);
    }
    
    if (response.authResponse) {
        console.log('🔐 AuthResponse encontrado:', response.authResponse);
        console.log('🔑 Código disponible:', !!response.authResponse.code);
        if (response.authResponse.code) {
            console.log('📝 Código (primeros 20 chars):', response.authResponse.code.substring(0, 20) + '...');
        }
    } else {
        console.log('⚠️ NO HAY authResponse en la respuesta');
    }
    
    // Log de metadatos adicionales
    if (response._timestamp) {
        console.log('⏰ Timestamp:', response._timestamp);
    }
    
    if (response._userAgent) {
        console.log('🌐 User Agent:', response._userAgent);
    }
    
    console.log('🔥 === FIN CALLBACK WHATSAPP ===');
    
    const resultsDiv = document.getElementById('results');
    resultsDiv.style.display = 'block';
    
    // Limpiar intervalo de QR si existe
    if (qrRefreshInterval) {
        clearInterval(qrRefreshInterval);
        qrRefreshInterval = null;
    }
    
    // Verificar si el flujo fue exitoso (hay código de intercambio)
    if (response.authResponse && response.authResponse.code) {
        console.log('✅ Flujo exitoso - Código recibido para intercambio');
        
        const code = response.authResponse.code;
        
        resultsDiv.innerHTML = `
            <div class="success">
                <h3>✅ WhatsApp Embedded Signup Exitoso</h3>
                <p><strong>Estado:</strong> ${response.status}</p>
                <p><strong>Código recibido:</strong> ${code.substring(0, 20)}...</p>
                <p><strong>Timestamp:</strong> ${response._timestamp || 'No disponible'}</p>
                
                <div style="background: #d1ecf1; padding: 15px; border-radius: 5px; margin: 15px 0; color: #0c5460;">
                    <h4>🔄 Intercambiando código por token...</h4>
                    <p>Enviando código al servidor para obtener access token.</p>
                </div>
                
                <div class="json-display">
                    <strong>Respuesta completa:</strong>
                    ${JSON.stringify(response, null, 2)}
                </div>
            </div>
        `;
        
        // Intercambiar código por token
        fetch('/api/exchange-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: code })
        })
        .then(response => response.json())
        .then(data => {
            console.log('🔄 Respuesta del intercambio de token:', data);
            
            resultsDiv.innerHTML = `
                <div class="${data.success ? 'success' : 'error'}">
                    <h3>${data.success ? '✅' : '❌'} Intercambio de Token</h3>
                    <p><strong>Mensaje:</strong> ${data.message}</p>
                    
                    ${data.success ? `
                        <div style="background: #d4edda; padding: 15px; border-radius: 5px; margin: 15px 0; color: #155724;">
                            <h4>🎉 ¡WhatsApp Business Configurado!</h4>
                            <p>Tu cuenta está lista para enviar mensajes.</p>
                            ${data.token_data && data.token_data.access_token ? `
                                <div style="background: #fff3cd; padding: 10px; border-radius: 5px; margin: 10px 0; color: #856404;">
                                    <h5>🔑 Access Token Recibido:</h5>
                                    <p><strong>Token:</strong> ${data.token_data.access_token.substring(0, 30)}...</p>
                                    <p><strong>Tipo:</strong> ${data.token_data.token_type || 'bearer'}</p>
                                    ${data.token_data.expires_in ? `<p><strong>Expira en:</strong> ${data.token_data.expires_in} segundos</p>` : ''}
                                </div>
                            ` : ''}
                            ${data.next_steps ? `
                                <p><strong>Próximos pasos:</strong></p>
                                <ul>
                                    ${data.next_steps.map(step => `<li>${step}</li>`).join('')}
                                </ul>
                            ` : ''}
                        </div>
                    ` : `
                        <div style="background: #f8d7da; padding: 15px; border-radius: 5px; margin: 15px 0; color: #721c24;">
                            <h4>❌ Error en Intercambio</h4>
                            <p>${data.details || 'Error desconocido'}</p>
                        </div>
                    `}
                    
                    <div class="json-display">
                        <strong>Respuesta del servidor:</strong>
                        ${JSON.stringify(data, null, 2)}
                    </div>
                </div>
            `;
        })
        .catch(error => {
            console.error('❌ Error intercambiando token:', error);
            resultsDiv.innerHTML = `
                <div class="error">
                    <h3>❌ Error de Conexión</h3>
                    <p>No se pudo intercambiar el código por token: ${error.message}</p>
                    <p><strong>Código recibido:</strong> ${code.substring(0, 20)}...</p>
                </div>
            `;
        });
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
                    <h3>⚠️ Autorización Cancelada</h3>
                    <p>El usuario canceló el proceso de autorización.</p>
                    <p><strong>Estado:</strong> ${response.status}</p>
                    <p><strong>Timestamp:</strong> ${response._timestamp || 'No disponible'}</p>
                    
                    <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0; color: #856404;">
                        <h4>💡 ¿Qué hacer ahora?</h4>
                        <p>Puedes intentar el proceso nuevamente haciendo click en el botón de WhatsApp.</p>
                    </div>
                    
                    <div class="json-display">
                        <strong>Respuesta completa:</strong>
                        ${JSON.stringify(response, null, 2)}
                    </div>
                </div>
            `;
        } else if (isUnknownError) {
            console.log('❓ Estado "unknown" detectado - analizando causa...');
            
            // Log adicional para debugging
            console.log('🔍 Análisis detallado del estado unknown:');
            console.log('  - authResponse presente:', !!response.authResponse);
            console.log('  - Propiedades de response:', Object.keys(response));
            console.log('  - User Agent:', response._userAgent);
            console.log('  - Timestamp:', response._timestamp);
            
            // Verificar si hay algún código oculto o datos adicionales
            if (response.authResponse) {
                console.log('  - authResponse keys:', Object.keys(response.authResponse));
                console.log('  - authResponse values:', response.authResponse);
            }
            
            // Intentar obtener más información del estado de Facebook
            if (typeof FB !== 'undefined') {
                console.log('🔍 Intentando obtener estado actual de Facebook...');
                FB.getLoginStatus((fbResponse) => {
                    console.log('📊 Estado actual de FB después de unknown:', fbResponse);
                }, true);
            }
            
            resultsDiv.innerHTML = `
                <div class="error">
                    <h3>❓ Estado Desconocido (Unknown)</h3>
                    <p>Facebook devolvió un estado "unknown" que puede indicar varios problemas.</p>
                    <p><strong>Estado:</strong> ${response.status}</p>
                    <p><strong>Timestamp:</strong> ${response._timestamp || 'No disponible'}</p>
                    
                    <div style="background: #f8d7da; padding: 15px; border-radius: 5px; margin: 15px 0; color: #721c24;">
                        <h4>🔧 Posibles Causas del Estado "Unknown":</h4>
                        <ul>
                            <li><strong>Configuración de dominio:</strong> El dominio no está autorizado en Meta Developer Console</li>
                            <li><strong>App Review:</strong> La app necesita revisión para ciertos permisos</li>
                            <li><strong>Configuración de Login:</strong> Facebook Login for Business mal configurado</li>
                            <li><strong>Popup bloqueado:</strong> El navegador bloqueó el popup de autorización</li>
                            <li><strong>Usuario no logueado:</strong> El usuario no está logueado en Facebook</li>
                            <li><strong>Permisos insuficientes:</strong> La app no tiene los permisos necesarios</li>
                        </ul>
                    </div>
                    
                    <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0; color: #856404;">
                        <h4>✅ Pasos para Resolver:</h4>
                        <ol>
                            <li><strong>Verificar dominio:</strong> Agregar <code>${window.location.hostname}</code> a "Dominios de la app" en Meta Developer Console</li>
                            <li><strong>Verificar configuración:</strong> Facebook Login for Business → Settings → Client OAuth settings</li>
                            <li><strong>Verificar permisos:</strong> whatsapp_business_management, whatsapp_business_messaging</li>
                            <li><strong>Probar en incógnito:</strong> Usar ventana de incógnito para descartar problemas de cache</li>
                            <li><strong>Verificar popup:</strong> Asegurarse de que no hay bloqueadores de popup activos</li>
                        </ol>
                    </div>
                    
                    <div class="json-display">
                        <strong>Respuesta completa para debugging:</strong>
                        ${JSON.stringify(response, null, 2)}
                    </div>
                    
                    <div style="margin-top: 15px;">
                        <button onclick="checkFBStatus()" class="btn" style="background: #1877f2; color: white; padding: 10px 15px; border: none; border-radius: 5px; cursor: pointer;">
                            🔍 Verificar Estado de Facebook
                        </button>
                    </div>
                </div>
            `;
        }
    }
    // Manejar caso de timeout
    else if (response.status === 'timeout') {
        console.log('⏰ Timeout detectado en el flujo');
        resultsDiv.innerHTML = `
            <div class="warning">
                <h3>⏰ Tiempo de Espera Agotado</h3>
                <p>El popup no respondió en el tiempo esperado (60 segundos).</p>
                <p><strong>Error:</strong> ${response.error || 'Timeout'}</p>
                
                <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0; color: #856404;">
                    <h4>🔧 Posibles Causas:</h4>
                    <ul>
                        <li>Conexión a internet lenta</li>
                        <li>Popup bloqueado por el navegador</li>
                        <li>Problemas temporales con Facebook</li>
                    </ul>
                    <p><strong>Solución:</strong> Intenta nuevamente en unos momentos.</p>
                </div>
                
                <div class="json-display">
                    <strong>Respuesta completa:</strong>
                    ${JSON.stringify(response, null, 2)}
                </div>
            </div>
        `;
    }
    // Caso de respuesta conectada pero sin authResponse (problema común)
    else if (response.status === 'connected' && !response.authResponse) {
        console.log('⚠️ Estado conectado pero sin authResponse - problema conocido');
        
        // Intentar verificar el estado actual de Facebook
        checkFBStatus();
        
        resultsDiv.innerHTML = `
            <div class="warning">
                <h3>⚠️ Respuesta Incompleta</h3>
                <p>Facebook reporta estado "conectado" pero no proporcionó datos de autorización.</p>
                <p><strong>Estado:</strong> ${response.status}</p>
                <p><strong>Timestamp:</strong> ${response._timestamp || 'No disponible'}</p>
                
                <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0; color: #856404;">
                    <h4>🔍 Verificando Estado...</h4>
                    <p>Consultando el estado actual de Facebook para obtener más información.</p>
                </div>
                
                <div class="json-display">
                    <strong>Respuesta recibida:</strong>
                    ${JSON.stringify(response, null, 2)}
                </div>
            </div>
        `;
    }
    // Cualquier otro caso no manejado
    else {
        console.log('❓ Respuesta no reconocida:', response);
        resultsDiv.innerHTML = `
            <div class="warning">
                <h3>❓ Respuesta No Reconocida</h3>
                <p>Se recibió una respuesta que no coincide con los casos esperados.</p>
                <p><strong>Estado:</strong> ${response.status || 'No disponible'}</p>
                <p><strong>Timestamp:</strong> ${response._timestamp || 'No disponible'}</p>
                
                <div style="background: #e2e3e5; padding: 15px; border-radius: 5px; margin: 15px 0; color: #383d41;">
                    <h4>🔍 Información de Debug</h4>
                    <p>Esta información puede ser útil para diagnosticar el problema:</p>
                </div>
                
                <div class="json-display">
                    <strong>Respuesta completa:</strong>
                    ${JSON.stringify(response, null, 2)}
                </div>
            </div>
        `;
    }
};

// ===================================================================
// UTILITY FUNCTIONS - Funciones auxiliares para UI
// ===================================================================
function updateUI(message, type = 'info') {
    const resultsDiv = document.getElementById('results');
    if (!resultsDiv) return;
    
    resultsDiv.style.display = 'block';
    
    let className = 'info-box';
    let icon = 'ℹ️';
    
    switch (type) {
        case 'error':
            className = 'error';
            icon = '❌';
            break;
        case 'success':
            className = 'success';
            icon = '✅';
            break;
        case 'warning':
            className = 'warning';
            icon = '⚠️';
            break;
        default:
            className = 'info-box';
            icon = 'ℹ️';
    }
    
    resultsDiv.innerHTML = `
        <div class="${className}">
            <h3>${icon} ${type.charAt(0).toUpperCase() + type.slice(1)}</h3>
            <p>${message}</p>
        </div>
    `;
}

// ===================================================================
// WHATSAPP EMBEDDED SIGNUP - Función para iniciar el flujo de WhatsApp Embedded Signup
// ===================================================================
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
// WHATSAPP EMBEDDED SIGNUP - Función de lanzamiento principal
// ===================================================================
function launchWhatsAppSignup() {
    console.log('🚀 Lanzando WhatsApp Embedded Signup...');
    
    // Verificar configuración requerida
    if (!window.APP_CONFIG || !window.APP_CONFIG.CONFIGURATION_ID) {
        updateUI('Error: CONFIGURATION_ID no está configurado. Revisa tu archivo .env', 'error');
        return;
    }
    
    if (!window.APP_CONFIG.APP_ID) {
        updateUI('Error: APP_ID no está configurado. Revisa tu archivo .env', 'error');
        return;
    }
    
    // Verificar que el SDK de Facebook esté cargado
    if (typeof FB === 'undefined') {
        updateUI('Error: Facebook SDK no está cargado. Verifica tu conexión a internet.', 'error');
        return;
    }
    
    // Llamar a la función principal de signup
    startEmbeddedSignup();
}

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
            <p><strong>Funcionalidades disponibles:</strong></p>
            <ul style="text-align: left;">
                <li>📤 Envío de mensajes de texto</li>
                <li>🖼️ Envío de imágenes con caption</li>
                <li>⌨️ Indicadores de escritura (typing on/off)</li>
                <li>✅ Marcar mensajes como leídos</li>
            </ul>
            
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

// ===================================================================
// WHATSAPP API TESTER - Función para abrir el tester de WhatsApp API
// ===================================================================
function openWhatsAppTester() {
    console.log('💬 Abriendo WhatsApp API Tester...');
    
    // Mostrar información del proceso
    const resultsDiv = document.getElementById('results');
    resultsDiv.style.display = 'block';
    resultsDiv.innerHTML = `
        <div class="info-box">
            <h3>💬 WhatsApp Cloud API Tester</h3>
            <p>Abriendo interfaz de pruebas para WhatsApp Business Cloud API...</p>
            <p><strong>Funcionalidades disponibles:</strong></p>
            <ul style="text-align: left;">
                <li>📤 Envío de mensajes de texto</li>
                <li>🖼️ Envío de imágenes con caption</li>
                <li>⌨️ Indicadores de escritura (typing on/off)</li>
                <li>✅ Marcar mensajes como leídos</li>
            </ul>
            
            <div style="background: #d1ecf1; padding: 10px; border-radius: 5px; margin: 10px 0; color: #0c5460;">
                <p><strong>🔗 Redirigiendo...</strong> Se abrirá la página de pruebas en una nueva ventana</p>
                <p><strong>📋 Requisitos:</strong> Access Token y Phone Number ID de WhatsApp Business</p>
            </div>
        </div>
    `;
    
    // Abrir en nueva ventana/pestaña
    window.open('/whatsapp-messenger/test', '_blank');
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    const signupBtn = document.getElementById('whatsapp-signup-btn');
    if (signupBtn) {
        signupBtn.addEventListener('click', launchWhatsAppSignup);
    }
});

// ===================================================================
// TOKEN MANAGEMENT - Gestión automática de tokens en frontend
// ===================================================================

// Función para verificar información de un token
async function checkTokenInfo(accessToken) {
    console.log('🔍 Verificando información del token...');
    
    try {
        const response = await fetch(`/api/token-info/${encodeURIComponent(accessToken)}`);
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Información del token:', data.token_info);
            return data.token_info;
        } else {
            console.error('❌ Error verificando token:', data.error);
            return null;
        }
    } catch (error) {
        console.error('❌ Error de conexión verificando token:', error);
        return null;
    }
}

// Función para renovar un token automáticamente
async function refreshToken(accessToken) {
    console.log('🔄 Iniciando renovación automática de token...');
    
    try {
        const response = await fetch('/api/refresh-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ access_token: accessToken })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Token renovado exitosamente:', {
                old_expiry: data.old_token_info.expires_at_formatted,
                new_expiry: data.new_token_data.expires_at_formatted,
                extension_days: data.refresh_summary.extension_days
            });
            
            return {
                success: true,
                new_token: data.new_token_data.access_token,
                expires_at: data.new_token_data.expires_at,
                extension_days: data.refresh_summary.extension_days
            };
        } else {
            console.error('❌ Error renovando token:', data.error);
            return { success: false, error: data.error };
        }
    } catch (error) {
        console.error('❌ Error de conexión renovando token:', error);
        return { success: false, error: error.message };
    }
}

// Función para verificar y renovar token automáticamente si es necesario
async function autoRefreshTokenIfNeeded(accessToken) {
    console.log('🤖 Verificando si el token necesita renovación automática...');
    
    const tokenInfo = await checkTokenInfo(accessToken);
    
    if (!tokenInfo) {
        return { success: false, error: 'No se pudo verificar el token' };
    }
    
    if (!tokenInfo.is_valid) {
        console.log('❌ Token no válido, no se puede renovar');
        return { success: false, error: 'Token no válido' };
    }
    
    if (tokenInfo.needs_refresh) {
        console.log('⚠️ Token necesita renovación, iniciando proceso automático...');
        
        const refreshResult = await refreshToken(accessToken);
        
        if (refreshResult.success) {
            console.log('🎉 Token renovado automáticamente con éxito');
            return {
                success: true,
                action: 'refreshed',
                old_token: accessToken,
                new_token: refreshResult.new_token,
                expires_at: refreshResult.expires_at,
                extension_days: refreshResult.extension_days
            };
        } else {
            return { success: false, error: refreshResult.error };
        }
    } else {
        console.log('✅ Token aún válido, no necesita renovación');
        return {
            success: true,
            action: 'no_refresh_needed',
            token: accessToken,
            expires_at: tokenInfo.expires_at,
            time_until_expiry_hours: tokenInfo.time_until_expiry_hours
        };
    }
}

// Función para mostrar información de token en la UI
function displayTokenInfo(tokenInfo, containerId = 'results') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const now = new Date();
    const expiryDate = new Date(tokenInfo.expires_at * 1000);
    const isExpiringSoon = tokenInfo.time_until_expiry_hours < 24;
    
    container.innerHTML = `
        <div class="${tokenInfo.is_valid ? (isExpiringSoon ? 'warning' : 'success') : 'error'}">
            <h3>🔑 Información del Token</h3>
            <p><strong>Estado:</strong> ${tokenInfo.is_valid ? '✅ Válido' : '❌ Inválido'}</p>
            <p><strong>Tipo:</strong> ${tokenInfo.type}</p>
            <p><strong>User ID:</strong> ${tokenInfo.user_id}</p>
            <p><strong>Expira:</strong> ${expiryDate.toLocaleString()}</p>
            <p><strong>Tiempo restante:</strong> ${tokenInfo.time_until_expiry_hours} horas</p>
            
            ${isExpiringSoon && tokenInfo.is_valid ? `
                <div style="background: #fff3cd; padding: 10px; border-radius: 5px; margin: 10px 0; color: #856404;">
                    <h5>⚠️ Token Expirando Pronto</h5>
                    <p>Este token expirará en menos de 24 horas. Se recomienda renovarlo.</p>
                    <button onclick="handleTokenRefresh('${tokenInfo.user_id}')" class="btn" style="background: #ffc107; color: #212529; padding: 8px 12px; border: none; border-radius: 4px; cursor: pointer;">
                        🔄 Renovar Token Ahora
                    </button>
                </div>
            ` : ''}
            
            ${tokenInfo.scopes ? `
                <div style="margin-top: 15px;">
                    <h5>📋 Permisos (Scopes):</h5>
                    <div style="background: #f8f9fa; padding: 10px; border-radius: 5px; font-family: monospace; font-size: 12px;">
                        ${tokenInfo.scopes.join(', ')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

// Función para manejar la renovación de token desde la UI
async function handleTokenRefresh(userId) {
    console.log('🔄 Iniciando renovación de token desde UI...');
    
    // Aquí deberías obtener el token actual del usuario
    // Por ejemplo, desde localStorage, sessionStorage, o una variable global
    const currentToken = getCurrentUserToken(userId);
    
    if (!currentToken) {
        alert('❌ No se encontró el token actual para renovar');
        return;
    }
    
    const refreshResult = await refreshToken(currentToken);
    
    if (refreshResult.success) {
        // Actualizar el token almacenado
        updateStoredToken(userId, refreshResult.new_token);
        
        // Mostrar mensaje de éxito
        const container = document.getElementById('results');
        container.innerHTML = `
            <div class="success">
                <h3>🎉 Token Renovado Exitosamente</h3>
                <p><strong>Nuevo token:</strong> ${refreshResult.new_token.substring(0, 30)}...</p>
                <p><strong>Extensión:</strong> ${refreshResult.extension_days} días adicionales</p>
                <p><strong>Nueva expiración:</strong> ${new Date(refreshResult.expires_at * 1000).toLocaleString()}</p>
            </div>
        `;
    } else {
        alert(`❌ Error renovando token: ${refreshResult.error}`);
    }
}

// Funciones auxiliares para manejo de tokens (implementar según tu sistema)
function getCurrentUserToken(userId) {
    // Implementar según cómo almacenas los tokens
    // Ejemplo: return localStorage.getItem(`whatsapp_token_${userId}`);
    console.log('⚠️ getCurrentUserToken no implementado para userId:', userId);
    return null;
}

function updateStoredToken(userId, newToken) {
    // Implementar según cómo almacenas los tokens
    // Ejemplo: localStorage.setItem(`whatsapp_token_${userId}`, newToken);
    console.log('⚠️ updateStoredToken no implementado para userId:', userId);
}

// Función para configurar renovación automática periódica
function setupAutoTokenRefresh(checkIntervalMinutes = 60) {
    console.log(`🤖 Configurando verificación automática de tokens cada ${checkIntervalMinutes} minutos`);
    
    setInterval(async () => {
        console.log('🔍 Verificación automática de tokens programada...');
        
        // Obtener todos los tokens almacenados
        const storedTokens = getAllStoredTokens();
        
        for (const tokenData of storedTokens) {
            try {
                const result = await autoRefreshTokenIfNeeded(tokenData.access_token);
                
                if (result.success && result.action === 'refreshed') {
                    console.log(`✅ Token auto-renovado para usuario ${tokenData.user_id}`);
                    updateStoredToken(tokenData.user_id, result.new_token);
                }
            } catch (error) {
                console.error(`❌ Error en auto-refresh para usuario ${tokenData.user_id}:`, error);
            }
        }
    }, checkIntervalMinutes * 60 * 1000);
}

function getAllStoredTokens() {
    // Implementar según tu sistema de almacenamiento
    // Ejemplo: obtener todos los tokens de localStorage
    console.log('⚠️ getAllStoredTokens no implementado');
    return [];
}
