import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import goAccount from './accounts';

async function getBestServer(): Promise<string> {
    const res = await axios.get('https://api.gofile.io/servers');
    if (res.data.status !== 'ok') {
        throw new Error(`${JSON.stringify(res.data)}`);
    }
    return res.data.data.server;
}

export async function ToGoFile(filePath: string): Promise<string> {
    const { apiKey } = goAccount;
    if (!apiKey) {
    throw new Error('GoFile API Key is missing');}
    const server = await getBestServer();
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    const response = await axios.post(
        `https://${server}.gofile.io/contents/uploadfile?token=${apiKey}`,
        formData,
        { headers: formData.getHeaders() }
    );
    if (response.data.status !== 'ok') {
    throw new Error(`${JSON.stringify(response.data)}`);}
   return response.data.data.contentId;
}
