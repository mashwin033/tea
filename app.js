const express = require('express');
const bodyParser = require('body-parser');
const redis = require('redis');
const crypto = require('crypto'); // Using crypto instead of uuid

const app = express();
const PORT = 3000;

// Get Redis URL from environment variables
const redisUrl = process.env.REDIS_URL || 'redis://red-cqs8lhrqf0us738u48a0:6379';

const client = redis.createClient({ url: redisUrl });

client.on('error', (err) => {
    console.error('Redis error:', err);
});

client.connect().catch(console.error);

client.on('end', () => {
    console.error('Redis connection closed. Reconnecting...');
    client.connect().catch(console.error);
});

setInterval(() => {
    client.ping().then(result => {
        console.log('Redis ping response:', result);
    }).catch(err => {
        console.error('Redis ping error:', err);
    });
}, 10000);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    res.render('home');
});

app.post('/submit', async (req, res) => {
    const { drink, snack } = req.body;

    if (drink) {
        await client.rPush('drinks', drink);
    }

    if (snack) {
        await client.rPush('snacks', snack);
    }

    const preference = JSON.stringify({ drink, snack });

    try {
        await client.rPush('preferences', preference);
        const preferences = await client.lRange('preferences', 0, -1);

        const count = preferences.reduce((acc, pref) => {
            const parsedPref = JSON.parse(pref);
            if (parsedPref.drink) {
                acc.drinks[parsedPref.drink] = (acc.drinks[parsedPref.drink] || 0) + 1;
            }
            if (parsedPref.snack) {
                acc.snacks[parsedPref.snack] = (acc.snacks[parsedPref.snack] || 0) + 1;
            }
            return acc;
        }, { drinks: {}, snacks: {} });

        res.render('results', { count });
    } catch (err) {
        console.error('Error storing or retrieving preferences:', err);
        res.status(500).send('Server Error');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
