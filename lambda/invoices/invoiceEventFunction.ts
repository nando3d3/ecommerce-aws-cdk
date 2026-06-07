import { DynamoDBStreamEvent, Context, AttributeValue } from "aws-lambda";
import { ApiGatewayManagementApi, DynamoDB } from "aws-sdk";
import { InvoiceWSService } from "/opt/nodejs/invoiceWSConnection";

const eventsDdb = process.env.EVENTS_DDB!;
const invoiceWsApiEndpoint = process.env.INVOICE_WSAPI_ENDPOINT!.substring(6);

const ddbClient = new DynamoDB.DocumentClient();
const apigwManagementApi = new ApiGatewayManagementApi({
  endpoint: invoiceWsApiEndpoint,
});

const invoiceWSService = new InvoiceWSService(apigwManagementApi);

export async function handler(
  event: DynamoDBStreamEvent,
  context: Context,
): Promise<void> {
  const promises: Promise<void>[] = [];
  event.Records.forEach((record) => {
    if (record.eventName === "INSERT") {
      if (record.dynamodb!.NewImage!.pk.S!.startsWith("#transaction")) {
        console.log("Skipping transaction Record");
      } else {
        console.log("Invoice event received");
        promises.push(
          createEvent(record.dynamodb!.NewImage!, "INVOICE_CREATED"),
        );
      }
    } else if (record.eventName === "MODIFY") {
    } else if (record.eventName === "REMOVE") {
      if (record.dynamodb!.OldImage!.pk.S! === "#transaction") {
        console.log("Invoice transaction event received");
        promises.push(processExpiredTransaction(record.dynamodb!.OldImage!));
      }
    }
  });

  await Promise.all(promises);
  return;
}

async function createEvent(
  invoiceImage: { [key: string]: AttributeValue },
  eventType: string,
) {
  const timestamp = Date.now();
  const ttl = ~~(timestamp / 1000 + 60 * 60);

  await ddbClient
    .put({
      TableName: eventsDdb,
      Item: {
        pk: `#invoice_${invoiceImage.sk.S}`,
        sk: `${eventType}#${timestamp}`,
        ttl: ttl,
        email: invoiceImage.pk.S!.split("_")[1],
        createdAt: timestamp,
        eventType: eventType,
        info: {
          transaction: invoiceImage.transactionId.S,
          productId: invoiceImage.productId.N,
        },
      },
    })
    .promise();
}

async function processExpiredTransaction(invoiceTransactionImage: {
  [key: string]: AttributeValue;
}): Promise<void> {
  const transactionId = invoiceTransactionImage.sk.S!;
  const connectionId = invoiceTransactionImage.connectionId.S!;

  console.log(
    `TransactionId: ${transactionId} - ConnectionId: ${connectionId}`,
  );

  if (invoiceTransactionImage.transactionStatus.S === "INVOICE_PROCESSED") {
    console.log("Invoice processed");
  } else {
    console.log(
      `Invoice import failed - Status ${invoiceTransactionImage.transactionStatus.S}`,
    );
    await invoiceWSService.sendInvoiceStatus(
      transactionId,
      connectionId,
      "TIMEOUT",
    );

    await invoiceWSService.disconnectClient(connectionId);
  }
}
