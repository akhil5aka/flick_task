const { PrismaClient } = require("@prisma/client");
const axios = require("axios").default;
const fs = require("fs").promises; // Using promises-based API
const path = require("path");
const { z } = require("zod"); // Import Zod library

const prisma = new PrismaClient(); // Ensure Prisma client is initialized

// Define Zod schema for validation
const invoiceSchema = z.object({
  ID: z
    .string()
    .min(1, "ID is mandatory")
    .max(50, "ID must not exceed 50 characters"),
  IssueDate: z
    .string()
    .refine(
      (date) => /^\d{4}-\d{2}-\d{2}$/.test(date),
      "IssueDate must be in YYYY-MM-DD format"
    )
    .refine(
      (date) => !isNaN(new Date(date).getTime()),
      "IssueDate must be a valid date"
    ),
  IssueTime: z
    .string()
    .refine(
      (time) => /^\d{2}:\d{2}:\d{2}Z$/.test(time),
      "IssueTime must be in HH-MM-ssZ format"
    ),
    InvoiceTypeCode: z.string().nonempty("Invoice type code is mandatory"),
    InvoiceTotal:z.string().nonempty("Invoice Total required"),
    DocumentCurrencyCode:z.string().nonempty("DocumentCurrencyCode is required"),
    TaxExchangeRate:z.string().nonempty("TaxExchangeRate is required"),
    SupplierTIN:z.string().nonempty("SupplierTIN is mandatory zod error")
    

});

module.exports = {
  self_billed_invoice: async (req, res) => {
    try {
      const apiResponses = [];
      const testUrl =
        "https://sandbox-my.flick.network/api/einvoice/generate/self-billed-invoice";

      // Path to the folder containing .txt files
      const folderPath = path.resolve(
        process.cwd(),
        "/Users/Akhil/Desktop/Task_flick/self_billed"
      );

      console.log(folderPath, "Resolved folder path");

      // Read all files in the folder
      const files = await fs.readdir(folderPath);

      // Filter only `.txt` files
      const textFiles = files.filter((file) => path.extname(file) === ".txt");

      console.log("Text files:", textFiles);

      for (const textFile of textFiles) {
        const filePath = path.join(folderPath, textFile);

        try {
          const fileContent = await fs.readFile(filePath, "utf8");
          const jsonData = JSON.parse(fileContent);

          // Validate the JSON data using Zod
          try {
            invoiceSchema.parse(jsonData); // Throws an error if validation fails
            console.log(`Data from ${textFile} passed validation`);
          } catch (validationError) {
            console.error(
              `Validation failed for ${textFile}:`,
              validationError.errors
            );

            // Skip processing this file due to validation failure
            apiResponses.push({
              file: textFile,
              status: "validation_error from zod",
              error: validationError.errors,
            });
            continue;
          }

          const options = {
            method: "POST",
            url: testUrl,
            headers: {
              "Content-Type": "application/json",
              "x-flick-auth-key":
                "tristarHOdyTerE5ZgPP5WEKndDVbqZMKHIeFgk52x8tASKMB",
              supplier_uuid: "0193af5d-4ee9-7c63-8367-4a3b5bcdbbe1",
            },
            data: jsonData,
          };

          const response = await axios.request(options);

          apiResponses.push({
            file: textFile,
            status: "success",
            response: response.data,
          });

          const uuid =
            response.data.data.submissionResponse.acceptedDocuments[0].uuid;

          var submissionUid =
            response.data.data.submissionResponse.submissionUid;
          const invoice_number =
            response.data.data.submissionResponse.acceptedDocuments[0]
              .invoiceCodeNumber;
          const invoice_status = response.data.status;

          try {
            // await wait(5000);

            const existingRecord = await prisma.tb_invoice.findMany({
              where: { uuid: uuid },
              select: {
                invoice_number: true,
                id: true,
              },
            });

            if (existingRecord.length === 0) {
              console.log("No existing record found. Inserting new record...");

              const newRecord = await prisma.tb_invoice.create({
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
          } catch (dbError) {
            console.error("Error during database operation:", dbError);
            if (dbError.code === "P2002") {
              console.error(
                "Unique constraint violation on:",
                dbError.meta.target
              );
            } else {
              console.error("Error details:", dbError.message);
            }
          }
        } catch (apiError) {
          apiResponses.push({
            file: textFile,
            status: "error",
            error: apiError.response?.data || apiError.message,
          });
        }
      }

      res.status(200).json({
        message: "All files processed",
        apiResponses,
      });
    } catch (err) {
      console.log(err);
    }
  },
};
