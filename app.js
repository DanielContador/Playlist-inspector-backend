const express = require('express');
const bodyParser = require('body-parser');
const scrapeSpotifyPlaylists = require('scraper.js');

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

app.post('/scrape', async (req, res) => {
    const { artistId } = req.body;
    console.log(`Se recibió el ID del artista: ${artistId}`);
    
    if (!artistId) {
      console.error('ID del artista no proporcionado.');
      return res.status(400).json({ error: 'ID del artista es obligatorio' });
    }
  
    try {
      const playlists = await scrapeSpotifyPlaylists(artistId);
      console.log('Playlists recopiladas:', playlists);
      res.json({ playlists });
    } catch (error) {
      console.error('Error al realizar el scraping:', error);
      res.status(500).json({ error: 'Error al realizar el scraping' });
    }
  });
  
app.listen(3000, () => console.log('Servidor iniciado en http://localhost:3000'));
