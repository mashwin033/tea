const express = require('express');
const bodyParser = require('body-parser');
const redis = require('redis');
const crypto = require('crypto');
const app = express();
const PORT = 3000;

// Redis client setup
const redisUrl = process.env.REDIS_URL || 'redis://red-cqs8lhrqf0us738u48a0:6379';
const client = redis.createClient({ url: redisUrl });

client.on('error', (err) => {
    console.error('Redis error:', err);
});

client.on('connect', () => {
    console.log('Connected to Redis');
});

client.on('end', () => {
    console.error('Redis connection closed. Reconnecting...');
    client.connect().catch(console.error);
});

// Attempt to connect to Redis
(async () => {
    try {
        await client.connect();
    } catch (err) {
        console.error('Failed to connect to Redis:', err);
    }
})();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).send('Internal Server Error: ' + err.message);
});

// Routes
app.get('/', (req, res) => {
    res.render('home');
});

app.post('/submit', async (req, res, next) => {
    const { drink, snack } = req.body;
    console.log('Received submission:', { drink, snack });

    try {
        // Check Redis connection
        if (!client.isOpen) {
            throw new Error('Redis client is not connected');
        }

        if (drink) {
            await client.rPush('drinks', drink);
            console.log('Drink added:', drink);
        }
        if (snack) {
            await client.rPush('snacks', snack);
            console.log('Snack added:', snack);
        }

        const preference = JSON.stringify({ drink, snack });
        await client.rPush('preferences', preference);
        console.log('Preference added:', preference);

        const preferences = await client.lRange('preferences', 0, -1);
        console.log('Retrieved preferences:', preferences);

        const count = preferences.reduce((acc, pref) => {
            try {
                const parsedPref = JSON.parse(pref);
                if (parsedPref.drink) {
                    acc.drinks[parsedPref.drink] = (acc.drinks[parsedPref.drink] || 0) + 1;
                }
                if (parsedPref.snack) {
                    acc.snacks[parsedPref.snack] = (acc.snacks[parsedPref.snack] || 0) + 1;
                }
            } catch (parseError) {
                console.error('Error parsing preference:', pref, parseError);
            }
            return acc;
        }, { drinks: {}, snacks: {} });

        console.log('Calculated count:', count);

        res.render('results', { count });
    } catch (err) {
        console.error('Error in /submit route:', err);
        next(err);  // Pass error to error handling middleware
    }
});

// Test Redis connection
app.get('/test-redis', async (req, res) => {
    try {
        await client.set('test', 'value');
        const value = await client.get('test');
        res.send(`Redis test successful. Value: ${value}`);
    } catch (err) {
        res.status(500).send(`Redis test failed: ${err.message}`);
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
