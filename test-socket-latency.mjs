import { io } from '/home/dave/expo/PH-App/node_modules/socket.io-client/build/esm/index.js';
import { SignJWT } from '/home/dave/expo/PH-App/node_modules/jose/dist/node/esm/index.js';

const SECRET = new TextEncoder().encode('dawit-worku-4937');
const API = process.env.API_URL || 'https://ph-platform.onrender.com';
const ROUNDS = 10;

async function makeToken(userId, role, name) {
  return new SignJWT({ user_id: userId, role, name })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(SECRET);
}

const [token1, token2] = await Promise.all([
  makeToken(166, 'coach', 'UK User'),
  makeToken(116, 'guardian', 'ET User'),
]);

// clientId → send timestamp
const pending = new Map();

function connect(token, label) {
  return new Promise((resolve, reject) => {
    const s = io(API, {
      auth: { token },
      transports: ['websocket'],
      reconnection: false,
      path: '/socket.io/',
    });
    s.on('connect', () => { console.log(`[${label}] connected  id=${s.id}`); resolve(s); });
    s.on('connect_error', (e) => reject(new Error(`${label}: ${e.message}`)));
    setTimeout(() => reject(new Error(`${label} connect timeout`)), 10000);
  });
}

async function run() {
  console.log(`\nTarget : ${API}`);
  console.log(`Rounds : ${ROUNDS}\n`);

  let s1, s2;
  try {
    [s1, s2] = await Promise.all([connect(token1, 'UK  '), connect(token2, 'ET  ')]);
  } catch (err) {
    console.error('Connect failed:', err.message);
    process.exit(1);
  }

  const latencies = [];
  let round = 0;

  await new Promise((resolve) => {
    // ET user receives message → compute latency via clientId
    s2.on('message:new', (msg) => {
      const received = Date.now();
      const clientId = msg.clientMessageId ?? msg.clientId;
      if (!clientId || !pending.has(clientId)) return;
      const sent = pending.get(clientId);
      pending.delete(clientId);
      const rtt = received - sent;
      latencies.push(rtt);
      console.log(`  round ${String(round).padStart(2)}: ${rtt}ms  (msg-id=${msg.id})`);
      if (latencies.length >= ROUNDS) {
        resolve();
      } else {
        sendNext();
      }
    });

    function sendNext() {
      round++;
      const clientId = `lat-${round}-${Date.now()}`;
      pending.set(clientId, Date.now());
      s1.emit('message:send', {
        toUserId: 116,
        content: `ping ${round}`,
        contentType: 'text',
        clientId,
      });
    }

    sendNext();
  });

  const sorted = [...latencies].sort((a, b) => a - b);
  const avg = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
  const p95 = sorted[Math.floor(sorted.length * 0.95)];

  console.log(`\n──────────────────────────────────`);
  console.log(`  min  ${Math.min(...latencies)}ms`);
  console.log(`  avg  ${avg}ms`);
  console.log(`  p95  ${p95}ms`);
  console.log(`  max  ${Math.max(...latencies)}ms`);
  console.log(`──────────────────────────────────`);
  console.log(`\nBoth clients on same machine → server in NYC.`);
  console.log(`UK→NYC adds ~80ms, Ethiopia→NYC adds ~220ms each way.`);

  s1.disconnect();
  s2.disconnect();
  process.exit(0);
}

run().catch((err) => { console.error(err); process.exit(1); });
