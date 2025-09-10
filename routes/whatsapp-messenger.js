const express = require('express');
const axios = require('axios');
const router = express.Router();

// ===================================================================
// WHATSAPP CLOUD API - TESTING ENDPOINTS
// ===================================================================
// Basado en: https://developers.facebook.com/docs/whatsapp/cloud-api/

// ENDPOINT: /whatsapp-messenger/send-text
// Enviar mensaje de texto usando WhatsApp Cloud API
router.post('/send-text', async (req, res) => {
    const { to, message_text, access_token, phone_number_id } = req.body;
    
    console.log('📱 Enviando mensaje de WhatsApp:', {
        to,
        message_text: message_text?.substring(0, 50) + '...',
        phone_number_id,
        access_token_length: access_token?.length
    });
    
    // Validar parámetros requeridos
    if (!to || !message_text || !access_token || !phone_number_id) {
        return res.status(400).json({
            success: false,
            error: 'Parámetros requeridos: to, message_text, access_token, phone_number_id',
            received: {
                to: !!to,
                message_text: !!message_text,
                access_token: !!access_token,
                phone_number_id: !!phone_number_id
            }
        });
    }
    
    try {
        // Construir el payload según la documentación oficial
        const messagePayload = {
            messaging_product: "whatsapp",
            to: to,
            type: "text",
            text: {
                body: message_text
            }
        };
        
        console.log('📄 Payload del mensaje:', JSON.stringify(messagePayload, null, 2));
        
        const apiUrl = `https://graph.facebook.com/v21.0/${phone_number_id}/messages`;
        
        console.log(`🌐 URL del API: ${apiUrl}`);
        
        // Enviar mensaje usando WhatsApp Cloud API
        const response = await axios.post(
            apiUrl,
            messagePayload,
            {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('✅ Mensaje enviado exitosamente:', response.data);
        
        res.json({
            success: true,
            message: 'Mensaje enviado exitosamente via WhatsApp Cloud API',
            response_data: response.data,
            message_id: response.data.messages?.[0]?.id,
            sent_at: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error enviando mensaje de WhatsApp:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message
        });
        
        res.status(500).json({
            success: false,
            error: 'Error enviando mensaje via WhatsApp Cloud API',
            details: {
                status: error.response?.status,
                statusText: error.response?.statusText,
                error_data: error.response?.data,
                message: error.message
            },
            timestamp: new Date().toISOString()
        });
    }
});

// ENDPOINT: /whatsapp-messenger/send-image
// Enviar imagen usando WhatsApp Cloud API
router.post('/send-image', async (req, res) => {
    const { to, image_url, caption, access_token, phone_number_id } = req.body;
    
    console.log('🖼️ Enviando imagen de WhatsApp:', {
        to,
        image_url,
        caption,
        phone_number_id,
        access_token_length: access_token?.length
    });
    
    if (!to || !image_url || !access_token || !phone_number_id) {
        return res.status(400).json({
            success: false,
            error: 'Parámetros requeridos: to, image_url, access_token, phone_number_id'
        });
    }
    
    try {
        const messagePayload = {
            messaging_product: "whatsapp",
            to: to,
            type: "image",
            image: {
                link: image_url,
                ...(caption && { caption: caption })
            }
        };
        
        console.log('📄 Payload de imagen:', JSON.stringify(messagePayload, null, 2));
        
        const response = await axios.post(
            `https://graph.facebook.com/v21.0/${phone_number_id}/messages`,
            messagePayload,
            {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('✅ Imagen enviada exitosamente:', response.data);
        
        res.json({
            success: true,
            message: 'Imagen enviada exitosamente via WhatsApp Cloud API',
            response_data: response.data,
            message_id: response.data.messages?.[0]?.id,
            sent_at: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error enviando imagen de WhatsApp:', error.response?.data || error.message);
        
        res.status(500).json({
            success: false,
            error: 'Error enviando imagen via WhatsApp Cloud API',
            details: error.response?.data || error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ENDPOINT: /whatsapp-messenger/typing-on
// Activar indicador de escritura
router.post('/typing-on', async (req, res) => {
    const { to, access_token, phone_number_id } = req.body;
    
    console.log('⌨️ Activando indicador de escritura:', {
        to,
        phone_number_id,
        access_token_length: access_token?.length
    });
    
    if (!to || !access_token || !phone_number_id) {
        return res.status(400).json({
            success: false,
            error: 'Parámetros requeridos: to, access_token, phone_number_id'
        });
    }
    
    try {
        const payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: to,
            type: "typing_on"
        };
        
        console.log('📄 Payload typing indicator:', JSON.stringify(payload, null, 2));
        
        const response = await axios.post(
            `https://graph.facebook.com/v21.0/${phone_number_id}/messages`,
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('✅ Indicador de escritura activado:', response.data);
        
        res.json({
            success: true,
            message: 'Indicador de escritura activado',
            response_data: response.data,
            sent_at: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error activando indicador de escritura:', error.response?.data || error.message);
        
        res.status(500).json({
            success: false,
            error: 'Error activando indicador de escritura',
            details: error.response?.data || error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ENDPOINT: /whatsapp-messenger/typing-off
// Desactivar indicador de escritura
router.post('/typing-off', async (req, res) => {
    const { to, access_token, phone_number_id } = req.body;
    
    console.log('⌨️ Desactivando indicador de escritura:', {
        to,
        phone_number_id,
        access_token_length: access_token?.length
    });
    
    if (!to || !access_token || !phone_number_id) {
        return res.status(400).json({
            success: false,
            error: 'Parámetros requeridos: to, access_token, phone_number_id'
        });
    }
    
    try {
        const payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: to,
            type: "typing_off"
        };
        
        console.log('📄 Payload typing off:', JSON.stringify(payload, null, 2));
        
        const response = await axios.post(
            `https://graph.facebook.com/v21.0/${phone_number_id}/messages`,
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('✅ Indicador de escritura desactivado:', response.data);
        
        res.json({
            success: true,
            message: 'Indicador de escritura desactivado',
            response_data: response.data,
            sent_at: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error desactivando indicador de escritura:', error.response?.data || error.message);
        
        res.status(500).json({
            success: false,
            error: 'Error desactivando indicador de escritura',
            details: error.response?.data || error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ENDPOINT: /whatsapp-messenger/mark-read
// Marcar mensaje como leído
router.post('/mark-read', async (req, res) => {
    const { message_id, access_token, phone_number_id } = req.body;
    
    console.log('👁️ Marcando mensaje como leído:', {
        message_id,
        phone_number_id,
        access_token_length: access_token?.length
    });
    
    if (!message_id || !access_token || !phone_number_id) {
        return res.status(400).json({
            success: false,
            error: 'Parámetros requeridos: message_id, access_token, phone_number_id'
        });
    }
    
    try {
        const payload = {
            messaging_product: "whatsapp",
            status: "read",
            message_id: message_id
        };
        
        console.log('📄 Payload mark as read:', JSON.stringify(payload, null, 2));
        
        const response = await axios.post(
            `https://graph.facebook.com/v21.0/${phone_number_id}/messages`,
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('✅ Mensaje marcado como leído:', response.data);
        
        res.json({
            success: true,
            message: 'Mensaje marcado como leído',
            response_data: response.data,
            sent_at: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error marcando mensaje como leído:', error.response?.data || error.message);
        
        res.status(500).json({
            success: false,
            error: 'Error marcando mensaje como leído',
            details: error.response?.data || error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ENDPOINT: /whatsapp-messenger/test
// Página de prueba para enviar mensajes de WhatsApp
router.get('/test', (req, res) => {
    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WhatsApp Cloud API - Pruebas</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #25d366 0%, #128c7e 100%);
            min-height: 100vh;
            color: #333;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        h1 {
            color: #25d366;
            text-align: center;
            margin-bottom: 30px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
            color: #333;
        }
        input, textarea {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-size: 16px;
            box-sizing: border-box;
        }
        textarea {
            height: 100px;
            resize: vertical;
        }
        .btn {
            background: #25d366;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            margin: 10px 5px;
            transition: background 0.3s;
        }
        .btn:hover {
            background: #128c7e;
        }
        .btn-image {
            background: #34b7f1;
        }
        .btn-image:hover {
            background: #0088cc;
        }
        .btn-typing {
            background: #ff9500;
        }
        .btn-typing:hover {
            background: #e6851a;
        }
        .btn-read {
            background: #007aff;
        }
        .btn-read:hover {
            background: #0056b3;
        }
        .results {
            margin-top: 30px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
            display: none;
        }
        .success {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
            padding: 15px;
            border-radius: 5px;
            margin: 10px 0;
        }
        .error {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
            padding: 15px;
            border-radius: 5px;
            margin: 10px 0;
        }
        .json-display {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            padding: 15px;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            white-space: pre-wrap;
            font-size: 12px;
            max-height: 300px;
            overflow-y: auto;
        }
        .info-box {
            background: #e7f3ff;
            border: 1px solid #b8daff;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .section {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            background: #f9f9f9;
        }
        .section h3 {
            margin-top: 0;
            color: #25d366;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📱 WhatsApp Cloud API - Pruebas</h1>
        
        <div class="info-box">
            <h3>📋 Información Importante</h3>
            <p><strong>Para usar esta herramienta necesitas:</strong></p>
            <ul>
                <li><strong>Access Token:</strong> Token obtenido del WhatsApp Embedded Signup</li>
                <li><strong>Phone Number ID:</strong> ID del número de WhatsApp Business</li>
                <li><strong>Recipient Number:</strong> Número de teléfono del destinatario (formato: 5491123456789)</li>
            </ul>
            <p><small>💡 Los números deben incluir código de país sin el símbolo +</small></p>
        </div>

        <!-- Configuración Global -->
        <div class="section">
            <h3>⚙️ Configuración Global</h3>
            <div class="form-group">
                <label for="access_token">Access Token:</label>
                <input type="text" id="access_token" name="access_token" 
                       placeholder="Token obtenido del WhatsApp Embedded Signup" required>
            </div>
            
            <div class="form-group">
                <label for="phone_number_id">Phone Number ID:</label>
                <input type="text" id="phone_number_id" name="phone_number_id" 
                       placeholder="ID del número de WhatsApp Business" required>
            </div>
            
            <div class="form-group">
                <label for="to">Número de Destinatario:</label>
                <input type="text" id="to" name="to" 
                       placeholder="5491123456789 (incluir código de país)" required>
            </div>
        </div>

        <!-- Enviar Mensaje de Texto -->
        <div class="section">
            <h3>💬 Enviar Mensaje de Texto</h3>
            <div class="form-group">
                <label for="message_text">Mensaje:</label>
                <textarea id="message_text" name="message_text" 
                          placeholder="Escribe tu mensaje aquí..." required></textarea>
            </div>
            
            <button type="button" class="btn" onclick="sendTextMessage()">
                📝 Enviar Mensaje de Texto
            </button>
        </div>

        <!-- Enviar Imagen -->
        <div class="section">
            <h3>🖼️ Enviar Imagen</h3>
            <div class="form-group">
                <label for="image_url">URL de la Imagen:</label>
                <input type="url" id="image_url" name="image_url" 
                       placeholder="https://ejemplo.com/imagen.jpg" required>
            </div>
            
            <div class="form-group">
                <label for="image_caption">Descripción (Opcional):</label>
                <input type="text" id="image_caption" name="image_caption" 
                       placeholder="Descripción de la imagen">
            </div>
            
            <button type="button" class="btn btn-image" onclick="sendImageMessage()">
                📷 Enviar Imagen
            </button>
        </div>

        <!-- Indicadores de Escritura -->
        <div class="section">
            <h3>⌨️ Indicadores de Escritura</h3>
            <button type="button" class="btn btn-typing" onclick="sendTypingOn()">
                ⌨️ Activar "Escribiendo..."
            </button>
            
            <button type="button" class="btn btn-typing" onclick="sendTypingOff()">
                ⏹️ Desactivar "Escribiendo..."
            </button>
        </div>

        <!-- Marcar como Leído -->
        <div class="section">
            <h3>👁️ Marcar Mensaje como Leído</h3>
            <div class="form-group">
                <label for="message_id_read">Message ID:</label>
                <input type="text" id="message_id_read" name="message_id_read" 
                       placeholder="ID del mensaje a marcar como leído" required>
            </div>
            
            <button type="button" class="btn btn-read" onclick="markMessageAsRead()">
                ✅ Marcar como Leído
            </button>
        </div>

        <div id="results" class="results"></div>
    </div>

    <script>
        function getGlobalConfig() {
            return {
                access_token: document.getElementById('access_token').value,
                phone_number_id: document.getElementById('phone_number_id').value,
                to: document.getElementById('to').value
            };
        }

        function validateGlobalConfig(config) {
            if (!config.access_token || !config.phone_number_id || !config.to) {
                alert('Por favor completa la configuración global (Access Token, Phone Number ID y Número de Destinatario)');
                return false;
            }
            return true;
        }

        async function sendTextMessage() {
            const config = getGlobalConfig();
            if (!validateGlobalConfig(config)) return;

            const message_text = document.getElementById('message_text').value;
            if (!message_text) {
                alert('Por favor escribe un mensaje');
                return;
            }

            const formData = {
                ...config,
                message_text: message_text
            };
            
            showLoading();
            
            try {
                const response = await fetch('/whatsapp-messenger/send-text', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });
                
                const result = await response.json();
                showResults(result, response.ok);
                
            } catch (error) {
                showResults({ error: error.message }, false);
            }
        }
        
        async function sendImageMessage() {
            const config = getGlobalConfig();
            if (!validateGlobalConfig(config)) return;

            const image_url = document.getElementById('image_url').value;
            if (!image_url) {
                alert('Por favor proporciona una URL de imagen');
                return;
            }

            const formData = {
                ...config,
                image_url: image_url,
                caption: document.getElementById('image_caption').value
            };
            
            showLoading();
            
            try {
                const response = await fetch('/whatsapp-messenger/send-image', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });
                
                const result = await response.json();
                showResults(result, response.ok);
                
            } catch (error) {
                showResults({ error: error.message }, false);
            }
        }

        async function sendTypingOn() {
            const config = getGlobalConfig();
            if (!validateGlobalConfig(config)) return;
            
            showLoading();
            
            try {
                const response = await fetch('/whatsapp-messenger/typing-on', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(config)
                });
                
                const result = await response.json();
                showResults(result, response.ok);
                
            } catch (error) {
                showResults({ error: error.message }, false);
            }
        }

        async function sendTypingOff() {
            const config = getGlobalConfig();
            if (!validateGlobalConfig(config)) return;
            
            showLoading();
            
            try {
                const response = await fetch('/whatsapp-messenger/typing-off', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(config)
                });
                
                const result = await response.json();
                showResults(result, response.ok);
                
            } catch (error) {
                showResults({ error: error.message }, false);
            }
        }

        async function markMessageAsRead() {
            const config = getGlobalConfig();
            if (!validateGlobalConfig(config)) return;

            const message_id = document.getElementById('message_id_read').value;
            if (!message_id) {
                alert('Por favor proporciona un Message ID');
                return;
            }

            const formData = {
                access_token: config.access_token,
                phone_number_id: config.phone_number_id,
                message_id: message_id
            };
            
            showLoading();
            
            try {
                const response = await fetch('/whatsapp-messenger/mark-read', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });
                
                const result = await response.json();
                showResults(result, response.ok);
                
            } catch (error) {
                showResults({ error: error.message }, false);
            }
        }
        
        function showLoading() {
            const results = document.getElementById('results');
            results.style.display = 'block';
            results.innerHTML = '<p>⏳ Enviando solicitud...</p>';
        }
        
        function showResults(data, success) {
            const results = document.getElementById('results');
            results.style.display = 'block';
            
            const statusClass = success ? 'success' : 'error';
            const statusIcon = success ? '✅' : '❌';
            const statusText = success ? 'Operación Exitosa' : 'Error en la Operación';
            
            results.innerHTML = \`
                <div class="\${statusClass}">
                    <h3>\${statusIcon} \${statusText}</h3>
                    \${success && data.message_id ? '<p><strong>Message ID:</strong> ' + data.message_id + '</p>' : ''}
                </div>
                <div class="json-display">\${JSON.stringify(data, null, 2)}</div>
            \`;
        }
    </script>
</body>
</html>
    `;
    res.send(html);
});

module.exports = router;
