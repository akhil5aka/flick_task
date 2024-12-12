var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var cancelRouter = require('./routes/cancel_invoice_route');
var invoiceRouter = require('./routes/invoice_route');
var statusRouter = require('./routes/get_invoice_status');
var selfBillRouter = require('./routes/self_billed');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use(cancelRouter)
app.use(invoiceRouter)
app.use(statusRouter)
app.use(selfBillRouter)

var firstServiceFunction = require('./Controller/Normal_invoice_submition')
const args = process.argv.slice(2); // Get the arguments passed to the script
const command = args[0];

// switch (command) {
//   case 'normal':
//     firstServiceFunction.normal_submition();
//     break;
//   case 'second':
//     secondServiceFunction();
//     break;
//   default:
//     console.log('Unknown command. Use "first" or "second".');
// }


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
