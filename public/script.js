document.getElementById('countForm').addEventListener('click', function(event) {
    event.preventDefault(); // Prevent the default form submission

    fetch('/give-count', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        // Clear the results section before updating
        const resultsContainer = document.getElementById('results');
        resultsContainer.innerHTML = '';

        // Display the drink counts
        const drinkHeading = document.createElement('h2');
        drinkHeading.textContent = 'Drinks';
        resultsContainer.appendChild(drinkHeading);

        const drinkList = document.createElement('ul');
        for (const [drink, count] of Object.entries(data.drinks)) {
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                ${drink}: ${count}
                <form action="/reduce-count" method="POST" style="display: inline;">
                    <input type="hidden" name="item" value="${drink}">
                    <input type="hidden" name="type" value="drink">
                    <button type="submit" class="reduceBtn">-</button>
                </form>
            `;
            drinkList.appendChild(listItem);
        }
        resultsContainer.appendChild(drinkList);

        // Display the snack counts
        const snackHeading = document.createElement('h2');
        snackHeading.textContent = 'Snacks';
        resultsContainer.appendChild(snackHeading);

        const snackList = document.createElement('ul');
        for (const [snack, count] of Object.entries(data.snacks)) {
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                ${snack}: ${count}
                <form action="/reduce-count" method="POST" style="display: inline;">
                    <input type="hidden" name="item" value="${snack}">
                    <input type="hidden" name="type" value="snack">
                    <button type="submit" class="reduceBtn">-</button>
                </form>
            `;
            snackList.appendChild(listItem);
        }
        resultsContainer.appendChild(snackList);

        // Attach event listeners to the new reduce buttons
        attachReduceButtonListeners();
    })
    .catch(error => console.error('Error:', error));
});

function attachReduceButtonListeners() {
    const reduceButtons = document.querySelectorAll('.reduceBtn');
    reduceButtons.forEach(button => {
        button.addEventListener('click', function(event) {
            event.preventDefault();

            const form = event.target.closest('form');
            const formData = new FormData(form);

            fetch('/reduce-count', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                // Update the count display after reducing the count
                const item = formData.get('item');
                const type = formData.get('type');
                const count = data[type][item];

                if (count === undefined) {
                    form.closest('li').remove(); // Remove the list item if count is 0
                } else {
                    form.closest('li').firstChild.textContent = `${item}: ${count}`;
                }
            })
            .catch(error => console.error('Error:', error));
        });
    });
}

// Initial setup to attach listeners after page load
attachReduceButtonListeners();
