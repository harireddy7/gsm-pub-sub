const express = require('express');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { PubSub } = require('@google-cloud/pubsub');
const crypto = require('crypto');

const app = express();
const secretManager = new SecretManagerServiceClient();
const pubSubClient = new PubSub();

const subscriptionName = process.env.SUBSCRIPTION_PATH;
const timeout = 60;

app.use(express.json());

const generateKey = () => {
  return crypto.randomBytes(8).toString('hex')
}

const listenForMessages = () => {
  const subscription = pubSubClient.subscription(subscriptionName);

  const messageHandler = message => {
    console.log(`Received message: ${message.data.toString()}`);
    message.ack();
  };

  subscription.on('message', messageHandler);

  setTimeout(() => {
    subscription.removeListener('message', messageHandler);
    console.log(`${timeout} seconds elapsed, listener removed.`);
  }, timeout * 1000);
}


app.get('/', (_, res) => {
  listenForMessages();
  res.status(200).send('Healthy');
});


app.post('/', async (req, res) => {
  console.log(`REQ START::: GSM secret path:: ${process.env.SECRET_PATH}`);

  const message = req.body.message;
  console.log(JSON.stringify(req.body));

  const data = Buffer.from(message.data, 'base64').toString('utf-8');
  console.log(`Received message: ${data}`);

  // Update the secret in Secret Manager
  const secretValue = generateKey();
  const [version] = await secretManager.addSecretVersion({
    parent: process.env.SECRET_PATH,
    payload: {
      data: Buffer.from(secretValue, 'utf-8'),
    },
  });

  console.log(`Added secret version: ${version.name} - ${secretValue}`);
  res.status(204).send();
});


app.get('/secret', async (req, res) => {
  const [version] = await secretManager.accessSecretVersion({
    name: `${process.env.SECRET_PATH}/versions/latest`,
  });

  res.status(200).send(version.payload?.data?.toString());
})


app.post('/secret', async (req, res) => {
  // Update the secret in Secret Manager
  const secretValue = generateKey();
  const [version] = await secretManager.addSecretVersion({
    parent: process.env.SECRET_PATH,
    payload: {
      data: Buffer.from(secretValue, 'utf-8'),
    },
  });

  console.log(`Added secret version: ${version.name} - ${secretValue}`);
  res.status(204).send(secretValue);
});


app.get('/logenv', async (req, res) => {
  const values = Object.keys(process.env).filter(key => key.startsWith('SECRET_')).map(k => ({ [k]: process.env[k] }))
  res.status(200).send(values);
})


const PORT = process.env.PORT || 8080;

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
