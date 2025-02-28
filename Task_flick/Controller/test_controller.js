var axios = require("axios");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const { z } = require("zod"); // Import Zod library
const getInvoiceStatusCheck = z.object({
  uuid: z.string().uuid().nonempty('UUID is required'),  // UUID must be a valid string and not empty
 
});


module.exports = {
  get_invoice_status: async (...uuid) => {
    var uuid = uuid[0]


    try {
        // Validate the inputs using the schema
        getInvoiceStatusCheck.parse({ uuid });
  
        // If validation is successful, log the success message and exit
        console.log('Validation passed: UUID and reason are valid.');
        // process.exit(0);  // Exit with success code (0)
  
      } catch (err) {
        // Handle validation errors
        // console.log(err.errors)
        console.error('Validation error:uuid is', err.errors.map(e => e.message).join(', '));
        process.exit(1);  // Exit with error code (1)
      }
   
    var error_reason = "";
    var status_url =
      "https://sandbox-my.flick.network/api/einvoice/get-document/" + uuid;
    console.log(status_url, "fjd");

    var status_check = await axios.get(status_url, {
      headers: {
        "x-flick-auth-key": "tristarHOdyTerE5ZgPP5WEKndDVbqZMKHIeFgk52x8tASKMB", // Authentication token
        supplier_uuid: "0193af5d-4ee9-7c63-8367-4a3b5bcdbbe1", // Supplier UUID
        "Content-Type": "application/json", // Content type as JSON
      },
    });

    var long_id = status_check.data.longId;
    var status = status_check.data.status;

  

    if (status == "Invalid") {
      var validation_steps =
        status_check.data.validationResults.validationSteps;
      validation_steps.forEach((element) => {
        if (element.status == "Invalid") {
          error_reason = element.error.error;

          console.log(error_reason, "reason for invalid");
        }
      });
      

    }

    else if( status=="Cancelled")
    {
        error_reason=status_check.data.documentStatusReason
    }

    try {
      const updatedUser = await prisma.tb_invoice.update({
        where: {
          uuid: uuid, // Specify the unique identifier
        },
        data: {
            status:status,
          longid: long_id, // Update email
          doc_reasson: error_reason, // Update name
        },
      });

      console.log("Updated user:", updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
    } finally {
      await prisma.$disconnect(); // Disconnect from the database
    }


    // res.status(200).json({
    //     "status":status,
    //     "longID":long_id,
    //     "reason":error_reason
    // })

    var result_array =[]
    result_array['status']=status;
    result_array['long_id']=long_id;
    result_array['reason']=error_reason;


    console.log(result_array)
    //   console.log(status_check.data,"status")
  },
};
