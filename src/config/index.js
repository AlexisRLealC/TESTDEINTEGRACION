// ===================================================================
// CONFIGURATION MANAGEMENT - Centralized Config for MVP
// ===================================================================
// Manejo centralizado de configuración siguiendo principios MVP

const path = require('path');
require('dotenv').config();

/**
 * Configuración centralizada del sistema
 * Siguiendo principios de 12-factor app para escalabilidad
 */
class Config {
    constructor() {
        this.env = process.env.NODE_ENV || 'development';
        this.port = process.env.PORT || 3000;
        
        // WhatsApp Business Configuration
        this.whatsapp = {
            appId: process.env.APP_ID,
            appSecret: process.env.APP_SECRET,
            configurationId: process.env.CONFIGURATION_ID,
            apiVersion: 'v21.0'
        };
        
        // Webhook Configuration
        this.webhook = {
            verifyToken: process.env.WEBHOOK_VERIFY_TOKEN,
            url: process.env.WEBHOOK_URL
        };
        
        // Instagram Configuration
        this.instagram = {
            appId: process.env.INSTAGRAM_APP_ID,
            appSecret: process.env.INSTAGRAM_APP_SECRET,
            redirectUri: process.env.INSTAGRAM_REDIRECT_URI || `http://localhost:${this.port}/instagram/callback`
        };
        
        // Tienda Nube Configuration
        this.tiendanube = {
            clientId: process.env.TIENDANUBE_CLIENT_ID,
            clientSecret: process.env.TIENDANUBE_CLIENT_SECRET,
            redirectUri: process.env.TIENDANUBE_REDIRECT_URI || `http://localhost:${this.port}/tiendanube/callback`
        };
        
        // Logging Configuration
        this.logging = {
            level: process.env.LOG_LEVEL || 'info',
            format: process.env.LOG_FORMAT || 'combined'
        };
        
        // Rate Limiting Configuration
        this.rateLimit = {
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
            max: parseInt(process.env.RATE_LIMIT_MAX) || 100 // limit each IP to 100 requests per windowMs
        };
        
        this.validate();
    }
    
    /**
     * Valida que las configuraciones críticas estén presentes
     */
    validate() {
        const required = [
            { key: 'whatsapp.appId', value: this.whatsapp.appId, name: 'APP_ID' },
            { key: 'whatsapp.appSecret', value: this.whatsapp.appSecret, name: 'APP_SECRET' },
            { key: 'whatsapp.configurationId', value: this.whatsapp.configurationId, name: 'CONFIGURATION_ID' }
        ];
        
        const missing = required.filter(config => !config.value);
        
        if (missing.length > 0) {
            console.error('❌ ERROR: Variables de entorno faltantes:');
            missing.forEach(config => {
                console.error(`  - ${config.name} no configurado`);
            });
            console.error('  Por favor, configura todas las variables en el archivo .env');
            
            if (this.env === 'production') {
                process.exit(1);
            }
        }
        
        // Advertencias para configuraciones opcionales
        const optional = [
            { key: 'webhook.verifyToken', value: this.webhook.verifyToken, name: 'WEBHOOK_VERIFY_TOKEN' },
            { key: 'instagram.appId', value: this.instagram.appId, name: 'INSTAGRAM_APP_ID' },
            { key: 'tiendanube.clientId', value: this.tiendanube.clientId, name: 'TIENDANUBE_CLIENT_ID' }
        ];
        
        optional.forEach(config => {
            if (!config.value) {
                console.warn(`⚠️ ADVERTENCIA: ${config.name} no configurado. Funcionalidad limitada.`);
            }
        });
    }
    
    /**
     * Obtiene la configuración para un servicio específico
     */
    getServiceConfig(service) {
        const configs = {
            whatsapp: this.whatsapp,
            webhook: this.webhook,
            instagram: this.instagram,
            tiendanube: this.tiendanube,
            logging: this.logging,
            rateLimit: this.rateLimit
        };
        
        return configs[service] || null;
    }
    
    /**
     * Verifica si un servicio está configurado correctamente
     */
    isServiceEnabled(service) {
        switch (service) {
            case 'whatsapp':
                return !!(this.whatsapp.appId && this.whatsapp.appSecret && this.whatsapp.configurationId);
            case 'webhook':
                return !!(this.webhook.verifyToken);
            case 'instagram':
                return !!(this.instagram.appId && this.instagram.appSecret);
            case 'tiendanube':
                return !!(this.tiendanube.clientId && this.tiendanube.clientSecret);
            default:
                return false;
        }
    }
    
    /**
     * Obtiene información del estado de configuración
     */
    getStatus() {
        return {
            environment: this.env,
            port: this.port,
            services: {
                whatsapp: this.isServiceEnabled('whatsapp'),
                webhook: this.isServiceEnabled('webhook'),
                instagram: this.isServiceEnabled('instagram'),
                tiendanube: this.isServiceEnabled('tiendanube')
            },
            config: {
                whatsapp: {
                    appId: this.whatsapp.appId,
                    configurationId: this.whatsapp.configurationId,
                    apiVersion: this.whatsapp.apiVersion
                },
                webhook: {
                    url: this.webhook.url,
                    configured: !!this.webhook.verifyToken
                },
                instagram: {
                    appId: this.instagram.appId,
                    redirectUri: this.instagram.redirectUri
                },
                tiendanube: {
                    clientId: this.tiendanube.clientId,
                    redirectUri: this.tiendanube.redirectUri
                }
            }
        };
    }
}

// Singleton instance
const config = new Config();

module.exports = config;
