var express = require('express');
var router = express.Router();
var controller = require('../Controller/cancel_invoice')

router.post('/cancel',controller.cancel_invoice)

module.exports =router