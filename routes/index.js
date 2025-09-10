const express = require('express');
const router = express.Router();

// Importar rutas específicas
const mainRoutes = require('./main');
const apiRoutes = require('./api');
const webhookRoutes = require('./webhook');
const instagramRoutes = require('./instagram');
const messengerRoutes = require('./messenger');
const whatsappMessengerRoutes = require('./whatsapp-messenger');
const psidHelperRoutes = require('./psid-helper');
const psidLookupRoutes = require('./psid-lookup');
const tokenHelperRoutes = require('./token-helper');
const tokenDebugRoutes = require('./token-debug');
const tiendanubeRoutes = require('./tiendanube');

// Usar las rutas
router.use('/', mainRoutes);
router.use('/api', apiRoutes);
router.use('/webhook', webhookRoutes);
router.use('/instagram', instagramRoutes);
router.use('/messenger', messengerRoutes);
router.use('/whatsapp-messenger', whatsappMessengerRoutes);
router.use('/psid', psidHelperRoutes);
router.use('/psid-lookup', psidLookupRoutes);
router.use('/token', tokenHelperRoutes);
router.use('/token-debug', tokenDebugRoutes);
router.use('/tiendanube', tiendanubeRoutes);

module.exports = router;
