const express = require('express');
const axios = require('axios');
const router = express.Router();

// ===================================================================
// MESSENGER PLATFORM API - TESTING ENDPOINTS
// ===================================================================
// Basado en: https://developers.facebook.com/docs/messenger-platform/send-messages/

// ENDPOINT: /messenger/send-message
// Enviar mensaje de texto básico usando Instagram Direct Messages API
router.post('/send-message', async (req, res) => {
    const { recipient_id, message_text, access_token, page_id } = req.body;
    
    console.log(' Enviando mensaje de Instagram:', {
        recipient_id,
        message_text: message_text?.substring(0, 50) + '...',
        page_id,
        access_token_length: access_token?.length
    });
    
    // Validar parámetros requeridos
    if (!recipient_id || !message_text || !access_token || !page_id) {
        return res.status(400).json({
            success: false,
            error: 'Parámetros requeridos: recipient_id, message_text, access_token, page_id',
            received: {
                recipient_id: !!recipient_id,
                message_text: !!message_text,
                access_token: !!access_token,
                page_id: !!page_id
            }
        });
    }
    
    try {
        // Construir el payload según la documentación oficial
        const messagePayload = {
            recipient: {
                id: recipient_id
            },
            messaging_type: "RESPONSE",
            message: {
                text: message_text
            }
        };
        
        console.log(' Payload del mensaje:', JSON.stringify(messagePayload, null, 2));
        
        // Enviar mensaje usando Instagram Direct Messages API
        const response = await axios.post(
            `https://graph.instagram.com/v23.0/me/messages`,
            messagePayload,
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                params: {
                    access_token: access_token
                }
            }
        );
        
        console.log(' Mensaje enviado exitosamente:', response.data);
        
        res.json({
            success: true,
            message: 'Mensaje enviado exitosamente via Instagram Direct Messages API',
            response_data: response.data,
            recipient_id: response.data.recipient_id,
            message_id: response.data.message_id,
            sent_at: new Date().toISOString()
        });
        
    } catch (error) {
        console.error(' Error enviando mensaje de Instagram:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message
        });
        
        res.status(500).json({
            success: false,
            error: 'Error enviando mensaje via Instagram Direct Messages API',
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

// ENDPOINT: /messenger/send-image
// Enviar imagen usando Instagram Direct Messages API
router.post('/send-image', async (req, res) => {
    const { recipient_id, image_url, access_token, page_id } = req.body;
    
    console.log(' Enviando imagen de Instagram:', {
        recipient_id,
        image_url,
        page_id,
        access_token_length: access_token?.length
    });
    
    if (!recipient_id || !image_url || !access_token || !page_id) {
        return res.status(400).json({
            success: false,
            error: 'Parámetros requeridos: recipient_id, image_url, access_token, page_id'
        });
    }
    
    try {
        const messagePayload = {
            recipient: {
                id: recipient_id
            },
            messaging_type: "RESPONSE",
            message: {
                attachment: {
                    type: "image",
                    payload: {
                        url: image_url,
                        is_reusable: true
                    }
                }
            }
        };
        
        console.log(' Payload de imagen:', JSON.stringify(messagePayload, null, 2));
        
        const response = await axios.post(
            `https://graph.instagram.com/v23.0/me/messages`,
            messagePayload,
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                params: {
                    access_token: access_token
                }
            }
        );
        
        console.log(' Imagen enviada exitosamente:', response.data);
        
        res.json({
            success: true,
            message: 'Imagen enviada exitosamente via Instagram Direct Messages API',
            response_data: response.data,
            recipient_id: response.data.recipient_id,
            message_id: response.data.message_id,
            sent_at: new Date().toISOString()
        });
        
    } catch (error) {
        console.error(' Error enviando imagen de Instagram:', error.response?.data || error.message);
        
        res.status(500).json({
            success: false,
            error: 'Error enviando imagen via Instagram Direct Messages API',
            details: error.response?.data || error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ENDPOINT: /messenger/test-page
// Página de prueba para enviar mensajes
router.get('/test', (req, res) => {
    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Instagram Direct Messages API - Pruebas</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #0084ff 0%, #00c6ff 100%);
            min-height: 100vh;
            color: #333;
        }
        .container {
            max-width: 800px;
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
            background: #1877f2;
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
            background: #166fe5;
        }
        .btn-image {
            background: #42b883;
        }
        .btn-image:hover {
            background: #369870;
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
    </style>
</head>
<body>
    <div class="container">
        <h1> Instagram Direct Messages API - Pruebas</h1>
        
        <div class="info-box">
            <h3> Información Importante</h3>
            <p><strong>Para usar esta herramienta necesitas:</strong></p>
            <ul>
                <li><strong>Access Token:</strong> Token obtenido del Instagram Login</li>
                <li><strong>Page ID:</strong> ID de tu página de Instagram</li>
                <li><strong>Recipient ID (PSID):</strong> ID específico de la página del destinatario</li>
            </ul>
            <p><small> El PSID se obtiene cuando alguien envía un mensaje a tu página primero.</small></p>
        </div>

        <form id="messageForm">
            <div class="form-group">
                <label for="access_token">Access Token:</label>
                <input type="text" id="access_token" name="access_token" 
                       placeholder="Pega aquí el token obtenido del Instagram Login" required>
            </div>
            
            <div class="form-group">
                <label for="page_id">Page ID:</label>
                <input type="text" id="page_id" name="page_id" 
                       placeholder="ID de tu página de Instagram (ej: 122111317922944356)" required>
            </div>
            
            <div class="form-group">
                <label for="recipient_id">Recipient ID (PSID):</label>
                <input type="text" id="recipient_id" name="recipient_id" 
                       placeholder="ID específico de la página del destinatario" required>
            </div>
            
            <div class="form-group">
                <label for="message_text">Mensaje:</label>
                <textarea id="message_text" name="message_text" 
                          placeholder="Escribe tu mensaje aquí..." required></textarea>
            </div>
            
            <button type="button" class="btn" onclick="sendTextMessage()">
                Enviar Mensaje de Texto
            </button>
        </form>

        <form id="imageForm" style="margin-top: 30px;">
            <h3> Enviar Imagen</h3>
            <div class="form-group">
                <label for="image_url">URL de la Imagen:</label>
                <input type="url" id="image_url" name="image_url" 
                       placeholder="https://ejemplo.com/imagen.jpg" required>
            </div>
            
            <button type="button" class="btn btn-image" onclick="sendImageMessage()">
                Enviar Imagen
            </button>
        </form>

        <div id="results" class="results"></div>
    </div>

    <script>
        async function sendTextMessage() {
            const formData = {
                access_token: document.getElementById('access_token').value,
                page_id: document.getElementById('page_id').value,
                recipient_id: document.getElementById('recipient_id').value,
                message_text: document.getElementById('message_text').value
            };
            
            if (!formData.access_token || !formData.page_id || !formData.recipient_id || !formData.message_text) {
                alert('Por favor completa todos los campos');
                return;
            }
            
            showLoading();
            
            try {
                const response = await fetch('/messenger/send-message', {
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
            const formData = {
                access_token: document.getElementById('access_token').value,
                page_id: document.getElementById('page_id').value,
                recipient_id: document.getElementById('recipient_id').value,
                image_url: document.getElementById('image_url').value
            };
            
            if (!formData.access_token || !formData.page_id || !formData.recipient_id || !formData.image_url) {
                alert('Por favor completa todos los campos');
                return;
            }
            
            showLoading();
            
            try {
                const response = await fetch('/messenger/send-image', {
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
            results.innerHTML = '<p> Enviando mensaje...</p>';
        }
        
        function showResults(data, success) {
            const results = document.getElementById('results');
            results.style.display = 'block';
            
            const statusClass = success ? 'success' : 'error';
            const statusIcon = success ? ' ' : ' ';
            const statusText = success ? 'Mensaje Enviado Exitosamente' : 'Error al Enviar Mensaje';
            
            results.innerHTML = \`
                <div class="\${statusClass}">
                    <h3>\${statusIcon} \${statusText}</h3>
                    \${success && data.message_id ? '<p><strong>Message ID:</strong> ' + data.message_id + '</p>' : ''}
                    \${success && data.recipient_id ? '<p><strong>Recipient ID:</strong> ' + data.recipient_id + '</p>' : ''}
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
