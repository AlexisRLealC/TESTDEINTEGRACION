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
