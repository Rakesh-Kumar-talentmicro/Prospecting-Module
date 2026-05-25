import { Client } from '@elastic/elasticsearch';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({
    node: process.env.ELASTIC_URL,
    auth: {
        apiKey: process.env.ELASTIC_API_KEY
    }
});

export default client;