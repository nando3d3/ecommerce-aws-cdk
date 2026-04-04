#!/usr/bin/env node
import * as cdk from "aws-cdk-lib/core";
import { ProductsAppStack } from "../lib/productsApp-stack";
import { ECommerceApiStack } from "../lib/ecommerceApi-stack";
import { ProductsAppLayersStack } from "../lib/productsAppLayer-stack";
import { EventsDdbStack } from "../lib/eventsDdb-stack";
import { OrdersAppLayersStack } from "../lib/ordersAppLayers-stack";
import { OrdersAppStack } from "../lib/ordersApp-stack";

const app = new cdk.App();

const env: cdk.Environment = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const tags = {
  cost: "ECommerce",
  team: "sidCode",
};

const productsAppLayerStack = new ProductsAppLayersStack(
  app,
  "ProductsAppLayers",
  {
    tags: tags,
    env: env,
  },
);

const eventsDdbStack = new EventsDdbStack(app, "EventsDdb", {
  tags: tags,
  env: env,
});

const productsAppStack = new ProductsAppStack(app, "ProductsApp", {
  eventsDdb: eventsDdbStack.table,
  tags: tags,
  env: env,
});
productsAppStack.addDependency(productsAppLayerStack);
productsAppStack.addDependency(eventsDdbStack);

const ordersAppLayersStack = new OrdersAppLayersStack(app, "OrdersAppLayers", {
  tags: tags,
  env: env,
});

const ordersAppStack = new OrdersAppStack(app, "OrdersApp", {
  tags: tags,
  env: env,
  productsDdb: productsAppStack.productsDbd,
});

ordersAppStack.addDependency(productsAppStack);
ordersAppStack.addDependency(ordersAppLayersStack);

const eCommerceApiStack = new ECommerceApiStack(app, "ECommerceApi", {
  productsFetchHandler: productsAppStack.producstFetchHandler,
  productsFetchAdminHandler: productsAppStack.productsAdminHandler,
  ordersHandler: ordersAppStack.ordersHandler,
  tags: tags,
  env: env,
});

eCommerceApiStack.addDependency(productsAppStack);
