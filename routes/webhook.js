const express = require('express');
const router = express.Router();
const psidHelper = require('./psid-helper');

// ===================================================================
// WEBHOOK ENDPOINTS - WhatsApp Cloud API
// ===================================================================

// ENDPOINT: GET /webhook
router.get('/', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    console.log('🔍 Verificación de webhook recibida:', { mode, token: token ? 'PRESENTE' : 'AUSENTE' });
    
    if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
        console.log('✅ Webhook verificado correctamente');
        res.status(200).send(challenge);
    } else {
        console.log('❌ Token de webhook inválido o modo incorrecto');
        res.sendStatus(403);
    }
});

// ENDPOINT: POST /webhook
router.post('/', (req, res) => {
    const body = req.body;
    
    console.log('📨 Webhook recibido:', JSON.stringify(body, null, 2));
    
    // ===================================================================
    // CAPTURAR PSID PARA MESSENGER PLATFORM API
    // ===================================================================
    if (body.object === 'page') {
        console.log('📄 Webhook de Facebook Page recibido');
        
        body.entry.forEach(entry => {
            // Procesar mensajes de Messenger
            if (entry.messaging) {
                entry.messaging.forEach(event => {
                    const senderId = event.sender.id;
                    const recipientId = event.recipient.id; // Page ID
                    
                    console.log('🆔 PSID ENCONTRADO:', {
                        psid: senderId,
                        page_id: recipientId,
                        timestamp: event.timestamp
                    });
                    
                    // Si es un mensaje de texto
                    if (event.message && event.message.text) {
                        console.log('💬 Mensaje de Messenger recibido:', {
                            psid: senderId,
                            message: event.message.text,
                            message_id: event.message.mid,
                            timestamp: event.timestamp
                        });
                        
                        // Guardar PSID capturado
                        psidHelper.addCapturedPSID(senderId, recipientId, event.message.text);
                    } else {
                        // Guardar PSID sin mensaje
                        psidHelper.addCapturedPSID(senderId, recipientId);
                    }
                    
                    // Si es un postback
                    if (event.postback) {
                        console.log('🔘 Postback recibido:', {
                            psid: senderId,
                            payload: event.postback.payload,
                            title: event.postback.title
                        });
                    }
                });
            }
            
            // Procesar cambios en la página
            if (entry.changes) {
                entry.changes.forEach(change => {
                    console.log('📄 Cambio en página:', {
                        field: change.field,
                        value: change.value
                    });
                });
            }
        });
        
        res.status(200).send('EVENT_RECEIVED');
        return;
    }
    
    if (body.object === 'whatsapp_business_account') {
        body.entry.forEach(entry => {
            const changes = entry.changes;
            
            changes.forEach(change => {
                if (change.field === 'messages') {
                    const value = change.value;
                    
                    if (value.messages) {
                        value.messages.forEach(message => {
                            console.log('📱 Mensaje recibido:', {
                                from: message.from,
                                id: message.id,
                                timestamp: message.timestamp,
                                type: message.type,
                                text: message.text?.body || 'N/A'
                            });
                        });
                    }
                    
                    if (value.statuses) {
                        value.statuses.forEach(status => {
                            console.log('📊 Estado de mensaje:', {
                                id: status.id,
                                status: status.status,
                                timestamp: status.timestamp,
                                recipient_id: status.recipient_id
                            });
                        });
                    }
                }
            });
        });
        
        res.status(200).send('EVENT_RECEIVED');
    } else if (body.object === 'instagram') {
        console.log('📸 Procesando webhook de Instagram...');
        
        body.entry.forEach(entry => {
            console.log('📸 Entrada de Instagram:', {
                id: entry.id,
                time: entry.time,
                changes: entry.changes?.length || 0
            });
            
            entry.changes?.forEach(change => {
                console.log('📸 Cambio detectado:', {
                    field: change.field,
                    value: change.value
                });
                
                if (change.field === 'messages' && change.value) {
                    const { sender, recipient, message, timestamp } = change.value;
                    
                    console.log('📸 Mensaje de Instagram recibido:', {
                        from: sender?.id,
                        to: recipient?.id,
                        message_id: message?.mid,
                        text: message?.text,
                        timestamp: timestamp
                    });
                    
                    // Capturar PSID de Instagram
                    if (sender?.id && recipient?.id) {
                        console.log('🆔 PSID de Instagram capturado:', {
                            psid: sender.id,
                            instagram_account_id: recipient.id,
                            platform: 'instagram',
                            timestamp: timestamp
                        });
                        
                        // Guardar PSID de Instagram
                        psidHelper.addCapturedPSID(sender.id, recipient.id, message?.text || null);
                    }
                }
                
                // Capturar PSIDs de comentarios de Instagram
                if (change.field === 'comments' && change.value) {
                    const { from, post, comment_id, text } = change.value;
                    
                    console.log('💬 Comentario de Instagram recibido:', {
                        from: from?.id,
                        post_id: post?.id,
                        comment_id: comment_id,
                        text: text
                    });
                    
                    if (from?.id) {
                        console.log('🆔 PSID de comentario Instagram:', {
                            psid: from.id,
                            post_id: post?.id,
                            platform: 'instagram_comment'
                        });
                        
                        // Guardar PSID de comentario
                        psidHelper.addCapturedPSID(from.id, entry.id, `Comentario: ${text}`);
                    }
                }
                
                // Capturar PSIDs de menciones en stories
                if (change.field === 'story_insights' && change.value) {
                    console.log('📸 Mención en story de Instagram:', change.value);
                }
                
                if (change.field === 'comments') {
                    console.log('💬 Comentario de Instagram:', change.value);
                }
                
                if (change.field === 'mentions') {
                    console.log('🏷️ Mención de Instagram:', change.value);
                }
            });
        });
        
        res.status(200).send('EVENT_RECEIVED');
    } else {
        console.log('❌ Objeto de webhook no reconocido:', body.object);
        res.sendStatus(404);
    }
});

module.exports = router;
