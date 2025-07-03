import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';

import {
  handleVerification,
  handleIncomingMessage,
} from './handlers/webhookHandler.js';

dotenv.config();

const app = express();
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));

app.get('/webhook', handleVerification);
app.post('/webhook', handleIncomingMessage);

const port =
  process.env.STATUS === 'production'
    ? process.env.PROD_PORT
    : process.env.DEV_PORT;

app.listen(port, () => {
  console.log(`Webhook is listening on port ${port}`);
});
