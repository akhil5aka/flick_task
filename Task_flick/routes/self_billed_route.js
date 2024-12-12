var express = require('express');
var router = express.Router();
var controller = require('../Controller/Self_billed')

router.post('/self_invoice',controller.self_billed_invoice)

module.exports =router