import gsap from "https://cdn.skypack.dev/gsap";
// import gsap from "gsap";

document.addEventListener("DOMContentLoaded", () => {
    // --- Header height handling (for anchor offset) ---
    function updateHeaderHeight() {
        const nav = document.querySelector("nav");
        const h = nav ? Math.ceil(nav.getBoundingClientRect().height) : 0;
        document.documentElement.style.setProperty("--header-height", `${h}px`);
    }
    updateHeaderHeight();
    window.addEventListener("resize", updateHeaderHeight);

    // --- elements ---
    const containers = document.querySelectorAll("section");
    const menuToggle = document.querySelector(".menu-toggle");
    const menuOverlay = document.querySelector(".menu-overlay");
    const menuContent = document.querySelector(".menu-content");
    const menuPreviewImg = document.querySelector(".menu-preview-img");
    const menuLinks = document.querySelectorAll(".menu-links a");

    let isOpen = false;
    let isAnimating = false;

    // small entrance animations
    gsap.fromTo(
        ".loading-page",
        { opacity: 1 },
        { opacity: 0, display: "none", duration: 1.5, delay: 3.5 }
    );
    gsap.fromTo(
        ".logo-name",
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 2, delay: 0.5 }
    );

    menuToggle.addEventListener("click", () => {
        if (!isOpen) openMenu();
        else closeMenu();
    });

    // --- menu preview helpers ---
    function cleanupImages(targetContainer) {
        // limit to at most 3 images inside the container
        let imgs = targetContainer.querySelectorAll("img");
        while (imgs.length > 3) {
            targetContainer.removeChild(imgs[0]);
            imgs = targetContainer.querySelectorAll("img");
        }
    }

    function resetPreviewImages() {
        if (!menuPreviewImg) return;
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

    function closeMenu(callback) {
        if (isAnimating || !isOpen) {
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

    function scrollToHash(hash) {
        if (!hash || hash === "#") return;
        const target = document.querySelector(hash);
        if (!target) return;
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        history.replaceState(null, "", hash);
    }

    // --- menu links: preview on hover (existing behaviour) ---
    if (menuLinks && menuPreviewImg) {
        menuLinks.forEach((link) => {
            link.addEventListener("mouseover", () => {
                if (!isOpen || isAnimating) return;

                const imgSrc = link.getAttribute("data-img");
                if (!imgSrc) return;

                const previewImages = menuPreviewImg.querySelectorAll("img");
                // avoid duplicate same-src push (compare path ending)
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
                cleanupImages(menuPreviewImg);

                gsap.to(newPreviewImg, {
                    opacity: 1,
                    scale: 1,
                    rotation: 0,
                    duration: 0.75,
                    ease: "power2.out",
                });
            });

            link.addEventListener("click", (e) => {
                const href = link.getAttribute("href") || "";
                if (href.startsWith("#")) {
                    e.preventDefault();
                    closeMenu(() => {
                        setTimeout(() => scrollToHash(href), 20);
                    });
                } else {
                    closeMenu();
                }
            });
        });
    }

    // --- about links: show preview in the about-preview-img area (same animation) ---
    const aboutPreviewImg = document.querySelector(".about-preview-img");
    const aboutLinks = document.querySelectorAll(".about-links a");
    if (aboutPreviewImg && aboutLinks && aboutLinks.length) {
        aboutLinks.forEach((link) => {
            link.addEventListener("mouseover", () => {
                const imgSrc = link.getAttribute("data-img");
                if (!imgSrc) return;

                const aboutImages = aboutPreviewImg.querySelectorAll("img");
                if (
                    aboutImages.length > 0 &&
                    aboutImages[aboutImages.length - 1].src.endsWith(imgSrc)
                )
                    return;

                const newAboutImg = document.createElement("img");
                newAboutImg.src = imgSrc;
                newAboutImg.style.opacity = "0";
                newAboutImg.style.transform = "scale(1.25) rotate(10deg)";
                newAboutImg.style.position = "absolute";
                aboutPreviewImg.appendChild(newAboutImg);
                cleanupImages(aboutPreviewImg);

                gsap.to(newAboutImg, {
                    opacity: 1,
                    scale: 1,
                    rotation: 0,
                    duration: 0.75,
                    ease: "power2.out",
                });
            });
        });
    }

    // --- gallery section loader + thumb hover animation ---
    (async function () {
        const CATS = document.querySelector(".gallery-cats");
        const GRID = document.querySelector(".gallery-grid");
        const EMPTY = document.querySelector(".gallery-empty");
        const LIGHTBOX = document.querySelector(".glightbox");
        if (!CATS || !GRID || !EMPTY || !LIGHTBOX) return;

        const LB_IMG = LIGHTBOX.querySelector(".gb-img");
        const LB_CAP = LIGHTBOX.querySelector(".gb-caption");
        const BTN_CLOSE = LIGHTBOX.querySelector(".gb-close");
        const BTN_NEXT = LIGHTBOX.querySelector(".gb-next");
        const BTN_PREV = LIGHTBOX.querySelector(".gb-prev");

        let collections = [];
        let activeCollection = null;
        let activeIndex = 0;

        try {
            const res = await fetch("/galleries/galleries.json", {
                cache: "no-cache",
            });
            collections = await res.json();
        } catch (e) {
            EMPTY.textContent = "Failed to load galleries.json";
            return;
        }

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
            if (collections.length) selectCat(0);
        }

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

                // click -> open lightbox
                a.addEventListener("click", () => openLightbox(i));

                // hover animation on thumb's img (match menu preview vibe)
                const imgEl = a.querySelector("img");
                if (imgEl) {
                    imgEl.style.transformOrigin = "center center";
                    imgEl.style.transition =
                        "transform 0.6s cubic-bezier(0.2,0.9,0.3,1), opacity 0.5s";

                    a.addEventListener("mouseenter", () => {
                        // animate into focus
                        gsap.fromTo(
                            imgEl,
                            { scale: 1.15, rotation: 8, opacity: 0.92 },
                            {
                                scale: 1,
                                rotation: 0,
                                opacity: 1,
                                duration: 0.6,
                                ease: "power2.out",
                            }
                        );
                    });
                }

                GRID.appendChild(a);
            });
        }

        function openLightbox(idx) {
            activeIndex = idx;
            const imgObj = activeCollection.images[activeIndex];
            LB_IMG.src = imgObj.src;
            LB_IMG.alt = imgObj.caption || imgObj.name;
            LB_CAP.textContent = imgObj.caption || imgObj.name || "";
            LIGHTBOX.setAttribute("aria-hidden", "false");
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
});
