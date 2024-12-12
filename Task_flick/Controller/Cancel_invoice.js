var axios = require('axios')
const { z } = require("zod"); // Import Zod library
const cancelInvoiceSchema = z.object({
  uuid: z.string().uuid('Invalid UUID format').nonempty('UUID is required'),  // UUID must be a valid string and not empty
  reason: z.string().nonempty('Reason is required'),  // Reason must be a non-empty string
});
module.exports={


    cancel_invoice :async(uuid,reason)=>{

        try
        {

          try {
            // Validate the inputs using the schema
            cancelInvoiceSchema.parse({ uuid, reason });
      
            // If validation is successful, log the success message and exit
            console.log('Validation passed: UUID and reason are valid.');
            // process.exit(0);  // Exit with success code (0)
      
          } catch (err) {
            // Handle validation errors
            console.error('Validation error:', err.errors.map(e => e.message).join(', '));
            process.exit(1);  // Exit with error code (1)
          }
      

            var test_url = "https://sandbox-my.flick.network/api/einvoice/cancel"

            var supplier_uuid = "0193af5d-4ee9-7c63-8367-4a3b5bcdbbe1"
           

            const data_test = {
                uuid: uuid,       // eInvoice UUID to be cancelled
                status: 'cancelled',       // The status to update to
                reason: reason,   // Reason for cancellation
              };

            try {
                // Make the POST request using Axios
                var response_data = await axios.post(test_url, data_test, {
                    headers: {
                        'x-flick-auth-key': 'tristarHOdyTerE5ZgPP5WEKndDVbqZMKHIeFgk52x8tASKMB',        // Authentication token
                        'supplier_uuid': supplier_uuid,   // Supplier UUID
                        'Content-Type': 'application/json' // Content type as JSON
                      }
                });

                console.log(response_data)
            
                // Return the response from the external API
                // res.status(200).json(response_data.data);

                console.log(response_data.data)

              } catch (error) {
                // Handle errors
                console.error('Error sending data to external API:', error);
                // res.status(500).json({ error: 'Failed to send data to the external API' });
              }

        }
        catch(err)
        {
            console.log(err)
        }
    }

}