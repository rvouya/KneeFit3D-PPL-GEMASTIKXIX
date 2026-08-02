import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { authRouter } from './routes/auth.js';
import { casesRouter } from './routes/cases.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api/cases', casesRouter);

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`[kneefit3d] API on http://localhost:${port}`);
});
