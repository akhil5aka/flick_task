const { PrismaClient } = require("@prisma/client");
const axios = require("axios").default;
const fs = require("fs").promises; 
const path = require("path");
const { z } = require("zod"); 
const chokidar = require("chokidar"); 

const prisma = new PrismaClient(); // Prisma client  initialized

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
  InvoiceTotal: z
    .number({ required_error: "Amount is required" })
    .positive("Amount must be greater than 0"),
});

module.exports = {
  normal_submition: async () => {
    try {
      const apiResponses = [];
      const testUrl = "https://sandbox-my.flick.network/api/einvoice/generate/invoice";

      // Path to the folder containing .txt files
      const folderPath = path.resolve(
        process.cwd(),
        "/Users/Akhil/Desktop/Task_flick/data_files"
      );

      console.log(folderPath, "Resolved folder path");

      // Initialize chokidar to watch the folder
      const watcher = chokidar.watch(folderPath, {
        ignored: /(^|[\/\\])\../, // Ignore dotfiles
        persistent: true,
      });

      console.log("Watching for file changes in:", folderPath);

      // Event: file is added
      watcher.on("add", async (filePath) => {
        console.log(`File added: ${filePath}`);
        if (path.extname(filePath) === ".txt") {
          try {
            const fileContent = await fs.readFile(filePath, "utf8");
            const jsonData = JSON.parse(fileContent);

            // Validate the JSON data using Zod
            try {
              invoiceSchema.parse(jsonData); 
              console.log(`Data from ${filePath} passed validation`);
            } catch (validationError) {
              console.error(
                `Validation failed for ${filePath}:`,
                validationError.errors
              );

              // Skip  file due to validation failure
              apiResponses.push({
                file: filePath,
                status: "validation_error",
                error: validationError.errors,
              });
              return;
            }

            console.log("After validation, sending API request...");
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
              timeout: 10000, // 10 sec timeout to prevent hanging
            };

            try {
              const response = await axios.request(options);
              console.log("API response received:", response.data);

              const uuid =
                response.data.data.submissionResponse.acceptedDocuments[0].uuid;
              const submissionUid =
                response.data.data.submissionResponse.submissionUid;
              const invoice_number =
                response.data.data.submissionResponse.acceptedDocuments[0]
                  .invoiceCodeNumber;
              const invoice_status = response.data.status;

              console.log("Data extracted from API response:", {
                uuid,
                submissionUid,
                invoice_number,
                invoice_status,
              });

              try {
                const existingRecord = await prisma.tb_invoice.findMany({
                  where: { uuid: uuid },
                  select: { invoice_number: true, id: true },
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
              console.error("Error in API call:", apiError.response?.data || apiError.message);
              apiResponses.push({
                file: filePath,
                status: "error",
                error: apiError.response?.data || apiError.message,
              });
            }
          } catch (fileError) {
            console.error(`Error processing file ${filePath}:`, fileError);
          }
        } else {
          console.log("Ignoring non-txt file:", filePath);
        }
      });

      console.log("Watching folder for changes...");

      // disconnect
      process.on("SIGINT", async () => {
        console.log("Shutting down file watcher...");
        await prisma.$disconnect();
        watcher.close();
        process.exit();
      });
    } catch (err) {
      console.error("Unexpected error:", err);
    } finally {
      await prisma.$disconnect();
    }
  },
};
