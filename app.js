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
            drink = otherDrink.trim().toLowerCase();
        }
        if (snack === 'other' && otherSnack) {
            snack = otherSnack.trim().toLowerCase();
        }

        if (drink) {
            console.log(`Adding drink: "${drink}"`);
            await client.rPush('drinks', drink);
            await client.sAdd('unique_drinks', drink);
        }
        if (snack) {
            console.log(`Adding snack: "${snack}"`);
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

app.post('/decrement', async (req, res) => {
    const { type, item } = req.body;
    const normalizedItem = item.trim().toLowerCase();
    const listKey = type === 'drink' ? 'drinks' : 'snacks';
    const uniqueKey = type === 'drink' ? 'unique_drinks' : 'unique_snacks';

    console.log(`Attempting to decrement ${type}: ${normalizedItem}`);

    try {
        // Find the index of the item to decrement
        const index = await client.lPos(listKey, normalizedItem);
        console.log(`Index found: ${index}`);

        if (index !== null) {
            // Remove the first occurrence of the item
            const removed = await client.lRem(listKey, 1, normalizedItem);
            console.log(`Item removed: ${removed} time(s)`);

            // Check if the item should be removed from the unique set
            const remaining = await client.lRange(listKey, 0, -1);
            console.log(`Remaining items in ${listKey}:`, remaining);

            if (!remaining.includes(normalizedItem)) {
                const removedFromSet = await client.sRem(uniqueKey, normalizedItem);
                console.log(`Item removed from ${uniqueKey}: ${removedFromSet}`);
            }
        } else {
            console.log(`Item ${normalizedItem} not found in ${listKey}`);
        }

        res.redirect('/');
    } catch (err) {
        console.error('Error decrementing preference:', err);
        res.render('home', { count: null, drinks: [], snacks: [], message: 'Error decrementing preference' });
    }
});

app.post('/reset', async (req, res) => {
    try {
        console.log('Resetting preferences...');

        // Clear lists and sets
        await client.del('preferences');
        await client.del('drinks');
        await client.del('snacks');
        await client.del('unique_drinks');
        await client.del('unique_snacks');

        const count = await getPreferenceCounts();
        const drinks = await client.sMembers('unique_drinks');
        const snacks = await client.sMembers('unique_snacks');
        res.render('home', { count, drinks, snacks, message: 'Preferences reset successfully!' });
    } catch (err) {
        console.error('Error resetting preferences:', err);
        res.render('home', { count: null, drinks: [], snacks: [], message: 'Error resetting preferences' });
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
