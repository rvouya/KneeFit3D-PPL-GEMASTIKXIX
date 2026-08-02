import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email dan kata sandi wajib diisi.' });
  }
  try {
    const { rows } = await query(
      'SELECT id, email, name, org, password_hash FROM users WHERE email = $1',
      [String(email).toLowerCase()],
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(String(password), user.password_hash))) {
      return res.status(401).json({ error: 'Kredensial tidak valid.' });
    }
    return res.json({ id: user.id, email: user.email, name: user.name, org: user.org });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Gagal terhubung ke database.' });
  }
});
