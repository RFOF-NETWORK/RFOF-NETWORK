document.addEventListener('DOMContentLoaded', function() {
    // Holen der Elemente per ID
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');

    // Event Listener für den Klick auf das Hamburger-Icon
    hamburger.addEventListener('click', function() {
        // Schaltet die 'active'-Klasse für das Menü um
        navLinks.classList.toggle('active');
        // Schaltet die 'active'-Klasse für das Hamburger-Icon um (für Animation)
        hamburger.classList.toggle('active');
    });
});
