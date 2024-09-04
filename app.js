const express = require('express');
const bodyParser = require('body-parser');
const redis = require('redis');
const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const client = redis.createClient({ url: redisUrl });

(async () => {
    await client.connect();
})();

client.on('error', (err) => console.log('Redis Client Error', err));

const drinks = ['Select', 'Tea', 'Coffee', 'Black Tea', 'Black Coffee', 'Lime Tea', 'Boost', 'Horlicks', 'Other'];
const snacks = ['Select', 'Cutlet', 'Puffs', 'Ela Ada', 'Bread Pouch', 'Other'];

app.get('/', async (req, res) => {
    try {
        const orders = await getOrdersFromCache();
        res.render('home', { orders, drinks, snacks });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).send('Error fetching orders');
    }
});

app.post('/submit', async (req, res) => {
    const { drinkChoice, drinkOther, drinkQuantity, snackChoice, snackOther, snackQuantity } = req.body;

    try {
        let orders = await getOrdersFromCache();

        // Initialize drinks and snacks objects if not present
        if (!orders.drinks) orders.drinks = {};
        if (!orders.snacks) orders.snacks = {};

        if (drinkChoice !== 'Select') {
            const drinkName = drinkChoice === 'Other' ? drinkOther : drinkChoice;
            orders.drinks[drinkName] = (orders.drinks[drinkName] || 0) + parseInt(drinkQuantity || 0);
        }

        if (snackChoice !== 'Select') {
            const snackName = snackChoice === 'Other' ? snackOther : snackChoice;
            orders.snacks[snackName] = (orders.snacks[snackName] || 0) + parseInt(snackQuantity || 0);
        }

        await saveOrdersToCache(orders);
        res.redirect('/');
    } catch (error) {
        console.error('Error saving order:', error);
        res.status(500).send('Error saving order');
    }
});


app.post('/update/:type/:item', async (req, res) => {
    const { type, item } = req.params;
    const { action } = req.body;
    try {
        const orders = await getOrdersFromCache();
        if (orders[type][item]) {
            if (action === 'increment') {
                orders[type][item]++;
            } else if (action === 'decrement' && orders[type][item] > 0) {
                orders[type][item]--;
            }
            if (orders[type][item] === 0) {
                delete orders[type][item];
            }
            await saveOrdersToCache(orders);
        }
        res.redirect('/');
    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).send('Error updating order');
    }
});

app.post('/reset', async (req, res) => {
    try {
        await saveOrdersToCache({ drinks: {}, snacks: {} });
        res.redirect('/');
    } catch (error) {
        console.error('Error resetting orders:', error);
        res.status(500).send('Error resetting orders');
    }
});

async function getOrdersFromCache() {
    const cachedOrders = await client.get('orders');
    const orders = cachedOrders ? JSON.parse(cachedOrders) : { drinks: {}, snacks: {} };
    
    // Ensure orders object has drinks and snacks initialized
    if (!orders.drinks) orders.drinks = {};
    if (!orders.snacks) orders.snacks = {};
    
    return orders;
}

async function saveOrdersToCache(orders) {
    await client.set('orders', JSON.stringify(orders));
}

app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});
