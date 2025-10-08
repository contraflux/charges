const scroll_menu = document.getElementById('scroll');
const scroll_bar = document.getElementById('scroll-bar');
const top_container = document.getElementById('top-container');

let offset = 0;

scroll_menu.addEventListener('wheel', (e) => {
    offset += e.deltaY / 2;

    offset = offset < 0 ? 0 : offset > 100 ? 100 : offset;

    top_container.style.marginTop = -offset + "px";
    scroll_bar.style.top = offset/2 + "px";
});