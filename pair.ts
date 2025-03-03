import express, { Request, Response } from 'express';
import fs from 'fs';
import pino from 'pino';
import NodeCache from 'node-cache';
import path from 'path';
import {
    default as makeWASocket,
    useMultiFileAuthState,
    delay,
    Browsers,
    makeCacheableSignalKeyStore,
    DisconnectReason,
    WASocket
} from '@whiskeysockets/baileys';
import { ToGoFile } from './goFile.ts';
const app = express();
const port = 3000;
let session: WASocket | null = null;
const msgRetryCounterCache = new NodeCache();
let isPairing = false;
app.use(express.static(path.join(__dirname, 'public')));
async function createSessionDir() {
    const sessionDir = './session';
    if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir);
    }
    return sessionDir;
}

async function initialize() {
    const sessionDir = await createSessionDir();
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    session = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(
                state.keys,
                pino({ level: 'silent' }).child({ level: 'silent' })
            )
        },
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }).child({ level: 'silent' }),
        browser: Browsers.macOS("Safari"),
        markOnlineOnConnect: true,
        msgRetryCounterCache
    });

    session.ev.on('creds.update', saveCreds);
    session.ev.on('connection.update', handleConnectionUpdate);
}

async function handleConnectionUpdate(update: any) {
    const { connection, lastDisconnect } = update;
    if (connection === 'open') {
        console.log('Session connected successfully!');
        await handleSessionReady();
    } else if (connection === 'close') {
        const reason = lastDisconnect?.error?.output?.statusCode;
        handleReconnection(reason);
    }
}

async function handleSessionReady() {
    if (!session) return;

    await delay(5000);
    const voidi = await session.sendMessage(session.user!.id, { text: 'Your session is ready\n*Dont share it with anyone' });
    const filePath = './session/creds.json';
    try {
        const fileUrl = await ToGoFile(filePath);
        const fileID = fileUrl.split('/d/')[1] || fileUrl;
        const sessionID = `AquaSeek~${fileID}`;
        await session.sendMessage(session.user!.id, {
            caption: `*Session ID*\n\n${sessionID}`
        }, { quoted: voidi });
    } catch (error) {
        console.error(error);
    } finally {
        cleanupSessionFiles();
    }
}

function handleReconnection(reason?: number) {
    if ([
        DisconnectReason.connectionLost,
        DisconnectReason.connectionClosed,
        DisconnectReason.restartRequired
    ].includes(reason!)) {
        console.log('Reconnecting...');
        startSession('');
    } else {
        console.log(`Session disconnected (reason: ${reason})`);
        session?.end();
        session = null;
    }
}

function cleanupSessionFiles() {
    const sessionDir = './session';
    if (fs.existsSync(sessionDir)) {
        fs.rmdirSync(sessionDir, { recursive: true });
    }
}

async function startSession(phoneNumber: string, res?: Response) {
    await initialize();
    if (session && !session.authState.creds.registered) {
        await delay(1500);
        const sanitizedNumber = phoneNumber.replace(/[^0-9]/g, '');
        const pairingCode = await session.requestPairingCode(sanitizedNumber);
        if (res && !res.headersSent) {
            res.send({ code: pairingCode?.match(/.{1,4}/g)?.join('-') });
        }
    }
}

app.get('/pair', async (req: Request, res: Response) => {
    const phoneNumber = req.query.code as string;
    if (!phoneNumber) {
    return res.status(418).json({ message: 'Phone number is required' });}
    if (isPairing) {
    return res.status(429).json({ error: 'Pairing is already in progress. Please wait...' });}
    isPairing = true;
    try {
         await startSession(phoneNumber, res);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "An error occurred" });
    } finally {
        isPairing = false;
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

