var buttons = document.querySelectorAll('.ekspanderbartPanel__hode');

buttons.forEach((el) => {
    el.onclick = function () {
        el.parentElement.classList.toggle('ekspanderbartPanel--apen');
        el.parentElement.classList.toggle('ekspanderbartPanel--lukket');
    };
});
