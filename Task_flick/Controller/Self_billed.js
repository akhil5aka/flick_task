var { PrismaClient } = require("@prisma/client");
var axios = require("axios").default;
var fs = require("fs").promises;
var path = require("path");
var { z } = require("zod");
var chokidar = require("chokidar");

var prisma = new PrismaClient();

// Define Zod schema for SupplierParty
var SupplierPartySchema = z.object({
  LegalName: z.string().nonempty("LegalName is mandatory"),
  SupplierTIN: z.string().nonempty("SupplierTIN is mandatory"),
  SupplierBRN: z.string(),
  CityName: z.string().nonempty("CityName is mandatory"),
  PostalZone: z.string(),
  CountrySubentityCode: z.string(),
  AddressLines: z.array(z.string()),
  CountryCode: z.string(),
  Telephone: z.string(),
  MSICCode: z.string(),
  Industry: z.string(),
});

// Zod schema for invoice checks 
var invoiceSchema = z.object({
  ID: z.string().min(1, "ID is mandatory").max(50, "ID must not exceed 50 characters"),
  IssueDate: z
    .string()
    .refine((date) => /^\d{4}-\d{2}-\d{2}$/.test(date), "IssueDate must be in YYYY-MM-DD format")
    .refine((date) => !isNaN(new Date(date).getTime()), "IssueDate must be a valid date"),
  IssueTime: z
    .string()
    .refine((time) => /^\d{2}:\d{2}:\d{2}Z$/.test(time), "IssueTime must be in HH-MM-ssZ format"),
  InvoiceTypeCode: z.string().nonempty("Invoice type code is mandatory"),
  InvoiceTotal: z.number({ required_error: "InvoiceTotal is required" }).positive("Amount must be greater than 0"),
  DocumentCurrencyCode: z.string().nonempty("DocumentCurrencyCode is required"),
  TaxExchangeRate: z.number({ required_error: "TaxExchangeRate is required" }).positive("Amount must be greater than 0"),
  SupplierParty: SupplierPartySchema,
});

module.exports = {
  self_billed_invoice: async () => {
    try {
      var apiResponses = [];
      var testUrl = "https://sandbox-my.flick.network/api/einvoice/generate/self-billed-invoice";

      // Path to the folder 
      var folderPath = path.resolve(process.cwd(), "/Users/Akhil/Desktop/Task_flick/self_billed");
      console.log(folderPath, "Resolved folder path");

      // Initialize chokidar to watch the folder
      var watcher = chokidar.watch(folderPath, {
        ignored: /(^|[\/\\])\../, // Ignore dotfiles
        persistent: true,
      });

      // Event: When a new file is added
      watcher.on("add", async (filePath) => {
        console.log(`File added: ${filePath}`);
        if (path.extname(filePath) === ".json") {
          try {
            // Reading file 
            var fileContent = await fs.readFile(filePath, "utf8");
            var jsonData = JSON.parse(fileContent);

            // console.log(jsonData)

            // Validate the JSON data using Zod
            try {
              invoiceSchema.parse(jsonData);
              console.log(`Data from ${filePath} passed validation`);
            } catch (validationError) {
              console.error(`Validation failed for ${filePath}:`, validationError.errors);
              apiResponses.push({
                file: filePath,
                status: "validation_error",
                error: validationError.errors,
              });
              return; // Skip   file
            }


            console.log("inbsfsbfib fifidfui")
            // Send data to the API
            var options = {
              method: "POST",
              url: testUrl,
              headers: {
                "Content-Type": "application/json",
                "x-flick-auth-key": "tristarHOdyTerE5ZgPP5WEKndDVbqZMKHIeFgk52x8tASKMB",
                supplier_uuid: "0193af5d-4ee9-7c63-8367-4a3b5bcdbbe1",
              },
              data: jsonData,
            };

            var response = await axios.request(options);

            apiResponses.push({
              file: filePath,
              status: "success",
              response: response.data,
            });

            var uuid = response.data.data.submissionResponse.acceptedDocuments[0].uuid;
            var submissionUid = response.data.data.submissionResponse.submissionUid;
            var invoice_number = response.data.data.submissionResponse.acceptedDocuments[0].invoiceCodeNumber;
            var invoice_status = response.data.status;


             // Save the last response to a file
             var outputFile_folder =  path.resolve(
              process.cwd(),
              "/Users/Akhil/Desktop/Task_flick/self_billed_output"
            );
            var outputFilePath = path.join(outputFile_folder, invoice_number+".json");
            await fs.writeFile(
              outputFilePath,
              JSON.stringify(apiResponses[apiResponses.length - 1], null, 2),
              "utf8"
            );
            console.log(`Last response saved to ${outputFilePath}`);





            // Check and insert into db
            var existingRecord = await prisma.tb_invoice.findMany({
              where: { uuid: uuid },
              select: {
                invoice_number: true,
                id: true,
              },
            });

            if (existingRecord.length === 0) {
              console.log("No existing record found. Inserting new record...");
              var newRecord = await prisma.tb_invoice.create({
                data: {
                  invoice_number: invoice_number,
                  uuid: uuid,
                  status: invoice_status,
                  submissionuid: submissionUid,
                },
              });
              console.log("New record inserted successfully:", newRecord);
            } else {
              console.log("Record already exists for UUID:", uuid);
            }
          } catch (error) {
            console.error(`Error processing file ${filePath}:`, error.message);
            apiResponses.push({
              file: filePath,
              status: "error",
              error: error.response?.data || error.message,
            });
          }
        }
      });

      console.log("File watcher initialized. Waiting for new files...");

      //shutdown
      process.on("SIGINT", async () => {
        console.log("Shutting down file watcher...");
        await prisma.$disconnect();
        watcher.close();
        process.exit();
      });
    } catch (err) {
      console.error("Error initializing self_billed_invoice:", err);
    }
  },
};
