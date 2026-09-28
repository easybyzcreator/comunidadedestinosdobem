import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Rota para receber os dados do formulário
  app.post('/api/submit', async (req, res) => {
    const formData = req.body;
    console.log('Dados recebidos no servidor:', formData);
    const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbzITJ0MjA5bAOrDE-LuGqZ6eWYo327qXSnaA_0GBats9Ak-GM963lSBXFWY_Ea55cyq/exec';
    
    try {
      const response = await fetch(GOOGLE_SHEETS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        console.log('Dados enviados para Google Sheets com sucesso!');
        res.json({ success: true });
      } else {
        console.error('Erro na resposta do Google Sheets:', response.statusText);
        res.status(500).json({ success: false, error: 'Erro ao salvar na planilha' });
      }
    } catch (error) {
      console.error('Erro ao enviar para Sheets:', error);
      res.status(500).json({ success: false, error: 'Erro de conexão com a planilha' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer();
