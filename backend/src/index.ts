import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import productRoutes from './routes/productRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import proxyImageRoutes from './routes/proxyImageRoutes.js';
import cartRoutes from './routes/cartRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getProductsImageDir(): string {
  const fromBackend = path.join(__dirname, '..', 'public', 'products');
  const fromRoot = path.join(__dirname, '..', '..', 'public', 'products');
  if (fs.existsSync(fromBackend)) return fromBackend;
  if (fs.existsSync(fromRoot)) return fromRoot;
  return fromRoot;
}

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use('/api/assets/products', express.static(getProductsImageDir()));

app.use('/api', authRoutes);
app.use('/api', orderRoutes);
app.use('/api', productRoutes);
app.use('/api', proxyImageRoutes);
app.use('/api', cartRoutes);
app.use('/api', chatRoutes);

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
