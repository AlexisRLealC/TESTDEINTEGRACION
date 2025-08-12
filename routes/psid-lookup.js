const express = require('express');
const axios = require('axios');
const router = express.Router();

// ENDPOINT: /psid-lookup/conversations
// Obtener conversaciones y PSIDs desde Graph API
router.get('/conversations', async (req, res) => {
    try {
        const { access_token, page_id } = req.query;
        
        if (!access_token || !page_id) {
            return res.status(400).json({
                error: 'Se requieren access_token y page_id como parámetros'
            });
        }
        
        console.log('🔍 Buscando conversaciones para página:', page_id);
        
        // Obtener conversaciones de la página
        const conversationsResponse = await axios.get(`https://graph.facebook.com/v18.0/${page_id}/conversations`, {
            params: {
                access_token: access_token,
                fields: 'participants,updated_time,message_count'
            }
        });
        
        const conversations = conversationsResponse.data.data;
        const psids = [];
        
        // Extraer PSIDs de cada conversación
        for (const conversation of conversations) {
            if (conversation.participants && conversation.participants.data) {
                for (const participant of conversation.participants.data) {
                    // El participante que no es la página es el PSID del usuario
                    if (participant.id !== page_id) {
                        psids.push({
                            psid: participant.id,
                            conversation_id: conversation.id,
                            updated_time: conversation.updated_time,
                            message_count: conversation.message_count || 0,
                            name: participant.name || 'Usuario desconocido'
                        });
                    }
                }
            }
        }
        
        console.log(`✅ Encontrados ${psids.length} PSIDs activos`);
        
        res.json({
            success: true,
            page_id: page_id,
            psids: psids,
            total_conversations: conversations.length,
            total_psids: psids.length
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo conversaciones:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Error obteniendo conversaciones',
            details: error.response?.data || error.message
        });
    }
});

// ENDPOINT: /psid-lookup/user-info
// Obtener información de un PSID específico
router.get('/user-info', async (req, res) => {
    try {
        const { access_token, psid } = req.query;
        
        if (!access_token || !psid) {
            return res.status(400).json({
                error: 'Se requieren access_token y psid como parámetros'
            });
        }
        
        console.log('🔍 Obteniendo información del PSID:', psid);
        
        // Obtener información del usuario
        const userResponse = await axios.get(`https://graph.facebook.com/v18.0/${psid}`, {
            params: {
                access_token: access_token,
                fields: 'first_name,last_name,profile_pic'
            }
        });
        
        console.log('✅ Información del usuario obtenida:', userResponse.data);
        
        res.json({
            success: true,
            psid: psid,
            user_info: userResponse.data
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo información del usuario:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Error obteniendo información del usuario',
            details: error.response?.data || error.message
        });
    }
});

// ENDPOINT: /psid-lookup/test-page
// Página web para probar búsqueda de PSIDs
router.get('/test', (req, res) => {
    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Búsqueda de PSIDs - Graph API</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
        }
        .container {
            max-width: 1000px;
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
            margin: 20px 0;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
            color: #333;
        }
        input[type="text"] {
            width: 100%;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 16px;
            box-sizing: border-box;
        }
        input[type="text"]:focus {
            border-color: #1877f2;
            outline: none;
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
        .btn-success {
            background: #28a745;
        }
        .btn-success:hover {
            background: #218838;
        }
        .results {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            max-height: 500px;
            overflow-y: auto;
        }
        .psid-item {
            background: white;
            padding: 15px;
            margin: 10px 0;
            border-radius: 8px;
            border-left: 4px solid #1877f2;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .psid-value {
            font-family: 'Courier New', monospace;
            background: #f1f3f4;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 14px;
            word-break: break-all;
        }
        .error {
            background: #f8d7da;
            color: #721c24;
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
        }
        .success {
            background: #d4edda;
            color: #155724;
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
        }
        .info {
            background: #e7f3ff;
            border: 1px solid #b8daff;
            color: #004085;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 Búsqueda de PSIDs via Graph API</h1>
        
        <div class="info">
            <h3>ℹ️ Métodos de Búsqueda</h3>
            <p>Esta herramienta te permite obtener PSIDs usando la Graph API de Meta:</p>
            <ul>
                <li><strong>Conversaciones:</strong> Lista todos los PSIDs que han enviado mensajes a tu página</li>
                <li><strong>Info de Usuario:</strong> Obtiene detalles de un PSID específico</li>
            </ul>
        </div>

        <!-- Formulario para obtener conversaciones -->
        <div class="form-group">
            <h3>📋 Obtener Todas las Conversaciones</h3>
            <label for="access-token-conv">Access Token:</label>
            <input type="text" id="access-token-conv" placeholder="Tu access token de Facebook/Instagram">
            
            <label for="page-id-conv">Page ID:</label>
            <input type="text" id="page-id-conv" placeholder="ID de tu página de Facebook">
            
            <button onclick="getConversations()" class="btn">🔍 Buscar Conversaciones</button>
        </div>

        <!-- Formulario para obtener info de usuario -->
        <div class="form-group">
            <h3>👤 Información de Usuario Específico</h3>
            <label for="access-token-user">Access Token:</label>
            <input type="text" id="access-token-user" placeholder="Tu access token de Facebook/Instagram">
            
            <label for="psid-user">PSID del Usuario:</label>
            <input type="text" id="psid-user" placeholder="PSID específico a consultar">
            
            <button onclick="getUserInfo()" class="btn btn-success">👤 Obtener Info</button>
        </div>

        <!-- Resultados -->
        <div id="results" class="results" style="display: none;">
            <h3>📊 Resultados</h3>
            <div id="results-content"></div>
        </div>

        <div style="text-align: center; margin-top: 30px;">
            <a href="/" class="btn">🏠 Volver al Inicio</a>
            <a href="/psid/help" class="btn">🆔 Ayuda PSID</a>
        </div>
    </div>

    <script>
        async function getConversations() {
            const accessToken = document.getElementById('access-token-conv').value;
            const pageId = document.getElementById('page-id-conv').value;
            
            if (!accessToken || !pageId) {
                showError('Por favor completa todos los campos');
                return;
            }
            
            try {
                showLoading('Obteniendo conversaciones...');
                
                const response = await fetch(\`/psid-lookup/conversations?access_token=\${encodeURIComponent(accessToken)}&page_id=\${encodeURIComponent(pageId)}\`);
                const data = await response.json();
                
                if (data.success) {
                    showConversationsResults(data);
                } else {
                    showError('Error: ' + (data.error || 'Error desconocido'));
                }
            } catch (error) {
                showError('Error de conexión: ' + error.message);
            }
        }
        
        async function getUserInfo() {
            const accessToken = document.getElementById('access-token-user').value;
            const psid = document.getElementById('psid-user').value;
            
            if (!accessToken || !psid) {
                showError('Por favor completa todos los campos');
                return;
            }
            
            try {
                showLoading('Obteniendo información del usuario...');
                
                const response = await fetch(\`/psid-lookup/user-info?access_token=\${encodeURIComponent(accessToken)}&psid=\${encodeURIComponent(psid)}\`);
                const data = await response.json();
                
                if (data.success) {
                    showUserInfoResults(data);
                } else {
                    showError('Error: ' + (data.error || 'Error desconocido'));
                }
            } catch (error) {
                showError('Error de conexión: ' + error.message);
            }
        }
        
        function showConversationsResults(data) {
            const resultsDiv = document.getElementById('results');
            const contentDiv = document.getElementById('results-content');
            
            let html = \`
                <div class="success">
                    ✅ Encontradas \${data.total_conversations} conversaciones con \${data.total_psids} PSIDs únicos
                </div>
            \`;
            
            if (data.psids && data.psids.length > 0) {
                html += '<h4>📋 PSIDs Encontrados:</h4>';
                data.psids.forEach(psid => {
                    html += \`
                        <div class="psid-item">
                            <strong>PSID:</strong> <span class="psid-value">\${psid.psid}</span>
                            <button onclick="copyToClipboard('\${psid.psid}')" style="float: right; background: #28a745; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">📋 Copiar</button><br>
                            <strong>Nombre:</strong> \${psid.name}<br>
                            <strong>Última actividad:</strong> \${new Date(psid.updated_time).toLocaleString()}<br>
                            <strong>Mensajes:</strong> \${psid.message_count}
                        </div>
                    \`;
                });
            } else {
                html += '<p>📭 No se encontraron conversaciones activas.</p>';
            }
            
            contentDiv.innerHTML = html;
            resultsDiv.style.display = 'block';
        }
        
        function showUserInfoResults(data) {
            const resultsDiv = document.getElementById('results');
            const contentDiv = document.getElementById('results-content');
            
            const userInfo = data.user_info;
            let html = \`
                <div class="success">
                    ✅ Información del usuario obtenida exitosamente
                </div>
                <div class="psid-item">
                    <strong>PSID:</strong> <span class="psid-value">\${data.psid}</span>
                    <button onclick="copyToClipboard('\${data.psid}')" style="float: right; background: #28a745; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">📋 Copiar</button><br>
                    <strong>Nombre:</strong> \${userInfo.first_name || ''} \${userInfo.last_name || ''}<br>
                    <strong>ID:</strong> \${userInfo.id}<br>
            \`;
            
            if (userInfo.profile_pic) {
                html += \`<img src="\${userInfo.profile_pic}" alt="Foto de perfil" style="width: 50px; height: 50px; border-radius: 50%; margin-top: 10px;">\`;
            }
            
            html += '</div>';
            
            contentDiv.innerHTML = html;
            resultsDiv.style.display = 'block';
        }
        
        function showLoading(message) {
            const resultsDiv = document.getElementById('results');
            const contentDiv = document.getElementById('results-content');
            
            contentDiv.innerHTML = \`<p>⏳ \${message}</p>\`;
            resultsDiv.style.display = 'block';
        }
        
        function showError(message) {
            const resultsDiv = document.getElementById('results');
            const contentDiv = document.getElementById('results-content');
            
            contentDiv.innerHTML = \`<div class="error">❌ \${message}</div>\`;
            resultsDiv.style.display = 'block';
        }
        
        function copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                alert('✅ PSID copiado al portapapeles: ' + text);
            }).catch(err => {
                prompt('📋 Copia este PSID:', text);
            });
        }
    </script>
</body>
</html>
    `;
    res.send(html);
});

module.exports = router;
