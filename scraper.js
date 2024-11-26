const puppeteer = require('puppeteer');

async function scrapeSpotifyPlaylists(artistId) {
  const browser = await puppeteer.launch({ headless: false }); // Navegador oculto
  const page = await browser.newPage();

  const baseUrl = `https://open.spotify.com/intl-es/artist/${artistId}`;
  const allPlaylists = [];

  try {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

    // Obtener artistas relacionados
    await page.waitForSelector('div[data-testid="grid-container"]', { timeout: 5000 });
    const relatedArtists = await page.$$eval(
      'div[data-testid="grid-container"] [id^="card-subtitle-spotify:artist:"]',
      (elements) =>
        elements
          .map((el) => el.id.match(/card-subtitle-spotify:artist:([^-\s]+)/)?.[1])
          .filter(Boolean)
          .slice(0, 5)
    );

    // Función para extraer playlists de la sección "Discovered On"
    async function scrapeDiscoveredOn(artistId) {
      const discoveredUrl = `https://open.spotify.com/intl-es/artist/${artistId}/discovered-on`;
      await page.goto(discoveredUrl, { waitUntil: 'domcontentloaded' });

      try {
        await page.waitForSelector('div[role="button"]', { timeout: 5000 });
      } catch {
        return []; // Si no encuentra la sección, devolvemos un arreglo vacío
      }

      const playlists = await page.$$eval('div[role="button"]', (elements) =>
        elements.map((element) => {
          const ariaLabel = element.getAttribute('aria-labelledby');
          return {
            ariaLabel,
            selector: `div[role="button"][aria-labelledby="${ariaLabel}"]`,
          };
        })
      );

      const playlistDetails = [];

      for (const playlist of playlists) {
        try {
          const playlistElement = await page.$(playlist.selector);
          if (playlistElement) {
            await page.click(playlist.selector);

            await page.waitForSelector('div.RP2rRchy4i8TIp1CTmb7', { timeout: 5000 });

            const details = await page.evaluate(() => {
              const container = document.querySelector('div.RP2rRchy4i8TIp1CTmb7');
              if (!container) return null;

              const title = container.querySelector('h1[data-encore-id="text"]')?.innerText.trim() || 'Sin título';
              const description = container.querySelector('div.xgmjVLxjqfcXK5BV_XyN')?.innerText.trim() || 'Sin descripción';
              const saves = container.querySelector('span.w1TBi3o5CTM7zW1EB3Bm')?.innerText.trim() || 'No disponible';
              const creator = container.querySelector('a[data-testid="creator-link"]')?.innerText.trim() || 'Desconocido';
              const creatorLink = container.querySelector('a[data-testid="creator-link"]')?.href || 'Sin enlace';
              const songsAndDuration = container.querySelector('div.GI8QLntnaSCh2ONX_y2c')?.innerText.trim() || 'Sin datos';
              const image = document.querySelector('div[data-testid="playlist-image"] img')?.src || 'Sin imagen';

              return { title, description, saves, creator, creatorLink, songsAndDuration, image };
            });

            if (details) {
              playlistDetails.push(details);
            }
          }

          await page.goBack({ waitUntil: 'domcontentloaded' });
        } catch (error) {
          console.warn(`Error al procesar playlist: ${playlist.ariaLabel}`, error);
        }
      }

      return playlistDetails;
    }

    // Recopilar playlists del artista principal
    const mainPlaylists = await scrapeDiscoveredOn(artistId);
    allPlaylists.push(...mainPlaylists);

    // Recopilar playlists de artistas relacionados
    for (const relatedArtistId of relatedArtists) {
      try {
        const relatedPlaylists = await scrapeDiscoveredOn(relatedArtistId);
        allPlaylists.push(...relatedPlaylists);
      } catch (error) {
        console.error(`Error al procesar el artista relacionado ${relatedArtistId}:`, error);
      }
    }

    const uniquePlaylists = Array.from(
      new Map(allPlaylists.map((item) => [item.title, item])).values()
    );

    return uniquePlaylists;
  } catch (error) {
    console.error('Error durante el scraping:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

module.exports = scrapeSpotifyPlaylists;
