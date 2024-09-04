const express = require('express');
const bodyParser = require('body-parser');
const redis = require('redis');
const app = express();
const PORT = 3000;

// Redis client setup
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const client = redis.createClient({ url: redisUrl });

client.on('error', (err) => {
    console.error('Redis error:', err);
});

client.connect().catch(console.error);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');

app.get('/', async (req, res) => {
    try {
        const preferences = await getPreferences();
        const drinks = await client.sMembers('unique_drinks');
        const snacks = await client.sMembers('unique_snacks');
        res.render('home', { preferences, drinks, snacks, message: null });
    } catch (err) {
        console.error('Error fetching data:', err);
        res.render('home', { preferences: {}, drinks: [], snacks: [], message: 'Error fetching data' });
    }
});

app.post('/submit', async (req, res) => {
    let { drink, snack, drinkQuantity, snackQuantity, otherDrink, otherSnack } = req.body;
    try {
        if (drink === 'other' && otherDrink) drink = otherDrink;
        if (snack === 'other' && otherSnack) snack = otherSnack;

        if (drink) {
            await client.sAdd('unique_drinks', drink);
            await client.hIncrBy('preferences', `drink:${drink}`, parseInt(drinkQuantity) || 1);
        }
        if (snack) {
            await client.sAdd('unique_snacks', snack);
            await client.hIncrBy('preferences', `snack:${snack}`, parseInt(snackQuantity) || 1);
        }
        
        const preferences = await getPreferences();
        const drinks = await client.sMembers('unique_drinks');
        const snacks = await client.sMembers('unique_snacks');
        res.render('home', { preferences, drinks, snacks, message: 'Preference submitted successfully!' });
    } catch (err) {
        console.error('Error submitting preference:', err);
        res.render('home', { preferences: {}, drinks: [], snacks: [], message: 'Error submitting preference' });
    }
});

app.post('/decrement', async (req, res) => {
    const { item, type } = req.body;
    try {
        const key = `${type}:${item}`;
        await client.hIncrBy('preferences', key, -1);
        const count = await client.hGet('preferences', key);
        if (parseInt(count) <= 0) {
            await client.hDel('preferences', key);
        }
        res.json({ success: true });
    } catch (err) {
        console.error('Error decrementing item:', err);
        res.status(500).json({ success: false, error: 'Error decrementing item' });
    }
});

app.post('/reset', async (req, res) => {
    try {
        await client.del('preferences');
        res.json({ success: true });
    } catch (err) {
        console.error('Error resetting preferences:', err);
        res.status(500).json({ success: false, error: 'Error resetting preferences' });
    }
});

async function getPreferences() {
    const allPreferences = await client.hGetAll('preferences');
    const preferences = { drinks: {}, snacks: {} };
    for (const [key, value] of Object.entries(allPreferences)) {
        const [type, item] = key.split(':');
        preferences[type + 's'][item] = parseInt(value);
    }
    return preferences;
}

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
