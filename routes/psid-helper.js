const express = require('express');
const router = express.Router();

// Almacén temporal de PSIDs capturados (en producción usar base de datos)
let capturedPSIDs = [];

// Función para agregar PSID capturado
function addCapturedPSID(psid, pageId, message = null) {
    const existingIndex = capturedPSIDs.findIndex(p => p.psid === psid && p.page_id === pageId);
    
    if (existingIndex >= 0) {
        // Actualizar existente
        capturedPSIDs[existingIndex].last_seen = new Date().toISOString();
        capturedPSIDs[existingIndex].message_count++;
        if (message) {
            capturedPSIDs[existingIndex].last_message = message;
        }
    } else {
        // Agregar nuevo
        capturedPSIDs.push({
            psid: psid,
            page_id: pageId,
            first_seen: new Date().toISOString(),
            last_seen: new Date().toISOString(),
            message_count: 1,
            last_message: message
        });
    }
    
    // Mantener solo los últimos 50 PSIDs
    if (capturedPSIDs.length > 50) {
        capturedPSIDs = capturedPSIDs.slice(-50);
    }
}

// ENDPOINT: /psid/captured
// Listar PSIDs capturados
router.get('/captured', (req, res) => {
    res.json({
        success: true,
        count: capturedPSIDs.length,
        psids: capturedPSIDs.sort((a, b) => new Date(b.last_seen) - new Date(a.last_seen)),
        instructions: {
            how_to_get_psid: "Pide a alguien que envíe un mensaje a tu página de Facebook. El PSID aparecerá automáticamente aquí.",
            webhook_required: "Asegúrate de que tu webhook esté configurado en Meta Developer Console",
            webhook_url: process.env.WEBHOOK_URL
        }
    });
});

// ENDPOINT: /psid/help
// Página de ayuda para obtener PSID
router.get('/help', (req, res) => {
    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cómo Obtener PSID - Ayuda</title>
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
            max-width: 900px;
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
        .step {
            background: #f8f9fa;
            border-left: 4px solid #1877f2;
            padding: 20px;
            margin: 20px 0;
            border-radius: 5px;
        }
        .step h3 {
            margin-top: 0;
            color: #1877f2;
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
            text-decoration: none;
            display: inline-block;
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
        .warning {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
            border-radius: 5px;
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
        .psid-list {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
            max-height: 300px;
            overflow-y: auto;
        }
        .psid-item {
            background: white;
            padding: 10px;
            margin: 10px 0;
            border-radius: 5px;
            border-left: 3px solid #28a745;
        }
        .code {
            background: #f8f9fa;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🆔 Cómo Obtener PSID (Page-Scoped ID)</h1>
        
        <div class="info">
            <h3>ℹ️ ¿Qué es un PSID?</h3>
            <p>El <strong>PSID (Page-Scoped ID)</strong> es un identificador único que Meta asigna a cada usuario cuando interactúa con:</p>
            <ul>
                <li>📱 <strong>Tu página de Facebook</strong> (Messenger)</li>
                <li>📸 <strong>Tu cuenta de Instagram Business</strong> (DMs, comentarios)</li>
            </ul>
            <p>Es necesario para enviar mensajes via <strong>Messenger Platform API</strong> a ambas plataformas.</p>
        </div>

        <div class="step">
            <h3>📋 Paso 1: Configurar Webhook</h3>
            <p>Asegúrate de que tu webhook esté configurado en Meta Developer Console:</p>
            <ul>
                <li><strong>Webhook URL:</strong> <span class="code">${process.env.WEBHOOK_URL || 'No configurado'}</span></li>
                <li><strong>Verify Token:</strong> <span class="code">${process.env.WEBHOOK_VERIFY_TOKEN ? 'Configurado' : 'No configurado'}</span></li>
                <li><strong>Eventos suscritos:</strong> messages, messaging_postbacks</li>
            </ul>
        </div>

        <div class="step">
            <h3>💬 Paso 2: Obtener PSID</h3>
            <p>Para obtener un PSID, necesitas que alguien interactúe con tu página/cuenta:</p>
            
            <h4>📱 Desde Facebook:</h4>
            <ol>
                <li>Ve a tu página de Facebook</li>
                <li>Pide a un amigo que envíe un mensaje a la página</li>
                <li>El PSID aparecerá en tu consola como "PSID ENCONTRADO"</li>
            </ol>
            
            <h4>📸 Desde Instagram:</h4>
            <ol>
                <li>Ve a tu cuenta de Instagram Business</li>
                <li>Pide a alguien que:</li>
                <ul>
                    <li>💬 Envíe un <strong>mensaje directo</strong> (DM)</li>
                    <li>💬 <strong>Comente</strong> en uno de tus posts</li>
                    <li>💬 Te <strong>mencione</strong> en una story</li>
                </ul>
                <li>El PSID aparecerá en tu consola como "PSID de Instagram capturado"</li>
            </ol>
            
            <p><strong>Nota:</strong> El mismo usuario tendrá el mismo PSID en Facebook e Instagram si están conectados.</p>
        </div>

        <div class="step">
            <h3>🔍 Paso 3: Verificar en Consola</h3>
            <p>Cuando alguien interactúe, verás en tu terminal:</p>
            
            <h4>📱 Desde Facebook Messenger:</h4>
            <pre style="background: #2d3748; color: #e2e8f0; padding: 15px; border-radius: 5px; overflow-x: auto;">
🆔 PSID ENCONTRADO: {
  psid: "1234567890123456",
  page_id: "987654321098765",
  timestamp: 1640995200000
}
💬 Mensaje de Messenger recibido: {
  psid: "1234567890123456",
  message: "Hola!",
  message_id: "m_abc123...",
  timestamp: 1640995200000
}</pre>
            
            <h4>📸 Desde Instagram:</h4>
            <pre style="background: #2d3748; color: #e2e8f0; padding: 15px; border-radius: 5px; overflow-x: auto;">
🆔 PSID de Instagram capturado: {
  psid: "1234567890123456",
  instagram_account_id: "987654321098765",
  platform: "instagram",
  timestamp: 1640995200000
}
📸 Mensaje de Instagram recibido: {
  from: "1234567890123456",
  to: "987654321098765",
  message_id: "m_instagram_abc123...",
  text: "Hola desde Instagram!",
  timestamp: 1640995200000
}</pre>
        </div>

        <div class="step">
            <h3>📋 PSIDs Capturados Recientemente</h3>
            <p>Los PSIDs que han enviado mensajes a tu página:</p>
            <div id="psid-list" class="psid-list">
                <p>⏳ Cargando PSIDs...</p>
            </div>
            <button onclick="loadPSIDs()" class="btn">🔄 Actualizar Lista</button>
        </div>

        <div class="warning">
            <h4>⚠️ Importante:</h4>
            <ul>
                <li>El PSID es específico para cada página/cuenta (Facebook + Instagram conectados)</li>
                <li>Solo puedes enviar mensajes a usuarios que hayan iniciado la conversación</li>
                <li>Meta tiene límites estrictos sobre el envío de mensajes</li>
                <li>Para testing, usa tu propia cuenta o cuentas de desarrolladores</li>
                <li><strong>Instagram Business debe estar conectado a una página de Facebook</strong></li>
                <li>Los PSIDs de Instagram y Facebook son compatibles entre sí</li>
            </ul>
        </div>

        <div style="text-align: center; margin-top: 30px;">
            <a href="/" class="btn">🏠 Volver al Inicio</a>
            <a href="/messenger/test" class="btn btn-success">📨 Probar Messenger API</a>
        </div>
    </div>

    <script>
        async function loadPSIDs() {
            try {
                const response = await fetch('/psid/captured');
                const data = await response.json();
                
                const listElement = document.getElementById('psid-list');
                
                if (data.psids && data.psids.length > 0) {
                    listElement.innerHTML = data.psids.map(psid => \`
                        <div class="psid-item">
                            <strong>PSID:</strong> <span class="code">\${psid.psid}</span><br>
                            <strong>Page/Account ID:</strong> <span class="code">\${psid.page_id}</span><br>
                            <strong>Plataforma:</strong> \${psid.last_message?.includes('Comentario:') ? '📸 Instagram' : psid.last_message?.includes('instagram') ? '📸 Instagram' : '📱 Facebook'}<br>
                            <strong>Último mensaje:</strong> \${psid.last_message || 'N/A'}<br>
                            <strong>Última actividad:</strong> \${new Date(psid.last_seen).toLocaleString()}<br>
                            <strong>Mensajes:</strong> \${psid.message_count}
                            <button onclick="copyPSID('\${psid.psid}')" style="float: right; background: #28a745; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">📋 Copiar PSID</button>
                        </div>
                    \`).join('');
                } else {
                    listElement.innerHTML = \`
                        <p>📧 No hay PSIDs capturados aún.</p>
                        <p><strong>Para obtener PSIDs:</strong></p>
                        <ol>
                            <li>Asegúrate de que tu webhook esté funcionando</li>
                            <li><strong>Facebook:</strong> Pide a alguien que envíe un mensaje a tu página</li>
                            <li><strong>Instagram:</strong> Pide a alguien que envíe un DM o comente en tus posts</li>
                            <li>El PSID aparecerá aquí automáticamente</li>
                        </ol>
                    \`;
                }
            } catch (error) {
                document.getElementById('psid-list').innerHTML = \`
                    <p style="color: red;">❌ Error cargando PSIDs: \${error.message}</p>
                \`;
            }
        }
        
        function copyPSID(psid) {
            navigator.clipboard.writeText(psid).then(() => {
                alert('✅ PSID copiado al portapapeles: ' + psid);
            }).catch(err => {
                prompt('📋 Copia este PSID:', psid);
            });
        }
        
        // Cargar PSIDs al cargar la página
        loadPSIDs();
        
        // Auto-actualizar cada 10 segundos
        setInterval(loadPSIDs, 10000);
    </script>
</body>
</html>
    `;
    res.send(html);
});

// Exportar función para usar en webhook
router.addCapturedPSID = addCapturedPSID;

module.exports = router;
