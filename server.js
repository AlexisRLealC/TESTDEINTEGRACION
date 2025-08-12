// ===================================================================
// WHATSAPP EMBEDDED SIGNUP - IMPLEMENTACIÓN OFICIAL CON FACEBOOK SDK
// ===================================================================
// Basado en: https://developers.facebook.com/docs/whatsapp/embedded-signup/implementation
// Este código implementa el flujo oficial de WhatsApp Embedded Signup
// usando el Facebook JavaScript SDK según las mejores prácticas de Meta

const express = require('express');  // Framework web para Node.js
const axios = require('axios');      // Cliente HTTP para llamadas a la API de Meta
require('dotenv').config();          // Cargar variables de entorno desde .env

const app = express();
const PORT = process.env.PORT || 3000;

// ===================================================================
// CONFIGURACIÓN - Variables de entorno (mejores prácticas de seguridad)
// ===================================================================
// IMPORTANTE: Todas las credenciales deben estar en el archivo .env
// NUNCA hardcodear credenciales en el código fuente
const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const APP_ID = process.env.APP_ID;
const APP_SECRET = process.env.APP_SECRET;
const CONFIGURATION_ID = process.env.CONFIGURATION_ID;

// Variables para Instagram Business Login
const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID;
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET;
const INSTAGRAM_REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI || `http://localhost:${process.env.PORT || 3000}/instagram/callback`;

// Verificar que todas las variables críticas estén configuradas
if (!APP_ID || !APP_SECRET || !CONFIGURATION_ID) {
    console.error('❌ ERROR: Variables de entorno faltantes en .env:');
    if (!APP_ID) console.error('  - APP_ID no configurado');
    if (!APP_SECRET) console.error('  - APP_SECRET no configurado');
    if (!CONFIGURATION_ID) console.error('  - CONFIGURATION_ID no configurado');
    console.error('  Por favor, configura todas las variables en el archivo .env');
    process.exit(1);
}

// Verificar variables de webhook (opcionales para desarrollo)
if (!WEBHOOK_VERIFY_TOKEN) {
    console.warn('⚠️ ADVERTENCIA: WEBHOOK_VERIFY_TOKEN no configurado. Webhook no funcionará.');
}

console.log('✅ Variables de entorno cargadas correctamente:');
console.log(`  - APP_ID: ${APP_ID}`);
console.log(`  - CONFIGURATION_ID: ${CONFIGURATION_ID}`);
console.log(`  - WEBHOOK_URL: ${WEBHOOK_URL || 'No configurado'}`);
console.log(`  - WEBHOOK_TOKEN: ${WEBHOOK_VERIFY_TOKEN ? 'Configurado' : 'No configurado'}`);
console.log(`  - INSTAGRAM_APP_ID: ${INSTAGRAM_APP_ID || 'No configurado'}`);
console.log(`  - INSTAGRAM_REDIRECT_URI: ${INSTAGRAM_REDIRECT_URI}`);

// ===================================================================
// MIDDLEWARE - Configuración del servidor Express
// ===================================================================
app.use(express.json());                        // Parsear JSON en requests
app.use(express.urlencoded({ extended: true })); // Parsear formularios URL-encoded

// Servir archivos estáticos
app.use(express.static('public'));

// Cargar rutas desde archivo separado
const routes = require('./routes');
app.use('/', routes);

// ===================================================================
// INICIO DEL SERVIDOR
// ===================================================================
// Inicia el servidor Express en el puerto especificado
// Muestra información útil sobre los endpoints disponibles
// Para probar la implementación:
// 1. Ejecuta: npm start
// 2. Ve a: http://localhost:3000
// 3. Configura CONFIGURATION_ID en .env
// 4. Asegúrate de tener configurado localhost en Meta Developer Console
app.listen(PORT, () => {
    console.log(`🚀 Servidor iniciado en http://localhost:${PORT}`);
    console.log(`📱 WhatsApp Embedded Signup con Facebook SDK oficial`);
    console.log(`📋 Estado: http://localhost:${PORT}/api/status`);
    console.log(`🗑️ Eliminación de datos: http://localhost:${PORT}/data-deletion`);
    console.log(`📚 Documentación: https://developers.facebook.com/docs/whatsapp/embedded-signup/implementation`);
});

module.exports = app;
