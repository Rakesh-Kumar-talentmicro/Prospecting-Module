import crypto from 'crypto';
import zlib from 'zlib';
import dotenv from 'dotenv';

dotenv.config({})
const secretKey = process.env.SECRETKEY;
const algorithm = process.env.ALGORITHM;

export const encryptPayload = (data) => {
    const jsonData = JSON.stringify(data);

    const compressed = zlib.gzipSync(
        Buffer.from(jsonData, 'utf8')
    );

    const key = crypto.createHash('sha256').update(secretKey).digest();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(algorithm,key,iv);
    const encrypted = Buffer.concat([cipher.update(compressed),cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv,authTag,encrypted]).toString('base64');
};

export const decryptPayload = (encryptedData) => {
    const payload = Buffer.from(
        encryptedData,
        'base64'
    );

    const iv = payload.subarray(0, 12);
    const authTag = payload.subarray(12, 28);
    const encrypted = payload.subarray(28);
    const key = crypto.createHash('sha256').update(secretKey).digest();

    const decipher = crypto.createDecipheriv(algorithm,key,iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
    ]);

    const uncompressed =
        zlib.gunzipSync(decrypted);

    return JSON.parse(
        uncompressed.toString('utf8')
    );
};