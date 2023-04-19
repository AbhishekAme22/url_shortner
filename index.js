const express = require('express');
const mysql = require('mysql');
const crypto = require('crypto');
const bodyParser = require('body-parser');




const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
const port = 3000;

// Create a MySQL connection pool
const pool = mysql.createPool({
  connectionLimit: 10,
  host: 'localhost',
  user: 'root',
  password: '1234',
  database: 'url_shortener'
});

// Define the API endpoints

// Create a new shortened URL for a given long URL
app.post('/shorten', (req, res) => {
    console.log(req.body)
  const longUrl = req.body.longUrl;
  const customShortUrl = req.body.customShortUrl;

  // Generate a short URL by hashing the long URL
  const hash = crypto.createHash('sha256').update(longUrl).digest('hex');
  const shortUrl = hash.substring(0, 7); // Use the first 7 characters of the hash as the short URL

  // Check if the custom short URL is already in use
  if (customShortUrl) {
    pool.query('SELECT * FROM urls WHERE short_url = ?', customShortUrl, (error, results) => {
      if (error) {
        res.status(500).json({ error: 'Internal server error' });
      } else if (results.length > 0) {
        res.status(400).json({ error: 'Custom short URL is already in use' });
      } else {
        insertUrlIntoDatabase(longUrl, customShortUrl, res);
      }
    });
  } else {
    insertUrlIntoDatabase(longUrl, shortUrl, res);
  }
});

// Redirect to the original URL for a given short URL
app.get('/:shortUrl', (req, res) => {
  const shortUrl = req.params.shortUrl;

  pool.query('SELECT * FROM urls WHERE short_url = ?', shortUrl, (error, results) => {
    if (error) {
      res.status(500).json({ error: 'Internal server error' });
    } else if (results.length === 0) {
      res.status(404).json({ error: 'Short URL not found' });
    } else {
      const longUrl = results[0].long_url;
      res.redirect(longUrl);
    }
  });
});

// Update the long URL for a given short URL
app.put('/:shortUrl', (req, res) => {
  const shortUrl = req.params.shortUrl;
  const newLongUrl = req.body.newLongUrl;

  pool.query('UPDATE urls SET long_url = ? WHERE short_url = ?', [newLongUrl, shortUrl], (error, results) => {
    if (error) {
      res.status(500).json({ error: 'Internal server error' });
    } else if (results.affectedRows === 0) {
      res.status(404).json({ error: 'Short URL not found' });
    } else {
      res.status(200).json({ message: 'Long URL updated successfully' });
    }
  });
});
// Delete a short URL from the database
app.delete('/:shortUrl', (req, res) => {
  const shortUrl = req.params.shortUrl;

  pool.query('DELETE FROM urls WHERE short_url = ?', shortUrl, (error, results) => {
    if (error) {
      res.status(500).json({ error: 'Internal server error' });
    } else if (results.affectedRows === 0) {
      res.status(404).json({ error: 'Short URL not found' });
    } else {
      res.status(200).json({ message: 'Short URL deleted successfully' });
    }
  });
});

// Helper function to insert a URL into the database
function insertUrlIntoDatabase(longUrl, shortUrl, res) {
  pool.query('INSERT INTO urls (long_url, short_url) VALUES (?, ?)', [longUrl, shortUrl], (error, results) => {
    if (error) {
      res.status(500).json({ error: 'Internal server error' });
    } else {
      const baseUrl = `http://localhost:${port}`;
      const shortenedUrl = `${baseUrl}/${shortUrl}`;
      res.status(200).json({ shortenedUrl });
    }
  });
}

// Start the server
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
