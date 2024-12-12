var express = require('express');
var router = express.Router();
var controller = require('../Controller/Normal_invoice_submition')

router.post('/invoice',controller.normal_submition)

module.exports =router