const { PrismaClient } = require("@prisma/client");
const axios = require("axios").default;
const fs = require("fs").promises; // Using promises-based API
const path = require("path");
const { z } = require("zod"); // Import Zod library
const chokidar = require("chokidar"); // Import chokidar

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
  InvoiceTotal: z
    .number({ required_error: "Amount is required" })
    .positive("Amount must be greater than 0"),
});

module.exports = {
  normal_submition: async () => {
    try {
      const apiResponses = [];
      const testUrl =
        "https://sandbox-my.flick.network/api/einvoice/generate/invoice";

      // Path to the folder containing .json files
      const folderPath = path.resolve(
        process.cwd(),
        "/Users/Akhil/Desktop/Task_flick/data_files"
      );

      var outputFile_folder = path.resolve(
        process.cwd(),
        "/Users/Akhil/Desktop/Task_flick/normal_billed_output"
      );

      console.log(folderPath, "Resolved folder path");

      // Initialize chokidar to watch the folder
      const watcher = chokidar.watch(folderPath, {
        ignored: /(^|[\/\\])\../, // Ignore dotfiles
        persistent: true,
      });

      console.log("Watching for file changes in:", folderPath);

      // Event: When a new file is added
      watcher.on("add", async (filePath) => {
        console.log(`File added: ${filePath}`);
        if (path.extname(filePath) === ".json") {
          try {
            const fileContent = await fs.readFile(filePath, "utf8");
            const jsonData = JSON.parse(fileContent);

            // Validate the JSON data using Zod
            try {
              invoiceSchema.parse(jsonData); // Throws an error if validation fails
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
              var uuid = null;
              var submissionUid = null;

              var invoice_number = null;

              var invoice_status = null;

              const response = await axios.request(options);
              // console.log("API response received:", response.data.data.submissionResponse.rejectedDocuments[0].error);

              if (
                response?.data?.data?.submissionResponse
                  ?.acceptedDocuments?.[0] &&
                "uuid" in
                  response.data.data.submissionResponse.acceptedDocuments[0]
              ) {
                uuid =
                  response.data.data.submissionResponse.acceptedDocuments[0]
                    .uuid;
                submissionUid =
                  response.data.data.submissionResponse.submissionUid;
                invoice_number =
                  response.data.data.submissionResponse.acceptedDocuments[0]
                    .invoiceCodeNumber;
                invoice_status = response.data.status;

                console.log("UUID exists:", uuid);

                console.log(uuid, "uuid in response");
                // Save the last response to a file

                var outputFilePath = path.join(
                  outputFile_folder,
                  invoice_number + ".json"
                );
                await fs.writeFile(
                  outputFilePath,
                  JSON.stringify(
                    {
                      uuid,
                      submissionUid,
                      invoice_number,
                      invoice_status,
                    },
                    null,
                    2
                  ),
                  "utf8"
                );
                console.log(`Last response saved to ${outputFilePath}`);

                console.log("Data extracted from API response:", {
                  uuid,
                  submissionUid,
                  invoice_number,
                  invoice_status,
                });
              } else {
                console.log("UUID does not exist in the response");
                console.log("invoice id ", jsonData.ID);
                const rejectedErrorMessage =
                  response.data.data.submissionResponse.rejectedDocuments?.[0]
                    ?.error?.details?.[0]?.message || "Unknown error";
                console.error(
                  "Invoice submission rejected:",
                  rejectedErrorMessage
                );
                console.log(
                  "API response received:",
                  response.data.data.submissionResponse.rejectedDocuments[0]
                    .error.details[0].message
                );

                var outputFilePath = path.join(
                  outputFile_folder,
                  jsonData.ID + "error" + ".json"
                );
                await fs.writeFile(
                  outputFilePath,
                  JSON.stringify(
                    {
                      file: filePath,
                      error: rejectedErrorMessage,
                      invoice_id: jsonData.ID,
                    },
                    null,
                    2
                  ),
                  "utf8"
                );
                console.log(`Last response saved to ${outputFilePath}`);
              }

              try {
                const existingRecord = await prisma.tb_invoice.findMany({
                  where: { uuid: uuid },
                  select: { invoice_number: true, id: true },
                });

                if (existingRecord.length === 0) {
                  console.log(
                    "No existing record found. Inserting new record..."
                  );

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
              console.error(
                "Error in API call:",
                apiError.response?.data || apiError.message
              );
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
          console.log("Ignoring non-json file:", filePath);
        }
      });

      console.log("Watching folder for changes...");

      // shutdown
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
