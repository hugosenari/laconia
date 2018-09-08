const laconia = require("@laconia/core");
const ssmConfig = require("@laconia/ssm-config");
const s3Config = require("@laconia/s3-config");
const DynamoDbOrderRepository = require("./DynamoDbOrderRepository");
const UuidIdGenerator = require("./UuidIdGenerator");
var log = require("pino")("place-order");

const validateApiKey = (event, apiKey) => {
  if (event.headers["Authorization"] !== apiKey) {
    throw new Error("Unauthorized: Wrong API Key");
  }
};

const validateRestaurantId = (restaurants, restaurantId) => {
  if (!restaurants.includes(restaurantId)) {
    throw new Error(`Invalid restaurant id: ${restaurantId}`);
  }
};

const instances = ({ env }) => ({
  orderRepository: new DynamoDbOrderRepository(env.ORDER_TABLE_NAME),
  idGenerator: new UuidIdGenerator()
});

const handler = async ({
  event,
  orderRepository,
  idGenerator,
  apiKey,
  restaurants
}) => {
  validateApiKey(event, apiKey);
  const orderId = idGenerator.generate();
  const order = Object.assign(
    {
      orderId
    },
    JSON.parse(event.body).order
  );

  validateRestaurantId(restaurants, order.restaurantId);
  log.info(order, "Saving order");
  await orderRepository.save(order);
  return { statusCode: 200, body: JSON.stringify({ orderId }) };
};

module.exports.handler = laconia(handler)
  .register(s3Config.envVarInstances())
  .register(ssmConfig.envVarInstances())
  .register(instances);
