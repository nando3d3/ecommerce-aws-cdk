import { Context, SQSEvent, SNSMessage } from "aws-lambda";
import { SES, AWSError } from "aws-sdk";
import { PromiseResult } from "aws-sdk/lib/request";
import * as AWSXRay from "aws-xray-sdk";
import { Envelope, OrderEvent } from "/opt/nodejs/orderEventsLayer";

AWSXRay.captureAWS(require("aws-sdk"));

const sesClient = new SES();

export async function handler(
  event: SQSEvent,
  context: Context,
): Promise<void> {
  const promises: Promise<PromiseResult<SES.SendEmailResponse, AWSError>>[] =
    [];
  event.Records.forEach((record) => {
    const body = JSON.parse(record.body) as SNSMessage;
    promises.push(sendOrderEmail(body));
  });
  await Promise.all(promises);
  return;
}

function sendOrderEmail(body: SNSMessage) {
  const from = process.env.SES_FROM_EMAIL?.trim();
  if (!from) {
    throw new Error("SES_FROM_EMAIL is not set");
  }

  const envelope = JSON.parse(body.Message) as Envelope;
  const event = JSON.parse(envelope.data) as OrderEvent;

  return sesClient
    .sendEmail({
      Destination: {
        ToAddresses: [event.email],
      },
      Message: {
        Body: {
          Text: {
            Charset: "UTF-8",
            Data: `Your order is Num. ${event.orderId},
          the total is ${event.billing.totalPrice} BRL`,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: "We've received your order",
        },
      },
      Source: from,
      ReplyToAddresses: [from],
    })
    .promise();
}
