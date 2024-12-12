var express = require('express');
var router = express.Router();
var controller = require('../Controller/Get_status')

router.post('/get_document',controller.get_invoice_status)

module.exports =router