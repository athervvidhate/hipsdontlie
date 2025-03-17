// popup.js
document.getElementById('popupButton').addEventListener('click', function() {
    document.getElementById('popup').classList.remove('hidden');
});

document.querySelector('.close').addEventListener('click', function() {
    document.getElementById('popup').classList.add('hidden');
});

window.addEventListener('click', function(event) {
    if (event.target == document.getElementById('popup')) {
        document.getElementById('popup').classList.add('hidden');
    }
});
