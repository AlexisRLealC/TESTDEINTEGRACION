// ===================================================================
// WHATSAPP INTEGRATION PLATFORM - MVP SERVER
// ===================================================================
// Servidor principal siguiendo principios MVP y buenas prácticas
// Arquitectura modular con manejo centralizado de errores y logging

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Importar nueva arquitectura MVP
const config = require('./src/config');
const { logger, expressLogger } = require('./src/utils/logger');
const { ErrorHandler } = require('./src/utils/errorHandler');

const app = express();

// ===================================================================
// SECURITY MIDDLEWARE - Seguridad y protección
// ===================================================================

// Helmet para headers de seguridad
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://connect.facebook.net"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://graph.facebook.com", "https://api.whatsapp.com"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: []
        }
    }
}));

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? [process.env.FRONTEND_URL] 
        : ['http://localhost:3000', /\.ngrok\.io$/],
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    message: {
        success: false,
        error: 'Demasiadas solicitudes, intenta de nuevo más tarde',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false
});

app.use('/api/', limiter);

// ===================================================================
// MIDDLEWARE BÁSICO
// ===================================================================

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(expressLogger);

// Servir archivos estáticos
app.use(express.static('public'));

// ===================================================================
// NGROK SUPPORT - Soporte para desarrollo con ngrok
// ===================================================================

// Detectar si estamos usando ngrok
app.use((req, res, next) => {
    if (req.get('host')?.includes('ngrok')) {
        // Headers específicos para ngrok
        res.setHeader('ngrok-skip-browser-warning', 'true');
        
        // CSP más permisivo para ngrok
        res.setHeader('Content-Security-Policy', 
            "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://connect.facebook.net; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: https:; " +
            "connect-src 'self' https://graph.facebook.com https://api.whatsapp.com;"
        );
        
        logger.info('Ngrok environment detected', { 
            host: req.get('host'),
            userAgent: req.get('User-Agent')
        });
    }
    next();
});

// ===================================================================
// HEALTH CHECK Y STATUS
// ===================================================================

// Health check endpoint
app.get('/health', (req, res) => {
    const healthStatus = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.env,
        services: config.getStatus().services
    };
    
    logger.info('Health check requested', healthStatus);
    res.json(healthStatus);
});

// Status endpoint con información detallada
app.get('/api/status', (req, res) => {
    const status = config.getStatus();
    logger.info('Status endpoint accessed', status);
    res.json({
        success: true,
        data: status
    });
});

// ===================================================================
// RUTAS PRINCIPALES
// ===================================================================

// Cargar rutas desde archivo separado
const routes = require('./routes');
app.use('/', routes);

// ===================================================================
// ERROR HANDLING - Manejo centralizado de errores
// ===================================================================

// 404 Handler
app.use('*', (req, res) => {
    logger.warn('Route not found', { 
        url: req.originalUrl, 
        method: req.method 
    });
    
    res.status(404).json({
        success: false,
        error: 'Endpoint no encontrado',
        code: 'NOT_FOUND',
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use(ErrorHandler.middleware());

// ===================================================================
// GRACEFUL SHUTDOWN - Cierre elegante del servidor
// ===================================================================

let server;

const gracefulShutdown = (signal) => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    
    if (server) {
        server.close(() => {
            logger.info('Server closed successfully');
            process.exit(0);
        });
        
        // Force close after 10 seconds
        setTimeout(() => {
            logger.error('Forced server shutdown');
            process.exit(1);
        }, 10000);
    } else {
        process.exit(0);
    }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ===================================================================
// INICIO DEL SERVIDOR
// ===================================================================

server = app.listen(config.port, () => {
    logger.info('🚀 WhatsApp Integration Platform MVP iniciado', {
        port: config.port,
        environment: config.env,
        services: config.getStatus().services
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('🚀 MVP - INTEGRATION PLATFORM');
    console.log('='.repeat(60));
    console.log(`📍 Servidor: http://localhost:${config.port}`);
    console.log(`🌍 Entorno: ${config.env}`);
    console.log(`📊 Estado: http://localhost:${config.port}/api/status`);
    console.log(`❤️ Health: http://localhost:${config.port}/health`);
    console.log(`🧪 WhatsApp Test: http://localhost:${config.port}/whatsapp-messenger/test`);
    console.log('='.repeat(60));
    
    // Mostrar servicios configurados
    const services = config.getStatus().services;
    console.log('📋 SERVICIOS CONFIGURADOS:');
    console.log(`  ✅ WhatsApp: ${services.whatsapp ? 'Habilitado' : '❌ No configurado'}`);
    console.log(`  ✅ Webhook: ${services.webhook ? 'Habilitado' : '⚠️ No configurado'}`);
    console.log(`  ✅ Instagram: ${services.instagram ? 'Habilitado' : '⚠️ No configurado'}`);
    console.log(`  ✅ Tienda Nube: ${services.tiendanube ? 'Habilitado' : '⚠️ No configurado'}`);
    console.log('='.repeat(60));
    
    if (!services.whatsapp) {
        console.log('⚠️ CONFIGURACIÓN REQUERIDA:');
        console.log('  Por favor configura las variables en .env:');
        console.log('  - APP_ID, APP_SECRET, CONFIGURATION_ID');
        console.log('='.repeat(60));
    }
    
    console.log('📚 Documentación: https://developers.facebook.com/docs/whatsapp/embedded-signup');
    console.log('🔧 Para desarrollo con ngrok: ngrok http 3000 --host-header=localhost:3000');
    console.log('='.repeat(60) + '\n');
});

// Handle server errors
server.on('error', (error) => {
    logger.error('Server error', { error: error.message, stack: error.stack });
    process.exit(1);
});

module.exports = app;
