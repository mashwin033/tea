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
        const orders = await getOrdersFromCache();

        const newOrder = {};

        if (drinkChoice !== 'Select') {
            newOrder.drink = {
                name: drinkChoice === 'Other' ? drinkOther : drinkChoice,
                quantity: parseInt(drinkQuantity) || 0
            };
        }

        if (snackChoice !== 'Select') {
            newOrder.snack = {
                name: snackChoice === 'Other' ? snackOther : snackChoice,
                quantity: parseInt(snackQuantity) || 0
            };
        }

        if (Object.keys(newOrder).length > 0) {
            orders.push(newOrder);
            await saveOrdersToCache(orders);
        }

        res.redirect('/');
    } catch (error) {
        console.error('Error saving order:', error);
        res.status(500).send('Error saving order');
    }
});

app.post('/decrement/:index/:item', async (req, res) => {
    const { index, item } = req.params;
    try {
        const orders = await getOrdersFromCache();
        if (orders[index] && orders[index][item] && orders[index][item].quantity > 0) {
            orders[index][item].quantity--;
            if (orders[index][item].quantity === 0) {
                delete orders[index][item];
            }
            if (Object.keys(orders[index]).length === 0) {
                orders.splice(index, 1);
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
        await client.del('orders');
        res.redirect('/');
    } catch (error) {
        console.error('Error resetting orders:', error);
        res.status(500).send('Error resetting orders');
    }
});

async function getOrdersFromCache() {
    const cachedOrders = await client.get('orders');
    return cachedOrders ? JSON.parse(cachedOrders) : [];
}

async function saveOrdersToCache(orders) {
    await client.set('orders', JSON.stringify(orders));
}

app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});
