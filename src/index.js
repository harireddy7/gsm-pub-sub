const express = require('express');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const crypto = require('crypto');

const app = express();
const secretManager = new SecretManagerServiceClient();

app.use(express.json());

const generateKey = () => {
  return crypto.randomBytes(8).toString('hex')
}


app.get('/', (_, res) => {
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
  console.log(process.env);
  res.status(200).send(process.env)
})


const PORT = process.env.PORT || 8080;

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
