Para utilizar o NodeJS versão 20.x, faça uma alteração em todos os Lambda Layers que for criar durante esse curso. A alteração é a seguinte:

- compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],

Por isso, em todas as stacks do projeto CDK, onde você for criar Lambda Layers nesse curso a partir desse ponto, altere o parâmetro compatibleRuntimes, como mostra o exemplo a seguir:

      const productsLayers = new lambda.LayerVersion(this, "ProductsLayer", {
         compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
         code: lambda.Code.fromAsset('lambda/products/layers/productsLayer'),
         layerVersionName: "ProductsLayer",
         removalPolicy: cdk.RemovalPolicy.RETAIN
      })

Lembre-se de adicionar o parâmetro compatibleRuntimes em todos os Lambda Layers que você criar, dentro das stacks do projeto CDK.

---

Volte ao seu código de criação do AWS API Gateway no seu projeto do CDK, e adicione o parâmetro cloudWatchRole com o valor true, como no exemplo a seguir:

      const api = new apigateway.RestApi(this, "API", {
         restApiName: "API",
         cloudWatchRole: true
      })

---
