import gsap from "https://cdn.skypack.dev/gsap";
// import gsap from "gsap";

document.addEventListener("DOMContentLoaded", () => {
    // --- Header height handling (for anchor offset) ---
    function updateHeaderHeight() {
        const nav = document.querySelector('nav');
        const h = nav ? Math.ceil(nav.getBoundingClientRect().height) : 0;
        document.documentElement.style.setProperty('--header-height', `${h}px`);
    }
    // run on load and resize
    updateHeaderHeight();
    window.addEventListener('resize', updateHeaderHeight);

    // --- elements ---
    const containers = document.querySelectorAll("section"); // animate all sections now
    const menuToggle = document.querySelector(".menu-toggle");
    const menuOverlay = document.querySelector(".menu-overlay");
    const menuContent = document.querySelector(".menu-content");
    const menuPreviewImg = document.querySelector(".menu-preview-img");
    const menuLinks = document.querySelectorAll(".link a");

    let isOpen = false;
    let isAnimating = false;

    gsap.fromTo(
        ".loading-page",
        { opacity: 1 },
        {
            opacity: 0,
            display: "none",
            duration: 1.5,
            delay: 3.5,
        }
    );
    gsap.fromTo(
        ".logo-name",
        {
            y: 50,
            opacity: 0,
        },
        {
            y: 0,
            opacity: 1,
            duration: 2,
            delay: 0.5,
        }
    );

    menuToggle.addEventListener("click", () => {
        if (!isOpen) openMenu();
        else closeMenu();
    });

    // safer cleanup: remove oldest images until we have at most 3
    function cleanupPreviewImages() {
        let previewImages = menuPreviewImg.querySelectorAll("img");
        while (previewImages.length > 3) {
            // remove first child (oldest)
            menuPreviewImg.removeChild(previewImages[0]);
            previewImages = menuPreviewImg.querySelectorAll("img");
        }
    }

    function resetPreviewImages() {
        menuPreviewImg.innerHTML = "";
        const defaultPreviewImg = document.createElement("img");
        defaultPreviewImg.src = "assets/menu-img-1.jpg";
        menuPreviewImg.appendChild(defaultPreviewImg);
    }

    function animateMenuToggle(isOpening) {
        const open = document.querySelector("p#menu-open");
        const close = document.querySelector("p#menu-close");

        gsap.to(isOpening ? open : close, {
            x: isOpening ? -5 : 5,
            y: isOpening ? -10 : 10,
            rotation: isOpening ? -5 : 5,
            opacity: 0,
            delay: 0.25,
            duration: 0.5,
            ease: "power2.out",
        });

        gsap.to(isOpening ? close : open, {
            x: 0,
            y: 0,
            rotation: 0,
            opacity: 1,
            delay: 0.5,
            duration: 0.5,
            ease: "power2.out",
        });
    }

    function openMenu() {
        if (isAnimating || isOpen) return;
        isAnimating = true;

        // animate all sections (previously only the hero)
        gsap.to(containers, {
            rotation: 10,
            x: 300,
            y: 450,
            scale: 1.5,
            duration: 1.25,
            ease: "power4.inOut",
        });

        animateMenuToggle(true);

        gsap.to(menuContent, {
            rotation: 0,
            x: 0,
            y: 0,
            scale: 1,
            opacity: 1,
            duration: 1.25,
            ease: "power4.inOut",
        });

        gsap.to([".link a", ".social a"], {
            y: "0%",
            opacity: 1,
            duration: 1,
            delay: 0.75,
            stagger: 0.1,
            ease: "power3.out",
        });

        gsap.to(menuOverlay, {
            clipPath: "polygon(0% 0%, 100% 0%, 100% 175%, 0% 100%)",
            duration: 1.25,
            ease: "power4.inOut",
            onComplete: () => {
                isOpen = true;
                isAnimating = false;
            },
        });
    }

    // closeMenu accepts optional callback to run after menu finishes closing
    function closeMenu(callback) {
        if (isAnimating || !isOpen) {
            // if already closed and callback provided, still call it
            if (!isOpen && typeof callback === 'function') callback();
            return;
        }
        isAnimating = true;

        gsap.to(containers, {
            rotation: 0,
            x: 0,
            y: 0,
            scale: 1,
            duration: 1.25,
            ease: "power4.inOut",
        });

        animateMenuToggle(false);

        gsap.to(menuContent, {
            rotation: -15,
            x: -100,
            y: -100,
            scale: 1.5,
            opacity: 0.25,
            duration: 1.25,
            ease: "power4.inOut",
        });

        gsap.to(menuOverlay, {
            clipPath: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)",
            duration: 1.25,
            ease: "power4.inOut",
            onComplete: () => {
                isOpen = false;
                isAnimating = false;
                gsap.to([".link a", ".social a"], { y: "120%" });
                resetPreviewImages();
                if (typeof callback === 'function') callback();
            },
        });
    }

    // helper: scroll to a hash target while accounting for header height
    function scrollToHash(hash) {
        if (!hash || hash === '#') return;
        const target = document.querySelector(hash);
        if (!target) return;
        const nav = document.querySelector('nav');
        const headerH = nav ? nav.getBoundingClientRect().height : 0;
        const targetTop = target.getBoundingClientRect().top + window.pageYOffset;
        const scrollTo = Math.max(0, targetTop - headerH);
        window.scrollTo({ top: scrollTo, behavior: 'smooth' });
        history.replaceState(null, '', hash);
    }

    menuLinks.forEach((link) => {
        link.addEventListener("mouseover", () => {
            if (!isOpen || isAnimating) return;

            const imgSrc = link.getAttribute("data-img");
            if (!imgSrc) return;

            const previewImages = menuPreviewImg.querySelectorAll("img");
            if (
                previewImages.length > 0 &&
                previewImages[previewImages.length - 1].src.endsWith(imgSrc)
            )
                return;

            const newPreviewImg = document.createElement("img");
            newPreviewImg.src = imgSrc;
            newPreviewImg.style.opacity = "0";
            newPreviewImg.style.transform = "scale(1.25) rotate(10deg)";

            menuPreviewImg.appendChild(newPreviewImg);
            cleanupPreviewImages();

            gsap.to(newPreviewImg, {
                opacity: 1,
                scale: 1,
                rotation: 0,
                duration: 0.75,
                ease: "power2.out",
            });
        });

        // On click: close the menu first, then scroll to target
        link.addEventListener("click", (e) => {
            const href = link.getAttribute('href') || '';
            if (href.startsWith('#')) {
                e.preventDefault();
                // close menu, then scroll
                closeMenu(() => {
                    // tiny delay to ensure the menu overlay is gone visually
                    // but the callback already runs onComplete, so this is optional
                    setTimeout(() => scrollToHash(href), 30);
                });
            } else {
                // if external or not a hash, just close
                closeMenu();
            }
        });
    });
});
