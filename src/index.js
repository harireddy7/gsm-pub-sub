const express = require('express');
const { PubSub } = require('@google-cloud/pubsub');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

const app = express();
const pubsub = new PubSub();
const secretManager = new SecretManagerServiceClient();

app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).send('Healthy')
})

app.post('/', async (req, res) => {
  console.log(`REQ START::: GSM secret path:: ${process.env.SECRET_PATH}`)
  const message = req.body.message;
  console.log(JSON.stringify(req.body));

  const data = Buffer.from(message.data, 'base64').toString('utf-8');
  console.log(`Received message: ${data}`);

  // Update the secret in Secret Manager
  const newSecret = 'new-secret';
  const [version] = await secretManager.addSecretVersion({
    parent: process.env.SECRET_PATH,
    payload: {
      data: Buffer.from(newSecret, 'utf-8'),
    },
  });

  console.log(`Added secret version: ${version.name} - ${newSecret}`);
  res.status(204).send();
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
