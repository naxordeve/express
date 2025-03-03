import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

export async function ToGoFile(filePath: string): Promise<string> {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    const response = await axios.post('https://store1.gofile.io/uploadFile', formData, {
        headers: formData.getHeaders()
    });

    return response.data.data.downloadPage;
}
