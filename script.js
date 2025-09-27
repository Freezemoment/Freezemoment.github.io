import gsap from "https://cdn.skypack.dev/gsap";
// import gsap from "gsap";

document.addEventListener("DOMContentLoaded", () => {
    /* helpers & DOM refs */
    const containers = document.querySelectorAll("section");
    const menuToggle = document.querySelector(".menu-toggle");
    const menuOverlay = document.querySelector(".menu-overlay");
    const menuContent = document.querySelector(".menu-content");
    const menuPreviewImg = document.querySelector(".menu-preview-img");
    const menuLinks = document.querySelectorAll(".menu-links a");

    // gallery refs
    const CATS = document.querySelector(".gallery-cats");
    const GRID = document.querySelector(".gallery-grid");

    let isOpen = false;
    let isAnimating = false;

    // ensure containers have header height CSS var (unchanged)
    function updateHeaderHeight() {
        const nav = document.querySelector("nav");
        const h = nav ? Math.ceil(nav.getBoundingClientRect().height) : 0;
        document.documentElement.style.setProperty("--header-height", `${h}px`);
    }
    updateHeaderHeight();
    window.addEventListener("resize", updateHeaderHeight);

    // small page intro animations (kept)
    gsap.fromTo(
        ".loading-page",
        { opacity: 1 },
        { opacity: 0, display: "none", duration: 1.2, delay: 2.5 }
    );
    gsap.fromTo(
        ".logo-name",
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.4, delay: 0.4 }
    );

    /* --------------------------
     Preview image manager
     -------------------------- */
    // z-index counter so newer previews sit on top
    let previewZ = 10;
    function ensureRelative(container) {
        if (!container) return;
        const cs = getComputedStyle(container);
        if (cs.position === "static") container.style.position = "relative";
    }

    // Create & show a preview image in a container. Will fade out/remove previous.
    function showPreviewImage(container, src, keep = 2) {
        if (!container || !src) return;
        ensureRelative(container);

        const existing = Array.from(container.querySelectorAll("img"));
        // avoid re-adding same-most-recent source
        if (
            existing.length &&
            existing[existing.length - 1].dataset.src === src
        )
            return;

        const img = document.createElement("img");
        img.dataset.src = src;
        img.src = src;
        // absolute-fill styles
        img.style.position = "absolute";
        img.style.inset = "0";
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "cover";
        img.style.opacity = "0";
        img.style.transform = "scale(1.12) rotate(8deg)";
        img.style.zIndex = String(++previewZ);
        img.draggable = false;

        container.appendChild(img);

        // animate in
        gsap.to(img, {
            opacity: 1,
            scale: 1,
            rotation: 0,
            duration: 0.7,
            ease: "power2.out",
        });

        // fade out & remove older images (keep last `keep`)
        const toRemove = Array.from(container.querySelectorAll("img")).slice(
            0,
            -keep
        );
        toRemove.forEach((old) => {
            gsap.to(old, {
                opacity: 0,
                duration: 0.45,
                ease: "power2.out",
                onComplete: () => {
                    try {
                        old.remove();
                    } catch (e) {}
                },
            });
        });
    }

    /* --------------------------
     Menu open/close (unchanged behaviour with safety)
     -------------------------- */
    function animateMenuToggle(isOpening) {
        const open = document.querySelector("p#menu-open");
        const close = document.querySelector("p#menu-close");
        if (!open || !close) return;
        gsap.to(isOpening ? open : close, {
            x: isOpening ? -5 : 5,
            y: isOpening ? -10 : 10,
            rotation: isOpening ? -5 : 5,
            opacity: 0,
            delay: 0.2,
            duration: 0.45,
        });
        gsap.to(isOpening ? close : open, {
            x: 0,
            y: 0,
            rotation: 0,
            opacity: 1,
            delay: 0.45,
            duration: 0.45,
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
            duration: 1.1,
            ease: "power4.inOut",
        });
        animateMenuToggle(true);
        gsap.to(menuContent, {
            rotation: 0,
            x: 0,
            y: 0,
            scale: 1,
            opacity: 1,
            duration: 1.1,
            ease: "power4.inOut",
        });
        gsap.to([".link a", ".social a"], {
            y: "0%",
            opacity: 1,
            duration: 1,
            delay: 0.6,
            stagger: 0.08,
            ease: "power3.out",
        });
        gsap.to(menuOverlay, {
            clipPath: "polygon(0% 0%, 100% 0%, 100% 175%, 0% 100%)",
            duration: 1.1,
            ease: "power4.inOut",
            onComplete: () => {
                isOpen = true;
                isAnimating = false;
            },
        });
    }

    function closeMenu(cb) {
        if (isAnimating || !isOpen) {
            if (!isOpen && typeof cb === "function") cb();
            return;
        }
        isAnimating = true;
        gsap.to(containers, {
            rotation: 0,
            x: 0,
            y: 0,
            scale: 1,
            duration: 1.1,
            ease: "power4.inOut",
        });
        animateMenuToggle(false);
        gsap.to(menuContent, {
            rotation: -15,
            x: -100,
            y: -100,
            scale: 1.5,
            opacity: 0.25,
            duration: 1.1,
            ease: "power4.inOut",
        });
        gsap.to(menuOverlay, {
            clipPath: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)",
            duration: 1.1,
            ease: "power4.inOut",
            onComplete: () => {
                isOpen = false;
                isAnimating = false;
                gsap.to([".link a", ".social a"], { y: "120%" });
                // reset menu preview to default single img
                if (menuPreviewImg) {
                    menuPreviewImg.innerHTML = "";
                    const d = document.createElement("img");
                    d.src = "assets/menu-img-1.jpg";
                    d.style.position = "absolute";
                    d.style.inset = "0";
                    d.style.objectFit = "cover";
                    menuPreviewImg.appendChild(d);
                }
                if (typeof cb === "function") cb();
            },
        });
    }

    if (menuToggle)
        menuToggle.addEventListener("click", () => {
            if (!isOpen) openMenu();
            else closeMenu();
        });

    // menu links preview (uses showPreviewImage)
    if (menuLinks && menuPreviewImg) {
        menuLinks.forEach((link) => {
            link.addEventListener("mouseover", () => {
                if (!isOpen || isAnimating) return;
                const imgSrc = link.getAttribute("data-img");
                if (!imgSrc) return;
                showPreviewImage(menuPreviewImg, imgSrc, 2);
            });
            link.addEventListener("click", (e) => {
                const href = link.getAttribute("href") || "";
                if (href.startsWith("#")) {
                    e.preventDefault();
                    closeMenu(() =>
                        setTimeout(() => {
                            const target = document.querySelector(href);
                            if (target)
                                target.scrollIntoView({
                                    behavior: "smooth",
                                    block: "start",
                                });
                        }, 20)
                    );
                } else closeMenu();
            });
        });
    }

    // about links preview (same feed)
    const aboutPreviewImg = document.querySelector(".about-preview-img");
    const aboutLinks = document.querySelectorAll(".about-links a");
    if (aboutPreviewImg) {
        // ensure current static about image is absolute and fits (safety)
        const existing = aboutPreviewImg.querySelector("img");
        if (existing) {
            existing.style.position = "absolute";
            existing.style.inset = "0";
            existing.style.width = "100%";
            existing.style.height = "100%";
            existing.style.objectFit = "cover";
        }
    }
    if (aboutLinks && aboutPreviewImg && aboutLinks.length) {
        aboutLinks.forEach((link) => {
            link.addEventListener("mouseover", () => {
                const imgSrc = link.getAttribute("data-img");
                if (!imgSrc) return;
                showPreviewImage(aboutPreviewImg, imgSrc, 1); // keep 1 for about
            });
            link.addEventListener("click", (e) => {
                const href = link.getAttribute("href") || "";
                if (href.startsWith("#")) {
                    e.preventDefault();
                    const target = document.querySelector(href);
                    if (target)
                        target.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                        });
                }
            });
        });
    }

    /* --------------------------
     Gallery: categories, smooth transitions, lazy reveal
     -------------------------- */
    let collections = [];
    let activeCollection = null;
    let activeIndex = 0;

    // tiny transparent placeholder to avoid empty-src requests
    const PLACEHOLDER =
        "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

    // IntersectionObserver for reveal + lazy load
    const io =
        "IntersectionObserver" in window
            ? new IntersectionObserver(
                  (entries) => {
                      entries.forEach((ent) => {
                          if (!ent.isIntersecting) return;
                          const img = ent.target;
                          const ds = img.dataset.src;
                          if (ds && img.src !== ds) img.src = ds;
                          // animate reveal
                          gsap.fromTo(
                              img,
                              { opacity: 0, scale: 1.06 },
                              {
                                  opacity: 1,
                                  scale: 1,
                                  duration: 0.7,
                                  ease: "power2.out",
                              }
                          );
                          io.unobserve(img);
                      });
                  },
                  {
                      root: null,
                      rootMargin: "0px 0px 200px 0px",
                      threshold: 0.02,
                  }
              )
            : null;

    // fetch galleries.json (same path as your project)
    async function loadCollections() {
        try {
            const res = await fetch("/galleries/galleries.json", {
                cache: "no-cache",
            });
            if (!res.ok) throw new Error("network");
            collections = await res.json();
        } catch (e) {
            console.error("Failed to load galleries.json", e);
            collections = [];
        }
    }

    function buildCats() {
        if (!CATS) return;
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

    // animate existing thumbnails out, then populate
    function selectCat(idx) {
        if (!GRID) return;
        activeCollection = collections[idx];
        Array.from(CATS.children).forEach((b, i) =>
            b.setAttribute("aria-selected", i === idx ? "true" : "false")
        );

        // if there are existing children animate them out first
        const oldThumbs = Array.from(GRID.children);
        if (oldThumbs.length) {
            gsap.to(oldThumbs, {
                opacity: 0,
                y: 20,
                stagger: 0.05,
                duration: 0.7,
                ease: "power2.in",
                onComplete: () => {
                    GRID.innerHTML = "";
                    renderCollection(activeCollection);
                },
            });
        } else {
            renderCollection(activeCollection);
        }
    }

    function renderCollection(col) {
        if (!GRID) return;
        GRID.innerHTML = "";
        if (!col || !col.images || !col.images.length) {
            return;
        }

        // create nodes (images are lazy via data-src)
        col.images.forEach((imgObj, i) => {
            // Determine full image URL (try common fields)
            const full =
                imgObj.src ||
                imgObj.full ||
                imgObj.original ||
                imgObj.large ||
                imgObj.image ||
                imgObj.url ||
                imgObj.thumb; // fallback to thumb if no full provided

            // Create anchor that Fancybox will use
            const a = document.createElement("a");
            a.href = full;
            // give each gallery a unique group name
            const groupName = `gallery-${
                col.id || col.label || ((colIndex) => colIndex)(i)
            }`;
            a.setAttribute("data-fancybox", groupName);
            if (imgObj.caption) a.setAttribute("data-caption", imgObj.caption);
            a.className = "gallery-thumb";
            a.style.display = "inline-block";
            a.style.textDecoration = "none";

            // create the img element (lazy via data-src)
            const img = document.createElement("img");
            img.src = PLACEHOLDER;
            img.dataset.src =
                imgObj.thumb || imgObj.thumbUrl || imgObj.tn || full;
            img.alt = imgObj.caption || imgObj.name || "";
            img.loading = "lazy";
            img.draggable = false;
            // initial hidden state for reveal animation
            img.style.opacity = "0";
            img.style.transform = "scale(1.06)";
            img.style.transformOrigin = "center center";

            a.appendChild(img);
            GRID.appendChild(a);

            // observe the img for reveal + setup hover handlers
            if (io) io.observe(img);

            // pointerenter/pointerleave is more consistent across touch/pointer devices
            a.addEventListener("pointerenter", () => {
                gsap.to(img, {
                    scale: 1.05,
                    rotation: 0,
                    duration: 0.6,
                    ease: "power2.out",
                });
            });
            a.addEventListener("pointerleave", () => {
                gsap.to(img, {
                    scale: 1,
                    rotation: 0,
                    duration: 0.6,
                    ease: "power2.out",
                });
            });
        });

        // staggered entrance for the grid container items (subtle)
        const thumbs = Array.from(GRID.children);
        gsap.fromTo(
            thumbs,
            { opacity: 0, y: 18 },
            {
                opacity: 1,
                y: 0,
                stagger: 0.05,
                duration: 1,
                ease: "power2.out",
            }
        );
    }

    // initial load
    (async () => {
        await loadCollections();
        if (CATS) buildCats();
    })();

    // form submission.
    document
        .querySelector(".contact-form")
        .addEventListener("submit", function (e) {
            e.preventDefault(); // stop default submission
            const form = this;

            fetch(form.action, {
                method: form.method,
                body: new FormData(form),
                headers: { Accept: "application/json" },
            })
                .then((response) => {
                    if (response.ok) {
                        alert("Thanks — I will get back to you.");
                        form.reset(); // clear the fields
                    } else {
                        alert("Oops! Something went wrong.");
                    }
                })
                .catch(() => alert("Error: Unable to send form."));
        });
});
