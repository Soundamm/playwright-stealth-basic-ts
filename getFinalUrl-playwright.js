const express = require('express');
const { chromium } = require('playwright');

const app = express();
app.use(express.json());

app.post('/resolve-url', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'No URL provided' });
  }

  let browser;
  try {
    // Lanzar navegador con configuración optimizada para Railway
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security'
      ]
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();
    
    // Navegar a la URL con timeout y esperar carga completa
    await page.goto(url, { 
      waitUntil: 'networkidle', 
      timeout: 30000 
    });

    // Esperar redirecciones adicionales de JavaScript
    await page.waitForTimeout(3000);

    // Obtener la URL final
    const finalUrl = page.url();
    
    await browser.close();
    
    return res.json({ 
      finalUrl,
      success: true,
      processedAt: new Date().toISOString()
    });

  } catch (error) {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error cerrando navegador:', closeError);
      }
    }
    
    return res.status(500).json({ 
      error: error.message,
      success: false,
      originalUrl: url
    });
  }
});

// Endpoint de health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'URL Resolver with Playwright' });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Playwright URL resolver running on port ${PORT}`);
});
