const express = require('express');
const axios = require('axios');
const router = express.Router();

// ===================================================================
// API ENDPOINTS - Procesamiento de datos del servidor
// ===================================================================

// ENDPOINT: /api/process-signup-data
router.post('/process-signup-data', async (req, res) => {
    console.log('📱 Datos de WhatsApp Embedded Signup recibidos:', req.body);
    
    try {
        const { data, type, event } = req.body;
        
        // Verificar que sea un evento de WhatsApp Embedded Signup exitoso
        if (type !== 'WA_EMBEDDED_SIGNUP' || !data) {
            return res.json({
                success: true,
                message: 'Evento recibido pero no requiere procesamiento',
                received_data: req.body,
                timestamp: new Date().toISOString()
            });
        }
        
        // Extraer datos críticos
        const { phone_number_id, waba_id, business_id } = data;
        
        if (!phone_number_id || !waba_id) {
            console.warn('⚠️ Datos incompletos en signup:', data);
            return res.json({
                success: false,
                error: 'Datos de signup incompletos - faltan phone_number_id o waba_id',
                received_data: req.body
            });
        }
        
        console.log('🔄 Procesando signup exitoso:', {
            phone_number_id,
            waba_id,
            business_id,
            event
        });
        
        // TODO: Aquí se debe implementar el intercambio de token
        // Nota: El código de token viene en el callback de FB.login, no en este mensaje
        // Este endpoint procesa los datos de sesión, el token se maneja por separado
        
        // Respuesta exitosa
        res.json({
            success: true,
            message: 'Signup procesado correctamente - Cliente registrado',
            processed_data: {
                phone_number_id,
                waba_id,
                business_id,
                event,
                status: 'Cliente listo para mensajería'
            },
            next_steps: [
                'Intercambiar código de token por access token',
                'Suscribir app a webhooks de WABA',
                'Registrar número de teléfono para Cloud API',
                'Cliente puede comenzar a enviar mensajes'
            ],
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error procesando signup data:', error);
        
        res.status(500).json({
            success: false,
            error: 'Error interno procesando datos de signup',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ENDPOINT: /api/exchange-token
router.post('/exchange-token', async (req, res) => {
    const { code } = req.body;
    
    if (!code) {
        return res.status(400).json({
            success: false,
            error: 'Código intercambiable requerido'
        });
    }
    
    try {
        console.log('🔄 Intercambiando código por token:', code);
        
        const response = await axios.post('https://graph.facebook.com/v23.0/oauth/access_token', {
            client_id: process.env.APP_ID,
            client_secret: process.env.APP_SECRET,
            code: code
        });
        
        console.log('✅ Token intercambiado exitosamente');
        
        const tokenData = response.data;
        
        res.json({
            success: true,
            message: 'Código intercambiado por token exitosamente',
            token_data: tokenData,
            webhook_url: process.env.WEBHOOK_URL,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error intercambiando código:', error.response?.data || error.message);
        
        res.status(500).json({
            success: false,
            error: 'Error intercambiando código por token',
            details: error.response?.data || error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ENDPOINT: /api/send-message
router.post('/send-message', async (req, res) => {
    const { to, message, access_token, phone_number_id } = req.body;
    
    if (!to || !message || !access_token || !phone_number_id) {
        return res.status(400).json({
            success: false,
            error: 'Parámetros requeridos: to, message, access_token, phone_number_id'
        });
    }
    
    try {
        console.log('📤 Enviando mensaje WhatsApp:', { to, message: message.substring(0, 50) + '...' });
        
        const response = await axios.post(
            `https://graph.facebook.com/v23.0/${phone_number_id}/messages`,
            {
                messaging_product: "whatsapp",
                to: to,
                text: { body: message }
            },
            {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('✅ Mensaje enviado exitosamente:', response.data.messages[0].id);
        
        res.json({
            success: true,
            message_id: response.data.messages[0].id,
            status: 'sent',
            data: response.data,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error enviando mensaje:', error.response?.data || error.message);
        
        res.status(500).json({
            success: false,
            error: 'Error enviando mensaje de WhatsApp',
            details: error.response?.data || error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ENDPOINT: /api/configure-webhook
router.post('/configure-webhook', async (req, res) => {
    const { access_token, waba_id } = req.body;
    
    if (!access_token || !waba_id) {
        return res.status(400).json({
            success: false,
            error: 'Parámetros requeridos: access_token, waba_id'
        });
    }
    
    try {
        console.log('🔗 Configurando webhook para WABA:', waba_id);
        
        const response = await axios.post(
            `https://graph.facebook.com/v23.0/${waba_id}/subscribed_apps`,
            {
                subscribed_fields: ['messages', 'message_deliveries', 'message_reads', 'message_echoes']
            },
            {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('✅ Webhook configurado exitosamente');
        
        res.json({
            success: true,
            message: 'Webhook configurado exitosamente',
            webhook_url: process.env.WEBHOOK_URL,
            webhook_token: 'CONFIGURADO',
            subscribed_fields: ['messages', 'message_deliveries', 'message_reads', 'message_echoes'],
            data: response.data,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error configurando webhook:', error.response?.data || error.message);
        
        res.status(500).json({
            success: false,
            error: 'Error configurando webhook',
            details: error.response?.data || error.message,
            webhook_url: process.env.WEBHOOK_URL,
            timestamp: new Date().toISOString()
        });
    }
});

// ENDPOINT: /api/status
router.get('/status', (req, res) => {
    res.json({
        status: 'running',
        implementation: 'Facebook JavaScript SDK Official + WhatsApp Cloud API',
        app_id: process.env.APP_ID || 'NOT_CONFIGURED',
        app_secret_configured: !!process.env.APP_SECRET,
        configuration_id: process.env.CONFIGURATION_ID || 'NOT_CONFIGURED',
        webhook_verify_token_configured: !!process.env.WEBHOOK_VERIFY_TOKEN,
        webhook_url: process.env.WEBHOOK_URL,
        graph_api_version: 'v23.0',
        timestamp: new Date().toISOString(),
        endpoints: {
            main: '/',
            data_deletion: '/data-deletion',
            exchange_token: '/api/exchange-token',
            process_signup: '/api/process-signup-data',
            webhook_get: '/webhook (GET - verificación)',
            webhook_post: '/webhook (POST - recibir mensajes)',
            send_message: '/api/send-message',
            configure_webhook: '/api/configure-webhook',
            status: '/api/status'
        },
        features: {
            embedded_signup: true,
            webhook_verification: true,
            message_receiving: true,
            message_sending: true,
            automatic_webhook_config: true,
            data_deletion_compliance: true
        },
        configuration_status: {
            facebook_sdk: !!process.env.APP_ID,
            embedded_signup_config: !!process.env.CONFIGURATION_ID,
            webhook_token: !!process.env.WEBHOOK_VERIFY_TOKEN,
            ready_for_production: !!(process.env.APP_ID && process.env.APP_SECRET && process.env.CONFIGURATION_ID && process.env.WEBHOOK_VERIFY_TOKEN)
        }
    });
});

// ENDPOINT: /api/data-deletion-request
router.post('/data-deletion-request', (req, res) => {
    console.log('🗑️ Solicitud de eliminación de datos:', req.body);
    
    res.json({
        success: true,
        message: 'Solicitud de eliminación recibida',
        request_id: 'DEL_' + Date.now(),
        status: 'pending',
        estimated_completion: '30 días'
    });
});

// ENDPOINT: /api/instagram/send-message
router.post('/instagram/send-message', async (req, res) => {
    console.log('📸 Enviando mensaje de Instagram:', req.body);
    
    const { recipient_id, message, access_token } = req.body;
    
    if (!recipient_id || !message || !access_token) {
        return res.status(400).json({
            error: 'Parámetros faltantes',
            required: ['recipient_id', 'message', 'access_token'],
            received: { recipient_id: !!recipient_id, message: !!message, access_token: !!access_token }
        });
    }
    
    try {
        const response = await axios.post('https://graph.instagram.com/v21.0/me/messages', {
            message: JSON.stringify({ text: message }),
            recipient: JSON.stringify({ id: recipient_id })
        }, {
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Mensaje enviado exitosamente:', response.data);
        
        res.json({
            success: true,
            message: 'Mensaje enviado exitosamente',
            instagram_response: response.data,
            sent_at: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error enviando mensaje de Instagram:', error.response?.data || error.message);
        
        res.status(500).json({
            error: 'Error enviando mensaje',
            details: error.response?.data || error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ===================================================================
// WEBHOOK ENDPOINTS - Requeridos para WhatsApp Embedded Signup
// ===================================================================

// ENDPOINT: /webhook - Verificación de webhook (GET)
router.get('/webhook', (req, res) => {
    const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;
    
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('✅ Webhook verificado correctamente');
            res.status(200).send(challenge);
        } else {
            console.error('❌ Token de verificación incorrecto');
            res.sendStatus(403);
        }
    } else {
        console.error('❌ Parámetros de verificación faltantes');
        res.sendStatus(400);
    }
});

// ENDPOINT: /webhook - Recepción de webhooks (POST)
// CRÍTICO: account_update webhook es OBLIGATORIO para Embedded Signup
router.post('/webhook', (req, res) => {
    console.log('📨 Webhook recibido:', JSON.stringify(req.body, null, 2));
    
    try {
        const body = req.body;
        
        if (body.object === 'whatsapp_business_account') {
            body.entry.forEach(entry => {
                entry.changes.forEach(change => {
                    console.log('🔄 Cambio detectado:', change.field, change.value);
                    
                    switch (change.field) {
                        case 'account_update':
                            console.log('📱 Account Update - Cliente completó Embedded Signup');
                            handleAccountUpdate(change.value);
                            break;
                            
                        case 'account_review_update':
                            console.log('📋 Account Review Update');
                            handleAccountReviewUpdate(change.value);
                            break;
                            
                        case 'business_capability_update':
                            console.log('🏢 Business Capability Update');
                            handleBusinessCapabilityUpdate(change.value);
                            break;
                            
                        case 'messages':
                            console.log('💬 Mensaje recibido');
                            handleMessage(change.value);
                            break;
                            
                        default:
                            console.log('📝 Webhook no manejado:', change.field);
                    }
                });
            });
        }
        
        res.status(200).send('EVENT_RECEIVED');
        
    } catch (error) {
        console.error('❌ Error procesando webhook:', error);
        res.status(500).send('ERROR');
    }
});

// Función para manejar account_update (CRÍTICO para Embedded Signup)
function handleAccountUpdate(value) {
    console.log('🎯 Procesando account_update:', value);
    
    // Este webhook se dispara cuando un cliente completa Embedded Signup
    // Contiene información sobre cambios en la WABA del cliente
    if (value.phone_number && value.phone_number.length > 0) {
        value.phone_number.forEach(phone => {
            console.log('📞 Número registrado:', phone.phone_number, 'ID:', phone.id);
        });
    }
    
    if (value.ban_info) {
        console.log('⚠️ Información de ban:', value.ban_info);
    }
    
    // Aquí puedes agregar lógica adicional para procesar el account_update
    // Por ejemplo: actualizar base de datos, notificar al cliente, etc.
}

function handleAccountReviewUpdate(value) {
    console.log('📋 Account Review Update:', value);
}

function handleBusinessCapabilityUpdate(value) {
    console.log('🏢 Business Capability Update:', value);
}

function handleMessage(value) {
    console.log('💬 Mensaje:', value);
}

module.exports = router;
