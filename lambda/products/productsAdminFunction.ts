import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import { ProductRepository } from "/opt/nodejs/productsLayer";
import { DynamoDB, Lambda } from "aws-sdk";
import { Product } from "/opt/nodejs/productsLayer";
import { ProductEvent, ProductEventType } from "/opt/nodejs/productEventLayer";
import * as AWSXRay from "aws-xray-sdk";

AWSXRay.captureAWS(require("aws-sdk"));
const productsDdb = process.env.PRODUCTS_DDB!;
const productEvenetsFunctionName = process.env.PRODUCT_EVENTS_FUNCTION_NAME!;
const ddbClient = new DynamoDB.DocumentClient();
const lambdaClient = new Lambda();

const productRepository = new ProductRepository(ddbClient, productsDdb);

export async function handler(
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> {
  const lambdaRequestId = context.awsRequestId;
  const apiRequestId = event.requestContext.requestId;
  console.log(
    `API Gateway RequestId: ${apiRequestId} - Lambda RequestId: ${lambdaRequestId}`,
  );

  const method = event.httpMethod;
  const eventResource = event.resource;

  if (eventResource === "/products") {
    console.log("POST /products");

    const product = JSON.parse(event.body!) as Product;
    const productCreated = await productRepository.create(product);

    const response = await sendProductEvent(
      productCreated,
      ProductEventType.CREATED,
      "johnCriacao@yahoo.com",
      lambdaRequestId,
    );

    console.log(response);

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: "Success",
        productCreated,
      }),
    };
  } else if (eventResource === "/products/{id}") {
    const productId = event.pathParameters!.id as string;
    if (method === "PUT") {
      console.log(`POST /products/${productId}`);
      try {
        const product = JSON.parse(event.body!) as Product;
        const productUpdated = await productRepository.updateProduct(
          productId,
          product,
        );

        const response = await sendProductEvent(
          productUpdated,
          ProductEventType.UPDATED,
          "joaoAtualizacao@yahoo.com",
          lambdaRequestId,
        );
        console.log(response);
        return {
          statusCode: 200,
          body: JSON.stringify({
            message: "Success",
            productUpdated,
          }),
        };
      } catch (ConditionalCheckFailException) {
        console.log((<Error>ConditionalCheckFailException).message);
        return {
          statusCode: 404,
          body: JSON.stringify({
            message: "Failed",
            error: "Product not found",
          }),
        };
      }
    } else if (method === "DELETE") {
      console.log(`DELETE /products/${productId}`);

      try {
        const productDeleted = await productRepository.deleteProduct(productId);

        const response = await sendProductEvent(
          productDeleted,
          ProductEventType.DELETED,
          "joaoDelecao@yahoo.com",
          lambdaRequestId,
        );
        console.log(response);
        return {
          statusCode: 200,
          body: JSON.stringify({
            message: "Success",
            productDeleted,
          }),
        };
      } catch (error) {
        console.log((<Error>error).message);
        return {
          statusCode: 404,
          body: JSON.stringify({
            message: "Failed",
            error: (error as Error).message,
          }),
        };
      }
    }
  }

  return {
    statusCode: 400,
    body: "Bad request :(",
  };
}

function sendProductEvent(
  product: Product,
  eventType: ProductEventType,
  email: string,
  lambdaRequestId: string,
) {
  const event: ProductEvent = {
    email: email,
    eventType: eventType,
    productCode: product.code,
    productId: product.id,
    productPrice: product.price,
    requestId: lambdaRequestId,
  };

  return lambdaClient
    .invoke({
      FunctionName: productEvenetsFunctionName,
      Payload: JSON.stringify(event),
      InvocationType: "Event",
    })
    .promise();
}
