// ===================================================================
// LOGGING SYSTEM - Structured Logging for MVP
// ===================================================================
// Sistema de logging estructurado siguiendo principios MVP

const config = require('../config');

/**
 * Niveles de logging disponibles
 */
const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};

/**
 * Colores para output en consola
 */
const COLORS = {
    ERROR: '\x1b[31m', // Rojo
    WARN: '\x1b[33m',  // Amarillo
    INFO: '\x1b[36m',  // Cian
    DEBUG: '\x1b[37m', // Blanco
    RESET: '\x1b[0m'   // Reset
};

/**
 * Logger estructurado para el MVP
 * Proporciona logging consistente con diferentes niveles
 */
class Logger {
    constructor() {
        this.level = this.getLevelFromString(config.logging.level);
        this.format = config.logging.format;
    }
    
    /**
     * Convierte string de nivel a número
     */
    getLevelFromString(levelStr) {
        return LOG_LEVELS[levelStr.toUpperCase()] || LOG_LEVELS.INFO;
    }
    
    /**
     * Verifica si debe loggear según el nivel
     */
    shouldLog(level) {
        return LOG_LEVELS[level] <= this.level;
    }
    
    /**
     * Formatea el mensaje de log
     */
    formatMessage(level, message, meta = {}) {
        const timestamp = new Date().toISOString();
        const color = COLORS[level] || COLORS.RESET;
        
        const logEntry = {
            timestamp,
            level,
            message,
            ...meta
        };
        
        if (this.format === 'json') {
            return JSON.stringify(logEntry);
        }
        
        // Formato legible para desarrollo
        const metaStr = Object.keys(meta).length > 0 ? 
            `\n  ${JSON.stringify(meta, null, 2)}` : '';
        
        return `${color}[${timestamp}] ${level}: ${message}${metaStr}${COLORS.RESET}`;
    }
    
    /**
     * Log de error - Nivel más crítico
     */
    error(message, meta = {}) {
        if (!this.shouldLog('ERROR')) return;
        
        const formatted = this.formatMessage('ERROR', message, {
            ...meta,
            stack: meta.error?.stack || new Error().stack
        });
        
        console.error(formatted);
        
        // En producción, aquí se enviaría a servicio de monitoreo
        if (config.env === 'production') {
            this.sendToMonitoring('ERROR', message, meta);
        }
    }
    
    /**
     * Log de advertencia
     */
    warn(message, meta = {}) {
        if (!this.shouldLog('WARN')) return;
        
        const formatted = this.formatMessage('WARN', message, meta);
        console.warn(formatted);
    }
    
    /**
     * Log de información general
     */
    info(message, meta = {}) {
        if (!this.shouldLog('INFO')) return;
        
        const formatted = this.formatMessage('INFO', message, meta);
        console.log(formatted);
    }
    
    /**
     * Log de debug - Solo en desarrollo
     */
    debug(message, meta = {}) {
        if (!this.shouldLog('DEBUG')) return;
        
        const formatted = this.formatMessage('DEBUG', message, meta);
        console.log(formatted);
    }
    
    /**
     * Log específico para APIs externas
     */
    apiCall(method, url, status, duration, meta = {}) {
        const level = status >= 400 ? 'ERROR' : status >= 300 ? 'WARN' : 'INFO';
        
        this[level.toLowerCase()](`API ${method} ${url}`, {
            status,
            duration: `${duration}ms`,
            ...meta
        });
    }
    
    /**
     * Log específico para WhatsApp API
     */
    whatsapp(action, success, meta = {}) {
        const level = success ? 'INFO' : 'ERROR';
        
        this[level](`WhatsApp ${action}`, {
            success,
            ...meta
        });
    }
    
    /**
     * Log específico para webhooks
     */
    webhook(event, source, meta = {}) {
        this.info(`Webhook ${event} from ${source}`, meta);
    }
    
    /**
     * Log específico para autenticación
     */
    auth(action, success, userId = null, meta = {}) {
        const level = success ? 'INFO' : 'WARN';
        
        this[level](`Auth ${action}`, {
            success,
            userId,
            ...meta
        });
    }
    
    /**
     * Envía logs críticos a servicio de monitoreo (placeholder)
     */
    sendToMonitoring(level, message, meta) {
        // Placeholder para integración con servicios como Sentry, DataDog, etc.
        // En MVP, solo loggeamos localmente
        console.log('📊 [MONITORING]', { level, message, meta });
    }
    
    /**
     * Crea un logger con contexto específico
     */
    child(context = {}) {
        return {
            error: (msg, meta = {}) => this.error(msg, { ...context, ...meta }),
            warn: (msg, meta = {}) => this.warn(msg, { ...context, ...meta }),
            info: (msg, meta = {}) => this.info(msg, { ...context, ...meta }),
            debug: (msg, meta = {}) => this.debug(msg, { ...context, ...meta }),
            apiCall: (method, url, status, duration, meta = {}) => 
                this.apiCall(method, url, status, duration, { ...context, ...meta }),
            whatsapp: (action, success, meta = {}) => 
                this.whatsapp(action, success, { ...context, ...meta }),
            webhook: (event, source, meta = {}) => 
                this.webhook(event, source, { ...context, ...meta }),
            auth: (action, success, userId, meta = {}) => 
                this.auth(action, success, userId, { ...context, ...meta })
        };
    }
}

// Singleton instance
const logger = new Logger();

// Middleware para Express logging
const expressLogger = (req, res, next) => {
    const start = Date.now();
    const reqLogger = logger.child({
        requestId: req.headers['x-request-id'] || Math.random().toString(36).substr(2, 9),
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    
    req.logger = reqLogger;
    
    // Log request
    reqLogger.info(`${req.method} ${req.originalUrl}`, {
        query: req.query,
        body: req.method !== 'GET' ? req.body : undefined
    });
    
    // Log response
    res.on('finish', () => {
        const duration = Date.now() - start;
        reqLogger.apiCall(req.method, req.originalUrl, res.statusCode, duration);
    });
    
    next();
};

module.exports = {
    logger,
    expressLogger,
    LOG_LEVELS
};
