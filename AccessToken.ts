import axios from 'axios';
import goFileAccount from './accounts';

export async function getAccountInfo() {
    const { accountId, apiKey } = goFileAccount;
    const voidi = await axios.get(
        `https://api.gofile.io/accounts/${accountId}`,
        {
            headers: {
                Authorization: `Bearer ${apiKey}`
            }}
    );

    if (voidi.data.status !== 'ok') {
    throw new Error(`${JSON.stringify(voidi.data)}`);}
    return voidi.data.data;
}

export async function resetGoToken() {
    const { accountId, apiKey } = goFileAccount;
    const voidi = await axios.post(
        `https://api.gofile.io/accounts/${accountId}/resettoken`,
        {},
        {
            headers: {
                Authorization: `Bearer ${apiKey}`
       }});
    if (voidi.data.status !== 'ok') {
        throw new Error(`${JSON.stringify(voidi.data)}`);
    }
    console.log('successfully');
}
  
