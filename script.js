import gsap from "https://cdn.skypack.dev/gsap";
// import gsap from "gsap";

document.addEventListener("DOMContentLoaded", () => {
    // --- Header height handling (for anchor offset) ---
    function updateHeaderHeight() {
        const nav = document.querySelector("nav");
        const h = nav ? Math.ceil(nav.getBoundingClientRect().height) : 0;
        document.documentElement.style.setProperty("--header-height", `${h}px`);
    }
    // run on load and resize
    updateHeaderHeight();
    window.addEventListener("resize", updateHeaderHeight);

    // --- elements ---
    const containers = document.querySelectorAll("section"); // animate all sections now
    const menuToggle = document.querySelector(".menu-toggle");
    const menuOverlay = document.querySelector(".menu-overlay");
    const menuContent = document.querySelector(".menu-content");
    const menuPreviewImg = document.querySelector(".menu-preview-img");
    const menuLinks = document.querySelectorAll(".menu-links a");

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
            if (!isOpen && typeof callback === "function") callback();
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
                if (typeof callback === "function") callback();
            },
        });
    }

    // helper: scroll to a hash target while accounting for header height
    function scrollToHash(hash) {
        if (!hash || hash === "#") return;
        const target = document.querySelector(hash);
        if (!target) return;
        // Let the browser handle offset via scroll-padding-top / scroll-margin-top
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        history.replaceState(null, "", hash);
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
            const href = link.getAttribute("href") || "";
            if (href.startsWith("#")) {
                e.preventDefault();
                // close menu, then scroll
                closeMenu(() => {
                    // tiny delay to ensure the menu overlay is gone visually
                    // but the callback already runs onComplete, so this is optional
                    setTimeout(() => scrollToHash(href), 20);
                });
            } else {
                // if external or not a hash, just close
                closeMenu();
            }
        });
    });

    // optional: reuse menu preview for about-links hover
    const aboutPreviewImg = document.querySelector(".about-preview-img");
    const aboutLinks = document.querySelector(".about-links a");
    aboutLinks.forEach((link) => {
        link.addEventListener("mouseover", () => {
            const imgSrc = link.getAttribute("data-img");
            if (!imgSrc) return;

            const aboutImages = aboutPreviewImg.querySelectorAll("img");
            if (
                aboutImages.length > 0 &&
                aboutImages[previewImages.length - 1].src.endsWith(imgSrc)
            )
                return;

            const newAboutImg = document.createElement("img");
            newAboutImg.src = imgSrc;
            newAboutImg.style.opacity = "0";
            newPreviewImg.style.transform = "scale(1.25) rotate(10deg)";

            aboutPreviewImg.appendChild(newAboutImg);
            // cleanupPreviewImages();

            gsap.to(newAboutImg, {
                opacity: 1,
                scale: 1,
                rotation: 0,
                duration: 0.75,
                ease: "power2.out",
            });
        });
    });

    // --- gallery section ---
    // Gallery loader + lightbox (expects /galleries/galleries.json)
    (async function () {
        const CATS = document.querySelector(".gallery-cats");
        const GRID = document.querySelector(".gallery-grid");
        const EMPTY = document.querySelector(".gallery-empty");
        const LIGHTBOX = document.querySelector(".glightbox");
        const LB_IMG = LIGHTBOX.querySelector(".gb-img");
        const LB_CAP = LIGHTBOX.querySelector(".gb-caption");
        const BTN_CLOSE = LIGHTBOX.querySelector(".gb-close");
        const BTN_NEXT = LIGHTBOX.querySelector(".gb-next");
        const BTN_PREV = LIGHTBOX.querySelector(".gb-prev");

        let collections = [];
        let activeCollection = null;
        let activeIndex = 0;

        // fetch galleries.json
        try {
            const res = await fetch("/galleries/galleries.json", {
                cache: "no-cache",
            });
            collections = await res.json();
        } catch (e) {
            EMPTY.textContent = "Failed to load galleries.json";
            return;
        }

        // build category buttons
        function buildCats() {
            CATS.innerHTML = "";
            collections.forEach((col, i) => {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.textContent = col.label || col.id;
                btn.dataset.index = i;
                btn.setAttribute("aria-selected", "false");
                btn.addEventListener("click", () => selectCat(i));
                CATS.appendChild(btn);
            });
            // auto-select first
            if (collections.length) selectCat(0);
        }

        // render thumbnails for collection index
        function selectCat(idx) {
            activeCollection = collections[idx];
            Array.from(CATS.children).forEach((b, i) =>
                b.setAttribute("aria-selected", i === idx ? "true" : "false")
            );
            GRID.innerHTML = "";
            if (!activeCollection || !activeCollection.images.length) {
                EMPTY.style.display = "block";
                return;
            } else {
                EMPTY.style.display = "none";
            }
            activeCollection.images.forEach((imgObj, i) => {
                const a = document.createElement("button");
                a.className = "gallery-thumb";
                a.type = "button";
                a.dataset.index = i;
                a.innerHTML = `<img src="${imgObj.thumb}" alt="${
                    imgObj.caption || imgObj.name
                }" loading="lazy" />`;
                a.addEventListener("click", () => openLightbox(i));
                GRID.appendChild(a);
            });
        }

        // open lightbox at index
        function openLightbox(idx) {
            activeIndex = idx;
            const imgObj = activeCollection.images[activeIndex];
            LB_IMG.src = imgObj.src;
            LB_IMG.alt = imgObj.caption || imgObj.name;
            LB_CAP.textContent = imgObj.caption || imgObj.name || "";
            LIGHTBOX.setAttribute("aria-hidden", "false");
            // preload neighbors
            preload(activeIndex + 1);
            preload(activeIndex - 1);
            document.body.style.overflow = "hidden";
        }

        function closeLightbox() {
            LIGHTBOX.setAttribute("aria-hidden", "true");
            LB_IMG.src = "";
            document.body.style.overflow = "";
        }

        function showNext(n = 1) {
            activeIndex =
                (activeIndex + n + activeCollection.images.length) %
                activeCollection.images.length;
            const img = activeCollection.images[activeIndex];
            LB_IMG.src = img.src;
            LB_IMG.alt = img.caption || img.name;
            LB_CAP.textContent = img.caption || img.name;
            preload(activeIndex + 1);
        }

        function preload(idx) {
            idx =
                (idx + activeCollection.images.length) %
                activeCollection.images.length;
            const p = new Image();
            p.src = activeCollection.images[idx].src;
        }

        // events
        BTN_CLOSE.addEventListener("click", closeLightbox);
        BTN_NEXT.addEventListener("click", () => showNext(1));
        BTN_PREV.addEventListener("click", () => showNext(-1));
        LIGHTBOX.addEventListener("click", (e) => {
            if (e.target === LIGHTBOX) closeLightbox();
        });
        document.addEventListener("keydown", (e) => {
            if (LIGHTBOX.getAttribute("aria-hidden") === "false") {
                if (e.key === "Escape") closeLightbox();
                if (e.key === "ArrowRight") showNext(1);
                if (e.key === "ArrowLeft") showNext(-1);
            }
        });

        buildCats();
    })();

    // --- gallery section finish ---
});
