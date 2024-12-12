# Define headers
$headers = @{
    "Content-Type" = "application/json"
    "x-flick-auth-key" = "tristarHOdyTerE5ZgPP5WEKndDVbqZMKHIeFgk52x8tASKMB"
    "supplier_uuid" = "0193af5d-4ee9-7c63-8367-4a3b5bcdbbe1"
}

# Define JSON payload
$jsonPayload = @{
    ID = "INV12345"
    IssueDate = "2024-01-26"
    IssueTime = "15:30:00Z"
    InvoiceTypeCode = "01"
    InvoiceTotal = 18.02
    DocumentCurrencyCode = "MYR"
    CustomerParty = @{
        LegalName = "Hebat Group"
        CustomerTIN = "C25845632100"
        CustomerBRN = "202121111111"
        CityName = "Kuala Lumpur"
        PostalZone = "50480"
        CountrySubentityCode = "14"
        AddressLines = @("Lot 66")
        CountryCode = "MYS"
        Telephone = "+60-123456789"
    }
    InvoiceLines = @(
        @{
            Description = "Laptop Peripherals"
            InvoicedQuantity = 1
            PriceAmount = 17
            LineTaxes = @(
                @{
                    TaxType = "01"
                    TaxExemptionReason = "None"
                    TaxRate = 0.06
                }
            )
            ClassificationCode = "001"
        }
    )
}

# Convert JSON object to string
$jsonString = $jsonPayload | ConvertTo-Json -Depth 10 -Compress

# Make POST request
$response = Invoke-WebRequest -Uri 'https://sandbox-my.flick.network/my/einvoice/generate/invoice' -Method POST -Headers $headers -Body $jsonString

# Check for response
if ($response.StatusCode -eq 200) {
    Write-Output "API Response Content:"
    $response.Content

    # Save the response content to a file (optional)
    $response.Content | Out-File -FilePath "C:\Users\Akhil\Desktop\Task_flick\data_files\Output.txt"
} else {
    Write-Output "API request failed with status code: $($response.StatusCode)"
    Write-Output "Error Message: $($response.StatusDescription)"
}
