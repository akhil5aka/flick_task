const NormalInvoice = require("./Controller/Normal_invoice_submition");
const GetDocuments = require("./Controller/Get_status");
const CancelInvoice =  require("./Controller/Cancel_invoice")

// Get the arguments passed to the script
const args = process.argv.slice(2);
const command = args[0];
var additionalArgs = args.slice(1); // Capture additional arguments

// Define available commands
switch (command) {
  case "normal":
    console.log("Running normal Invoice submission...");
    NormalInvoice.normal_submition();
    break;
  case "getstatus":
    console.log("checking status with uuid:", ...additionalArgs);
    GetDocuments.get_invoice_status(...additionalArgs);
    break;

  case "cancelinvoice":
    const status = additionalArgs.slice(1).join(" ");
    console.log("canceling the invoice with uuid :",additionalArgs[0],"and with status :",status);
    CancelInvoice.cancel_invoice(additionalArgs[0],status)
    break;
  default:
    console.error('Unknown command. Use "node cli.js normal" to execute.');
    process.exit(1); // Exit with an error code for unknown commands
}
