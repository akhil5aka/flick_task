import axios from "axios";
import { Request, Response } from "express";

interface CancelInvoiceRequest {
  uuid: string; // eInvoice UUID to be canceled
  reason: string; // Reason for cancellation
}

module.exports = {
  cancelInvoice: async (req: Request, res: Response): Promise<void> => {
    const supplierUuid: string = "01932570-da7d-7c1a-89ec-f138f1a5d35e";
    const flickAuthKey: string =
      "maicaab878a2f6ed8eb8eddfd7d7b188a2b09717c2bdb23099e66a2103c0";
    const testUrl: string =
      "https://sandbox-api.flick.network/my/einvoice/cancel";

    try {
      // Validate request body
      const { uuid, reason }: CancelInvoiceRequest = req.body;

      if (!uuid || !reason) {
        res
          .status(400)
          .json({ error: "Invalid request. UUID and reason are required." });
        return;
      }

      // Request payload
      const dataTest = {
        uuid, // eInvoice UUID
        status: "cancelled", // Update status to cancelled
        reason, // Reason for cancellation
      };

      try {
        // Make POST request
        const response = await axios.post(testUrl, dataTest, {
          headers: {
            "x-flick-auth-key": flickAuthKey, // Authentication token
            supplier_uuid: supplierUuid, // Supplier UUID
            "Content-Type": "application/json", // JSON content type
          },
        });

        // Send response from the external API
        res.status(200).json(response.data);
      } catch (error: any) {
        // Handle Axios errors
        console.error(
          "Error sending data to external API:",
          error.message || error
        );
        res.status(500).json({
          error: "Failed to send data to the external API",
          details: error.response?.data || error.message,
        });
      }
    } catch (err) {
      // General error handling
      console.error("Unexpected error:", err);
      res.status(500).json({ error: "An unexpected error occurred" });
    }
  },
};
