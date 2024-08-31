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

client.connect().catch(console.error);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

app.get('/', async (req, res) => {
    try {
        const count = await getPreferenceCounts();
        const drinks = await client.sMembers('unique_drinks');
        const snacks = await client.sMembers('unique_snacks');
        res.render('home', { count, drinks, snacks, message: null });
    } catch (err) {
        console.error('Error fetching data:', err);
        res.render('home', { count: null, drinks: [], snacks: [], message: 'Error fetching data' });
    }
});

app.post('/submit', async (req, res) => {
    let { drink, snack, otherDrink, otherSnack } = req.body;
    try {
        if (drink === 'other' && otherDrink) {
            drink = otherDrink;
        }
        if (snack === 'other' && otherSnack) {
            snack = otherSnack;
        }

        if (drink) {
            await client.rPush('drinks', drink);
            await client.sAdd('unique_drinks', drink);
        }
        if (snack) {
            await client.rPush('snacks', snack);
            await client.sAdd('unique_snacks', snack);
        }
        
        const preference = JSON.stringify({ drink, snack });
        await client.rPush('preferences', preference);
        
        const count = await getPreferenceCounts();
        const drinks = await client.sMembers('unique_drinks');
        const snacks = await client.sMembers('unique_snacks');
        res.render('home', { count, drinks, snacks, message: 'Preference submitted successfully!' });
    } catch (err) {
        console.error('Error submitting preference:', err);
        res.render('home', { count: null, drinks: [], snacks: [], message: 'Error submitting preference' });
    }
});

app.post('/reset', async (req, res) => {
    try {
        // Reset all lists and sets related to drinks and snacks
        await client.del('drinks', 'snacks', 'preferences', 'unique_drinks', 'unique_snacks');
        res.redirect('/');
    } catch (err) {
        console.error('Error resetting preferences:', err);
        res.render('home', { count: null, drinks: [], snacks: [], message: 'Error resetting preferences' });
    }
});

app.post('/decrement', async (req, res) => {
    const { type, item } = req.body;
    const listKey = type === 'drink' ? 'drinks' : 'snacks';
    const uniqueKey = type === 'drink' ? 'unique_drinks' : 'unique_snacks';

    try {
        // Decrement the item count by removing one occurrence from the list
        const index = await client.lPos(listKey, item);
        if (index !== null) {
            await client.lRem(listKey, 1, item);

            // Check if the item should be removed from the unique set
            const remaining = await client.lRange(listKey, 0, -1);
            if (!remaining.includes(item)) {
                await client.sRem(uniqueKey, item);
            }
        }
        res.redirect('/');
    } catch (err) {
        console.error('Error decrementing preference:', err);
        res.render('home', { count: null, drinks: [], snacks: [], message: 'Error decrementing preference' });
    }
});

async function getPreferenceCounts() {
    const preferences = await client.lRange('preferences', 0, -1);
    return preferences.reduce((acc, pref) => {
        const { drink, snack } = JSON.parse(pref);
        if (drink) acc.drinks[drink] = (acc.drinks[drink] || 0) + 1;
        if (snack) acc.snacks[snack] = (acc.snacks[snack] || 0) + 1;
        return acc;
    }, { drinks: {}, snacks: {} });
}


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
