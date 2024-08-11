const express = require('express');
const bodyParser = require('body-parser');
const redis = require('redis');

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

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

// Home page route
app.get('/', (req, res) => {
    res.render('home');
});

app.post('/submit', async (req, res) => {
    const { drink, snack } = req.body;

    if (drink || snack) {
        const preference = {};

        if (drink) {
            preference.drink = drink;
        }

        if (snack) {
            preference.snack = snack;
        }

        try {
            await client.rPush('preferences', JSON.stringify(preference));
            res.redirect('/');
        } catch (err) {
            console.error('Error storing preference:', err);
            res.status(500).send('Server Error');
        }
    } else {
        res.redirect('/'); // If both drink and snack are empty, redirect without storing anything
    }
});

// Route to get the count of preferences
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

        res.json(count); // Send results as JSON
    } catch (err) {
        console.error('Error retrieving preferences:', err);
        res.status(500).send('Server Error');
    }
});

// Route to reduce the count of a drink or snack
app.post('/reduce-count', async (req, res) => {
    const { type, item } = req.body; // type could be 'drink' or 'snack', item is the specific value

    try {
        // Retrieve all preferences from Redis
        const preferences = await client.lRange('preferences', 0, -1);

        // If there are no preferences, return an empty count
        if (preferences.length === 0) {
            return res.json({ drinks: {}, snacks: {} });
        }

        // Filter out the item to be reduced
        const updatedPreferences = preferences.filter(pref => {
            const parsedPref = JSON.parse(pref);
            // Remove the item if it matches the type and value
            return !(parsedPref[type] === item);
        });

        // Clear the existing preferences from Redis
        await client.del('preferences');

        // Re-add the updated preferences to Redis
        if (updatedPreferences.length > 0) {
            await client.rPush('preferences', ...updatedPreferences);
        }

        // Calculate the updated counts
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

        // Respond with the updated counts
        res.json(count);
    } catch (err) {
        console.error('Error reducing count:', err);
        res.status(500).send('Server Error');
    }

console.log('Preferences before reduction:', preferences);
console.log('Filtering out item:', { type, item });
console.log('Updated preferences:', updatedPreferences);
});




// Route to clear all preferences
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
