document.getElementById('giveCountButton').addEventListener('click', function() {
    fetch('/give-count-json', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        // Update the resultsContainer with the fetched data
        const resultsContainer = document.getElementById('resultsContainer');
        resultsContainer.innerHTML = '';

        // Display drinks count
        const drinksList = document.createElement('ul');
        drinksList.innerHTML = '<h2>Drinks</h2>';
        for (const [drink, count] of Object.entries(data.drinks)) {
            const listItem = document.createElement('li');
            listItem.innerHTML = `${drink}: ${count}`;
            drinksList.appendChild(listItem);
        }
        resultsContainer.appendChild(drinksList);

        // Display snacks count
        const snacksList = document.createElement('ul');
        snacksList.innerHTML = '<h2>Snacks</h2>';
        for (const [snack, count] of Object.entries(data.snacks)) {
            const listItem = document.createElement('li');
            listItem.innerHTML = `${snack}: ${count}`;
            snacksList.appendChild(listItem);
        }
        resultsContainer.appendChild(snacksList);
    })
    .catch(error => {
        console.error('Error fetching count:', error);
    });
});
