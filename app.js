const express = require('express');
const bodyParser = require('body-parser');
const redis = require('redis');
const { v4: uuidv4 } = require('uuid'); // Import uuid to generate unique identifiers

const app = express();
const PORT = 3000;

const redisUrl = 'redis://red-cqs8lhrqf0us738u48a0:6379';
const client = redis.createClient({ url: redisUrl });

client.on('error', (err) => {
    console.error('Redis error:', err);
});

client.connect().catch(console.error);

client.on('error', (err) => {
    console.error('Redis error:', err);
});

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

// Home page route
app.get('/', (req, res) => {
    res.render('home');
});

// Submit preferences route
app.post('/submit', async (req, res) => {
    const { drink, snack } = req.body;
    const id = uuidv4(); // Generate a unique identifier for each preference

    if (drink || snack) {
        const preference = JSON.stringify({ id, drink, snack });

        try {
            await client.rPush('preferences', preference);
            res.redirect('/');
        } catch (err) {
            console.error('Error storing preference:', err);
            res.status(500).send('Server Error');
        }
    } else {
        res.redirect('/');
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

        res.render('results', { count });
    } catch (err) {
        console.error('Error retrieving preferences:', err);
        res.status(500).send('Server Error');
    }
});

// Reduce count route
app.post('/reduce-count', async (req, res) => {
    const { id } = req.body;

    try {
        const preferences = await client.lRange('preferences', 0, -1);

        // Filter out the item with the specified ID
        const updatedPreferences = preferences.filter(pref => {
            const parsedPref = JSON.parse(pref);
            return parsedPref.id !== id;
        });

        await client.del('preferences');

        if (updatedPreferences.length > 0) {
            await client.rPush('preferences', ...updatedPreferences);
        }

        // Recalculate counts
        const count = updatedPreferences.reduce((acc, pref) => {
            const parsedPref = JSON.parse(pref);
            if (parsedPref.drink) {
                acc.drinks[parsedPref.drink] = (acc.drinks[parsedPref.drink] || 0) + 1;
            }
            if (parsedPref.snack) {
                acc.snacks[parsedPref.snack] = (acc.snacks[parsedPref.snack] || 0) + 1;
            }
            return acc;
        }, { drinks: {}, snacks: {} });

        res.json(count);
    } catch (err) {
        console.error('Error reducing count:', err);
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
