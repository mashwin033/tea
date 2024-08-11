const express = require('express');
const bodyParser = require('body-parser');
const redis = require('redis');
const crypto = require('crypto');

const app = express();
const PORT = 3000;

// Get Redis URL from environment variables
const redisUrl = 'redis://red-cqs8lhrqf0us738u48a0:6379';

const client = redis.createClient({ url: redisUrl });

client.on('error', (err) => {
    console.error('Redis error:', err);
});

// Connect to Redis
client.connect().catch(console.error);

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

app.use(bodyParser.json()); // Add this line to handle JSON bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

// Function to generate a unique ID using crypto
const generateUniqueId = () => crypto.randomBytes(16).toString('hex');

// Home page route
app.get('/', (req, res) => {
    res.render('home');
});

// Submit preferences route
app.post('/submit', async (req, res) => {
    const { drink, snack } = req.body;

    try {
        if (drink) {
            await client.rPush('drinks', drink);
        }

        if (snack) {
            await client.rPush('snacks', snack);
        }

        const preferenceId = generateUniqueId();
        const preference = JSON.stringify({ id: preferenceId, drink, snack });

        console.log('Submitting Preference:', preference);

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
            if (parsedPref.drink) {
                acc.drinks[parsedPref.drink] = (acc.drinks[parsedPref.drink] || 0) + 1;
            }
            if (parsedPref.snack) {
                acc.snacks[parsedPref.snack] = (acc.snacks[parsedPref.snack] || 0) + 1;
            }
            return acc;
        }, { drinks: {}, snacks: {} });

        // Send the count data as JSON
        res.json(count);
    } catch (err) {
        console.error('Error retrieving preferences:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});




// Reduce count route
app.post('/reduce-count', async (req, res) => {
    const { id, type } = req.body;

    if (!id || !type) {
        return res.status(400).json({ error: 'Invalid request' }); // Return JSON error message
    }

    try {
        const preferences = await client.lRange('preferences', 0, -1);
        let updated = false;

        for (let i = 0; i < preferences.length; i++) {
            let pref = JSON.parse(preferences[i]);

            if (pref[type] === id) {
                // Remove the item if count is 1
                preferences.splice(i, 1);
                updated = true;
                break;
            }
        }

        if (updated) {
            await client.del('preferences');
            await client.rPush('preferences', ...preferences.map(p => JSON.stringify(p)));
            return res.json({ success: true });
        } else {
            return res.status(404).json({ error: 'Item not found' });
        }
    } catch (err) {
        console.error('Error reducing count:', err);
        res.status(500).json({ error: 'Server Error' });
    }
    res.status(200).send('Count reduced successfully');
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
