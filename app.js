const express = require('express');
const bodyParser = require('body-parser');
const redis = require('redis');

const app = express();
const PORT = 3000;

// Get Redis URL from environment variables
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const client = redis.createClient({ url: redis://red-cqs8lhrqf0us738u48a0:6379 });

client.on('error', (err) => {
    console.error('Redis error:', err);
});


// Connect to Redis
client.connect().catch(console.error);

client.on('error', (err) => {
    console.error('Redis error:', err);
});

client.on('end', () => {
    console.error('Redis connection closed. Reconnecting...');
    client.connect().catch(console.error);
});

// Keep the connection alive
setInterval(() => {
    client.ping().then(result => {
        console.log('Redis ping response:', result);
    }).catch(err => {
        console.error('Redis ping error:', err);
    });
}, 10000); // Ping every 10 seconds

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

// Home page route
app.get('/', (req, res) => {
    res.render('home');
});

app.post('/submit', async (req, res) => {
    const { drink, snack } = req.body;
    const preference = JSON.stringify({ drink, snack });

    console.log('Submitting Preference:', preference); // Add this line for debugging

    try {
        await client.rPush('preferences', preference);
        res.redirect('/');
    } catch (err) {
        console.error('Error storing preference:', err);
        res.status(500).send('Server Error');
    }
});


// Results page route
app.post('/give-count', async (req, res) => {
    try {
        const preferences = await client.lRange('preferences', 0, -1);

        const count = preferences.reduce((acc, pref) => {
            const parsedPref = JSON.parse(pref);
            acc.drinks[parsedPref.drink] = (acc.drinks[parsedPref.drink] || 0) + 1;
            acc.snacks[parsedPref.snack] = (acc.snacks[parsedPref.snack] || 0) + 1;
            return acc;
        }, { drinks: {}, snacks: {} });

        res.render('results', { count });
    } catch (err) {
        console.error('Error retrieving preferences:', err);
        res.status(500).send('Server Error');
    }
});

// Clear preferences route
app.post('/clear', async (req, res) => {
    try {
        await client.del('preferences');
        res.redirect('/');
    } catch (err) {
        console.error('Error clearing preferences:', err);
        res.status(500).send('Server Error');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

